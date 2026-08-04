import type { Request, Response } from "express";
import LabResult from "../models/labResults";
import { inngest } from "../inngest/client";
import { logActivity } from "../lib/activity";

// Create a new lab result
export const createLabResult = async (req: Request, res: Response) => {
  try {
    const { patientId, testType, bodyPart, imageUrl } = req.body;
    const currentUserId = (req as any).user?.id;

    const newLabResult = await LabResult.create({
      patient: patientId,
      testType,
      bodyPart,
      imageUrl,
      status: "pending",
      uploadedBy: currentUserId,
    });
    if (!newLabResult) {
      return res.status(400).json({ message: "Failed to create lab result" });
    }
    const io = req.app.get("io");
    if (io) {
      io.emit("lab_result_added");
    }
    if (testType === "X-Ray" && newLabResult) {
      // trigger an event in Inngest(analyze-xray) to analyze the x-ray image
      await inngest.send({
        name: "labResult/created",
        data: {
          labResultId: newLabResult._id.toString(),
          imageUrl: newLabResult.imageUrl,
          bodyPart: newLabResult.bodyPart,
        },
      });
      // trigger an event for billing
      await inngest.send({
        name: "billing/charge.added",
        data: {
          patientId: newLabResult.patient,
          description: `Radiology: ${newLabResult.bodyPart} X-Ray Analysis`,
          priceInCents: 15000, // $150.00
        },
      });
      await logActivity(
        currentUserId,
        "Uploaded Lab Result",
        `Uploaded ${testType} for ${bodyPart}`,
      );
    }
    res.status(201).json(newLabResult);
  } catch (error) {
    console.error("Error creating lab result:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// 2. Get all Lab Results for a specific patient
export const getPatientLabResults = async (req: Request, res: Response) => {
  try {
    const { patientId } = req.params;
    const results = await LabResult.find({ patient: patientId }).sort({
      createdAt: -1,
    });
    res.status(200).json(results);
  } catch (error) {
    console.error("Error fetching lab results:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// 3. Update Lab Result (Used for saving AI Analysis or Doctor Notes)
export const updateLabResult = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { aiAnalysis, doctorNotes, status } = req.body;
    const updatedResult = await LabResult.findByIdAndUpdate(
      id,
      {
        $set: {
          ...(aiAnalysis && { aiAnalysis }),
          ...(doctorNotes && { doctorNotes }),
          ...(status && { status }),
        },
      },
      { new: true }, // Return the updated document
    );

    if (!updatedResult) {
      return res.status(404).json({ message: "Lab result not found" });
    }
    const io = req.app.get("io");
    if (io) {
      io.emit("lab_result_updated", updatedResult);
    }
    // TODO: notify users
    await logActivity(
      (req as any).user.id,
      "Updated Lab Result",
      `Updated lab result ${id} with status ${status || "N/A"}`,
    );
    res.status(200).json(updatedResult);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
