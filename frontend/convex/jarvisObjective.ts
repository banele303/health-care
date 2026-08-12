import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireUser } from "./lib";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const { identity, user } = await requireUser(ctx);
    const userId = (user?._id ?? identity.subject) as string;
    return await ctx.db.query("jarvisObjective").withIndex("by_user", q => q.eq("userId", userId)).first();
  },
});

export const set = mutation({
  args: { text: v.string(), state: v.string() },
  handler: async (ctx, { text, state }) => {
    const { identity, user } = await requireUser(ctx);
    const userId = (user?._id ?? identity.subject) as string;
    const existing = await ctx.db.query("jarvisObjective").withIndex("by_user", q => q.eq("userId", userId)).first();
    if (existing) {
      await ctx.db.patch(existing._id, { text, state });
    } else {
      await ctx.db.insert("jarvisObjective", { userId, text, state });
    }
  },
});

export const getProfile = query({
  args: {},
  handler: async (ctx) => {
    const { identity, user } = await requireUser(ctx);
    const userId = (user?._id ?? identity.subject) as string;
    return await ctx.db.query("jarvisProfiles").withIndex("by_user", q => q.eq("userId", userId)).first();
  },
});

export const upsertProfile = mutation({
  args: {
    displayName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    timezone: v.optional(v.string()),
    customInstructions: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { identity, user } = await requireUser(ctx);
    const userId = (user?._id ?? identity.subject) as string;
    const existing = await ctx.db.query("jarvisProfiles").withIndex("by_user", q => q.eq("userId", userId)).first();
    if (existing) {
      await ctx.db.patch(existing._id, args);
    } else {
      await ctx.db.insert("jarvisProfiles", { userId, ...args });
    }
  },
});
