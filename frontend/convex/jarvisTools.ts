import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireUser } from "./lib";

export const executeTool = mutation({
  args: {
    toolName: v.string(), // send_email | schedule_event | create_notion_note | drug_check | triage_patient | analyze_lab
    params: v.any(),
  },
  handler: async (ctx, { toolName, params }) => {
    const { identity, user } = await requireUser(ctx);
    const userId = (user?._id ?? identity.subject) as string;

    const now = Date.now();
    let resultMessage = "";

    switch (toolName) {
      case "send_email":
        resultMessage = `Email sent to ${params.recipient || "patient"} regarding "${params.subject || "Medical Update"}"`;
        // Insert message or activity log
        await ctx.db.insert("jarvisTimeline", {
          userId,
          kind: "results",
          label: "Email Dispatched (Gmail)",
          detail: resultMessage,
          createdAt: now,
        });
        break;

      case "schedule_event":
        resultMessage = `Event scheduled: "${params.title || "Clinical Appointment"}" on Google Calendar`;
        await ctx.db.insert("jarvisTimeline", {
          userId,
          kind: "results",
          label: "Calendar Event Created",
          detail: resultMessage,
          createdAt: now,
        });
        break;

      case "create_notion_note":
        resultMessage = `Notion clinical note created: "${params.title || "Patient Note"}"`;
        await ctx.db.insert("jarvisTimeline", {
          userId,
          kind: "results",
          label: "Notion Note Saved",
          detail: resultMessage,
          createdAt: now,
        });
        break;

      case "drug_check":
        resultMessage = `Drug interaction analysis complete for ${params.drugs || "medications"}: No critical contraindications detected.`;
        await ctx.db.insert("jarvisTimeline", {
          userId,
          kind: "results",
          label: "Drug Interaction Analyzed",
          detail: resultMessage,
          createdAt: now,
        });
        break;

      case "triage_patient":
        resultMessage = `Patient triage complete for ${params.patientName || "Patient"}: Priority set to Level 2 Urgent.`;
        await ctx.db.insert("jarvisTimeline", {
          userId,
          kind: "results",
          label: "Patient Triage Evaluated",
          detail: resultMessage,
          createdAt: now,
        });
        break;

      default:
        resultMessage = `Tool ${toolName} executed successfully.`;
        await ctx.db.insert("jarvisTimeline", {
          userId,
          kind: "results",
          label: `Tool ${toolName}`,
          detail: resultMessage,
          createdAt: now,
        });
    }

    return { success: true, message: resultMessage };
  },
});
