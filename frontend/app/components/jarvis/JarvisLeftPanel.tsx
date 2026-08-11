import { useQuery, useMutation } from "@/lib/convex";
import { api } from "@convex/_generated/api";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Activity, Target, SquareCheck, Mic, Crosshair, Sparkles, Wrench, Zap, ListChecks, MessageSquare, CircleStop, CircleCheck, TriangleAlert, Newspaper } from "lucide-react";
import { toast } from "sonner";

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 10) return "now";
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

const KIND_META: Record<string, { icon: React.ReactNode; color: string }> = {
  user_spoke:         { icon: <Mic className="h-3 w-3" />, color: "text-sky-300" },
  intent_detected:    { icon: <Crosshair className="h-3 w-3" />, color: "text-violet-300" },
  planning:           { icon: <Sparkles className="h-3 w-3" />, color: "text-violet-300" },
  executing:          { icon: <Zap className="h-3 w-3" />, color: "text-amber-300" },
  results:            { icon: <ListChecks className="h-3 w-3" />, color: "text-emerald-300" },
  response_generated: { icon: <MessageSquare className="h-3 w-3" />, color: "text-cyan-300" },
  speech_interrupted: { icon: <CircleStop className="h-3 w-3" />, color: "text-red-300" },
  completed:          { icon: <CircleCheck className="h-3 w-3" />, color: "text-emerald-300" },
  error:              { icon: <TriangleAlert className="h-3 w-3" />, color: "text-red-300" },
  memory_updated:     { icon: <Brain className="h-3 w-3" />, color: "text-fuchsia-300" },
  briefing:           { icon: <Newspaper className="h-3 w-3" />, color: "text-cyan-300" },
};

const CATEGORY_LABELS: Record<string, string> = {
  preference: "Preferences",
  project: "Projects",
  fact: "Facts",
  context: "Working Context",
  service: "Services",
};

