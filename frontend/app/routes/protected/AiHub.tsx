import { useState } from "react";
import { useMutation } from "@/lib/convex";
import { api } from "@convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Activity, AlertTriangle, Bot, Brain, ClipboardList, FileText,
  FlaskConical, HeartPulse, Loader2, MessageSquare, Package,
  Pill, Search, Shield, Sparkles, Stethoscope, TrendingUp, Users, Zap,
} from "lucide-react";

export function meta() {
  return [{ title: "AI Agents Hub — MedFlow" }];
}

// ─── Shared AI runner using Puter.js ─────────────────────────────────
async function runPuterAI(systemPrompt: string, userPrompt: string): Promise<string> {
  const puter = (window as any).puter;
  if (!puter) throw new Error("Puter.js not loaded. Please refresh.");
  const response = await puter.ai.chat(`${systemPrompt}\n\n${userPrompt}`, {
    model: "gpt-4o-mini",
  });
  return typeof response === "string"
    ? response
    : response?.message?.content ?? response?.text ?? "No response received.";
}

// ─── Agent Card Component ─────────────────────────────────────────────
interface AgentCardProps {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
  badgeColor?: string;
  gradient: string;
  fields: { id: string; label: string; placeholder: string; type?: string; textarea?: boolean }[];
  systemPrompt: string;
  buildUserPrompt: (values: Record<string, string>) => string;
}

