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
  Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import LottieView from "lottie-react-native";
import { AuthContext } from "../context/AuthContext";
import { fontStyles } from "../theme/typography";

const { width, height } = Dimensions.get("window");

export default function SplashScreen() {
  const navigation = useNavigation();
  const { role, initializing } = useContext(AuthContext);
  const lottieRef = useRef(null);

  const logoPulse = useRef(new Animated.Value(1)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoY = useRef(new Animated.Value(36)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(18)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleY = useRef(new Animated.Value(12)).current;
  const badgeOpacity = useRef(new Animated.Value(0)).current;
  const badgeScale = useRef(new Animated.Value(0.82)).current;
  const lottieOpacity = useRef(new Animated.Value(0)).current;
  const lottieY = useRef(new Animated.Value(14)).current;
  const pillOpacity = useRef(new Animated.Value(0)).current;
  const pillScale = useRef(new Animated.Value(0.9)).current;
  const ring1Scale = useRef(new Animated.Value(0.5)).current;
  const ring1Opacity = useRef(new Animated.Value(0.3)).current;
  const ring2Scale = useRef(new Animated.Value(0.5)).current;
  const ring2Opacity = useRef(new Animated.Value(0.3)).current;
  const ring3Scale = useRef(new Animated.Value(0.5)).current;
  const ring3Opacity = useRef(new Animated.Value(0.3)).current;
  const dot1Opacity = useRef(new Animated.Value(1)).current;
  const dot2Opacity = useRef(new Animated.Value(0.35)).current;
  const dot3Opacity = useRef(new Animated.Value(0.35)).current;
  const blobScale1 = useRef(new Animated.Value(1)).current;
  const blobScale2 = useRef(new Animated.Value(1)).current;
  const blobScale3 = useRef(new Animated.Value(1)).current;
  const shimmerX = useRef(new Animated.Value(-width)).current;

  const expandRing = (scaleVal, opacityVal, delay, duration) =>
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(scaleVal, {
            toValue: 2.0,
            duration,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(scaleVal, {
            toValue: 0.5,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(opacityVal, {
            toValue: 0,
            duration,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(opacityVal, {
            toValue: 0.3,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ]),
    );

  const floatBlob = (scaleVal, toValue, duration) =>
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleVal, {
          toValue,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(scaleVal, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

  const cycleDots = () => {
    const step = (a, b, c) =>
      Animated.parallel([
        Animated.timing(dot1Opacity, {
          toValue: a,
          duration: 320,
          useNativeDriver: true,
        }),
        Animated.timing(dot2Opacity, {
          toValue: b,
          duration: 320,
          useNativeDriver: true,
        }),
        Animated.timing(dot3Opacity, {
          toValue: c,
          duration: 320,
          useNativeDriver: true,
        }),
      ]);
    return Animated.loop(
      Animated.sequence([
        step(1, 0.3, 0.3),
        Animated.delay(280),
        step(0.3, 1, 0.3),
        Animated.delay(280),
        step(0.3, 0.3, 1),
        Animated.delay(280),
      ]),
    );
  };

  const shimmerLoop = () =>
    Animated.loop(
      Animated.sequence([
        Animated.delay(1400),
        Animated.timing(shimmerX, {
          toValue: width * 1.2,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(shimmerX, {
          toValue: -width,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(logoY, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.back(1.6)),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 420,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(titleY, {
          toValue: 0,
          duration: 420,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(subtitleOpacity, {
          toValue: 1,
          duration: 380,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(subtitleY, {
          toValue: 0,
          duration: 380,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(badgeOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.spring(badgeScale, {
          toValue: 1,
          friction: 6,
          tension: 130,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(lottieOpacity, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(lottieY, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(pillOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.spring(pillScale, {
          toValue: 1,
          friction: 7,
          tension: 110,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(logoPulse, {
          toValue: 1.065,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(logoPulse, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    const r1 = expandRing(ring1Scale, ring1Opacity, 0, 3000);
    const r2 = expandRing(ring2Scale, ring2Opacity, 1000, 3000);
    const r3 = expandRing(ring3Scale, ring3Opacity, 2000, 3000);
    const b1 = floatBlob(blobScale1, 1.14, 6000);
    const b2 = floatBlob(blobScale2, 0.86, 8500);
    const b3 = floatBlob(blobScale3, 1.08, 11000);
    const dots = cycleDots();
    const shimmer = shimmerLoop();

    pulse.start();
    r1.start();
    r2.start();
    r3.start();
    b1.start();
    b2.start();
    b3.start();
    dots.start();
    shimmer.start();

    const timeout = setTimeout(() => {
      if (initializing) return;
      if (role === "patient") navigation.replace("PatientDashboardMock");
      else if (role === "doctor") navigation.replace("DoctorProfile");
      else if (role === "asha") navigation.replace("Home");
      else navigation.replace("RoleSelection");
    }, 3200);

    return () => {
      [pulse, r1, r2, r3, b1, b2, b3, dots, shimmer].forEach((a) => a.stop());
      clearTimeout(timeout);
    };
  }, [navigation, role, initializing]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />
      <LinearGradient
        colors={["#4DBDB5", "#2FA89F", "#1A8C84", "#0D6B64"]}
        locations={[0, 0.35, 0.7, 1]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={styles.container}
      >
        {/* blobs */}
        <Animated.View
          style={[
            styles.blob,
            styles.blobTL,
            { transform: [{ scale: blobScale1 }] },
          ]}
        />
        <Animated.View
          style={[
            styles.blob,
            styles.blobBR,
            { transform: [{ scale: blobScale2 }] },
          ]}
        />
        <Animated.View
          style={[
            styles.blob,
            styles.blobMid,
            { transform: [{ scale: blobScale3 }] },
          ]}
        />

        {/* corner arcs */}
        <View style={[styles.arc, styles.arc1]} />
        <View style={[styles.arc, styles.arc2]} />
        <View style={[styles.arc, styles.arc3]} />
        <View style={[styles.arc, styles.arc4]} />

        {/* top accent */}
        <View style={styles.topAccentBar} />

        {/* ── MAIN CONTENT ── */}
        <View style={styles.centerGroup}>
          {/* rings */}
          <View style={styles.ringsWrap}>
            <Animated.View
              style={[
                styles.ring,
                { transform: [{ scale: ring1Scale }], opacity: ring1Opacity },
              ]}
            />
            <Animated.View
              style={[
                styles.ring,
                { transform: [{ scale: ring2Scale }], opacity: ring2Opacity },
              ]}
            />
            <Animated.View
              style={[
                styles.ring,
                { transform: [{ scale: ring3Scale }], opacity: ring3Opacity },
              ]}
            />
          </View>

          {/* logo */}
          <Animated.View
            style={[
              styles.logoWrap,
              {
                opacity: logoOpacity,
                transform: [{ translateY: logoY }, { scale: logoPulse }],
              },
            ]}
          >
            <Animated.View
              style={[
                styles.shimmerBar,
                { transform: [{ translateX: shimmerX }] },
              ]}
            />
            <Image
              source={require("../../assets/splash-icon.png")}
              style={styles.logo}
              resizeMode="contain"
              accessibilityLabel="MAULI logo"
            />
          </Animated.View>

          {/* title */}
          <Animated.Text
            style={[
              styles.title,
              { opacity: titleOpacity, transform: [{ translateY: titleY }] },
            ]}
          >
            MAULI
          </Animated.Text>

          {/* subtitle */}
          <Animated.Text
            style={[
              styles.subtitle,
              {
                opacity: subtitleOpacity,
                transform: [{ translateY: subtitleY }],
              },
            ]}
          >
            Maternal Assessment &amp; Unified{"\n"}Life-saving Intelligence
          </Animated.Text>

          {/* ABDM badge */}
          <Animated.View
            style={[
              styles.badge,
              { opacity: badgeOpacity, transform: [{ scale: badgeScale }] },
            ]}
          >
            <Text style={styles.badgeText}>ABDM · PHC Verified Portal</Text>
          </Animated.View>

          {/* Lottie — below badge */}
          <Animated.View
            style={[
              styles.lottieWrap,
              { opacity: lottieOpacity, transform: [{ translateY: lottieY }] },
            ]}
          >
            <LottieView
              ref={lottieRef}
              source={require("../../assets/slash.json")}
              autoPlay
              loop
              style={styles.lottie}
              resizeMode="contain"
            />
          </Animated.View>
        </View>

        {/* ── BOTTOM ── */}
        <View style={styles.bottomArea}>
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>
              Powered by AI · Evidence-based
            </Text>
            <View style={styles.dividerLine} />
          </View>
          <View style={styles.dotsRow} accessibilityLabel="Loading">
            <Animated.View style={[styles.dot, { opacity: dot1Opacity }]} />
            <Animated.View style={[styles.dot, { opacity: dot2Opacity }]} />
            <Animated.View style={[styles.dot, { opacity: dot3Opacity }]} />
          </View>
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const RING_SIZE = 220;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#4DBDB5" },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 0,
    paddingBottom: 48,
    overflow: "hidden",
  },
  topAccentBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  blob: { position: "absolute", borderRadius: 9999, opacity: 0.15 },
  blobTL: {
    width: 380,
    height: 380,
    backgroundColor: "#86D6CF",
    top: -140,
    left: -120,
  },
  blobBR: {
    width: 300,
    height: 300,
    backgroundColor: "#063F3B",
    bottom: -90,
    right: -70,
  },
  blobMid: {
    width: 180,
    height: 180,
    backgroundColor: "#F2A93B",
    top: height * 0.38,
    left: -60,
    opacity: 0.08,
  },
  arc: {
    position: "absolute",
    borderRadius: 9999,
    borderColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
  },
  arc1: { width: 220, height: 220, top: -70, right: -60 },
  arc2: { width: 140, height: 140, top: 20, right: 20 },
  arc3: {
    width: 90,
    height: 90,
    top: 70,
    right: 70,
    borderColor: "rgba(255,255,255,0.07)",
  },
  arc4: {
    width: 240,
    height: 240,
    bottom: -80,
    left: -80,
    borderColor: "rgba(255,255,255,0.07)",
  },
  ringsWrap: {
    position: "absolute",
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.45)",
  },
  centerGroup: { alignItems: "center", marginTop: height * 0.11 },
  logoWrap: {
    width: 120,
    height: 120,
    borderRadius: 34,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.40)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: "#063F3B",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.28,
    shadowRadius: 22,
    elevation: 12,
  },
  shimmerBar: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 60,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  logo: { width: 82, height: 82 },
  title: {
    marginTop: 22,
    fontSize: 40,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 5,
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.2)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
    ...fontStyles.display,
  },
  subtitle: {
    marginTop: 9,
    fontSize: 13,
    fontWeight: "500",
    color: "rgba(255,255,255,0.82)",
    letterSpacing: 0.25,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 36,
    ...fontStyles.body,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.30)",
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 22,
    marginTop: 18,
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "rgba(255,255,255,0.92)",
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  lottieWrap: {
    marginTop: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  lottie: { width: 380, height: 450 },
  bottomArea: { alignItems: "center", gap: 14 },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  dividerText: {
    fontSize: 10,
    fontWeight: "600",
    color: "rgba(255,255,255,0.6)",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  dotsRow: {
    flexDirection: "row",
    gap: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#FFFFFF" },
});
