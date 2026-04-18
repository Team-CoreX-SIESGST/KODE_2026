import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  StyleSheet,
  Text,
  View,
  Image,
  ScrollView,
} from "react-native";

const quickActions = [
  { title: "Appointments", icon: "📅" },
  { title: "Patient Records", icon: "📁" },
  { title: "Prescriptions", icon: "💊" },
  { title: "Revenue", icon: "💰" },
];

const upcomingAppointments = [
  {
    patientName: "Alice Smith",
    time: "10:00 AM",
    type: "Video Consult",
    avatar: require("../../assets/female-icon.png"),
  },
  {
    patientName: "Bob Johnson",
    time: "11:30 AM",
    type: "In-Person",
    avatar: require("../../assets/male-icon.png"),
  },
];

export default function ConsultantDashboardMock() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greetingSmall}>Good Morning,</Text>
            <Text style={styles.greeting}>Dr. Sarah</Text>
          </View>
          <View style={styles.avatarRing}>
            <Image
              source={require("../../assets/female-icon.png")}
              style={styles.headerAvatar}
              resizeMode="contain"
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Dashboard Hub</Text>
        <View style={styles.quickGrid}>
          {quickActions.map((item) => (
            <View key={item.title} style={styles.quickCard}>
              <View style={styles.quickIconCircle}>
                <Text style={styles.quickIconText}>{item.icon}</Text>
              </View>
              <Text style={styles.quickTitle}>{item.title}</Text>
            </View>
          ))}
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
          <Text style={styles.sectionLink}>See All</Text>
        </View>
        <View style={styles.patientList}>
          {upcomingAppointments.map((appointment) => (
            <View key={appointment.patientName} style={styles.patientCard}>
              <View style={styles.patientAvatarWrap}>
                <Image source={appointment.avatar} style={styles.patientAvatar} />
              </View>
              <View style={styles.patientInfo}>
                <Text style={styles.patientName}>{appointment.patientName}</Text>
                <Text style={styles.patientMeta}>{appointment.time} • {appointment.type}</Text>
              </View>
              <View style={styles.patientArrow}>
                <Text style={styles.patientArrowText}>{">"}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.bottomNav}>
        {["Home", "Appointments", "Patients", "Chat", "Profile"].map(
          (label, index) => (
            <View key={label} style={styles.navItem}>
              <View
                style={[styles.navDot, index === 0 && styles.navDotActive]}
              />
              <Text
                style={[styles.navLabel, index === 0 && styles.navLabelActive]}
              >
                {label}
              </Text>
            </View>
          )
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F7FAFB",
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 120,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  greetingSmall: {
    fontSize: 15,
    color: "#7A8798",
  },
  greeting: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1F2937",
    marginTop: 2,
  },
  avatarRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: "#5DC1B9",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  headerAvatar: {
    width: 34,
    height: 34,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    marginTop: 18,
    marginBottom: 12,
  },
  sectionRow: {
    marginTop: 20,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionLink: {
    fontSize: 14,
    color: "#5DC1B9",
    fontWeight: "600",
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 14,
  },
  quickCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  quickIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#E8F6F4",
    alignItems: "center",
    justifyContent: "center",
  },
  quickIconText: {
    fontSize: 20,
  },
  quickTitle: {
    marginTop: 12,
    fontSize: 15,
    color: "#1F2937",
    fontWeight: "600",
    textAlign: "center",
  },
  patientList: {
    gap: 14,
  },
  patientCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  patientAvatarWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#F3F5F7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  patientAvatar: {
    width: 40,
    height: 40,
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  patientMeta: {
    marginTop: 4,
    fontSize: 13,
    color: "#6B7280",
  },
  patientArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E8F6F4",
    alignItems: "center",
    justifyContent: "center",
  },
  patientArrowText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#5DC1B9",
  },
  bottomNav: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 74,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#EEF1F4",
  },
  navItem: {
    alignItems: "center",
    gap: 6,
  },
  navDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#CBD5E1",
  },
  navDotActive: {
    backgroundColor: "#5DC1B9",
  },
  navLabel: {
    fontSize: 12,
    color: "#9AA3AF",
  },
  navLabelActive: {
    color: "#5DC1B9",
    fontWeight: "700",
  },
});
