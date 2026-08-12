import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@/lib/convex";
import { api } from "@convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { JarvisOrb } from "@/components/jarvis/JarvisOrb";
import { JarvisTranscript } from "@/components/jarvis/JarvisTranscript";
import { JarvisLeftPanel } from "@/components/jarvis/JarvisLeftPanel";
import { JarvisRightPanel } from "@/components/jarvis/JarvisRightPanel";
import { type OrbState, ORB_STATE_HUES } from "@/components/jarvis/jarvisTypes";
import { Bot, Mic, MicOff, RefreshCw, Trash2, Plus } from "lucide-react";

export function meta() {
  return [{ title: "Jarvis AI — MedFlow" }];
}

// ─── System prompt for hospital context ──────────────────────────────
const SYSTEM_PROMPT = `You are Jarvis, a voice-first AI assistant embedded in MedFlow, a real-time hospital management system. You assist doctors, nurses, and hospital staff with:
- Clinical decisions and drug interactions
- Sending emails to patients and staff (use [[EMAIL:recipient:subject:body]])
- Scheduling clinical appointments & rounds (use [[APPOINTMENT:patientName:phone:notes]])
- Evaluating patient triage (use [[TRIAGE:patientName:symptoms]])
- Task management (use [[TODO:title:priority]])
- Remembering clinical preferences & facts (use [[MEMORY:category:key:value]])

CRITICAL CONTEXTUAL RULES:
- You have multi-turn conversation memory. Always inspect the Recent Conversation History before responding.
- When the user previously asked to book an appointment, send an email, or triage a patient, and then provides details (such as patient name, age, phone, or notes), IMMEDIATELY execute the corresponding directive (e.g. [[APPOINTMENT:patientName:phone:notes]]).
- Never reset or respond with generic greetings like "Hello! How can I assist you today?" when answering follow-up details. Confirm the action taken professionally.`;

// ─── Puter AI response parser ─────────────────────────────────────────
function parseAiDirectives(text: string, addMemory: Function, addTodo: Function, executeTool: Function) {
  const memoryMatches = [...text.matchAll(/\[\[MEMORY:([^:]+):([^:]+):([^\]]+)\]\]/g)];
  for (const m of memoryMatches) {
    addMemory({ category: m[1], key: m[2], value: m[3] }).catch(() => {});
  }
  const todoMatches = [...text.matchAll(/\[\[TODO:([^:]+):([^\]]+)\]\]/g)];
  for (const t of todoMatches) {
    addTodo({ title: t[1], priority: t[2] as any }).catch(() => {});
  }
  const emailMatches = [...text.matchAll(/\[\[EMAIL:([^:]+):([^:]+):([^\]]+)\]\]/g)];
  for (const e of emailMatches) {
    executeTool({ toolName: "send_email", params: { recipient: e[1], subject: e[2], body: e[3] } }).catch(() => {});
  }
  const apptMatches = [...text.matchAll(/\[\[APPOINTMENT:([^:]+):([^:]+):([^\]]+)\]\]/g)];
  for (const a of apptMatches) {
    executeTool({ toolName: "schedule_event", params: { patientName: a[1], phone: a[2], notes: a[3] } }).catch(() => {});
  }
  const triageMatches = [...text.matchAll(/\[\[TRIAGE:([^:]+):([^\]]+)\]\]/g)];
  for (const tr of triageMatches) {
    executeTool({ toolName: "triage_patient", params: { patientName: tr[1], symptoms: tr[2] } }).catch(() => {});
  }
  // Return clean text without directives
  return text
    .replace(/\[\[MEMORY:[^\]]+\]\]/g, "")
    .replace(/\[\[TODO:[^\]]+\]\]/g, "")
    .replace(/\[\[EMAIL:[^\]]+\]\]/g, "")
    .replace(/\[\[APPOINTMENT:[^\]]+\]\]/g, "")
    .replace(/\[\[TRIAGE:[^\]]+\]\]/g, "")
    .trim();
}

