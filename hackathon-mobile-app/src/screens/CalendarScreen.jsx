import React, { useContext, useMemo, useState, useEffect, useRef } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
  Alert,
} from "react-native";
import Constants from "expo-constants";

const IS_EXPO_GO =
  Constants.appOwnership === "expo" ||
  Constants?.executionEnvironment === "storeClient";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { AuthContext } from "../context/AuthContext";
import { patientMe } from "../services/api";
import { assess, buildPatientInputsFromProfile } from "../services/ruleEngine";
import { normalizeAncInputs } from "../services/ancAssessment";
import {
  scheduleAncReminders,
  requestNotificationPermission,
  sendImmediateNotification,
} from "../services/NotificationService";

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAY_LABELS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year, month) {
  return new Date(year, month, 1).getDay();
}

function isSameDay(a, b) {
  if (!a || !b) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(date) {
  if (!date) return "";
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

function formatDateShort(date) {
  if (!date) return "";
  const d = date.getDate().toString().padStart(2, "0");
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  return `${d}/${m}`;
}

// ─── ANC SCHEDULE ENGINE (Evidence-based, MoHFW India + WHO) ─────────────────
//
// Standard ANC Checkup Frequency:
//  • Weeks 1–28  (≤7 months)  → Every 28 days (monthly)
//  • Weeks 28–36 (7–9 months) → Every 14 days (fortnightly)
//  • Weeks 36–40 (9+ months)  → Every 7 days  (weekly)
//
// High-risk patients (HIGH/EMERGENCY) get one tier shorter:
//  • Weeks 1–28   → Every 14 days
//  • Weeks 28–36  → Every 7 days
//  • Weeks 36+    → Every 7 days
//
// Sources:
//  - MoHFW RCH ANM User Manual (MOHFW_RCH_MANUAL)
//  - WHO ANC 2016 Model: 8 minimum contacts
//  - India PMSMA high-risk tracking guidelines

function getCheckupIntervalDays(gestationalWeeks, isHighRisk) {
  if (gestationalWeeks == null) gestationalWeeks = 20; // fallback

  if (gestationalWeeks >= 36) {
    return 7;  // 9+ months → weekly
  }
  if (gestationalWeeks >= 28) {
    return isHighRisk ? 7 : 14;  // 7–9 months → fortnightly (or weekly for high-risk)
  }
  // < 28 weeks (≤ 7 months)
  return isHighRisk ? 14 : 28;  // monthly (or fortnightly for high-risk)
}

function getIntervalLabel(days) {
  if (days === 7) return "Weekly checkup";
  if (days === 14) return "Fortnightly checkup";
  return "Monthly checkup";
}

// ─── GENERATE ANC EVENTS FROM REAL PATIENT DATA ───────────────────────────────

function generateAncEvents(profile, assessment) {
  const events = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ─── 1. PAST VISITS from real _visits array ────────────────────────────────
  const visits = Array.isArray(profile?._visits) ? [...profile._visits] : [];
  visits.sort((a, b) => new Date(a?.visitDate || 0) - new Date(b?.visitDate || 0));

  visits.forEach((v, idx) => {
    if (!v.visitDate) return;
    const d = new Date(v.visitDate);
    d.setHours(0, 0, 0, 0);

    const riskLevel = v?.assessment?.riskLevel || "NORMAL";
    const riskColor =
      riskLevel === "HIGH" ? "#DC2626" :
      riskLevel === "MEDIUM" ? "#D97706" : "#0F766E";
    const riskIcon =
      riskLevel === "HIGH" ? "alert-triangle" :
      riskLevel === "MEDIUM" ? "alert-circle" : "check-circle";

    const weeksAtVisit = v?.maternal?.observations?.gestationalAgeWeeks;
    const weekLabel = weeksAtVisit ? ` (Week ${weeksAtVisit})` : "";

    events.push({
      id: `visit-${v.visitId || idx}`,
      date: d,
      type: "history",
      title: `ANC Visit ${idx + 1}${weekLabel}`,
      subtitle: riskLevel !== "NORMAL"
        ? `Risk: ${riskLevel} · ${v?.assessment?.recommendedAction || "Checkup"}`
        : (v._note || "Antenatal Checkup"),
      color: riskColor,
      icon: riskIcon,
      riskLevel,
    });
  });

  // ─── 2. HIGH-RISK URGENT ALERT ─────────────────────────────────────────────
  const isHighRisk =
    assessment?.riskBand === "HIGH" || assessment?.riskBand === "EMERGENCY";

  if (isHighRisk) {
    const urgentDate = addDays(today, 1);
    events.push({
      id: "urgent-visit",
      date: urgentDate,
      type: "urgent",
      title: "⚠️ Urgent Review Required",
      subtitle: assessment?.reasons?.[0] || "High risk detected — visit clinic immediately",
      color: "#DC2626",
      icon: "alert-triangle",
    });
  }

  // ─── 3. FUTURE SCHEDULED CHECKUPS based on real pregnancy data ────────────
  const pregnancyDetails = profile?.pregnancyDetails || profile?.health_records?.pregnancyStatus || {};
  const lmpStr = pregnancyDetails?.lastMenstrualPeriod || pregnancyDetails?.lmp;
  const eddStr = pregnancyDetails?.expectedDeliveryDate || pregnancyDetails?.edd;

  let currentGestWeeks = null;
  let lastVisitDate = today;

  // Use the last visit date as anchor for next checkup
  if (visits.length > 0) {
    const lastVisit = visits[visits.length - 1];
    if (lastVisit.visitDate) {
      lastVisitDate = new Date(lastVisit.visitDate);
      lastVisitDate.setHours(0, 0, 0, 0);
    }
    currentGestWeeks = lastVisit?.maternal?.observations?.gestationalAgeWeeks
      ?? pregnancyDetails?.gestationalAgeWeeks;
  } else {
    currentGestWeeks = pregnancyDetails?.gestationalAgeWeeks;
  }

  // Calculate EDD
  let eddDate = null;
  if (eddStr) {
    eddDate = new Date(eddStr);
    eddDate.setHours(0, 0, 0, 0);
  } else if (lmpStr) {
    eddDate = new Date(lmpStr);
    eddDate.setDate(eddDate.getDate() + 280); // Naegele's rule
    eddDate.setHours(0, 0, 0, 0);
  }

  // Generate future checkups from today until EDD
  if (currentGestWeeks != null || eddDate) {
    let scheduledDate = lastVisitDate;
    let scheduledWeeks = currentGestWeeks || 20;
    let checkupIndex = 0;
    const maxCheckups = 20; // Safety cap

    while (checkupIndex < maxCheckups) {
      const intervalDays = getCheckupIntervalDays(scheduledWeeks, isHighRisk);
      scheduledDate = addDays(scheduledDate, intervalDays);
      scheduledWeeks = scheduledWeeks + intervalDays / 7;

      // Stop if beyond EDD
      if (eddDate && scheduledDate > eddDate) break;
      // Stop if beyond 9 months ahead
      const nineMonthsAhead = addDays(today, 270);
      if (scheduledDate > nineMonthsAhead) break;

      const isFuture = scheduledDate >= today;
      if (!isFuture) {
        checkupIndex++;
        continue;
      }

      const weekLabel = `Week ${Math.round(scheduledWeeks)}`;
      const intervalLabel = getIntervalLabel(intervalDays);

      const isVeryUrgent =
        isHighRisk &&
        checkupIndex === 0 &&
        (scheduledDate - today) / (1000 * 60 * 60 * 24) <= 7;

      events.push({
        id: `anc-scheduled-${checkupIndex}`,
        date: new Date(scheduledDate),
        type: isVeryUrgent ? "urgent" : "upcoming",
        title: `ANC Checkup (${weekLabel})`,
        subtitle: `${intervalLabel} · ${isHighRisk ? "High-risk monitoring" : "Routine antenatal care"}`,
        color: isVeryUrgent ? "#DC2626" : "#6366F1",
        icon: isVeryUrgent ? "alert-triangle" : "calendar",
        intervalDays,
      });

      checkupIndex++;
    }

    // ─── EDD event ──────────────────────────────────────────────────────────
    if (eddDate && eddDate >= today) {
      events.push({
        id: "edd",
        date: eddDate,
        type: "upcoming",
        title: "🎉 Expected Delivery Date",
        subtitle: `Week 40 · ${profile?.abha_profile?.firstName || "Patient"}'s due date`,
        color: "#7C3AED",
        icon: "heart",
      });
    }
  }

  // ─── 4. IFA Supplement Reminder (daily routine) ───────────────────────────
  if (profile?.pregnancyDetails?.currentlyPregnant || profile?.health_records?.pregnancyStatus?.isPregnant) {
    const ifaDate = addDays(today, 1);
    events.push({
      id: "ifa-reminder",
      date: ifaDate,
      type: "reminder",
      title: "Iron & Folic Acid (IFA)",
      subtitle: "Take IFA supplement daily — essential for baby's development",
      color: "#F97316",
      icon: "package",
    });

    // TDap vaccination reminder if not given
    const vaccRec = profile?.health_records?.vaccinationRecord;
    if (vaccRec?.TDap === "NOT_GIVEN") {
      const tdapDate = addDays(today, 3);
      events.push({
        id: "tdap-reminder",
        date: tdapDate,
        type: "reminder",
        title: "TDap Vaccination Due",
        subtitle: "Tetanus-Diphtheria-Pertussis — not yet administered",
        color: "#8B5CF6",
        icon: "shield",
      });
    }
  }

  return events.sort((a, b) => a.date - b.date);
}

// ─── TAG COLORS ───────────────────────────────────────────────────────────────

const TAG_STYLE = {
  upcoming: { bg: "#EDE9FE", text: "#7C3AED", label: "Upcoming" },
  history:  { bg: "#E8F6F4", text: "#0F766E", label: "Past Visit" },
  reminder: { bg: "#FEF3C7", text: "#B45309", label: "Reminder" },
  urgent:   { bg: "#FEE2E2", text: "#DC2626", label: "Urgent" },
};

// ─── PREGNANCY PROGRESS BAR ───────────────────────────────────────────────────

function PregnancyProgress({ gestWeeks, isHighRisk }) {
  if (!gestWeeks) return null;

  const totalWeeks = 40;
  const progress = Math.min(gestWeeks / totalWeeks, 1);
  const trimester =
    gestWeeks <= 12 ? "1st Trimester" :
    gestWeeks <= 28 ? "2nd Trimester" : "3rd Trimester";

  const barColor = isHighRisk ? "#DC2626" : "#5DC1B9";

  return (
    <View style={styles.progressCard}>
      <View style={styles.progressHeader}>
        <View>
          <Text style={styles.progressLabel}>Pregnancy Progress</Text>
          <Text style={styles.progressTrimester}>{trimester}</Text>
        </View>
        <View style={[styles.progressWeekBadge, { backgroundColor: isHighRisk ? "#FEE2E2" : "#E8F6F4" }]}>
          <Text style={[styles.progressWeekText, { color: isHighRisk ? "#DC2626" : "#0F766E" }]}>
            Week {gestWeeks}
          </Text>
        </View>
      </View>
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${progress * 100}%`, backgroundColor: barColor }]} />
      </View>
      <View style={styles.progressMarkers}>
        <Text style={styles.progressMarkerText}>Week 1</Text>
        <Text style={styles.progressMarkerText}>28w (7mo)</Text>
        <Text style={styles.progressMarkerText}>36w (9mo)</Text>
        <Text style={styles.progressMarkerText}>40w</Text>
      </View>
      {isHighRisk && (
        <View style={styles.highRiskBanner}>
          <Feather name="alert-triangle" size={13} color="#DC2626" />
          <Text style={styles.highRiskBannerText}>
            High-risk: Enhanced monitoring schedule active
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── SCHEDULE LEGEND CARD ─────────────────────────────────────────────────────

function ScheduleLegend({ gestWeeks, isHighRisk }) {
  if (!gestWeeks) return null;

  const scheduleRows = [
    {
      range: "Weeks 1–28 (≤7 months)",
      standard: "Every 28 days",
      highRisk: "Every 14 days",
      active: gestWeeks < 28,
    },
    {
      range: "Weeks 28–36 (7–9 months)",
      standard: "Every 14 days",
      highRisk: "Every 7 days",
      active: gestWeeks >= 28 && gestWeeks < 36,
    },
    {
      range: "Weeks 36–40 (9+ months)",
      standard: "Every 7 days",
      highRisk: "Every 7 days",
      active: gestWeeks >= 36,
    },
  ];

  return (
    <View style={styles.scheduleCard}>
      <Text style={styles.scheduleCardTitle}>📋 ANC Checkup Schedule</Text>
      <Text style={styles.scheduleCardSubtitle}>
        Based on MoHFW India & WHO guidelines
      </Text>
      {scheduleRows.map((row, idx) => (
        <View
          key={idx}
          style={[styles.scheduleRow, row.active && styles.scheduleRowActive]}
        >
          <View style={styles.scheduleRowLeft}>
            {row.active && (
              <View style={styles.scheduleRowDot} />
            )}
            <Text style={[styles.scheduleRangeText, row.active && styles.scheduleRangeTextActive]}>
              {row.range}
            </Text>
          </View>
          <Text style={[styles.scheduleFreqText, row.active && styles.scheduleFreqTextActive]}>
            {isHighRisk ? row.highRisk : row.standard}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export default function CalendarScreen() {
  const navigation = useNavigation();
  const { user, token } = useContext(AuthContext);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeFilter, setActiveFilter] = useState("all");
  const [showSchedule, setShowSchedule] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());

  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ── Load profile from users.json via patientMe (uses real _visits data)
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        if (token) {
          const data = await patientMe(token);
          setProfile(data || null);
        }
      } catch {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  // ── Request notification permission on mount
  useEffect(() => {
    requestNotificationPermission().then(setNotifEnabled);
  }, []);

  // ── Fade in
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 450,
      useNativeDriver: true,
    }).start();
  }, []);

  const activeUser = profile || user;

  const ancInputs = useMemo(
    () => normalizeAncInputs(buildPatientInputsFromProfile(activeUser || {})),
    [activeUser]
  );

  const assessment = useMemo(() => assess(ancInputs), [ancInputs]);

  const isHighRisk =
    assessment?.riskBand === "HIGH" || assessment?.riskBand === "EMERGENCY";

  // Get current gestational age from real patient data
  const currentGestWeeks = useMemo(() => {
    const visits = Array.isArray(activeUser?._visits) ? [...activeUser._visits] : [];
    visits.sort((a, b) => new Date(b?.visitDate || 0) - new Date(a?.visitDate || 0));
    return (
      visits[0]?.maternal?.observations?.gestationalAgeWeeks ??
      activeUser?.pregnancyDetails?.gestationalAgeWeeks ??
      activeUser?.health_records?.pregnancyStatus?.weeksPregnant ??
      null
    );
  }, [activeUser]);

  const allEvents = useMemo(
    () => generateAncEvents(activeUser, assessment),
    [activeUser, assessment]
  );

  const firstName =
    activeUser?.abha_profile?.firstName ||
    activeUser?.name?.split(" ")[0] ||
    "Patient";

  // ── Schedule notifications when profile/assessment loads
  useEffect(() => {
    if (!activeUser || !assessment) return;
    scheduleAncReminders(activeUser, assessment, firstName);
  }, [activeUser, assessment]);

  // ── Events for current month view
  const eventsInMonth = useMemo(
    () =>
      allEvents.filter(
        (e) => e.date.getFullYear() === calYear && e.date.getMonth() === calMonth
      ),
    [allEvents, calYear, calMonth]
  );

  // Map date string → types for dot indicators
  const dateDotMap = useMemo(() => {
    const map = {};
    eventsInMonth.forEach((e) => {
      const key = `${e.date.getDate()}`;
      if (!map[key]) map[key] = [];
      map[key].push(e.type);
    });
    return map;
  }, [eventsInMonth]);

  // ── Events for selected date
  const selectedEvents = useMemo(
    () => allEvents.filter((e) => isSameDay(e.date, selectedDate)),
    [allEvents, selectedDate]
  );

  // ── Upcoming events (next 60 days)
  const upcomingEvents = useMemo(() => {
    const cutoff = new Date(today);
    cutoff.setDate(cutoff.getDate() + 60);
    return allEvents.filter((e) => {
      if (e.type === "history") return false; // exclude past visits from upcoming
      if (activeFilter === "all") return e.date >= today && e.date <= cutoff;
      return e.type === activeFilter && e.date >= today && e.date <= cutoff;
    });
  }, [allEvents, today, activeFilter]);

  // ── Next ANC checkup
  const nextCheckup = useMemo(() => {
    return allEvents.find(
      (e) => (e.type === "upcoming" || e.type === "urgent") && e.date >= today
    );
  }, [allEvents, today]);

  // ── Calendar cells
  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay = getFirstDayOfWeek(calYear, calMonth);
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  };

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    setNotifEnabled(granted);
    if (granted) {
      await scheduleAncReminders(activeUser, assessment, firstName);
      await sendImmediateNotification(
        "✅ Reminders Activated",
        `We'll remind you about upcoming ANC checkups, ${firstName}!`
      );
      Alert.alert("Reminders On", "You will be notified before your upcoming checkups.");
    } else {
      Alert.alert("Permission Required", "Please allow notifications in your device settings.");
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={20} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Health Calendar</Text>
        <TouchableOpacity
          style={[styles.notifBtn, notifEnabled && styles.notifBtnActive]}
          onPress={handleEnableNotifications}
        >
          <Feather
            name={notifEnabled ? "bell" : "bell-off"}
            size={18}
            color={notifEnabled ? "#FFFFFF" : "#64748B"}
          />
        </TouchableOpacity>
      </View>

      <Animated.ScrollView
        style={{ opacity: fadeAnim }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Notification Banner */}
        {!notifEnabled && (
          <TouchableOpacity style={styles.notifBanner} onPress={handleEnableNotifications} activeOpacity={0.85}>
            <Feather name="bell-off" size={18} color="#B45309" />
            <Text style={styles.notifBannerText}>
              Enable notifications to get checkup reminders
            </Text>
            <Feather name="chevron-right" size={16} color="#B45309" />
          </TouchableOpacity>
        )}

        {/* ── Pregnancy Progress */}
        <PregnancyProgress gestWeeks={currentGestWeeks} isHighRisk={isHighRisk} />

        {/* ── Next visit summary pill */}
        {nextCheckup && (
          <View style={[styles.nextVisitCard, isHighRisk && styles.nextVisitCardUrgent]}>
            <View style={styles.nextVisitLeft}>
              <View style={[styles.nextVisitIcon, isHighRisk && styles.nextVisitIconUrgent]}>
                <Feather
                  name={isHighRisk ? "alert-triangle" : "clock"}
                  size={20}
                  color={isHighRisk ? "#DC2626" : "#6366F1"}
                />
              </View>
              <View>
                <Text style={[styles.nextVisitLabel, isHighRisk && { color: "#DC2626" }]}>
                  {isHighRisk ? "⚠️ Next Urgent Visit" : "Next ANC Visit"}
                </Text>
                <Text style={[styles.nextVisitDate, isHighRisk && { color: "#7F1D1D" }]}>
                  {formatDate(nextCheckup.date)}
                </Text>
                <Text style={styles.nextVisitSubtitle}>{nextCheckup.subtitle}</Text>
              </View>
            </View>
            <View style={[styles.nextVisitBadge, isHighRisk && styles.nextVisitBadgeUrgent]}>
              <Text style={styles.nextVisitBadgeText}>
                {Math.ceil((nextCheckup.date - today) / (1000 * 60 * 60 * 24))}d
              </Text>
            </View>
          </View>
        )}

        {/* ── ANC Schedule Info */}
        <TouchableOpacity
          style={styles.scheduleToggle}
          onPress={() => setShowSchedule(v => !v)}
          activeOpacity={0.8}
        >
          <Feather name="info" size={16} color="#6366F1" />
          <Text style={styles.scheduleToggleText}>
            View ANC Checkup Schedule Guidelines
          </Text>
          <Feather name={showSchedule ? "chevron-up" : "chevron-down"} size={16} color="#6366F1" />
        </TouchableOpacity>
        {showSchedule && (
          <ScheduleLegend gestWeeks={currentGestWeeks} isHighRisk={isHighRisk} />
        )}

        {/* ── Calendar Grid ─────────────────────────────────── */}
        <View style={styles.calCard}>
          {/* Month nav */}
          <View style={styles.calHeader}>
            <TouchableOpacity style={styles.calNavBtn} onPress={prevMonth}>
              <Feather name="chevron-left" size={20} color="#0F172A" />
            </TouchableOpacity>
            <Text style={styles.calMonthTitle}>
              {MONTH_NAMES[calMonth]} {calYear}
            </Text>
            <TouchableOpacity style={styles.calNavBtn} onPress={nextMonth}>
              <Feather name="chevron-right" size={20} color="#0F172A" />
            </TouchableOpacity>
          </View>

          {/* Day labels */}
          <View style={styles.dayLabelsRow}>
            {DAY_LABELS.map((d) => (
              <Text key={d} style={styles.dayLabel}>{d}</Text>
            ))}
          </View>

          {/* Day cells */}
          <View style={styles.daysGrid}>
            {cells.map((day, idx) => {
              if (!day) return <View key={`empty-${idx}`} style={styles.dayCell} />;

              const cellDate = new Date(calYear, calMonth, day);
              cellDate.setHours(0, 0, 0, 0);
              const isToday = isSameDay(cellDate, today);
              const isSelected = isSameDay(cellDate, selectedDate);
              const dots = dateDotMap[`${day}`] || [];
              const hasUrgent = dots.includes("urgent");

              return (
                <TouchableOpacity
                  key={`day-${day}`}
                  style={[
                    styles.dayCell,
                    isToday && styles.dayCellToday,
                    isSelected && !isToday && styles.dayCellSelected,
                    hasUrgent && !isToday && !isSelected && styles.dayCellUrgent,
                  ]}
                  onPress={() => setSelectedDate(cellDate)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dayNumber,
                      isToday && styles.dayNumberToday,
                      isSelected && !isToday && styles.dayNumberSelected,
                    ]}
                  >
                    {day}
                  </Text>
                  {dots.length > 0 && (
                    <View style={styles.dotsRow}>
                      {dots.slice(0, 3).map((type, di) => (
                        <View
                          key={di}
                          style={[styles.dot, { backgroundColor: TAG_STYLE[type]?.text || "#5DC1B9" }]}
                        />
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Legend */}
        <View style={styles.legendRow}>
          {Object.entries(TAG_STYLE).map(([type, s]) => (
            <View key={type} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: s.text }]} />
              <Text style={styles.legendText}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Selected date events */}
        {selectedEvents.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {isSameDay(selectedDate, today) ? "Today" : formatDate(selectedDate)}
            </Text>
            {selectedEvents.map((ev) => (
              <EventCard key={ev.id} event={ev} />
            ))}
          </View>
        )}

        {/* ── Upcoming events */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Coming Up (60 days)</Text>

          {/* Filter tabs */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {["all", "upcoming", "reminder", "urgent"].map((f) => (
              <TouchableOpacity
                key={f}
                style={[styles.filterTab, activeFilter === f && styles.filterTabActive]}
                onPress={() => setActiveFilter(f)}
              >
                <Text style={[styles.filterTabText, activeFilter === f && styles.filterTabTextActive]}>
                  {f === "all" ? "All" : TAG_STYLE[f]?.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {upcomingEvents.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="calendar" size={36} color="#CBD5E1" />
              <Text style={styles.emptyText}>No events in this period</Text>
            </View>
          ) : (
            upcomingEvents.map((ev) => <EventCard key={ev.id} event={ev} />)
          )}
        </View>

        {/* ── History section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Visit History</Text>
          {allEvents.filter((e) => e.type === "history").length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="clock" size={36} color="#CBD5E1" />
              <Text style={styles.emptyText}>No past visits recorded</Text>
            </View>
          ) : (
            allEvents
              .filter((e) => e.type === "history")
              .reverse()
              .map((ev) => <EventCard key={ev.id} event={ev} past />)
          )}
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

// ─── EVENT CARD ───────────────────────────────────────────────────────────────

function EventCard({ event, past }) {
  const tag = TAG_STYLE[event.type] || TAG_STYLE.upcoming;

  return (
    <View style={[styles.eventCard, past && styles.eventCardPast, event.type === "urgent" && styles.eventCardUrgent]}>
      <View style={[styles.eventIcon, { backgroundColor: `${event.color}18` }]}>
        <Feather name={event.icon} size={18} color={event.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.eventTitle}>{event.title}</Text>
        <Text style={styles.eventSubtitle}>{event.subtitle}</Text>
        <Text style={styles.eventDate}>{formatDate(event.date)}</Text>
      </View>
      <View style={[styles.eventTag, { backgroundColor: tag.bg }]}>
        <Text style={[styles.eventTagText, { color: tag.text }]}>{tag.label}</Text>
      </View>
    </View>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F7FAFB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: "#F7FAFB",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
  },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  notifBtnActive: {
    backgroundColor: "#5DC1B9",
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },

  // Notification banner
  notifBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FEF3C7",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  notifBannerText: {
    flex: 1,
    fontSize: 13,
    color: "#92400E",
    fontWeight: "600",
  },

  // Pregnancy Progress Card
  progressCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  progressTrimester: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 2,
  },
  progressWeekBadge: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  progressWeekText: {
    fontWeight: "800",
    fontSize: 14,
  },
  progressBarBg: {
    height: 10,
    backgroundColor: "#F1F5F9",
    borderRadius: 999,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 999,
  },
  progressMarkers: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  progressMarkerText: {
    fontSize: 10,
    color: "#94A3B8",
    fontWeight: "600",
  },
  highRiskBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  highRiskBannerText: {
    fontSize: 12,
    color: "#DC2626",
    fontWeight: "600",
    flex: 1,
  },

  // Next visit card
  nextVisitCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#EDE9FE",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#DDD6FE",
  },
  nextVisitCardUrgent: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  nextVisitLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    flex: 1,
  },
  nextVisitIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  nextVisitIconUrgent: {
    backgroundColor: "#FEE2E2",
  },
  nextVisitLabel: {
    fontSize: 12,
    color: "#7C3AED",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  nextVisitDate: {
    marginTop: 2,
    fontSize: 15,
    fontWeight: "800",
    color: "#1E1B4B",
  },
  nextVisitSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "500",
  },
  nextVisitBadge: {
    backgroundColor: "#7C3AED",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginLeft: 8,
  },
  nextVisitBadgeUrgent: {
    backgroundColor: "#DC2626",
  },
  nextVisitBadgeText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 14,
  },

  // Schedule toggle
  scheduleToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EDE9FE",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#DDD6FE",
  },
  scheduleToggleText: {
    flex: 1,
    fontSize: 13,
    color: "#4C1D95",
    fontWeight: "700",
  },

  // Schedule card
  scheduleCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E0E7FF",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  scheduleCardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 2,
  },
  scheduleCardSubtitle: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
    marginBottom: 12,
  },
  scheduleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginBottom: 4,
  },
  scheduleRowActive: {
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  scheduleRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  scheduleRowDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#6366F1",
  },
  scheduleRangeText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
    flex: 1,
  },
  scheduleRangeTextActive: {
    color: "#1E1B4B",
    fontWeight: "700",
  },
  scheduleFreqText: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "700",
    textAlign: "right",
  },
  scheduleFreqTextActive: {
    color: "#6366F1",
  },

  // Calendar card
  calCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#EEF2F6",
  },
  calHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  calNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  calMonthTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  dayLabelsRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  dayLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    marginVertical: 2,
  },
  dayCellToday: {
    backgroundColor: "#0F172A",
  },
  dayCellSelected: {
    backgroundColor: "#E0F2FE",
  },
  dayCellUrgent: {
    backgroundColor: "#FEF2F2",
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  dayNumberToday: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  dayNumberSelected: {
    color: "#0284C7",
    fontWeight: "800",
  },
  dotsRow: {
    flexDirection: "row",
    gap: 2,
    marginTop: 2,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },

  // Legend
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },

  // Section
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 10,
  },

  // Filter tabs
  filterScroll: {
    marginBottom: 12,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#F1F5F9",
    marginRight: 8,
  },
  filterTabActive: {
    backgroundColor: "#0F172A",
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  filterTabTextActive: {
    color: "#FFFFFF",
  },

  // Event card
  eventCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  eventCardPast: {
    opacity: 0.75,
  },
  eventCardUrgent: {
    borderColor: "#FECACA",
    backgroundColor: "#FFFBFB",
  },
  eventIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  eventSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  eventDate: {
    marginTop: 4,
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
  },
  eventTag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    alignSelf: "flex-start",
  },
  eventTagText: {
    fontSize: 11,
    fontWeight: "700",
  },

  // Empty state
  emptyState: {
    alignItems: "center",
    paddingVertical: 28,
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
    color: "#94A3B8",
    fontWeight: "500",
  },
});
