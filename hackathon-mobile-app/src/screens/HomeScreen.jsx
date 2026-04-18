import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function HomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home Screen</Text>
      <Text style={styles.subtitle}>Hackathon mobile app is ready.</Text>

      <Pressable style={styles.button} onPress={() => navigation.navigate("Chat")}>
        <Text style={styles.buttonText}>Go to Chat</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#ffffff",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
    color: "#111827",
  },
  subtitle: {
    fontSize: 15,
    color: "#6B7280",
  },
  card: {
    marginTop: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 18,
    backgroundColor: "#F9FAFB",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  cardText: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
  },
  cardSubText: {
    marginTop: 6,
    fontSize: 13,
    color: "#4B5563",
  },
  errorText: {
    marginTop: 14,
    color: "#DC2626",
  },
  primaryButton: {
    marginTop: 20,
    backgroundColor: "#5DC1B9",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
    color: "#444444",
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#111827",
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 16,
  },
});
