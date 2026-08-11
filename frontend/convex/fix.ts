import { mutation } from "./_generated/server";

export const makeAllAdmins = mutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    let updated = 0;
    for (const user of users) {
      await ctx.db.patch(user._id, { role: "admin" });
      updated++;
    }
    return `Successfully restored admin access to ${updated} users!`;
  }
});

export const fixByEmail = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();
      
    if (!user) throw new Error("User not found");
    
    await ctx.db.patch(user._id, { role: "admin" });
    return `Successfully updated user ${user.email} to admin!`;
  }
});
