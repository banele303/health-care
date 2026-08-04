import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { requireUser } from "./lib";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireUser(ctx);
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("user", user._id))
      .order("desc")
      .take(20);

    const unreadCount = (
      await ctx.db
        .query("notifications")
        .withIndex("by_user", (q) => q.eq("user", user._id))
        .filter((q) => q.eq(q.field("isRead"), false))
        .collect()
    ).length;

    return { notifications, unreadCount };
  },
});

export const markRead = mutation({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const { user } = await requireUser(ctx);
    const notif: any = await ctx.db.get(args.id as any);
    if (notif && notif.user === user._id) {
      await ctx.db.patch(args.id as any, { isRead: true });
    }
    return { message: "Notification marked as read" };
  },
});

export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireUser(ctx);
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("user", user._id))
      .filter((q) => q.eq(q.field("isRead"), false))
      .collect();
    await Promise.all(
      unread.map((n) => ctx.db.patch(n._id, { isRead: true })),
    );
    return { message: "All notifications marked as read" };
  },
});

/** Internal: create notifications for a list of recipients (used by AI jobs). */
export const createForUsers = internalMutation({
  args: {
    userIds: v.array(v.string()),
    title: v.string(),
    message: v.string(),
    type: v.union(
      v.literal("system"),
      v.literal("assignment"),
      v.literal("lab_result"),
      v.literal("alert"),
    ),
    link: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    for (const uid of args.userIds) {
      if (!uid) continue;
      await ctx.db.insert("notifications", {
        user: uid,
        title: args.title,
        message: args.message,
        type: args.type,
        isRead: false,
        link: args.link,
        createdAt: Date.now(),
      });
    }
  },
});
