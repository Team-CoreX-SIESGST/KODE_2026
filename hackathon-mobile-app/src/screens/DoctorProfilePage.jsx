import React, { useContext, useEffect, useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  StyleSheet,
  Text,
  View,
  Image,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { doctorMe } from "../services/api";
import { AuthContext } from "../context/AuthContext";

const fallbackProfile = {
  name: "Dr. Rajinder Singh",
  specialty: "General Medicine",
  qualification: "MBBS, MD",
  registrationId: "PB-MCI-12345",
  facility: "Nabha Civil Hospital",
  experienceYears: 15,
  about:
    "Dr. Rajinder Singh is a dedicated General Physician with over 15 years of experience serving rural communities. He specializes in chronic disease management, preventive care, and primary health education.",
  availability: "09:00 - 14:00",
  languages: ["Punjabi", "Hindi"],
};

export default function DoctorProfilePage({ navigation }) {
  const { token, user, signOut } = useContext(AuthContext);
  const [profile, setProfile] = useState(fallbackProfile);
  const [loading, setLoading] = useState(false);

  const handleLogout = () => {
    signOut();
    navigation.reset({ index: 0, routes: [{ name: "RoleSelection" }] });
  };

  const mergedProfile = useMemo(() => {
    if (!user) return profile;
    return {
      ...profile,
      name: user.name || profile.name,
      specialty: user.specialization || profile.specialty,
      qualification: user.qualification || profile.qualification,
      registrationId: user.registrationId || user.registration || profile.registrationId,
      phoneNumber: user.phoneNumber || profile.phoneNumber,
      facility: user.hospitalName || user.facility || profile.facility,
      experienceYears: user.experienceYears || user.experience || profile.experienceYears,
      about: user.about || user.bio || profile.about,
      languages: user.languages || profile.languages,
    };
  }, [profile, user]);

  useEffect(() => {
    let isMounted = true;
    const loadProfile = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const data = await doctorMe(token);
        if (!isMounted || !data) return;
        setProfile((prev) => ({
          ...prev,
          name: data.name || prev.name,
          specialty: data.specialization || prev.specialty,
          qualification: data.qualification || prev.qualification,
          registrationId: data.registrationId || data.registration || prev.registrationId,
          phoneNumber: data.phoneNumber || prev.phoneNumber,
          facility: data.hospitalName || data.facility || prev.facility,
          experienceYears: data.experienceYears || data.experience || prev.experienceYears,
          about: data.about || data.bio || prev.about,
          languages: data.languages || prev.languages,
        }));
      } catch (err) {
        // Keep fallback data if fetch fails
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, [token]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Doctor Profile</Text>
          <View style={styles.headerActions}>
            <Pressable style={styles.shareButton}>
              <Text style={styles.shareIcon}>↗</Text>
            </Pressable>
            <Pressable style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutText}>Logout</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            <Image
              source={require("../../assets/male-doctor-icon.png")}
              style={styles.avatar}
              resizeMode="contain"
            />
            <View style={styles.onlineDot} />
          </View>
          <Text style={styles.name}>{mergedProfile.name}</Text>
          <Text style={styles.subtitle}>
            {mergedProfile.specialty} · {mergedProfile.qualification}
          </Text>
          <Text style={styles.registration}>
            Registration: {mergedProfile.registrationId}
          </Text>
          {mergedProfile.phoneNumber ? (
            <Text style={styles.phoneLine}>
              Phone: {mergedProfile.phoneNumber}
            </Text>
          ) : null}

          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Telemedicine</Text>
            </View>
            <View style={[styles.badge, styles.badgeMuted]}>
              <Text style={[styles.badgeText, styles.badgeTextMuted]}>
                Verified
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Facility</Text>
            <Text style={styles.infoValue}>{mergedProfile.facility}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Experience</Text>
            <Text style={styles.infoValue}>{mergedProfile.experienceYears}+ Years</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionStack}>
          <Pressable
            style={styles.primaryButton}
            onPress={() => navigation.navigate("DoctorAppointments")}
          >
            <Text style={styles.primaryButtonText}>Appointments</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => navigation.navigate("DoctorNotifications")}
          >
            <Text style={styles.secondaryButtonText}>Notifications</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => navigation.navigate("DoctorPastPatients")}
          >
            <Text style={styles.secondaryButtonText}>Past Patients</Text>
          </Pressable>
        </View>

        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.aboutText}>{mergedProfile.about}</Text>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Availability</Text>
          <Text style={styles.sectionAccent}>{mergedProfile.availability}</Text>
        </View>

        <View style={styles.dayRow}>
          {[
            { day: "MON", date: "09", active: true },
            { day: "TUE", date: "10" },
            { day: "WED", date: "11" },
            { day: "THU", date: "12" },
            { day: "FRI", date: "13" },
          ].map((item) => (
            <View
              key={item.day}
              style={[styles.dayCard, item.active && styles.dayCardActive]}
            >
              <Text style={[styles.dayText, item.active && styles.dayTextActive]}>
                {item.day}
              </Text>
              <Text
                style={[styles.dateText, item.active && styles.dateTextActive]}
              >
                {item.date}
              </Text>
            </View>
          ))}
        </View>
        <Text style={styles.helperText}>Available Monday to Friday</Text>

        <Text style={styles.sectionTitle}>Languages Spoken</Text>
        <View style={styles.languageRow}>
          {mergedProfile.languages?.map((lang) => (
            <View key={lang} style={styles.languagePill}>
              <Text style={styles.languageText}>{lang}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#5DC1B9" />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F5FAF9",
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0F172A",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  shareButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E8F6F4",
    alignItems: "center",
    justifyContent: "center",
  },
  shareIcon: {
    fontSize: 16,
    color: "#5DC1B9",
  },
  logoutButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: "#0F172A",
  },
  logoutText: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "700",
  },
  profileCard: {
    backgroundColor: "#F8FFFE",
    borderRadius: 28,
    paddingVertical: 22,
    paddingHorizontal: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E6F2F0",
  },
  avatarWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#E2F3F1",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  avatar: {
    width: 90,
    height: 90,
  },
  onlineDot: {
    position: "absolute",
    right: 10,
    bottom: 10,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#22C55E",
    borderWidth: 3,
    borderColor: "#F8FFFE",
  },
  name: {
    marginTop: 14,
    fontSize: 22,
    fontWeight: "700",
    color: "#0F172A",
    textAlign: "center",
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: "#5DC1B9",
    fontWeight: "600",
    textAlign: "center",
  },
  registration: {
    marginTop: 6,
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
  },
  phoneLine: {
    marginTop: 4,
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
  },
  badgeRow: {
    marginTop: 16,
    flexDirection: "row",
    gap: 12,
  },
  badge: {
    backgroundColor: "#E8F6F4",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  badgeMuted: {
    backgroundColor: "#EEF2F6",
  },
  badgeText: {
    color: "#5DC1B9",
    fontWeight: "700",
    fontSize: 12,
    textTransform: "uppercase",
  },
  badgeTextMuted: {
    color: "#64748B",
  },
  infoRow: {
    marginTop: 18,
    flexDirection: "row",
    gap: 12,
  },
  infoCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EEF1F4",
  },
  infoLabel: {
    fontSize: 12,
    color: "#7B8794",
    textTransform: "uppercase",
    fontWeight: "600",
  },
  infoValue: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  sectionTitle: {
    marginTop: 20,
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  actionStack: {
    marginTop: 12,
    gap: 12,
  },
  aboutText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 22,
    color: "#64748B",
  },
  sectionRow: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionAccent: {
    fontSize: 14,
    color: "#5DC1B9",
    fontWeight: "600",
  },
  dayRow: {
    marginTop: 12,
    flexDirection: "row",
    gap: 10,
  },
  dayCard: {
    width: 58,
    height: 72,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E6EEF0",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  dayCardActive: {
    backgroundColor: "#5DC1B9",
    borderColor: "#5DC1B9",
  },
  dayText: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "700",
  },
  dayTextActive: {
    color: "#FFFFFF",
  },
  dateText: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  dateTextActive: {
    color: "#FFFFFF",
  },
  helperText: {
    marginTop: 8,
    fontSize: 12,
    color: "#94A3B8",
  },
  languageRow: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  languagePill: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  languageText: {
    fontSize: 13,
    color: "#0F172A",
    fontWeight: "600",
  },
  primaryButton: {
    backgroundColor: "#5DC1B9",
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  secondaryButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  loadingOverlay: {
    position: "absolute",
    top: 16,
    right: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 8,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 2,
  },
});
