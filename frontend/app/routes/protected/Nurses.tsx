import UserManagement from "@/components/users/UserManagement";

export function meta() {
  return [{ title: "Nurses" }];
}

const Nurses = () => {
  return (
    <UserManagement
      role="nurse"
      title="Nurses Directory"
      description="Manage and track Nurses and history."
    />
  );
};

export default Nurses;
