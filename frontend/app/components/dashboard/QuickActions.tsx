import CreateUserModal from "@/components/users/CreateUserModal";
import type { Role } from "@/types";

const QuickActions = ({ role }: { role: Role | null | undefined }) => {
  if (role === "patient") return null;

  return (
    <div className="flex items-center gap-2">
      {role === "admin" && (
        <>
          <CreateUserModal role="doctor" />
        </>
      )}
      {["doctor", "nurse", "admin"].includes(role || "") && (
        <CreateUserModal role="patient" />
      )}
    </div>
  );
};

export default QuickActions;
