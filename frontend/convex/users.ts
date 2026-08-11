import { ConvexError, v } from "convex/values";
import { query, mutation, action, internalQuery, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { paginate, requireRole, requireUser, userIdFromSubject, type Role } from "./lib";

const ROLES: Role[] = ["admin", "doctor", "nurse", "pharmacist", "lab_tech", "patient"];

// ─────────────────────────────────────────────────────────────
// Current user
// ─────────────────────────────────────────────────────────────
export const me = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user: any = await ctx.db.get(userIdFromSubject(identity) as any);
    return user ?? null;
  },
});

// ─────────────────────────────────────────────────────────────
// List / get
// ─────────────────────────────────────────────────────────────
export const list = query({
  args: {
    role: v.optional(v.string()),
    page: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    const page = Math.max(1, args.page ?? 1);
    const limit = Math.max(1, args.limit ?? 10);
    const role = args.role;

    const q = ctx.db.query("users");
    const filtered =
      role && role !== "all" && role !== ""
        ? q.filter((qq) => qq.eq(qq.field("role"), role))
        : q;
    const total = (await filtered.collect()).length;
    const all = await filtered.order("desc").take(page * limit);
    return paginate(all, page, limit, total);
  },
});

export const getById = query({
  args: { id: v.string() },
  handler: async (ctx, args) => {
    const { user: currentUser } = await requireUser(ctx);
    // A patient may only view their own profile.
    if (currentUser.role === "patient" && currentUser._id !== args.id) {
      throw new ConvexError("Forbidden");
    }
    const user: any = await ctx.db.get(args.id as any);
    if (!user) throw new ConvexError("User not found");
    return user as any;
  },
});

// ─────────────────────────────────────────────────────────────
// Admin: create / update / ban / remove
// ─────────────────────────────────────────────────────────────
/** Total number of users — public so the login page can detect a fresh deployment. */
export const count = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("users").collect();
    return all.length;
  },
});

/**
 * First-run only: promotes the currently signed-in user to admin.
 * Guarded to exactly ONE user existing — after the first admin is created
 * this can never be called again (no public signup afterwards).
 */
export const bootstrapSelfAdmin = mutation({
  args: { name: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not signed in");
    const total = (await ctx.db.query("users").collect()).length;
    if (total !== 1) {
      throw new ConvexError("First-admin setup is no longer available");
    }
    await ctx.db.patch(userIdFromSubject(identity) as any, {
      role: "admin",
      ...(args.name ? { name: args.name } : {}),
    });
    return { ok: true };
  },
});

/**
 * One-time repair: promotes the single role-less user to admin.
 * Same guard as bootstrapSelfAdmin (exactly one user) but needs no identity,
 * so it can be run from the CLI: npx convex run users:bootstrapRepair
 */
export const bootstrapRepair = mutation({
  args: { name: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("users").collect();
    if (all.length !== 1) {
      throw new ConvexError("Repair requires exactly one user");
    }
    const only = all[0] as any;
    if (only.role) {
      throw new ConvexError("User already has a role — nothing to repair");
    }
    await ctx.db.patch(only._id, {
      role: "admin",
      ...(args.name ? { name: args.name } : {}),
    });
    return { ok: true, user: (await ctx.db.get(only._id)) as any };
  },
});

/**
 * Admin-only user creation.
 * Uses Convex Auth's sign-up REST endpoint so the password is hashed
 * with the provider's own algorithm, then patches role + custom fields.
 */
export const create = action({
  args: {
    name: v.string(),
    email: v.string(),
    password: v.string(),
    role: v.union(
      v.literal("admin"),
      v.literal("doctor"),
      v.literal("nurse"),
      v.literal("pharmacist"),
      v.literal("lab_tech"),
      v.literal("patient"),
    ),
    status: v.optional(v.string()),
    specialization: v.optional(v.string()),
    department: v.optional(v.string()),
    gender: v.optional(v.string()),
    bloodgroup: v.optional(v.string()),
    medicalHistory: v.optional(v.string()),
    age: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Actions have no ctx.db — check identity + role via runQuery
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Unauthorized");
    const admin: any = await ctx.runQuery(internal.users.getUserDoc, {
      userId: userIdFromSubject(identity),
    });
    if (!admin || admin.role !== "admin") {
      throw new ConvexError("Forbidden: Admins only");
    }

    const siteUrl = process.env.CONVEX_SITE_URL;
    if (!siteUrl) throw new ConvexError("CONVEX_SITE_URL not available");

    const res = await fetch(`${siteUrl}/api/auth/sign-up`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: args.email,
        password: args.password,
        name: args.name,
      }),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new ConvexError(errBody.message || "Failed to create user");
    }

    const created: any = await res.json();
    const userId: string | undefined = created?.user?._id ?? created?.user?.id;

    // Patch role + custom fields
    const fields: any = {
      role: args.role,
      status: args.status ?? (args.role === "patient" ? "admitted" : "active"),
      banned: false,
    };
    if (args.specialization) fields.specialization = args.specialization;
    if (args.department) fields.department = args.department;
    if (args.gender) fields.gender = args.gender;
    if (args.bloodgroup) fields.bloodgroup = args.bloodgroup;
    if (args.medicalHistory) fields.medicalHistory = args.medicalHistory;
    if (args.age) fields.age = args.age;

    if (userId) {
      await ctx.runMutation(internal.users.setFields, { userId, fields });
    } else {
      // Fallback: locate by email
      const found = await ctx.runQuery(internal.users.getByEmail, {
        email: args.email,
      });
      if (found) {
        await ctx.runMutation(internal.users.setFields, { userId: found._id, fields });
      }
    }

    return {
      user: {
        id: userId,
        name: args.name,
        email: args.email,
        role: args.role,
      },
    };
  },
});

