import { ConvexError, v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireRole, requireUser } from "./lib";

export const list = query({
  args: { patientId: v.string() },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin", "doctor", "nurse", "lab_tech"]);
    return await ctx.db
      .query("labResults")
      .withIndex("by_patient", (q) => q.eq("patient", args.patientId))
      .order("desc")
      .collect();
  },
});

export const create = mutation({
  args: {
    patientId: v.string(),
    testType: v.string(),
    bodyPart: v.string(),
    imageUrl: v.string(),
    storageId: v.optional(v.string()),
    aiAnalysis: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user: currentUser } = await requireRole(ctx, [
      "admin",
      "doctor",
      "lab_tech",
    ]);
    const id = await ctx.db.insert("labResults", {
      patient: args.patientId,
      uploadedBy: currentUser._id,
      testType: args.testType,
      bodyPart: args.bodyPart,
      imageUrl: args.imageUrl,
      storageId: args.storageId,
      aiAnalysis: args.aiAnalysis ?? "Pending Analysis...",
      status: "pending",
      createdAt: Date.now(),
    });

    if (args.testType === "X-Ray") {
      // Replaces Inngest "labResult/created": analyze the X-Ray with Gemini
      await ctx.scheduler.runAfter(0, internal.analyzeXRay.run, {
        labResultId: id,
        imageUrl: args.imageUrl,
        bodyPart: args.bodyPart,
      });
      // Replaces Inngest "billing/charge.added": $150.00 radiology charge
      await ctx.scheduler.runAfter(0, internal.invoices.addCharge, {
        patientId: args.patientId,
        description: `Radiology: ${args.bodyPart} X-Ray Analysis`,
        priceInCents: 15000,
      });
      await ctx.runMutation(internal.activityLogs.createLog, {
        userId: currentUser._id,
        action: "Uploaded Lab Result",
        details: `Uploaded ${args.testType} for ${args.bodyPart}`,
      });
    }

    return await ctx.db.get(id);
  },
});

export const update = mutation({
  args: {
    id: v.string(),
    aiAnalysis: v.optional(v.string()),
    doctorNotes: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("analyzed"),
        v.literal("reviewed"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const { user: currentUser } = await requireRole(ctx, [
      "admin",
      "doctor",
      "lab_tech",
    ]);
    const existing = await ctx.db.get(args.id as any);
    if (!existing) throw new ConvexError("Lab result not found");

    const patch: any = { updatedAt: Date.now() };
    if (args.aiAnalysis !== undefined) patch.aiAnalysis = args.aiAnalysis;
    if (args.doctorNotes !== undefined) patch.doctorNotes = args.doctorNotes;
    if (args.status !== undefined) patch.status = args.status;
    await ctx.db.patch(args.id as any, patch);

    await ctx.runMutation(internal.activityLogs.createLog, {
      userId: currentUser._id,
      action: "Updated Lab Result",
      details: `Updated lab result ${args.id} with status ${args.status || "N/A"}`,
    });
    return await ctx.db.get(args.id as any);
  },
});

/** Internal: store the Gemini analysis result (used by the X-Ray job). */
export const setAnalysis = internalMutation({
  args: { labResultId: v.string(), aiAnalysis: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.labResultId as any, {
      aiAnalysis: args.aiAnalysis,
      status: "analyzed",
      updatedAt: Date.now(),
    });
    const updated: any = await ctx.db.get(args.labResultId as any);
    if (!updated) throw new ConvexError("Lab result not found");

    // Attach patient so the job can notify assigned staff
    const patient: any = await ctx.db.get(updated.patient as any);
    return { ...updated, patient: patient ?? null };
  },
});
