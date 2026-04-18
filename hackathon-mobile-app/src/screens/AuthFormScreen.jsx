import React, { useContext, useEffect, useMemo, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Pressable,
  ScrollView,
} from "react-native";
import {
  patientLogin,
  patientRegister,
  doctorLogin,
  doctorRegister,
  ashaLogin,
  ashaRegister,
} from "../services/api";
import { AuthContext } from "../context/AuthContext";

const ROLE_LABELS = {
  patient: "Patient",
  doctor: "Doctor",
  asha: "ASHA Worker",
};

const GOOGLE_PLACES_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;

const initialState = {
  name: "",
  abhaId: "",
  phoneNumber: "",
  username: "",
  password: "",
  hospitalName: "",
  city: "",
  latitude: "",
  longitude: "",
};

export default function AuthFormScreen({ navigation, route }) {
  const role = route?.params?.role || "patient";
  const normalizedRole = role === "abha" ? "asha" : role;
  const mode = route?.params?.mode || "login";
  const isLogin = mode === "login";
  const roleLabel = useMemo(
    () => ROLE_LABELS[normalizedRole] || "User",
    [normalizedRole]
  );
  const { signIn } = useContext(AuthContext);

  const [form, setForm] = useState(initialState);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cityQuery, setCityQuery] = useState("");
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [cityLoading, setCityLoading] = useState(false);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const parseLocation = () => {
    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) return null;
    return { latitude, longitude };
  };

  useEffect(() => {
    if (!cityQuery || cityQuery.trim().length < 2 || !GOOGLE_PLACES_API_KEY) {
      setCitySuggestions([]);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        setCityLoading(true);
        const encoded = encodeURIComponent(cityQuery.trim());
        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encoded}&types=(cities)&components=country:in&key=${GOOGLE_PLACES_API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();
        const suggestions = (data?.predictions || []).map((item) => ({
          id: item.place_id,
          label: item.description,
        }));
        setCitySuggestions(suggestions);
      } catch (err) {
        setCitySuggestions([]);
      } finally {
        setCityLoading(false);
      }
    }, 350);

    return () => clearTimeout(timeout);
  }, [cityQuery]);

  const handleCitySelect = async (place) => {
    setCityQuery(place.label);
    updateField("city", place.label);
    setCitySuggestions([]);

    if (!GOOGLE_PLACES_API_KEY) return;

    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.id}&fields=geometry&key=${GOOGLE_PLACES_API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();
      const location = data?.result?.geometry?.location;
      if (location?.lat && location?.lng) {
        updateField("latitude", String(location.lat));
        updateField("longitude", String(location.lng));
      }
    } catch (err) {
      // Ignore lookup failures and allow manual retry via typing
    }
  };

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      if (!isLogin) {
        const locationCoordinates = parseLocation();
        if (!locationCoordinates) {
          setError("Select a city to continue");
          setLoading(false);
          return;
        }
      }

      let response;
      if (normalizedRole === "patient") {
        if (isLogin) {
          response = await patientLogin({ abhaId: form.abhaId.trim() });
        } else {
          const locationCoordinates = parseLocation();
          response = await patientRegister({
            name: form.name.trim(),
            abhaId: form.abhaId.trim(),
            phoneNumber: form.phoneNumber.trim(),
            locationCoordinates,
          });
        }
      } else if (normalizedRole === "doctor") {
        if (isLogin) {
          response = await doctorLogin({
            username: form.username.trim().toLowerCase(),
            password: form.password,
          });
        } else {
          const locationCoordinates = parseLocation();
          response = await doctorRegister({
            name: form.name.trim(),
            username: form.username.trim().toLowerCase(),
            password: form.password,
            hospitalName: form.hospitalName.trim(),
            locationCoordinates,
          });
        }
      } else {
        if (isLogin) {
          response = await ashaLogin({
            username: form.username.trim().toLowerCase(),
            password: form.password,
          });
        } else {
          const locationCoordinates = parseLocation();
          response = await ashaRegister({
            name: form.name.trim(),
            username: form.username.trim().toLowerCase(),
            password: form.password,
            locationCoordinates,
          });
        }
      }

      const { token, ...profile } = response || {};
      signIn({ user: profile, token, role: normalizedRole });

      let nextScreen = "Home";
      if (normalizedRole === "patient") {
        nextScreen = "PatientDashboardMock";
      } else if (normalizedRole === "doctor") {
        nextScreen = "DoctorProfile";
      } else if (normalizedRole === "asha") {
        nextScreen = "AbhaSevakProfile";
      }

      navigation.reset({ index: 0, routes: [{ name: nextScreen }] });
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const renderInput = (label, value, onChangeText, props = {}) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor="#9CA3AF"
        {...props}
      />
    </View>
  );
  
  const renderCityDropdown = () => (
    <View style={styles.field}>
      <Text style={styles.label}>City (India)</Text>
      <TextInput
        style={styles.input}
        value={cityQuery}
        onChangeText={(value) => {
          setCityQuery(value);
          updateField("city", value);
        }}
        placeholder="Start typing your city"
        placeholderTextColor="#9CA3AF"
        autoCapitalize="words"
      />
      {cityLoading && (
        <Text style={styles.helperText}>Fetching city suggestions...</Text>
      )}
      {!GOOGLE_PLACES_API_KEY && (
        <Text style={styles.helperText}>Add your Google API key in .env.</Text>
      )}
      {citySuggestions.length > 0 && (
        <View style={styles.dropdown}>
          {citySuggestions.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => handleCitySelect(item)}
              style={styles.dropdownItem}
            >
              <Text style={styles.dropdownText}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>
          {isLogin ? `${roleLabel} Login` : `${roleLabel} Register`}
        </Text>
        <Text style={styles.subtitle}>
          {isLogin
            ? "Enter your credentials to continue."
            : "Create a new account to access the app."}
        </Text>

        {!isLogin && renderInput("Full Name", form.name, (v) => updateField("name", v))}

        {role === "patient" &&
          renderInput("ABHA ID", form.abhaId, (v) => updateField("abhaId", v), {
            autoCapitalize: "none",
          })}

        {role !== "patient" &&
          renderInput("Username", form.username, (v) => updateField("username", v), {
            autoCapitalize: "none",
          })}

        {(role !== "patient" || isLogin) &&
          role !== "patient" &&
          renderInput("Password", form.password, (v) => updateField("password", v), {
            secureTextEntry: true,
          })}

        {!isLogin && role === "patient" &&
          renderInput("Phone Number", form.phoneNumber, (v) => updateField("phoneNumber", v), {
            keyboardType: "phone-pad",
          })}

        {!isLogin && role === "doctor" &&
          renderInput("Hospital Name", form.hospitalName, (v) => updateField("hospitalName", v))}

        {!isLogin && (
          <>
            {renderCityDropdown()}
            <Text style={styles.helperText}>
              Select a city from the list to fill your location automatically.
            </Text>
          </>
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Pressable
          style={[styles.primaryButton, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.primaryButtonText}>
            {loading ? "Please wait..." : isLogin ? "Login" : "Register"}
          </Text>
        </Pressable>
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
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: "#6B7280",
  },
  field: {
    marginTop: 18,
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
  dropdown: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  dropdownText: {
    fontSize: 14,
    color: "#111827",
  },
  helperText: {
    marginTop: 8,
    fontSize: 12,
    color: "#94A3B8",
  },
  errorText: {
    marginTop: 12,
    color: "#DC2626",
    fontSize: 13,
  },
  primaryButton: {
    marginTop: 24,
    backgroundColor: "#5DC1B9",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
