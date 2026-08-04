import UserManagement from "@/components/users/UserManagement";

export function meta() {
  return [{ title: "Administrators" }];
}

const Admins = () => {
  return (
    <UserManagement
      role="admin"
      title="Administrators"
      description="Manage administrator accounts"
    />
  );
};

export default Admins;
