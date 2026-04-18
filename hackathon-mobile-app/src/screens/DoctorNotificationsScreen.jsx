import React, { useContext, useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { StyleSheet, Text, View, ScrollView, Pressable } from "react-native";
import { AuthContext } from "../context/AuthContext";
import { doctorNotifications, doctorReadNotification } from "../services/api";

export default function DoctorNotificationsScreen() {
  const { token } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);

  const load = async () => {
    if (!token) return;
    const data = await doctorNotifications(token);
    setNotifications(data.results || []);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Notifications</Text>
        {notifications.length === 0 ? (
          <Text style={styles.helper}>No notifications.</Text>
        ) : (
          notifications.map((note) => (
            <View key={note._id} style={styles.card}>
              <Text style={styles.text}>{note.message}</Text>
              {!note.read ? (
                <Pressable
                  style={styles.button}
                  onPress={async () => {
                    await doctorReadNotification(token, note._id);
                    await load();
                  }}
                >
                  <Text style={styles.buttonText}>Mark Read</Text>
                </Pressable>
              ) : null}
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
    backgroundColor: "#F8FAFC",
  },
  container: {
    padding: 20,
    backgroundColor: "#F8FAFC",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0F172A",
  },
  helper: {
    marginTop: 10,
    color: "#64748B",
  },
  card: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  text: {
    color: "#0F172A",
  },
  button: {
    marginTop: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#5DC1B9",
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
