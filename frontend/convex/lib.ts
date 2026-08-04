import { ConvexError, v } from "convex/values";
import type { QueryCtx, MutationCtx } from "./_generated/server";

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
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("Unauthorized");
  const user: any = await ctx.db.get(identity.subject as any);
  if (!user) throw new ConvexError("Unauthorized");
  return { identity, user };
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
