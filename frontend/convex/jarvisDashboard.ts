import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireUser } from "./lib";

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const { identity, user } = await requireUser(ctx);
    const userId = (user?._id ?? identity.subject) as string;

    // 1. Fetch real communications from crmCommunications
    const comms = await ctx.db.query("crmCommunications").order("desc").collect();
    const emails = comms.filter(c => c.type === "email").slice(0, 5).map(c => ({
      subject: c.subject,
      from: c.senderName ?? c.recipientEmail ?? "Patient / Staff",
      body: c.body,
      createdAt: c.createdAt,
    }));

    // 2. Fetch real CRM leads with scheduled appointments
    const crmLeads = await ctx.db.query("crmLeads").collect();
    const scheduledAppointments = crmLeads.filter(l => l.status === "appointment_scheduled" || l.status === "in_treatment");
    const upcomingEvents = scheduledAppointments.slice(0, 5).map(l => ({
      title: `${l.name} (${l.status.replace("_", " ")})`,
      start: new Date(l.updatedAt).toISOString(),
    }));

    // 3. Fetch real lab results pending review
    const pendingLabs = await ctx.db.query("labResults").collect();
    const recentLabs = pendingLabs.slice(0, 4).map(l => ({
      title: `Lab: ${l.testType} — ${l.patient}`,
      status: l.status,
    }));

    // 4. Fetch real Jarvis memory clinical notes
    const memories = await ctx.db
      .query("jarvisMemory")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const clinicalNotes = memories.map(m => ({
      title: `${m.key}: ${m.value}`,
      category: m.category,
    })).slice(0, 5);

    return {
      emails: {
        data: {
          unread: emails.length,
          lastSync: Date.now(),
          important: emails.length > 0 ? emails : [
            { subject: "CRM Email System Ready", from: "MedFlow AI System", body: "Send emails via AI or CRM tab" }
          ],
        },
        updatedAt: Date.now(),
      },
      calendar: {
        data: {
          todayCount: scheduledAppointments.length,
          lastSync: Date.now(),
          nextMeeting: upcomingEvents[0] ?? { title: "No upcoming appointments scheduled", start: new Date().toISOString() },
          upcoming: upcomingEvents.length > 0 ? upcomingEvents : recentLabs,
        },
        updatedAt: Date.now(),
      },
      notes: {
        data: {
          lastSync: Date.now(),
          sources: ["Real Database Memory", "Convex Store"],
          recent: clinicalNotes.length > 0 ? clinicalNotes : [
            { title: "No stored notes yet — ask Jarvis to remember clinical notes" }
          ],
        },
        updatedAt: Date.now(),
      },
    };
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
