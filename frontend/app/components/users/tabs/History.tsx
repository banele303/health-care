import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Sparkles } from "lucide-react";
import type { User as UserType } from "@/types";

export default function History({ user }: { user: UserType }) {
  return (
    <div className="space-y-4">
      <Card className="bg-linear-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20 border-indigo-100 dark:border-indigo-900 shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-indigo-600" />
            <CardTitle className="text-base text-indigo-900 dark:text-indigo-300">
              AI Medical Summary
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            Based on recent records, the patient shows a history of{" "}
            {user.medicalHistory || "no significant issues"}. Current vitals are
            stable. Recommendation: Monitor blood pressure during observation.
          </p>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <h3 className="font-semibold flex items-center gap-2 text-sm">
          <FileText className="h-4 w-4" /> Patient Records
        </h3>
        <div className="p-4 rounded-lg border bg-white dark:bg-slate-900 text-sm shadow-sm">
          {user.medicalHistory || "No medical history recorded."}
        </div>
      </div>
    </div>
  );
}
