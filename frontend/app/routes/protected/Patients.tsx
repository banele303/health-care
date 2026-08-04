import UserManagement from "@/components/users/UserManagement";

export function meta() {
  return [{ title: "Patients" }];
}

const Patients = () => {
  return (
    <UserManagement
      role="patient"
      title="Patient Directory"
      description="Manage and track patient admissions and history."
    />
  );
};

export default Patients;
