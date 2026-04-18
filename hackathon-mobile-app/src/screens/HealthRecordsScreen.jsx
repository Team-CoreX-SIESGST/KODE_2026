import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { AuthContext } from "../context/AuthContext";
import { patientMe } from "../services/api";

export default function HealthRecordsScreen({ navigation }) {
  const { token } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [healthProfile, setHealthProfile] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      setLoading(true);
      setError("");
      try {
        const data = await patientMe(token);
        setReports(data?.reports || []);
        setAppointments(data?.appointmentHistory || []);
        setHealthProfile(data?.health_records || null);
      } catch (err) {
        setError(err.message || "Failed to load health records");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  const recentReports = useMemo(
    () => (reports || []).slice(0, 10),
    [reports]
  );

  const recentAppointments = useMemo(
    () => (appointments || []).slice(0, 10),
    [appointments]
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <Feather name="arrow-left" size={20} color="#0F172A" />
          </Pressable>
          <Text style={styles.title}>Health Records</Text>
          <View style={styles.iconBtn} />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Text style={styles.sectionTitle}>Health Profile</Text>
        {healthProfile ? (
          <View style={styles.card}>
            <View style={styles.profileRow}>
              <View style={styles.profileItem}>
                <Text style={styles.profileLabel}>Blood Group</Text>
                <Text style={styles.profileValue}>
                  {healthProfile.bloodGroup || "N/A"}
                </Text>
              </View>
              <View style={styles.profileItem}>
                <Text style={styles.profileLabel}>BMI</Text>
                <Text style={styles.profileValue}>
                  {typeof healthProfile.bmi === "number"
                    ? healthProfile.bmi
                    : "N/A"}
                </Text>
              </View>
            </View>
            <View style={styles.profileList}>
              <Text style={styles.profileLabel}>Allergies</Text>
              <Text style={styles.profileValue}>
                {Array.isArray(healthProfile.allergies)
                  ? healthProfile.allergies.join(", ")
                  : healthProfile.allergies || "None"}
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
            <View style={styles.profileList}>
              <Text style={styles.profileLabel}>Disabilities</Text>
              <Text style={styles.profileValue}>
                {Array.isArray(healthProfile.disabilities)
                  ? healthProfile.disabilities.join(", ")
                  : healthProfile.disabilities || "None"}
              </Text>
            </View>
          </View>
        ) : (
          <Text style={styles.helperText}>No health profile data yet.</Text>
        )}

        <Text style={styles.sectionTitle}>Reports</Text>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="small" color="#5DC1B9" />
            <Text style={styles.helperText}>Loading reports...</Text>
          </View>
        ) : recentReports.length === 0 ? (
          <Text style={styles.helperText}>No reports uploaded yet.</Text>
        ) : (
          recentReports.map((report, idx) => (
            <View key={`${report.reportId || idx}`} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardIcon}>
                  <Feather name="file-text" size={16} color="#5DC1B9" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{report.testName}</Text>
                  <Text style={styles.cardMeta}>
                    {report.date || "Date not specified"}
                  </Text>
                </View>
                {report.status ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{report.status}</Text>
                  </View>
                ) : null}
              </View>
              {report.impression ? (
                <Text style={styles.cardNote}>{report.impression}</Text>
              ) : null}
              {report.reportUrl ? (
                <Pressable
                  style={styles.linkButton}
                  onPress={() => Linking.openURL(report.reportUrl)}
                >
                  <Text style={styles.linkButtonText}>Open Report</Text>
                </Pressable>
              ) : null}
            </View>
          ))
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
                  <Text style={styles.cardMeta}>
                    {appt.preferredDate} · {appt.preferredTime}
                  </Text>
                </View>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{appt.status}</Text>
                </View>
              </View>
              {appt.hospitalName ? (
                <Text style={styles.cardMeta}>{appt.hospitalName}</Text>
              ) : null}
              {appt.summary ? (
                <Text style={styles.cardNote}>{appt.summary}</Text>
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
    backgroundColor: "#E8F6F4",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0F172A",
    textTransform: "uppercase",
  },
  cardNote: {
    marginTop: 10,
    color: "#0F172A",
    fontSize: 13,
  },
  linkButton: {
    marginTop: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#0F172A",
    alignItems: "center",
  },
  linkButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
