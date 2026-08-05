import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
// NOTE: schema/index changes deploy with `convex dev` — watch for "[+] <table>.<index>" lines.

export default defineSchema({
  // ── Convex Auth tables (extended users table with hospital fields) ──
  users: defineTable({
    // auth fields (must match @convex-dev/auth expectations)
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    // hospital fields
    role: v.optional(
      v.union(
        v.literal("admin"),
        v.literal("doctor"),
        v.literal("nurse"),
        v.literal("pharmacist"),
        v.literal("lab_tech"),
        v.literal("patient"),
      ),
    ),
    status: v.optional(v.string()), // admitted / active / on_leave / discharged ...
    banned: v.optional(v.boolean()),
    specialization: v.optional(v.string()),
    department: v.optional(v.string()),
    gender: v.optional(v.string()),
    bloodgroup: v.optional(v.string()),
    medicalHistory: v.optional(v.string()),
    age: v.optional(v.string()),
    prescriptions: v.optional(v.array(v.string())),
    appointments: v.optional(v.array(v.string())),
    assignedDoctorId: v.optional(v.string()),
    assignedDoctorName: v.optional(v.string()),
    assignedNurseId: v.optional(v.string()),
    assignedNurseName: v.optional(v.string()),
    triageReasoning: v.optional(v.string()),
    admissionReason: v.optional(v.string()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"])
    .index("by_role", ["role"]),

  authSessions: defineTable({
    userId: v.id("users"),
    expirationTime: v.number(),
  }).index("userId", ["userId"]),

  authAccounts: defineTable({
    userId: v.id("users"),
    provider: v.string(),
    providerAccountId: v.string(),
    secret: v.optional(v.string()),
    emailVerified: v.optional(v.string()),
    phoneVerified: v.optional(v.string()),
  })
    .index("userIdAndProvider", ["userId", "provider"])
    .index("providerAndAccountId", ["provider", "providerAccountId"]),

  authRefreshTokens: defineTable({
    sessionId: v.id("authSessions"),
    expirationTime: v.number(),
    firstUsedTime: v.optional(v.number()),
    parentRefreshTokenId: v.optional(v.id("authRefreshTokens")),
  })
    .index("sessionId", ["sessionId"])
    .index("sessionIdAndParentRefreshTokenId", [
      "sessionId",
      "parentRefreshTokenId",
    ]),

  authVerificationCodes: defineTable({
    accountId: v.id("authAccounts"),
    provider: v.string(),
    code: v.string(),
    expirationTime: v.number(),
    verifier: v.optional(v.string()),
    emailVerified: v.optional(v.string()),
    phoneVerified: v.optional(v.string()),
  })
    .index("accountId", ["accountId"])
    .index("code", ["code"]),

  authVerifiers: defineTable({
    sessionId: v.optional(v.id("authSessions")),
    signature: v.optional(v.string()),
  }).index("signature", ["signature"]),

  authRateLimits: defineTable({
    identifier: v.string(),
    lastAttemptTime: v.number(),
    attemptsLeft: v.number(),
  }).index("identifier", ["identifier"]),

  // ── Hospital domain tables ──
  labResults: defineTable({
    patient: v.string(),
    uploadedBy: v.string(),
    testType: v.string(),
    bodyPart: v.optional(v.string()),
    imageUrl: v.optional(v.string()), // proxied URL (convex.site/image/<storageId>)
    storageId: v.optional(v.string()),
    aiAnalysis: v.optional(v.string()),
    doctorNotes: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("analyzed"),
      v.literal("reviewed"),
    ),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  }).index("by_patient", ["patient"]),

  invoices: defineTable({
    patientId: v.string(),
    polarCheckoutId: v.optional(v.string()),
    status: v.union(
      v.literal("draft"),
      v.literal("pending_payment"),
      v.literal("paid"),
    ),
    items: v.array(
      v.object({
        description: v.string(),
        quantity: v.number(),
        unitPrice: v.number(),
        totalPrice: v.number(),
      }),
    ),
    totalAmount: v.number(),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_patient", ["patientId"])
    .index("by_status", ["status"]),

  activityLogs: defineTable({
    user: v.string(),
    action: v.string(),
    details: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_user", ["user"]),

  notifications: defineTable({
    user: v.string(),
    title: v.string(),
    message: v.string(),
    type: v.union(
      v.literal("system"),
      v.literal("assignment"),
      v.literal("lab_result"),
      v.literal("alert"),
    ),
    isRead: v.boolean(),
    link: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_user", ["user"]),
});
