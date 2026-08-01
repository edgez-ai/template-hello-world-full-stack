import { StatusBar } from "expo-status-bar";
import Constants from "expo-constants";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
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

function errorText(error: unknown) {
  return error instanceof Error ? error.message : "The shared channel is unavailable.";
}

async function callFunction(method: "GET" | "POST", message?: string) {
  if (!functionUrl) throw new Error("Export APP_NAME and DOMAIN_SUFFIX first.");
  const response = await fetch(`${functionUrl}/message`, {
    method,
    headers: { "content-type": "application/json" },
    body: method === "POST" ? JSON.stringify({ message, source: "web" }) : undefined,
  });
  const body = (await response.json()) as { message: SharedMessage | null; error?: string };
  if (!response.ok) throw new Error(body.error || "The Function request failed.");
  return body.message;
}

export default function App() {
  const { width } = useWindowDimensions();
  const compact = width < 760;
  const [draft, setDraft] = useState("");
  const [latest, setLatest] = useState<SharedMessage | null>(null);
  const [checking, setChecking] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const poll = useCallback(async (quiet = false) => {
    try {
      const message = await callFunction("GET");
      setLatest(message);
      setError("");
    } catch (caught) {
      if (!quiet) setError(errorText(caught));
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
      setLatest(await callFunction("POST", message));
      setDraft("");
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      setSending(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.shell}>
        <View style={styles.topbar}>
          <View style={styles.brandMark}><Text style={styles.brandLetter}>H</Text></View>
          <Text style={styles.brand}>HELLO CHANNELS</Text>
          <View style={styles.live}><View style={styles.liveDot} /><Text style={styles.liveText}>POLLING · {pollIntervalMs / 1000}S</Text></View>
        </View>

        <View style={[styles.content, compact && styles.contentCompact]}>
          <View style={styles.intro}>
            <Text style={styles.kicker}>APPWRITE · REACT NATIVE · ESP32-S3</Text>
            <Text style={[styles.title, compact && styles.titleCompact]}>One message.{"\n"}<Text style={styles.titleAccent}>Every screen.</Text></Text>
            <Text style={styles.subtitle}>Send a tiny thought into the shared channel. The Function stores it once; web, mobile, and hardware all poll the same echo.</Text>
          </View>

          <View style={styles.echoCard}>
            <View style={styles.cardLabelRow}>
              <Text style={styles.cardLabel}>LATEST ECHO</Text>
              <Text style={styles.source}>{latest?.source?.toUpperCase() || "WAITING"}</Text>
            </View>
            {checking ? <ActivityIndicator color="#18392b" /> : <Text style={styles.echo}>{latest?.echo || "Send the first message."}</Text>}
            <Text style={styles.timestamp}>{latest ? new Date(latest.createdAt).toLocaleString() : "All three channels are listening"}</Text>
          </View>
        </View>

        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={send}
            placeholder="Type a message…"
            placeholderTextColor="#87948d"
            maxLength={120}
            returnKeyType="send"
            accessibilityLabel="Message"
          />
          <Text style={styles.counter}>{draft.length}/120</Text>
          <Pressable style={({ pressed }) => [styles.button, pressed && styles.buttonPressed, (!draft.trim() || sending) && styles.buttonDisabled]} onPress={send} disabled={!draft.trim() || sending}>
            <Text style={styles.buttonText}>{sending ? "SENDING…" : "SEND →"}</Text>
          </Pressable>
        </View>
        {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f1f0e8" },
  shell: { flex: 1, width: "100%", maxWidth: 1180, alignSelf: "center", paddingHorizontal: 24, paddingBottom: 24 },
  topbar: { minHeight: 84, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#c9cdc5" },
  brandMark: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#18392b", alignItems: "center", justifyContent: "center", marginRight: 10 },
  brandLetter: { color: "#f1f0e8", fontWeight: "900", fontSize: 16 },
  brand: { color: "#18392b", fontSize: 13, letterSpacing: 1.8, fontWeight: "800", flex: 1 },
  live: { flexDirection: "row", alignItems: "center", gap: 7 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#ef6a3a" },
  liveText: { color: "#526159", fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  content: { flex: 1, flexDirection: "row", alignItems: "center", gap: 64, paddingVertical: 54 },
  contentCompact: { flexDirection: "column", alignItems: "stretch", justifyContent: "center", gap: 36, paddingVertical: 38 },
  intro: { flex: 1.15 },
  kicker: { color: "#ef6a3a", fontSize: 11, letterSpacing: 1.7, fontWeight: "800", marginBottom: 18 },
  title: { color: "#18392b", fontSize: 66, lineHeight: 69, letterSpacing: -3.5, fontWeight: "800" },
  titleCompact: { fontSize: 44, lineHeight: 47, letterSpacing: -2 },
  titleAccent: { color: "#ef6a3a", fontStyle: "italic" },
  subtitle: { color: "#526159", fontSize: 17, lineHeight: 27, maxWidth: 590, marginTop: 22 },
  echoCard: { flex: 0.85, minHeight: 250, borderRadius: 28, backgroundColor: "#18392b", padding: 30, justifyContent: "space-between", shadowColor: "#18392b", shadowOpacity: 0.15, shadowRadius: 24, shadowOffset: { width: 0, height: 12 } },
  cardLabelRow: { flexDirection: "row", justifyContent: "space-between" },
  cardLabel: { color: "#a9b7ae", fontSize: 11, fontWeight: "800", letterSpacing: 1.5 },
  source: { color: "#f2a98c", fontSize: 11, fontWeight: "800", letterSpacing: 1.2 },
  echo: { color: "#fffdf4", fontSize: 34, lineHeight: 42, fontWeight: "700", marginVertical: 24 },
  timestamp: { color: "#a9b7ae", fontSize: 12 },
  composer: { minHeight: 82, flexDirection: "row", alignItems: "center", borderRadius: 18, borderWidth: 1, borderColor: "#c3c8c0", backgroundColor: "#fbfaf4", paddingHorizontal: 18, gap: 12 },
  input: { flex: 1, height: 58, color: "#18392b", fontSize: 17, outlineStyle: "none" } as never,
  counter: { color: "#87948d", fontSize: 11 },
  button: { height: 50, borderRadius: 13, paddingHorizontal: 24, backgroundColor: "#ef6a3a", alignItems: "center", justifyContent: "center" },
  buttonPressed: { transform: [{ scale: 0.98 }] },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { color: "#fff", fontSize: 12, letterSpacing: 1, fontWeight: "900" },
  error: { color: "#a33b24", textAlign: "center", marginTop: 10, fontSize: 13 },
});
