import { ConvexError, v } from "convex/values";
import { query, mutation, internalMutation, internalQuery } from "./_generated/server";
import { requireUser, requireRole } from "./lib";

// ────────────────────────────────────────────────
// QUERIES
// ────────────────────────────────────────────────

export const listLeads = query({
  args: {
    status: v.optional(v.string()),
    priority: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    let q = ctx.db.query("crmLeads").order("desc");
    const all = await q.collect();
    let filtered = all;
    if (args.status) filtered = filtered.filter((l) => l.status === args.status);
    if (args.priority) filtered = filtered.filter((l) => l.priority === args.priority);
    return filtered;
  },
});

export const getLead = query({
  args: { leadId: v.id("crmLeads") },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    return await ctx.db.get(args.leadId);
  },
});

export const getCommunications = query({
  args: { leadId: v.string() },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    return await ctx.db
      .query("crmCommunications")
      .withIndex("by_lead", (q) => q.eq("leadId", args.leadId))
      .order("desc")
      .collect();
  },
});

export const getStats = query({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    const all = await ctx.db.query("crmLeads").collect();
    const comms = await ctx.db.query("crmCommunications").collect();
    return {
      total: all.length,
      leads: all.filter((l) => l.status === "lead").length,
      scheduled: all.filter((l) => l.status === "appointment_scheduled").length,
      followup: all.filter((l) => l.status === "followup_needed").length,
      inTreatment: all.filter((l) => l.status === "in_treatment").length,
      discharged: all.filter((l) => l.status === "discharged").length,
      aiEmailsSent: comms.filter((c) => c.aiGenerated).length,
      totalComms: comms.length,
    };
  },
});

// ────────────────────────────────────────────────
// MUTATIONS
// ────────────────────────────────────────────────

export const createLead = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    patientId: v.optional(v.string()),
    status: v.optional(v.string()),
    priority: v.optional(v.string()),
    notes: v.optional(v.string()),
    assignedStaffId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin", "doctor", "nurse"]);
    const now = Date.now();
    return await ctx.db.insert("crmLeads", {
      name: args.name,
      email: args.email,
      phone: args.phone,
      patientId: args.patientId,
      status: (args.status ?? "lead") as any,
      priority: (args.priority ?? "medium") as any,
      notes: args.notes,
      assignedStaffId: args.assignedStaffId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateLead = mutation({
  args: {
    leadId: v.id("crmLeads"),
    status: v.optional(v.string()),
    priority: v.optional(v.string()),
    notes: v.optional(v.string()),
    assignedStaffId: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin", "doctor", "nurse"]);
    const { leadId, ...fields } = args;
    const patch: any = { updatedAt: Date.now() };
    if (fields.status !== undefined) patch.status = fields.status;
    if (fields.priority !== undefined) patch.priority = fields.priority;
    if (fields.notes !== undefined) patch.notes = fields.notes;
    if (fields.assignedStaffId !== undefined) patch.assignedStaffId = fields.assignedStaffId;
    if (fields.phone !== undefined) patch.phone = fields.phone;
    await ctx.db.patch(leadId, patch);
  },
});

export const deleteLead = mutation({
  args: { leadId: v.id("crmLeads") },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    await ctx.db.delete(args.leadId);
  },
});

export const logCommunication = mutation({
  args: {
    leadId: v.string(),
    subject: v.string(),
    body: v.string(),
    type: v.union(v.literal("email"), v.literal("call_note"), v.literal("sms")),
    aiGenerated: v.boolean(),
    tone: v.optional(v.string()),
    senderId: v.string(),
    senderName: v.optional(v.string()),
    recipientEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin", "doctor", "nurse"]);
    return await ctx.db.insert("crmCommunications", {
      leadId: args.leadId,
      subject: args.subject,
      body: args.body,
      type: args.type,
      aiGenerated: args.aiGenerated,
      tone: args.tone,
      senderId: args.senderId,
      senderName: args.senderName,
      recipientEmail: args.recipientEmail,
      createdAt: Date.now(),
    });
  },
});
