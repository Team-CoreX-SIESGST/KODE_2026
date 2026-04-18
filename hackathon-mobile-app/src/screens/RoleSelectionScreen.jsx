import React, { useMemo, useRef, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  StyleSheet,
  Text,
  View,
  Image,
  Pressable,
  ScrollView,
  Animated,
  Easing,
} from "react-native";
import { useTranslation } from "react-i18next";

const roles = [
  {
    key: "patient",
    descriptionKey: "role_selection.patient_desc",
    icon: require("../../assets/female-icon.png"),
    background: "#F3FBFA",
  },
  {
    key: "doctor",
    descriptionKey: "role_selection.doctor_desc",
    icon: require("../../assets/male-doctor-icon.png"),
    background: "#F5FBFF",
  },
  {
    key: "asha",
    descriptionKey: "role_selection.asha_desc",
    icon: require("../../assets/male-icon.png"),
    background: "#FFF8EC",
  },
];

export default function RoleSelectionScreen({ navigation }) {
  const { t, i18n } = useTranslation();
  const [selectedRole, setSelectedRole] = useState("patient");
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const languageAnim = useRef(new Animated.Value(0)).current;
  const currentSelection = useMemo(
    () => roles.find((role) => role.key === selectedRole),
    [selectedRole],
  );

  const languageOptions = ["en", "hi", "pa", "mr", "ur", "ta"];
  const currentLanguageLabel = t(`common.lang_${i18n.language}`, i18n.language);

  const openLanguageMenu = () => {
    setLanguageMenuOpen(true);
    languageAnim.setValue(0);
    Animated.timing(languageAnim, {
      toValue: 1,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const closeLanguageMenu = () => {
    if (!languageMenuOpen) return;
    Animated.timing(languageAnim, {
      toValue: 0,
      duration: 140,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => setLanguageMenuOpen(false));
  };

  const toggleLanguageMenu = () => {
    if (languageMenuOpen) {
      closeLanguageMenu();
      return;
    }
    openLanguageMenu();
  };

  const setLanguage = (lang) => {
    if (i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }
    closeLanguageMenu();
  };

  const renderLanguagePicker = () => (
    <View style={styles.languageFloating}>
      <View style={styles.languageRow}>
        <Text style={styles.languageLabel}>{t("common.language")}</Text>
        <View style={styles.languageDropdownWrap}>
          <Pressable
            style={styles.languageDropdownTrigger}
            onPress={toggleLanguageMenu}
          >
            <Text style={styles.languageDropdownText}>
              {currentLanguageLabel}
            </Text>
            <Text style={styles.languageChevron}>
              {languageMenuOpen ? "▴" : "▾"}
            </Text>
          </Pressable>
          {languageMenuOpen && (
            <Animated.View
              style={[
                styles.languageDropdownMenu,
                {
                  opacity: languageAnim,
                  transform: [
                    {
                      translateY: languageAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-6, 0],
                      }),
                    },
                    {
                      scale: languageAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.98, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              {languageOptions.map((lang) => (
                <Pressable
                  key={lang}
                  style={styles.languageMenuItem}
                  onPress={() => setLanguage(lang)}
                >
                  <Text
                    style={[
                      styles.languageMenuText,
                      i18n.language === lang && styles.languageMenuTextActive,
                    ]}
                  >
                    {t(`common.lang_${lang}`)}
                  </Text>
                </Pressable>
              ))}
            </Animated.View>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        {renderLanguagePicker()}
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.appName}>ArogyaGram</Text>
          <Text style={styles.heading}>{t("role_selection.heading")}</Text>

          <View style={styles.cardsBlock}>
            {roles.map((role) => {
              const isActive = role.key === selectedRole;
              return (
                <Pressable
                  key={role.key}
                  onPress={() => setSelectedRole(role.key)}
                  style={[
                    styles.card,
                    isActive && styles.cardActive,
                    { backgroundColor: role.background },
                  ]}
                >
                  <View style={styles.avatarWrap}>
                    <Image
                      source={role.icon}
                      style={styles.avatar}
                      resizeMode="contain"
                    />
                  </View>
                  <Text style={styles.cardTitle}>
                    {t(`roles.${role.key}`)}
                  </Text>
                  <Text style={styles.cardDescription}>
                    {t(role.descriptionKey)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={styles.primaryButton}
            onPress={() =>
              navigation.navigate("AuthChoice", { role: currentSelection?.key })
            }
          >
            <Text style={styles.primaryButtonText}>
              {t("role_selection.continue")}
            </Text>
          </Pressable>
        </View>
        {languageMenuOpen && (
          <Pressable style={styles.languageBackdrop} onPress={closeLanguageMenu} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  screen: {
    flex: 1,
    position: "relative",
  },
  container: {
    paddingHorizontal: 24,
    paddingTop: 72,
    paddingBottom: 140,
  },
  appName: {
    fontSize: 26,
    fontWeight: "700",
    color: "#1F2937",
    textAlign: "center",
  },
  heading: {
    marginTop: 6,
    fontSize: 16,
    color: "#6B7280",
    textAlign: "center",
  },
  cardsBlock: {
    marginTop: 22,
    gap: 18,
  },
  card: {
    borderRadius: 24,
    paddingVertical: 22,
    paddingHorizontal: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEF1F4",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 3,
  },
  cardActive: {
    borderColor: "#5DC1B9",
    shadowColor: "#5DC1B9",
    shadowOpacity: 0.18,
  },
  avatarWrap: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  avatar: {
    width: 84,
    height: 84,
  },
  cardTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    textAlign: "center",
  },
  cardDescription: {
    marginTop: 6,
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 20,
  },
  footer: {
    position: "absolute",
    left: 24,
    right: 24,
    bottom: 24,
  },
  languageFloating: {
    position: "absolute",
    top: 12,
    right: 16,
    zIndex: 10,
  },
  languageRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 12,
  },
  languageLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  languageDropdownWrap: {
    alignItems: "flex-end",
    position: "relative",
  },
  languageDropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DDE7E5",
    backgroundColor: "#FFFFFF",
  },
  languageDropdownText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#1F2937",
  },
  languageChevron: {
    fontSize: 12,
    color: "#64748B",
  },
  languageDropdownMenu: {
    position: "absolute",
    top: 40,
    right: 0,
    width: 150,
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
  languageBackdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },
  languageMenuItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  languageMenuText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
  },
  languageMenuTextActive: {
    color: "#0F766E",
  },
  primaryButton: {
    backgroundColor: "#5DC1B9",
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
    shadowColor: "#5DC1B9",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 4,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
});
