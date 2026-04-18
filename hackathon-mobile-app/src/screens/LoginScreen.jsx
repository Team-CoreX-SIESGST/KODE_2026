import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  StyleSheet,
  Text,
  View,
  Image,
  TextInput,
  Pressable,
  ScrollView,
} from "react-native";

export default function LoginScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brandBlock}>
          <View style={styles.logoWrap}>
            <Image
              source={require("../../assets/splash-icon.png")}
              style={styles.logo}
              resizeMode="contain"
              accessibilityLabel="ArogyaGram logo"
            />
          </View>
          <Text style={styles.appName}>Arogyagram</Text>
          <Text style={styles.tagline}>Your trusted healthcare partner</Text>
        </View>

        <View style={styles.formBlock}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>
            Please enter your mobile number to login
          </Text>

          <Text style={styles.label}>Mobile Number</Text>
          <View style={styles.inputRow}>
            <View style={styles.countryCode}>
              <Text style={styles.countryText}>+91</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="00000 00000"
              placeholderTextColor="#9AA3AF"
              keyboardType="number-pad"
              maxLength={10}
            />
          </View>

          <Pressable
            style={styles.primaryButton}
            onPress={() => navigation.navigate("PatientDashboardMock")}
          >
            <Text style={styles.primaryButtonText}>Login as Patient</Text>
          </Pressable>

          <Pressable
            style={[styles.primaryButton, styles.secondaryButton]}
            onPress={() => navigation.navigate("ConsultantDashboardMock")}
          >
            <Text style={styles.primaryButtonText}>Login as Doctor</Text>
          </Pressable>

          <Text style={styles.termsText}>
            By proceeding, you agree to ArogyaGram's
            <Text style={styles.linkText}> Terms of Service </Text>
            and
            <Text style={styles.linkText}> Privacy Policy</Text>
          </Text>
        </View>

        <View style={styles.footerBlock}>
          <Text style={styles.footerText}>New to ArogyaGram?</Text>
          <Text style={styles.footerLink}>Register Now</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
    backgroundColor: "#FFFFFF",
  },
  brandBlock: {
    alignItems: "center",
    marginTop: 8,
  },
  logoWrap: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: "#5DC1B9",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0B4F4A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 6,
  },
  logo: {
    width: 56,
    height: 56,
  },
  appName: {
    marginTop: 14,
    fontSize: 28,
    fontWeight: "700",
    color: "#1F2937",
  },
  tagline: {
    marginTop: 6,
    fontSize: 15,
    color: "#6B7280",
  },
  formBlock: {
    marginTop: 28,
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
  label: {
    marginTop: 22,
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  inputRow: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E8ECEF",
    backgroundColor: "#FFFFFF",
    shadowColor: "#111827",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  countryCode: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRightWidth: 1,
    borderRightColor: "#E8ECEF",
  },
  countryText: {
    fontSize: 16,
    color: "#9AA3AF",
    fontWeight: "600",
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 18,
    color: "#1F2937",
  },
  primaryButton: {
    marginTop: 22,
    backgroundColor: "#5DC1B9",
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: "center",
    shadowColor: "#5DC1B9",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 4,
  },
  secondaryButton: {
    backgroundColor: "#1F2937",
    marginTop: 14,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  termsText: {
    marginTop: 18,
    textAlign: "center",
    fontSize: 12.5,
    color: "#9AA3AF",
    lineHeight: 18,
  },
  linkText: {
    color: "#8A97A8",
    textDecorationLine: "underline",
  },
  footerBlock: {
    marginTop: 28,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  footerText: {
    fontSize: 14,
    color: "#6B7280",
  },
  footerLink: {
    fontSize: 14,
    color: "#5DC1B9",
    fontWeight: "700",
  },
});
