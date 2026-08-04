import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireUser } from "./lib";

/** Generate a one-time upload URL for Convex storage. */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/** Resolve a storage id to its CDN URL. Public — used by the /image proxy. */
export const getUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

/** Delete a stored file. */
export const deleteFile = mutation({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    await ctx.storage.delete(args.storageId);
    return { message: "File deleted successfully" };
  },
});
