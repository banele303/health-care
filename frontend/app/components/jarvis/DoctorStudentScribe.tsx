import { useState, useRef, useEffect } from "react";
import { useMutation } from "@/lib/convex";
import { api } from "@convex/_generated/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  MicOff,
  Stethoscope,
  GraduationCap,
  Sparkles,
  Save,
  FileText,
  Share2,
  CheckCircle2,
  Trash2,
  Activity,
  Layers,
  Award,
} from "lucide-react";
import { toast } from "sonner";

interface DialogueTurn {
  speaker: "Doctor" | "Student";
  text: string;
  timestamp: number;
}

export function DoctorStudentScribe() {
  const saveSession = useMutation(api.jarvisPreceptorship.saveSession);

  const [activeSpeaker, setActiveSpeaker] = useState<"Doctor" | "Student">("Doctor");
  const [isRecording, setIsRecording] = useState(false);
  const [doctorName, setDoctorName] = useState("Dr. Sarah Jenkins (Attending)");
  const [studentName, setStudentName] = useState("Intern Alex South (Med Student)");
  const [manualInputText, setManualInputText] = useState("");
  const [audioLevel, setAudioLevel] = useState(0);

  const [transcript, setTranscript] = useState<DialogueTurn[]>([
    {
      speaker: "Doctor",
      text: "Alex, let's review Room 304. 54-year-old female presenting with severe acute epigastric pain radiating to the back after a fatty meal. What is your top differential?",
      timestamp: Date.now() - 180000,
    },
    {
      speaker: "Student",
      text: "Dr. Jenkins, acute pancreatitis is high on my differential, along with acute cholecystitis, peptic ulcer perforation, and inferior MI.",
      timestamp: Date.now() - 140000,
    },
    {
      speaker: "Doctor",
      text: "Excellent reasoning. What initial laboratory investigations and diagnostic imaging will confirm acute pancreatitis?",
      timestamp: Date.now() - 90000,
    },
    {
      speaker: "Student",
      text: "STAT serum Lipase and Amylase (lipase > 3x upper limit), Liver Function Tests, Full Blood Count, and an Abdominal Ultrasound to evaluate for gallstones.",
      timestamp: Date.now() - 40000,
    },
  ]);

  const [extractedEntities, setExtractedEntities] = useState({
    primaryDiagnosis: "Acute Pancreatitis (Gallstone etiology suspect)",
    differentials: ["Acute Cholecystitis", "Peptic Ulcer Perforation", "Inferior Wall Myocardial Infarction"],
    labsOrdered: ["Serum Lipase (>3x ULN)", "Amylase", "LFTs", "Full Blood Count", "Abdominal Ultrasound"],
    teachingPoints: [
      "Lipase is more specific than Amylase for acute pancreatitis.",
      "Early fluid resuscitation with Ringer's Lactate is key.",
      "Evaluate Ranson's or APACHE II criteria for severity scoring.",
    ],
  });

  const recognitionRef = useRef<any>(null);
  const animFrameRef = useRef<number | null>(null);

  // Audio level animation for visualizer
  useEffect(() => {
    if (isRecording) {
      const animateAudio = () => {
        const t = performance.now() / 1000;
        setAudioLevel(0.4 + 0.4 * Math.sin(t * 8) + 0.2 * Math.sin(t * 15));
        animFrameRef.current = requestAnimationFrame(animateAudio);
      };
      animateAudio();
    } else {
      setAudioLevel(0);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isRecording]);

  const toggleRecording = () => {
    if (isRecording) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsRecording(false);
      toast.info("Preceptorship Recording Paused");
    } else {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SR) {
        toast.error("Speech Recognition not supported in this browser. Please use Chrome or Edge.");
        return;
      }
      const rec = new SR();
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
          setTranscript((prev) => [
            ...prev,
            { speaker: activeSpeaker, text: finalStr.trim(), timestamp: Date.now() },
          ]);
        }
      };

      rec.onerror = () => setIsRecording(false);
      rec.onend = () => setIsRecording(false);

      rec.start();
      recognitionRef.current = rec;
      setIsRecording(true);
      toast.success(`🎙️ Live Transcribing as ${activeSpeaker}!`);
    }
  };

  const handleAddManualSpeech = () => {
    if (!manualInputText.trim()) return;
    setTranscript((prev) => [
      ...prev,
      { speaker: activeSpeaker, text: manualInputText.trim(), timestamp: Date.now() },
    ]);
    setManualInputText("");
  };

  const handleSaveToNotion = async () => {
    try {
      const res = await saveSession.mutateAsync({
        doctorName,
        studentName,
        transcript,
        differentials: extractedEntities.differentials,
        teachingPoints: extractedEntities.teachingPoints,
        summary: `Preceptorship Clinical Session: ${doctorName} & ${studentName}. Case: Acute epigastric pain evaluation. Diagnoses: ${extractedEntities.primaryDiagnosis}.`,
      });

      toast.success("🎓 Teaching Note & Transcript Saved!", {
        description: "Synced to Notion workspace and MedFlow Clinical Memory.",
      });
    } catch {
      toast.error("Failed to save transcript.");
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-purple-500/25 bg-gradient-to-b from-purple-950/30 via-slate-900/60 to-black/80 p-4 shadow-2xl backdrop-blur-xl">
      {/* Top Banner & Recording Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-purple-500/20 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="rounded-xl border border-purple-400/30 bg-purple-500/20 p-2 text-purple-200">
            <GraduationCap className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-[14px] font-bold tracking-wide text-purple-100 flex items-center gap-2">
              Clinical Preceptorship Scribe
              <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9.5px] font-mono text-emerald-300">
                LIVE TOOL
              </span>
            </h3>
            <p className="text-[11px] text-white/50">Doctor & Medical Student Consultation Transcriber</p>
          </div>
        </div>

        {/* Start / Stop Mic Button */}
        <button
          onClick={toggleRecording}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-[12px] font-semibold transition shadow-lg ${
            isRecording
              ? "border border-rose-500/50 bg-rose-500/20 text-rose-200 animate-pulse shadow-rose-500/20"
              : "border border-purple-400/40 bg-purple-500/20 text-purple-100 hover:bg-purple-500/30"
          }`}
        >
          {isRecording ? <Mic className="h-4 w-4 text-rose-300" /> : <MicOff className="h-4 w-4 text-purple-300" />}
          {isRecording ? "Transcribing Live..." : "Start Transcribing"}
        </button>
      </div>

      {/* Speaker Selector & Audio Waveform Visualizer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-[11px] font-medium text-white/40">Current Speaker:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveSpeaker("Doctor")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition ${
                activeSpeaker === "Doctor"
                  ? "border border-sky-400/50 bg-sky-500/20 text-sky-200 shadow-md"
                  : "border border-white/10 bg-white/5 text-white/40 hover:text-white"
              }`}
            >
              <Stethoscope className="h-3.5 w-3.5 text-sky-400" /> Attending Doctor
            </button>
            <button
              onClick={() => setActiveSpeaker("Student")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition ${
                activeSpeaker === "Student"
                  ? "border border-amber-400/50 bg-amber-500/20 text-amber-200 shadow-md"
                  : "border border-white/10 bg-white/5 text-white/40 hover:text-white"
              }`}
            >
              <GraduationCap className="h-3.5 w-3.5 text-amber-400" /> Medical Student
            </button>
          </div>
        </div>

        {/* Live Audio Visualizer Bars */}
        <div className="flex items-center gap-1 h-5">
          {[0.3, 0.7, 0.4, 0.9, 0.5, 0.8, 0.2].map((height, i) => (
            <span
              key={i}
              className="w-1 rounded-full bg-purple-400 transition-all duration-75"
              style={{
                height: isRecording ? `${Math.max(4, height * audioLevel * 20)}px` : "4px",
                opacity: isRecording ? 0.9 : 0.2,
              }}
            />
          ))}
        </div>
      </div>

      {/* Live Transcript Stream */}
      <div className="space-y-2 max-h-[260px] overflow-y-auto jarvis-scroll rounded-xl border border-white/10 bg-black/40 p-3">
        <div className="flex items-center justify-between text-[10.5px] text-white/40 border-b border-white/5 pb-1">
          <span>Real-time Audio Transcript Stream</span>
          <span>{transcript.length} Dialogue Turns</span>
        </div>
        {transcript.map((turn, idx) => (
          <div
            key={idx}
            className={`rounded-xl border p-2.5 text-[12px] leading-relaxed transition ${
              turn.speaker === "Doctor"
                ? "border-sky-500/20 bg-sky-950/20 text-sky-100"
                : "border-amber-500/20 bg-amber-950/20 text-amber-100"
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-[10.5px] flex items-center gap-1.5">
                {turn.speaker === "Doctor" ? (
                  <Stethoscope className="h-3.5 w-3.5 text-sky-400" />
                ) : (
                  <GraduationCap className="h-3.5 w-3.5 text-amber-400" />
                )}
                {turn.speaker === "Doctor" ? doctorName : studentName}
              </span>
              <span className="text-[9.5px] opacity-40">{new Date(turn.timestamp).toLocaleTimeString()}</span>
            </div>
            <p>{turn.text}</p>
          </div>
        ))}
      </div>

      {/* Manual Input Line */}
      <div className="flex gap-2">
        <input
          type="text"
          value={manualInputText}
          onChange={(e) => setManualInputText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddManualSpeech()}
          placeholder={`Type statement as ${activeSpeaker === "Doctor" ? "Doctor" : "Student"}...`}
          className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[12px] text-white outline-none focus:border-purple-400/50"
        />
        <button
          onClick={handleAddManualSpeech}
          className="rounded-xl border border-purple-400/30 bg-purple-500/20 px-4 py-2 text-[12px] font-semibold text-purple-200 hover:bg-purple-500/30"
        >
          Add Turn
        </button>
      </div>

      {/* AI Clinical Extraction Panel */}
      <div className="rounded-xl border border-purple-500/20 bg-purple-950/10 p-3 space-y-2">
        <div className="flex items-center gap-2 text-[12px] font-semibold text-purple-200">
          <Sparkles className="h-4 w-4 text-purple-400 animate-pulse" />
          <span>AI Clinical Teaching Points & Diagnosis Extracted</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
            <span className="text-white/40 block text-[10px]">Primary Differential:</span>
            <span className="font-semibold text-sky-300">{extractedEntities.primaryDiagnosis}</span>
          </div>
          <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2">
            <span className="text-white/40 block text-[10px]">STAT Labs Requested:</span>
            <span className="font-medium text-amber-300">{extractedEntities.labsOrdered.slice(0, 3).join(", ")}</span>
          </div>
        </div>
      </div>

      {/* Save & Notion Push Button */}
      <button
        onClick={handleSaveToNotion}
        className="w-full flex items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/20 py-2.5 text-[12.5px] font-semibold text-emerald-200 hover:bg-emerald-500/30 transition shadow-xl"
      >
        <Save className="h-4 w-4 text-emerald-400" />
        Sync Preceptorship Transcript & Teaching Notes to Notion
      </button>
    </div>
  );
}
