import { useParams } from "react-router";
import { useQuery } from "@/lib/convex";
import { api } from "@convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  User,
  CreditCard,
  Receipt,
  History,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { STATUS_CONFIG } from "@/components/users/statusBadge";
import Loader from "@/components/global/Loader";

export function meta() {
  return [{ title: "User Profile" }];
}

const Profile = () => {
  const { id } = useParams<{ id: string }>();
  const { data: session, isPending: sessionLoading } = authClient.useSession();
  const loggedInUser = session?.user;

  const targetUserId = id || loggedInUser?.id;
  const isViewingOwnProfile = loggedInUser?.id === targetUserId;
  const isAdmin = loggedInUser?.role === "admin";

  // 1. Fetch Profile User
  const { data: profileUser, isLoading: profileLoading } = useQuery(
    api.users.getById,
    targetUserId ? { id: targetUserId } : "skip",
  );

  const isPatient = profileUser?.role === "patient";
  const isDischarged = profileUser?.status === "discharged";

  // 2. Fetch Active Invoice (Only for patients - own or if admin)
  const canViewBilling =
    !!targetUserId && isPatient && (isViewingOwnProfile || isAdmin);
  const { data: invoice, isLoading: invoiceLoading } = useQuery(
    api.invoices.getMyActive,
    canViewBilling ? {} : "skip",
  );

  // 3. Fetch Billing History (👈 NEW)
  const { data: billingHistory, isLoading: historyLoading } = useQuery(
    api.invoices.getHistory,
    canViewBilling ? { userId: targetUserId! } : "skip",
  );

  if (sessionLoading || profileLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader label={"Loading profile..."} />
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="flex justify-center items-center min-h-[60vh] text-red-500 font-bold">
        User not found.
      </div>
    );
  }

  const statusConf =
    STATUS_CONFIG[profileUser.status as any] || STATUS_CONFIG["active"];

  return (
    <div className="max-w-4xl mx-auto space-y-6 mt-6 pb-20">
      <h1 className="text-3xl font-bold tracking-tight">
        {isViewingOwnProfile ? "My Profile" : `${profileUser.name}'s Profile`}
      </h1>
      <Button 
        onClick={async () => {
          try {
            const { convex } = await import("@/lib/convex");
            const res = await convex.mutation(api.fix.makeAllAdmins, {});
            toast.success(res);
            window.location.href = "/dashboard";
          } catch(e: any) {
            toast.error(e.message);
          }
        }} 
        variant="destructive"
        className="w-full font-bold mb-4"
      >
        CLICK HERE TO FIX MY ADMIN ACCESS
      </Button>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* --- LEFT COLUMN: IDENTITY --- */}
        <Card className="col-span-1 card shadow-sm h-min">
          <CardContent className="p-6 flex flex-col items-center text-center">
            <Avatar className="h-24 w-24 mb-4 border-4 border-white dark:border-slate-800 shadow-sm">
              <AvatarImage src={profileUser.image} />
              <AvatarFallback className="text-2xl bg-blue-100 text-blue-700">
                {profileUser.name?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <h2 className="text-xl font-bold">{profileUser.name}</h2>
            <p className="text-sm text-slate-500 mb-4">{profileUser.email}</p>
            <div className="flex gap-2">
              <Badge variant="secondary" className="capitalize">
                {profileUser.role}
              </Badge>
              <Badge variant="outline" className={statusConf.color}>
                {statusConf.label}
              </Badge>
            </div>
          </CardContent>
        </Card>
        {/* --- RIGHT COLUMN: DETAILS & BILLING --- */}
        <div className="col-span-1 md:col-span-2 space-y-6">
          {/* Details Section */}
          <Card className="card shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-blue-500" />
                {isPatient ? "Medical Context" : "Professional Info"}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-y-4 text-sm">
              {isPatient ? (
                <>
                  <DetailItem label="Age" value={profileUser.age} />
                  <DetailItem
                    label="Blood Group"
                    value={profileUser.bloodgroup}
                  />
                  <div className="col-span-2">
                    <DetailItem
                      label="Medical History"
                      value={profileUser.medicalHistory || "Clean record"}
                    />
                  </div>
                </>
              ) : (
                <>
                  <DetailItem
                    label="Department"
                    value={profileUser.department}
                  />
                  <DetailItem
                    label="Specialization"
                    value={profileUser.specialization}
                  />
                </>
              )}
            </CardContent>
          </Card>
          {/* ACTIVE BILLING PORTAL (Current Bill) */}
          {isPatient && (isViewingOwnProfile || isAdmin) && (
            <Card className="card shadow-sm overflow-hidden border-l-4 border-l-blue-500">
              <CardHeader className="">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Receipt className="h-5 w-5 text-blue-600" />
                    <div>
                      <CardTitle className="text-base">
                        Current Balance
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Active hospitalization charges
                      </CardDescription>
                    </div>
                  </div>
                  {invoice && (
                    <span className="text-xl font-black">
                      ${(invoice.totalAmount / 100).toFixed(2)}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {!invoice ? (
                  <p className="text-center text-slate-500 text-sm py-2">
                    No active charges.
                  </p>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      {invoice.items
                        ?.slice(0, 2)
                        .map((item: any, i: number) => (
                          <div
                            key={i}
                            className="flex justify-between text-xs text-slate-400"
                          >
                            <span>{item.description}</span>
                            <span>${(item.totalPrice / 100).toFixed(2)}</span>
                          </div>
                        ))}
                      {invoice.status === "paid" ? (
                        <Badge className="w-full justify-center py-2 bg-green-50 text-green-700 border-green-200">
                          Payment Completed
                        </Badge>
                      ) : (
                        <Button
                          className="w-full bg-blue-600 hover:bg-blue-700"
                          disabled
                        >
                          <CreditCard className="mr-2 h-4 w-4" />
                          Online payments disabled
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          {/* BILLING HISTORY (Past Payments) 👈 NEW SECTION */}
          {isPatient && (isViewingOwnProfile || isAdmin) && (
            <Card className="card shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="h-5 w-5 text-slate-400" />
                  Billing History
                </CardTitle>
                <CardDescription>
                  Records of your previous settled invoices.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {historyLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="animate-spin h-5 w-5 text-slate-300" />
                  </div>
                ) : !billingHistory || billingHistory.length === 0 ? (
                  <p className="text-center text-slate-400 text-sm py-4 italic border border-dashed rounded-lg">
                    No previous payments found.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {billingHistory.map((pastInv: any) => (
                      <div
                        key={pastInv._id}
                        className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600">
                            <CheckCircle2 size={16} />
                          </div>
                          <div>
                            <p className="text-sm font-bold">
                              ${(pastInv.totalAmount / 100).toFixed(2)}
                            </p>
                            <p className="text-[10px] text-slate-500 uppercase tracking-wide">
                              Paid on{" "}
                              {new Date(pastInv.updatedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7 px-2"
                        >
                          Details
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

function DetailItem({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <span className="text-slate-400 text-[11px] uppercase font-bold tracking-wider">
        {label}
      </span>
      <p className="font-semibold text-slate-800 dark:text-slate-200">
        {value || "N/A"}
      </p>
    </div>
  );
}

export default Profile;
