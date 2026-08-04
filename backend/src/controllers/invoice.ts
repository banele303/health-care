import type { Request, Response } from "express";
import invoice from "../models/invoice";
import { fromNodeHeaders } from "better-auth/node";
import mongoose from "mongoose";
import { auth, polarClient } from "../lib/auth";

export const getMyActiveInvoice = async (req: Request, res: Response) => {
  try {
    // 1. Get the current user from the session (populated by your requireAuth middleware)
    const currentUserId = (req as any).user.id;

    // 2. Find an active invoice for this specific patient
    // We look for 'draft' (still accumulating charges) or 'pending_payment' (ready to checkout)
    const activeInvoice = await invoice.findOne({
      patientId: currentUserId,
      status: { $in: ["draft", "pending_payment"] },
    });
    // 3. Return 404 if no bill exists
    if (!activeInvoice) {
      return res.status(404).json({ message: "No active invoice found" });
    }
    // 4. Return the invoice data
    res.status(200).json(activeInvoice);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// get billing history(you can remove status if you want to fetch all invoices)
export const getBillingHistory = async (req: Request, res: Response) => {
  try {
    const currentUserId = (req as any).user.id;
    const activeInvoice = await invoice.find({
      patientId: currentUserId,
      status: { $in: ["paid"] },
    });
    res.status(200).json(activeInvoice);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const allBilling = async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const billings = await invoice
      .find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const count = await invoice.countDocuments();
    const collection = mongoose.connection.collection("user");
    const users = await collection
      .find(
        { role: "patient" },
        { projection: { password: 0, headers: 0, emailVerified: 0 } },
      )
      .toArray();

    // 4. Create a Lookup Map for instant access
    const userMap = new Map<string, any>();
    users.forEach((user) => {
      userMap.set(user._id.toString(), user);
    });

    const billingsWithUser = billings.map((billing) => {
      const user = userMap.get(billing.patientId.toString());
      return {
        ...billing,
        user: user || null, // If no user found, set user to null
      };
    });

    res.json({
      res: billingsWithUser,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalData: count,
        limit,
      },
    });
  } catch (error) {
    console.error("Error fetching billing history:", error);
    res.status(500).json({ message: "Failed to fetch billing history" });
  }
};

export const createCheckoutSession = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    // 1. Fetch the unique invoice from your database
    const userInvoice = await invoice.findById(id);
    if (!userInvoice || userInvoice.status === "paid") {
      return res
        .status(400)
        .json({ message: "Invalid or already paid invoice" });
    }

    // 2. CREATE CHECKOUT USING THE POLAR SDK
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const checkout = await polarClient.checkouts.create({
      externalCustomerId: session.user.id, // Link the checkout to the authenticated user
      products: [process.env.POLAR_PRODUCT_ID!],
      prices: {
        [process.env.POLAR_PRODUCT_ID!]: [
          {
            amountType: "fixed",
            priceAmount: userInvoice.totalAmount, // e.g. 15000 = $150.00 (in cents)
            priceCurrency: "usd",
          },
        ],
      },
      metadata: {
        hospitalInvoiceId: userInvoice._id.toString(),
        patientId: userInvoice.patientId,
      },
      // Where to redirect after success
      successUrl: `${process.env.FRONTEND_URL}/profile/${userInvoice.patientId}?checkout_id={CHECKOUT_ID}`,
      returnUrl: `${process.env.FRONTEND_URL}/profile/${userInvoice.patientId}`,
    });

    // Redirect customer to checkout.url
    // 3. Save checkout ID to Mongo
    userInvoice.status = "pending_payment";
    userInvoice.polarCheckoutId = checkout.id;
    await userInvoice.save();

    // 4. Return the checkout URL to the frontend
    res.json({ checkoutUrl: checkout.url });
  } catch (error) {
    console.error("Polar Checkout Error:", error);
    res.status(500).json({ error: "Failed to generate payment link" });
  }
};
