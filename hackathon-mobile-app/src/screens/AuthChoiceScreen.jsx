import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  TextInput,
  Image,
  ScrollView,
  Animated,
  Easing,
  LayoutAnimation,
  Platform,
  UIManager,
  StatusBar,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import {
  uploadAbhaCard,
  patientLogin,
  sendPatientOtp,
  verifyPatientOtp,
  doctorLogin,
  sendDoctorOtp,
  verifyDoctorOtp,
} from "../services/api";
import { AuthContext } from "../context/AuthContext";
import MotionReveal from "../components/MotionReveal";
import AccordionBody from "../components/AccordionBody";
import { fontStyles } from "../theme/typography";

const ROLE_LABELS = {
  patient: "Patient",
  doctor: "Doctor",
  asha: "ASHA Worker",
};

const PATIENT_EXPERIENCE_COPY = {
  en: {
    heroEyebrow: "Maternal & Neonatal Safety Net",
    heroTitle: "Secure access for every mother, newborn, and frontline follow-up.",
    heroSubtitle:
      "Built for rural PHCs and sub-centres with offline-ready records, ABDM-compatible identity, and explainable referral support.",
    signals: ["Offline-ready", "ABDM aligned", "Explainable referrals"],
    accessLabel: "Field-ready secure entry",
    accessSubtitle:
      "Choose the quickest safe path to continue care, whether the ANM has an ABHA ID, an ABHA card photo, or only a phone number.",
    methodAbha: "Best for linked records and referral continuity across PHCs.",
    methodMobile: "Fast fallback for field use when identity details are not immediately available.",
    proofLabel: "Why this feels trustworthy",
    proofPoints: [
      "Supports low-connectivity workflows for village-level care",
      "Keeps human agency visible with clear rationale and referral context",
      "Works in English and Indian regional languages for frontline teams",
    ],
    abhaHint: "Use ABHA when you want longitudinal records to stay connected.",
    mobileHint: "Use OTP when the mother needs faster access in the field.",
    uploadSelected: "ABHA card selected",
  },
  hi: {
    heroEyebrow: "मातृ एवं नवजात सुरक्षा सहायता",
    heroTitle: "हर मां, नवजात और फॉलो-अप देखभाल के लिए सुरक्षित प्रवेश.",
    heroSubtitle:
      "ग्रामीण PHC और सब-सेंटर के लिए तैयार, जिसमें offline-ready records, ABDM-compatible identity और explainable referral support शामिल है.",
    signals: ["ऑफलाइन-तैयार", "ABDM अनुकूल", "समझाने योग्य रेफरल"],
    accessLabel: "फील्ड-रेडी सुरक्षित प्रवेश",
    accessSubtitle:
      "सबसे तेज और सुरक्षित तरीका चुनें, चाहे ANM के पास ABHA ID हो, ABHA कार्ड की फोटो हो, या केवल मोबाइल नंबर हो.",
    methodAbha: "लिंक्ड रिकॉर्ड्स और PHC रेफरल continuity के लिए बेहतर.",
    methodMobile: "जब तुरंत पहचान विवरण उपलब्ध न हो तब फील्ड उपयोग के लिए तेज विकल्प.",
    proofLabel: "यह भरोसेमंद क्यों लगता है",
    proofPoints: [
      "कम नेटवर्क वाले गांव-स्तर के care workflow को सपोर्ट करता है",
      "स्पष्ट rationale और referral context के साथ मानव निर्णय को केंद्र में रखता है",
      "फ्रंटलाइन टीम के लिए English और भारतीय भाषाओं में काम करता है",
    ],
    abhaHint: "ABHA चुनें जब आप रिकॉर्ड्स को लंबी अवधि तक जोड़े रखना चाहते हैं.",
    mobileHint: "OTP चुनें जब फील्ड में मां को जल्दी access देना हो.",
    uploadSelected: "ABHA कार्ड चुना गया",
  },
};

