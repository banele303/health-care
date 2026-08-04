export type Role =
  | "all"
  | "admin"
  | "doctor"
  | "nurse"
  | "pharmacist"
  | "lab_tech"
  | "patient";
// src/types/index.ts

// --- 1. PATIENT STATUSES ---
// Clinical states for patients
export type PatientStatus =
  | "admitted"
  | "in_treatment"
  | "observation"
  | "discharged"
  | "follow_up"
  | "deceased"; // Optional, but common in HMS

// --- 2. STAFF STATUSES ---
// Employment/Availability states for Doctors, Nurses, etc.
export type StaffStatus = "active" | "on_leave" | "suspended" | "resigned";

// --- 3. COMBINED USER STATUS ---
// The actual type used in the generic User interface
export type UserStatus = PatientStatus | StaffStatus;

export interface LabResult {
  _id: string;
  patient?: string; // Convex: patient doc id (was patientId in the Express API)
  patientId?: string;
  uploadedBy?: string;
  storageId?: string;
  testType: string;
  bodyPart?: string;
  imageUrl?: string;
  aiAnalysis?: string;
  status: "pending" | "analyzed" | "reviewed";
  doctorNotes?: string;
  createdAt: string | number;
}

export interface User {
  _id: string; // Convex uses _id
  name: string;
  email: string;
  image?: string | null;
  role: Role;
  emailVerified?: boolean;
  emailVerificationTime?: number;
  createdAt?: string | number; // _creationTime on Convex docs
  updatedAt?: string | number;
  status?: UserStatus;
  banned?: boolean;
  specialization?: string;
  gender?: string;
  bloodgroup?: string;
  medicalHistory?: string;
  age?: string;
  department?: string;
  labResults?: LabResult[];
  prescriptions?: string[];
  appointmentsXRay?: string[];
  assignedDoctorId?: string | null;
  assignedNurseId?: string | null;
  triageReasoning?: string;
  assignedDoctorName?: string;
  assignedNurseName?: string;
}

export interface PaginatedResponse<T> {
  res: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalData: number;
    limit: number;
  };
}

export interface Notification {
  _id: string;
  title: string;
  message: string;
  type: "system" | "assignment" | "lab_result" | "alert";
  isRead: boolean;
  link?: string;
  createdAt: string | number;
}

export interface WebPushSubscription {
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface ActivityLog {
  _id: string;
  user: User; // Who did it?
  action: string; // "Created Exam", "Registered Student"
  details?: string;
  createdAt: Date;
}

export interface invoice {
  _id: string;
  user: User;
  polarCheckoutId?: string; // Links to Polar transaction
  status: "draft" | "pending_payment" | "paid";
  items: Array<{
    description: string; // e.g., "Chest X-Ray"
    quantity: number;
    unitPrice: number; // in cents (Polar uses cents)
    totalPrice: number;
  }>;
  totalAmount: number; // Sum of all items in cents
  createdAt: Date;
}

export interface appointment {
  _id: string;
  patientId: string;
  doctorId: string;
  nurseId?: string;
  date: Date;
  time: string;
  reason: string;
  status: "scheduled" | "confirmed" | "completed" | "cancelled" | "in-progress";
  isVirtual: boolean;
  meetingId: string; // Used as the LiveKit Room Name
  createdAt: Date;
}
