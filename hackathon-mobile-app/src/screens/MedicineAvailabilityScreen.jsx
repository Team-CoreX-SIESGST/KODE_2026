import React from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  Pressable,
} from "react-native";

const mockStocks = [
  { name: "Paracetamol 500mg", status: "Available", eta: "0.4 km" },
  { name: "Amoxicillin 250mg", status: "Low Stock", eta: "1.2 km" },
  { name: "Metformin 500mg", status: "Available", eta: "0.8 km" },
  { name: "Cetirizine 10mg", status: "Out of Stock", eta: "2.1 km" },
];

export default function MedicineAvailabilityScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Medicine Availability</Text>
      <Text style={styles.subtitle}>
        Check nearby pharmacies for stock.
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Search medicine name"
        placeholderTextColor="#94A3B8"
      />

      <Pressable style={styles.primaryButton}>
        <Text style={styles.primaryButtonText}>Search</Text>
      </Pressable>

      <View style={styles.list}>
        {mockStocks.map((item) => (
          <View key={item.name} style={styles.card}>
            <Text style={styles.cardTitle}>{item.name}</Text>
            <Text style={styles.cardMeta}>{item.status}</Text>
            <Text style={styles.cardMeta}>{item.eta} away</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#F8FAFC",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0F172A",
  },
  subtitle: {
    marginTop: 6,
    color: "#64748B",
  },
  input: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#FFFFFF",
  },
  primaryButton: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#5DC1B9",
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  list: {
    marginTop: 16,
    gap: 12,
  },
  card: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardTitle: {
    fontWeight: "700",
    color: "#0F172A",
  },
  cardMeta: {
    marginTop: 4,
    color: "#64748B",
  },
});
