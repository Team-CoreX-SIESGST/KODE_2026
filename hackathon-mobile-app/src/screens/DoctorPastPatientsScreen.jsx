import React, { useContext, useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet, Text, View, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import { AuthContext } from "../context/AuthContext";
import { doctorPastPatients } from "../services/api";

export default function DoctorPastPatientsScreen() {
  const { token } = useContext(AuthContext);
  const [appointments, setAppointments] = useState([]);

  const load = async () => {
    if (!token) return;
    const data = await doctorPastPatients(token);
    setAppointments(data.results || []);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Past Patients</Text>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>
              {appointments.length} Completed
            </Text>
          </View>
        </View>

        {appointments.length === 0 ? (
          <Text style={styles.helper}>No past patients yet.</Text>
        ) : (
          appointments.map((appt) => (
            <View key={appt._id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.avatar}>
                  <Feather name="user" size={18} color="#0F172A" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>
                    {appt.patient?.abha_profile?.name || "Patient"}
                  </Text>
                  <Text style={styles.meta}>
                    {appt.preferredDate} · {appt.preferredTime}
                  </Text>
                </View>
                <View style={styles.typeBadge}>
                  <Text style={styles.typeBadgeText}>
                    {appt.appointmentType?.replace("_", " ") || "OFFLINE"}
                  </Text>
                </View>
              </View>
              {appt.conversationSummary ? (
                <View style={styles.summaryCard}>
                  <Feather name="activity" size={14} color="#5DC1B9" />
                  <Text style={styles.summaryText}>
                    {appt.conversationSummary}
                  </Text>
                </View>
              ) : null}
              {appt.conversationInsights ? (
                <Text style={styles.meta}>
                  Insights: {appt.conversationInsights}
                </Text>
              ) : null}
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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0F172A",
  },
  headerBadge: {
    backgroundColor: "#E8F6F4",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  headerBadgeText: {
    color: "#0F172A",
    fontWeight: "700",
    fontSize: 11,
  },
  helper: {
    marginTop: 10,
    color: "#64748B",
  },
  card: {
    marginTop: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E6EEF0",
    backgroundColor: "#FFFFFF",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontWeight: "700",
    color: "#0F172A",
  },
  meta: {
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
    fontSize: 11,
    fontWeight: "700",
    color: "#0F172A",
    textTransform: "uppercase",
  },
  summaryCard: {
    marginTop: 12,
    backgroundColor: "#F0FBFA",
    borderRadius: 12,
    padding: 10,
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
  },
  summaryText: {
    flex: 1,
    color: "#0F172A",
    fontSize: 13,
  },
});
