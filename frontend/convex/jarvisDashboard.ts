import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireUser } from "./lib";

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    const { identity, user } = await requireUser(ctx);
    const userId = (user?._id ?? identity.subject) as string;

    // 1. Fetch user's Gmail connection configuration
    const gmailConn = await ctx.db
      .query("jarvisConnections")
      .withIndex("by_user_toolkit", (q) => q.eq("userId", userId).eq("toolkit", "gmail"))
      .first();

    const linkedGmailAddress = gmailConn?.accountLabel?.includes("@")
      ? gmailConn.accountLabel
      : "banelesouthflow@gmail.com";

    // 2. Fetch internal CRM communications
    const comms = await ctx.db.query("crmCommunications").order("desc").collect();
    const crmEmails = comms.filter(c => c.type === "email").map(c => ({
      subject: c.subject,
      from: c.senderName ?? c.recipientEmail ?? "Hospital Staff",
      recipient: c.recipientEmail,
      body: c.body,
      createdAt: c.createdAt,
      type: "hospital_crm",
    }));

    // 3. Construct distinct Gmail vs CRM inbox data
    const gmailData = {
      account: linkedGmailAddress,
      unreadCount: 0,
      status: gmailConn?.status ?? "connected",
      messages: [], // Live Gmail sync requires Composio OAuth grant
    };

    // 4. Fetch CRM leads and appointments
    const crmLeads = await ctx.db.query("crmLeads").collect();
    const scheduledAppointments = crmLeads.filter(l => l.status === "appointment_scheduled" || l.status === "in_treatment");
    const upcomingEvents = scheduledAppointments.slice(0, 5).map(l => ({
      title: `${l.name} (${l.status.replace("_", " ")})`,
      start: new Date(l.updatedAt).toISOString(),
    }));

    // 5. Fetch lab results
    const pendingLabs = await ctx.db.query("labResults").collect();
    const recentLabs = pendingLabs.slice(0, 4).map(l => ({
      title: `Lab: ${l.testType} — ${l.patient}`,
      status: l.status,
    }));

    // 6. Fetch memories
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
          gmailAccount: linkedGmailAddress,
          gmailUnread: 0,
          crmLoggedCount: crmEmails.length,
          important: crmEmails.slice(0, 5),
          lastSync: Date.now(),
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
          sources: ["Stored Clinical Memory", "Notion Workspace"],
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
