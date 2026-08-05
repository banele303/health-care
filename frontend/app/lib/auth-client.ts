/**
 * Convex-backed drop-in replacement for the old better-auth client.
 * Same call surface the components already use:
 *   authClient.useSession()          -> { data: { user }, isPending }
 *   authClient.admin.createUser()    -> { data: { user }, error }
 *   authClient.admin.ban/unban/removeUser() -> { error }
 *   authClient.getSession()          -> { data: { user } }
 */
import { useConvexAuth } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { convex } from "./convex";

export const authClient = {
  useSession: () => {
    const { isAuthenticated, isLoading } = useConvexAuth();
    const me: any = useQuery(api.users.me);
    const isPending = isLoading || (isAuthenticated && me === undefined);
    // Map Convex _id -> id so `session.user.id` keeps working,
    // and fill better-auth-shaped fields the components expect
    const user = me
      ? {
          ...me,
          id: me._id,
          name: me.name ?? "User",
          emailVerified: !!me.emailVerificationTime,
          createdAt: me._creationTime,
          updatedAt: me._creationTime,
        }
      : null;
    return { data: user ? { user } : null, isPending };
  },

  getSession: async () => {
    try {
      const me: any = await convex.query(api.users.me);
      const user = me
        ? {
            ...me,
            id: me._id,
            name: me.name ?? "User",
            emailVerified: !!me.emailVerificationTime,
            createdAt: me._creationTime,
            updatedAt: me._creationTime,
          }
        : null;
      return { data: user ? { user } : null, error: null };
    } catch (error: any) {
      return { data: null, error };
    }
  },

  admin: {
    createUser: async (params: any) => {
      try {
        // better-auth callers pass custom fields under `data: {}` — flatten them
        const { data, ...rest } = params;
        const flat = { ...rest, ...(data || {}) };
        const result: any = await convex.action(api.users.create, flat);
        return { data: result, error: null };
      } catch (error: any) {
        return { data: null, error: { message: error.message } };
      }
    },
    banUser: async ({ userId }: { userId: string }) => {
      try {
        await convex.mutation(api.users.ban, { userId });
        return { error: null };
      } catch (error: any) {
        return { error: { message: error.message } };
      }
    },
    unbanUser: async ({ userId }: { userId: string }) => {
      try {
        await convex.mutation(api.users.unban, { userId });
        return { error: null };
      } catch (error: any) {
        return { error: { message: error.message } };
      }
    },
    removeUser: async ({ userId }: { userId: string }) => {
      try {
        await convex.mutation(api.users.remove, { userId });
        return { error: null };
      } catch (error: any) {
        return { error: { message: error.message } };
      }
    },
  },
};
