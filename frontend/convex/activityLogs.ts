import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { paginate, requireRole, requireUser } from "./lib";

export const list = query({
  args: { page: v.optional(v.number()), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    const page = Math.max(1, args.page ?? 1);
    const limit = Math.max(1, args.limit ?? 10);

    const total = (await ctx.db.query("activityLogs").collect()).length;
    const logs = await ctx.db.query("activityLogs").order("desc").take(page * limit);

    // Attach user details to each log (mimics mongoose populate)
    const userIds = logs.map((l) => l.user);
    const users = await Promise.all(
      userIds.map((id) => ctx.db.get(id as any).catch(() => null)),
    );
    const userMap = new Map<string, any>();
    users.forEach((u) => u && userMap.set(u._id, u));

    const logsWithUser = logs.map((log) => ({
      ...log,
      user: userMap.get(log.user) ?? null,
    }));

    return paginate(logsWithUser, page, limit, total);
  },
});

export const create = mutation({
  args: {
    userId: v.string(),
    action: v.string(),
    details: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    await ctx.db.insert("activityLogs", {
      user: args.userId,
      action: args.action,
      details: args.details,
      createdAt: Date.now(),
    });
    return { message: "Activity logged successfully" };
  },
});

export const createLog = internalMutation({
  args: {
    userId: v.string(),
    action: v.string(),
    details: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("activityLogs", {
      user: args.userId,
      action: args.action,
      details: args.details,
      createdAt: Date.now(),
    });
  },
});
