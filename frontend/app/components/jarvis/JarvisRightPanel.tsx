import { useState } from "react";
import { useQuery, useMutation } from "@/lib/convex";
import { api } from "@convex/_generated/api";
import { motion, AnimatePresence } from "framer-motion";
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
} from "lucide-react";
import { toast } from "sonner";

export function JarvisRightPanel() {
  const connectionsRes = useQuery(api.jarvisConnections.list, {});
  const connections = connectionsRes?.data ?? [];
  
  const dashboardRes = useQuery(api.jarvisDashboard.getAll, {});
  const dashboard: any = dashboardRes?.data ?? {};

  const runBriefing = useMutation(api.jarvisBriefing.runBriefing);
  const toggleConn = useMutation(api.jarvisConnections.toggleConnection);
  const executeTool = useMutation(api.jarvisTools.executeTool);

  const [activeTab, setActiveTab] = useState<"workspace" | "services" | "tools">("workspace");
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [toolInput, setToolInput] = useState("");
  const [toolExecuting, setToolExecuting] = useState(false);

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

  return (
    <aside className="jarvis-scroll flex min-h-0 flex-col gap-3 overflow-y-auto pl-0.5">
      {/* Executive Briefing Button */}
      <section className="jarvis-glass-card relative overflow-hidden p-3.5 bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-slate-900/50 border border-indigo-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-300 animate-pulse" />
            <h3 className="mono text-[12px] font-semibold tracking-wider text-purple-200 uppercase">Daily Clinical Briefing</h3>
          </div>
          <button
            onClick={handleRunBriefing}
            disabled={briefingLoading}
            className="flex items-center gap-1.5 rounded-lg border border-purple-400/30 bg-purple-500/20 px-3 py-1.5 text-[11px] font-medium text-purple-100 transition hover:bg-purple-500/30 disabled:opacity-50"
          >
            {briefingLoading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3 fill-current" />}
            {briefingLoading ? "Scanning..." : "Run Briefing"}
          </button>
        </div>
      </section>

      {/* Tabs */}
      <div className="flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
        <button
          onClick={() => setActiveTab("workspace")}
          className={`flex-1 rounded-lg py-1 text-[11px] font-medium transition ${activeTab === "workspace" ? "bg-white/10 text-white shadow" : "text-white/40 hover:text-white/70"}`}
        >
          Workspace
        </button>
        <button
          onClick={() => setActiveTab("services")}
          className={`flex-1 rounded-lg py-1 text-[11px] font-medium transition ${activeTab === "services" ? "bg-white/10 text-white shadow" : "text-white/40 hover:text-white/70"}`}
        >
          Services ({connections.filter((c: any) => c.status === "connected").length})
        </button>
        <button
          onClick={() => setActiveTab("tools")}
          className={`flex-1 rounded-lg py-1 text-[11px] font-medium transition ${activeTab === "tools" ? "bg-white/10 text-white shadow" : "text-white/40 hover:text-white/70"}`}
        >
          AI Tools
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
              <span className="mono text-[10px] text-white/30">{emails?.unread ?? 0} unread</span>
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
              <p className="text-[11px] text-white/30">Inbox clean. No unread emails.</p>
            )}
          </section>

          {/* Calendar */}
          <section className="jarvis-glass-card p-3.5">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-emerald-400" />
                <h4 className="jarvis-label">Google Calendar</h4>
              </div>
              <span className="mono text-[10px] text-white/30">{calendar?.todayCount ?? 0} today</span>
            </div>
            {calendar?.nextMeeting && (
              <div className="mb-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2 text-[11.5px]">
                <span className="mono text-[9px] uppercase text-emerald-300 font-bold block mb-0.5">Next Meeting</span>
                <p className="font-medium text-white/90 truncate">{calendar.nextMeeting.title}</p>
              </div>
            )}
            <div className="space-y-1">
              {(calendar?.upcoming ?? []).slice(0, 3).map((e: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-[11px] text-white/60">
                  <span className="truncate">{e.title}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Notion Notes */}
          <section className="jarvis-glass-card p-3.5">
            <div className="mb-2 flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-amber-400" />
              <h4 className="jarvis-label">Notion Clinical Notes</h4>
            </div>
            <div className="space-y-1.5">
              {(notes?.recent ?? []).map((n: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-[11.5px] text-white/70">
                  <span className="truncate">{n.title}</span>
                  <ExternalLink className="h-3 w-3 text-white/20 hover:text-white/60" />
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
            <div key={c.toolkit} className="jarvis-glass-card p-3 flex items-center justify-between">
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
          ))}
        </div>
      )}

      {/* TAB 3: INTERACTIVE AI TOOLS */}
      {activeTab === "tools" && (
        <div className="space-y-2.5">
          {/* Tool 1: Email Sender */}
          <div className="jarvis-glass-card p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-sky-400" />
                <div>
                  <h5 className="text-[12px] font-medium text-white/90">Gmail Email Dispatcher</h5>
                  <p className="text-[10px] text-white/40">Send clinical email to patient or doctor</p>
                </div>
              </div>
              <button
                onClick={() => handleRunTool("send_email", { recipient: "patient@medflow.org", subject: "Lab Results Follow-up" })}
                disabled={toolExecuting}
                className="rounded-lg border border-sky-400/30 bg-sky-500/20 px-2.5 py-1 text-[10.5px] text-sky-200 transition hover:bg-sky-500/30"
              >
                Execute
              </button>
            </div>
          </div>

          {/* Tool 2: Calendar Scheduler */}
          <div className="jarvis-glass-card p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-emerald-400" />
                <div>
                  <h5 className="text-[12px] font-medium text-white/90">Google Calendar Scheduler</h5>
                  <p className="text-[10px] text-white/40">Book rounds or patient consults</p>
                </div>
              </div>
              <button
                onClick={() => handleRunTool("schedule_event", { title: "Specialist Surgical Consultation" })}
                disabled={toolExecuting}
                className="rounded-lg border border-emerald-400/30 bg-emerald-500/20 px-2.5 py-1 text-[10.5px] text-emerald-200 transition hover:bg-emerald-500/30"
              >
                Execute
              </button>
            </div>
          </div>

          {/* Tool 3: Notion Clinical Notes */}
          <div className="jarvis-glass-card p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-amber-400" />
                <div>
                  <h5 className="text-[12px] font-medium text-white/90">Notion Clinical Note Sync</h5>
                  <p className="text-[10px] text-white/40">Save medical notes to Notion</p>
                </div>
              </div>
              <button
                onClick={() => handleRunTool("create_notion_note", { title: "Cardiology Patient Case Study" })}
                disabled={toolExecuting}
                className="rounded-lg border border-amber-400/30 bg-amber-500/20 px-2.5 py-1 text-[10.5px] text-amber-200 transition hover:bg-amber-500/30"
              >
                Execute
              </button>
            </div>
          </div>

          {/* Tool 4: Drug Interaction Checker */}
          <div className="jarvis-glass-card p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pill className="h-4 w-4 text-purple-400" />
                <div>
                  <h5 className="text-[12px] font-medium text-white/90">Drug Interaction Checker AI</h5>
                  <p className="text-[10px] text-white/40">Check contraindications for 2+ drugs</p>
                </div>
              </div>
              <button
                onClick={() => handleRunTool("drug_check", { drugs: "Warfarin + Aspirin" })}
                disabled={toolExecuting}
                className="rounded-lg border border-purple-400/30 bg-purple-500/20 px-2.5 py-1 text-[10.5px] text-purple-200 transition hover:bg-purple-500/30"
              >
                Analyze
              </button>
            </div>
          </div>

          {/* Tool 5: Patient Triage AI */}
          <div className="jarvis-glass-card p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-rose-400" />
                <div>
                  <h5 className="text-[12px] font-medium text-white/90">Patient Triage AI Evaluator</h5>
                  <p className="text-[10px] text-white/40">Calculate ESI triage score</p>
                </div>
              </div>
              <button
                onClick={() => handleRunTool("triage_patient", { patientName: "Alex South", symptoms: "Chest tightness" })}
                disabled={toolExecuting}
                className="rounded-lg border border-rose-400/30 bg-rose-500/20 px-2.5 py-1 text-[10.5px] text-rose-200 transition hover:bg-rose-500/30"
              >
                Evaluate
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
