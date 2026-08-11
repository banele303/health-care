import type { Route } from "../+types/root";
import { Activity, Lock, Mail, ChevronRight, AlertCircle, User } from "lucide-react";
import { CustomInput } from "@/components/global/CustomInput";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { useForm } from "react-hook-form";
import { useState } from "react";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useAuthActions, useConvexAuth } from "@convex-dev/auth/react";
import { useNavigate, Navigate } from "react-router"; // Import this to redirect
import { loginSchema } from "@/components/auth/login.schema";
import Loader from "@/components/global/Loader";
import { useQuery, convex } from "@/lib/convex";
import { api } from "@convex/_generated/api";
import { authClient } from "@/lib/auth-client";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Login" },
    { name: "description", content: "Login to our amazing Medflow" },
  ];
}

type LoginFormValues = z.infer<typeof loginSchema>;

const Login = () => {
  const [globalError, setGlobalError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [adminName, setAdminName] = useState("");
  const navigate = useNavigate(); // Hook for redirection
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  const { signIn, signOut } = useAuthActions();
  const { data: session, isPending: isSessionLoading } = authClient.useSession();

  // First-run detection: zero users => show "Create Admin" instead of sign-in.
  const { data: userCount } = useQuery(api.users.count, {});
  const isFirstRun = userCount === 0;

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", rememberMe: false },
  });

  if (isAuthLoading || (isAuthenticated && isSessionLoading)) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <Loader label="Loading..." />
      </div>
    );
  }

  // Redirect if logged in
  if (isAuthenticated) {
    if (!session?.user) {
      // The user document was deleted from the DB but the auth cookie remains.
      signOut();
      return null;
    }
    return <Navigate to="/dashboard" replace />;
  }

  const onSubmit = async (data: LoginFormValues) => {
    setGlobalError("");
    setIsLoading(true);
    try {
      if (isFirstRun) {
        // First run: create the administrator account.
        await signIn("password", {
          email: data.email,
          password: data.password,
          flow: "signUp",
        });
        await convex.mutation(api.users.bootstrapSelfAdmin, {
          name: adminName || "Admin",
        });
        toast.success("Admin account created. Welcome to MedFlow!");
      } else {
        // signIn throws on failure in modern @convex-dev/auth
        await signIn("password", {
          email: data.email,
          password: data.password,
          flow: "signIn",
        });
        toast.success("Login Successful!");
      }
      navigate("/dashboard"); // 👈 Redirect user after login
    } catch (error: any) {
      if (error?.message?.includes("reading '_id'") || error?.message?.includes("already exists")) {
        // Handle orphaned auth account edge-case
        try {
          await convex.mutation(api.users.cleanupOrphans, {});
          setGlobalError("Orphaned account detected and cleaned up. Please try submitting again.");
        } catch(e) {
          setGlobalError(error?.message || "Invalid email or password");
        }
      } else {
        setGlobalError(error?.message || "Invalid email or password");
      }
    } finally {
      setIsLoading(false);
    }
  };
  // console.log(form.formState.errors);
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      <Card className="rounded-lg shadow-2xl card backdrop-blur-xl">
        <CardContent className="p-10 min-w-100 md:min-w-140.5">
          {/* logo */}
          <div className="flex flex-col items-center mb-10">
            <div className="bg-linear-to-tr from-blue-600 to-indigo-600 p-3 rounded-2xl shadow-lg shadow-blue-500/30 mb-4">
              <Activity className="text-white w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {isFirstRun ? "Create Admin Account" : "MedFlow AI"}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-1">
              {isFirstRun
                ? "First run — set up the administrator account"
                : "Secure Provider Portal"}
            </p>
          </div>
          {/* global error */}
          {globalError && (
            <div className="mb-6 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 p-4 rounded-2xl text-sm flex items-center gap-3 border border-red-100 dark:border-red-900/50 animate-in slide-in-from-top-2 fade-in">
              <AlertCircle size={18} className="shrink-0" />
              <span className="font-medium">{globalError}</span>
            </div>
          )}
          {/* form */}
          <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
            {isFirstRun && (
              <Field className="space-y-1.5">
                <FieldLabel
                  htmlFor="adminName"
                  className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1"
                >
                  Full Name
                </FieldLabel>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-primary transition-colors pointer-events-none z-10">
                    <User size={18} />
                  </div>
                  <Input
                    id="adminName"
                    type="text"
                    placeholder="Dr. Jane Smith"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    className="w-full rounded-2xl py-6 pl-12 pr-4 text-sm transition-all outline-none shadow-sm"
                  />
                </div>
              </Field>
            )}
            {/* input(custom) */}
            <CustomInput
              control={form.control}
              name="email"
              label="Email Address"
              placeholder="name@hospital.com"
              type="email"
              startIcon={<Mail size={18} />}
            />
            <CustomInput
              control={form.control}
              name="password"
              label="Password"
              placeholder="••••••••"
              type="password"
              startIcon={<Lock size={18} />}
            />
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  onCheckedChange={(checked) =>
                    form.setValue("rememberMe", checked as boolean)
                  }
                  className="border-slate-200 dark:border-slate-700 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                />
                <label
                  htmlFor="remember"
                  className="text-sm font-medium leading-none text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                >
                  Keep me signed in
                </label>
              </div>
              <button
                type="button"
                className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                Forgot?
              </button>
            </div>
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white rounded-2xl py-6 font-bold text-base shadow-xl shadow-slate-200 dark:shadow-blue-900/20 transition-all active:scale-[0.98] group"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{isFirstRun ? "Creating..." : "Verifying..."}</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  {isFirstRun ? "Create Admin & Enter" : "Sign Into Portal"}
                  <ChevronRight
                    size={18}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </div>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
