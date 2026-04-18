import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet, View, Text } from "react-native";
import { WebView } from "react-native-webview";

const VAPI_WEB_CALL_URL = process.env.EXPO_PUBLIC_VAPI_WEB_CALL_URL;

export default function VapiCallScreen() {
  if (!VAPI_WEB_CALL_URL) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.fallback}>
          <Text style={styles.title}>Vapi not configured</Text>
          <Text style={styles.subtitle}>
            Set EXPO_PUBLIC_VAPI_WEB_CALL_URL in .env to start in-app calls.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <WebView
        source={{ uri: VAPI_WEB_CALL_URL }}
        style={styles.webview}
        originWhitelist={["*"]}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  webview: {
    flex: 1,
  },
  fallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
});
