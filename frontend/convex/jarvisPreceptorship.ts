import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireUser } from "./lib";

export const saveSession = mutation({
  args: {
    studentName: v.string(),
    doctorName: v.string(),
    transcript: v.array(
      v.object({
        speaker: v.string(), // "Doctor" | "Student"
        text: v.string(),
        timestamp: v.number(),
      })
    ),
    summary: v.optional(v.string()),
    teachingPoints: v.optional(v.array(v.string())),
    differentials: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { identity, user } = await requireUser(ctx);
    const userId = (user?._id ?? identity.subject) as string;
    const now = Date.now();

    const summaryText = args.summary || `Preceptorship session between ${args.doctorName} and ${args.studentName}. Total turns: ${args.transcript.length}.`;

    // 1. Save note to jarvisMemory for Notion sync
    await ctx.db.insert("jarvisMemory", {
      userId,
      category: "student_preceptorship",
      key: `Preceptorship: ${args.studentName} — ${new Date(now).toLocaleDateString()}`,
      value: summaryText,
    });

    // 2. Log timeline
    await ctx.db.insert("jarvisTimeline", {
      userId,
      kind: "results",
      label: `Preceptorship Transcribed: ${args.studentName}`,
      detail: summaryText.slice(0, 100),
      createdAt: now,
    });

    // 3. Log activity
    await ctx.db.insert("activityLogs", {
      user: user.name ?? args.doctorName,
      action: "Recorded Preceptorship Consultation",
      details: `Student: ${args.studentName} | Key Teaching Points: ${(args.teachingPoints || []).join(", ") || "Case review"}`,
      createdAt: now,
    });

    return { success: true, message: "Preceptorship consultation transcribed and saved to Notion workspace." };
  },
});

export const listSessions = query({
  args: {},
  handler: async (ctx) => {
    const { identity, user } = await requireUser(ctx);
    const userId = (user?._id ?? identity.subject) as string;

    const memories = await ctx.db
      .query("jarvisMemory")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    return memories.filter(m => m.category === "student_preceptorship");
  },
});
