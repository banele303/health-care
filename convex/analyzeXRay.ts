import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

const MODEL = "gemini-2.5-flash";

/**
 * X-Ray analysis — replaces Inngest "analyzeXRayJob".
 * Uses Gemini VISION (deepseek-chat is text-only, cannot process images).
 * 1. Downloads the image (via the /image proxy → raw bytes)
 * 2. Sends it to Gemini Vision
 * 3. Stores the analysis and marks the lab result "analyzed"
 * 4. Notifies assigned staff
 */
export const run = internalAction({
  args: {
    labResultId: v.string(),
    imageUrl: v.string(),
    bodyPart: v.string(),
  },
  handler: async (ctx, args) => {
    // STEP 1: Download image
    const resp = await fetch(args.imageUrl);
    if (!resp.ok) throw new Error(`Failed to fetch image: ${resp.status}`);
    const buf = await resp.arrayBuffer();
    const imageBase64 = toBase64(new Uint8Array(buf));

    // STEP 2: Gemini Vision
    const prompt = `You are an expert AI radiologist. Analyze this ${args.bodyPart} x-ray image. Provide a structured response:
1. Key Findings
2. Potential Abnormalities
3. Summary.
Keep it clinical, concise, and end with a disclaimer.`;

    const key = process.env.GEMINI_KEY;
    if (!key) throw new Error("GEMINI_KEY not configured");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              { inlineData: { mimeType: "image/jpeg", data: imageBase64 } },
            ],
          },
        ],
      }),
    });
    if (!res.ok) throw new Error(`Gemini API error ${res.status}: ${await res.text()}`);
    const body: any = await res.json();
    const aiAnalysis: string =
      body?.candidates?.[0]?.content?.parts
        ?.map((p: any) => p.text)
        .join("") ?? "";

    // STEP 3: Update DB (setAnalysis returns lab result with patient attached)
    const updated: any = await ctx.runMutation(
      internal.labResults.setAnalysis,
      { labResultId: args.labResultId, aiAnalysis },
    );

    // STEP 4: Notify assigned staff
    await ctx.runMutation(internal.notifications.createForUsers, {
      userIds: [
        updated?.patient?.assignedDoctorId,
        updated?.patient?.assignedNurseId,
      ],
      title: "Lab Result Analyzed",
      message: `Your lab result for ${updated?.testType} has been analyzed.`,
      link: "/patients",
      type: "lab_result",
    });

    return { success: true };
  },
});

function toBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}
