import type { Role } from "@/types";
import {
  LayoutDashboard,
  Users,
  ClipboardPlus,
  Stethoscope,
  ReceiptCent,
  MessagesSquare,
} from "lucide-react";

export interface NavItem {
  title: string;
  url: string;
  icon?: any;
  allowedRoles: Role[];
  items?: {
    title: string;
    url: string;
    allowedRoles?: Role[];
  }[];
}

// Only links to routes that actually exist in app/routes.ts
export const navConfig: {
  navMain: NavItem[];
  navAdmin: NavItem[];
  navSecondary: NavItem[];
} = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard,
      allowedRoles: ["admin", "doctor", "nurse", "pharmacist", "lab_tech"],
      items: [
        { title: "Overview", url: "/dashboard" },
        { title: "Activities Log", url: "/activities-log" },
      ],
    },
    {
      title: "Administrators",
      url: "/admins",
      icon: Users,
      allowedRoles: ["admin"],
      items: [{ title: "All Administrators", url: "/admins" }],
    },
    {
      title: "Patients",
      url: "/patients",
      icon: Users,
      allowedRoles: ["admin", "doctor", "nurse"],
      items: [{ title: "All Patients", url: "/patients" }],
    },
    {
      title: "Nursing Station",
      url: "/nurses",
      icon: ClipboardPlus,
      allowedRoles: ["admin"],
      items: [{ title: "Nurses", url: "/nurses" }],
    },
    {
      title: "Doctors",
      url: "/doctors",
      icon: Stethoscope,
      allowedRoles: ["admin", "doctor"],
      items: [{ title: "Doctors", url: "/doctors" }],
    },
    {
      title: "Financial Records",
      url: "/financial-history",
      icon: ReceiptCent,
      allowedRoles: ["admin", "doctor"],
      items: [{ title: "History", url: "/financial-history" }],
    },
    {
      title: "CRM & AI Emails",
      url: "/crm",
      icon: MessagesSquare,
      allowedRoles: ["admin", "doctor", "nurse"],
      items: [
        { title: "Patient CRM", url: "/crm" },
      ],
    },
  ],
  navAdmin: [],
  navSecondary: [],
};

// Helper function to find a route configuration by URL
export function getRouteConfig(path: string, items: NavItem[]): NavItem | null {
  for (const item of items) {
    if (item.url === path) return item;
    if (item.items) {
      const found = item.items.find((sub) => sub.url === path);
      if (found)
        return {
          ...found,
          allowedRoles: found.allowedRoles || item.allowedRoles,
        } as NavItem;
    }
  }
  return null;
}
