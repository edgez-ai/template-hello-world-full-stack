import { FormEvent, useCallback, useEffect, useState } from "react";

type SharedMessage = {
  id: string;
  message: string;
  echo: string;
  source: "web" | "mobile" | "api";
  createdAt: string;
};

const functionUrl = __FUNCTION_URL__.replace(/\/+$/, "");
const pollIntervalMs = __POLL_INTERVAL_MS__;

function errorText(error: unknown) {
  return error instanceof Error ? error.message : "The shared channel is unavailable.";
}

async function callFunction(method: "GET" | "POST", message?: string) {
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
  const [draft, setDraft] = useState("");
  const [latest, setLatest] = useState<SharedMessage | null>(null);
  const [checking, setChecking] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const poll = useCallback(async (quiet = false) => {
    try {
      setLatest(await callFunction("GET"));
      setError("");
    } catch (caught) {
      if (!quiet) setError(errorText(caught));
    } finally {
      if (!quiet) setChecking(false);
    }
  }, []);

  useEffect(() => {
    void poll();
    const timer = window.setInterval(() => void poll(true), pollIntervalMs);
    return () => window.clearInterval(timer);
  }, [poll]);

  async function send(event: FormEvent) {
    event.preventDefault();
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
    <main className="shell">
      <nav className="topbar" aria-label="Product">
        <span className="brand-mark" aria-hidden="true">H</span>
        <span className="brand">HELLO CHANNELS</span>
        <span className="live"><i /> POLLING · {pollIntervalMs / 1000}S</span>
      </nav>

      <section className="content">
        <div className="intro">
          <p className="kicker">APPWRITE · REACT · ESP32-S3</p>
          <h1>One message.<br /><em>Every screen.</em></h1>
          <p className="subtitle">
            Send a tiny thought into the shared channel. The Function stores it
            once; web, Android, and hardware all poll the same echo.
          </p>
        </div>

        <article className="echo-card" aria-live="polite">
          <header><span>LATEST ECHO</span><span>{latest?.source?.toUpperCase() || "WAITING"}</span></header>
          <div className="echo">{checking ? "Listening…" : latest?.echo || "Send the first message."}</div>
          <footer>{latest ? new Date(latest.createdAt).toLocaleString() : "All three channels are listening"}</footer>
        </article>
      </section>

      <form className="composer" onSubmit={send}>
        <label className="sr-only" htmlFor="message">Message</label>
        <input
          id="message"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Type a message…"
          maxLength={120}
          autoComplete="off"
        />
        <span className="counter">{draft.length}/120</span>
        <button type="submit" disabled={!draft.trim() || sending}>
          {sending ? "SENDING…" : "SEND →"}
        </button>
      </form>
      {error && <p className="error" role="alert">{error}</p>}
    </main>
  );
}

