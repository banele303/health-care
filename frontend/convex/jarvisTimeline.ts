import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireUser } from "./lib";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const userId = (user as any)._id as string;
    const events = await ctx.db
      .query("jarvisTimeline")
      .withIndex("by_user", q => q.eq("userId", userId))
      .order("desc")
      .collect();
    return events.slice(0, 40);
  },
});

export const log = mutation({
  args: { kind: v.string(), label: v.string(), detail: v.optional(v.string()) },
  handler: async (ctx, { kind, label, detail }) => {
    const user = await requireUser(ctx);
    const userId = (user as any)._id as string;
    return await ctx.db.insert("jarvisTimeline", { userId, kind, label, detail, createdAt: Date.now() });
  },
});

export const clearAll = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const userId = (user as any)._id as string;
    const all = await ctx.db.query("jarvisTimeline").withIndex("by_user", q => q.eq("userId", userId)).collect();
    await Promise.all(all.map(e => ctx.db.delete(e._id)));
  },
});
