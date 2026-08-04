import UserManagement from "@/components/users/UserManagement";

export function meta() {
  return [{ title: "Doctors" }];
}
const Doctors = () => {
  return (
    <UserManagement
      role="doctor"
      title="Doctors"
      description="Manage doctor accounts"
    />
  );
};

export default Doctors;
