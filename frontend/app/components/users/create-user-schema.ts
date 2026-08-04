import * as z from "zod";

export const createUserSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),

  // Optional fields (validated loosely here, logic handled in component)
  specialization: z.string().optional(),
  department: z.string().optional(),
  age: z.string().optional(),
  gender: z.string().optional(),
  bloodgroup: z.string().optional(),
  medicalHistory: z.string().optional(),
  status: z.string().optional(),
});

export const userSchema = (isEdit: boolean) => {
  return z.object({
    name: z.string().min(2, "Name is required"),
    email: z.email("Invalid email address"),
    // Optional fields (validated loosely here, logic handled in component)
    specialization: z.string().optional(),
    department: z.string().optional(),
    age: z.string().optional(),
    gender: z.string().optional(),
    bloodgroup: z.string().optional(),
    medicalHistory: z.string().optional(),
    status: z.string().optional(),
    password: isEdit
      ? z
          .string()
          .optional()
          .refine((val) => !val || val.length >= 6, {
            message: "Password must be at least 6 characters",
          })
      : z.string().min(8, "Password must be at least 8 characters"),
  });
};

export type UserValues = z.infer<ReturnType<typeof userSchema>>;

export const GENDER_OPTIONS = [
  { label: "Male", value: "Male" },
  { label: "Female", value: "Female" },
  { label: "Other", value: "Other" },
];

export const BLOOD_GROUP_OPTIONS = [
  { label: "A+", value: "A+" },
  { label: "A-", value: "A-" },
  { label: "B+", value: "B+" },
  { label: "B-", value: "B-" },
  { label: "AB+", value: "AB+" },
  { label: "AB-", value: "AB-" },
  { label: "O+", value: "O+" },
  { label: "O-", value: "O-" },
];

export const SPECIALIZATION_OPTIONS = [
  { label: "Cardiology", value: "Cardiology" },
  { label: "Neurology", value: "Neurology" },
  { label: "Pediatrics", value: "Pediatrics" },
  { label: "General Practice", value: "General" },
  { label: "Dermatology", value: "Dermatology" },
];

// --- NEW STATUS OPTIONS ---
export const PATIENT_STATUS_OPTIONS = [
  { label: "Admitted", value: "admitted" },
  { label: "In Treatment", value: "in_treatment" },
  { label: "Observation", value: "observation" },
  { label: "Discharged", value: "discharged" },
  { label: "Follow Up", value: "follow_up" },
];

export const STAFF_STATUS_OPTIONS = [
  { label: "Active", value: "active" },
  { label: "On Leave", value: "on_leave" },
  { label: "Resigned", value: "resigned" },
];
