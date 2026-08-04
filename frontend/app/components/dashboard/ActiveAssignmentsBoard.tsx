import { useQuery } from "@/lib/convex";
import { api } from "@convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Stethoscope,
  UserCheck,
  Sparkles,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { User } from "@/types";

export default function ActiveAssignmentsBoard() {
  // 1. Get current logged-in user
  const { data: session } = authClient.useSession();
  const currentUser = session?.user;

  // 2. Fetch all patients (realtime via Convex)
  const { data, isLoading, isError } = useQuery(api.users.list, {
    role: "patient",
    limit: 50,
  });

  // Filter only admitted patients who have been assigned a doctor
  const activeAssignments = ((data?.res || []) as User[]).filter(
    (patient: User) =>
      patient.status === "admitted" && patient.assignedDoctorId,
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64 border rounded-xl bg-slate-50/50 dark:bg-slate-900/20">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (isError) {
    return <div className="text-red-500">Failed to load assignments.</div>;
  }

  if (activeAssignments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border border-dashed rounded-xl text-slate-500">
        <Activity className="h-10 w-10 mb-2 opacity-20" />
        <p>No active patient assignments.</p>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">
            Active Roster & Assignments
          </h2>
          <p className="text-sm text-slate-500">
            Overview of current inpatient assignments.
          </p>
        </div>
        <Badge
          variant="secondary"
          className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100"
        >
          {activeAssignments.length} Active
        </Badge>
      </div>
      {/* THE GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {activeAssignments.map((patient) => {
          // --- HIGHLIGHT LOGIC ---
          const isMyPatientAsDoctor =
            currentUser?.role === "doctor" &&
            patient.assignedDoctorId === currentUser?.id;
          const isMyPatientAsNurse =
            currentUser?.role === "nurse" &&
            patient.assignedNurseId === currentUser?.id;
          const isMeAsPatient =
            currentUser?.role === "patient" && patient._id === currentUser?.id;

          const isHighlighted =
            isMyPatientAsDoctor || isMyPatientAsNurse || isMeAsPatient;
          return (
            <Card
              key={patient._id}
              className={cn(
                "overflow-hidden transition-all duration-300 relative",
                isHighlighted
                  ? "ring-2 ring-indigo-500 shadow-lg shadow-indigo-500/10 bg-indigo-50/30 dark:bg-indigo-950/20"
                  : "shadow-md shadow-accent bg-zinc-100 dark:bg-zinc-900",
              )}
            >
              {/* Highlight Ribbon at the top */}
              {isHighlighted && (
                <div className="absolute top-0 left-0 w-full h-1 bg-indigo-600 animate-in fade-in" />
              )}

              <CardHeader className="p-4 pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border border-slate-100 shadow-sm">
                      <AvatarImage src={patient.image || ""} />
                      <AvatarFallback
                        className={
                          isHighlighted ? "bg-indigo-100 text-indigo-700" : ""
                        }
                      >
                        {patient.name
                          .split(" ")
                          .map((n: string) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-bold text-sm leading-tight text-slate-900 dark:text-slate-100">
                        {patient.name}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {patient.age}y • {patient.gender} •{" "}
                        {patient.bloodgroup || "Unknown blood"}
                      </p>
                    </div>
                  </div>
                  {isHighlighted && (
                    <Badge className="bg-indigo-600 hover:bg-indigo-600 text-[10px] uppercase px-1.5 py-0">
                      Your Patient
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-4 pt-3 space-y-3">
                {/* Staff Assignment Grid */}
                <div className="grid grid-cols-2 gap-2">
                  <div
                    className={cn(
                      "p-2 rounded-md border flex flex-col gap-1",
                      isMyPatientAsDoctor
                        ? "bg-indigo-100 border-indigo-200 dark:bg-indigo-900/40 dark:border-indigo-800"
                        : "bg-slate-50 dark:bg-slate-900",
                    )}
                  >
                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Stethoscope size={10} /> Doctor
                    </span>
                    <span
                      className={cn(
                        "text-xs font-semibold truncate",
                        isMyPatientAsDoctor &&
                          "text-indigo-700 dark:text-indigo-300",
                      )}
                    >
                      {patient.assignedDoctorName}
                    </span>
                  </div>

                  <div
                    className={cn(
                      "p-2 rounded-md border flex flex-col gap-1",
                      isMyPatientAsNurse
                        ? "bg-indigo-100 border-indigo-200 dark:bg-indigo-900/40 dark:border-indigo-800"
                        : "bg-slate-50 dark:bg-slate-900",
                    )}
                  >
                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <UserCheck size={10} /> Nurse
                    </span>
                    <span
                      className={cn(
                        "text-xs font-semibold truncate",
                        isMyPatientAsNurse &&
                          "text-indigo-700 dark:text-indigo-300",
                      )}
                    >
                      {patient.assignedNurseName}
                    </span>
                  </div>
                </div>

                {/* Admission Reason */}
                <div className="text-xs">
                  <span className="text-slate-500 block mb-0.5 font-medium">
                    Reason for Admission:
                  </span>
                  <p
                    className="text-slate-700 dark:text-slate-300 line-clamp-2"
                    title={patient.medicalHistory}
                  >
                    {patient.medicalHistory || "No medical history provided."}
                  </p>
                </div>

                {/* AI Reasoning (Collapsible or Truncated) */}
                <div className="text-[13px] bg-indigo-50/50 dark:bg-indigo-950/20 p-2 rounded border border-indigo-100/50 dark:border-indigo-900/50 text-indigo-700 dark:text-indigo-300 flex gap-2">
                  <Sparkles size={12} className="shrink-0 mt-0.5" />
                  <p
                    className="line-clamp-5 italic"
                    title={patient.triageReasoning}
                  >
                    {patient.triageReasoning}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
