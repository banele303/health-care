import { deleteFile } from "../controllers/uploadthing";
import { requireAuth } from "../middleware/auth";

import express from "express";

const uploadthingRouter = express.Router();

uploadthingRouter.delete("/", requireAuth, deleteFile);

export default uploadthingRouter;
