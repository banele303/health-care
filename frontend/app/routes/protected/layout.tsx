import { Navigate, Outlet, useLocation, useNavigate } from "react-router";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import type { Role } from "@/types";
import Loader from "@/components/global/Loader";
import { AppSidebar } from "@/components/navigation/app-sidebar";
import { useEffect } from "react";
import { toast } from "sonner";
import { getRouteConfig, navConfig } from "@/components/navigation/nav-config";
import Header from "@/components/navigation/Header";

const Layout = () => {
  const { data: session, isPending } = authClient.useSession();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const userRole = (session?.user?.role as Role) || "patient";

  useEffect(() => {
    if (isPending) return;

    // 2. Find configuration for current path
    // We combine all arrays to search through everything
    const allNavItems = [...navConfig.navMain];
    const currentRouteConfig = getRouteConfig(pathname, allNavItems);

    // 3. Check Permissions
    if (currentRouteConfig) {
      const hasAccess = currentRouteConfig.allowedRoles.includes(userRole);

      if (!hasAccess) {
        toast.error("Unauthorized Access");
        // Redirect to a safe page based on role, or just dashboard
        navigate("/dashboard", { replace: true });
      }
    }
  }, [pathname, userRole, isPending, navigate]);

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader label="Initializing Medflolw..." />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-card/50">
        <Header />
        <main className="px-4 my-4">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default Layout;
