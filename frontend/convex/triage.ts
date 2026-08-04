import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * AI triage — replaces Inngest "admitPatient" job.
 * Uses DeepSeek (deepseek-chat) for the patient → doctor/nurse matching.
 * 1. Loads patient + active doctors/nurses
 * 2. Asks DeepSeek to assign the best doctor & nurse
 * 3. Patches the patient record
 * 4. Notifies the assigned staff
 */
export const run = internalAction({
  args: { patientId: v.string(), admissionReason: v.string() },
  handler: async (ctx, args) => {
    const data: any = await ctx.runQuery(internal.users.getTriageData, {
      patientId: args.patientId,
    });

    if (!data.patient || data.doctors.length === 0 || data.nurses.length === 0) {
      throw new Error("Missing patient or active staff to complete triage.");
    }

    const patient = data.patient;
    const patientDataStr = `Age: ${patient.age}, Gender: ${patient.gender}, History: ${patient.medicalHistory}. Issue: ${args.admissionReason}`;
    const doctorDataStr = data.doctors
      .map(
        (d: any) =>
          `ID: ${d._id}, Name: ${d.name}, Spec: ${d.specialization}, Dept: ${d.department}`,
      )
      .join("\n");
    const nurseDataStr = data.nurses
      .map((n: any) => `ID: ${n._id}, Name: ${n.name}, Dept: ${n.department}`)
      .join("\n");

    const prompt = `
You are an expert Hospital Triage AI. Match this patient with the best Doctor and Nurse.
PATIENT: ${patientDataStr}
AVAILABLE DOCTORS: ${doctorDataStr}
AVAILABLE NURSES: ${nurseDataStr}

Respond ONLY with a valid JSON object:
{
  "doctorId": "id",
  "doctorName": "name",
  "nurseId": "id",
  "nurseName": "name",
  "reasoning": "Clinical reasoning for this assignment."
}`;

    const text = await callDeepSeek(prompt);
    const aiAssignment = JSON.parse(text);

    const updatedPatient: any = await ctx.runMutation(
      internal.users.assignStaff,
      {
        patientId: args.patientId,
        doctorId: aiAssignment.doctorId,
        doctorName: aiAssignment.doctorName,
        nurseId: aiAssignment.nurseId,
        nurseName: aiAssignment.nurseName,
        reasoning: aiAssignment.reasoning,
      },
    );

    await ctx.runMutation(internal.notifications.createForUsers, {
      userIds: [aiAssignment.doctorId, aiAssignment.nurseId],
      title: "Patient Assigned",
      message: `You have been assigned to a new patient: ${updatedPatient?.name}`,
      link: `/patient/${args.patientId}`,
      type: "assignment",
    });

    return { success: true, aiAssignment, updatedPatient };
  },
});

/**
 * Call DeepSeek (OpenAI-compatible chat completions API).
 * Text-only — this is used for triage; X-ray vision stays on Gemini.
 */
export async function callDeepSeek(prompt: string): Promise<string> {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) throw new Error("DEEPSEEK_API_KEY not configured");

  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content:
            "You are an expert Hospital Triage AI. Always respond with valid JSON only.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    }),
  });

  if (!res.ok) {
    throw new Error(`DeepSeek API error ${res.status}: ${await res.text()}`);
  }
  const body: any = await res.json();
  const text: string =
    body?.choices?.[0]?.message?.content ?? "";
  return text.replace(/```json/g, "").replace(/```/g, "").trim();
}