export function JarvisLeftPanel() {
  const facts = useQuery(api.jarvisMemory.list, {}) ?? [];
  const events = useQuery(api.jarvisTimeline.list, {}) ?? [];
  const todos = useQuery(api.jarvisTodos.list, {});
  const objective = useQuery(api.jarvisObjective.get, {});
  const completeTodo = useMutation(api.jarvisTodos.complete);
  const removeTodo = useMutation(api.jarvisTodos.remove);

  const grouped = new Map<string, typeof facts>();
  for (const f of facts) {
    const list = grouped.get(f.category) ?? [];
    list.push(f);
    grouped.set(f.category, list);
  }

  return (
    <aside className="jarvis-scroll flex min-h-0 flex-col gap-3 overflow-y-auto pr-0.5">
      {/* Objective */}
      <section className="jarvis-glass-card relative overflow-hidden p-4">
        <div className="mb-1.5 flex items-center gap-2">
          <Target className="h-3.5 w-3.5 text-white/35" />
          <h3 className="jarvis-label">Objective</h3>
          {objective?.state === "working" && (
            <span className="ml-auto h-1.5 w-1.5 animate-ping rounded-full" style={{ background: "var(--jarvis-state-color)" }} />
          )}
        </div>
        <p className={`text-[15px] font-medium ${objective?.state === "working" ? "jarvis-shimmer" : "text-white/75"}`}>
          {objective?.text ?? "Standing by"}
        </p>
      </section>

      {/* Memory */}
      <section className="jarvis-glass-card flex max-h-[42%] min-h-[140px] flex-col p-3.5">
        <div className="mb-2.5 flex items-center gap-2">
          <Brain className="h-3.5 w-3.5 text-white/35" />
          <h3 className="jarvis-label">Memory</h3>
          <span className="mono ml-auto text-[10px] text-white/25">{facts.length} facts</span>
        </div>
        <div className="jarvis-scroll min-h-0 flex-1 space-y-3 overflow-y-auto">
          {facts.length === 0 && (
            <p className="text-[11.5px] text-white/25">Nothing yet. Tell Jarvis something to remember.</p>
          )}
          {[...grouped.entries()].map(([category, items]) => (
            <div key={category}>
              <p className="jarvis-label mb-1.5 !text-[9px] !text-white/25">{CATEGORY_LABELS[category] ?? category}</p>
              <AnimatePresence initial={false}>
                {items.map((f: any) => (
                  <motion.div
                    key={f._id}
                    layout
                    initial={{ opacity: 0, x: 16, filter: "blur(4px)" }}
                    animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.35 }}
                    className="mb-1.5 rounded-lg border border-white/[0.05] bg-white/[0.025] px-2.5 py-1.5"
                  >
                    <p className="text-[10.5px] tracking-wide text-white/35 capitalize">{f.key}</p>
                    <p className="text-[12.5px] text-white/80">{f.value}</p>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </section>

      {/* Todos */}
      <section className="jarvis-glass-card p-3.5">
        <div className="mb-2.5 flex items-center gap-2">
          <SquareCheck className="h-3.5 w-3.5 text-white/35" />
          <h3 className="jarvis-label">Todos</h3>
        </div>
        {todos && (todos.pending.length + todos.done.length > 0) ? (
          <div className="space-y-1.5">
            <AnimatePresence initial={false}>
              {todos.pending.slice(0, 6).map((t: any) => (
                <motion.div
                  key={t._id}
                  layout
                  initial={{ opacity: 0, x: -14 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 14 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center gap-2 text-[12.5px] group"
                >
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${t.priority === "high" ? "bg-red-400" : t.priority === "low" ? "bg-white/25" : "bg-cyan-300/70"}`} />
                  <span className="truncate flex-1 text-white/70">{t.title}</span>
                  <button onClick={() => completeTodo.mutate({ id: t._id })} className="opacity-0 group-hover:opacity-100 text-emerald-400/60 hover:text-emerald-400 transition-all text-[10px]">✓</button>
                  <button onClick={() => removeTodo.mutate({ id: t._id })} className="opacity-0 group-hover:opacity-100 text-red-400/60 hover:text-red-400 transition-all text-[10px]">✕</button>
                </motion.div>
              ))}
              {todos.done.slice(0, 2).map((t: any) => (
                <motion.div key={t._id} layout initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} className="flex items-center gap-2 text-[12.5px]">
                  <SquareCheck className="h-3 w-3 shrink-0 text-emerald-300" />
                  <span className="truncate line-through">{t.title}</span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <p className="text-[11.5px] text-white/25">Say "add a task" to Jarvis</p>
        )}
      </section>

      {/* Timeline */}
      <section className="jarvis-glass-card flex min-h-0 flex-1 flex-col p-3.5">
        <div className="mb-2.5 flex items-center gap-2">
          <Activity className="h-3.5 w-3.5 text-white/35" />
          <h3 className="jarvis-label">Activity</h3>
        </div>
        <div className="jarvis-scroll relative min-h-0 flex-1 overflow-y-auto [mask-image:linear-gradient(to_bottom,black_85%,transparent)]">
          <div className="absolute top-1 bottom-1 left-[7px] w-px bg-white/[0.07]" />
          <AnimatePresence initial={false}>
            {events.map((e: any) => {
              const meta = KIND_META[e.kind] ?? { icon: <Activity className="h-3 w-3" />, color: "text-white/40" };
              return (
                <motion.div
                  key={e._id}
                  layout
                  initial={{ opacity: 0, y: -12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="relative mb-2.5 flex gap-2.5 pl-0.5"
                >
                  <span className={`z-10 mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full ${meta.color}`}>
                    {meta.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <p className="text-[12px] font-medium text-white/75">{e.label}</p>
                      <span className="mono ml-auto shrink-0 text-[9.5px] text-white/25">{timeAgo(e.createdAt)}</span>
                    </div>
                    {e.detail && <p className="truncate text-[11px] text-white/35">{e.detail}</p>}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {events.length === 0 && <p className="text-[11.5px] text-white/25">No activity yet</p>}
        </div>
      </section>
    </aside>
  );
}