export default function JarvisPage() {
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id ?? "";
  const userName = session?.user?.name ?? "User";

  const addMessage = useMutation(api.jarvisMessages.addMessage);
  const clearMessages = useMutation(api.jarvisMessages.clearAll);
  const logTimeline = useMutation(api.jarvisTimeline.log);
  const setVoiceState = useMutation(api.jarvisVoiceState.set);
  const setObjective = useMutation(api.jarvisObjective.set);
  const addMemory = useMutation(api.jarvisMemory.upsert);
  const addTodo = useMutation(api.jarvisTodos.add);
  const executeTool = useMutation(api.jarvisTools.executeTool);
  const voiceStateRes = useQuery(api.jarvisVoiceState.get, {});
  const voiceState = voiceStateRes?.data;
  const messagesRes = useQuery(api.jarvisMessages.list, {});
  const messages = messagesRes?.data ?? [];

  const [orbState, setOrbStateRaw] = useState<OrbState>("idle");
  const [active, setActive] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [listening, setListening] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [levelVal, setLevelVal] = useState(0);

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const orbStateRef = useRef<OrbState>("idle");
  const levelRef = useRef(0);
  const levelAnimRef = useRef(0);

  // Update CSS var for scene tint
  const setOrbState = useCallback((state: OrbState) => {
    orbStateRef.current = state;
    setOrbStateRaw(state);
    document.documentElement.style.setProperty("--jarvis-state-hue", String(ORB_STATE_HUES[state] ?? 197));
    void setVoiceState.mutateAsync({ orbState: state, sessionActive: active }).catch(() => {});
  }, [active, setVoiceState]);

  // Animate audio level for listening
  useEffect(() => {
    const animate = () => {
      if (orbStateRef.current === "listening") {
        const t = performance.now() / 1000;
        levelRef.current = 0.3 + 0.25 * Math.sin(t * 7.3) + 0.15 * Math.sin(t * 14.1);
      } else if (orbStateRef.current === "speaking") {
        const t = performance.now() / 1000;
        levelRef.current = 0.4 + 0.3 * Math.sin(t * 5.2) + 0.2 * Math.sin(t * 11.8);
      } else {
        levelRef.current = 0;
      }
      levelAnimRef.current = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(levelAnimRef.current);
  }, []);

  const getLevel = useCallback(() => levelRef.current, []);

  // Setup speech synthesis
  useEffect(() => {
    synthRef.current = window.speechSynthesis;
  }, []);

  const speak = useCallback((text: string) => {
    if (!synthRef.current) return;
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1;
    utterance.pitch = 1.0;
    // Try to use a good voice
    const voices = synthRef.current.getVoices();
    const preferred = voices.find(v => v.name.includes("Google") && v.lang.startsWith("en")) ||
                      voices.find(v => v.lang.startsWith("en-US")) ||
                      voices[0];
    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => { setIsSpeaking(true); setOrbState("speaking"); };
    utterance.onend = () => { setIsSpeaking(false); setOrbState("idle"); };
    utterance.onerror = () => { setIsSpeaking(false); setOrbState("idle"); };

    synthRef.current.speak(utterance);
  }, [setOrbState]);

  const stopSpeaking = useCallback(() => {
    synthRef.current?.cancel();
    setIsSpeaking(false);
    setOrbState("idle");
  }, [setOrbState]);

  const handleUserInput = useCallback(async (text: string) => {
    if (!text.trim()) return;

    // Stop speaking if we barge in
    if (isSpeaking) stopSpeaking();

    setOrbState("thinking");
    void setObjective.mutateAsync({ text: text.slice(0, 80), state: "working" }).catch(() => {});
    void logTimeline.mutateAsync({ kind: "user_spoke", label: "User spoke", detail: text.slice(0, 80) }).catch(() => {});

    // Add user message to transcript
    await addMessage.mutateAsync({ role: "user", text });

    try {
      const puter = (window as any).puter;
      if (!puter) throw new Error("Puter.js not available");

      const historyText = (messages ?? [])
        .slice(-10)
        .map((m: any) => `${m.role === "user" ? "User" : "Jarvis"}: ${m.text}`)
        .join("\n");

      const promptWithHistory = `${SYSTEM_PROMPT}\n\nRecent Conversation History:\n${historyText}\nUser: ${text}`;

      const response = await puter.ai.chat(promptWithHistory, {
        model: "gpt-4o-mini",
      });

      const rawText = typeof response === "string"
        ? response
        : response?.message?.content ?? response?.text ?? "I'm sorry, I couldn't process that.";

      // Parse and store directives (memory, todos, email, appt, triage)
      const cleanText = parseAiDirectives(rawText, addMemory.mutateAsync, addTodo.mutateAsync, executeTool.mutateAsync);

      await addMessage.mutateAsync({ role: "assistant", text: cleanText });
      void logTimeline.mutateAsync({ kind: "response_generated", label: "Response generated", detail: cleanText.slice(0, 80) }).catch(() => {});
      void setObjective.mutateAsync({ text: "Standing by", state: "idle" }).catch(() => {});

      // Speak the response
      speak(cleanText);

    } catch (err: any) {
      setOrbState("error");
      const errMsg = err.message || "Failed to get AI response.";
      await addMessage.mutateAsync({ role: "assistant", text: `Error: ${errMsg}` });
      void logTimeline.mutateAsync({ kind: "error", label: "Error", detail: errMsg }).catch(() => {});
      setTimeout(() => setOrbState("idle"), 2000);
    }
  }, [isSpeaking, speak, stopSpeaking, setOrbState, addMessage, logTimeline, setObjective, addMemory, addTodo, executeTool, messages]);

  const activate = useCallback(async () => {
    if (active || connecting) return;
    setConnecting(true);

    try {
      // Check for Speech Recognition support
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SR) {
        toast.error("Speech Recognition not supported. Use Chrome or Edge.");
        setConnecting(false);
        return;
      }

      const recognition = new SR();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: any) => {
        const last = event.results[event.results.length - 1];
        if (last.isFinal) {
          const transcript = last[0].transcript.trim();
          if (transcript) {
            setListening(false);
            void handleUserInput(transcript);
          }
        }
      };

      recognition.onspeechstart = () => { setListening(true); setOrbState("listening"); };
      recognition.onspeechend = () => { if (orbStateRef.current === "listening") setOrbState("thinking"); };
      recognition.onerror = (e: any) => {
        if (e.error !== "no-speech") {
          toast.error(`Mic error: ${e.error}`);
          setOrbState("error");
          setTimeout(() => setOrbState("idle"), 1500);
        }
      };

      recognition.start();
      recognitionRef.current = recognition;

      setActive(true);
      setOrbState("idle");
      void setVoiceState.mutateAsync({ orbState: "idle", sessionActive: true }).catch(() => {});
      void logTimeline.mutateAsync({ kind: "completed", label: "Jarvis online", detail: "Voice session started" }).catch(() => {});
      toast.success("🤖 Jarvis is online — speak now!");

    } catch (err: any) {
      toast.error(err.message || "Failed to activate Jarvis");
    } finally {
      setConnecting(false);
    }
  }, [active, connecting, setOrbState, handleUserInput, logTimeline, setVoiceState]);

  const deactivate = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    synthRef.current?.cancel();
    setActive(false);
    setListening(false);
    setIsSpeaking(false);
    setOrbState("idle");
    void setVoiceState.mutateAsync({ orbState: "idle", sessionActive: false }).catch(() => {});
    void logTimeline.mutateAsync({ kind: "speech_interrupted", label: "Jarvis offline", detail: "Session ended" }).catch(() => {});
  }, [setOrbState, setVoiceState, logTimeline]);

  const handleTextSend = useCallback(async () => {
    if (!textInput.trim()) return;
    const text = textInput.trim();
    setTextInput("");
    await handleUserInput(text);
  }, [textInput, handleUserInput]);

  const handleClear = async () => {
    await clearMessages.mutateAsync({});
    void logTimeline.mutateAsync({ kind: "completed", label: "Conversation cleared" }).catch(() => {});
    toast.success("Conversation cleared");
  };

  // Mirror tab sync
  const heartbeatFresh = !!voiceState?.sessionActive && Date.now() - (voiceState?.updatedAt ?? 0) < 25000;
  const mirroring = !active && heartbeatFresh;
  const displayState: OrbState = active ? orbState : mirroring ? (voiceState?.orbState as OrbState ?? "idle") : "idle";

  return (
    <div className="jarvis-root relative flex h-[calc(100vh-7rem)] overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
      {/* Scene backdrop */}
      <div className="jarvis-scene absolute inset-0 pointer-events-none" />
      <div className="jarvis-scene-grid absolute inset-0 pointer-events-none" />

      {/* Layout: Left panel | Center */}
      <div className="relative z-10 flex h-full w-full flex-col lg:flex-row">
        {/* Left Panel */}
        <div className="w-full lg:w-72 flex-shrink-0 p-3 lg:p-4 border-b lg:border-b-0 lg:border-r border-white/5 flex flex-col min-h-0 hidden md:flex">
          <JarvisLeftPanel />
        </div>

        {/* Center — Orb + Transcript + Input */}
        <main className="jarvis-glass flex min-h-0 flex-1 flex-col items-center rounded-none px-6 pt-4 pb-4">
          {/* Header */}
          <div className="mb-4 flex items-center gap-3 w-full">
            <div className="flex items-baseline gap-2">
              <h1 className="mono text-[15px] font-semibold tracking-[0.4em] text-white/90">J A R V I S</h1>
              <span className="jarvis-label">MedFlow AI · Puter Powered</span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {active && (
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: "var(--jarvis-state-color)", boxShadow: "0 0 8px var(--jarvis-state-color)" }} />
                  <span className="mono text-[10px] tracking-[0.25em] text-white/40 uppercase">Online</span>
                </span>
              )}
              {mirroring && <span className="mono text-[10px] text-white/30 uppercase tracking-widest">Mirroring</span>}
              <button onClick={handleClear} className="mono rounded border border-white/10 px-2 py-1 text-[9.5px] tracking-[0.2em] text-white/30 uppercase transition hover:border-white/25 hover:text-white/60">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Orb */}
          <JarvisOrb
            state={displayState}
            getLevel={getLevel}
            active={active || mirroring}
            onActivate={activate}
            onDeactivate={deactivate}
            hosting={active}
            connecting={connecting}
          />

          {mirroring && (
            <p className="mono -mt-2 mb-2 text-[10px] tracking-[0.25em] text-white/30 uppercase">
              Session active in another window
            </p>
          )}

          {/* Transcript */}
          <div className="mt-2 flex min-h-0 flex-1 w-full max-w-2xl flex-col">
            <JarvisTranscript />
          </div>

          {/* Text input (always available as fallback) */}
          <div className="w-full max-w-2xl mt-3 flex gap-2">
            <input
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleTextSend(); }}
              placeholder={active ? "Type or speak..." : "Type to chat with Jarvis..."}
              className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white/80 placeholder:text-white/25 outline-none focus:border-cyan-400/40 backdrop-blur-xl transition-all"
            />
            <button
              onClick={handleTextSend}
              disabled={!textInput.trim()}
              className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2.5 text-cyan-200 text-sm transition hover:bg-cyan-400/20 disabled:opacity-40"
            >
              Send
            </button>
          </div>

          {active && (
            <div className="mt-2 flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${listening ? "bg-red-400 animate-pulse" : "bg-white/20"}`} />
              <span className="mono text-[10px] tracking-widest text-white/30 uppercase">
                {listening ? "Listening..." : isSpeaking ? "Speaking..." : "Ready"}
              </span>
              {isSpeaking && (
                <button onClick={stopSpeaking} className="mono ml-2 rounded border border-white/10 px-1.5 py-0.5 text-[9px] text-white/30 uppercase hover:text-red-300 hover:border-red-300/40 transition">
                  Stop
                </button>
              )}
            </div>
          )}
        </main>

        {/* Right Panel — Workspace, Services, & AI Tools Preview */}
        <div className="w-full lg:w-80 flex-shrink-0 p-3 lg:p-4 border-t lg:border-t-0 lg:border-l border-white/5 flex flex-col min-h-0">
          <JarvisRightPanel />
        </div>
      </div>
    </div>
  );
}
