import { ConvexError, v } from "convex/values";
import { query, internalMutation } from "./_generated/server";
import { paginate, requireRole, requireUser } from "./lib";

export const getById = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id as any);
  },
});

export const getMyActive = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireUser(ctx);
    const invoice = await ctx.db
      .query("invoices")
      .withIndex("by_patient", (q) => q.eq("patientId", user._id))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "draft"),
          q.eq(q.field("status"), "pending_payment"),
        ),
      )
      .first();
    return invoice ?? null;
  },
});

export const getHistory = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    return await ctx.db
      .query("invoices")
      .withIndex("by_patient", (q) => q.eq("patientId", args.userId))
      .filter((q) => q.eq(q.field("status"), "paid"))
      .order("desc")
      .collect();
  },
});

export const all = query({
  args: { page: v.optional(v.number()), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    const page = Math.max(1, args.page ?? 1);
    const limit = Math.max(1, args.limit ?? 10);

    const total = (await ctx.db.query("invoices").collect()).length;
    const billings = await ctx.db.query("invoices").order("desc").take(page * limit);

    // Join patient user docs
    const patientIds = billings.map((b) => b.patientId);
    const patients = await Promise.all(
      patientIds.map((id) => ctx.db.get(id as any).catch(() => null)),
    );
    const userMap = new Map<string, any>();
    patients.forEach((u) => u && userMap.set(u._id, u));

    const billingsWithUser = billings.map((b) => ({
      ...b,
      user: userMap.get(b.patientId) ?? null,
    }));

    return paginate(billingsWithUser, page, limit, total);
  },
});

/** Internal: find-or-create the patient's draft invoice and append a charge. */
export const addCharge = internalMutation({
  args: {
    patientId: v.string(),
    description: v.string(),
    priceInCents: v.number(),
  },
  handler: async (ctx, args) => {
    let inv = await ctx.db
      .query("invoices")
      .withIndex("by_patient", (q) => q.eq("patientId", args.patientId))
      .filter((q) => q.eq(q.field("status"), "draft"))
      .first();

    if (!inv) {
      const id = await ctx.db.insert("invoices", {
        patientId: args.patientId,
        status: "draft",
        items: [],
        totalAmount: 0,
        createdAt: Date.now(),
      });
      inv = await ctx.db.get(id);
    }
    if (!inv) throw new ConvexError("Failed to create invoice");

    const items = [...inv.items, {
      description: args.description,
      quantity: 1,
      unitPrice: args.priceInCents,
      totalPrice: args.priceInCents,
    }];
    await ctx.db.patch(inv._id, {
      items,
      totalAmount: inv.totalAmount + args.priceInCents,
      updatedAt: Date.now(),
    });
    return { success: true, invoiceId: inv._id };
  },
});
