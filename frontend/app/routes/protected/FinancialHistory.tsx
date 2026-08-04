import { useState } from "react";
import { useQuery } from "@/lib/convex";
import { api } from "@convex/_generated/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Receipt,
  CheckCircle2,
  DollarSign,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import CustomPagination from "@/components/global/CustomPagination";
import Loader from "@/components/global/Loader";
import GlobalSearch from "@/components/global/GlobalSearch";
import { toast } from "sonner";

export function meta() {
  return [{ title: "Financial History | MedFlow AI" }];
}

const FinancialHistory = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const { data, isLoading, isError } = useQuery(api.invoices.all, {
    page,
    limit: 10,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader label="Loading Financial Records..." />
      </div>
    );
  }
  if (isError) {
    return (
      <div className="p-10 text-center text-red-500">
        Error loading financial history.
      </div>
    );
  }

  const invoices = data?.res || [];
  const pagination = data?.pagination;

  // Optional: Filter local results by name for UX (Full search should be backend-side)
  const filteredInvoices = invoices.filter((inv) =>
    inv.user?.name.toLowerCase().includes(search.toLowerCase()),
  );

  // Helper for Status Badge
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
        return (
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 gap-1">
            <CheckCircle2 size={12} /> Paid
          </Badge>
        );
      case "pending_payment":
        return (
          <Badge className="bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 gap-1">
            <Clock size={12} /> Pending
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="gap-1">
            <Receipt size={12} /> Draft
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Revenue Ledger
          </h1>
          <p className="text-slate-500 font-medium">
            Detailed tracking of all hospital financial transactions.
          </p>
        </div>
      </div>

      {/* --- FINANCIAL OVERVIEW CARDS --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="card shadow-sm rounded-xl">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div className="p-2 bg-white/20 rounded-xl">
                <DollarSign size={20} />
              </div>
              <Badge className="bg-white/20 text-white border-none">
                +12.5%
              </Badge>
            </div>
            <div className="mt-4">
              <p className="text-blue-100 text-sm font-medium">Total Billed</p>
              <h3 className="text-2xl font-black mt-1">
                $
                {(
                  invoices.reduce(
                    (sum: number, inv: any) => sum + (inv.totalAmount || 0),
                    0,
                  ) / 100
                ).toLocaleString()}
              </h3>
            </div>
          </CardContent>
        </Card>
        <Card className="card shadow-sm rounded-xl">
          <CardContent className="p-6">
            <div className="flex justify-between items-start text-emerald-600">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl">
                <CheckCircle2 size={20} />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-slate-500 text-sm font-medium">
                Successfully Paid
              </p>
              <h3 className="text-2xl font-black mt-1 text-slate-900 dark:text-white">
                {invoices.filter((i: any) => i.status === "paid").length}{" "}
                Invoices
              </h3>
            </div>
          </CardContent>
        </Card>
        <Card className="card shadow-sm rounded-xl">
          <CardContent className="p-6">
            <div className="flex justify-between items-start text-amber-600">
              <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-xl">
                <Clock size={20} />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-slate-500 text-sm font-medium">
                Awaiting Payment
              </p>
              <h3 className="text-2xl font-black mt-1 text-slate-900 dark:text-white">
                {
                  invoices.filter((i: any) => i.status === "pending_payment")
                    .length
                }{" "}
                Invoices
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* --- MAIN TABLE --- */}
      <Card className="card shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="flex justify-between">
          <div className="">
            <CardTitle className="text-lg">Recent Invoices</CardTitle>
            <CardDescription>
              Click on an invoice to view full itemized breakdown.
            </CardDescription>
          </div>
          {/* Quick Search */}
          <GlobalSearch
            search={search}
            setSearch={setSearch}
            title="Search user..."
          />
        </CardHeader>
        <CardContent className="">
          <div className="rounded-md border">
            <Table>
              <TableHeader className="">
                <TableRow>
                  <TableHead className="w-75 pl-6 font-bold">Patient</TableHead>
                  <TableHead className="font-bold text-center">
                    Amount
                  </TableHead>
                  <TableHead className="font-bold text-center">
                    Status
                  </TableHead>
                  <TableHead className="font-bold text-center">Date</TableHead>
                  <TableHead className="text-right pr-6 font-bold">
                    Polar Reference
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-40 text-center text-slate-400 italic"
                    >
                      No invoices found matching your criteria.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredInvoices.map((inv) => (
                    <TableRow
                      key={inv._id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <TableCell className="pl-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border border-slate-100">
                            <AvatarImage src={inv.user?.image || ""} />
                            <AvatarFallback className="font-bold text-xs bg-blue-50 text-blue-600">
                              {inv.user?.name
                                .split(" ")
                                .map((n: any) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                              {inv.user?.name}
                            </span>
                            <span className="text-[11px] text-slate-500 truncate max-w-45">
                              {inv.user?.email}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-black text-slate-900 dark:text-white">
                        ${(inv.totalAmount / 100).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(inv.status)}
                      </TableCell>
                      <TableCell className="text-center text-sm text-slate-500">
                        {inv.createdAt
                          ? format(new Date(inv.createdAt), "MMM dd, yyyy")
                          : "---"}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        {inv.polarCheckoutId ? (
                          <span className="text-[11px] font-mono text-slate-400">
                            {inv.polarCheckoutId.slice(0, 8)}...
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300 italic">
                            Not processed
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <CustomPagination
              loading={isLoading}
              totalPages={pagination?.totalPages || 0}
              currentPage={pagination?.currentPage || 0}
              setPage={setPage}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancialHistory;
