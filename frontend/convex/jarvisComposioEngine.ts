import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";
import { Composio } from "@composio/core";

function getComposio() {
  const apiKey = process.env.COMPOSIO_API_KEY;
  if (!apiKey) {
    throw new Error("COMPOSIO_API_KEY is not configured in Convex environment variables.");
  }
  return new Composio({ apiKey });
}

export function shapeEmails(data: any): {
  count: number;
  emails: { subject: string; from: string; snippet: string; date?: string }[];
} {
  const messages: any[] = data?.messages ?? data?.items ?? (Array.isArray(data) ? data : []);
  const emails = messages.slice(0, 10).map((m: any) => ({
    subject: m.subject ?? m.payload?.subject ?? "(no subject)",
    from: m.sender ?? m.from ?? m.payload?.from ?? "unknown",
    snippet: (m.preview?.body ?? m.snippet ?? m.messageText ?? "").slice(0, 140),
    date: m.messageTimestamp ?? m.date ?? undefined,
  }));
  return { count: messages.length, emails };
}

export function shapeEvents(data: any): {
  count: number;
  events: { title: string; start?: string; end?: string; location?: string }[];
} {
  const items: any[] = data?.items ?? data?.events ?? (Array.isArray(data) ? data : []);
  const events = items.slice(0, 10).map((e: any) => ({
    title: e.summary ?? e.title ?? "(untitled)",
    start: e.start?.dateTime ?? e.start?.date ?? e.start ?? undefined,
    end: e.end?.dateTime ?? e.end?.date ?? e.end ?? undefined,
    location: e.location ?? undefined,
  }));
  return { count: items.length, events };
}

export const fetchGmailViaComposio = action({
  args: { query: v.optional(v.string()), maxResults: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject ?? "demo-staff-user";

    try {
      const composio = getComposio();
      const result = await composio.tools.execute("GMAIL_FETCH_EMAILS", {
        userId,
        dangerouslySkipVersionCheck: true,
        arguments: {
          query: args.query ?? "is:unread",
          max_results: args.maxResults ?? 10,
        },
      });

      if (!result.successful) {
        return { ok: false, error: result.error || "Failed to fetch Gmail via Composio." };
      }

      const shaped = shapeEmails(result.data);
      return { ok: true, data: shaped };
    } catch (err: any) {
      return { ok: false, error: err.message || String(err) };
    }
  },
});

export const sendEmailViaComposio = action({
  args: { recipientEmail: v.string(), subject: v.string(), body: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject ?? "demo-staff-user";

    try {
      const composio = getComposio();
      const result = await composio.tools.execute("GMAIL_SEND_EMAIL", {
        userId,
        dangerouslySkipVersionCheck: true,
        arguments: {
          recipient_email: args.recipientEmail,
          subject: args.subject,
          body: args.body,
          is_html: false,
        },
      });

      if (!result.successful) {
        return { ok: false, error: result.error || "Failed to send email via Composio." };
      }

      return { ok: true, message: `Email sent to ${args.recipientEmail} via Composio API.` };
    } catch (err: any) {
      return { ok: false, error: err.message || String(err) };
    }
  },
});

export const fetchCalendarViaComposio = action({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    const userId = identity?.subject ?? "demo-staff-user";

    try {
      const composio = getComposio();
      const now = new Date();
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);

      const result = await composio.tools.execute("GOOGLECALENDAR_EVENTS_LIST", {
        userId,
        dangerouslySkipVersionCheck: true,
        arguments: {
          calendar_id: "primary",
          time_min: now.toISOString(),
          time_max: endOfDay.toISOString(),
          single_events: true,
          order_by: "startTime",
          max_results: 10,
        },
      });

      if (!result.successful) {
        return { ok: false, error: result.error };
      }

      const shaped = shapeEvents(result.data);
      return { ok: true, data: shaped };
    } catch (err: any) {
      return { ok: false, error: err.message || String(err) };
    }
  },
});
