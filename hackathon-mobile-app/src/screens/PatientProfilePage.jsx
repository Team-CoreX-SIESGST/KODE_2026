import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Image,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { patientMe } from "../services/api";
import { AuthContext } from "../context/AuthContext";

const fallbackProfile = {
  name: "Gurpreet Kaur",
  abhaId: "12-3456-7890-0001",
  abhaIdCard: "https://abdm.gov.in/",
  email: "gurpreet.kaur@abdm",
  gender: "F",
  bloodGroup: "B+",
  bmi: "21.6",
  allergies: "Penicillin",
  condition: "Anaemia",
  recentConsultation: {
    doctor: "Dr. Rajinder Singh",
    specialty: "General Physician",
    status: "Completed",
    diagnosis: "Iron Deficiency Anaemia",
    followUp: "10 Dec 2025",
  },
  policyNumber: "AB-PB-2025-001234",
  supportName: "Sunita Devi",
  supportRole: "ASHA Worker",
  address: "Barnala Khurd, Nabha, Patiala, Punjab",
};

export default function PatientProfilePage() {
  const navigation = useNavigation();
  const { token, user, signOut } = useContext(AuthContext);
  const [profile, setProfile] = useState(fallbackProfile);
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const mergedProfile = useMemo(() => {
    // Prefer ABHA profile coming from the logged-in user,
    // then any profile loaded via /patient/me, then fallback.
    const abhaProfile = user?.abha_profile || profile.abha_profile || {};

    return {
      ...fallbackProfile,
      ...profile,
      name:
        abhaProfile.firstName ||
        abhaProfile.name ||
        user?.name ||
        fallbackProfile.name,
      // ABHA number shown under the name
      abhaId:
        abhaProfile.healthIdNumber ||
        abhaProfile.abha_id ||
        user?.abhaId ||
        fallbackProfile.abhaId,
      // ABHA card link (image / PDF URL)
      abhaIdCard:
        abhaProfile.abha_id_card ||
        user?.abhaIdCard ||
        fallbackProfile.abhaIdCard,
      // Show ABHA handle (healthId) in the "email" row as requested
      email:
        abhaProfile.healthId ||
        abhaProfile.email ||
        user?.email ||
        fallbackProfile.email,
      // Drive gender primarily from ABHA profile
      gender: abhaProfile.gender || user?.gender || fallbackProfile.gender,
      // Health vitals: prefer values coming from the logged-in user
      // (server response on login), then anything we loaded into profile,
      // and finally the static fallback.
      bloodGroup:
        user?.bloodGroup || profile.bloodGroup || fallbackProfile.bloodGroup,
      bmi: user?.bmi || profile.bmi || fallbackProfile.bmi,
      allergies:
        user?.allergies || profile.allergies || fallbackProfile.allergies,
      condition:
        user?.condition || profile.condition || fallbackProfile.condition,
      policyNumber:
        user?.policyNumber ||
        profile.policyNumber ||
        fallbackProfile.policyNumber,
      supportName:
        user?.supportName || profile.supportName || fallbackProfile.supportName,
      supportRole:
        user?.supportRole || profile.supportRole || fallbackProfile.supportRole,
      address: user?.address || profile.address || fallbackProfile.address,
    };
  }, [profile, user]);

  useEffect(() => {
    let isMounted = true;
    const loadProfile = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const data = await patientMe(token);
        if (!isMounted || !data) return;
        setProfile((prev) => ({
          ...prev,
          name: data.name || prev.name,
          abha_profile: data.abha_profile || prev.abha_profile,
          bloodGroup: data.bloodGroup || prev.bloodGroup,
          bmi: data.bmi || prev.bmi,
          allergies: data.allergies || prev.allergies,
          condition: data.condition || prev.condition,
          policyNumber: data.policyNumber || prev.policyNumber,
          supportName: data.supportName || prev.supportName,
          supportRole: data.supportRole || prev.supportRole,
          address: data.address || prev.address,
          ashaWorker: data.ashaWorker || prev.ashaWorker,
          ashaWorkerAssignedAt:
            data.ashaWorkerAssignedAt || prev.ashaWorkerAssignedAt,
          recentConsultation:
            data.recentConsultation || prev.recentConsultation || fallbackProfile.recentConsultation,
        }));
      } catch (err) {
        // keep fallback data
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

  const avatarSource =
    mergedProfile.gender === "M"
      ? require("../../assets/male-icon.png")
      : require("../../assets/female-icon.png");

  const handleOpenAbha = async () => {
    if (!mergedProfile.abhaIdCard) return;
    const canOpen = await Linking.canOpenURL(mergedProfile.abhaIdCard);
    if (canOpen) {
      Linking.openURL(mergedProfile.abhaIdCard);
    }
  };

  const handleLogout = () => {
    setMenuOpen(false);
    signOut();
    navigation.reset({ index: 0, routes: [{ name: "RoleSelection" }] });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <View style={styles.headerIcon}>
            <Feather name="chevron-left" size={20} color="#4B5563" />
          </View>
          <Text style={styles.headerTitle}>Patient Profile</Text>
          <View style={styles.headerMenuWrap}>
            <Pressable
              style={styles.headerIcon}
              onPress={() => setMenuOpen((prev) => !prev)}
            >
              <Feather name="more-vertical" size={18} color="#4B5563" />
            </Pressable>
            {menuOpen && (
              <View style={styles.headerMenu}>
                <Pressable style={styles.menuItem} onPress={handleLogout}>
                  <Text style={styles.menuTextDanger}>Logout</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.avatarWrap}>
            <Image source={avatarSource} style={styles.avatar} />
          </View>
          <Text style={styles.name}>{mergedProfile.name}</Text>
          <Pressable onPress={handleOpenAbha}>
            <Text style={styles.abhaId}>ABHA ID: {mergedProfile.abhaId}</Text>
          </Pressable>
          <Text style={styles.email}>{mergedProfile.email}</Text>
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Blood Group</Text>
            <Text style={styles.metricValue}>{mergedProfile.bloodGroup}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>BMI</Text>
            <Text style={styles.metricValue}>{mergedProfile.bmi}</Text>
          </View>
        </View>

        <View style={styles.alertCard}>
          <Text style={styles.alertLabel}>Allergies</Text>
          <Text style={styles.alertValue}>{mergedProfile.allergies}</Text>
        </View>

        <Text style={styles.sectionTitle}>Medical Conditions</Text>
        <View style={styles.conditionCard}>
          <View style={styles.conditionIcon}>
            <Feather name="plus-square" size={18} color="#F97316" />
          </View>
          <View>
            <Text style={styles.conditionLabel}>Chronic Condition</Text>
            <Text style={styles.conditionValue}>{mergedProfile.condition}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Recent Consultation</Text>
        <View style={styles.consultCard}>
          <View style={styles.consultHeader}>
            <View>
              <Text style={styles.consultDoctor}>
                {mergedProfile.recentConsultation.doctor}
              </Text>
              <Text style={styles.consultSpecialty}>
                {mergedProfile.recentConsultation.specialty}
              </Text>
            </View>
            <View style={styles.consultBadge}>
              <Text style={styles.consultBadgeText}>
                {mergedProfile.recentConsultation.status}
              </Text>
            </View>
          </View>
          <View style={styles.consultDivider} />
          <Text style={styles.consultLabel}>Diagnosis</Text>
          <Text style={styles.consultValue}>
            {mergedProfile.recentConsultation.diagnosis}
          </Text>
          <View style={styles.consultDivider} />
          <View style={styles.consultFooter}>
            <View>
              <Text style={styles.consultLabel}>Follow-up</Text>
              <Text style={styles.consultValue}>
                {mergedProfile.recentConsultation.followUp}
              </Text>
            </View>
            <Text style={styles.consultLink}>Reports</Text>
          </View>
        </View>

        <View style={styles.policyCard}>
          <Feather name="shield" size={18} color="#D1FAE5" />
          <Text style={styles.policyLabel}>Policy Number</Text>
          <Text style={styles.policyValue}>{mergedProfile.policyNumber}</Text>
        </View>

        <Text style={styles.sectionTitle}>Local Support</Text>
        <View style={styles.supportCard}>
          <View style={styles.supportIcon}>
            <Feather name="map-pin" size={18} color="#5DC1B9" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.supportName}>
              {mergedProfile.supportName || "Not connected"}
            </Text>
            <Text style={styles.supportRole}>
              {mergedProfile.supportRole || "Connect to ASHA worker"}
            </Text>
          </View>
          <View style={styles.supportCall}>
            <Feather name="phone" size={18} color="#22C55E" />
          </View>
        </View>

        <Text style={styles.sectionTitle}>Address Details</Text>
        <View style={styles.addressCard}>
          <Feather name="map-pin" size={18} color="#94A3B8" />
          <Text style={styles.addressText}>{mergedProfile.address}</Text>
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
    backgroundColor: "#F3FBFB",
  },
  container: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#E8F6F4",
    alignItems: "center",
    justifyContent: "center",
  },
  headerMenuWrap: {
    alignItems: "flex-end",
  },
  headerMenu: {
    position: "absolute",
    top: 44,
    right: 0,
    width: 140,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E6F2F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    zIndex: 10,
  },
  menuItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  menuTextDanger: {
    fontSize: 14,
    fontWeight: "600",
    color: "#DC2626",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  heroCard: {
    backgroundColor: "#F0FBFA",
    borderRadius: 26,
    paddingVertical: 22,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  avatarWrap: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  avatar: {
    width: 72,
    height: 72,
  },
  name: {
    marginTop: 14,
    fontSize: 22,
    fontWeight: "700",
    color: "#0F172A",
  },
  abhaId: {
    marginTop: 6,
    fontSize: 13,
    color: "#5DC1B9",
    fontWeight: "700",
  },
  email: {
    marginTop: 4,
    fontSize: 13,
    color: "#6B7280",
  },
  metricsRow: {
    marginTop: 16,
    flexDirection: "row",
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E6EEF0",
  },
  metricLabel: {
    fontSize: 12,
    color: "#94A3B8",
    textTransform: "uppercase",
    fontWeight: "600",
  },
  metricValue: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  alertCard: {
    marginTop: 14,
    backgroundColor: "#FEF2F2",
    borderRadius: 18,
    padding: 16,
  },
  alertLabel: {
    fontSize: 12,
    color: "#F87171",
    textTransform: "uppercase",
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  alertValue: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: "700",
    color: "#DC2626",
  },
  sectionTitle: {
    marginTop: 20,
    fontSize: 16,
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  conditionCard: {
    marginTop: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#EEF1F4",
  },
  conditionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
  },
  conditionLabel: {
    fontSize: 12,
    color: "#94A3B8",
  },
  conditionValue: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  consultCard: {
    marginTop: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EEF1F4",
  },
  consultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  consultDoctor: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  consultSpecialty: {
    marginTop: 4,
    fontSize: 13,
    color: "#5DC1B9",
  },
  consultBadge: {
    backgroundColor: "#E8F6F4",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  consultBadgeText: {
    fontSize: 11,
    color: "#5DC1B9",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  consultDivider: {
    marginVertical: 12,
    height: 1,
    backgroundColor: "#EEF2F6",
  },
  consultLabel: {
    fontSize: 11,
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  consultValue: {
    marginTop: 6,
    fontSize: 15,
    color: "#0F172A",
    fontWeight: "600",
  },
  consultFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  consultLink: {
    fontSize: 13,
    color: "#5DC1B9",
    fontWeight: "600",
  },
  policyCard: {
    marginTop: 18,
    borderRadius: 20,
    padding: 16,
    backgroundColor: "#5DC1B9",
  },
  policyLabel: {
    marginTop: 8,
    fontSize: 12,
    color: "#D1FAE5",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  policyValue: {
    marginTop: 6,
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  supportCard: {
    marginTop: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#EEF1F4",
  },
  supportIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#E8F6F4",
    alignItems: "center",
    justifyContent: "center",
  },
  supportName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  supportRole: {
    marginTop: 4,
    fontSize: 13,
    color: "#64748B",
  },
  supportCall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E8F6F4",
    alignItems: "center",
    justifyContent: "center",
  },
  addressCard: {
    marginTop: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#EEF1F4",
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    color: "#0F172A",
    lineHeight: 20,
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
