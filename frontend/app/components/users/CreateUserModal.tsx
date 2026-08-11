import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import type { Role, User } from "@/types";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Plus,
  Mail,
  Lock,
  Building2,
  FileHeart,
  UserIcon,
  Pencil,
} from "lucide-react";
import { CustomInput } from "@/components/global/CustomInput";
import { CustomSelect } from "@/components/global/CustomSelect";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  type UserValues,
  GENDER_OPTIONS,
  BLOOD_GROUP_OPTIONS,
  SPECIALIZATION_OPTIONS,
  PATIENT_STATUS_OPTIONS,
  STAFF_STATUS_OPTIONS,
  userSchema,
} from "./create-user-schema";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { useMutation } from "@/lib/convex";
import { api } from "@convex/_generated/api";

interface UserModalProps {
  role: Role;
  user?: User;
  loading?: boolean;
}

const CreateUserModal = ({ role, user, loading }: UserModalProps) => {
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false); // Local loading for Create

  const isEdit = !!user;
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);

  const schema = userSchema(isEdit);
  const form = useForm<UserValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      specialization: "",
      department: "",
      age: "",
      gender: "",
      bloodgroup: "",
      medicalHistory: "",
      status: role === "patient" ? "admitted" : "active",
    },
  });
  // Reset form logic...
  useEffect(() => {
    if (open) {
      if (user) {
        form.reset({
          name: user.name,
          email: user.email,
          password: "",
          status: user.status as string,
          specialization: user.specialization || "",
          department: user.department || "",
          age: user.age || "",
          gender: user.gender || "",
          bloodgroup: user.bloodgroup || "",
          medicalHistory: user.medicalHistory || "",
        });
      } else {
        form.reset({
          name: "",
          email: "",
          password: "",
          status: role === "patient" ? "admitted" : "active",
          specialization: "",
          department: "",
          age: "",
          gender: "",
          bloodgroup: "",
          medicalHistory: "",
        });
      }
    }
  }, [open, user, form, role]);
  //   console.log(user);

  // Mutation for patient admission trigger
  const admitMutation = useMutation(api.users.admit);

  // update mutation
  const updateMutation = useMutation(api.users.update);

  // activity mutation
  const activityMutation = useMutation(api.activityLogs.create);

  const onSubmit = async (data: UserValues) => {
    // Prepare flattened payload
    const payload: any = {
      name: data.name,
      email: data.email,
      role: role,
      status: data.status,
    };

    // Add role specific fields
    if (role === "doctor") {
      payload.specialization = data.specialization;
      payload.department = data.department;
    } else if (role === "patient") {
      payload.age = data.age;
      payload.gender = data.gender;
      payload.bloodgroup = data.bloodgroup;
      payload.medicalHistory = data.medicalHistory;
    } else if (["nurse", "lab_tech", "pharmacist"].includes(role)) {
      payload.department = data.department;
    }

    if (isEdit && user) {
      // --- UPDATE (Using Convex Mutation) ---
      // If password is provided, add it to payload
      if (data.password) {
        payload.password = data.password;
      }

      // Trigger Mutation (strip password + undefined — Convex validates args exactly)
      const { password: _pw, ...rest } = payload;
      const cleanArgs = Object.fromEntries(
        Object.entries(rest).filter(([, v]) => v !== undefined && v !== null),
      );
      updateMutation
        .mutateAsync({ id: user._id, ...cleanArgs })
        .then(() => {
          toast.success("User updated successfully!");
          setOpen(false);
          form.reset();
        })
        .catch((error: any) => {
          toast.error(error.message || "Failed to update user");
        });
    } else {
      // create
      setIsCreating(true);
      const { error, data: createdUser } = await authClient.admin.createUser({
        name: data.name,
        email: data.email,
        password: data.password!,
        // @ts-ignore
        role: role,
        // authClient needs `data: {}`.
        data: {
          ...payload, // Pass the custom fields here for creation
        },
      });

      if (error) {
        setIsCreating(false);
        toast.error(error.message || "Failed to create user");
        return;
      }
      if (createdUser && role === "patient" && data.status === "admitted") {
        // handle admission(trigger)
        admitMutation.mutate({
          patientId: createdUser.user.id,
          admissionReason: data.medicalHistory || "General Admission",
        });
      }
      toast.success(`${roleLabel} created successfully!`);
      activityMutation.mutate({
        userId: createdUser.user.id,
        action: "create",
        details: `${roleLabel} account created for ${createdUser.user.name}`,
      });
      setOpen(false);
      form.reset();
      setIsCreating(false);
    }
  };

  const isLoading =
    loading ||
    isCreating ||
    admitMutation.isPending ||
    updateMutation.isPending ||
    activityMutation.isPending;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="outline" disabled={loading}>
            Edit
          </Button>
        ) : (
          <Button className="gap-2">
            <Plus size={16} /> Add {roleLabel}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl min-w-xl max-h-[98vh] overflow-y-auto card">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit" : "Add New"} {roleLabel}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? `Update details for ${user?.name}.`
              : `Enter details to create a new ${roleLabel} account.`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <CustomInput
            control={form.control}
            name="name"
            label="Full Name"
            placeholder="John Doe"
            startIcon={<UserIcon size={18} />}
          />

          <CustomInput
            control={form.control}
            name="email"
            label="Email Address"
            type="email"
            placeholder="john@hospital.com"
            startIcon={<Mail size={18} />}
          />

          <CustomInput
            control={form.control}
            name="password"
            label={isEdit ? "New Password (Optional)" : "Password"}
            type="password"
            placeholder={isEdit ? "Leave blank to keep current" : "••••••••"}
            startIcon={<Lock size={18} />}
          />

          {/* ... Role specific inputs (Doctor/Patient/Nurse) ... */}
          {/* --- DOCTOR FIELDS --- */}
          {role === "doctor" && (
            <>
              <CustomSelect
                control={form.control}
                name="specialization"
                label="Specialization"
                placeholder="Select Specialization"
                options={SPECIALIZATION_OPTIONS}
              />
              <CustomInput
                control={form.control}
                name="department"
                label="Department"
                placeholder="e.g. Cardiology Wing A"
                startIcon={<Building2 size={18} />}
              />
            </>
          )}
          {/* --- PATIENT FIELDS --- */}
          {role === "patient" && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <CustomInput
                  control={form.control}
                  name="age"
                  label="Age"
                  type="number"
                  placeholder="e.g. 34"
                />
                <CustomSelect
                  control={form.control}
                  name="gender"
                  label="Gender"
                  options={GENDER_OPTIONS}
                />
              </div>
              <CustomSelect
                control={form.control}
                name="bloodgroup"
                label="Blood Group"
                options={BLOOD_GROUP_OPTIONS}
              />
              <CustomInput
                control={form.control}
                name="medicalHistory"
                label="Medical History / Allergies / Reason for Admission"
                placeholder="Peanuts, Penicillin..."
                startIcon={<FileHeart size={18} />}
              />
            </>
          )}
          <CustomSelect
            control={form.control}
            name="status"
            label="Status"
            placeholder="Select Status"
            options={
              role === "patient" ? PATIENT_STATUS_OPTIONS : STAFF_STATUS_OPTIONS
            }
          />
          {["nurse", "lab_tech", "pharmacist"].includes(role) && (
            <CustomInput
              control={form.control}
              name="department"
              label="Department"
              placeholder="e.g. ICU, Lab, Pharmacy"
              startIcon={<Building2 size={18} />}
            />
          )}
          {/* footer */}
          <DialogFooter className="mt-6 border-none">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Update" : "Create"} Account
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateUserModal;
