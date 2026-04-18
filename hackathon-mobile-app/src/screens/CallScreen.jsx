import React, { useEffect, useMemo } from "react";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  Pressable,
  Platform,
  Linking,
} from "react-native";

const getWebView = () => {
  if (Platform.OS === "web") return null;
  try {
    return require("react-native-webview").WebView;
  } catch {
    return null;
  }
};

export default function CallScreen({ route }) {
  const url = route?.params?.url || "https://calendly.com/suthakaranburaj";
  const title = route?.params?.title || "Call";
  const WebView = useMemo(() => getWebView(), []);

  useEffect(() => {
    if (Platform.OS === "web") {
      Linking.openURL(url).catch(() => {});
    }
  }, [url]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerText}>{title}</Text>
      </View>
      {Platform.OS === "web" || !WebView ? (
        <View style={styles.webFallback}>
          <Text style={styles.webFallbackText}>
            Opening the scheduling page in a new tab.
          </Text>
          <Pressable
            style={styles.webFallbackButton}
            onPress={() => Linking.openURL(url)}
          >
            <Text style={styles.webFallbackButtonText}>Open Scheduling Page</Text>
          </Pressable>
        </View>
      ) : (
        <WebView source={{ uri: url }} style={styles.webview} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  header: {
    padding: 12,
    backgroundColor: "#0F172A",
  },
  headerText: {
    color: "#FFFFFF",
    fontWeight: "700",
    textAlign: "center",
  },
  webview: {
    flex: 1,
  },
  webFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#0F172A",
  },
  webFallbackText: {
    color: "#E2E8F0",
    textAlign: "center",
  },
  webFallbackButton: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#5DC1B9",
  },
  webFallbackButtonText: {
    color: "#0F172A",
    fontWeight: "700",
  },
});