function AgentCard({
  id, icon, title, description, badge, badgeColor, gradient, fields, systemPrompt, buildUserPrompt,
}: AgentCardProps) {
  const { data: session } = authClient.useSession();
  const logAgent = useMutation(api.messaging.logAgentRun);
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRun = async () => {
    const missing = fields.filter(f => !values[f.id]?.trim());
    if (missing.length) {
      toast.error(`Please fill in: ${missing.map(f => f.label).join(", ")}`);
      return;
    }
    setLoading(true);
    setResult("");
    const userPrompt = buildUserPrompt(values);

    try {
      // Log as running
      await logAgent.mutate({
        agentId: id,
        triggeredBy: session?.user?.id ?? "unknown",
        input: userPrompt,
        status: "running",
      });

      const output = await runPuterAI(systemPrompt, userPrompt);
      setResult(output);
      toast.success(`${title} completed ✅`);

      await logAgent.mutate({
        agentId: id,
        triggeredBy: session?.user?.id ?? "unknown",
        input: userPrompt,
        output,
        status: "done",
      });
    } catch (err: any) {
      toast.error(err.message || "Agent failed. Try again.");
      await logAgent.mutate({
        agentId: id,
        triggeredBy: session?.user?.id ?? "unknown",
        input: userPrompt,
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="card overflow-hidden group hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      <div className={`h-1.5 w-full bg-gradient-to-r ${gradient}`} />
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className={`h-11 w-11 rounded-xl flex items-center justify-center bg-gradient-to-br ${gradient} shadow-lg`}>
            <div className="text-white">{icon}</div>
          </div>
          {badge && (
            <Badge className={`text-[10px] ${badgeColor ?? "bg-violet-100 text-violet-700 border-violet-200"}`}>
              {badge}
            </Badge>
          )}
        </div>
        <CardTitle className="text-base mt-3">{title}</CardTitle>
        <CardDescription className="text-xs leading-relaxed">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {fields.map(f => (
          <div key={f.id} className="space-y-1">
            <Label className="text-xs">{f.label}</Label>
            {f.textarea ? (
              <textarea
                placeholder={f.placeholder}
                value={values[f.id] ?? ""}
                onChange={e => setValues(p => ({ ...p, [f.id]: e.target.value }))}
                className="w-full h-20 rounded-md border border-input bg-background px-3 py-2 text-xs resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            ) : (
              <Input
                type={f.type ?? "text"}
                placeholder={f.placeholder}
                value={values[f.id] ?? ""}
                onChange={e => setValues(p => ({ ...p, [f.id]: e.target.value }))}
                className="text-xs h-8"
              />
            )}
          </div>
        ))}

        <Button onClick={handleRun} disabled={loading} className={`w-full gap-2 text-sm bg-gradient-to-r ${gradient} hover:opacity-90 text-white border-0`}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? "Running Agent..." : "Run Agent"}
        </Button>

        {result && (
          <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Bot className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold text-primary">Agent Output</span>
            </div>
            <p className="text-xs leading-relaxed whitespace-pre-wrap text-foreground/90">{result}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── 10 Agents Configuration ──────────────────────────────────────────
const AGENTS: AgentCardProps[] = [
  {
    id: "vitals_monitor",
    icon: <HeartPulse className="h-5 w-5" />,
    title: "Patient Vitals Analyzer",
    description: "Analyzes patient vitals and calculates clinical deterioration risk using NEWS2 scoring. Flags urgent cases automatically.",
    badge: "🚨 Critical Alert",
    badgeColor: "bg-red-100 text-red-700 border-red-200",
    gradient: "from-red-500 to-rose-600",
    fields: [
      { id: "name", label: "Patient Name", placeholder: "John Doe" },
      { id: "hr", label: "Heart Rate (bpm)", placeholder: "88" },
      { id: "bp", label: "Blood Pressure (mmHg)", placeholder: "140/90" },
      { id: "spo2", label: "SpO2 (%)", placeholder: "94" },
      { id: "temp", label: "Temperature (°C)", placeholder: "38.2" },
      { id: "rr", label: "Respiratory Rate (breaths/min)", placeholder: "20" },
    ],
    systemPrompt: `You are an expert critical care physician. Analyze patient vitals using NEWS2 (National Early Warning Score 2) scoring. Provide: 1) NEWS2 score calculation, 2) Risk level (Low/Medium/High/Critical), 3) Clinical interpretation, 4) Recommended immediate actions, 5) Escalation protocol if needed. Be precise and use clinical language.`,
    buildUserPrompt: v => `Patient: ${v.name}\nHeart Rate: ${v.hr} bpm\nBlood Pressure: ${v.bp} mmHg\nSpO2: ${v.spo2}%\nTemperature: ${v.temp}°C\nRespiratory Rate: ${v.rr} breaths/min\n\nCalculate NEWS2, assess risk, and provide clinical recommendations.`,
  },
  {
    id: "discharge_summary",
    icon: <FileText className="h-5 w-5" />,
    title: "Discharge Summary Generator",
    description: "Automatically generates ICD-10 compliant discharge summaries with home care instructions and follow-up plans.",
    badge: "📝 ICD-10 Compliant",
    badgeColor: "bg-blue-100 text-blue-700 border-blue-200",
    gradient: "from-blue-500 to-cyan-600",
    fields: [
      { id: "patient", label: "Patient Name & Age", placeholder: "Jane Smith, 45F" },
      { id: "admission", label: "Admission Reason & Diagnosis", placeholder: "Admitted for chest pain. Diagnosed with NSTEMI." },
      { id: "treatment", label: "Treatment Provided", placeholder: "PCI, aspirin 100mg, atorvastatin 40mg..." },
      { id: "labs", label: "Key Lab Results", placeholder: "Troponin peak 2.4 ng/mL, eGFR 72..." },
      { id: "duration", label: "Length of Stay", placeholder: "5 days" },
    ],
    systemPrompt: `You are a hospital physician generating a formal discharge summary. Create a comprehensive, ICD-10 compliant document including: 1) Patient demographics, 2) Principal diagnosis with ICD-10 codes, 3) Secondary diagnoses, 4) Summary of hospital course, 5) Procedures performed, 6) Discharge medications, 7) Home care instructions, 8) Activity restrictions, 9) Diet recommendations, 10) Follow-up appointments, 11) Return to ED instructions. Use proper medical formatting.`,
    buildUserPrompt: v => `Patient: ${v.patient}\nAdmission Reason/Diagnosis: ${v.admission}\nTreatment: ${v.treatment}\nKey Labs: ${v.labs}\nLength of Stay: ${v.duration}\n\nGenerate a complete clinical discharge summary.`,
  },
  {
    id: "drug_interaction",
    icon: <Pill className="h-5 w-5" />,
    title: "Drug Interaction Checker",
    description: "Checks multi-drug interactions, contraindications, and suggests safer alternatives based on patient profile.",
    badge: "💊 Pharmacovigilance",
    badgeColor: "bg-amber-100 text-amber-700 border-amber-200",
    gradient: "from-amber-500 to-orange-600",
    fields: [
      { id: "medications", label: "Current Medications (comma-separated)", placeholder: "Warfarin 5mg, Aspirin 100mg, Metformin 500mg" },
      { id: "new_drug", label: "New Drug to Add", placeholder: "Ibuprofen 400mg" },
      { id: "conditions", label: "Patient Conditions", placeholder: "Atrial fibrillation, T2DM, CKD stage 3" },
      { id: "allergies", label: "Known Allergies", placeholder: "Penicillin, sulfonamides" },
    ],
    systemPrompt: `You are a clinical pharmacist expert. Analyze drug interactions and contraindications. Provide: 1) Severity rating for each interaction (None/Minor/Moderate/Major/Contraindicated), 2) Mechanism of interaction, 3) Clinical significance, 4) Patient monitoring requirements, 5) Alternative medications if contraindicated, 6) Dose adjustment recommendations. Always prioritize patient safety.`,
    buildUserPrompt: v => `Current Medications: ${v.medications}\nNew Drug Being Added: ${v.new_drug}\nPatient Conditions: ${v.conditions}\nAllergies: ${v.allergies}\n\nCheck all interactions and provide safety recommendations.`,
  },
  {
    id: "bed_allocation",
    icon: <TrendingUp className="h-5 w-5" />,
    title: "Bed Allocation Optimizer",
    description: "Predicts bed bottlenecks and optimizes ward placement based on patient acuity, department, and projected census.",
    badge: "🛏️ Predictive",
    badgeColor: "bg-emerald-100 text-emerald-700 border-emerald-200",
    gradient: "from-emerald-500 to-teal-600",
    fields: [
      { id: "total_beds", label: "Total Hospital Beds", placeholder: "250" },
      { id: "occupied", label: "Currently Occupied Beds", placeholder: "198" },
      { id: "incoming", label: "Expected Admissions (next 12h)", placeholder: "15 ED, 8 elective" },
      { id: "discharges", label: "Expected Discharges (next 12h)", placeholder: "12 patients" },
      { id: "icu_status", label: "ICU Status", placeholder: "14/20 occupied, 2 critical pending transfer" },
    ],
    systemPrompt: `You are a hospital bed management expert and operations analyst. Analyze hospital capacity and provide: 1) Current occupancy rate, 2) Projected occupancy in 6h and 12h, 3) Bottleneck risk assessment, 4) Recommended bed assignments by acuity, 5) Surge protocol activation threshold, 6) Specific ward reallocation recommendations, 7) Staff notification priorities. Be data-driven and operational.`,
    buildUserPrompt: v => `Total Beds: ${v.total_beds}\nCurrently Occupied: ${v.occupied}\nExpected Admissions: ${v.incoming}\nExpected Discharges: ${v.discharges}\nICU Status: ${v.icu_status}\n\nAnalyze capacity and optimize bed allocation.`,
  },
  {
    id: "medical_coding",
    icon: <ClipboardList className="h-5 w-5" />,
    title: "Medical Coding Assistant",
    description: "Converts clinical notes into ICD-10, CPT, and SNOMED-CT billing codes with pre-audit for revenue cycle optimization.",
    badge: "💰 Revenue Cycle",
    badgeColor: "bg-violet-100 text-violet-700 border-violet-200",
    gradient: "from-violet-500 to-purple-600",
    fields: [
      { id: "notes", label: "Clinical Notes / Encounter Summary", placeholder: "Patient presented with severe chest pain radiating to left arm...", textarea: true },
      { id: "procedures", label: "Procedures Performed", placeholder: "12-lead ECG, troponin levels, chest X-ray, cardiac catheterization" },
    ],
    systemPrompt: `You are a certified medical coder (CPC) with expertise in ICD-10-CM, CPT, and SNOMED-CT coding. From clinical notes, extract and provide: 1) Principal ICD-10-CM diagnosis code(s) with descriptions, 2) Secondary diagnosis codes, 3) CPT procedure codes with descriptions, 4) SNOMED-CT concepts for primary diagnosis, 5) Coding rationale, 6) Documentation deficiencies that could cause claim denial, 7) Revenue optimization suggestions. Format as a structured coding worksheet.`,
    buildUserPrompt: v => `Clinical Notes:\n${v.notes}\n\nProcedures: ${v.procedures}\n\nGenerate complete medical coding with ICD-10, CPT, and SNOMED-CT codes.`,
  },
  {
    id: "soap_notes",
    icon: <Stethoscope className="h-5 w-5" />,
    title: "SOAP Notes Generator",
    description: "Converts consultation bullet points into fully structured SOAP clinical notes for EHR documentation.",
    badge: "📋 EHR Ready",
    badgeColor: "bg-cyan-100 text-cyan-700 border-cyan-200",
    gradient: "from-cyan-500 to-sky-600",
    fields: [
      { id: "subjective", label: "Patient Complaints (Subjective)", placeholder: "Patient reports 3-day fever, dry cough, shortness of breath on exertion..." },
      { id: "objective", label: "Exam Findings & Vitals (Objective)", placeholder: "T 38.9°C, HR 98, SpO2 93%, bibasal crepitations on auscultation..." },
      { id: "context", label: "Medical History & Context", placeholder: "65yo male, smoker, hypertension, no recent travel..." },
    ],
    systemPrompt: `You are an experienced attending physician. Generate a complete, formal SOAP note for the given clinical information. Include: SUBJECTIVE (chief complaint, history of present illness, review of systems, medications, allergies), OBJECTIVE (vital signs, physical examination findings, lab/imaging results), ASSESSMENT (differential diagnosis with reasoning, primary diagnosis), PLAN (diagnostic orders, treatments, medications with doses, patient education, follow-up). Use proper medical terminology and professional clinical writing style.`,
    buildUserPrompt: v => `Subjective: ${v.subjective}\n\nObjective: ${v.objective}\n\nHistory/Context: ${v.context}\n\nGenerate a complete SOAP note.`,
  },
  {
    id: "followup_companion",
    icon: <MessageSquare className="h-5 w-5" />,
    title: "Post-Discharge Follow-up Planner",
    description: "Creates personalized post-discharge follow-up schedules, medication adherence reminders, and red-flag symptom alerts.",
    badge: "🏠 Remote Care",
    badgeColor: "bg-pink-100 text-pink-700 border-pink-200",
    gradient: "from-pink-500 to-rose-500",
    fields: [
      { id: "patient", label: "Patient Name & Diagnosis", placeholder: "Mary Jones, Post-op CABG" },
      { id: "discharge_date", label: "Discharge Date", placeholder: "2025-08-10" },
      { id: "medications", label: "Discharge Medications", placeholder: "Aspirin, Clopidogrel, Bisoprolol, Ramipril..." },
      { id: "restrictions", label: "Activity Restrictions", placeholder: "No driving for 4 weeks, no lifting >5kg..." },
    ],
    systemPrompt: `You are a post-discharge care coordinator nurse. Create a comprehensive follow-up plan including: 1) Week-by-week recovery milestones, 2) Medication schedule with timing and instructions, 3) Daily symptom monitoring checklist, 4) Red-flag symptoms requiring immediate ED return, 5) Scheduled follow-up appointments (GP, specialist, wound care), 6) Diet and lifestyle modifications, 7) Wound care instructions if applicable, 8) Contact information protocol. Make it patient-friendly and easy to understand.`,
    buildUserPrompt: v => `Patient: ${v.patient}\nDischarge Date: ${v.discharge_date}\nMedications: ${v.medications}\nRestrictions: ${v.restrictions}\n\nCreate comprehensive post-discharge follow-up plan.`,
  },
  {
    id: "inventory_agent",
    icon: <Package className="h-5 w-5" />,
    title: "Medical Inventory Optimizer",
    description: "Predicts stock depletion, flags expiring medications, and auto-drafts purchase orders before critical shortages.",
    badge: "📦 Supply Chain",
    badgeColor: "bg-orange-100 text-orange-700 border-orange-200",
    gradient: "from-orange-500 to-amber-600",
    fields: [
      { id: "items", label: "Current Stock Items (Name: Qty, Unit)", placeholder: "Amoxicillin 500mg: 50 boxes\nIV saline 0.9%: 120 bags\nGloves (L): 800 pairs", textarea: true },
      { id: "daily_usage", label: "Average Daily Usage", placeholder: "Amoxicillin: 5 boxes/day, IV Saline: 15 bags/day..." },
      { id: "lead_time", label: "Supplier Lead Time (days)", placeholder: "3-5 business days" },
    ],
    systemPrompt: `You are a hospital supply chain and inventory management specialist. Analyze stock levels and provide: 1) Days of supply remaining for each item, 2) Critical stock alerts (< 7 days supply), 3) Warning stock alerts (< 14 days supply), 4) Recommended order quantities with rationale, 5) Priority order list, 6) Draft purchase order with quantities, 7) Cost optimization suggestions, 8) Storage and rotation recommendations for near-expiry items.`,
    buildUserPrompt: v => `Current Stock:\n${v.items}\n\nDaily Usage: ${v.daily_usage}\nLead Time: ${v.lead_time}\n\nAnalyze inventory and generate purchase recommendations.`,
  },
  {
    id: "mdt_matcher",
    icon: <Users className="h-5 w-5" />,
    title: "MDT Case & Trial Matcher",
    description: "Identifies complex cases for Multi-Disciplinary Team review and matches eligible patients to active clinical trials.",
    badge: "🧬 Research",
    badgeColor: "bg-indigo-100 text-indigo-700 border-indigo-200",
    gradient: "from-indigo-500 to-blue-600",
    fields: [
      { id: "patient", label: "Patient Demographics", placeholder: "52F, non-smoker, ECOG 1" },
      { id: "diagnosis", label: "Primary Diagnosis", placeholder: "Stage III non-small cell lung carcinoma, EGFR mutation positive" },
      { id: "history", label: "Treatment History", placeholder: "No prior oncology treatment, completed staging CT and PET" },
      { id: "comorbidities", label: "Comorbidities", placeholder: "Type 2 diabetes, controlled hypertension, eGFR 65" },
    ],
    systemPrompt: `You are an oncologist and clinical research coordinator. Analyze the patient case and provide: 1) MDT referral recommendation with urgency, 2) Required specialist disciplines for MDT (oncology, radiology, pathology, etc.), 3) Clinical trial eligibility assessment based on common inclusion/exclusion criteria, 4) Suggested trial types (phase I/II/III, immunotherapy, targeted therapy), 5) Biomarker testing recommendations, 6) Staging and workup gaps to address before MDT, 7) Prognosis and treatment pathway overview.`,
    buildUserPrompt: v => `Patient: ${v.patient}\nDiagnosis: ${v.diagnosis}\nTreatment History: ${v.history}\nComorbidities: ${v.comorbidities}\n\nProvide MDT referral and clinical trial matching assessment.`,
  },
  {
    id: "compliance_auditor",
    icon: <Shield className="h-5 w-5" />,
    title: "Compliance & Anomaly Auditor",
    description: "Audits clinical workflows for HIPAA compliance, detects billing anomalies, access pattern risks, and regulatory gaps.",
    badge: "🛡️ Regulatory",
    badgeColor: "bg-gray-100 text-gray-700 border-gray-200",
    gradient: "from-gray-600 to-slate-700",
    fields: [
      { id: "scenario", label: "Audit Scenario Description", placeholder: "Staff member accessed 47 patient records in 2 hours without documented clinical justification...", textarea: true },
      { id: "role", label: "Staff Role Involved", placeholder: "Registered Nurse, Ward 3B" },
      { id: "regulations", label: "Applicable Regulations", placeholder: "HIPAA, POPIA, JCI Standards" },
    ],
    systemPrompt: `You are a healthcare compliance officer and HIPAA/POPIA expert. Analyze the audit scenario and provide: 1) Regulatory violation assessment with severity (Low/Medium/High/Critical), 2) Specific regulations violated with article references, 3) Immediate containment actions required, 4) Investigation steps to take, 5) Documentation requirements, 6) Corrective action plan, 7) Patient notification obligations if applicable, 8) Penalty exposure estimate, 9) System control improvements to prevent recurrence. Be precise and reference specific regulatory standards.`,
    buildUserPrompt: v => `Scenario: ${v.scenario}\nStaff Role: ${v.role}\nApplicable Regulations: ${v.regulations}\n\nConduct compliance audit and provide actionable recommendations.`,
  },
];

// ─── Main AI Hub Page ─────────────────────────────────────────────────
export default function AiHubPage() {
  const [search, setSearch] = useState("");

  const filteredAgents = AGENTS.filter(a =>
    a.title.toLowerCase().includes(search.toLowerCase()) ||
    a.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-900/50 via-blue-900/40 to-background border border-white/10 p-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-violet-600/20 via-transparent to-transparent" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center shadow-xl">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">MedFlow AI Agents Hub</h1>
              <p className="text-sm text-muted-foreground">10 autonomous clinical AI services powered by Puter AI</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            {["Clinical Intelligence", "Autonomous", "Real-time", "No API Keys"].map(tag => (
              <Badge key={tag} variant="outline" className="text-xs bg-white/5 border-white/20">{tag}</Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "AI Agents", value: "10", icon: Bot, color: "from-violet-500 to-purple-600" },
          { label: "Powered By", value: "Puter AI", icon: Zap, color: "from-blue-500 to-cyan-600" },
          { label: "API Keys Required", value: "Zero", icon: Shield, color: "from-emerald-500 to-teal-600" },
          { label: "Response Time", value: "< 3s", icon: Activity, color: "from-amber-500 to-orange-600" },
        ].map(s => (
          <Card key={s.label} className="card overflow-hidden">
            <div className={`h-1 w-full bg-gradient-to-r ${s.color}`} />
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-xl font-bold">{s.value}</p>
                </div>
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center bg-gradient-to-br ${s.color}`}>
                  <s.icon className="h-4 w-4 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search agents..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filteredAgents.map(agent => (
          <AgentCard key={agent.id} {...agent} />
        ))}
      </div>

      {filteredAgents.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Bot className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>No agents match your search.</p>
        </div>
      )}
    </div>
  );
}
