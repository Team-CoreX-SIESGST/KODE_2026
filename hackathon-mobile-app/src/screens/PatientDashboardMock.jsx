import React, { useContext, useEffect, useRef, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { AuthContext } from "../context/AuthContext";
import {
  doctorNearby,
  patientMe,
  patientAshaList,
  patientAssignAshaWorker,
} from "../services/api";
import {
  StyleSheet,
  Text,
  View,
  Image,
  ScrollView,
  Pressable,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
  Animated,
  Easing,
} from "react-native";
import { Feather } from "@expo/vector-icons";

const quickActions = [
  { title: "Talk to Doctor", icon: "TD" },
  { title: "Health Records", icon: "HR" },
  { title: "Find Medicine", icon: "FM" },
  { title: "Call with Ai", icon: "AI" },
];

const bottomNavItems = [
  { label: "Home", icon: "home" },
  { label: "Consult", icon: "message-circle", route: "PatientConsult" },
  { label: "Records", icon: "file-text", route: "HealthRecords" },
  { label: "Profile", icon: "user", route: "PatientProfile" },
];

export default function PatientDashboardMock() {
  const navigation = useNavigation();
  const { user, token, signOut } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [ashaModalOpen, setAshaModalOpen] = useState(false);
  const [doctorModalOpen, setDoctorModalOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [ashaWorkers, setAshaWorkers] = useState([]);
  const [ashaLoading, setAshaLoading] = useState(false);
  const [ashaError, setAshaError] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [searching, setSearching] = useState(false);
  const [selectedAsha, setSelectedAsha] = useState(null);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loadProfile = async () => {
      if (!token) return;
      try {
        const data = await patientMe(token);
        setProfile(data || null);
      } catch (error) {
        setProfile(null);
      }
    };
    loadProfile();
  }, [token]);

  const activeUser = profile || user;

  useEffect(() => {
    const loadDoctors = async () => {
      if (!activeUser?.locationCoordinates) return;
      try {
        const data = await doctorNearby(
          activeUser.locationCoordinates.latitude,
          activeUser.locationCoordinates.longitude,
          10
        );
        setDoctors(data.results || []);
      } catch (error) {
        setDoctors([]);
      }
    };
    loadDoctors();
  }, [activeUser]);

  useEffect(() => {
    let animation;
    if (searching) {
      pulse.setValue(0);
      animation = Animated.loop(
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        })
      );
      animation.start();
    }
    return () => {
      if (animation) {
        animation.stop();
      }
    };
  }, [searching, pulse]);

  const firstName =
    activeUser?.abha_profile?.firstName ||
    activeUser?.name ||
    activeUser?.fullName ||
    "Friend";

  const gender = activeUser?.abha_profile?.gender || activeUser?.gender || "M";
  const avatarSource =
    gender === "F"
      ? require("../../assets/female-icon.png")
      : require("../../assets/male-icon.png");

  const handleVapiCall = () => {
    navigation.navigate("VapiCall");
  };

  const handleLogout = () => {
    setMenuOpen(false);
    signOut();
    navigation.reset({ index: 0, routes: [{ name: "RoleSelection" }] });
  };

  const handleOpenProfile = () => {
    setMenuOpen(false);
    navigation.navigate("PatientProfile");
  };

  const loadAshaWorkers = async () => {
    if (!token) return;
    setAshaLoading(true);
    setAshaError("");
    try {
      const data = await patientAshaList(token);
      setAshaWorkers(data?.results || []);
    } catch (error) {
      setAshaError(error.message || "Unable to load ASHA workers");
    } finally {
      setAshaLoading(false);
    }
  };

  const openAshaModal = async () => {
    setAshaModalOpen(true);
    await loadAshaWorkers();
  };

  const calcDistanceKm = (origin, target) => {
    if (!origin || !target) return null;
    const toRad = (value) => (value * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(target.latitude - origin.latitude);
    const dLon = toRad(target.longitude - origin.longitude);
    const lat1 = toRad(origin.latitude);
    const lat2 = toRad(target.latitude);
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };

  const handleConnectAsha = async (worker) => {
    if (!token || !worker?._id) return;
    setSelectedAsha(worker);
    setSearching(true);
    setAssigning(true);
    setAshaError("");
    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      const assigned = await patientAssignAshaWorker(token, worker._id);
      setProfile((prev) => ({
        ...(prev || {}),
        supportName: assigned?.ashaWorker?.name || prev?.supportName,
        supportRole: "ASHA Worker",
        ashaWorker: assigned?.ashaWorker || prev?.ashaWorker,
        ashaWorkerAssignedAt: new Date().toISOString(),
      }));
      setAshaModalOpen(false);
    } catch (error) {
      setAshaError(error.message || "Unable to connect ASHA worker");
    } finally {
      setAssigning(false);
      setSearching(false);
    }
  };

  const openDoctorModal = (doctor) => {
    setSelectedDoctor(doctor);
    setDoctorModalOpen(true);
  };

  const closeDoctorModal = () => {
    setDoctorModalOpen(false);
    setSelectedDoctor(null);
  };

  const supportName =
    activeUser?.supportName || activeUser?.ashaWorker?.name || null;
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greetingSmall}>Good Morning,</Text>
            <Text style={styles.greeting}>{`Hello, ${firstName}`}</Text>
          </View>
          <View style={styles.avatarMenuWrap}>
            <TouchableOpacity
              style={styles.avatarRing}
              activeOpacity={0.7}
              onPress={() => setMenuOpen((prev) => !prev)}
            >
              <Image
                source={avatarSource}
                style={styles.headerAvatar}
                resizeMode="contain"
              />
            </TouchableOpacity>
            {menuOpen && (
              <View style={styles.avatarMenu}>
                <TouchableOpacity
                  style={styles.menuItem}
                  activeOpacity={0.7}
                  onPress={handleOpenProfile}
                >
                  <Text style={styles.menuText}>View Profile</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.menuItem, styles.menuItemDanger]}
                  activeOpacity={0.7}
                  onPress={handleLogout}
                >
                  <Text style={[styles.menuText, styles.menuTextDanger]}>
                    Logout
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickGrid}>
          {quickActions.map((item) => (
            <TouchableOpacity
              key={item.title}
              style={styles.quickCard}
              activeOpacity={0.8}
              onPress={() => {
                if (item.title === "Talk to Doctor") {
                  navigation.navigate("Chat");
                  return;
                }
                if (item.title === "Health Records") {
                  navigation.navigate("HealthRecords");
                  return;
                }
                if (item.title === "Call with Ai") {
                  handleVapiCall();
                  return;
                }
                if (item.title === "Find Medicine") {
                  navigation.navigate("MedicineRecords");
                  return;
                }
                Alert.alert("Quick Action", `${item.title} tapped`);
              }}
            >
              <View style={styles.quickIconCircle}>
                <Text style={styles.quickIconText}>{item.icon}</Text>
              </View>
              <Text style={styles.quickTitle}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Popular Doctors</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => Alert.alert("Doctors", "See all doctors tapped")}
          >
            <Text style={styles.sectionLink}>See All</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.doctorRow}>
          {doctors.map((doctor) => (
            <TouchableOpacity
              key={doctor._id}
              style={styles.doctorCard}
              activeOpacity={0.8}
              onPress={() => openDoctorModal(doctor)}
            >
              <View style={styles.doctorAvatarWrap}>
                <Image
                  source={require("../../assets/male-doctor-icon.png")}
                  style={styles.doctorAvatar}
                />
              </View>
              <Text style={styles.doctorName}>{doctor.name}</Text>
              <Text style={styles.doctorMeta}>
                {doctor.hospitalName || "Nearby Doctor"}
              </Text>
              <Text style={styles.doctorRating}>
                {doctor.distanceKm} km away
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Local Support</Text>
        <View style={styles.supportCard}>
          <View style={styles.supportIcon}>
            <Feather name="map-pin" size={18} color="#5DC1B9" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.supportName}>
              {supportName || "Not connected"}
            </Text>
            <Text style={styles.supportRole}>
              {supportName ? "ASHA Worker" : "Connect to an ASHA worker"}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.supportAction}
            activeOpacity={0.7}
            onPress={openAshaModal}
          >
            <Feather name="user-plus" size={18} color="#0F172A" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.connectButton}
          activeOpacity={0.8}
          onPress={openAshaModal}
        >
          <Text style={styles.connectButtonText}>
            {supportName ? "Change ASHA Worker" : "Connect to ASHA Worker"}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.bottomNav}>
        {bottomNavItems.map((item, index) => {
          const isActive = item.label === "Home";
          return (
            <TouchableOpacity
              key={item.label}
              style={styles.navItem}
              onPress={() => {
                if (item.route) {
                  navigation.navigate(item.route);
                }
              }}
            >
              <Feather
                name={item.icon}
                size={22}
                color={isActive ? "#0F172A" : "#94A3B8"}
              />
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Modal
        visible={ashaModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setAshaModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>ASHA Workers Nearby</Text>
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setAshaModalOpen(false)}
              >
                <Feather name="x" size={18} color="#0F172A" />
              </TouchableOpacity>
            </View>
            {ashaLoading ? (
              <View style={styles.modalLoading}>
                <ActivityIndicator size="small" color="#5DC1B9" />
                <Text style={styles.modalHint}>Fetching ASHA workers...</Text>
              </View>
            ) : ashaError ? (
              <Text style={styles.modalError}>{ashaError}</Text>
            ) : ashaWorkers.length === 0 ? (
              <Text style={styles.modalHint}>No ASHA workers found.</Text>
            ) : (
              <ScrollView style={styles.modalList}>
                {ashaWorkers.map((worker) => {
                  const distance = calcDistanceKm(
                    activeUser?.locationCoordinates,
                    worker.locationCoordinates
                  );
                  return (
                    <View key={worker._id} style={styles.workerCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.workerName}>{worker.name}</Text>
                        <Text style={styles.workerMeta}>
                          @{worker.username}
                        </Text>
                        <Text style={styles.workerMeta}>
                          {distance ? `${distance.toFixed(1)} km away` : "Nearby"}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.workerButton}
                        disabled={assigning}
                        onPress={() => handleConnectAsha(worker)}
                      >
                        <Text style={styles.workerButtonText}>
                          {assigning &&
                          selectedAsha?._id === worker._id
                            ? "Connecting..."
                            : "Connect"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={doctorModalOpen}
        transparent
        animationType="slide"
        onRequestClose={closeDoctorModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeDoctorModal}>
          <Pressable
            style={styles.doctorSheet}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Doctor Snapshot</Text>
              <TouchableOpacity style={styles.modalClose} onPress={closeDoctorModal}>
                <Feather name="x" size={18} color="#0F172A" />
              </TouchableOpacity>
            </View>
            {selectedDoctor ? (
              <>
                <View style={styles.sheetHeader}>
                  <View style={styles.sheetAvatarWrap}>
                    <Image
                      source={require("../../assets/male-doctor-icon.png")}
                      style={styles.sheetAvatar}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sheetName}>
                      {selectedDoctor.name || "Doctor"}
                    </Text>
                    <Text style={styles.sheetMeta}>
                      {selectedDoctor.specialization || "General Practice"}
                    </Text>
                    <Text style={styles.sheetMeta}>
                      {selectedDoctor.hospitalName || "Nearby Hospital"}
                    </Text>
                  </View>
                </View>

                <View style={styles.sheetStatsRow}>
                  <View style={styles.sheetStatCard}>
                    <Text style={styles.sheetStatLabel}>Distance</Text>
                    <Text style={styles.sheetStatValue}>
                      {selectedDoctor.distanceKm
                        ? `${selectedDoctor.distanceKm} km`
                        : "Nearby"}
                    </Text>
                  </View>
                  <View style={styles.sheetStatCard}>
                    <Text style={styles.sheetStatLabel}>Experience</Text>
                    <Text style={styles.sheetStatValue}>
                      {selectedDoctor.experienceYears
                        ? `${selectedDoctor.experienceYears}+ yrs`
                        : "—"}
                    </Text>
                  </View>
                </View>

                <View style={styles.sheetRow}>
                  <Text style={styles.sheetRowLabel}>Availability</Text>
                  <Text style={styles.sheetRowValue}>
                    {selectedDoctor.availability || "Check schedule"}
                  </Text>
                </View>
                {selectedDoctor.phoneNumber ? (
                  <View style={styles.sheetRow}>
                    <Text style={styles.sheetRowLabel}>Phone</Text>
                    <Text style={styles.sheetRowValue}>
                      {selectedDoctor.phoneNumber}
                    </Text>
                  </View>
                ) : null}

                {Array.isArray(selectedDoctor.languages) &&
                selectedDoctor.languages.length ? (
                  <>
                    <Text style={styles.sheetSectionTitle}>Languages</Text>
                    <View style={styles.sheetPillRow}>
                      {selectedDoctor.languages.map((lang) => (
                        <View key={lang} style={styles.sheetPill}>
                          <Text style={styles.sheetPillText}>{lang}</Text>
                        </View>
                      ))}
                    </View>
                  </>
                ) : null}

                <View style={styles.sheetActions}>
                  <TouchableOpacity
                    style={styles.sheetPrimaryButton}
                    onPress={() => {
                      closeDoctorModal();
                      navigation.navigate("PatientConsult");
                    }}
                  >
                    <Text style={styles.sheetPrimaryText}>Book Appointment</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>


      <Modal visible={searching} transparent animationType="fade">
        <View style={styles.searchOverlay}>
          <View style={styles.searchCard}>
            <Text style={styles.searchTitle}>Locating ASHA Worker</Text>
            <Text style={styles.searchSubtitle}>
              {selectedAsha?.name
                ? `Connecting to ${selectedAsha.name}`
                : "Searching nearby on the map"}
            </Text>
            <View style={styles.searchMap}>
              <View style={styles.mapGridLine} />
              <View style={[styles.mapGridLine, styles.mapGridLineAlt]} />
              <View style={styles.mapGridLineVertical} />
              <View
                style={[styles.mapGridLineVertical, styles.mapGridLineAlt]}
              />
              <Animated.View
                style={[
                  styles.mapPulse,
                  {
                    opacity: pulse.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.6, 0],
                    }),
                    transform: [
                      {
                        scale: pulse.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.6, 2.4],
                        }),
                      },
                    ],
                  },
                ]}
              />
              <View style={styles.mapDot} />
            </View>
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
  avatarMenuWrap: {
    alignItems: "flex-end",
  },
  avatarMenu: {
    position: "absolute",
    top: 60,
    right: 0,
    width: 150,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
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
  menuItemDanger: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  menuText: {
    fontSize: 14,
    color: "#1F2937",
    fontWeight: "600",
  },
  menuTextDanger: {
    color: "#DC2626",
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
    fontSize: 16,
    fontWeight: "700",
    color: "#5DC1B9",
  },
  quickTitle: {
    marginTop: 12,
    fontSize: 15,
    color: "#1F2937",
    fontWeight: "600",
    textAlign: "center",
  },
  doctorRow: {
    flexDirection: "row",
    gap: 14,
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
  supportAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E8F6F4",
    alignItems: "center",
    justifyContent: "center",
  },
  connectButton: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "#0F172A",
    alignItems: "center",
  },
  connectButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  doctorCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  doctorAvatarWrap: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: "#F3F5F7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  doctorAvatar: {
    width: 56,
    height: 56,
  },
  doctorName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F2937",
    textAlign: "center",
  },
  doctorMeta: {
    marginTop: 4,
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
  },
  doctorRating: {
    marginTop: 6,
    fontSize: 13,
    color: "#6B7280",
  },
  pharmacyList: {
    gap: 14,
  },
  pharmacyCard: {
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
  pharmacyBadge: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  pharmacyBadgeText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4B5563",
  },
  pharmacyInfo: {
    flex: 1,
  },
  pharmacyName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  pharmacyMeta: {
    marginTop: 4,
    fontSize: 13,
    color: "#6B7280",
  },
  pharmacyArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E8F6F4",
    alignItems: "center",
    justifyContent: "center",
  },
  pharmacyArrowText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#5DC1B9",
  },
  bottomNav: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    height: 80,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 6,
  },
  navItem: {
    alignItems: "center",
    gap: 4,
  },
  navIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  navIconCircleActive: {
    backgroundColor: "#E8F6F4",
  },
  navIconText: {
    fontSize: 18,
    color: "#6B7280",
  },
  navIconTextActive: {
    color: "#10B981",
  },
  navLabel: {
    fontSize: 12,
    color: "#9AA3AF",
  },
  navLabelActive: {
    color: "#5DC1B9",
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end",
  },
  modalCard: {
    maxHeight: "75%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E8F6F4",
    alignItems: "center",
    justifyContent: "center",
  },
  modalLoading: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 10,
  },
  modalHint: {
    color: "#64748B",
  },
  modalError: {
    color: "#DC2626",
    marginTop: 8,
  },
  modalList: {
    maxHeight: 340,
  },
  doctorSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
    minHeight: "45%",
    maxHeight: "60%",
  },
  sheetHeader: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
    marginTop: 4,
  },
  sheetAvatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E8F6F4",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetAvatar: {
    width: 42,
    height: 42,
  },
  sheetName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  sheetMeta: {
    marginTop: 2,
    fontSize: 13,
    color: "#64748B",
  },
  sheetStatsRow: {
    marginTop: 16,
    flexDirection: "row",
    gap: 12,
  },
  sheetStatCard: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  sheetStatLabel: {
    fontSize: 11,
    color: "#94A3B8",
    textTransform: "uppercase",
    fontWeight: "600",
  },
  sheetStatValue: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  sheetRow: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sheetRowLabel: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
  },
  sheetRowValue: {
    fontSize: 13,
    color: "#0F172A",
    fontWeight: "600",
  },
  sheetSectionTitle: {
    marginTop: 16,
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  sheetPillRow: {
    marginTop: 10,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  sheetPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "#EEF7F6",
  },
  sheetPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0F766E",
  },
  sheetActions: {
    marginTop: 20,
  },
  sheetPrimaryButton: {
    backgroundColor: "#5DC1B9",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
  },
  sheetPrimaryText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  workerCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF1F4",
    gap: 12,
  },
  workerName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  workerMeta: {
    marginTop: 4,
    fontSize: 12,
    color: "#64748B",
  },
  workerButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#5DC1B9",
  },
  workerButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  searchOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  searchCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
  },
  searchTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  searchSubtitle: {
    marginTop: 6,
    color: "#64748B",
    textAlign: "center",
  },
  searchMap: {
    marginTop: 16,
    width: "100%",
    height: 180,
    borderRadius: 16,
    backgroundColor: "#E8F6F4",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  mapGridLine: {
    position: "absolute",
    width: "100%",
    height: 1,
    backgroundColor: "rgba(15, 23, 42, 0.08)",
    top: "35%",
  },
  mapGridLineAlt: {
    top: "65%",
  },
  mapGridLineVertical: {
    position: "absolute",
    height: "100%",
    width: 1,
    backgroundColor: "rgba(15, 23, 42, 0.08)",
    left: "35%",
  },
  mapDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#0F172A",
  },
  mapPulse: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(15, 23, 42, 0.25)",
  },
});
