import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Link, useLocation } from "react-router";
import { authClient } from "@/lib/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";
import Notifications from "./Notifications";

const Header = () => {
  const { pathname } = useLocation();
  const { data: session } = authClient.useSession();

  return (
    <header className="flex h-16 items-center gap-2 border-b w-full px-3">
      <SidebarTrigger className="size-9" />
      <Separator orientation="vertical" />
      <div className="flex justify-between w-full">
        <div className="flex flex-col space-y-0.5">
          <h1 className="capitalize font-bold text-lg">
            {pathname.split("/").includes("profile")
              ? "Profile"
              : pathname.split("/").pop()}
          </h1>
          <p className="text-sm text-muted-foreground">
            Welcome back, {session?.user.role === "doctor" ? "Dr. " : ""}
            {session?.user.name}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <Separator orientation="vertical" />
          <ThemeToggle />
          <Separator orientation="vertical" />
          {session?.user && <Notifications user={session?.user} />}
          <Separator orientation="vertical" />
          <Link
            to={`/profile/${session?.user.id}`}
            className={
              buttonVariants({
                variant: "ghost",
              }) + " flex items-center gap-2 rounded-lg px-2 py-6"
            }
          >
            <Avatar className="h-8 w-8 rounded-lg">
              <AvatarImage
                src={session?.user.image || ""}
                alt={session?.user.name}
              />
              <AvatarFallback className="rounded-lg text-primary">
                {session?.user.name
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>

            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-bold">{session?.user.name}</span>
              <span className="truncate text-xs text-muted-foreground capitalize">
                {session?.user.role}
              </span>
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Header;
