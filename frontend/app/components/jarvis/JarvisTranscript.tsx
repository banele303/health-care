import { useQuery } from "@/lib/convex";
import { api } from "@convex/_generated/api";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef } from "react";

export function JarvisTranscript() {
  const msgsRes = useQuery(api.jarvisMessages.list, {});
  const messages = msgsRes?.data ?? [];
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="mono text-[11px] tracking-[0.2em] text-white/20 uppercase">
          Waiting for conversation…
        </p>
      </div>
    );
  }

  return (
    <div className="scroll-thin flex-1 space-y-3 overflow-y-auto px-2 py-3 [mask-image:linear-gradient(to_bottom,transparent,black_12%,black_88%,transparent)]">
      <AnimatePresence initial={false}>
        {messages.map((msg: any) => (
          <motion.div
            key={msg._id}
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed ${
                msg.role === "user"
                  ? "bg-white/[0.08] text-white/80 border border-white/10"
                  : "bg-cyan-500/10 text-cyan-100/90 border border-cyan-500/20"
              } ${!msg.final ? "opacity-70" : ""}`}
            >
              <span className="mono text-[9px] tracking-widest uppercase opacity-40 block mb-1">
                {msg.role === "user" ? "You" : "Jarvis"}
              </span>
              {msg.text}
              {!msg.final && <span className="ml-1 inline-block w-1 h-3 bg-current animate-pulse" />}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      <div ref={bottomRef} />
    </div>
  );
}
