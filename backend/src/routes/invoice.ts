import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import {
  createCheckoutSession,
  getMyActiveInvoice,
  getBillingHistory,
  allBilling,
} from "../controllers/invoice";
import { checkRole } from "../middleware/checkRole";

const invoiceRouter = Router();

// Routes for patients(if you want users like admin, doctors and nurses can have access to these route)(also you can combine "/my-active-invoice" and "/history" routes based on the status)
invoiceRouter.get(
  "/my-active-invoice",
  requireAuth,
  checkRole(["patient"]),
  getMyActiveInvoice,
);
invoiceRouter.get("/", requireAuth, checkRole(["admin"]), allBilling);
invoiceRouter.get("/history/:id", requireAuth, getBillingHistory);
invoiceRouter.post("/:id/checkout", requireAuth, createCheckoutSession);

export default invoiceRouter;
