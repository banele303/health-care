import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireUser } from "./lib";

const DEFAULT_CONNECTIONS = [
  { toolkit: "gmail", name: "Gmail / Email", status: "connected", accountLabel: "hospital.staff@medflow.org", lastSync: Date.now() - 5 * 60 * 1000 },
  { toolkit: "googlecalendar", name: "Google Calendar", status: "connected", accountLabel: "dr.admin@medflow.org", lastSync: Date.now() - 12 * 60 * 1000 },
  { toolkit: "notion", name: "Notion Clinical Notes", status: "connected", accountLabel: "MedFlow Clinical Workspace", lastSync: Date.now() - 25 * 60 * 1000 },
  { toolkit: "composio", name: "Composio AI Tool Engine", status: "connected", accountLabel: "Active (20+ AI Tools)", lastSync: Date.now() - 2 * 60 * 1000 },
  { toolkit: "slack", name: "Hospital Slack / Staff Chat", status: "connected", accountLabel: "#hospital-announcements", lastSync: Date.now() - 10 * 60 * 1000 },
  { toolkit: "hospital_crm", name: "MedFlow Patient CRM", status: "connected", accountLabel: "Live Patient Sync", lastSync: Date.now() - 1 * 60 * 1000 },
] as const;

export const list = query({
  args: {},
  handler: async (ctx) => {
    const { identity, user } = await requireUser(ctx);
    const userId = (user?._id ?? identity.subject) as string;

    const rows = await ctx.db
      .query("jarvisConnections")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    if (rows.length === 0) {
      return DEFAULT_CONNECTIONS.map(c => ({ ...c, _id: c.toolkit }));
    }

    return rows;
  },
});

export const toggleConnection = mutation({
  args: { toolkit: v.string() },
  handler: async (ctx, { toolkit }) => {
    const { identity, user } = await requireUser(ctx);
    const userId = (user?._id ?? identity.subject) as string;

    const existing = await ctx.db
      .query("jarvisConnections")
      .withIndex("by_user_toolkit", (q) => q.eq("userId", userId).eq("toolkit", toolkit))
      .first();

    if (existing) {
      const nextStatus = existing.status === "connected" ? "available" : "connected";
      await ctx.db.patch(existing._id, { status: nextStatus, lastSync: Date.now() });
    } else {
      const def = DEFAULT_CONNECTIONS.find(c => c.toolkit === toolkit);
      await ctx.db.insert("jarvisConnections", {
        userId,
        toolkit,
        name: def?.name ?? toolkit,
        status: "connected",
        accountLabel: def?.accountLabel ?? "Connected",
        lastSync: Date.now(),
      });
    }
  },
});

export const updateAccountLabel = mutation({
  args: { toolkit: v.string(), accountLabel: v.string() },
  handler: async (ctx, { toolkit, accountLabel }) => {
    const { identity, user } = await requireUser(ctx);
    const userId = (user?._id ?? identity.subject) as string;

    const existing = await ctx.db
      .query("jarvisConnections")
      .withIndex("by_user_toolkit", (q) => q.eq("userId", userId).eq("toolkit", toolkit))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { accountLabel, status: "connected", lastSync: Date.now() });
    } else {
      await ctx.db.insert("jarvisConnections", {
        userId,
        toolkit,
        name: toolkit === "gmail" ? "Gmail / Email" : toolkit,
        status: "connected",
        accountLabel,
        lastSync: Date.now(),
      });
    }
  },
});
