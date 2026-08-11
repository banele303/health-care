import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireUser } from "./lib";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const userId = (user as any)._id as string;
    return await ctx.db
      .query("jarvisMemory")
      .withIndex("by_user", q => q.eq("userId", userId))
      .collect();
  },
});

export const upsert = mutation({
  args: { key: v.string(), value: v.string(), category: v.string() },
  handler: async (ctx, { key, value, category }) => {
    const user = await requireUser(ctx);
    const userId = (user as any)._id as string;
    const existing = await ctx.db
      .query("jarvisMemory")
      .withIndex("by_user_key", q => q.eq("userId", userId).eq("key", key))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { value, category });
    } else {
      await ctx.db.insert("jarvisMemory", { userId, key, value, category });
    }
  },
});

export const remove = mutation({
  args: { id: v.id("jarvisMemory") },
  handler: async (ctx, { id }) => {
    await requireUser(ctx);
    await ctx.db.delete(id);
  },
});
