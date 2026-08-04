import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { User as UserType } from "@/types";
import Profile from "./tabs/profile";
import History from "./tabs/History";
import Radiology from "./tabs/Radiology";

interface UserDetailsSheetProps {
  user: UserType | null;
  isOpen: boolean;
  onClose: () => void;
}

export function DetailsSheet({ user, isOpen, onClose }: UserDetailsSheetProps) {
  if (!user) return null;

  const isPatient = user.role === "patient";

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        className="inset-y-4! right-4! h-auto! sm:max-w-xl rounded-xl border shadow-2xl p-0 overflow-hidden bg-white dark:bg-zinc-950 flex flex-col min-w-120"
        side="right"
      >
        <div className="p-6 bg-slate-50 dark:bg-slate-900 border-b shrink-0">
          <SheetHeader className="flex flex-row items-center gap-4 space-y-0">
            <Avatar className="h-16 w-16 border-2 border-white dark:border-slate-800 shadow-sm">
              <AvatarImage src={user.image || ""} />
              <AvatarFallback className="text-lg font-bold bg-blue-100 text-blue-700">
                {user.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <SheetTitle className="text-xl font-bold">{user.name}</SheetTitle>
              <SheetDescription className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="capitalize">
                  {user.role}
                </Badge>
                <Badge
                  className={
                    user.status === "admitted"
                      ? "bg-orange-100 text-orange-700 hover:bg-orange-100 border-orange-200"
                      : user.status === "active"
                        ? "bg-green-100 text-green-700 hover:bg-green-100 border-green-200"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-100 border-slate-200"
                  }
                  variant="outline"
                >
                  {user.status?.replace("_", " ") || "Active"}
                </Badge>
              </SheetDescription>
            </div>
          </SheetHeader>
        </div>
        <ScrollArea className="min-h-150">
          <div className="p-6">
            <Tabs defaultValue="profile" className="w-full">
              <TabsList
                className={`grid w-full mb-6 ${isPatient ? "grid-cols-3" : "grid-cols-1"}`}
              >
                <TabsTrigger value="profile">Profile</TabsTrigger>
                {isPatient && (
                  <TabsTrigger value="history">History & AI</TabsTrigger>
                )}
                {isPatient && (
                  <TabsTrigger value="radiology">X-Rays</TabsTrigger>
                )}
              </TabsList>
              <TabsContent value="profile">
                <Profile user={user} />
              </TabsContent>
              <TabsContent value="history">
                <History user={user} />
              </TabsContent>
              <TabsContent value="radiology">
                <Radiology patientId={user._id} />
              </TabsContent>
              <TabsContent value="password">
                Change your password here.
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