export const update = mutation({
  args: {
    id: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.optional(v.string()),
    status: v.optional(v.string()),
    specialization: v.optional(v.string()),
    department: v.optional(v.string()),
    gender: v.optional(v.string()),
    bloodgroup: v.optional(v.string()),
    medicalHistory: v.optional(v.string()),
    age: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin", "doctor", "nurse"]);
    const { id, ...fields } = args;
    const existing = await ctx.db.get(id as any);
    if (!existing) throw new ConvexError("User not found");

    const patch: any = {};
    for (const [k, val] of Object.entries(fields)) {
      if (val !== undefined && val !== null) patch[k] = val;
    }
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(id as any, patch);
    }

    // Activity log
    const { user: actor } = await requireUser(ctx);
    await ctx.runMutation(internal.activityLogs.createLog, {
      userId: actor._id,
      action: "Updated User",
      details: `User updated: ${id}`,
    });
    return { message: "User updated successfully" };
  },
});

export const ban = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    await ctx.db.patch(args.userId as any, { banned: true });
    const { user: actor } = await requireUser(ctx);
    await ctx.runMutation(internal.activityLogs.createLog, {
      userId: actor._id,
      action: "ban",
      details: `Banned user with ID: ${args.userId}`,
    });
    return { message: "User banned" };
  },
});

export const unban = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    await ctx.db.patch(args.userId as any, { banned: false });
    const { user: actor } = await requireUser(ctx);
    await ctx.runMutation(internal.activityLogs.createLog, {
      userId: actor._id,
      action: "ban",
      details: `Unbanned user with ID: ${args.userId}`,
    });
    return { message: "User unbanned" };
  },
});

export const remove = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    await ctx.db.delete(args.userId as any);
    const { user: actor } = await requireUser(ctx);
    await ctx.runMutation(internal.activityLogs.createLog, {
      userId: actor._id,
      action: "delete",
      details: `Deleted user with ID: ${args.userId}`,
    });
    return { message: "User deleted" };
  },
});

// ─────────────────────────────────────────────────────────────
// Admission
// ─────────────────────────────────────────────────────────────
export const admit = mutation({
  args: { patientId: v.string(), admissionReason: v.string() },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin", "doctor", "nurse"]);
    const { user: actor } = await requireUser(ctx);

    await ctx.db.patch(args.patientId as any, {
      status: "admitted",
      admissionReason: args.admissionReason,
    });

    // Schedule the AI triage job (replaces Inngest "patient/admitted")
    await ctx.scheduler.runAfter(0, internal.triage.run, {
      patientId: args.patientId,
      admissionReason: args.admissionReason,
    });

    await ctx.runMutation(internal.activityLogs.createLog, {
      userId: actor._id,
      action: "Admitted Patient",
      details: `Admitted patient ${args.patientId}`,
    });
    return { message: "Patient admission requested successfully" };
  },
});

// ─────────────────────────────────────────────────────────────
// Internal helpers (referenced via internal.*)
// ─────────────────────────────────────────────────────────────
export const setFields = internalMutation({
  args: { userId: v.string(), fields: v.any() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId as any, args.fields);
  },
});

/** No-auth user lookup for actions (actions have no ctx.db). */
export const getUserDoc = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const user: any = await ctx.db.get(args.userId as any);
    return user ?? null;
  },
});

export const getByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();
  },
});

export const getTriageData = internalQuery({
  args: { patientId: v.string() },
  handler: async (ctx, args) => {
    const patient = await ctx.db.get(args.patientId as any);
    if (!patient) throw new ConvexError("Patient not found");
    const doctors = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "doctor"))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();
    const nurses = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "nurse"))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();
    return { patient, doctors, nurses };
  },
});

export const assignStaff = internalMutation({
  args: {
    patientId: v.string(),
    doctorId: v.string(),
    doctorName: v.string(),
    nurseId: v.string(),
    nurseName: v.string(),
    reasoning: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.patientId as any, {
      status: "admitted",
      assignedDoctorId: args.doctorId,
      assignedDoctorName: args.doctorName,
      assignedNurseId: args.nurseId,
      assignedNurseName: args.nurseName,
      triageReasoning: args.reasoning,
    });
    const patient = await ctx.db.get(args.patientId as any);
    return patient;
  },
});
