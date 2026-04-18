import React, { useContext, useMemo, useState, useEffect, useRef } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
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

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAY_LABELS = ["S","M","T","W","T","F","S"];

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
function daysFromNow(date, today) {
  return Math.ceil((date - today) / (1000 * 60 * 60 * 24));
}

// ─── ANC SCHEDULE ENGINE ──────────────────────────────────────────────────────

function getCheckupIntervalDays(gestationalWeeks, isHighRisk) {
  if (gestationalWeeks == null) gestationalWeeks = 20;
  if (gestationalWeeks >= 36) return 7;
  if (gestationalWeeks >= 28) return isHighRisk ? 7 : 14;
  return isHighRisk ? 14 : 28;
}
function getIntervalLabel(days) {
  if (days === 7) return "Weekly";
  if (days === 14) return "Fortnightly";
  return "Monthly";
}

// ─── GENERATE ANC EVENTS ──────────────────────────────────────────────────────

function generateAncEvents(profile, assessment) {
  const events = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const visits = Array.isArray(profile?._visits) ? [...profile._visits] : [];
  visits.sort((a, b) => new Date(a?.visitDate || 0) - new Date(b?.visitDate || 0));

  visits.forEach((v, idx) => {
    if (!v.visitDate) return;
    const d = new Date(v.visitDate);
    d.setHours(0, 0, 0, 0);
    const riskLevel = v?.assessment?.riskLevel || "NORMAL";
    const riskColor =
      riskLevel === "HIGH" ? "#EF4444" :
      riskLevel === "MEDIUM" ? "#F59E0B" : "#10B981";
    const riskIcon =
      riskLevel === "HIGH" ? "alert-triangle" :
      riskLevel === "MEDIUM" ? "alert-circle" : "check-circle";
    const weeksAtVisit = v?.maternal?.observations?.gestationalAgeWeeks;
    const weekLabel = weeksAtVisit ? ` · Week ${weeksAtVisit}` : "";
    events.push({
      id: `visit-${v.visitId || idx}`,
      date: d,
      type: "history",
      title: `ANC Visit ${idx + 1}${weekLabel}`,
      subtitle: riskLevel !== "NORMAL"
        ? `${riskLevel} Risk`
        : (v._note || "Antenatal Checkup"),
      color: riskColor,
      icon: riskIcon,
      riskLevel,
    });
  });

  const isHighRisk =
    assessment?.riskBand === "HIGH" || assessment?.riskBand === "EMERGENCY";

  if (isHighRisk) {
    events.push({
      id: "urgent-visit",
      date: addDays(today, 1),
      type: "urgent",
      title: "Urgent Review",
      subtitle: assessment?.reasons?.[0] || "High risk — visit clinic soon",
      color: "#EF4444",
      icon: "alert-triangle",
    });
  }

  const pregnancyDetails = profile?.pregnancyDetails || profile?.health_records?.pregnancyStatus || {};
  const lmpStr = pregnancyDetails?.lastMenstrualPeriod || pregnancyDetails?.lmp;
  const eddStr = pregnancyDetails?.expectedDeliveryDate || pregnancyDetails?.edd;

  let currentGestWeeks = null;
  let lastVisitDate = today;

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

  let eddDate = null;
  if (eddStr) {
    eddDate = new Date(eddStr);
    eddDate.setHours(0, 0, 0, 0);
  } else if (lmpStr) {
    eddDate = new Date(lmpStr);
    eddDate.setDate(eddDate.getDate() + 280);
    eddDate.setHours(0, 0, 0, 0);
  }

  if (currentGestWeeks != null || eddDate) {
    let scheduledDate = lastVisitDate;
    let scheduledWeeks = currentGestWeeks || 20;
    let checkupIndex = 0;
    const maxCheckups = 20;

    while (checkupIndex < maxCheckups) {
      const intervalDays = getCheckupIntervalDays(scheduledWeeks, isHighRisk);
      scheduledDate = addDays(scheduledDate, intervalDays);
      scheduledWeeks = scheduledWeeks + intervalDays / 7;

      if (eddDate && scheduledDate > eddDate) break;
      if (scheduledDate > addDays(today, 270)) break;

      if (scheduledDate < today) { checkupIndex++; continue; }

      const weekLabel = `Week ${Math.round(scheduledWeeks)}`;
      const isFlagged = isHighRisk && checkupIndex === 0 && daysFromNow(scheduledDate, today) <= 7;

      events.push({
        id: `anc-scheduled-${checkupIndex}`,
        date: new Date(scheduledDate),
        type: isFlagged ? "urgent" : "upcoming",
        title: `ANC Checkup (${weekLabel})`,
        subtitle: `${getIntervalLabel(intervalDays)} · ${isHighRisk ? "High-risk" : "Routine care"}`,
        color: isFlagged ? "#EF4444" : "#6366F1",
        icon: isFlagged ? "alert-triangle" : "calendar",
        intervalDays,
      });
      checkupIndex++;
    }

    if (eddDate && eddDate >= today) {
      events.push({
        id: "edd",
        date: eddDate,
        type: "upcoming",
        title: "Expected Delivery",
        subtitle: "Week 40 · Due date",
        color: "#8B5CF6",
        icon: "heart",
      });
    }
  }

  if (profile?.pregnancyDetails?.currentlyPregnant || profile?.health_records?.pregnancyStatus?.isPregnant) {
    events.push({
      id: "ifa-reminder",
      date: addDays(today, 1),
      type: "reminder",
      title: "IFA Supplement",
      subtitle: "Iron & Folic Acid — daily",
      color: "#F97316",
      icon: "package",
    });

    const vaccRec = profile?.health_records?.vaccinationRecord;
    if (vaccRec?.TDap === "NOT_GIVEN") {
      events.push({
        id: "tdap-reminder",
        date: addDays(today, 3),
        type: "reminder",
        title: "TDap Vaccination Due",
        subtitle: "Not yet administered",
        color: "#8B5CF6",
        icon: "shield",
      });
    }
  }

  return events.sort((a, b) => a.date - b.date);
}

