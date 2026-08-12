import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireUser } from "./lib";

export const runBriefing = mutation({
  args: {},
  handler: async (ctx) => {
    const { identity, user } = await requireUser(ctx);
    const userId = (user?._id ?? identity.subject) as string;

    const now = Date.now();

    // Query real DB tables
    const leads = await ctx.db.query("crmLeads").collect();
    const labs = await ctx.db.query("labResults").collect();
    const invoices = await ctx.db.query("invoices").collect();
    const todos = await ctx.db
      .query("jarvisTodos")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const pendingLabs = labs.filter(l => l.status === "pending" || l.status === "analyzed").length;
    const scheduledLeads = leads.filter(l => l.status === "appointment_scheduled").length;
    const pendingInvoices = invoices.filter(i => i.status === "pending_payment").length;
    const pendingTasks = todos.filter(t => !t.done).length;

    const summaryText = `Daily Clinical Briefing: You have ${scheduledLeads} patient appointments scheduled, ${pendingLabs} lab results awaiting review, ${pendingInvoices} unpaid invoices, and ${pendingTasks} pending tasks in your workflow.`;

    // 1. Insert into timeline
    await ctx.db.insert("jarvisTimeline", {
      userId,
      kind: "briefing",
      label: "Daily Clinical Briefing",
      detail: summaryText,
      createdAt: now,
    });

    // 2. Insert into activity logs
    await ctx.db.insert("activityLogs", {
      user: user.name ?? "Staff",
      action: "Ran Daily Clinical Briefing",
      details: summaryText,
      createdAt: now,
    });

    // 3. Update current objective
    const objExisting = await ctx.db
      .query("jarvisObjective")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (objExisting) {
      await ctx.db.patch(objExisting._id, { text: "Delivered daily clinical briefing", state: "idle" });
    } else {
      await ctx.db.insert("jarvisObjective", {
        userId,
        text: "Delivered daily clinical briefing",
        state: "idle",
      });
    }

    return {
      success: true,
      summary: summaryText,
    };
  },
});
