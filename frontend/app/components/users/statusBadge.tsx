import {
  CheckCircle2,
  Clock,
  Home,
  Activity,
  AlertCircle,
  LogOut,
} from "lucide-react";

export const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon?: any }
> = {
  // --- Patient ---
  admitted: {
    label: "Admitted",
    color: "bg-orange-100 text-orange-700 border-orange-200",
    icon: Home,
  },
  in_treatment: {
    label: "In Treatment",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: Activity,
  },
  observation: {
    label: "Observation",
    color: "bg-yellow-100 text-yellow-700 border-yellow-200",
    icon: Clock,
  },
  discharged: {
    label: "Discharged",
    color: "bg-green-100 text-green-700 border-green-200",
    icon: CheckCircle2,
  },
  follow_up: {
    label: "Follow Up",
    color: "bg-purple-100 text-purple-700 border-purple-200",
    icon: AlertCircle,
  },

  // --- Staff ---
  active: {
    label: "Active",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
  },
  on_leave: {
    label: "On Leave",
    color: "bg-slate-100 text-slate-700 border-slate-200",
    icon: Clock,
  },
  resigned: {
    label: "Resigned",
    color: "bg-red-50 text-red-700 border-red-200",
    icon: LogOut,
  },
};
