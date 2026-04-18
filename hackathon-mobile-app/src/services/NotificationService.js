/**
 * NotificationService.js
 *
 * Safe wrapper around expo-notifications.
 *
 * Expo Go SDK 53 removed remote-push (addPushTokenListener) support.
 * Importing expo-notifications directly crashes in Expo Go because the
 * native module tries to register a push-token listener at startup.
 *
 * Strategy:
 *  - Detect Expo Go via expo-constants (appOwnership === "expo").
 *  - In Expo Go  → all functions are no-ops (silent, no crash).
 *  - In dev-build / standalone → full scheduling works normally.
 */

import Constants from "expo-constants";
import { Platform } from "react-native";

// ── Detect if we're running inside Expo Go ──────────────────────────────────
const IS_EXPO_GO =
  Constants.appOwnership === "expo" ||
  Constants?.executionEnvironment === "storeClient";

// ── Lazy-load expo-notifications only when NOT in Expo Go ───────────────────
let Notifications = null;

function getNotifications() {
  if (IS_EXPO_GO) return null;
  if (Notifications) return Notifications;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    Notifications = require("expo-notifications");

    // Configure foreground handler once, right after first require
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  } catch (e) {
    console.warn("[NotificationService] expo-notifications unavailable:", e?.message);
    Notifications = null;
  }
  return Notifications;
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Request notification permissions from the user.
 * Returns true if granted, false otherwise.
 * Always returns false silently in Expo Go.
 */
export async function requestNotificationPermission() {
  try {
    const N = getNotifications();
    if (!N) return false; // Expo Go – skip silently

    const { status: existingStatus } = await N.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await N.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") return false;

    if (Platform.OS === "android") {
      await N.setNotificationChannelAsync("anc-reminders", {
        name: "ANC Checkup Reminders",
        importance: N.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#5DC1B9",
      });
    }

    return true;
  } catch (error) {
    console.warn("[NotificationService] requestNotificationPermission:", error?.message);
    return false;
  }
}

/**
 * Cancel all previously scheduled ANC notifications.
 */
export async function cancelAllAncNotifications() {
  try {
    const N = getNotifications();
    if (!N) return;

    const scheduled = await N.getAllScheduledNotificationsAsync();
    for (const notif of scheduled) {
      if (notif.content?.data?.type === "anc-reminder") {
        await N.cancelScheduledNotificationAsync(notif.identifier);
      }
    }
  } catch (error) {
    console.warn("[NotificationService] cancelAllAncNotifications:", error?.message);
  }
}

/**
 * Schedule a single local notification for a future date.
 * @returns {string|null} notification identifier, or null if unavailable
 */
export async function scheduleNotification(title, body, triggerAt, data = {}) {
  try {
    const N = getNotifications();
    if (!N) return null;

    const granted = await requestNotificationPermission();
    if (!granted) return null;

    const now = new Date();
    if (triggerAt <= now) return null; // don't fire past notifications

    return await N.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { type: "anc-reminder", ...data },
        sound: true,
        priority: "high",
      },
      trigger: {
        date: triggerAt,
        channelId: "anc-reminders",
      },
    });
  } catch (error) {
    console.warn("[NotificationService] scheduleNotification:", error?.message);
    return null;
  }
}

/**
 * Schedule ANC checkup reminders derived from the patient assessment.
 * Schedules:
 *  • 3 days before (high-risk only)
 *  • 1 day before at 9 AM
 *  • Day-of at 8 AM
 *
 * @param {Object} profile     - Patient profile from patientMe()
 * @param {Object} assessment  - ANC assessment result
 * @param {string} firstName   - Patient's first name
 * @returns {Date|undefined}   The computed next visit date, or undefined
 */
export async function scheduleAncReminders(profile, assessment, firstName = "Patient") {
  try {
    const N = getNotifications();
    if (!N) return; // Expo Go – no-op

    await cancelAllAncNotifications();

    const nextVisitWeeks = assessment?.nextVisitWeeks;
    if (!nextVisitWeeks || nextVisitWeeks <= 0) return;

    const nextVisitDate = new Date();
    nextVisitDate.setDate(nextVisitDate.getDate() + nextVisitWeeks * 7);

    // 1 day before at 9 AM
    const oneDayBefore = new Date(nextVisitDate);
    oneDayBefore.setDate(oneDayBefore.getDate() - 1);
    oneDayBefore.setHours(9, 0, 0, 0);
    await scheduleNotification(
      "🗓️ ANC Checkup Tomorrow",
      `Hi ${firstName}, your ANC checkup is tomorrow. Please don't miss it!`,
      oneDayBefore,
      { visitDate: nextVisitDate.toISOString(), advanceDays: 1 }
    );

    // Day-of at 8 AM
    const onTheDay = new Date(nextVisitDate);
    onTheDay.setHours(8, 0, 0, 0);
    await scheduleNotification(
      "⚕️ ANC Checkup Today",
      `Hi ${firstName}, today is your ANC checkup day! Visit your nearest health center.`,
      onTheDay,
      { visitDate: nextVisitDate.toISOString(), advanceDays: 0 }
    );

    // High-risk: 3 days before at 10 AM
    if (
      assessment?.riskBand === "HIGH" ||
      assessment?.riskBand === "EMERGENCY"
    ) {
      const threeDaysBefore = new Date(nextVisitDate);
      threeDaysBefore.setDate(threeDaysBefore.getDate() - 3);
      threeDaysBefore.setHours(10, 0, 0, 0);
      await scheduleNotification(
        "⚠️ High-Risk ANC Alert",
        `${firstName}, due to your high-risk status, please visit your doctor soon.`,
        threeDaysBefore,
        { visitDate: nextVisitDate.toISOString(), advanceDays: 3, isHighRisk: true }
      );
    }

    return nextVisitDate;
  } catch (error) {
    console.warn("[NotificationService] scheduleAncReminders:", error?.message);
  }
}

/**
 * Fire an immediate local notification (for UX feedback / testing).
 * No-op in Expo Go.
 */
export async function sendImmediateNotification(title, body, data = {}) {
  try {
    const N = getNotifications();
    if (!N) return null;

    const granted = await requestNotificationPermission();
    if (!granted) return null;

    return await N.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { type: "anc-reminder", ...data },
        sound: true,
      },
      trigger: null, // fires immediately
    });
  } catch (error) {
    console.warn("[NotificationService] sendImmediateNotification:", error?.message);
    return null;
  }
}
