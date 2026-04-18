import React, { useContext, useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { AuthContext } from "../context/AuthContext";
import {
  doctorAppointments,
  doctorUpdateAppointmentStatus,
  doctorStartCall,
} from "../services/api";
import { getCalendlyLink } from "../services/callLinks";

export default function DoctorAppointmentsScreen({ navigation }) {
  const { token } = useContext(AuthContext);
  const [appointments, setAppointments] = useState([]);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      const data = await doctorAppointments(token);
      setAppointments(data.results || []);
    } catch (err) {
      setError(err.message || "Failed to load appointments");
    }
  };

  const isAppointmentTime = () => true;

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (id, status) => {
    try {
      await doctorUpdateAppointmentStatus(token, id, status);
      await load();
    } catch (err) {
      setError(err.message || "Unable to update status");
    }
  };

  const startCall = async (appointment, callType) => {
    try {
      const result = await doctorStartCall(token, appointment._id, callType);
      const url =
        result?.videoLink || getCalendlyLink(callType || appointment?.appointmentType);
      navigation.navigate("CallScreen", {
        url,
        title: callType === "AUDIO_CALL" ? "Start Audio Call" : "Start Video Call",
      });
      await load();
    } catch (err) {
      setError(err.message || "Unable to start call");
    }
  };

  const activeAppointments = appointments.filter(
    (appt) => appt.status !== "COMPLETED" && appt.status !== "CANCELLED"
  );
  const completedAppointments = appointments.filter(
    (appt) => appt.status === "COMPLETED"
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Doctor Appointments</Text>
            <Text style={styles.subtitle}>
              Urgency score is visible only to doctors.
            </Text>
          </View>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>
              {activeAppointments.length} Active
            </Text>
          </View>
        </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Text style={styles.sectionTitle}>Active Appointments</Text>
      {activeAppointments.length === 0 ? (
        <Text style={styles.helperText}>No active appointments.</Text>
      ) : (
        activeAppointments.map((appt) => (
          <View key={appt._id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View>
                <Text style={styles.cardTitle}>
                  {appt.patient.abha_profile.name || "Patient"}
                </Text>
                <Text style={styles.cardMeta}>
                  {appt.preferredDate} · {appt.preferredTime}
                </Text>
              </View>
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>
                  {appt.appointmentType?.replace("_", " ") || "OFFLINE"}
                </Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Status</Text>
                <Text style={styles.statValue}>{appt.status}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Urgency</Text>
                <Text style={styles.statValue}>{appt.urgencyScore}/100</Text>
              </View>
            </View>

            {appt.aiSummary ? (
              <View style={styles.noteCard}>
                <Feather name="activity" size={14} color="#5DC1B9" />
                <Text style={styles.noteText}>{appt.aiSummary}</Text>
              </View>
            ) : null}

            <View style={styles.buttonRow}>
              <Pressable
                style={styles.actionButton}
                onPress={() => updateStatus(appt._id, "BOOKED")}
              >
                <Text style={styles.actionText}>Mark Booked</Text>
              </Pressable>
              <Pressable
                style={styles.actionButtonAlt}
                onPress={() => updateStatus(appt._id, "CANCELLED")}
              >
                <Text style={styles.actionTextAlt}>Cancel</Text>
              </Pressable>
            </View>

            {appt.status !== "CANCELLED" &&
            appt.status !== "COMPLETED" &&
            isAppointmentTime(appt.preferredDate) ? (
              <View style={styles.callRow}>
                <Pressable
                  style={styles.callButton}
                  onPress={() => startCall(appt, "VIDEO_CALL")}
                >
                  <Text style={styles.callButtonText}>Start Video Call</Text>
                </Pressable>
                <Pressable
                  style={styles.callButtonAlt}
                  onPress={() => startCall(appt, "AUDIO_CALL")}
                >
                  <Text style={styles.callButtonAltText}>Start Audio Call</Text>
                </Pressable>
              </View>
            ) : null}

          </View>
        ))
      )}

        <Text style={styles.sectionTitle}>Past Appointments</Text>
        {completedAppointments.length === 0 ? (
          <Text style={styles.helperText}>No past appointments yet.</Text>
        ) : (
          completedAppointments.map((appt) => (
            <View key={appt._id} style={styles.cardSmall}>
              <View>
                <Text style={styles.cardTitle}>
                  {appt.patient.abha_profile.name || "Patient"}
                </Text>
                <Text style={styles.cardMeta}>
                  {appt.preferredDate} · {appt.preferredTime}
                </Text>
              </View>
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>Completed</Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  container: {
    padding: 20,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0F172A",
  },
  subtitle: {
    marginTop: 6,
    color: "#64748B",
  },
  headerBadge: {
    backgroundColor: "#E8F6F4",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  headerBadgeText: {
    color: "#0F172A",
    fontWeight: "700",
    fontSize: 12,
  },
  errorText: {
    marginTop: 10,
    color: "#DC2626",
  },
  sectionTitle: {
    marginTop: 18,
    fontSize: 16,
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  helperText: {
    marginTop: 8,
    color: "#64748B",
  },
  card: {
    marginTop: 16,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E6EEF0",
    backgroundColor: "#FFFFFF",
  },
  cardSmall: {
    marginTop: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E6EEF0",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  cardTitle: {
    fontWeight: "700",
    color: "#0F172A",
  },
  cardMeta: {
    marginTop: 4,
    color: "#64748B",
  },
  typeBadge: {
    backgroundColor: "#E8F6F4",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  typeBadgeText: {
    color: "#0F172A",
    fontWeight: "700",
    fontSize: 11,
    textTransform: "uppercase",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  statLabel: {
    fontSize: 11,
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statValue: {
    marginTop: 6,
    fontWeight: "700",
    color: "#0F172A",
  },
  noteCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#F0FBFA",
    padding: 10,
    borderRadius: 12,
    marginBottom: 10,
  },
  noteText: {
    flex: 1,
    color: "#0F172A",
    fontSize: 13,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#E7FAF8",
    alignItems: "center",
  },
  actionText: {
    color: "#0F172A",
    fontWeight: "600",
  },
  actionButtonAlt: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
  },
  actionTextAlt: {
    color: "#B91C1C",
    fontWeight: "600",
  },
  callButton: {
    marginTop: 10,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#0F172A",
    alignItems: "center",
  },
  callButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  callRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  callButtonAlt: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
  },
  callButtonAltText: {
    color: "#0F172A",
    fontWeight: "700",
  },
});
