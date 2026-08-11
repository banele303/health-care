import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireUser } from "./lib";

// ── Messages (transcript) ─────────────────────────────────────────────

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const userId = (user as any)._id as string;
    return await ctx.db
      .query("jarvisMessages")
      .withIndex("by_user", q => q.eq("userId", userId))
      .order("asc")
      .collect();
  },
});

export const upsertStreaming = mutation({
  args: { itemId: v.string(), role: v.union(v.literal("user"), v.literal("assistant")), text: v.string() },
  handler: async (ctx, { itemId, role, text }) => {
    const user = await requireUser(ctx);
    const userId = (user as any)._id as string;
    const existing = await ctx.db
      .query("jarvisMessages")
      .withIndex("by_user", q => q.eq("userId", userId))
      .filter(q => q.eq(q.field("itemId"), itemId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { text, final: false });
    } else {
      await ctx.db.insert("jarvisMessages", { userId, itemId, role, text, final: false });
    }
  },
});

export const finalize = mutation({
  args: {
    itemId: v.string(),
    role: v.union(v.literal("user"), v.literal("assistant")),
    text: v.string(),
    interrupted: v.optional(v.boolean()),
  },
  handler: async (ctx, { itemId, role, text, interrupted }) => {
    const user = await requireUser(ctx);
    const userId = (user as any)._id as string;
    const existing = await ctx.db
      .query("jarvisMessages")
      .withIndex("by_user", q => q.eq("userId", userId))
      .filter(q => q.eq(q.field("itemId"), itemId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { text, final: true, interrupted: interrupted ?? false });
    } else {
      await ctx.db.insert("jarvisMessages", { userId, itemId, role, text, final: true, interrupted: interrupted ?? false });
    }
  },
});

export const addMessage = mutation({
  args: { role: v.union(v.literal("user"), v.literal("assistant")), text: v.string() },
  handler: async (ctx, { role, text }) => {
    const user = await requireUser(ctx);
    const userId = (user as any)._id as string;
    return await ctx.db.insert("jarvisMessages", { userId, role, text, final: true });
  },
});

export const clearAll = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const userId = (user as any)._id as string;
    const msgs = await ctx.db.query("jarvisMessages").withIndex("by_user", q => q.eq("userId", userId)).collect();
    await Promise.all(msgs.map(m => ctx.db.delete(m._id)));
  },
});
