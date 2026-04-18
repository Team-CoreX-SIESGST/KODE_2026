import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Modal,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { AuthContext } from "../context/AuthContext";
import { patientMe, patientCreateRecord, patientUpdateRecord } from "../services/api";
import { assess, buildPatientInputsFromProfile } from "../services/ruleEngine";
import {
  ANC_BOOLEAN_FIELDS,
  ANC_NUMERIC_FIELDS,
  URINE_PROTEIN_OPTIONS,
  normalizeAncInputs,
  riskTone,
  sanitizeNumericInput,
  statusLabel,
  toInputValue,
} from "../services/ancAssessment";

function buildRecordDraft(profile) {
  return {
    date: new Date().toISOString().split("T")[0],
    ...buildPatientInputsFromProfile(profile),
  };
}

function assessmentBadgeStyle(tone) {
  if (tone === "high") return { backgroundColor: "#FEE2E2", color: "#DC2626" };
  if (tone === "medium") return { backgroundColor: "#FEF3C7", color: "#B45309" };
  return { backgroundColor: "#DCFCE7", color: "#15803D" };
}

export default function HealthRecordsScreen({ navigation }) {
  const { token } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [healthProfile, setHealthProfile] = useState(null);
  const [patientProfile, setPatientProfile] = useState(null);
  const [error, setError] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [formData, setFormData] = useState(() => buildRecordDraft({}));

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const data = await patientMe(token);
      setPatientProfile(data || null);
      setReports(data?.reports || []);
      setAppointments(data?.appointmentHistory || []);
      setHealthProfile(data?.health_records || null);
    } catch (err) {
      setError(err.message || "Failed to load health records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  const normalizedForm = useMemo(() => normalizeAncInputs(formData), [formData]);
  const currentAssessment = useMemo(() => assess(normalizedForm), [normalizedForm]);

  const handleOpenModal = (report = null) => {
    if (report?.ancInputs) {
      setEditingReport(report);
      setFormData({
        date: report.rawDate ? new Date(report.rawDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
        ...report.ancInputs,
      });
    } else {
      setEditingReport(null);
      setFormData(buildRecordDraft(patientProfile || {}));
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    const payload = {
      ...normalizedForm,
      date: formData.date,
      testName: "Maternal ANC Assessment",
      impression: currentAssessment.reasons.join(" | "),
      status: currentAssessment.riskBand,
      score: currentAssessment.score,
      reasons: currentAssessment.reasons,
      hindiReasons: currentAssessment.hindiReasons,
      decision: currentAssessment.decision,
      emergencyType: currentAssessment.emergencyType,
      nextVisitWeeks: currentAssessment.nextVisitWeeks,
      referralLevel: currentAssessment.referralLevel,
    };

    try {
      if (editingReport) {
        await patientUpdateRecord(token, editingReport.reportId, payload);
      } else {
        await patientCreateRecord(token, payload);
      }
      setModalVisible(false);
      await load();
    } catch (err) {
      Alert.alert("Error", err.message || "Failed to save record");
    }
  };

  const recentReports = useMemo(() => (reports || []).slice(0, 10), [reports]);
  const recentAppointments = useMemo(() => (appointments || []).slice(0, 10), [appointments]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Feather name="arrow-left" size={20} color="#0F172A" />
          </Pressable>
          <Text style={styles.title}>Health Records</Text>
          <TouchableOpacity onPress={() => handleOpenModal()} style={styles.iconBtn}>
            <Feather name="plus" size={20} color="#5DC1B9" />
          </TouchableOpacity>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Text style={styles.sectionTitle}>Health Profile</Text>
        {healthProfile ? (
          <View style={styles.card}>
            <View style={styles.profileRow}>
              <View style={styles.profileItem}>
                <Text style={styles.profileLabel}>Blood Group</Text>
                <Text style={styles.profileValue}>{healthProfile.bloodGroup || "N/A"}</Text>
              </View>
              <View style={styles.profileItem}>
                <Text style={styles.profileLabel}>BMI</Text>
                <Text style={styles.profileValue}>{typeof healthProfile.bmi === "number" ? healthProfile.bmi : "N/A"}</Text>
              </View>
            </View>
            <View style={styles.profileList}>
              <Text style={styles.profileLabel}>Allergies</Text>
              <Text style={styles.profileValue}>
                {Array.isArray(healthProfile.allergies) ? healthProfile.allergies.join(", ") : healthProfile.allergies || "None"}
              </Text>
            </View>
            <View style={styles.profileList}>
              <Text style={styles.profileLabel}>Chronic Conditions</Text>
              <Text style={styles.profileValue}>
                {Array.isArray(healthProfile.chronicConditions)
                  ? healthProfile.chronicConditions.join(", ")
                  : healthProfile.chronicConditions || "None"}
              </Text>
            </View>
          </View>
        ) : (
          <Text style={styles.helperText}>No health profile data yet.</Text>
        )}

        <Text style={styles.sectionTitle}>ANC Records</Text>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="small" color="#5DC1B9" />
            <Text style={styles.helperText}>Loading ANC records...</Text>
          </View>
        ) : recentReports.length === 0 ? (
          <Text style={styles.helperText}>No ANC records yet.</Text>
        ) : (
          recentReports.map((report, idx) => {
            const tone = riskTone(report.status);
            const badge = assessmentBadgeStyle(tone);
            return (
              <View key={`${report.reportId || idx}`} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardIcon}>
                    <Feather name="activity" size={16} color="#5DC1B9" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{report.testName}</Text>
                    <Text style={styles.cardMeta}>{report.date || "Date not specified"}</Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <View style={[styles.badge, { backgroundColor: badge.backgroundColor }]}>
                      <Text style={[styles.badgeText, { color: badge.color }]}>{report.status}</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleOpenModal(report)}>
                      <Feather name="edit-2" size={16} color="#94A3B8" />
                    </TouchableOpacity>
                  </View>
                </View>
                {report.impression ? <Text style={styles.cardNote}>{report.impression}</Text> : null}
                {report.ancInputs ? (
                  <View style={styles.metricsWrap}>
                    <Text style={styles.metricChip}>BP {report.ancInputs.sbp || "?"}/{report.ancInputs.dbp || "?"}</Text>
                    <Text style={styles.metricChip}>Hb {report.ancInputs.hb ?? "?"}</Text>
                    <Text style={styles.metricChip}>FHS {report.ancInputs.fhs ?? "?"}</Text>
                    <Text style={styles.metricChip}>Weeks {report.ancInputs.gestationalWeekage ?? "?"}</Text>
                  </View>
                ) : null}
              </View>
            );
          })
        )}

        <Text style={styles.sectionTitle}>Appointment History</Text>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="small" color="#5DC1B9" />
            <Text style={styles.helperText}>Loading appointments...</Text>
          </View>
        ) : recentAppointments.length === 0 ? (
          <Text style={styles.helperText}>No appointments yet.</Text>
        ) : (
          recentAppointments.map((appt) => (
            <View key={appt._id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardIconAlt}>
                  <Feather name="user" size={16} color="#0F172A" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{appt.doctorName}</Text>
                  <Text style={styles.cardMeta}>{appt.preferredDate} · {appt.preferredTime}</Text>
                </View>
                <View style={[styles.badge, appt.status?.includes("HIGH") && { backgroundColor: "#FEE2E2" }]}>
                  <Text style={[styles.badgeText, appt.status?.includes("HIGH") && { color: "#DC2626" }]}>{appt.status}</Text>
                </View>
              </View>
              {appt.summary ? <Text style={styles.cardNote}>{appt.summary}</Text> : null}
            </View>
          ))
        )}
      </ScrollView>

      <Modal animationType="slide" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingReport ? "Edit ANC Record" : "Add ANC Record"}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Feather name="x" size={24} color="#0F172A" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Visit Date</Text>
              <TextInput
                style={styles.input}
                value={formData.date || ""}
                onChangeText={(text) => setFormData((prev) => ({ ...prev, date: text }))}
                placeholder="YYYY-MM-DD"
              />

              <Text style={styles.inputLabel}>Current Assessment</Text>
              <View style={[styles.assessmentCard, riskTone(currentAssessment.riskBand) === "high" ? styles.assessmentHigh : riskTone(currentAssessment.riskBand) === "medium" ? styles.assessmentMedium : styles.assessmentLow]}>
                <Text style={styles.assessmentTitle}>{statusLabel(currentAssessment)}</Text>
                <Text style={styles.assessmentMeta}>
                  {currentAssessment.decision} · Score {currentAssessment.score} · {currentAssessment.referralLevel}
                </Text>
              </View>

              {ANC_NUMERIC_FIELDS.map((field) => (
                <View key={field.key}>
                  <Text style={styles.inputLabel}>{field.label}</Text>
                  <TextInput
                    style={styles.input}
                    value={toInputValue(formData[field.key])}
                    onChangeText={(text) =>
                      setFormData((prev) => ({ ...prev, [field.key]: sanitizeNumericInput(text) }))
                    }
                    keyboardType="decimal-pad"
                    placeholder={field.placeholder}
                  />
                </View>
              ))}

              <Text style={styles.inputLabel}>Urine Protein</Text>
              <View style={styles.statusRow}>
                {URINE_PROTEIN_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option}
                    onPress={() => setFormData((prev) => ({ ...prev, urineProtein: option }))}
                    style={[styles.statusPill, normalizeAncInputs(formData).urineProtein === option && styles.statusPillActive]}
                  >
                    <Text style={[styles.statusPillText, normalizeAncInputs(formData).urineProtein === option && styles.statusPillTextActive]}>
                      {option === 0 ? "0" : `${option}+`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Clinical Flags</Text>
              {ANC_BOOLEAN_FIELDS.map((field) => {
                const active = Boolean(formData[field.key]);
                return (
                  <TouchableOpacity
                    key={field.key}
                    onPress={() => setFormData((prev) => ({ ...prev, [field.key]: !active }))}
                    style={[styles.toggleRow, active && styles.toggleRowActive]}
                  >
                    <Text style={[styles.toggleText, active && styles.toggleTextActive]}>{field.label}</Text>
                    <View style={[styles.toggleBadge, active && styles.toggleBadgeActive]}>
                      <Text style={[styles.toggleBadgeText, active && styles.toggleBadgeTextActive]}>{active ? "Yes" : "No"}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {currentAssessment.reasons?.length > 0 ? (
                <>
                  <Text style={styles.inputLabel}>Why This Prediction</Text>
                  <View style={styles.reasonsWrap}>
                    {currentAssessment.reasons.map((reason, index) => (
                      <View key={`${reason}-${index}`} style={styles.reasonRow}>
                        <Feather name="chevron-right" size={14} color="#64748B" />
                        <Text style={styles.reasonText}>{reason}</Text>
                      </View>
                    ))}
                  </View>
                </>
              ) : null}

              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>Save ANC Record</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F7FAFB",
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#E8F6F4",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  sectionTitle: {
    marginTop: 18,
    fontSize: 15,
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  helperText: {
    marginTop: 10,
    color: "#64748B",
  },
  errorText: {
    marginTop: 10,
    color: "#DC2626",
  },
  center: {
    alignItems: "center",
    marginTop: 12,
  },
  card: {
    marginTop: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6EEF0",
  },
  profileRow: {
    flexDirection: "row",
    gap: 12,
  },
  profileItem: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  profileLabel: {
    fontSize: 11,
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  profileValue: {
    marginTop: 6,
    fontWeight: "700",
    color: "#0F172A",
  },
  profileList: {
    marginTop: 10,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#F0FBFA",
    alignItems: "center",
    justifyContent: "center",
  },
  cardIconAlt: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  cardMeta: {
    marginTop: 4,
    color: "#64748B",
    fontSize: 12,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  cardNote: {
    marginTop: 10,
    color: "#0F172A",
    fontSize: 13,
    lineHeight: 18,
  },
  metricsWrap: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metricChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#F1F5F9",
    color: "#334155",
    fontSize: 12,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "88%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#0F172A",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  assessmentCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  assessmentLow: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
  },
  assessmentMedium: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FED7AA",
  },
  assessmentHigh: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  assessmentTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  assessmentMeta: {
    marginTop: 4,
    color: "#475569",
    fontSize: 13,
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 10,
  },
  statusPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
  },
  statusPillActive: {
    backgroundColor: "#5DC1B9",
  },
  statusPillText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  statusPillTextActive: {
    color: "#FFFFFF",
  },
  toggleRow: {
    marginTop: 10,
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  toggleRowActive: {
    backgroundColor: "#ECFDF5",
    borderColor: "#86EFAC",
  },
  toggleText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  },
  toggleTextActive: {
    color: "#166534",
  },
  toggleBadge: {
    backgroundColor: "#E2E8F0",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  toggleBadgeActive: {
    backgroundColor: "#16A34A",
  },
  toggleBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  toggleBadgeTextActive: {
    color: "#FFFFFF",
  },
  reasonsWrap: {
    marginTop: 10,
    gap: 8,
  },
  reasonRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  reasonText: {
    flex: 1,
    fontSize: 13,
    color: "#334155",
    lineHeight: 18,
  },
  saveButton: {
    marginTop: 28,
    backgroundColor: "#0F172A",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 20,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
