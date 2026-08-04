import { authClient } from "@/lib/auth-client";
import type { Role, User, UserStatus } from "@/types";
import { useState } from "react";
import { useQuery, useMutation } from "@/lib/convex";
import { api } from "@convex/_generated/api";
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
import { Button } from "@/components/ui/button";
import { STATUS_CONFIG } from "./statusBadge";
import { toast } from "sonner";
import GlobalSearch from "@/components/global/GlobalSearch";
import CustomPagination from "@/components/global/CustomPagination";
import CreateUserModal from "./CreateUserModal";
import { DetailsSheet } from "./DetailsSheet";
import StatsCards from "@/components/global/StatsCards";

interface UserManagementProps {
  role: Role;
  title: string;
  description: string;
}

const UserManagement = ({ role, title, description }: UserManagementProps) => {
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const { data: session } = authClient.useSession();

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setIsSheetOpen(true);
  };

  //   fetch using convex (realtime — no socket refetching needed)
  const { data, isLoading, isError } = useQuery(api.users.list, {
    role,
    page,
    limit: 10,
  });

  const users = (data?.res || []) as User[];
  const pagination = data?.pagination;

  // activity mutation
  const activityMutation = useMutation(api.activityLogs.create);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader label={`Loading ${title}...`} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <h1 className="text-xl font-bold text-red-500">
          Failed to load data. Please refresh.
        </h1>
      </div>
    );
  }

  // filter
  const filteredUsers = users?.filter((user) =>
    user?.name.toLowerCase().includes(search.toLowerCase()),
  );

  // bun users
  const banUser = async (banned: boolean, userId: string) => {
    try {
      setLoading(true);
      if (banned) {
        await authClient.admin.unbanUser({ userId });
        toast.success("User has been unbanned successfully.");
        activityMutation.mutate({
          userId: session?.user.id!,
          action: "ban",
          details: `Unbanned user with ID: ${userId}`,
        });
        setLoading(false);
      } else {
        await authClient.admin.banUser({ userId });
        toast.success("User has been banned successfully.");
        setLoading(false);
        activityMutation.mutate({
          userId: session?.user.id!,
          action: "ban",
          details: `Banned user with ID: ${userId}`,
        });
      }
    } catch (error) {
      setLoading(false);
      console.error("Error banning/unbanning user:", error);
      toast.error("An error occurred. Please try again.");
    }
  };

  // delete
  const deleteUser = async (userId: string) => {
    try {
      setLoading(true);
      const { error } = await authClient.admin.removeUser({ userId });
      if (error) {
        toast.error("Failed to delete user.");
        setLoading(false);
      } else {
        toast.success("User has been deleted successfully.");
        setLoading(false);
        activityMutation.mutate({
          userId: session?.user.id!,
          action: "delete",
          details: `Deleted user with ID: ${userId}`,
        });
      }
    } catch (error) {
      setLoading(false);
      console.error("Error deleting user:", error);
      toast.error("An error occurred. Please try again.");
    }
  };
  return (
    <div className="space-y-6">
      {/* startcards */}
      <StatsCards data={users} />
      {/* userDetailsSheet */}
      <DetailsSheet
        user={selectedUser}
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
      />
      <Card className="card shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="flex gap-2">
            <GlobalSearch
              search={search}
              setSearch={setSearch}
              title={`Search ${title}`}
            />
            <CreateUserModal role={role} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-zinc-300 dark:border-zinc-700">
            <Table>
              <TableHeader>
                <TableRow className="">
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  {role === "doctor" && <TableHead>Specialization</TableHead>}
                  {role === "patient" && (
                    <>
                      <TableHead>Age</TableHead>
                      <TableHead>Gender</TableHead>
                      <TableHead>Blood Group</TableHead>
                    </>
                  )}
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">View</TableHead>

                  <TableHead className="text-right">Edit | Delete</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers?.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center h-24 text-muted-foreground"
                    >
                      No records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers?.map((user) => (
                    <TableRow key={user._id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.image || ""} />
                            <AvatarFallback>
                              {user.name
                                .split(" ")
                                .map((n: string) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          {user.name}
                        </div>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>

                      {role === "doctor" && (
                        <TableCell>
                          <Badge variant="secondary">
                            {user.specialization || "General"}
                          </Badge>
                        </TableCell>
                      )}
                      {role === "patient" && (
                        <>
                          <TableCell>{user.age || "N/A"}</TableCell>
                          <TableCell>{user.gender || "N/A"}</TableCell>
                          <TableCell>
                            {user.bloodgroup ? (
                              <Badge
                                variant="outline"
                                className="text-red-500 border-red-200 bg-red-50"
                              >
                                {user.bloodgroup}
                              </Badge>
                            ) : (
                              "N/A"
                            )}
                          </TableCell>
                        </>
                      )}
                      <TableCell>
                        {(() => {
                          const config =
                            STATUS_CONFIG[user.status as UserStatus] ||
                            STATUS_CONFIG["active"];
                          const Icon = config.icon;

                          return (
                            <Badge
                              variant="outline"
                              className={`gap-1.5 ${config.color}`}
                            >
                              {Icon && <Icon size={12} />}
                              {config.label}
                            </Badge>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewUser(user)}
                          >
                            View
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="float-right">
                        <div className="flex justify-end gap-2">
                          <CreateUserModal
                            role={role}
                            user={user}
                            loading={loading}
                          />
                          {session?.user.role === "admin" && (
                            <>
                              <Button
                                onClick={() => banUser(!!user?.banned, user._id)}
                                variant="outline"
                                size="sm"
                                disabled={loading}
                              >
                                {user.banned ? "Unban" : "Ban"}
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => deleteUser(user._id)}
                                disabled={loading}
                              >
                                Delete
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {/* pagination */}
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

export default UserManagement;