export default function AuthChoiceScreen({ navigation, route }) {
  const { t, i18n } = useTranslation();
  const role = route?.params?.role || "patient";
  const roleLabel = useMemo(
    () => t(`roles.${role}`, ROLE_LABELS[role] || "User"),
    [role, t]
  );
  const patientExperienceCopy = useMemo(
    () => PATIENT_EXPERIENCE_COPY[i18n.language] || PATIENT_EXPERIENCE_COPY.en,
    [i18n.language]
  );

  const [patientMethod, setPatientMethod] = useState("abha");
  const [abhaMode, setAbhaMode] = useState("id");
  const [abhaId, setAbhaId] = useState("");
  const [abhaImage, setAbhaImage] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [status, setStatus] = useState("");
  const [abhaLoading, setAbhaLoading] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [doctorMethod, setDoctorMethod] = useState("username");
  const [doctorUsername, setDoctorUsername] = useState("");
  const [doctorPassword, setDoctorPassword] = useState("");
  const [doctorPhoneNumber, setDoctorPhoneNumber] = useState("");
  const [doctorOtp, setDoctorOtp] = useState("");
  const [doctorOtpSent, setDoctorOtpSent] = useState(false);
  const [doctorLoginLoading, setDoctorLoginLoading] = useState(false);
  const [doctorOtpSending, setDoctorOtpSending] = useState(false);
  const [doctorOtpVerifying, setDoctorOtpVerifying] = useState(false);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [expandedInfoCard, setExpandedInfoCard] = useState("safety");
  const { signIn } = useContext(AuthContext);
  const languageAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (
      Platform.OS === "android" &&
      UIManager.setLayoutAnimationEnabledExperimental
    ) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  const animateLayout = () => {
    LayoutAnimation.configureNext({
      duration: 280,
      create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
      update: {
        type: LayoutAnimation.Types.easeInEaseOut,
      },
      delete: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
    });
  };

  const handleGalleryPick = async () => {
    setStatus("");
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setStatus("Gallery permission is required to upload an image.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const asset = result.assets?.[0];
      if (asset?.uri) {
        setAbhaImage({
          uri: asset.uri,
          name: asset.fileName,
          type: asset.mimeType,
        });
      }
    }
  };

  const handleCameraPick = async () => {
    setStatus("");
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setStatus("Camera permission is required to take a photo.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const asset = result.assets?.[0];
      if (asset?.uri) {
        setAbhaImage({
          uri: asset.uri,
          name: asset.fileName,
          type: asset.mimeType,
        });
      }
    }
  };

  const handleAbhaLogin = async () => {
    setStatus("");
    setAbhaLoading(true);
    try {
      let resolvedAbhaId = abhaId.trim();
      if (abhaMode === "upload") {
        if (!abhaImage?.uri) {
          setStatus("Upload your ABHA card to continue.");
          return;
        }
        const payload = await uploadAbhaCard({
          uri: abhaImage.uri,
          name: abhaImage.name,
          type: abhaImage.type,
        });
        resolvedAbhaId = payload?.abhaId || "";
        if (!resolvedAbhaId) {
          setStatus("Could not detect the ABHA ID. Try a clearer photo.");
          return;
        }
        setAbhaId(resolvedAbhaId);
      }

      if (!resolvedAbhaId) {
        setStatus("Enter your ABHA ID to continue.");
        return;
      }

      const response = await patientLogin({ abhaId: resolvedAbhaId });
      const { token, ...profile } = response || {};
      signIn({ user: profile, token, role: "patient" });
      navigation.reset({ index: 0, routes: [{ name: "PatientDashboardMock" }] });
    } catch (error) {
      setStatus(error.message || "Unable to login right now.");
    } finally {
      setAbhaLoading(false);
    }
  };

  const handleSendOtp = async () => {
    setStatus("");
    if (phoneNumber.trim().length < 10) {
      setStatus("Enter a valid 10-digit mobile number.");
      return;
    }
    setOtpSending(true);
    try {
      await sendPatientOtp({ phoneNumber });
      setOtpSent(true);
      setStatus("OTP sent to your mobile number.");
    } catch (error) {
      setStatus(error.message || "Unable to send OTP.");
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    setStatus("");
    if (otp.trim().length < 4) {
      setStatus("Enter the OTP to continue.");
      return;
    }
    setOtpVerifying(true);
    try {
      const response = await verifyPatientOtp({ phoneNumber, otp });
      const { token, ...profile } = response || {};
      signIn({ user: profile, token, role: "patient" });
      navigation.reset({ index: 0, routes: [{ name: "PatientDashboardMock" }] });
    } catch (error) {
      setStatus(error.message || "Unable to verify OTP.");
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleDoctorLogin = async () => {
    setStatus("");
    if (!doctorUsername.trim() || !doctorPassword) {
      setStatus("Enter username and password to continue.");
      return;
    }
    setDoctorLoginLoading(true);
    try {
      const response = await doctorLogin({
        username: doctorUsername.trim(),
        password: doctorPassword,
      });
      const { token, ...profile } = response || {};
      signIn({ user: profile, token, role: "doctor" });
      navigation.reset({ index: 0, routes: [{ name: "DoctorProfile" }] });
    } catch (error) {
      setStatus(error.message || "Unable to login.");
    } finally {
      setDoctorLoginLoading(false);
    }
  };

  const handleDoctorSendOtp = async () => {
    setStatus("");
    if (doctorPhoneNumber.trim().length < 10) {
      setStatus("Enter a valid 10-digit mobile number.");
      return;
    }
    setDoctorOtpSending(true);
    try {
      await sendDoctorOtp({ phoneNumber: doctorPhoneNumber });
      setDoctorOtpSent(true);
      setStatus("OTP sent to your mobile number.");
    } catch (error) {
      setStatus(error.message || "Unable to send OTP.");
    } finally {
      setDoctorOtpSending(false);
    }
  };

  const handleDoctorVerifyOtp = async () => {
    setStatus("");
    if (doctorOtp.trim().length < 4) {
      setStatus("Enter the OTP to continue.");
      return;
    }
    setDoctorOtpVerifying(true);
    try {
      const response = await verifyDoctorOtp({
        phoneNumber: doctorPhoneNumber,
        otp: doctorOtp,
      });
      const { token, ...profile } = response || {};
      signIn({ user: profile, token, role: "doctor" });
      navigation.reset({ index: 0, routes: [{ name: "DoctorProfile" }] });
    } catch (error) {
      setStatus(error.message || "Unable to verify OTP.");
    } finally {
      setDoctorOtpVerifying(false);
    }
  };

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

  const switchPatientMethod = (method) => {
    animateLayout();
    setPatientMethod(method);
    setStatus("");
  };

  const switchAbhaMode = (mode) => {
    animateLayout();
    setAbhaMode(mode);
    setStatus("");
  };

  const switchDoctorMethod = (method) => {
    animateLayout();
    setDoctorMethod(method);
    setStatus("");
  };

  const toggleInfoCard = (cardKey) => {
    animateLayout();
    setExpandedInfoCard((current) => (current === cardKey ? null : cardKey));
  };

  const languageOptions = ["en", "hi", "pa", "mr", "ur", "ta"];
  const currentLanguageLabel = t(`common.lang_${i18n.language}`, i18n.language);

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
              {languageMenuOpen ? "^" : "v"}
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

  if (role === "doctor") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.screen}>
          {renderLanguagePicker()}
          <ScrollView
            contentContainerStyle={styles.container}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.title}>{t("auth.doctor_login_title")}</Text>
            <Text style={styles.subtitle}>{t("auth.choose_signin")}</Text>

            <View style={styles.tabRow}>
              <Pressable
                style={[
                  styles.tabButton,
                  doctorMethod === "username" && styles.tabActive,
                ]}
                onPress={() => switchDoctorMethod("username")}
              >
                <Text
                  style={[
                    styles.tabText,
                    doctorMethod === "username" && styles.tabTextActive,
                  ]}
                >
                  {t("auth.username_login_title")}
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.tabButton,
                  doctorMethod === "mobile" && styles.tabActive,
                ]}
                onPress={() => switchDoctorMethod("mobile")}
              >
                <Text
                  style={[
                    styles.tabText,
                    doctorMethod === "mobile" && styles.tabTextActive,
                  ]}
                >
                  {t("auth.login_with_mobile")}
                </Text>
              </Pressable>
            </View>

            {doctorMethod === "username" ? (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>
                  {t("auth.username_login_title")}
                </Text>
                <Text style={styles.sectionSubtitle}>
                  {t("auth.username_login_subtitle")}
                </Text>

                <View style={styles.field}>
                  <Text style={styles.label}>{t("auth.username_label")}</Text>
                  <TextInput
                    style={styles.input}
                    onChangeText={setDoctorUsername}
                    placeholder={t("auth.username_placeholder")}
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="none"
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.label}>{t("auth.password_label")}</Text>
                  <TextInput
                    style={styles.input}
                    onChangeText={setDoctorPassword}
                    placeholder={t("auth.password_placeholder")}
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry
                  />
                </View>

                <Pressable
                  style={[
                    styles.primaryButton,
                    doctorLoginLoading && styles.buttonDisabled,
                  ]}
                  onPress={handleDoctorLogin}
                  disabled={doctorLoginLoading}
                >
                  <Text style={styles.primaryButtonText}>
                    {doctorLoginLoading
                      ? t("auth.signing_in")
                      : t("auth.login")}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>{t("auth.mobile_otp_title")}</Text>
                <Text style={styles.sectionSubtitle}>
                  {t("auth.mobile_otp_subtitle")}
                </Text>

                <View style={styles.field}>
                  <Text style={styles.label}>{t("auth.mobile_number_label")}</Text>
                  <TextInput
                    style={styles.input}
                    value={doctorPhoneNumber}
                    onChangeText={(value) => {
                      setDoctorPhoneNumber(value.replace(/[^0-9]/g, ""));
                      setDoctorOtpSent(false);
                      setDoctorOtp("");
                    }}
                    placeholder={t("auth.mobile_placeholder")}
                    placeholderTextColor="#9CA3AF"
                    keyboardType="number-pad"
                    maxLength={10}
                  />
                </View>

                {!doctorOtpSent ? (
                  <Pressable
                    style={[
                      styles.primaryButton,
                      doctorOtpSending && styles.buttonDisabled,
                    ]}
                    onPress={handleDoctorSendOtp}
                    disabled={doctorOtpSending}
                  >
                    <Text style={styles.primaryButtonText}>
                      {doctorOtpSending ? t("auth.sending") : t("auth.send_otp")}
                    </Text>
                  </Pressable>
                ) : (
                  <>
                    <View style={styles.field}>
                      <Text style={styles.label}>{t("auth.enter_otp_label")}</Text>
                      <TextInput
                        style={styles.input}
                        value={doctorOtp}
                        onChangeText={(value) =>
                          setDoctorOtp(value.replace(/[^0-9]/g, ""))
                        }
                        placeholder={t("auth.otp_placeholder")}
                        placeholderTextColor="#9CA3AF"
                        keyboardType="number-pad"
                        maxLength={6}
                      />
                    </View>
                    <Pressable
                      style={[
                        styles.primaryButton,
                        doctorOtpVerifying && styles.buttonDisabled,
                      ]}
                      onPress={handleDoctorVerifyOtp}
                      disabled={doctorOtpVerifying}
                    >
                      <Text style={styles.primaryButtonText}>
                        {doctorOtpVerifying
                          ? t("auth.verifying")
                          : t("auth.verify_otp")}
                      </Text>
                    </Pressable>
                  </>
                )}
              </View>
            )}

            {status ? <Text style={styles.statusText}>{status}</Text> : null}

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>{t("auth.new_doctor")}</Text>
              <Pressable
                onPress={() =>
                  navigation.navigate("AuthForm", { role, mode: "register" })
                }
              >
                <Text style={styles.footerLink}>{t("auth.register_here")}</Text>
              </Pressable>
            </View>
          </ScrollView>
          {languageMenuOpen && (
            <Pressable
              style={styles.languageBackdrop}
              onPress={closeLanguageMenu}
            />
          )}
        </View>
      </SafeAreaView>
    );
  }

  if (role !== "patient") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.screen}>
          {renderLanguagePicker()}
          <View style={styles.container}>
            <Text style={styles.title}>
              {t("auth.role_continue_title", { role: roleLabel })}
            </Text>
            <Text style={styles.subtitle}>
              {t("auth.role_continue_subtitle")}
            </Text>

            <View style={styles.cardStack}>
              <Pressable
                style={[styles.card, styles.cardPrimary]}
                onPress={() =>
                  navigation.navigate("AuthForm", { role, mode: "login" })
                }
              >
                <Text style={styles.cardTitle}>{roleLabel} Login</Text>
                <Text style={styles.cardText}>
                  {t("auth.role_login_subtitle")}
                </Text>
              </Pressable>

              <Pressable
                style={[styles.card, styles.cardSecondary]}
                onPress={() =>
                  navigation.navigate("AuthForm", { role, mode: "register" })
                }
              >
                <Text style={styles.cardTitle}>{roleLabel} Register</Text>
                <Text style={styles.cardText}>
                  {t("auth.role_register_subtitle")}
                </Text>
              </Pressable>
            </View>
          </View>
          {languageMenuOpen && (
            <Pressable
              style={styles.languageBackdrop}
              onPress={closeLanguageMenu}
            />
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.patientSafeArea}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />
      <View style={styles.patientScreen}>
        <LinearGradient
          colors={["#4DBDB5", "#2FA89F", "#1A8C84", "#0D6B64"]}
          locations={[0, 0.35, 0.72, 1]}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={styles.patientBackdrop}
        >
          <View style={styles.topAccentBar} />
          <View style={[styles.patientBlob, styles.patientBlobTL]} />
          <View style={[styles.patientBlob, styles.patientBlobBR]} />
          <View style={[styles.patientBlob, styles.patientBlobMid]} />
          <View style={[styles.patientArc, styles.patientArcOne]} />
          <View style={[styles.patientArc, styles.patientArcTwo]} />
          <View style={[styles.patientArc, styles.patientArcThree]} />
        </LinearGradient>

        {renderLanguagePicker()}

        <ScrollView
          contentContainerStyle={styles.patientContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <MotionReveal delay={40}>
            <LinearGradient
              colors={["rgba(255,255,255,0.22)", "rgba(255,255,255,0.1)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.patientHero}
            >
              <View style={styles.patientHeroHeader}>
                <View style={styles.patientHeroBadge}>
                  <View style={styles.patientHeroBadgeDot} />
                  <Text style={styles.patientHeroBadgeText}>
                    ABDM | PHC Verified Portal
                  </Text>
                </View>
                <View style={styles.patientHeroLogoWrap}>
                  <Image
                    source={require("../../assets/splash-icon.png")}
                    style={styles.patientHeroLogo}
                    resizeMode="contain"
                  />
                </View>
              </View>
              <Text style={styles.patientHeroEyebrow}>
                {patientExperienceCopy.heroEyebrow}
              </Text>
              <Text style={styles.patientHeroTitle}>
                {patientExperienceCopy.heroTitle}
              </Text>
              <Text style={styles.patientHeroSubtitle}>
                {patientExperienceCopy.heroSubtitle}
              </Text>
              <View style={styles.signalRow}>
                {patientExperienceCopy.signals.map((signal) => (
                  <View key={signal} style={styles.signalPill}>
                    <Text style={styles.signalPillText}>{signal}</Text>
                  </View>
                ))}
              </View>
            </LinearGradient>
          </MotionReveal>

          <MotionReveal delay={100} style={styles.patientInfoStack}>
            <View style={styles.infoAccordion}>
              <Pressable
                style={styles.infoAccordionHeader}
                onPress={() => toggleInfoCard("safety")}
              >
                <View style={styles.infoBadge}>
                  <Text style={styles.infoBadgeText}>PS</Text>
                </View>
                <Text style={styles.infoAccordionTitle}>
                  {patientExperienceCopy.heroEyebrow}
                </Text>
                <Text style={styles.infoAccordionIcon}>
                  {expandedInfoCard === "safety" ? "-" : "+"}
                </Text>
              </Pressable>
              <AccordionBody
                open={expandedInfoCard === "safety"}
                style={styles.infoAccordionBody}
              >
                <Text style={styles.infoBodyTitle}>
                  {patientExperienceCopy.heroTitle}
                </Text>
                <Text style={styles.infoBodyText}>
                  {patientExperienceCopy.heroSubtitle}
                </Text>
                <View style={styles.signalRow}>
                  {patientExperienceCopy.signals.map((signal) => (
                    <View key={signal} style={styles.infoSignalPill}>
                      <Text style={styles.infoSignalPillText}>{signal}</Text>
                    </View>
                  ))}
                </View>
              </AccordionBody>
            </View>

            <View style={styles.infoAccordion}>
              <Pressable
                style={styles.infoAccordionHeader}
                onPress={() => toggleInfoCard("trust")}
              >
                <View style={[styles.infoBadge, styles.infoBadgeSoft]}>
                  <Text style={[styles.infoBadgeText, styles.infoBadgeTextSoft]}>
                    AI
                  </Text>
                </View>
                <Text style={styles.infoAccordionTitle}>
                  {patientExperienceCopy.proofLabel}
                </Text>
                <Text style={styles.infoAccordionIcon}>
                  {expandedInfoCard === "trust" ? "-" : "+"}
                </Text>
              </Pressable>
              <AccordionBody
                open={expandedInfoCard === "trust"}
                style={styles.infoAccordionBody}
              >
                <View style={styles.infoProofList}>
                  {patientExperienceCopy.proofPoints.map((point, index) => (
                    <View key={point} style={styles.proofRow}>
                      <View style={styles.proofIndex}>
                        <Text style={styles.proofIndexText}>{index + 1}</Text>
                      </View>
                      <Text style={styles.proofText}>{point}</Text>
                    </View>
                  ))}
                </View>
              </AccordionBody>
            </View>
          </MotionReveal>

          <MotionReveal delay={160} style={styles.patientPanelMotion}>
            <View style={styles.patientPanel}>
              <View style={styles.patientPanelHeader}>
                <View>
                  <Text style={styles.patientPanelLabel}>
                    {patientExperienceCopy.accessLabel}
                  </Text>
                  <Text style={styles.patientPanelTitle}>
                    {t("auth.patient_login_title")}
                  </Text>
                </View>
                <View style={styles.patientPanelChip}>
                  <Text style={styles.patientPanelChipText}>
                    {currentLanguageLabel}
                  </Text>
                </View>
              </View>
              <Text style={styles.patientPanelSubtitle}>
                {patientExperienceCopy.accessSubtitle}
              </Text>

              <View style={styles.methodStack}>
                <Pressable
                  style={[
                    styles.methodCard,
                    patientMethod === "abha" && styles.methodCardActive,
                  ]}
                  onPress={() => switchPatientMethod("abha")}
                >
                  <View style={styles.methodHeaderRow}>
                    <Text
                      style={[
                        styles.methodTitle,
                        patientMethod === "abha" && styles.methodTitleActive,
                      ]}
                    >
                      {t("auth.login_with_abha")}
                    </Text>
                    <View
                      style={[
                        styles.methodStateDot,
                        patientMethod === "abha" && styles.methodStateDotActive,
                      ]}
                    />
                  </View>
                  <Text style={styles.methodDescription}>
                    {patientExperienceCopy.methodAbha}
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.methodCard,
                    patientMethod === "mobile" && styles.methodCardActive,
                  ]}
                  onPress={() => switchPatientMethod("mobile")}
                >
                  <View style={styles.methodHeaderRow}>
                    <Text
                      style={[
                        styles.methodTitle,
                        patientMethod === "mobile" && styles.methodTitleActive,
                      ]}
                    >
                      {t("auth.login_with_mobile")}
                    </Text>
                    <View
                      style={[
                        styles.methodStateDot,
                        patientMethod === "mobile" && styles.methodStateDotActive,
                      ]}
                    />
                  </View>
                  <Text style={styles.methodDescription}>
                    {patientExperienceCopy.methodMobile}
                  </Text>
                </Pressable>
              </View>

              <MotionReveal
                key={`${patientMethod}-${abhaMode}`}
                delay={60}
                style={styles.motionSection}
              >
                {patientMethod === "abha" ? (
                  <View style={styles.formPanel}>
                    <Text style={styles.formPanelTitle}>
                      {t("auth.abha_verification")}
                    </Text>
                    <Text style={styles.formPanelSubtitle}>
                      {patientExperienceCopy.abhaHint}
                    </Text>

                    <View style={styles.subTabRow}>
                      <Pressable
                        style={[
                          styles.subTabButton,
                          abhaMode === "id" && styles.subTabActive,
                        ]}
                        onPress={() => switchAbhaMode("id")}
                      >
                        <Text
                          style={[
                            styles.subTabText,
                            abhaMode === "id" && styles.subTabTextActive,
                          ]}
                        >
                          {t("auth.enter_abha_id")}
                        </Text>
                      </Pressable>
                      <Pressable
                        style={[
                          styles.subTabButton,
                          abhaMode === "upload" && styles.subTabActive,
                        ]}
                        onPress={() => switchAbhaMode("upload")}
                      >
                        <Text
                          style={[
                            styles.subTabText,
                            abhaMode === "upload" && styles.subTabTextActive,
                          ]}
                        >
                          {t("auth.upload_abha_card")}
                        </Text>
                      </Pressable>
                    </View>

                    {abhaMode === "id" ? (
                      <View style={styles.field}>
                        <Text style={styles.label}>{t("auth.abha_id_label")}</Text>
                        <TextInput
                          style={styles.patientInput}
                          value={abhaId}
                          onChangeText={setAbhaId}
                          placeholder={t("auth.abha_id_placeholder")}
                          placeholderTextColor="#8B97A3"
                          autoCapitalize="none"
                        />
                      </View>
                    ) : (
                      <View style={styles.uploadBlock}>
                        <View style={styles.uploadRow}>
                          <Pressable
                            style={styles.uploadButton}
                            onPress={handleGalleryPick}
                          >
                            <Text style={styles.uploadButtonText}>
                              {t("auth.upload_gallery")}
                            </Text>
                          </Pressable>
                          <Pressable
                            style={[
                              styles.uploadButton,
                              styles.uploadButtonSecondary,
                            ]}
                            onPress={handleCameraPick}
                          >
                            <Text style={styles.uploadButtonText}>
                              {t("auth.take_photo")}
                            </Text>
                          </Pressable>
                        </View>
                        {abhaImage?.uri ? (
                          <View style={styles.preview}>
                            <Image
                              source={{ uri: abhaImage.uri }}
                              style={styles.previewImage}
                            />
                            <Text style={styles.previewText}>
                              {patientExperienceCopy.uploadSelected}
                            </Text>
                          </View>
                        ) : (
                          <Text style={styles.helperText}>
                            {t("auth.upload_hint")}
                          </Text>
                        )}
                      </View>
                    )}

                    <Pressable
                      style={[
                        styles.patientPrimaryButton,
                        abhaLoading && styles.buttonDisabled,
                      ]}
                      onPress={handleAbhaLogin}
                      disabled={abhaLoading}
                    >
                      <Text style={styles.primaryButtonText}>
                        {abhaLoading ? t("auth.processing") : t("auth.continue")}
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.formPanel}>
                    <Text style={styles.formPanelTitle}>
                      {t("auth.mobile_otp_title")}
                    </Text>
                    <Text style={styles.formPanelSubtitle}>
                      {patientExperienceCopy.mobileHint}
                    </Text>

                    <View style={styles.field}>
                      <Text style={styles.label}>
                        {t("auth.mobile_number_label")}
                      </Text>
                      <TextInput
                        style={styles.patientInput}
                        value={phoneNumber}
                        onChangeText={(value) => {
                          setPhoneNumber(value.replace(/[^0-9]/g, ""));
                          setOtpSent(false);
                          setOtp("");
                        }}
                        placeholder={t("auth.mobile_placeholder")}
                        placeholderTextColor="#8B97A3"
                        keyboardType="number-pad"
                        maxLength={10}
                      />
                    </View>

                    {!otpSent ? (
                      <Pressable
                        style={[
                          styles.patientPrimaryButton,
                          otpSending && styles.buttonDisabled,
                        ]}
                        onPress={handleSendOtp}
                        disabled={otpSending}
                      >
                        <Text style={styles.primaryButtonText}>
                          {otpSending ? t("auth.sending") : t("auth.send_otp")}
                        </Text>
                      </Pressable>
                    ) : (
                      <>
                        <View style={styles.field}>
                          <Text style={styles.label}>
                            {t("auth.enter_otp_label")}
                          </Text>
                          <TextInput
                            style={styles.patientInput}
                            value={otp}
                            onChangeText={(value) =>
                              setOtp(value.replace(/[^0-9]/g, ""))
                            }
                            placeholder={t("auth.otp_placeholder")}
                            placeholderTextColor="#8B97A3"
                            keyboardType="number-pad"
                            maxLength={6}
                          />
                        </View>
                        <Pressable
                          style={[
                            styles.patientPrimaryButton,
                            otpVerifying && styles.buttonDisabled,
                          ]}
                          onPress={handleVerifyOtp}
                          disabled={otpVerifying}
                        >
                          <Text style={styles.primaryButtonText}>
                            {otpVerifying
                              ? t("auth.verifying")
                              : t("auth.verify_otp")}
                          </Text>
                        </Pressable>
                      </>
                    )}
                  </View>
                )}
              </MotionReveal>

              {status ? (
                <View style={styles.statusCard}>
                  <Text style={styles.patientStatusText}>{status}</Text>
                </View>
              ) : null}

              <View style={styles.patientFooterMeta}>
                <View style={styles.patientFooterLine} />
                <Text style={styles.patientFooterText}>
                  Powered by AI | Evidence-based
                </Text>
                <View style={styles.patientFooterLine} />
              </View>
            </View>
          </MotionReveal>
        </ScrollView>

        {languageMenuOpen && (
          <Pressable
            style={styles.languageBackdrop}
            onPress={closeLanguageMenu}
          />
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
  patientSafeArea: {
    flex: 1,
    backgroundColor: "#4DBDB5",
  },
  screen: {
    flex: 1,
    position: "relative",
  },
  patientScreen: {
    flex: 1,
    position: "relative",
    backgroundColor: "#4DBDB5",
  },
  patientBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  topAccentBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.24)",
  },
  patientBlob: {
    position: "absolute",
    borderRadius: 999,
    opacity: 0.16,
  },
  patientBlobTL: {
    width: 320,
    height: 320,
    backgroundColor: "#8AE0D9",
    top: -120,
    left: -110,
  },
  patientBlobBR: {
    width: 260,
    height: 260,
    backgroundColor: "#063F3B",
    bottom: -88,
    right: -70,
  },
  patientBlobMid: {
    width: 180,
    height: 180,
    backgroundColor: "#F2A93B",
    top: 310,
    left: -50,
    opacity: 0.09,
  },
  patientArc: {
    position: "absolute",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.11)",
  },
  patientArcOne: {
    width: 220,
    height: 220,
    top: -70,
    right: -65,
  },
  patientArcTwo: {
    width: 140,
    height: 140,
    top: 28,
    right: 18,
  },
  patientArcThree: {
    width: 220,
    height: 220,
    bottom: 110,
    left: -88,
    borderColor: "rgba(255,255,255,0.08)",
  },
  container: {
    flexGrow: 1,
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 32,
    justifyContent: "center",
  },
  patientContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 76,
    paddingBottom: 28,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F2937",
  },
  subtitle: {
    marginTop: 6,
    fontSize: 15,
    color: "#6B7280",
  },
  patientHero: {
    borderRadius: 30,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "rgba(255,255,255,0.08)",
    shadowColor: "#063F3B",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.22,
    shadowRadius: 22,
    elevation: 8,
  },
  patientHeroHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  patientHeroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  patientHeroBadgeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#F2A93B",
  },
  patientHeroBadgeText: {
    fontSize: 10.5,
    color: "rgba(255,255,255,0.92)",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    ...fontStyles.bold,
  },
  patientHeroLogoWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.26)",
    alignItems: "center",
    justifyContent: "center",
  },
  patientHeroLogo: {
    width: 28,
    height: 28,
  },
  patientHeroEyebrow: {
    marginTop: 18,
    fontSize: 12.5,
    color: "#D7F7F3",
    textTransform: "uppercase",
    letterSpacing: 0.9,
    ...fontStyles.bold,
  },
  patientHeroTitle: {
    marginTop: 10,
    fontSize: 28,
    lineHeight: 34,
    color: "#FFFFFF",
    ...fontStyles.display,
  },
  patientHeroSubtitle: {
    marginTop: 10,
    fontSize: 13.5,
    lineHeight: 20,
    color: "rgba(255,255,255,0.84)",
    ...fontStyles.body,
  },
  patientInfoStack: {
    marginTop: 16,
    gap: 12,
  },
  infoAccordion: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    backgroundColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: "#063F3B",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 4,
  },
  infoAccordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  infoBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  infoBadgeSoft: {
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  infoBadgeText: {
    fontSize: 11,
    color: "#D8FFF9",
    ...fontStyles.bold,
  },
  infoBadgeTextSoft: {
    color: "#D9ECFF",
  },
  infoAccordionTitle: {
    flex: 1,
    fontSize: 15,
    color: "#FFFFFF",
    ...fontStyles.heading,
  },
  infoAccordionIcon: {
    fontSize: 20,
    fontWeight: "500",
    color: "rgba(255,255,255,0.88)",
    lineHeight: 22,
  },
  infoAccordionBody: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.14)",
  },
  infoBodyTitle: {
    fontSize: 17,
    color: "#FFFFFF",
    lineHeight: 24,
    ...fontStyles.heading,
  },
  infoBodyText: {
    marginTop: 8,
    fontSize: 13.5,
    lineHeight: 20,
    color: "rgba(255,255,255,0.84)",
    ...fontStyles.body,
  },
  signalRow: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  signalPill: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  signalPillText: {
    fontSize: 12,
    color: "#FFFFFF",
    ...fontStyles.bold,
  },
  infoSignalPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  infoSignalPillText: {
    fontSize: 12,
    color: "#E8FFFB",
    ...fontStyles.bold,
  },
  infoProofList: {
    gap: 10,
  },
  proofRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  proofIndex: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  proofIndexText: {
    fontSize: 11,
    color: "#FFFFFF",
    ...fontStyles.bold,
  },
  proofText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: "rgba(255,255,255,0.84)",
    ...fontStyles.body,
  },
  patientPanelMotion: {
    marginTop: 18,
  },
  patientPanel: {
    borderRadius: 28,
    backgroundColor: "rgba(248, 252, 253, 0.98)",
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    shadowColor: "#063F3B",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.16,
    shadowRadius: 22,
    elevation: 6,
  },
  patientPanelHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  patientPanelLabel: {
    fontSize: 12,
    color: "#0F766E",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    ...fontStyles.bold,
  },
  patientPanelTitle: {
    marginTop: 6,
    fontSize: 24,
    color: "#1F2937",
    ...fontStyles.heading,
  },
  patientPanelChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#E7FAF8",
    borderWidth: 1,
    borderColor: "#CFF3EF",
  },
  patientPanelChipText: {
    fontSize: 12,
    color: "#0F766E",
    ...fontStyles.bold,
  },
  patientPanelSubtitle: {
    marginTop: 6,
    fontSize: 13.5,
    lineHeight: 19,
    color: "#6B7280",
    ...fontStyles.body,
  },
  methodStack: {
    marginTop: 16,
    gap: 10,
  },
  methodCard: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  methodCardActive: {
    borderColor: "#5DC1B9",
    backgroundColor: "#F0FFFD",
    shadowColor: "#5DC1B9",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 2,
  },
  methodHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  methodTitle: {
    flex: 1,
    fontSize: 15,
    color: "#24353B",
    ...fontStyles.heading,
  },
  methodTitleActive: {
    color: "#0F766E",
  },
  methodStateDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#D4DBDE",
  },
  methodStateDotActive: {
    backgroundColor: "#5DC1B9",
  },
  methodDescription: {
    marginTop: 6,
    fontSize: 12.5,
    lineHeight: 18,
    color: "#6B7280",
    ...fontStyles.body,
  },
  motionSection: {
    marginTop: 14,
  },
  formPanel: {
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
  },
  formPanelTitle: {
    fontSize: 16,
    color: "#1F2937",
    ...fontStyles.heading,
  },
  formPanelSubtitle: {
    marginTop: 6,
    fontSize: 12.5,
    lineHeight: 18,
    color: "#6B7280",
    ...fontStyles.body,
  },
  patientFooterMeta: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  patientFooterLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#D6E6E8",
  },
  patientFooterText: {
    fontSize: 10.5,
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    ...fontStyles.bold,
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
  cardStack: {
    marginTop: 24,
    gap: 16,
  },
  card: {
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardPrimary: {
    backgroundColor: "#E7FAF8",
  },
  cardSecondary: {
    backgroundColor: "#FFFFFF",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  cardText: {
    marginTop: 6,
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 20,
  },
  tabRow: {
    marginTop: 20,
    flexDirection: "row",
    backgroundColor: "#E7FAF8",
    borderRadius: 14,
    padding: 4,
    gap: 6,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: "#5DC1B9",
  },
  tabText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  tabTextActive: {
    color: "#FFFFFF",
  },
  sectionCard: {
    marginTop: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  sectionSubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
  },
  subTabRow: {
    marginTop: 14,
    flexDirection: "row",
    gap: 10,
  },
  subTabButton: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  subTabActive: {
    backgroundColor: "#E7FAF8",
    borderColor: "#5DC1B9",
  },
  subTabText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#475569",
  },
  subTabTextActive: {
    color: "#0F766E",
  },
  field: {
    marginTop: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  input: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111827",
    backgroundColor: "#F9FAFB",
  },
  patientInput: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111827",
    backgroundColor: "#F9FAFB",
  },
  uploadBlock: {
    marginTop: 12,
  },
  uploadRow: {
    flexDirection: "row",
    gap: 10,
  },
  uploadButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#1F2937",
    alignItems: "center",
  },
  uploadButtonSecondary: {
    backgroundColor: "#5DC1B9",
  },
  uploadButtonText: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "700",
  },
  preview: {
    marginTop: 12,
    borderRadius: 14,
    padding: 12,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    gap: 6,
  },
  previewImage: {
    width: "100%",
    height: 120,
    borderRadius: 12,
  },
  previewText: {
    fontSize: 12.5,
    color: "#475569",
    fontWeight: "600",
  },
  helperText: {
    marginTop: 8,
    fontSize: 12,
    color: "#94A3B8",
    lineHeight: 16,
  },
  primaryButton: {
    marginTop: 18,
    backgroundColor: "#5DC1B9",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  patientPrimaryButton: {
    marginTop: 18,
    backgroundColor: "#5DC1B9",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    shadowColor: "#5DC1B9",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 4,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.75,
  },
  statusCard: {
    marginTop: 14,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "#F0FDFA",
    borderWidth: 1,
    borderColor: "#CCFBF1",
  },
  patientStatusText: {
    textAlign: "center",
    color: "#0F766E",
    fontSize: 12.5,
    fontWeight: "600",
    lineHeight: 18,
  },
  statusText: {
    marginTop: 16,
    textAlign: "center",
    color: "#0F172A",
    fontSize: 12.5,
    fontWeight: "600",
  },
  footerRow: {
    marginTop: 18,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  footerText: {
    fontSize: 13.5,
    color: "#6B7280",
  },
  footerLink: {
    fontSize: 13.5,
    color: "#5DC1B9",
    fontWeight: "700",
  },
});
