import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireUser } from "./lib";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const userId = (user as any)._id as string;
    return await ctx.db.query("jarvisVoiceState").withIndex("by_user", q => q.eq("userId", userId)).first();
  },
});

export const set = mutation({
  args: { orbState: v.string(), sessionActive: v.boolean() },
  handler: async (ctx, { orbState, sessionActive }) => {
    const user = await requireUser(ctx);
    const userId = (user as any)._id as string;
    const existing = await ctx.db.query("jarvisVoiceState").withIndex("by_user", q => q.eq("userId", userId)).first();
    if (existing) {
      await ctx.db.patch(existing._id, { orbState, sessionActive, updatedAt: Date.now() });
    } else {
      await ctx.db.insert("jarvisVoiceState", { userId, orbState, sessionActive, updatedAt: Date.now() });
    }
  },
});
