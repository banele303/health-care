import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireUser } from "./lib";

const DEFAULT_EMAILS = {
  unread: 3,
  lastSync: Date.now() - 5 * 60 * 1000,
  important: [
    { subject: "🚨 Urgent: Lab Results for Room 302", from: "Dr. Sarah Jenkins <s.jenkins@medflow.org>", priority: "high" },
    { subject: "Shift Handover Notes — ICU Ward B", from: "Nurse Mark Stevens <m.stevens@medflow.org>", priority: "medium" },
    { subject: "Pharmacy Supply Update: Insulin Glargine", from: "Pharmacy Dept <pharmacy@medflow.org>", priority: "normal" },
  ],
};

const DEFAULT_CALENDAR = {
  todayCount: 4,
  lastSync: Date.now() - 12 * 60 * 1000,
  nextMeeting: { title: "Patient Rounds — Cardiology Ward", start: new Date(Date.now() + 30 * 60 * 1000).toISOString() },
  upcoming: [
    { title: "Patient Rounds — Cardiology Ward", start: new Date(Date.now() + 30 * 60 * 1000).toISOString() },
    { title: "Surgical Consult w/ Dr. Miller", start: new Date(Date.now() + 2 * 3600 * 1000).toISOString() },
    { title: "Departmental Clinical Audit", start: new Date(Date.now() + 4 * 3600 * 1000).toISOString() },
    { title: "Patient Discharge Briefing: Alex South", start: new Date(Date.now() + 6 * 3600 * 1000).toISOString() },
  ],
};

const DEFAULT_NOTES = {
  lastSync: Date.now() - 25 * 60 * 1000,
  sources: ["Notion Clinical Workspace", "Hospital Knowledge Base"],
  recent: [
    { title: "Sepsis Protocol Guidelines 2026", url: "#" },
    { title: "Pediatric Dosage Adjustments Checklist", url: "#" },
    { title: "ICU Ventilator Maintenance Standard", url: "#" },
    { title: "Patient Discharge Protocol & Pharmacy Sync", url: "#" },
  ],
};

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const { identity, user } = await requireUser(ctx);
    const userId = (user?._id ?? identity.subject) as string;

    const rows = await ctx.db
      .query("jarvisDashboardCards")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const result: Record<string, { data: any; updatedAt: number }> = {
      emails: { data: DEFAULT_EMAILS, updatedAt: Date.now() },
      calendar: { data: DEFAULT_CALENDAR, updatedAt: Date.now() },
      notes: { data: DEFAULT_NOTES, updatedAt: Date.now() },
    };

    for (const r of rows) {
      result[r.cardKey] = { data: r.data, updatedAt: r.updatedAt };
    }

    return result;
  },
});

export const setCard = mutation({
  args: {
    cardKey: v.string(),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    const { identity, user } = await requireUser(ctx);
    const userId = (user?._id ?? identity.subject) as string;

    const existing = await ctx.db
      .query("jarvisDashboardCards")
      .withIndex("by_user_key", (q) => q.eq("userId", userId).eq("cardKey", args.cardKey))
      .first();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { data: args.data, updatedAt: now });
    } else {
      await ctx.db.insert("jarvisDashboardCards", {
        userId,
        cardKey: args.cardKey,
        data: args.data,
        updatedAt: now,
      });
    }
  },
});
