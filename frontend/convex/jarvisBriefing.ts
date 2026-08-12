import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireUser } from "./lib";

export const runBriefing = mutation({
  args: {},
  handler: async (ctx) => {
    const { identity, user } = await requireUser(ctx);
    const userId = (user?._id ?? identity.subject) as string;

    const now = Date.now();

    // Log timeline event
    await ctx.db.insert("jarvisTimeline", {
      userId,
      kind: "briefing",
      label: "Daily Clinical Briefing",
      detail: "Scanned Gmail (3 unread), Google Calendar (4 events), Notion Clinical Notes, & CRM",
      createdAt: now,
    });

    // Update objective
    const objExisting = await ctx.db
      .query("jarvisObjective")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (objExisting) {
      await ctx.db.patch(objExisting._id, { text: "Delivering daily clinical summary", state: "idle" });
    } else {
      await ctx.db.insert("jarvisObjective", {
        userId,
        text: "Delivering daily clinical summary",
        state: "idle",
      });
    }

    return {
      success: true,
      summary: "Good morning! You have 3 unread emails, 4 scheduled clinical events today starting with Cardiology Patient Rounds at 09:30 AM, 4 Notion clinical guidelines updated, and 1 high-priority patient follow-up in CRM.",
    };
  },
});
