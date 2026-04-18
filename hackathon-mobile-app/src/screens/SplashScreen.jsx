import React, { useContext, useEffect, useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Animated,
  Easing,
  StatusBar,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { AuthContext } from "../context/AuthContext";
import { fontStyles } from "../theme/typography";

export default function SplashScreen() {
  const navigation = useNavigation();
  const pulse = useRef(new Animated.Value(1)).current;
  const { role, initializing } = useContext(AuthContext);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.06,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    const timeout = setTimeout(() => {
      if (initializing) return;
      if (role === "patient") {
        navigation.replace("PatientDashboardMock");
      } else if (role === "doctor") {
        navigation.replace("DoctorProfile");
      } else if (role === "asha") {
        navigation.replace("Home");
      } else {
        navigation.replace("RoleSelection");
      }
    }, 1200);

    return () => {
      animation.stop();
      clearTimeout(timeout);
    };
  }, [navigation, pulse, role, initializing]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={["#5DC1B9", "#86D6CF"]} style={styles.container}>
        <View style={styles.centerGroup}>
          <Animated.View style={[styles.logoWrap, { transform: [{ scale: pulse }] }]}>
            <Image
              source={require("../../assets/splash-icon.png")}
              style={styles.logo}
              resizeMode="contain"
              accessibilityLabel="MAULI logo"
            />
          </Animated.View>
          <Text style={styles.title}>MAULI</Text>
          <Text style={styles.subtitle}>
            {"Maternal Assessment & Unified Life-saving Intelligence"}
          </Text>
        </View>
        <View style={styles.dotsRow} accessibilityLabel="Loading">
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#5DC1B9",
  },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 56,
  },
  centerGroup: {
    alignItems: "center",
    marginTop: 140,
  },
  logoWrap: {
    width: 120,
    height: 120,
    borderRadius: 30,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0B4F4A",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 8,
  },
  logo: {
    width: 88,
    height: 88,
  },
  title: {
    marginTop: 18,
    fontSize: 34,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.4,
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.15)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
    ...fontStyles.display,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.9)",
    letterSpacing: 0.3,
    textAlign: "center",
    ...fontStyles.body,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
  },
  dotActive: {
    backgroundColor: "#FFFFFF",
  },
});
