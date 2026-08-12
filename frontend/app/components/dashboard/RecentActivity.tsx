import { useQuery } from "@/lib/convex";
import { api } from "@convex/_generated/api";
import {
  FileText,
  UserPlus,
  Activity,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns"; // Standard for "2 mins ago"

// Helper to map action strings to specific icons and colors
const getActionConfig = (action: string) => {
  const a = action.toLowerCase();
  if (a.includes("admit") || a.includes("register")) {
    return {
      icon: UserPlus,
      color:
        "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
    };
  }
  if (a.includes("lab") || a.includes("x-ray") || a.includes("analyze")) {
    return {
      icon: FileText,
      color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    };
  }
  if (a.includes("discharge") || a.includes("paid")) {
    return {
      icon: CheckCircle2,
      color:
        "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
    };
  }
  if (a.includes("error") || a.includes("ban")) {
    return {
      icon: AlertCircle,
      color: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
    };
  }
  return {
    icon: Activity,
    color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
  };
};

export function RecentActivity() {
  // 1. Fetch data using Convex (realtime)
  const { data, isLoading, isError } = useQuery(api.activityLogs.list, {
    page: 1,
    limit: 5, // Show last 5 items
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
      </div>
    );
  }

  if (isError)
    return (
      <div className="text-center py-10">
        <Activity className="h-8 w-8 text-slate-200 mx-auto mb-2" />
        <p className="text-sm text-slate-400 italic">No recent activity recorded yet.</p>
      </div>
    );

  const logs = data?.res || [];

  return (
    <div className="space-y-6 min-h-77">
      {logs.length === 0 ? (
        <div className="text-center py-10">
          <Activity className="h-8 w-8 text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-400 italic">
            No recent activity found.
          </p>
        </div>
      ) : (
        logs.map((log) => {
          const { icon: Icon, color } = getActionConfig(log.action);

          return (
            <div key={log._id} className="flex gap-4 group transition-all">
              {/* Icon Side */}
              <div
                className={cn(
                  "p-2.5 rounded-xl shrink-0 h-10 w-10 flex items-center justify-center transition-transform group-hover:scale-110",
                  color,
                )}
              >
                <Icon size={18} />
              </div>

              {/* Text Content */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                    {log.action}
                  </p>
                  <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0 mt-0.5">
                    {formatDistanceToNow(new Date(log.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
                <p className="text-xs text-slate-500 truncate leading-relaxed">
                  <span className="font-semibold text-slate-700 dark:text-slate-400">
                    {log.user?.name}
                  </span>
                  {log.details ? ` • ${log.details}` : ""}
                </p>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
