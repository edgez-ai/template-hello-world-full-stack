import { StatusBar } from "expo-status-bar";
import Constants from "expo-constants";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type SharedMessage = {
  id: string;
  message: string;
  echo: string;
  source: "web" | "mobile" | "api";
  createdAt: string;
};

const stack = Constants.expoConfig?.extra as
  | { functionUrl?: string; pollIntervalMs?: number }
  | undefined;
const functionUrl = (stack?.functionUrl ?? "").replace(/\/+$/, "");
const pollIntervalMs = stack?.pollIntervalMs ?? 2000;

async function request(method: "GET" | "POST", message?: string) {
  if (!functionUrl) {
    throw new Error("Export APPWRITE_PROJECT_ID, APP_NAME, and DOMAIN_SUFFIX first.");
  }
  const response = await fetch(`${functionUrl}/message`, {
    method,
    headers: { "content-type": "application/json" },
    body: method === "POST" ? JSON.stringify({ message, source: "mobile" }) : undefined,
  });
  const body = (await response.json()) as { message: SharedMessage | null; error?: string };
  if (!response.ok) throw new Error(body.error || "The Function request failed.");
  return body.message;
}

export default function App() {
  const [draft, setDraft] = useState("");
  const [latest, setLatest] = useState<SharedMessage | null>(null);
  const [checking, setChecking] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const poll = useCallback(async (quiet = false) => {
    try {
      setLatest(await request("GET"));
      setError("");
    } catch (caught) {
      if (!quiet) setError(caught instanceof Error ? caught.message : "Channel unavailable");
    } finally {
      if (!quiet) setChecking(false);
    }
  }, []);

  useEffect(() => {
    poll();
    const timer = setInterval(() => poll(true), pollIntervalMs);
    return () => clearInterval(timer);
  }, [poll]);

  async function send() {
    const message = draft.trim();
    if (!message || sending) return;
    setSending(true);
    setError("");
    try {
      setLatest(await request("POST", message));
      setDraft("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not send");
    } finally {
      setSending(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.header}>
          <View><Text style={styles.eyebrow}>HELLO CHANNELS</Text><Text style={styles.heading}>Shared signal</Text></View>
          <View style={styles.pollBadge}><View style={styles.dot} /><Text style={styles.pollText}>{pollIntervalMs / 1000}S</Text></View>
        </View>

        <View style={styles.stage}>
          <Text style={styles.channelLabel}>LATEST · {latest?.source?.toUpperCase() || "WAITING"}</Text>
          {checking ? <ActivityIndicator color="#ef8a5c" size="large" /> : <Text style={styles.echo}>{latest?.echo || "Send the first message."}</Text>}
          <Text style={styles.time}>{latest ? new Date(latest.createdAt).toLocaleTimeString() : "Web · Mobile · ESP32-S3"}</Text>
        </View>

        <View style={styles.composer}>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              value={draft}
              onChangeText={setDraft}
              placeholder="Type a message…"
              placeholderTextColor="#84928c"
              maxLength={120}
              returnKeyType="send"
              onSubmitEditing={send}
            />
            <Text style={styles.counter}>{draft.length}/120</Text>
          </View>
          <Pressable style={({ pressed }) => [styles.send, pressed && styles.pressed, (!draft.trim() || sending) && styles.disabled]} onPress={send} disabled={!draft.trim() || sending}>
            <Text style={styles.sendText}>{sending ? "…" : "SEND"}</Text>
          </Pressable>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Text style={styles.footer}>POLLING THE APPWRITE FUNCTION · NO LOGIN</Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#16382b" },
  screen: { flex: 1, paddingHorizontal: 22, paddingTop: 18, paddingBottom: 14 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  eyebrow: { color: "#a9b9b0", fontSize: 10, fontWeight: "800", letterSpacing: 1.8 },
  heading: { color: "#fffdf5", fontSize: 28, fontWeight: "800", letterSpacing: -0.8, marginTop: 3 },
  pollBadge: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#456255", borderRadius: 16, paddingHorizontal: 11, paddingVertical: 7, gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#ef8a5c" },
  pollText: { color: "#d6ded9", fontSize: 10, fontWeight: "800" },
  stage: { flex: 1, justifyContent: "center", paddingVertical: 35 },
  channelLabel: { color: "#ef8a5c", fontSize: 11, fontWeight: "900", letterSpacing: 1.7, marginBottom: 24 },
  echo: { color: "#fffdf5", fontSize: 49, lineHeight: 57, fontWeight: "800", letterSpacing: -2.2 },
  time: { color: "#91a49a", fontSize: 13, marginTop: 26 },
  composer: { flexDirection: "row", gap: 10, alignItems: "stretch" },
  inputWrap: { flex: 1, minHeight: 66, borderRadius: 17, backgroundColor: "#f7f5ec", flexDirection: "row", alignItems: "center", paddingLeft: 17, paddingRight: 12 },
  input: { flex: 1, color: "#18392b", fontSize: 16, height: 58 },
  counter: { color: "#84928c", fontSize: 10 },
  send: { width: 78, borderRadius: 17, backgroundColor: "#ef7b49", alignItems: "center", justifyContent: "center" },
  pressed: { transform: [{ scale: 0.97 }] },
  disabled: { opacity: 0.4 },
  sendText: { color: "#fff", fontSize: 11, fontWeight: "900", letterSpacing: 1 },
  error: { color: "#ffc1aa", fontSize: 12, textAlign: "center", marginTop: 10 },
  footer: { color: "#6f887d", fontSize: 9, letterSpacing: 1.3, textAlign: "center", marginTop: 18 },
});
