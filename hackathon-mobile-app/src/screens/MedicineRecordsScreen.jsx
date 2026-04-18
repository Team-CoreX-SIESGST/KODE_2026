import React, { useEffect, useState, useMemo, useContext, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  Modal,
  ScrollView,
  Image,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { AuthContext } from "../context/AuthContext";

const API_BASE = (
  process.env.EXPO_PUBLIC_LOCAL_SERVER_URL || "http://10.0.16.63:5002"
).replace(/\/+$/, "");

// ─────────────────────────────────────────────
// Ask AI Modal
// ─────────────────────────────────────────────
function AskAIModal({ medicine, onClose, onSearchGeneric }) {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [translatedInfo, setTranslatedInfo] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [translating, setTranslating] = useState(false);

  const languages = [
    { code: "en", name: "English" },
    { code: "hi", name: "हिन्दी (Hindi)" },
    { code: "bn", name: "বাংলা (Bengali)" },
    { code: "te", name: "తెలుగు (Telugu)" },
    { code: "mr", name: "मराठी (Marathi)" },
    { code: "ta", name: "தமிழ் (Tamil)" },
    { code: "gu", name: "ગુજરાતી (Gujarati)" },
    { code: "kn", name: "ಕನ್ನಡ (Kannada)" },
    { code: "ml", name: "മലയാളം (Malayalam)" },
    { code: "pa", name: "ਪੰਜਾਬੀ (Punjabi)" },
    { code: "or", name: "ଓଡ଼ିଆ (Odia)" },
    { code: "as", name: "অসমীয়া (Assamese)" },
    { code: "ur", name: "اردو (Urdu)" },
    { code: "es", name: "Español (Spanish)" },
    { code: "fr", name: "Français (French)" },
    { code: "de", name: "Deutsch (German)" },
    { code: "zh", name: "中文 (Chinese)" },
    { code: "ar", name: "العربية (Arabic)" },
    { code: "pt", name: "Português (Portuguese)" },
    { code: "ru", name: "Русский (Russian)" },
    { code: "ja", name: "日本語 (Japanese)" }
  ];r

  useEffect(() => {
    if (!medicine) return;
    setLoading(true);
    setError("");
    setInfo(null);
    setTranslatedInfo(null);
    setSelectedLanguage("en");

    const name = encodeURIComponent(medicine["medicine name"] || "");
    const generic = encodeURIComponent(medicine["generic name"] || "");
    fetch(`${API_BASE}/api/sheets/medicine/info?name=${name}&generic=${generic}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setInfo(json);
        else throw new Error(json.message);
      })
      .catch((e) => setError(e.message || "Failed to load info"))
      .finally(() => setLoading(false));
  }, [medicine]);

  const handleTranslate = async (languageCode) => {
    if (!info || languageCode === "en") {
      setTranslatedInfo(null);
      setSelectedLanguage(languageCode);
      return;
    }

    setTranslating(true);
    try {
      const response = await fetch(`${API_BASE}/api/sheets/medicine/translate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          medicineInfo: info,
          targetLanguage: languageCode
        })
      });

      const data = await response.json();
      if (data.success) {
        setTranslatedInfo(data.translatedInfo);
        setSelectedLanguage(languageCode);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      console.error('Translation error:', error);
      // Fallback: keep original info
      setTranslatedInfo(null);
      setSelectedLanguage("en");
    } finally {
      setTranslating(false);
    }
  };

  const handleGenericTap = (name) => {
    onClose();
    setTimeout(() => onSearchGeneric(name), 300);
  };

  return (
    <Modal visible={!!medicine} animationType="slide" transparent onRequestClose={onClose}>
      <View style={ms.overlay}>
        <View style={ms.sheet}>
          {/* Handle */}
          <View style={ms.handle} />

          {/* Close */}
          <Pressable style={ms.closeBtn} onPress={onClose}>
            <Feather name="x" size={20} color="#64748B" />
          </Pressable>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
            {/* Medicine header */}
            <View style={ms.medicineTitleRow}>
              <View style={ms.pillIcon}>
                <Feather name="activity" size={22} color="#0d9488" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={ms.medicineTitle}>
                  {medicine?.["medicine name"] || ""}
                </Text>
                <Text style={ms.medicineGenericLabel}>
                  {medicine?.["generic name"] || ""}
                </Text>
              </View>
            </View>

            {/* Translate Section */}
            {info && (
              <View style={ms.translateSection}>
                <Text style={ms.translateLabel}>Translate to:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={ms.languageScroll}>
                  {languages.map((lang) => (
                    <TouchableOpacity
                      key={lang.code}
                      style={[
                        ms.languageButton,
                        selectedLanguage === lang.code && ms.languageButtonActive
                      ]}
                      onPress={() => handleTranslate(lang.code)}
                      disabled={translating}
                    >
                      <Text style={[
                        ms.languageButtonText,
                        selectedLanguage === lang.code && ms.languageButtonTextActive
                      ]}>
                        {lang.name.split(' ')[0]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                {translating && (
                  <View style={ms.translatingRow}>
                    <ActivityIndicator size="small" color="#0d9488" />
                    <Text style={ms.translatingText}>Translating...</Text>
                  </View>
                )}
              </View>
            )}

            {loading ? (
              <View style={ms.center}>
                <ActivityIndicator color="#0d9488" size="large" />
                <Text style={ms.loadingText}>Asking AI...</Text>
              </View>
            ) : error ? (
              <View style={ms.center}>
                <Feather name="alert-circle" size={40} color="#EF4444" />
                <Text style={ms.errorText}>{error}</Text>
              </View>
            ) : info ? (
              <>
                {/* Description */}
                <View style={ms.section}>
                  <Text style={ms.sectionTitle}>What is it?</Text>
                  <Text style={ms.descText}>
                    {translatedInfo?.description || info.description}
                  </Text>
                </View>

                {/* OTC badge */}
                <View style={ms.otcRow}>
                  <View style={[ms.otcBadge, info.otcAvailable ? ms.otcYes : ms.otcNo]}>
                    <Feather
                      name={info.otcAvailable ? "check-circle" : "alert-triangle"}
                      size={13}
                      color={info.otcAvailable ? "#059669" : "#DC2626"}
                    />
                    <Text style={[ms.otcText, { color: info.otcAvailable ? "#059669" : "#DC2626" }]}>
                      {translatedInfo?.otcStatus || (info.otcAvailable ? "Available Over-the-Counter" : "Prescription Required")}
                    </Text>
                  </View>
                </View>

                {/* Primary uses */}
                {(translatedInfo?.primaryUses || info.primaryUses)?.length > 0 && (
                  <View style={ms.section}>
                    <Text style={ms.sectionTitle}>Primary Uses</Text>
                    {(translatedInfo?.primaryUses || info.primaryUses).map((u, i) => (
                      <View key={i} style={ms.bulletRow}>
                        <View style={ms.bullet} />
                        <Text style={ms.bulletText}>{u}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Side effects */}
                {(translatedInfo?.commonSideEffects || info.commonSideEffects)?.length > 0 && (
                  <View style={ms.section}>
                    <Text style={ms.sectionTitle}>Common Side Effects</Text>
                    <View style={ms.chipRow}>
                      {(translatedInfo?.commonSideEffects || info.commonSideEffects).map((s, i) => (
                        <View key={i} style={ms.sideChip}>
                          <Text style={ms.sideChipText}>{s}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Warning */}
                {(translatedInfo?.warningNote || info.warningNote) && (
                  <View style={ms.warningBox}>
                    <Feather name="alert-triangle" size={14} color="#d97706" />
                    <Text style={ms.warningText}>
                      {translatedInfo?.warningNote || info.warningNote}
                    </Text>
                  </View>
                )}

                {/* Generic alternatives — tappable */}
                {(translatedInfo?.genericAlternatives || info.genericAlternatives)?.length > 0 && (
                  <View style={ms.section}>
                    <Text style={ms.sectionTitle}>Generic Alternatives</Text>
                    <Text style={ms.sectionHint}>Tap any to search the list ↓</Text>
                    {(translatedInfo?.genericAlternatives || info.genericAlternatives).map((g, i) => (
                      <TouchableOpacity
                        key={i}
                        style={ms.genericCard}
                        activeOpacity={0.7}
                        onPress={() => handleGenericTap(g.name)}
                      >
                        <View style={ms.genericLeft}>
                          <Feather name="search" size={14} color="#0d9488" />
                          <Text style={ms.genericName}>{g.name}</Text>
                        </View>
                        <Text style={ms.genericNote}>{g.note}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────
export default function MedicineRecordsScreen({ navigation }) {
  const { user } = useContext(AuthContext);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [hasDistance, setHasDistance] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState(null);

  const userCoords = user?.locationCoordinates
    ? { lat: user.locationCoordinates.latitude, lng: user.locationCoordinates.longitude }
    : null;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      let url = `${API_BASE}/api/sheets/medicine`;
      if (userCoords) url += `?lat=${userCoords.lat}&lng=${userCoords.lng}`;
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || "Failed to load");
      setData(json.records || []);
      setHasDistance(!!userCoords && json.records?.some((r) => r._distance));
    } catch (err) {
      setError(err.message || "Failed to load medicine records.");
    } finally {
      setLoading(false);
    }
  }, [userCoords?.lat, userCoords?.lng]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const query = searchQuery.toLowerCase();
    return data.filter((item) =>
      Object.values(item).some(
        (val) => typeof val === "string" && val.toLowerCase().includes(query)
      )
    );
  }, [data, searchQuery]);

  const renderItem = ({ item }) => {
    const name = item["medicine name"] || item["name"] || "Unknown";
    const genericName = item["generic name"] || "—";
    const stock = item["current stock"] || "0";
    const price = item["sell price (₹)"] || item["sell price"] || "N/A";
    const category = item["category"] || "General";
    const rackLocation = item["location / rack"] || item["rack location"] || "";
    const locationName = (item["location"] || "").trim();
    const rawStatus = item["stock status"] || "";
    const isOutOfStock = rawStatus.toLowerCase().includes("out") || parseInt(stock) <= 0;
    const distance = item._distance || null;
    const duration = item._duration || null;

    return (
      <View style={[styles.card, isOutOfStock && styles.cardDimmed]}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.nameContainer}>
            <Text style={styles.medicineName}>{name}</Text>
            <Text style={styles.genericName}>{genericName}</Text>
          </View>
          <View style={styles.badgesColumn}>
            <View style={[styles.statusBadge, isOutOfStock && styles.statusBadgeOut]}>
              <Text style={[styles.statusText, isOutOfStock && styles.statusTextOut]}>
                {isOutOfStock ? "Out of Stock" : "In Stock"}
              </Text>
            </View>
            {distance ? (
              <View style={styles.distanceBadge}>
                <Feather name="navigation" size={10} color="#0d9488" />
                <Text style={styles.distanceText}> {distance}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Stats */}
        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Stock</Text>
            <Text style={[styles.detailValue, isOutOfStock && { color: "#DC2626" }]}>{stock}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Price</Text>
            <Text style={styles.detailValue}>₹{price}</Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Category</Text>
            <Text style={styles.detailValue} numberOfLines={1}>{category}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.cardFooter}>
          <View style={styles.locationFooter}>
            {rackLocation ? (
              <View style={styles.locationChip}>
                <Feather name="box" size={11} color="#475569" />
                <Text style={styles.locationChipText}>{rackLocation}</Text>
              </View>
            ) : null}
            {locationName ? (
              <View style={[styles.locationChip, styles.locationChipPlace]}>
                <Feather name="map-pin" size={11} color="#0d9488" />
                <Text style={[styles.locationChipText, { color: "#0d9488" }]} numberOfLines={1}>
                  {locationName}
                </Text>
              </View>
            ) : null}
            {duration ? (
              <View style={styles.locationChip}>
                <Feather name="clock" size={11} color="#475569" />
                <Text style={styles.locationChipText}>{duration} away</Text>
              </View>
            ) : null}
          </View>

          {/* Ask AI button */}
          <TouchableOpacity
            style={styles.askAiBtn}
            activeOpacity={0.7}
            onPress={() => setSelectedMedicine(item)}
          >
            <Feather name="zap" size={13} color="#7c3aed" />
            <Text style={styles.askAiText}>Ask AI</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#0F172A" />
        </Pressable>
        <View>
          <Text style={styles.headerTitle}>Medicine Records</Text>
          {hasDistance ? (
            <Text style={styles.headerSub}>Sorted by distance from you</Text>
          ) : null}
        </View>
        <View style={{ width: 44 }} />
      </View>

      {/* Banners */}
      {hasDistance ? (
        <View style={styles.distanceBanner}>
          <Feather name="navigation" size={14} color="#0d9488" />
          <Text style={styles.distanceBannerText}>Showing nearest locations first • Live ETAs</Text>
        </View>
      ) : null}
      {!userCoords ? (
        <View style={styles.noLocationBanner}>
          <Feather name="alert-circle" size={13} color="#d97706" />
          <Text style={styles.noLocationText}>Register with location to see nearest pharmacies</Text>
        </View>
      ) : null}

      {/* Search */}
      <View style={styles.searchContainer}>
        <Feather name="search" size={20} color="#94A3B8" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, category, rack..."
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 ? (
          <Pressable onPress={() => setSearchQuery("")} style={styles.clearButton}>
            <Feather name="x" size={18} color="#94A3B8" />
          </Pressable>
        ) : null}
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#5DC1B9" />
          <Text style={styles.loadingText}>Loading medicine records...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Feather name="alert-circle" size={48} color="#EF4444" style={{ marginBottom: 16 }} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={fetchData}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filteredData}
          keyExtractor={(item, index) => `${item["medicine id"] || item["medicine name"]}-${index}`}
          contentContainerStyle={styles.listContent}
          renderItem={renderItem}
          ListHeaderComponent={
            <Text style={styles.countLabel}>
              {filteredData.length} record{filteredData.length !== 1 ? "s" : ""}
            </Text>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="inbox" size={48} color="#CBD5E1" />
              <Text style={styles.emptyText}>No medicines match your search.</Text>
            </View>
          }
        />
      )}

      {/* Ask AI Modal */}
      <AskAIModal
        medicine={selectedMedicine}
        onClose={() => setSelectedMedicine(null)}
        onSearchGeneric={(name) => setSearchQuery(name)}
      />
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 8, paddingVertical: 10,
    backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#E2E8F0",
  },
  backButton: { padding: 10 },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#0F172A", textAlign: "center" },
  headerSub: { fontSize: 11, color: "#0d9488", textAlign: "center", marginTop: 1 },
  distanceBanner: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#f0fdfa", paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: "#ccfbf1",
  },
  distanceBannerText: { fontSize: 12, color: "#0d9488", fontWeight: "600" },
  noLocationBanner: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#fffbeb", paddingHorizontal: 16, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: "#fde68a",
  },
  noLocationText: { fontSize: 12, color: "#92400e", flex: 1 },
  searchContainer: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF",
    marginHorizontal: 16, marginTop: 14, marginBottom: 8,
    borderRadius: 12, borderWidth: 1, borderColor: "#E2E8F0", paddingHorizontal: 12,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 15, color: "#0F172A" },
  clearButton: { padding: 4 },
  countLabel: { fontSize: 13, color: "#94A3B8", marginBottom: 12, fontWeight: "500" },
  listContent: { padding: 16, paddingBottom: 60 },
  card: {
    backgroundColor: "#FFFFFF", borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: "#E2E8F0",
    shadowColor: "#0F172A", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2, marginBottom: 12,
  },
  cardDimmed: { opacity: 0.75 },
  cardHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "flex-start", marginBottom: 14,
  },
  nameContainer: { flex: 1, paddingRight: 12 },
  medicineName: { fontSize: 16, fontWeight: "700", color: "#0F172A", marginBottom: 3 },
  genericName: { fontSize: 13, color: "#64748B" },
  badgesColumn: { alignItems: "flex-end", gap: 6 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: "#D1FAE5" },
  statusBadgeOut: { backgroundColor: "#FEE2E2" },
  statusText: { fontSize: 11, fontWeight: "700", color: "#059669" },
  statusTextOut: { color: "#DC2626" },
  distanceBadge: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#f0fdfa", borderWidth: 1, borderColor: "#99f6e4",
    borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3,
  },
  distanceText: { fontSize: 11, fontWeight: "700", color: "#0d9488" },
  detailsRow: {
    flexDirection: "row", justifyContent: "space-between",
    backgroundColor: "#F8FAFC", padding: 12, borderRadius: 10, marginBottom: 12,
  },
  detailItem: { flex: 1 },
  detailLabel: { fontSize: 11, color: "#94A3B8", marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.3 },
  detailValue: { fontSize: 14, fontWeight: "600", color: "#334155" },
  cardFooter: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  locationFooter: { flexDirection: "row", flexWrap: "wrap", gap: 8, flex: 1 },
  locationChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#F1F5F9", paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 8, maxWidth: "65%",
  },
  locationChipPlace: { backgroundColor: "#f0fdfa" },
  locationChipText: { fontSize: 12, color: "#475569", fontWeight: "500" },
  askAiBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "#faf5ff", borderWidth: 1, borderColor: "#e9d5ff",
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7, marginLeft: 8,
  },
  askAiText: { fontSize: 13, fontWeight: "700", color: "#7c3aed" },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 32 },
  loadingText: { marginTop: 16, fontSize: 15, color: "#64748B" },
  errorText: { fontSize: 15, color: "#334155", textAlign: "center", lineHeight: 22, marginBottom: 24 },
  retryButton: { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: "#5DC1B9", borderRadius: 12 },
  retryText: { color: "#FFFFFF", fontWeight: "700", fontSize: 15 },
  emptyContainer: { padding: 48, alignItems: "center" },
  emptyText: { marginTop: 16, fontSize: 15, color: "#94A3B8", textAlign: "center" },
});

// Modal styles
const ms = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#FFFFFF", borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: "90%", paddingHorizontal: 20, paddingTop: 12,
  },
  handle: {
    width: 40, height: 4, backgroundColor: "#E2E8F0",
    borderRadius: 2, alignSelf: "center", marginBottom: 16,
  },
  closeBtn: {
    position: "absolute", top: 16, right: 20,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center", zIndex: 10,
  },
  medicineTitleRow: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 20, marginTop: 8 },
  pillIcon: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: "#f0fdfa", alignItems: "center", justifyContent: "center",
  },
  medicineTitle: { fontSize: 20, fontWeight: "800", color: "#0F172A", marginBottom: 2 },
  medicineGenericLabel: { fontSize: 13, color: "#64748B" },
  center: { alignItems: "center", paddingVertical: 40 },
  loadingText: { marginTop: 12, fontSize: 14, color: "#64748B" },
  errorText: { marginTop: 12, fontSize: 14, color: "#EF4444", textAlign: "center" },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#0F172A", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  sectionHint: { fontSize: 12, color: "#94A3B8", marginBottom: 10 },
  descText: { fontSize: 15, color: "#334155", lineHeight: 23 },
  otcRow: { marginBottom: 20 },
  otcBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, alignSelf: "flex-start",
  },
  otcYes: { backgroundColor: "#D1FAE5" },
  otcNo: { backgroundColor: "#FEE2E2" },
  otcText: { fontSize: 13, fontWeight: "700" },
  bulletRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 6 },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#0d9488", marginTop: 7 },
  bulletText: { flex: 1, fontSize: 14, color: "#334155", lineHeight: 21 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sideChip: {
    backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FED7AA",
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5,
  },
  sideChipText: { fontSize: 12, color: "#C2410C", fontWeight: "600" },
  warningBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FDE68A",
    borderRadius: 12, padding: 12, marginBottom: 20,
  },
  warningText: { flex: 1, fontSize: 13, color: "#92400E", lineHeight: 20 },
  genericCard: {
    backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0",
    borderRadius: 12, padding: 14, marginBottom: 10,
  },
  genericLeft: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  genericName: { fontSize: 15, fontWeight: "700", color: "#0d9488" },
  genericNote: { fontSize: 13, color: "#64748B", lineHeight: 18 },
  
  // Translate styles
  translateSection: { marginBottom: 20, backgroundColor: "#F8FAFC", borderRadius: 12, padding: 16 },
  translateLabel: { fontSize: 14, fontWeight: "600", color: "#334155", marginBottom: 12 },
  languageScroll: { flexDirection: "row" },
  languageButton: {
    backgroundColor: "#E2E8F0", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8,
    marginRight: 8, borderWidth: 1, borderColor: "transparent"
  },
  languageButtonActive: {
    backgroundColor: "#0d9488", borderColor: "#0d9488"
  },
  languageButtonText: {
    fontSize: 12, fontWeight: "600", color: "#64748B"
  },
  languageButtonTextActive: {
    color: "#FFFFFF"
  },
  translatingRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginTop: 12, justifyContent: "center"
  },
  translatingText: {
    fontSize: 13, color: "#0d9488", fontWeight: "600"
  },
});
