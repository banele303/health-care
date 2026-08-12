import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";
import { Composio } from "@composio/core";
import { requireUser } from "./lib";

export const SERVICES: Record<string, { name: string; description: string; toolkit: string }> = {
  gmail: { name: "Gmail", description: "Read, search, and send real emails via Google OAuth", toolkit: "gmail" },
  googlecalendar: { name: "Google Calendar", description: "View and create events on real Google Calendar", toolkit: "googlecalendar" },
  notion: { name: "Notion", description: "Search, create, and update clinical notes in Notion", toolkit: "notion" },
};

function getComposio() {
  const apiKey = process.env.COMPOSIO_API_KEY;
  if (!apiKey) {
    throw new Error("COMPOSIO_API_KEY is not configured in Convex environment variables.");
  }
  return new Composio({ apiKey });
}

/** Generate real Google/Notion OAuth authorization URL via Composio */
export const initiateOAuth = action({
  args: { toolkit: v.string() },
  handler: async (ctx, args) => {
    const { identity, user } = await requireUser(ctx);
    const userId = (user?._id ?? identity.subject) as string;
    const toolkit = args.toolkit.toLowerCase();
    const service = SERVICES[toolkit];

    if (!service) {
      return { ok: false, error: `Unknown toolkit "${args.toolkit}".` };
    }

    try {
      const composio = getComposio();
      
      // Get or create auth config
      const existingConfigs = await composio.authConfigs.list({ toolkit });
      let authConfigId = existingConfigs.items?.[0]?.id;

      if (!authConfigId) {
        const created = await composio.authConfigs.create(toolkit, {
          type: "use_composio_managed_auth",
        });
        authConfigId = created.id;
      }

      // Link account to generate OAuth redirect URL
      const linkRequest = await composio.connectedAccounts.link(userId, authConfigId);
      const redirectUrl = linkRequest.redirectUrl ?? undefined;

      // Update connection status in Convex
      await ctx.runMutation(api.jarvisConnections.updateAccountLabel, {
        toolkit,
        accountLabel: `Pending OAuth Sign-in (${service.name})`,
      });

      return {
        ok: true,
        redirectUrl,
        connectionId: linkRequest.id,
        service: service.name,
      };
    } catch (err: any) {
      const errorMsg = err.message || String(err);
      return { ok: false, error: errorMsg };
    }
  },
});

/** Poll Composio for completed OAuth authentication status */
export const checkOAuthStatus = action({
  args: { toolkit: v.string() },
  handler: async (ctx, args) => {
    const { identity, user } = await requireUser(ctx);
    const userId = (user?._id ?? identity.subject) as string;
    const toolkit = args.toolkit.toLowerCase();

    try {
      const composio = getComposio();
      const accounts = await composio.connectedAccounts.list({
        userIds: [userId],
        toolkitSlugs: [toolkit],
      });

      const activeAccount = accounts.items?.find((a: any) => a.status === "ACTIVE");

      if (activeAccount) {
        const accountEmail = activeAccount.userParams?.email ?? activeAccount.userParams?.username ?? `${toolkit}@google.com`;
        await ctx.runMutation(api.jarvisConnections.updateAccountLabel, {
          toolkit,
          accountLabel: accountEmail,
        });
        return { connected: true, email: accountEmail };
      }

      return { connected: false };
    } catch {
      return { connected: false };
    }
  },
});

/** Execute a real tool (GMAIL_FETCH_EMAILS, GMAIL_SEND_EMAIL, GOOGLECALENDAR_CREATE_EVENT) via Composio */
export const executeComposioAction = action({
  args: {
    actionName: v.string(), // e.g. "GMAIL_FETCH_EMAILS", "GMAIL_SEND_EMAIL", "GOOGLECALENDAR_CREATE_EVENT"
    params: v.any(),
  },
  handler: async (ctx, { actionName, params }) => {
    const { identity, user } = await requireUser(ctx);
    const userId = (user?._id ?? identity.subject) as string;

    try {
      const composio = getComposio();
      const result = await composio.tools.execute(actionName, {
        userId,
        dangerouslySkipVersionCheck: true,
        arguments: params || {},
      });

      if (result.successful) {
        return { ok: true, data: result.data };
      } else {
        return { ok: false, error: result.error || "Action execution failed." };
      }
    } catch (err: any) {
      return { ok: false, error: err.message || String(err) };
    }
  },
});