// ─── TYPE CONFIG ──────────────────────────────────────────────────────────────

const TYPE_CONFIG = {
  upcoming: { dot: "#6366F1", label: "Upcoming" },
  history:  { dot: "#10B981", label: "Past" },
  reminder: { dot: "#F97316", label: "Reminder" },
  urgent:   { dot: "#EF4444", label: "Urgent" },
};

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export default function CalendarScreen() {
  const navigation = useNavigation();
  const { user, token } = useContext(AuthContext);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "timeline"

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());

  const fadeAnim = useRef(new Animated.Value(0)).current;

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

  useEffect(() => {
    requestNotificationPermission().then(setNotifEnabled);
  }, []);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  const activeUser = profile || user;

  const ancInputs = useMemo(
    () => normalizeAncInputs(buildPatientInputsFromProfile(activeUser || {})),
    [activeUser]
  );
  const assessment = useMemo(() => assess(ancInputs), [ancInputs]);
  const isHighRisk = assessment?.riskBand === "HIGH" || assessment?.riskBand === "EMERGENCY";

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

  useEffect(() => {
    if (!activeUser || !assessment) return;
    scheduleAncReminders(activeUser, assessment, firstName);
  }, [activeUser, assessment]);

  const eventsInMonth = useMemo(
    () => allEvents.filter(e => e.date.getFullYear() === calYear && e.date.getMonth() === calMonth),
    [allEvents, calYear, calMonth]
  );

  const dateDotMap = useMemo(() => {
    const map = {};
    eventsInMonth.forEach(e => {
      const key = `${e.date.getDate()}`;
      if (!map[key]) map[key] = [];
      if (!map[key].includes(e.type)) map[key].push(e.type);
    });
    return map;
  }, [eventsInMonth]);

  const selectedEvents = useMemo(
    () => allEvents.filter(e => isSameDay(e.date, selectedDate)),
    [allEvents, selectedDate]
  );

  const nextCheckup = useMemo(
    () => allEvents.find(e => (e.type === "upcoming" || e.type === "urgent") && e.date >= today),
    [allEvents, today]
  );

  const upcomingEvents = useMemo(() => {
    const cutoff = addDays(today, 60);
    return allEvents.filter(e => e.type !== "history" && e.date >= today && e.date <= cutoff);
  }, [allEvents, today]);

  const pastEvents = useMemo(
    () => allEvents.filter(e => e.type === "history").reverse(),
    [allEvents]
  );

  const trimester =
    !currentGestWeeks ? null :
    currentGestWeeks <= 12 ? "1st Trimester" :
    currentGestWeeks <= 28 ? "2nd Trimester" : "3rd Trimester";

  // Calendar cells
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
      await sendImmediateNotification("✅ Reminders On", `We'll remind you before upcoming checkups, ${firstName}!`);
      Alert.alert("Reminders On", "You'll be notified before your checkups.");
    } else {
      Alert.alert("Permission Required", "Please allow notifications in device settings.");
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={20} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Calendar</Text>
        <TouchableOpacity
          style={[styles.iconBtn, notifEnabled && styles.iconBtnActive]}
          onPress={handleEnableNotifications}
        >
          <Feather
            name={notifEnabled ? "bell" : "bell-off"}
            size={18}
            color={notifEnabled ? "#FFFFFF" : "#64748B"}
          />
        </TouchableOpacity>
      </View>

      {/* ── Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "overview" && styles.tabActive]}
          onPress={() => setActiveTab("overview")}
        >
          <Text style={[styles.tabText, activeTab === "overview" && styles.tabTextActive]}>
            Overview
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "timeline" && styles.tabActive]}
          onPress={() => setActiveTab("timeline")}
        >
          <Text style={[styles.tabText, activeTab === "timeline" && styles.tabTextActive]}>
            Timeline
          </Text>
        </TouchableOpacity>
      </View>

      <Animated.ScrollView
        style={{ opacity: fadeAnim, flex: 1 }}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === "overview" ? (
          <>
            {/* ── Pregnancy Summary Card */}
            {currentGestWeeks && (
              <View style={[styles.summaryCard, isHighRisk && styles.summaryCardUrgent]}>
                <View style={styles.summaryTop}>
                  <View>
                    <Text style={styles.summaryWeek}>Week {currentGestWeeks}</Text>
                    <Text style={styles.summaryTrimester}>{trimester}</Text>
                  </View>
                  <View style={[styles.progressCircle, isHighRisk && styles.progressCircleUrgent]}>
                    <Text style={[styles.progressPct, isHighRisk && { color: "#EF4444" }]}>
                      {Math.round((currentGestWeeks / 40) * 100)}%
                    </Text>
                    <Text style={styles.progressOf}>of 40w</Text>
                  </View>
                </View>
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.min((currentGestWeeks / 40) * 100, 100)}%`,
                        backgroundColor: isHighRisk ? "#EF4444" : "#6366F1",
                      },
                    ]}
                  />
                </View>
                {isHighRisk && (
                  <View style={styles.urgentPill}>
                    <Feather name="alert-triangle" size={12} color="#EF4444" />
                    <Text style={styles.urgentPillText}>High-risk monitoring active</Text>
                  </View>
                )}
              </View>
            )}

            {/* ── Next Checkup Banner */}
            {nextCheckup && (
              <View style={[styles.nextCard, isHighRisk && styles.nextCardUrgent]}>
                <View style={[styles.nextIconWrap, { backgroundColor: isHighRisk ? "#FEE2E2" : "#EDE9FE" }]}>
                  <Feather
                    name={isHighRisk ? "alert-triangle" : "calendar"}
                    size={22}
                    color={isHighRisk ? "#EF4444" : "#6366F1"}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.nextLabel}>Next Checkup</Text>
                  <Text style={styles.nextDate}>{formatDate(nextCheckup.date)}</Text>
                </View>
                <View style={[styles.daysBadge, { backgroundColor: isHighRisk ? "#EF4444" : "#6366F1" }]}>
                  <Text style={styles.daysBadgeNum}>{daysFromNow(nextCheckup.date, today)}</Text>
                  <Text style={styles.daysBadgeLabel}>days</Text>
                </View>
              </View>
            )}

            {/* ── Calendar */}
            <View style={styles.calCard}>
              <View style={styles.calHeader}>
                <TouchableOpacity onPress={prevMonth} style={styles.calNavBtn}>
                  <Feather name="chevron-left" size={18} color="#64748B" />
                </TouchableOpacity>
                <Text style={styles.calMonthTitle}>
                  {MONTH_NAMES[calMonth]} {calYear}
                </Text>
                <TouchableOpacity onPress={nextMonth} style={styles.calNavBtn}>
                  <Feather name="chevron-right" size={18} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* Day labels */}
              <View style={styles.dayLabelsRow}>
                {DAY_LABELS.map((d, i) => (
                  <Text key={i} style={styles.dayLabel}>{d}</Text>
                ))}
              </View>

              {/* Days grid */}
              <View style={styles.daysGrid}>
                {cells.map((day, idx) => {
                  if (!day) return <View key={`e-${idx}`} style={styles.dayCell} />;
                  const cellDate = new Date(calYear, calMonth, day);
                  cellDate.setHours(0, 0, 0, 0);
                  const isToday = isSameDay(cellDate, today);
                  const isSelected = isSameDay(cellDate, selectedDate);
                  const dots = dateDotMap[`${day}`] || [];
                  const hasUrgent = dots.includes("urgent");

                  return (
                    <TouchableOpacity
                      key={`d-${day}`}
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
                          {dots.slice(0, 2).map((type, di) => (
                            <View
                              key={di}
                              style={[styles.dot, { backgroundColor: TYPE_CONFIG[type]?.dot || "#6366F1" }]}
                            />
                          ))}
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Dot legend */}
              <View style={styles.calLegend}>
                {Object.entries(TYPE_CONFIG).map(([type, cfg]) => (
                  <View key={type} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: cfg.dot }]} />
                    <Text style={styles.legendText}>{cfg.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* ── Selected day events */}
            {selectedEvents.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {isSameDay(selectedDate, today) ? "Today" : formatDate(selectedDate)}
                </Text>
                {selectedEvents.map(ev => <EventCard key={ev.id} event={ev} />)}
              </View>
            )}
          </>
        ) : (
          <>
            {/* ── Upcoming */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Upcoming</Text>
              {upcomingEvents.length === 0 ? (
                <EmptyState icon="calendar" text="No upcoming events" />
              ) : (
                upcomingEvents.map(ev => <EventCard key={ev.id} event={ev} />)
              )}
            </View>

            {/* ── Visit History */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Visit History</Text>
              {pastEvents.length === 0 ? (
                <EmptyState icon="clock" text="No past visits recorded" />
              ) : (
                pastEvents.map(ev => <EventCard key={ev.id} event={ev} dimmed />)
              )}
            </View>
          </>
        )}
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

// ─── EVENT CARD ───────────────────────────────────────────────────────────────

function EventCard({ event, dimmed }) {
  return (
    <View style={[styles.eventCard, dimmed && { opacity: 0.65 }, event.type === "urgent" && styles.eventCardUrgent]}>
      <View style={[styles.eventIconWrap, { backgroundColor: `${event.color}18` }]}>
        <Feather name={event.icon} size={18} color={event.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.eventTitle}>{event.title}</Text>
        <Text style={styles.eventSubtitle}>{event.subtitle}</Text>
      </View>
      <Text style={styles.eventDateText}>{event.date.getDate()} {MONTH_NAMES[event.date.getMonth()].slice(0,3)}</Text>
    </View>
  );
}

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────

function EmptyState({ icon, text }) {
  return (
    <View style={styles.emptyState}>
      <Feather name={icon} size={32} color="#CBD5E1" />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────

const ACCENT = "#6366F1";
const URGENT = "#EF4444";

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: "#F8FAFC",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  iconBtnActive: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },

  // Tabs
  tabRow: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: "#EEF2FF",
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 9,
  },
  tabActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
  },
  tabTextActive: {
    color: ACCENT,
    fontWeight: "700",
  },

  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  // Pregnancy summary card
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E0E7FF",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  summaryCardUrgent: {
    borderColor: "#FECACA",
    shadowColor: URGENT,
  },
  summaryTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  summaryWeek: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
  },
  summaryTrimester: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
    marginTop: 2,
  },
  progressCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  progressCircleUrgent: {
    backgroundColor: "#FEF2F2",
  },
  progressPct: {
    fontSize: 14,
    fontWeight: "800",
    color: ACCENT,
  },
  progressOf: {
    fontSize: 9,
    color: "#94A3B8",
    fontWeight: "600",
  },
  progressBarBg: {
    height: 6,
    backgroundColor: "#F1F5F9",
    borderRadius: 999,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 999,
  },
  urgentPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 10,
    alignSelf: "flex-start",
    backgroundColor: "#FEF2F2",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  urgentPillText: {
    fontSize: 11,
    color: URGENT,
    fontWeight: "700",
  },

  // Next checkup card
  nextCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E0E7FF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  nextCardUrgent: {
    borderColor: "#FECACA",
  },
  nextIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  nextLabel: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  nextDate: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 1,
  },
  daysBadge: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: "center",
  },
  daysBadgeNum: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    lineHeight: 22,
  },
  daysBadgeLabel: {
    fontSize: 9,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "600",
  },

  // Calendar card
  calCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  calHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  calNavBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  calMonthTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  dayLabelsRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  dayLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
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
    borderRadius: 10,
    marginVertical: 1,
  },
  dayCellToday: {
    backgroundColor: "#0F172A",
  },
  dayCellSelected: {
    backgroundColor: "#EEF2FF",
  },
  dayCellUrgent: {
    backgroundColor: "#FEF2F2",
  },
  dayNumber: {
    fontSize: 13,
    fontWeight: "500",
    color: "#374151",
  },
  dayNumberToday: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  dayNumberSelected: {
    color: ACCENT,
    fontWeight: "700",
  },
  dotsRow: {
    flexDirection: "row",
    gap: 2,
    marginTop: 1,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },

  // Calendar dot legend
  calLegend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },

  // Section
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 10,
  },

  // Event card
  eventCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  eventCardUrgent: {
    borderColor: "#FECACA",
    backgroundColor: "#FFFBFB",
  },
  eventIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  },
  eventSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 1,
    fontWeight: "400",
  },
  eventDateText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94A3B8",
  },

  // Empty state
  emptyState: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "500",
  },
});
