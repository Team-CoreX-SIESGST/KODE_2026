import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  NativeModules,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
} from "react-native";
import { AuthContext } from "../context/AuthContext";
import { patientMe } from "../services/api";
import { buildVoiceAgentContext } from "../utils/voiceContext";

function loadOptionalVapi() {
  if (Platform.OS === "web") {
    return null;
  }

  if (!NativeModules?.WebRTCModule) {
    return null;
  }

  try {
    const dynamicRequire = eval("require");
    const loaded = dynamicRequire("@vapi-ai/react-native");
    return loaded?.default || loaded || null;
  } catch {
    return null;
  }
}

const Vapi = loadOptionalVapi();

const VAPI_API_KEY = process.env.EXPO_PUBLIC_VAPI_API_KEY;
const VAPI_AGENT_ID = process.env.EXPO_PUBLIC_VAPI_AGENT_ID;

const DEFAULT_ASSISTANT_NAME = "Asha";
const DEFAULT_VOICE_ID = "Tara";
const DEFAULT_GROQ_MODEL = "llama-3.1-8b-instant";
const DEFAULT_TRANSCRIBER_MODEL = "nova-3";

export default function VapiCallScreen() {
  const { user, token, role } = useContext(AuthContext);
  const [resolvedUser, setResolvedUser] = useState(user || null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [callState, setCallState] = useState("idle");
  const [callStatus, setCallStatus] = useState("Ready to start");
  const [transcripts, setTranscripts] = useState([]);
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const vapiRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      if (!user) {
        if (isMounted) setResolvedUser(null);
        if (isMounted) setLoadingProfile(false);
        return;
      }

      if (role === "patient" && token) {
        setLoadingProfile(true);
        try {
          const latestProfile = await patientMe(token);
          if (isMounted) setResolvedUser(latestProfile || user);
        } catch {
          // Keep auth snapshot from AsyncStorage.
        } finally {
          if (isMounted) setLoadingProfile(false);
        }
        return;
      }

      if (isMounted) setResolvedUser(user);
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [role, token, user]);

  const voiceContext = useMemo(
    () => buildVoiceAgentContext(resolvedUser, role),
    [resolvedUser, role]
  );

  const assistantPayload = useMemo(() => {
    const modelPrompt = voiceContext.instruction;
    const baseAssistant = {
      name: DEFAULT_ASSISTANT_NAME,
      transcriber: {
        provider: "deepgram",
        model: DEFAULT_TRANSCRIBER_MODEL,
      },
      model: {
        provider: "groq",
        model: DEFAULT_GROQ_MODEL,
        temperature: 0.2,
        maxTokens: 250,
        messages: [
          {
            role: "system",
            content: modelPrompt,
          },
        ],
      },
      voice: {
        provider: "vapi",
        voiceId: DEFAULT_VOICE_ID,
      },
      firstMessageMode: "assistant-waits-for-user",
    };

    if (VAPI_AGENT_ID) {
      return {
        assistant: VAPI_AGENT_ID,
        assistantOverrides: {
          transcriber: baseAssistant.transcriber,
          model: baseAssistant.model,
          voice: baseAssistant.voice,
          firstMessageMode: baseAssistant.firstMessageMode,
          variableValues: {
            currentUserContext: voiceContext.summary,
            currentUserInstruction: modelPrompt,
            currentUserRole: voiceContext.role,
          },
        },
      };
    }

    return { assistant: baseAssistant, assistantOverrides: null };
  }, [voiceContext]);

  useEffect(() => {
    if (!VAPI_API_KEY) {
      setError("Set EXPO_PUBLIC_VAPI_API_KEY in .env to start direct calls.");
      return;
    }

    if (!Vapi) {
      setError(
        Platform.OS === "web"
          ? "Direct Vapi calling needs a native Expo build, not web."
          : "Vapi voice calling needs a custom native build. This runtime does not expose WebRTCModule."
      );
      return;
    }

    try {
      const instance = new Vapi(VAPI_API_KEY);
      vapiRef.current = instance;

      const handleCallStart = () => {
        setCallState("live");
        setCallStatus("Call connected");
        setError("");
      };
      const handleCallEnd = () => {
        setCallState("idle");
        setCallStatus("Call ended");
        setStarting(false);
        setEnding(false);
      };
      const handleTranscript = (message) => {
        if (message?.type !== "transcript" || !message?.transcript) return;
        setTranscripts((prev) => [
          ...prev,
          {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            role: message.role || "assistant",
            transcript: message.transcript,
          },
        ]);
      };
      const handleStatus = (message) => {
        if (message?.type !== "status-update") return;
        if (message?.status) setCallStatus(String(message.status).replace(/-/g, " "));
      };
      const handleError = (message) => {
        const readable = message?.error?.message || message?.error || "Vapi call failed";
        setError(readable);
        setCallStatus("Error");
        setCallState("idle");
        setStarting(false);
        setEnding(false);
      };

      instance.on("call-start", handleCallStart);
      instance.on("call-end", handleCallEnd);
      instance.on("message", handleTranscript);
      instance.on("message", handleStatus);
      instance.on("error", handleError);

      return () => {
        instance.off("call-start", handleCallStart);
        instance.off("call-end", handleCallEnd);
        instance.off("message", handleTranscript);
        instance.off("message", handleStatus);
        instance.off("error", handleError);
        instance.stop().catch(() => {});
        vapiRef.current = null;
      };
    } catch (err) {
      setError(err?.message || "Unable to initialize the Vapi client.");
      return undefined;
    }
  }, []);

  const startCall = async () => {
    const instance = vapiRef.current;
    if (!instance || starting || callState === "live") return;

    setStarting(true);
    setError("");
    setCallStatus("Starting call...");
    try {
      if (assistantPayload.assistantOverrides) {
        await instance.start(
          assistantPayload.assistant,
          assistantPayload.assistantOverrides
        );
      } else {
        await instance.start(assistantPayload.assistant);
      }
    } catch (err) {
      setError(err?.message || "Could not start the call.");
      setCallStatus("Failed to start");
      setCallState("idle");
    } finally {
      setStarting(false);
    }
  };

  const stopCall = async () => {
    const instance = vapiRef.current;
    if (!instance || ending || callState !== "live") return;

    setEnding(true);
    setCallStatus("Ending call...");
    try {
      await instance.stop();
    } catch (err) {
      setError(err?.message || "Could not stop the call.");
    } finally {
      setEnding(false);
      setCallState("idle");
    }
  };

  const statusTone =
    callState === "live" ? styles.statusLive : error ? styles.statusError : styles.statusIdle;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.kicker}>Vapi direct call</Text>
        <Text style={styles.title}>Asha voice agent</Text>
        <Text style={styles.subtitle}>
          Starts the call directly from this screen. No hosted web-call page.
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.contextCard}>
          <Text style={styles.sectionLabel}>Current context</Text>
          <Text style={styles.contextText}>
            {loadingProfile ? "Loading current user context..." : voiceContext.summary || "No active user data found."}
          </Text>
        </View>

        <View style={styles.controlCard}>
          <Text style={styles.sectionLabel}>Call status</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, statusTone]} />
            <Text style={styles.statusText}>{callStatus}</Text>
          </View>

          <View style={styles.buttonRow}>
            <Pressable
              style={[styles.button, styles.primaryButton, (starting || callState === "live") && styles.buttonDisabled]}
              onPress={startCall}
              disabled={starting || callState === "live" || !VAPI_API_KEY}
            >
              {starting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Start Call</Text>
              )}
            </Pressable>

            <Pressable
              style={[styles.button, styles.secondaryButton, (ending || callState !== "live") && styles.buttonDisabled]}
              onPress={stopCall}
              disabled={ending || callState !== "live"}
            >
              {ending ? (
                <ActivityIndicator color="#0F766E" />
              ) : (
                <Text style={styles.secondaryButtonText}>End Call</Text>
              )}
            </Pressable>
          </View>

          <Text style={styles.helperText}>
            If you want the assistant to use a saved Vapi assistant, set `EXPO_PUBLIC_VAPI_AGENT_ID`.
            Otherwise the screen can start with a transient assistant configuration.
          </Text>
        </View>

        {error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Call error</Text>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.transcriptCard}>
          <Text style={styles.sectionLabel}>Live transcript</Text>
          {transcripts.length ? (
            <FlatList
              data={transcripts}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <View style={styles.transcriptItem}>
                  <Text style={styles.transcriptRole}>{item.role}</Text>
                  <Text style={styles.transcriptText}>{item.transcript}</Text>
                </View>
              )}
            />
          ) : (
            <Text style={styles.emptyText}>Nothing yet. Start the call and begin speaking.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F7F3EA",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  kicker: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#0F766E",
  },
  title: {
    marginTop: 6,
    fontSize: 30,
    fontWeight: "800",
    color: "#0F172A",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: "#475569",
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 14,
  },
  contextCard: {
    borderRadius: 24,
    padding: 16,
    backgroundColor: "#FFFDF8",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  controlCard: {
    borderRadius: 24,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  transcriptCard: {
    borderRadius: 24,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: "#0F766E",
  },
  contextText: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 20,
    color: "#334155",
  },
  statusRow: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  statusIdle: {
    backgroundColor: "#94A3B8",
  },
  statusLive: {
    backgroundColor: "#16A34A",
  },
  statusError: {
    backgroundColor: "#DC2626",
  },
  statusText: {
    fontSize: 14,
    color: "#0F172A",
    fontWeight: "600",
  },
  buttonRow: {
    marginTop: 16,
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  primaryButton: {
    backgroundColor: "#0F766E",
  },
  secondaryButton: {
    backgroundColor: "#E6FFFB",
    borderWidth: 1,
    borderColor: "#5DC1B9",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  secondaryButtonText: {
    color: "#0F766E",
    fontWeight: "700",
    fontSize: 15,
  },
  helperText: {
    marginTop: 14,
    fontSize: 12,
    lineHeight: 18,
    color: "#64748B",
  },
  errorCard: {
    borderRadius: 20,
    padding: 14,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#B91C1C",
  },
  errorText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: "#7F1D1D",
  },
  emptyText: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
    color: "#64748B",
  },
  transcriptItem: {
    marginTop: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  transcriptRole: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.7,
    textTransform: "uppercase",
    color: "#0F766E",
    marginBottom: 4,
  },
  transcriptText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#334155",
  },
});
