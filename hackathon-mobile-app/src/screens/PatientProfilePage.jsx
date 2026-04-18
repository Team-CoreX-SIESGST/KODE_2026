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
  name: "Meena Deshpande",
  abhaId: "91-7834-2201-0071",
  abhaIdCard: "91-7834-2201-0071",
  email: "meena.deshpande@abdm",
  gender: "F",
  bloodGroup: "B+",
  bmi: "23.4",
  allergies: "Penicillin",
  condition: "Gestational Diabetes, Anaemia",
  pregnancyDetails: {
    currentlyPregnant: true,
    gestationalAgeWeeks: 30,
    expectedDeliveryDate: "2026-06-15",
    gravida: 3,
    parity: 1,
  },
  cdssSummary: {
    latestRiskLevel: "HIGH",
    latestAlerts: ["BP is increasing over time - risk may increase."]
  },
  address: "Flat 102, Shanti Kunj, Kothrud, Pune, Maharashtra",
  supportName: "Aruna Patil",
  supportRole: "ANM Worker",
  supportPhone: "9472811020"
};

export default function PatientProfilePage() {
  const navigation = useNavigation();
  const { token, user, signOut } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const activeUser = profile || user;

  const mergedProfile = useMemo(() => {
    const abhaProfile = activeUser?.abha_profile || {};
    const healthRecords = activeUser?.health_records || {};
    const cdssSummary = activeUser?.cdssSummary || {};
    const pregnancy = activeUser?.pregnancyDetails || {};
    const address = activeUser?.address || {};
    const anmWorker = activeUser?.anmWorker || {};

    return {
      name:
        abhaProfile.name ||
        activeUser?.name ||
        fallbackProfile.name,
      abhaId:
        abhaProfile.healthIdNumber ||
        abhaProfile.abha_id ||
        activeUser?.abhaId ||
        fallbackProfile.abhaId,
      abhaIdCard:
        abhaProfile.abha_id_card ||
        activeUser?.abhaIdCard ||
        fallbackProfile.abhaIdCard,
      email:
        abhaProfile.healthId ||
        abhaProfile.email ||
        activeUser?.email ||
        fallbackProfile.email,
      gender: abhaProfile.gender || activeUser?.gender || "F",
      bloodGroup:
        healthRecords.bloodGroup ||
        activeUser?.bloodGroup ||
        fallbackProfile.bloodGroup,
      bmi: healthRecords.bmi || activeUser?.bmi || fallbackProfile.bmi,
      allergies:
        (healthRecords.allergies && healthRecords.allergies.join(", ")) ||
        activeUser?.allergies ||
        fallbackProfile.allergies,
      chronicConditions:
        (healthRecords.chronicConditions && healthRecords.chronicConditions.join(", ")) ||
        activeUser?.condition ||
        fallbackProfile.condition,
      pregnancy: pregnancy,
      cdss: cdssSummary,
      addressStr: address.addressLine
        ? `${address.addressLine}, ${address.village}, ${address.district}, ${address.state}`
        : activeUser?.address || fallbackProfile.address,
      supportName: ashaName(activeUser),
      supportRole: "ANM Worker",
      supportPhone: anmWorker.contact || activeUser?.supportPhone,
    };
  }, [activeUser]);

  function ashaName(u) {
    if (u?.anmWorker?.name) return u.anmWorker.name;
    if (u?.ashaWorker?.name) return u.ashaWorker.name;
    if (u?.supportName) return u.supportName;
    return "Not assigned";
  }

  useEffect(() => {
    let isMounted = true;
    const loadProfile = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const data = await patientMe(token);
        if (!isMounted || !data) return;
        setProfile(data);
      } catch (err) {
        // keep auth user data
      } finally {
        if (isMounted) setLoading(false);
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
    if (!mergedProfile.abhaIdCard || mergedProfile.abhaIdCard.startsWith("http") === false) return;
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

  const isHighRisk = mergedProfile.cdss?.latestRiskLevel === "HIGH";

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <Pressable style={styles.headerIcon} onPress={() => navigation.goBack()}>
            <Feather name="chevron-left" size={20} color="#4B5563" />
          </Pressable>
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

        <View style={[styles.heroCard, isHighRisk && styles.heroCardHighRisk]}>
          <View style={styles.avatarWrap}>
            <Image source={avatarSource} style={styles.avatar} />
          </View>
          <Text style={styles.name}>{mergedProfile.name}</Text>
          <Pressable onPress={handleOpenAbha}>
            <Text style={styles.abhaId}>ABHA ID: {mergedProfile.abhaId}</Text>
          </Pressable>
          <Text style={styles.email}>{mergedProfile.email}</Text>
          
          {mergedProfile.cdss?.latestRiskLevel && (
            <View style={[styles.riskBadge, isHighRisk ? styles.riskBadgeHigh : styles.riskBadgeLow]}>
              <Text style={styles.riskBadgeText}>
                {mergedProfile.cdss.latestRiskLevel} RISK
              </Text>
            </View>
          )}
        </View>

        {mergedProfile.pregnancy?.currentlyPregnant && (
          <>
            <Text style={styles.sectionTitle}>Pregnancy Tracking</Text>
            <View style={styles.pregnancyCard}>
              <View style={styles.pregRow}>
                <View style={styles.pregItem}>
                  <Text style={styles.pregLabel}>Weeks</Text>
                  <Text style={styles.pregValue}>{mergedProfile.pregnancy.gestationalAgeWeeks}</Text>
                </View>
                <View style={styles.pregDivider} />
                <View style={styles.pregItem}>
                  <Text style={styles.pregLabel}>EDD</Text>
                  <Text style={styles.pregValue}>
                    {mergedProfile.pregnancy.expectedDeliveryDate ? new Date(mergedProfile.pregnancy.expectedDeliveryDate).toLocaleDateString() : "TBD"}
                  </Text>
                </View>
                <View style={styles.pregDivider} />
                <View style={styles.pregItem}>
                  <Text style={styles.pregLabel}>Gravida</Text>
                  <Text style={styles.pregValue}>G{mergedProfile.pregnancy.gravida} P{mergedProfile.pregnancy.parity}</Text>
                </View>
              </View>
              
              {mergedProfile.cdss?.latestAlerts?.length > 0 && (
                <View style={styles.alertMiniBox}>
                  <Feather name="alert-circle" size={14} color="#DC2626" />
                  <Text style={styles.alertMiniText}>{mergedProfile.cdss.latestAlerts[0]}</Text>
                </View>
              )}
            </View>
          </>
        )}

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
          <Text style={styles.alertValue}>{mergedProfile.allergies || "None reported"}</Text>
        </View>

        <Text style={styles.sectionTitle}>Medical Conditions</Text>
        <View style={styles.conditionCard}>
          <View style={styles.conditionIcon}>
            <Feather name="plus-square" size={18} color="#F97316" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.conditionLabel}>Chronic Conditions</Text>
            <Text style={styles.conditionValue}>{mergedProfile.chronicConditions || "No chronic conditions"}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Local Support</Text>
        <View style={styles.supportCard}>
          <View style={styles.supportIcon}>
            <Feather name="user" size={18} color="#5DC1B9" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.supportName}>
              {mergedProfile.supportName}
            </Text>
            <Text style={styles.supportRole}>
              {mergedProfile.supportRole}
            </Text>
          </View>
          {mergedProfile.supportPhone && (
            <Pressable style={styles.supportCall} onPress={() => Linking.openURL(`tel:${mergedProfile.supportPhone}`)}>
              <Feather name="phone" size={18} color="#22C55E" />
            </Pressable>
          )}
        </View>

        <Text style={styles.sectionTitle}>Address Details</Text>
        <View style={styles.addressCard}>
          <Feather name="map-pin" size={18} color="#94A3B8" />
          <Text style={styles.addressText}>{mergedProfile.addressStr}</Text>
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
    borderWidth: 1,
    borderColor: "#E6F2F0",
  },
  heroCardHighRisk: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FEE2E2",
  },
  avatarWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
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
    width: 64,
    height: 64,
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
  riskBadge: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  riskBadgeHigh: {
    backgroundColor: "#DC2626",
  },
  riskBadgeLow: {
    backgroundColor: "#22C55E",
  },
  riskBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  pregnancyCard: {
    marginTop: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EEF1F4",
  },
  pregRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pregItem: {
    flex: 1,
    alignItems: "center",
  },
  pregLabel: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  pregValue: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  pregDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#EEF2F6",
  },
  alertMiniBox: {
    marginTop: 14,
    backgroundColor: "#FEF2F2",
    padding: 10,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  alertMiniText: {
    flex: 1,
    fontSize: 12,
    color: "#DC2626",
    fontWeight: "600",
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
    fontSize: 11,
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
    borderWidth: 1,
    borderColor: "#FEE2E2",
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
    fontSize: 14,
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
    fontSize: 11,
    color: "#94A3B8",
  },
  conditionValue: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
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
    color: "#1F2937",
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
