import {
  User,
  Mail,
  Calendar,
  Droplets,
  Activity,
  type LucideIcon,
} from "lucide-react";
import type { User as UserType } from "@/types";

function InfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value?: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg shadow-sm border border-slate-100 bg-white dark:border-slate-800 dark:bg-zinc-950 truncate">
      <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-md">
        <Icon size={16} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
          {value || "N/A"}
        </p>
      </div>
    </div>
  );
}

export default function Profile({ user }: { user: UserType }) {
  const isPatient = user.role === "patient";

  return (
    <div className="grid grid-cols-2 gap-4">
      <InfoItem icon={Mail} label="Email" value={user.email} />
      <InfoItem
        icon={Calendar}
        label="Joined"
        value={new Date(user.createdAt ?? 0).toLocaleDateString()}
      />

      {isPatient ? (
        <>
          <InfoItem icon={User} label="Age" value={user.age} />
          <InfoItem icon={User} label="Gender" value={user.gender} />
          <InfoItem
            icon={Droplets}
            label="Blood Group"
            value={user.bloodgroup}
          />
        </>
      ) : (
        <>
          <InfoItem
            icon={Activity}
            label="Department"
            value={user.department}
          />
          {user.role === "doctor" && (
            <InfoItem
              icon={Activity}
              label="Specialization"
              value={user.specialization}
            />
          )}
        </>
      )}
    </div>
  );
}
