import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Pressable,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { AuthContext } from "../context/AuthContext";
import { ashaMe, ashaPatients } from "../services/api";

const fallbackProfile = {
  name: "ASHA Worker",
  username: "asha.worker",
  locationCoordinates: { latitude: 30.3719, longitude: 76.1528 },
};

export default function AbhaSevakProfile({ navigation }) {
  const { token, user, signOut } = useContext(AuthContext);
  const [profile, setProfile] = useState(fallbackProfile);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [patientLoading, setPatientLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const mergedProfile = useMemo(() => {
    return {
      ...fallbackProfile,
      ...profile,
      name: user?.name || profile.name,
      username: user?.username || profile.username,
      locationCoordinates:
        user?.locationCoordinates || profile.locationCoordinates,
    };
  }, [profile, user]);

  useEffect(() => {
    let isMounted = true;
    const loadProfile = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const data = await ashaMe(token);
        if (!isMounted || !data) return;
        setProfile((prev) => ({
          ...prev,
          name: data.name || prev.name,
          username: data.username || prev.username,
          locationCoordinates: data.locationCoordinates || prev.locationCoordinates,
        }));
      } catch (err) {
        // keep fallback
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, [token]);

  useEffect(() => {
    let isMounted = true;
    const loadPatients = async () => {
      if (!token) return;
      setPatientLoading(true);
      try {
        const data = await ashaPatients(token);
        if (!isMounted) return;
        setPatients(data?.results || []);
      } catch (err) {
        if (isMounted) setPatients([]);
      } finally {
        if (isMounted) setPatientLoading(false);
      }
    };

    loadPatients();
    return () => {
      isMounted = false;
    };
  }, [token]);


  const formatAssigned = (value) => {
    if (!value) return "Not assigned";
    try {
      return new Date(value).toLocaleDateString();
    } catch {
      return String(value);
    }
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    await signOut();
    navigation.reset({ index: 0, routes: [{ name: "RoleSelection" }] });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>ASHA Home</Text>
            <Text style={styles.subtitle}>Assigned patients overview</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{patients.length} Assigned</Text>
            </View>
            <View style={styles.avatarMenuWrap}>
              <TouchableOpacity
                style={styles.avatarRing}
                activeOpacity={0.7}
                onPress={() => setMenuOpen((prev) => !prev)}
              >
                <Image
                  source={require("../../assets/male-icon.png")}
                  style={styles.avatarImage}
                />
              </TouchableOpacity>
              {menuOpen && (
                <View style={styles.avatarMenu}>
                  <Pressable style={styles.menuItem} onPress={handleLogout}>
                    <Text style={styles.menuTextDanger}>Logout</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Feather name="heart" size={22} color="#5DC1B9" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{mergedProfile.name}</Text>
            <Text style={styles.username}>@{mergedProfile.username}</Text>
          </View>
          {loading ? (
            <ActivityIndicator size="small" color="#5DC1B9" />
          ) : null}
        </View>

        <Text style={styles.sectionTitle}>Assigned Patients</Text>
        {patientLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color="#5DC1B9" />
            <Text style={styles.loadingText}>Loading assigned patients...</Text>
          </View>
        ) : patients.length === 0 ? (
          <Text style={styles.emptyText}>No patients assigned yet.</Text>
        ) : (
          patients.map((patient) => (
            <View key={patient._id} style={styles.patientCard}>
              <View style={styles.patientIcon}>
                <Feather name="user" size={16} color="#0F172A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.patientName}>{patient.name}</Text>
                <Text style={styles.patientMeta}>
                  {patient.healthIdNumber || "ABHA ID not available"}
                </Text>
              </View>
              <View style={styles.assignedBadge}>
                <Text style={styles.assignedText}>
                  {formatAssigned(patient.assignedAt)}
                </Text>
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
    marginBottom: 16,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0F172A",
  },
  subtitle: {
    marginTop: 4,
    color: "#64748B",
  },
  countBadge: {
    backgroundColor: "#E8F6F4",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  countText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  avatarMenuWrap: {
    alignItems: "flex-end",
  },
  avatarRing: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: 22,
    height: 22,
  },
  avatarMenu: {
    position: "absolute",
    top: 44,
    right: 0,
    width: 140,
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
  menuTextDanger: {
    color: "#DC2626",
    fontWeight: "700",
  },
  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#E6EEF0",
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#E8F6F4",
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  username: {
    marginTop: 4,
    color: "#64748B",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  patientCard: {
    marginTop: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#E6EEF0",
  },
  patientIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  patientName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  patientMeta: {
    marginTop: 4,
    fontSize: 12,
    color: "#64748B",
  },
  assignedBadge: {
    backgroundColor: "#E8F6F4",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  assignedText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0F172A",
  },
  loadingRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    color: "#64748B",
  },
  emptyText: {
    marginTop: 12,
    color: "#64748B",
  },
});
