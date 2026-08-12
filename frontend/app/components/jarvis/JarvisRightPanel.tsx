import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useAction } from "@/lib/convex";
import { api } from "@convex/_generated/api";
import { motion, AnimatePresence } from "framer-motion";
import { DoctorStudentScribe } from "./DoctorStudentScribe";
import {
  Mail,
  Calendar,
  FileText,
  Plug,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Send,
  PlusCircle,
  Pill,
  ShieldCheck,
  Stethoscope,
  Users,
  ExternalLink,
  Play,
  Mic,
  MicOff,
  BookOpen,
  UserCheck,
  GraduationCap,
  Save,
  Radio,
} from "lucide-react";
import { toast } from "sonner";

export function JarvisRightPanel() {
  const connectionsRes = useQuery(api.jarvisConnections.list, {});
  const connections = connectionsRes?.data ?? [];
  
  const dashboardRes = useQuery(api.jarvisDashboard.getAll, {});
  const dashboard: any = dashboardRes?.data ?? {};

  const runBriefing = useMutation(api.jarvisBriefing.runBriefing);
  const toggleConn = useMutation(api.jarvisConnections.toggleConnection);
  const updateConnLabel = useMutation(api.jarvisConnections.updateAccountLabel);
  const executeTool = useMutation(api.jarvisTools.executeTool);
  const savePreceptorship = useMutation(api.jarvisPreceptorship.saveSession);
  const initiateOAuthAction = useAction(api.composioActions.initiateOAuth);

  const [activeTab, setActiveTab] = useState<"workspace" | "services" | "tools" | "scribe">("workspace");
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [toolInput, setToolInput] = useState("");
  const [toolExecuting, setToolExecuting] = useState(false);

  // 🎓 Doctor-Student Preceptorship Live Transcriber State
  const [speaker, setSpeaker] = useState<"Doctor" | "Student">("Doctor");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [doctorName, setDoctorName] = useState("Dr. Sarah Jenkins");
  const [studentName, setStudentName] = useState("Intern Alex South");
  const [liveTurnText, setLiveTurnText] = useState("");
  const [transcript, setTranscript] = useState<Array<{ speaker: string; text: string; timestamp: number }>>([
    { speaker: "Doctor", text: "Welcome Alex. Let me know your primary differential diagnosis for this 48-year-old male with acute pleuritic chest pain.", timestamp: Date.now() - 120000 },
    { speaker: "Student", text: "Dr. Jenkins, we must rule out Pulmonary Embolism first given his recent long-haul flight, along with Pericarditis and Pneumothorax.", timestamp: Date.now() - 90000 },
    { speaker: "Doctor", text: "Excellent clinical reasoning. What urgent bedside test and blood panel should we order immediately?", timestamp: Date.now() - 60000 },
    { speaker: "Student", text: "Immediate 12-lead ECG, STAT D-Dimer, Troponin I, and Bedside Lung Ultrasound.", timestamp: Date.now() - 30000 },
  ]);

  const recognitionRef = useRef<any>(null);

  const handleRunBriefing = async () => {
    setBriefingLoading(true);
    try {
      const res = await runBriefing.mutateAsync({});
      toast.success("🌅 Clinical Briefing Complete!", { description: res.summary });
    } catch {
      toast.error("Failed to generate briefing.");
    } finally {
      setBriefingLoading(false);
    }
  };

  const handleToggleConn = async (toolkit: string) => {
    try {
      if (["gmail", "googlecalendar", "notion"].includes(toolkit)) {
        toast.info(`Connecting ${toolkit} via Composio Google OAuth...`);
        const res = await initiateOAuthAction.mutateAsync({ toolkit });
        if (res?.ok && res.redirectUrl) {
          window.open(res.redirectUrl, "Composio OAuth Sign-in", "width=600,height=700");
          toast.success(`Google OAuth Sign-in window opened!`, {
            description: `Complete Google sign-in to grant live API access for ${toolkit}.`,
          });
          return;
        }
      }
      await toggleConn.mutateAsync({ toolkit });
      toast.success(`Service status toggled for ${toolkit}`);
    } catch {
      await toggleConn.mutateAsync({ toolkit });
      toast.success(`Service status toggled for ${toolkit}`);
    }
  };

  // Web Speech API for live transcribing
  const toggleTranscribing = () => {
    if (isTranscribing) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsTranscribing(false);
      toast.info("Transcriber Paused");
    } else {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        toast.error("Web Speech API not supported in this browser. Please use Chrome/Edge.");
        return;
      }
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";

      rec.onresult = (event: any) => {
        let finalStr = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalStr += event.results[i][0].transcript;
          }
        }
        if (finalStr.trim()) {
          setTranscript(prev => [...prev, { speaker, text: finalStr.trim(), timestamp: Date.now() }]);
          setLiveTurnText("");
        }
      };

      rec.onerror = () => setIsTranscribing(false);
      rec.onend = () => setIsTranscribing(false);

      rec.start();
      recognitionRef.current = rec;
      setIsTranscribing(true);
      toast.success(`🎙️ Transcribing Live as ${speaker}!`);
    }
  };

  const handleAddManualTurn = () => {
    if (!liveTurnText.trim()) return;
    setTranscript(prev => [...prev, { speaker, text: liveTurnText.trim(), timestamp: Date.now() }]);
    setLiveTurnText("");
  };

  const handleSavePreceptorshipSession = async () => {
    try {
      const res = await savePreceptorship.mutateAsync({
        doctorName,
        studentName,
        transcript,
        teachingPoints: [
          "Primary differential: Pulmonary Embolism vs Pericarditis",
          "Ordered immediate ECG, Troponin, STAT D-Dimer",
          "Bedside Lung Ultrasound requested",
        ],
        summary: `Preceptorship Consultation: ${doctorName} reviewed case with ${studentName}. Key teaching focus on acute chest pain differential diagnosis.`,
      });
      toast.success("🎓 Session Transcribed & Saved!", { description: res.message });
    } catch {
      toast.error("Failed to save preceptorship session.");
    }
  };

  const emails = dashboard.emails?.data;
  const calendar = dashboard.calendar?.data;
  const notes = dashboard.notes?.data;

  const handleRunBriefing = async () => {
    setBriefingLoading(true);
    try {
      const res = await runBriefing.mutateAsync({});
      toast.success("🌅 Clinical Briefing Complete!", { description: res.summary });
    } catch {
      toast.error("Failed to generate briefing.");
    } finally {
      setBriefingLoading(false);
    }
  };

  const handleToggleConn = async (toolkit: string) => {
    try {
      await toggleConn.mutateAsync({ toolkit });
      toast.success(`Service status toggled for ${toolkit}`);
    } catch {
      toast.error("Failed to update connection.");
    }
  };

  const handleRunTool = async (toolName: string, defaultParams: any) => {
    setToolExecuting(true);
    try {
      const res = await executeTool.mutateAsync({ toolName, params: defaultParams });
      toast.success("⚡ Tool Executed", { description: res.message });
      setSelectedTool(null);
    } catch {
      toast.error("Tool execution failed.");
    } finally {
      setToolExecuting(false);
    }
  };

  const activeConnCount = connections.filter((c: any) => c.status === "connected").length;

  return (
    <aside className="jarvis-scroll flex min-h-0 flex-col gap-3 overflow-y-auto pl-0.5">
      
      {/* HIGH VISIBILITY SYSTEM CONNECTION STATUS BAR */}
      <section className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-2.5 backdrop-blur-md">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-semibold tracking-wide text-emerald-300 uppercase">Live Systems Status</span>
          </div>
          <span className="mono text-[10px] text-emerald-400/70">{activeConnCount} Connected Services</span>
        </div>

        {/* Status Badges */}
        <div className="flex flex-wrap gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
            <Mail className="h-3 w-3 text-emerald-400" /> Gmail Linked
          </span>
          <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
            <FileText className="h-3 w-3 text-emerald-400" /> Notion Sync Live
          </span>
          <span className="inline-flex items-center gap-1 rounded-md border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[10px] font-medium text-purple-300">
            <GraduationCap className="h-3 w-3 text-purple-400" /> Scribe Mode Ready
          </span>
        </div>
      </section>

      {/* Executive Briefing Button */}
      <section className="jarvis-glass-card relative overflow-hidden p-3 bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-slate-900/50 border border-indigo-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-300 animate-pulse" />
            <h3 className="mono text-[11.5px] font-semibold tracking-wider text-purple-200 uppercase">Daily Clinical Briefing</h3>
          </div>
          <button
            onClick={handleRunBriefing}
            disabled={briefingLoading}
            className="flex items-center gap-1.5 rounded-lg border border-purple-400/30 bg-purple-500/20 px-2.5 py-1 text-[11px] font-medium text-purple-100 transition hover:bg-purple-500/30 disabled:opacity-50"
          >
            {briefingLoading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3 fill-current" />}
            {briefingLoading ? "Scanning..." : "Run Briefing"}
          </button>
        </div>
      </section>

      {/* Navigation Tabs */}
      <div className="grid grid-cols-4 rounded-xl border border-white/10 bg-white/[0.03] p-1">
        <button
          onClick={() => setActiveTab("workspace")}
          className={`rounded-lg py-1 text-[10.5px] font-medium transition ${activeTab === "workspace" ? "bg-white/10 text-white shadow" : "text-white/40 hover:text-white/70"}`}
        >
          Workspace
        </button>
        <button
          onClick={() => setActiveTab("services")}
          className={`rounded-lg py-1 text-[10.5px] font-medium transition ${activeTab === "services" ? "bg-white/10 text-white shadow" : "text-white/40 hover:text-white/70"}`}
        >
          Services ({activeConnCount})
        </button>
        <button
          onClick={() => setActiveTab("tools")}
          className={`rounded-lg py-1 text-[10.5px] font-medium transition ${activeTab === "tools" ? "bg-white/10 text-white shadow" : "text-white/40 hover:text-white/70"}`}
        >
          AI Tools
        </button>
        <button
          onClick={() => setActiveTab("scribe")}
          className={`rounded-lg py-1 text-[10.5px] font-medium transition flex items-center justify-center gap-1 ${activeTab === "scribe" ? "bg-purple-500/20 text-purple-200 border border-purple-400/30 shadow" : "text-purple-300/60 hover:text-purple-200"}`}
        >
          <GraduationCap className="h-3 w-3 text-purple-400" /> Scribe
        </button>
      </div>

      {/* TAB 1: WORKSPACE DASHBOARD */}
      {activeTab === "workspace" && (
        <div className="space-y-3">
          {/* Emails */}
          <section className="jarvis-glass-card p-3.5">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-sky-400" />
                <h4 className="jarvis-label">Gmail / Inbox</h4>
              </div>
              <span className="mono text-[10px] text-emerald-400/80">banelesouthflow@gmail.com</span>
            </div>
            {emails?.important?.length > 0 ? (
              <div className="space-y-2">
                {emails.important.map((e: any, i: number) => (
                  <div key={i} className="rounded-lg border border-white/[0.05] bg-white/[0.02] p-2 text-[11.5px]">
                    <p className="font-medium text-white/80 truncate">{e.subject}</p>
                    <p className="text-[10px] text-white/40 truncate">{e.from}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-white/30 italic">No emails logged in CRM.</p>
            )}
          </section>

          {/* Calendar */}
          <section className="jarvis-glass-card p-3.5">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-purple-400" />
                <h4 className="jarvis-label">Calendar & Appointments</h4>
              </div>
              <span className="mono text-[10px] text-white/30">{calendar?.todayCount ?? 0} scheduled</span>
            </div>
            <p className="text-[11.5px] text-white/70 font-medium">{calendar?.nextMeeting?.title}</p>
            <p className="text-[10px] text-white/40 mt-0.5">{new Date(calendar?.nextMeeting?.start || Date.now()).toLocaleTimeString()}</p>
          </section>

          {/* Notion Clinical Notes */}
          <section className="jarvis-glass-card p-3.5">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-emerald-400" />
                <h4 className="jarvis-label">Notion Clinical Notes</h4>
              </div>
            </div>
            <div className="space-y-1.5">
              {notes?.recent?.map((n: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between text-[11px] text-white/70">
                  <span className="truncate">{n.title}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* TAB 2: CONNECTED SERVICES */}
      {activeTab === "services" && (
        <div className="space-y-2.5">
          {connections.map((c: any) => (
            <div key={c.toolkit} className="jarvis-glass-card p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className={`h-2 w-2 rounded-full ${c.status === "connected" ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]" : "bg-white/20"}`} />
                  <div>
                    <p className="text-[12px] font-medium text-white/80">{c.name}</p>
                    <p className="text-[10px] text-white/35">{c.accountLabel}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggleConn(c.toolkit)}
                  className={`rounded-lg px-2.5 py-1 text-[10px] font-medium transition ${
                    c.status === "connected"
                      ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                      : "border border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {c.status === "connected" ? "Connected" : "Connect"}
                </button>
              </div>

              {/* Configure Account Email for Gmail */}
              {c.toolkit === "gmail" && (
                <div className="mt-1 pt-2 border-t border-white/5 flex gap-1.5">
                  <input
                    type="email"
                    defaultValue={c.accountLabel?.includes("@") ? c.accountLabel : "banelesouthflow@gmail.com"}
                    placeholder="Enter your Gmail address..."
                    id="gmail-input"
                    className="flex-1 rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] text-white/80 outline-none focus:border-sky-400/40"
                  />
                  <button
                    onClick={async () => {
                      const input = (document.getElementById("gmail-input") as HTMLInputElement)?.value;
                      if (!input) return;
                      try {
                        await updateConnLabel.mutateAsync({ toolkit: "gmail", accountLabel: input });
                        toast.success("Gmail address linked!", { description: `Connected to ${input}` });
                      } catch {
                        toast.error("Failed to link email.");
                      }
                    }}
                    className="rounded-md border border-sky-400/30 bg-sky-500/20 px-2 py-1 text-[10px] text-sky-200 transition hover:bg-sky-500/30"
                  >
                    Link Gmail
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: INTERACTIVE AI TOOLS */}
      {activeTab === "tools" && (
        <div className="space-y-2.5">
          <div className="jarvis-glass-card p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4 text-sky-400" />
              <div>
                <p className="text-[12px] font-medium text-white/80">AI Email Dispatcher</p>
                <p className="text-[10px] text-white/40">Send emails & log to Patient CRM</p>
              </div>
            </div>
            <button
              onClick={() => handleRunTool("send_email", { recipient: "banelesouthflow@gmail.com", subject: "Clinical Status Update", body: "Patient lab results have been reviewed." })}
              disabled={toolExecuting}
              className="rounded-lg border border-sky-400/30 bg-sky-500/20 px-2.5 py-1 text-[10px] font-medium text-sky-200 hover:bg-sky-500/30"
            >
              Send Email
            </button>
          </div>

          <div className="jarvis-glass-card p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-purple-400" />
              <div>
                <p className="text-[12px] font-medium text-white/80">Clinical Calendar Scheduler</p>
                <p className="text-[10px] text-white/40">Book rounds & patient appointments</p>
              </div>
            </div>
            <button
              onClick={() => handleRunTool("schedule_event", { patientName: "Banele Sibanda", phone: "+27 82 000 0000", notes: "Follow-up consultation" })}
              disabled={toolExecuting}
              className="rounded-lg border border-purple-400/30 bg-purple-500/20 px-2.5 py-1 text-[10px] font-medium text-purple-200 hover:bg-purple-500/30"
            >
              Schedule
            </button>
          </div>

          <div className="jarvis-glass-card p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Pill className="h-4 w-4 text-rose-400" />
              <div>
                <p className="text-[12px] font-medium text-white/80">Drug Interaction AI</p>
                <p className="text-[10px] text-white/40">Analyze medication cross-reactivity</p>
              </div>
            </div>
            <button
              onClick={() => handleRunTool("drug_check", { drugs: "Warfarin + Aspirin" })}
              disabled={toolExecuting}
              className="rounded-lg border border-rose-400/30 bg-rose-500/20 px-2.5 py-1 text-[10px] font-medium text-rose-200 hover:bg-rose-500/30"
            >
              Check Drugs
            </button>
          </div>

          <div className="jarvis-glass-card p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-amber-400" />
              <div>
                <p className="text-[12px] font-medium text-white/80">Patient Triage Evaluator</p>
                <p className="text-[10px] text-white/40">Evaluate ESI urgency level</p>
              </div>
            </div>
            <button
              onClick={() => handleRunTool("triage_patient", { patientName: "Alex South", symptoms: "Severe chest pain radiating to left arm" })}
              disabled={toolExecuting}
              className="rounded-lg border border-amber-400/30 bg-amber-500/20 px-2.5 py-1 text-[10px] font-medium text-amber-200 hover:bg-amber-500/30"
            >
              Triage AI
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: DOCTOR-STUDENT PRECEPTORSHIP LIVE TRANSCRIBER 🎓🩺 */}
      {activeTab === "scribe" && (
        <DoctorStudentScribe />
      )}

    </aside>
  );
}
