import { useState } from "react";
import { useQuery, useMutation, useAction } from "@/lib/convex";
import { api } from "@convex/_generated/api";
import { DoctorStudentScribe } from "./DoctorStudentScribe";
import {
  Mail,
  Calendar,
  FileText,
  Sparkles,
  RefreshCw,
  Send,
  Pill,
  Stethoscope,
  Play,
  GraduationCap,
  LayoutDashboard,
  Layers,
  Wrench,
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
  const initiateOAuthAction = useAction((api as any).composioActions.initiateOAuth);

  const [activeTab, setActiveTab] = useState<"workspace" | "services" | "tools" | "scribe">("workspace");
  const [briefingLoading, setBriefingLoading] = useState(false);
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

  const handleRunTool = async (toolName: string, defaultParams: any) => {
    setToolExecuting(true);
    try {
      const res = await executeTool.mutateAsync({ toolName, params: defaultParams });
      toast.success("⚡ Tool Executed", { description: res.message });
    } catch {
      toast.error("Tool execution failed.");
    } finally {
      setToolExecuting(false);
    }
  };

  const activeConnCount = connections.filter((c: any) => c.status === "connected").length;

  return (
    <aside className="jarvis-scroll flex h-full min-h-0 flex-col gap-2.5 overflow-y-auto pr-0.5">
      {/* Sleek Top Header Bar */}
      <div className="flex items-center justify-between rounded-xl border border-purple-500/20 bg-purple-950/20 p-2 backdrop-blur-md">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="relative flex h-2 w-2 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="mono text-[10.5px] font-semibold text-emerald-300 truncate">
            {activeConnCount} Live Services
          </span>
        </div>
        <button
          onClick={handleRunBriefing}
          disabled={briefingLoading}
          className="flex items-center gap-1 rounded-lg border border-purple-400/30 bg-purple-500/20 px-2 py-1 text-[10px] font-medium text-purple-100 hover:bg-purple-500/30 transition disabled:opacity-50 flex-shrink-0"
        >
          {briefingLoading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 text-purple-300" />}
          {briefingLoading ? "Briefing..." : "Briefing"}
        </button>
      </div>

      {/* Sleek Segmented Navigation Tabs */}
      <div className="grid grid-cols-4 rounded-xl border border-white/10 bg-white/[0.03] p-1 text-[10.5px] font-medium">
        <button
          onClick={() => setActiveTab("workspace")}
          className={`flex items-center justify-center gap-1 rounded-lg py-1 transition ${activeTab === "workspace" ? "bg-white/10 text-white shadow" : "text-white/40 hover:text-white/70"}`}
        >
          <LayoutDashboard className="h-3 w-3 text-sky-400" />
          <span className="hidden sm:inline">Dash</span>
        </button>
        <button
          onClick={() => setActiveTab("services")}
          className={`flex items-center justify-center gap-1 rounded-lg py-1 transition ${activeTab === "services" ? "bg-white/10 text-white shadow" : "text-white/40 hover:text-white/70"}`}
        >
          <Layers className="h-3 w-3 text-emerald-400" />
          <span className="hidden sm:inline">Services</span>
        </button>
        <button
          onClick={() => setActiveTab("tools")}
          className={`flex items-center justify-center gap-1 rounded-lg py-1 transition ${activeTab === "tools" ? "bg-white/10 text-white shadow" : "text-white/40 hover:text-white/70"}`}
        >
          <Wrench className="h-3 w-3 text-amber-400" />
          <span className="hidden sm:inline">Tools</span>
        </button>
        <button
          onClick={() => setActiveTab("scribe")}
          className={`flex items-center justify-center gap-1 rounded-lg py-1 transition ${activeTab === "scribe" ? "bg-purple-500/20 text-purple-200 border border-purple-400/30 shadow" : "text-purple-300/50 hover:text-purple-200"}`}
        >
          <GraduationCap className="h-3 w-3 text-purple-400" />
          <span className="hidden sm:inline">Scribe</span>
        </button>
      </div>

      {/* TAB 1: WORKSPACE DASHBOARD */}
      {activeTab === "workspace" && (
        <div className="space-y-2.5">
          {/* Emails */}
          <section className="jarvis-glass-card p-2.5">
            <div className="mb-1.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-sky-400" />
                <h4 className="jarvis-label text-[11px]">Gmail / Inbox</h4>
              </div>
              <span className="mono text-[9.5px] text-emerald-400 truncate">banelesouthflow@gmail.com</span>
            </div>
            {emails?.important?.length > 0 ? (
              <div className="space-y-1.5">
                {emails.important.map((e: any, i: number) => (
                  <div key={i} className="rounded-md border border-white/[0.05] bg-white/[0.02] p-1.5 text-[11px]">
                    <p className="font-medium text-white/80 truncate">{e.subject}</p>
                    <p className="text-[9.5px] text-white/40 truncate">{e.from}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10.5px] text-white/30 italic">No emails logged in CRM.</p>
            )}
          </section>

          {/* Calendar */}
          <section className="jarvis-glass-card p-2.5">
            <div className="mb-1.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-purple-400" />
                <h4 className="jarvis-label text-[11px]">Calendar & Rounds</h4>
              </div>
              <span className="mono text-[9.5px] text-white/30">{calendar?.todayCount ?? 0} scheduled</span>
            </div>
            <p className="text-[11px] text-white/70 font-medium truncate">{calendar?.nextMeeting?.title}</p>
            <p className="text-[9.5px] text-white/40 mt-0.5">{new Date(calendar?.nextMeeting?.start || Date.now()).toLocaleTimeString()}</p>
          </section>

          {/* Notion Clinical Notes */}
          <section className="jarvis-glass-card p-2.5">
            <div className="mb-1.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-emerald-400" />
                <h4 className="jarvis-label text-[11px]">Notion Workspace</h4>
              </div>
            </div>
            <div className="space-y-1">
              {notes?.recent?.map((n: any, idx: number) => (
                <div key={idx} className="text-[10.5px] text-white/70 truncate">
                  • {n.title}
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* TAB 2: CONNECTED SERVICES */}
      {activeTab === "services" && (
        <div className="space-y-2">
          {connections.map((c: any) => (
            <div key={c.toolkit} className="jarvis-glass-card p-2.5 flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`h-2 w-2 rounded-full flex-shrink-0 ${c.status === "connected" ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.5)]" : "bg-white/20"}`} />
                  <div className="min-w-0">
                    <p className="text-[11.5px] font-medium text-white/80 truncate">{c.name}</p>
                    <p className="text-[9.5px] text-white/35 truncate">{c.accountLabel}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleToggleConn(c.toolkit)}
                  className={`rounded-md px-2 py-0.5 text-[9.5px] font-medium transition flex-shrink-0 ${
                    c.status === "connected"
                      ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                      : "border border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {c.status === "connected" ? "Connected" : "Connect"}
                </button>
              </div>

              {/* Link Gmail Input */}
              {c.toolkit === "gmail" && (
                <div className="mt-1 pt-1.5 border-t border-white/5 flex gap-1">
                  <input
                    type="email"
                    defaultValue={c.accountLabel?.includes("@") ? c.accountLabel : "banelesouthflow@gmail.com"}
                    placeholder="Enter Gmail..."
                    id="gmail-input"
                    className="flex-1 rounded border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] text-white/80 outline-none focus:border-sky-400/40"
                  />
                  <button
                    onClick={async () => {
                      const input = (document.getElementById("gmail-input") as HTMLInputElement)?.value;
                      if (!input) return;
                      try {
                        await updateConnLabel.mutateAsync({ toolkit: "gmail", accountLabel: input });
                        toast.success("Gmail linked!", { description: `Connected to ${input}` });
                      } catch {
                        toast.error("Failed to link email.");
                      }
                    }}
                    className="rounded border border-sky-400/30 bg-sky-500/20 px-1.5 py-0.5 text-[9.5px] text-sky-200 transition hover:bg-sky-500/30"
                  >
                    Save
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: INTERACTIVE AI TOOLS */}
      {activeTab === "tools" && (
        <div className="space-y-2">
          <div className="jarvis-glass-card p-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Send className="h-3.5 w-3.5 text-sky-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[11.5px] font-medium text-white/80 truncate">AI Email Dispatcher</p>
                <p className="text-[9.5px] text-white/40 truncate">Send email & log to CRM</p>
              </div>
            </div>
            <button
              onClick={() => handleRunTool("send_email", { recipient: "banelesouthflow@gmail.com", subject: "Clinical Status Update", body: "Patient lab results reviewed." })}
              disabled={toolExecuting}
              className="rounded-md border border-sky-400/30 bg-sky-500/20 px-2 py-1 text-[9.5px] font-medium text-sky-200 hover:bg-sky-500/30 flex-shrink-0"
            >
              Dispatch
            </button>
          </div>

          <div className="jarvis-glass-card p-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Calendar className="h-3.5 w-3.5 text-purple-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[11.5px] font-medium text-white/80 truncate">Calendar Scheduler</p>
                <p className="text-[9.5px] text-white/40 truncate">Book patient appointments</p>
              </div>
            </div>
            <button
              onClick={() => handleRunTool("schedule_event", { patientName: "Banele Sibanda", phone: "+27 82 000 0000", notes: "Follow-up consultation" })}
              disabled={toolExecuting}
              className="rounded-md border border-purple-400/30 bg-purple-500/20 px-2 py-1 text-[9.5px] font-medium text-purple-200 hover:bg-purple-500/30 flex-shrink-0"
            >
              Schedule
            </button>
          </div>

          <div className="jarvis-glass-card p-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Pill className="h-3.5 w-3.5 text-rose-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[11.5px] font-medium text-white/80 truncate">Drug Interaction AI</p>
                <p className="text-[9.5px] text-white/40 truncate">Medication cross-reactivity</p>
              </div>
            </div>
            <button
              onClick={() => handleRunTool("drug_check", { drugs: "Warfarin + Aspirin" })}
              disabled={toolExecuting}
              className="rounded-md border border-rose-400/30 bg-rose-500/20 px-2 py-1 text-[9.5px] font-medium text-rose-200 hover:bg-rose-500/30 flex-shrink-0"
            >
              Check
            </button>
          </div>

          <div className="jarvis-glass-card p-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Stethoscope className="h-3.5 w-3.5 text-amber-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-[11.5px] font-medium text-white/80 truncate">Triage Evaluator</p>
                <p className="text-[9.5px] text-white/40 truncate">ESI urgency level rating</p>
              </div>
            </div>
            <button
              onClick={() => handleRunTool("triage_patient", { patientName: "Alex South", symptoms: "Severe chest pain radiating to left arm" })}
              disabled={toolExecuting}
              className="rounded-md border border-amber-400/30 bg-amber-500/20 px-2 py-1 text-[9.5px] font-medium text-amber-200 hover:bg-amber-500/30 flex-shrink-0"
            >
              Triage
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
