import { ConvexError, v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { requireUser, requireRole } from "./lib";
import { internal } from "./_generated/api";

// ─── Default channels seeder ───────────────────────────────────────────
export const seedDefaultChannels = mutation({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const existing = await ctx.db.query("channels").collect();
    if (existing.length > 0) return; // already seeded

    const defaults = [
      { name: "general", description: "Hospital-wide announcements and general chat", type: "general", icon: "🏥", color: "#6366f1" },
      { name: "emergency", description: "🚨 Emergency alerts and critical updates", type: "emergency", icon: "🚨", color: "#ef4444" },
      { name: "doctors-lounge", description: "Physicians only discussion", type: "department", icon: "🩺", color: "#10b981" },
      { name: "nursing-station", description: "Nursing team coordination", type: "department", icon: "💊", color: "#f59e0b" },
      { name: "lab-results", description: "Lab results and diagnostic discussions", type: "department", icon: "🧬", color: "#8b5cf6" },
      { name: "pharmacy", description: "Pharmacy team and medication queries", type: "department", icon: "💉", color: "#06b6d4" },
      { name: "ai-assistant", description: "Chat with the MedFlow AI Assistant", type: "ai_bot", icon: "🤖", color: "#a855f7" },
    ] as const;

    for (const ch of defaults) {
      await ctx.db.insert("channels", {
        name: ch.name,
        description: ch.description,
        type: ch.type as any,
        icon: ch.icon,
        color: ch.color,
        members: [userId],
        createdBy: userId,
        isPrivate: false,
        createdAt: Date.now(),
      });
    }
  },
});

// ─── List channels ─────────────────────────────────────────────────────
export const listChannels = query({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    return await ctx.db.query("channels").order("asc").collect();
  },
});

// ─── Create channel ────────────────────────────────────────────────────
export const createChannel = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    type: v.string(),
    icon: v.optional(v.string()),
    isPrivate: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const userId = (user as any)._id as string;

    // Check for duplicate name
    const existing = await ctx.db.query("channels").withIndex("by_name", q => q.eq("name", args.name)).first();
    if (existing) throw new ConvexError("A channel with that name already exists.");

    return await ctx.db.insert("channels", {
      name: args.name.toLowerCase().replace(/\s+/g, "-"),
      description: args.description,
      type: args.type as any,
      icon: args.icon ?? "💬",
      color: "#6366f1",
      members: [userId],
      createdBy: userId,
      isPrivate: args.isPrivate ?? false,
      createdAt: Date.now(),
    });
  },
});

// ─── Messages ─────────────────────────────────────────────────────────
export const listMessages = query({
  args: { channelId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { channelId, limit = 80 }) => {
    await requireUser(ctx);
    const msgs = await ctx.db
      .query("messages")
      .withIndex("by_channel_time", q => q.eq("channelId", channelId))
      .order("asc")
      .collect();
    return msgs.slice(-limit);
  },
});

export const sendMessage = mutation({
  args: {
    channelId: v.string(),
    content: v.string(),
    type: v.optional(v.string()),
    replyToId: v.optional(v.string()),
    senderName: v.string(),
    senderId: v.string(),
    senderRole: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    if (!args.content.trim()) throw new ConvexError("Message cannot be empty.");

    return await ctx.db.insert("messages", {
      channelId: args.channelId,
      senderId: args.senderId,
      senderName: args.senderName,
      senderRole: args.senderRole,
      content: args.content,
      type: (args.type ?? "text") as any,
      replyToId: args.replyToId,
      reactions: [],
      isEdited: false,
      createdAt: Date.now(),
    });
  },
});

export const addReaction = mutation({
  args: {
    messageId: v.id("messages"),
    emoji: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, { messageId, emoji, userId }) => {
    await requireUser(ctx);
    const msg = await ctx.db.get(messageId);
    if (!msg) throw new ConvexError("Message not found.");

    const reactions = [...(msg.reactions ?? [])];
    const existingIdx = reactions.findIndex(r => r.emoji === emoji);

    if (existingIdx >= 0) {
      const r = reactions[existingIdx];
      if (r.userIds.includes(userId)) {
        // toggle off
        reactions[existingIdx] = { ...r, userIds: r.userIds.filter(id => id !== userId) };
        if (reactions[existingIdx].userIds.length === 0) reactions.splice(existingIdx, 1);
      } else {
        reactions[existingIdx] = { ...r, userIds: [...r.userIds, userId] };
      }
    } else {
      reactions.push({ emoji, userIds: [userId] });
    }

    await ctx.db.patch(messageId, { reactions });
  },
});

export const deleteMessage = mutation({
  args: { messageId: v.id("messages"), userId: v.string() },
  handler: async (ctx, { messageId, userId }) => {
    const user = await requireUser(ctx);
    const msg = await ctx.db.get(messageId);
    if (!msg) throw new ConvexError("Message not found.");
    // Only sender or admin can delete
    const userDoc = user as any;
    if (msg.senderId !== userId && userDoc.role !== "admin") {
      throw new ConvexError("Not authorized to delete this message.");
    }
    await ctx.db.delete(messageId);
  },
});

// ─── Presence ────────────────────────────────────────────────────────
export const setPresence = mutation({
  args: {
    userId: v.string(),
    status: v.union(v.literal("online"), v.literal("away"), v.literal("busy"), v.literal("offline")),
  },
  handler: async (ctx, { userId, status }) => {
    const existing = await ctx.db
      .query("presence")
      .withIndex("by_user", q => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { status, lastSeen: Date.now() });
    } else {
      await ctx.db.insert("presence", { userId, status, lastSeen: Date.now() });
    }
  },
});

export const listPresence = query({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    return await ctx.db.query("presence").collect();
  },
});

// ─── AI Agent Logs ───────────────────────────────────────────────────
export const logAgentRun = mutation({
  args: {
    agentId: v.string(),
    triggeredBy: v.string(),
    input: v.string(),
    output: v.optional(v.string()),
    status: v.union(v.literal("running"), v.literal("done"), v.literal("error")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("aiAgentLogs", {
      agentId: args.agentId,
      triggeredBy: args.triggeredBy,
      input: args.input,
      output: args.output,
      status: args.status,
      createdAt: Date.now(),
    });
  },
});

export const listAgentLogs = query({
  args: { agentId: v.optional(v.string()) },
  handler: async (ctx, { agentId }) => {
    await requireRole(ctx, ["admin", "doctor", "nurse"]);
    const all = await ctx.db.query("aiAgentLogs").order("desc").collect();
    return agentId ? all.filter(l => l.agentId === agentId) : all.slice(0, 50);
  },
});
