import { useState } from "react";
import { useQuery } from "@/lib/convex";
import { api } from "@convex/_generated/api";
import CustomPagination from "@/components/global/CustomPagination";
import Loader from "@/components/global/Loader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns"; // Recommended for date formatting
import GlobalSearch from "@/components/global/GlobalSearch";

export function meta() {
  return [{ title: "System Activities" }];
}
const ActivitiesLog = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const limit = 10;

  const { data, isLoading, isError } = useQuery(api.activityLogs.list, {
    page,
    limit,
  });

  if (isLoading)
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader label="Fetching logs..." />
      </div>
    );

  if (isError) {
    return (
      <div className="p-8 text-center text-destructive font-bold">
        Error loading activity logs.
      </div>
    );
  }

  const logs = data?.res || [];
  const pagination = data?.pagination;

  // Optional: Filter local results by name for UX (Full search should be backend-side)
  const filteredLogs = logs?.filter((log) =>
    log?.action.toLowerCase().includes(search.toLowerCase()),
  );
  //   console.log("Filtered Logs:", filteredLogs); // Debugging log
  return (
    <Card className="card shadow-sm border-none">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="font-bold text-xl">System Activities</CardTitle>
          <CardDescription>
            A history of all actions performed by hospital staff.
          </CardDescription>
        </div>
        <GlobalSearch
          search={search}
          setSearch={setSearch}
          title="Search by action..."
        />
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="">
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Date & Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center h-24 text-muted-foreground"
                  >
                    No activity logs found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log._id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={log.user?.image || ""} />
                          <AvatarFallback>
                            {log.user?.name?.charAt(0) || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold">
                            {log.user?.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {log.user?.email}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="default"
                        className="capitalize text-[10px]"
                      >
                        {log.user?.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                        {log.action}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-slate-500 truncate max-w-50 block">
                        {log.details || "---"}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500">
                      {/* Format: Mar 03, 2024 - 02:30 PM */}
                      {format(
                        new Date(log.createdAt),
                        "MMM dd, yyyy - hh:mm a",
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
  );
};

export default ActivitiesLog;
