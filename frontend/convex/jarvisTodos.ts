import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireUser } from "./lib";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const userId = (user as any)._id as string;
    const all = await ctx.db.query("jarvisTodos").withIndex("by_user", q => q.eq("userId", userId)).collect();
    const sorted = all.sort((a, b) => a.createdAt - b.createdAt);
    return {
      pending: sorted.filter(t => !t.done),
      done: sorted.filter(t => t.done).reverse().slice(0, 5),
    };
  },
});

export const add = mutation({
  args: {
    title: v.string(),
    priority: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
    dueAt: v.optional(v.number()),
  },
  handler: async (ctx, { title, priority, dueAt }) => {
    const user = await requireUser(ctx);
    const userId = (user as any)._id as string;
    return await ctx.db.insert("jarvisTodos", { userId, title, done: false, priority: priority ?? "medium", dueAt, createdAt: Date.now() });
  },
});

export const complete = mutation({
  args: { id: v.id("jarvisTodos") },
  handler: async (ctx, { id }) => {
    await requireUser(ctx);
    await ctx.db.patch(id, { done: true });
  },
});

export const remove = mutation({
  args: { id: v.id("jarvisTodos") },
  handler: async (ctx, { id }) => {
    await requireUser(ctx);
    await ctx.db.delete(id);
  },
});
