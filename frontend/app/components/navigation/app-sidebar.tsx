"use client";
import { Link, useLocation } from "react-router";
import { Activity, ChevronRight } from "lucide-react";

import { NavUser } from "@/components/navigation/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { authClient } from "@/lib/auth-client";
import { navConfig } from "./nav-config";
import type { Role } from "@/types";

interface NavItem {
  title: string;
  url: string;
  icon?: React.ElementType;
  allowedRoles: Role[];
  items?: {
    title: string;
    url: string;
    allowedRoles?: Role[];
  }[];
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { pathname } = useLocation();
  const { data: session } = authClient.useSession();
  const userRole = (session?.user?.role as Role) || "patient";

  const filterNav = (items: NavItem[]) => {
    return items.filter((item) => item.allowedRoles.includes(userRole));
  };
  const filteredMain = filterNav(navConfig.navMain);
  const filteredAdmin = filterNav(navConfig.navAdmin);
  const filteredSecondary = filterNav(navConfig.navSecondary);

  const isGroupActive = (items: { url: string }[] = []) => {
    return items.some((item) => item.url === pathname);
  };

  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              // FIX 1: Add !justify-center for collapsed state
              className="group-data-[collapsible=icon]:justify-center! group-data-[collapsible=icon]:p-2!"
            >
              <Link to="/dashboard">
                <div className="bg-primary text-white flex aspect-square size-8 items-center justify-center rounded-lg shadow-blue-500/30">
                  <Activity className="size-4" />
                </div>
                {/* Hide text when collapsed */}
                <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-bold text-slate-800 dark:text-slate-100">
                    MedFlow AI
                  </span>
                  <span className="truncate text-xs text-slate-500">
                    {userRole.charAt(0).toUpperCase() + userRole.slice(1)}{" "}
                    Portal
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {/* Group 1 */}
        {filteredMain.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Platform</SidebarGroupLabel>
            <SidebarMenu>
              {filteredMain.map((item) => {
                const isActive = isGroupActive(item.items);

                return (
                  <Collapsible
                    key={item.title}
                    asChild
                    defaultOpen={isActive}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          tooltip={item.title}
                          isActive={isActive}
                          size="lg" // Use lg to match the design
                          // FIX 2: Center content when collapsed
                          className="group-data-[collapsible=icon]:justify-center!"
                        >
                          {item.icon && <item.icon />}

                          <span className="group-data-[collapsible=icon]:hidden">
                            {item.title}
                          </span>

                          <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.items?.map((subItem) => {
                            const isChildActive = pathname === subItem.url;
                            return (
                              <SidebarMenuSubItem key={subItem.title}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={isChildActive}
                                  className="my-1"
                                >
                                  <Link to={subItem.url}>
                                    <span>{subItem.title}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            );
                          })}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        )}
        {/* Grpup 2 */}
        {filteredAdmin.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarMenu>
              {filteredAdmin.map((item) => {
                const isActive = isGroupActive(item.items);
                return (
                  <Collapsible
                    key={item.title}
                    asChild
                    defaultOpen={isActive}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          tooltip={item.title}
                          isActive={isActive}
                          size="lg"
                          // FIX 3: Center content when collapsed
                          className="group-data-[collapsible=icon]:justify-center!"
                        >
                          {item.icon && <item.icon />}
                          <span className="group-data-[collapsible=icon]:hidden">
                            {item.title}
                          </span>
                          <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90 group-data-[collapsible=icon]:hidden" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.items?.map((subItem) => {
                            const isChildActive = pathname === subItem.url;
                            return (
                              <SidebarMenuSubItem key={subItem.title}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={isChildActive}
                                  className="my-1"
                                >
                                  <Link to={subItem.url}>
                                    <span>{subItem.title}</span>
                                  </Link>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            );
                          })}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>
      {session?.user && (
        <SidebarFooter>
          <NavUser
            user={{
              name: session?.user?.name!,
              email: session?.user?.email!,
              avatar: session?.user?.image!,
            }}
          />
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
