import { useState } from "react";
import { useQuery, useMutation } from "@/lib/convex";
import { api } from "@convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Users,
  Mail,
  TrendingUp,
  Clock,
  Activity,
  Sparkles,
  Plus,
  Search,
  MessageSquare,
  Phone,
  CalendarCheck,
  HeartPulse,
  UserCheck,
  Trash2,
} from "lucide-react";
import ComposeAiEmailModal from "@/components/crm/ComposeAiEmailModal";
import Loader from "@/components/global/Loader";

// ─── Status & Priority configs ───────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  lead: { label: "New Lead", color: "text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800", icon: TrendingUp },
  appointment_scheduled: { label: "Appointment", color: "text-violet-600 border-violet-200 bg-violet-50 dark:bg-violet-950 dark:border-violet-800", icon: CalendarCheck },
  in_treatment: { label: "In Treatment", color: "text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950 dark:border-emerald-800", icon: HeartPulse },
  followup_needed: { label: "Follow-up", color: "text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800", icon: Clock },
  discharged: { label: "Discharged", color: "text-gray-500 border-gray-200 bg-gray-50 dark:bg-gray-900 dark:border-gray-700", icon: UserCheck },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low: { label: "Low", color: "text-gray-500 border-gray-200 bg-gray-50 dark:bg-gray-900" },
  medium: { label: "Medium", color: "text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-950" },
  high: { label: "High", color: "text-orange-600 border-orange-200 bg-orange-50 dark:bg-orange-950" },
  urgent: { label: "Urgent", color: "text-red-600 border-red-200 bg-red-50 dark:bg-red-950" },
};

// ─── Add Lead Modal ───────────────────────────────────────

function AddLeadModal({ onSuccess }: { onSuccess: () => void }) {
  const { data: session } = authClient.useSession();
  const createLead = useMutation(api.crm.createLead);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", status: "lead", priority: "medium", notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createLead.mutateAsync({
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        status: form.status,
        priority: form.priority,
        notes: form.notes || undefined,
        assignedStaffId: session?.user?.id,
      });
      toast.success("CRM lead added successfully!");
      setOpen(false);
      setForm({ name: "", email: "", phone: "", status: "lead", priority: "medium", notes: "" });
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to add lead.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Plus className="h-4 w-4" /> Add Lead
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" /> New CRM Lead
            </DialogTitle>
            <DialogDescription>Add a patient or prospect to the CRM pipeline</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2">
                <Label>Full Name *</Label>
                <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Patient full name" />
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Email Address *</Label>
                <Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="patient@email.com" />
              </div>
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+27 xx xxx xxxx" />
              </div>
              <div className="space-y-1">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Notes</Label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Any initial notes about this lead..."
                  className="w-full h-20 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Adding..." : "Add to CRM"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Communication History Sheet ─────────────────────────

function CommHistorySheet({ lead, open, onClose }: { lead: any; open: boolean; onClose: () => void }) {
  const { data: comms, isLoading } = useQuery(api.crm.getCommunications, lead ? { leadId: lead._id } : "skip");

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Communication History
          </SheetTitle>
          <SheetDescription>
            {lead?.name} — {lead?.email}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          {isLoading ? (
            <Loader label="Loading communications..." />
          ) : !comms || comms.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No communications yet.</p>
              <p className="text-xs">Use Compose AI Email to start the conversation.</p>
            </div>
          ) : (
            comms.map((c: any) => (
              <div key={c._id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {c.type === "email" ? "✉️ Email" : c.type === "call_note" ? "📞 Call" : "💬 SMS"}
                    </Badge>
                    {c.aiGenerated && (
                      <Badge className="text-xs gap-1 bg-violet-100 text-violet-700 border-violet-200">
                        <Sparkles className="h-2.5 w-2.5" /> AI Generated
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(c.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="font-semibold text-sm">{c.subject}</p>
                <p className="text-sm text-muted-foreground whitespace-pre-line line-clamp-6">{c.body}</p>
                <p className="text-xs text-muted-foreground">Sent by: {c.senderName ?? "Staff"}</p>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Stats Card ───────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number | string; color: string }) {
  return (
    <Card className="card">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
          </div>
          <div className={`h-12 w-12 rounded-full flex items-center justify-center ${color}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main CRM Page ────────────────────────────────────────

export default function CrmPage() {
  const { data: leads, isLoading } = useQuery(api.crm.listLeads, {});
  const { data: stats } = useQuery(api.crm.getStats, {});
  const updateLead = useMutation(api.crm.updateLead);
  const deleteLead = useMutation(api.crm.deleteLead);

  const { data: session } = authClient.useSession();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [composeLead, setComposeLead] = useState<any | null>(null);
  const [historyLead, setHistoryLead] = useState<any | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const filteredLeads = (leads ?? []).filter((lead: any) => {
    const matchSearch =
      lead.name.toLowerCase().includes(search.toLowerCase()) ||
      lead.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || lead.status === statusFilter;
    const matchPriority = priorityFilter === "all" || lead.priority === priorityFilter;
    return matchSearch && matchStatus && matchPriority;
  });

  const handleStatusChange = async (leadId: any, status: string) => {
    try {
      await updateLead.mutateAsync({ leadId, status });
      toast.success("Status updated.");
    } catch {
      toast.error("Failed to update status.");
    }
  };

  const handleDelete = async (leadId: any) => {
    if (!confirm("Delete this CRM lead?")) return;
    try {
      await deleteLead.mutateAsync({ leadId });
      toast.success("Lead deleted.");
    } catch {
      toast.error("Failed to delete lead.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-primary" />
          Patient CRM & AI Communications
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage patient relationships and compose AI-powered emails with Puter AI
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Leads" value={stats?.total ?? 0} color="bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400" />
        <StatCard icon={CalendarCheck} label="Appointments" value={stats?.scheduled ?? 0} color="bg-violet-100 text-violet-600 dark:bg-violet-950 dark:text-violet-400" />
        <StatCard icon={Clock} label="Follow-ups Due" value={stats?.followup ?? 0} color="bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400" />
        <StatCard icon={Sparkles} label="AI Emails Sent" value={stats?.aiEmailsSent ?? 0} color="bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400" />
      </div>

      {/* Table */}
      <Card className="card shadow-sm">
        <CardHeader className="flex flex-row items-start sm:items-center justify-between gap-4 flex-wrap">
          <div>
            <CardTitle>CRM Pipeline</CardTitle>
            <CardDescription>Track, manage, and communicate with patients</CardDescription>
          </div>
          <div className="flex gap-2 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search patients..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-48"
              />
            </div>
            {/* Status filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Priority filter */}
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <AddLeadModal onSuccess={() => setRefreshKey((k) => k + 1)} />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader label="Loading CRM pipeline..." />
            </div>
          ) : (
            <div className="rounded-md border border-zinc-300 dark:border-zinc-700">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-32 text-muted-foreground">
                        <div className="flex flex-col items-center gap-2">
                          <Users className="h-8 w-8 opacity-30" />
                          <p className="text-sm">No CRM leads found.</p>
                          <p className="text-xs">Click "Add Lead" to get started.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLeads.map((lead: any) => {
                      const statusCfg = STATUS_CONFIG[lead.status] ?? STATUS_CONFIG.lead;
                      const priorityCfg = PRIORITY_CONFIG[lead.priority] ?? PRIORITY_CONFIG.medium;
                      const StatusIcon = statusCfg.icon;
                      return (
                        <TableRow key={lead._id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs">
                                  {lead.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-sm">{lead.name}</p>
                                <p className="text-xs text-muted-foreground">{lead.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              {lead.phone ? (
                                <>
                                  <Phone className="h-3 w-3" /> {lead.phone}
                                </>
                              ) : (
                                <span className="italic">No phone</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Select value={lead.status} onValueChange={(v) => handleStatusChange(lead._id, v)}>
                              <SelectTrigger className="h-7 w-36 text-xs border-none shadow-none p-0 focus:ring-0">
                                <Badge variant="outline" className={`gap-1 text-xs ${statusCfg.color}`}>
                                  <StatusIcon className="h-3 w-3" />
                                  {statusCfg.label}
                                </Badge>
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                                  <SelectItem key={k} value={k} className="text-xs">{v.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs ${priorityCfg.color}`}>
                              {priorityCfg.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <p className="text-xs text-muted-foreground max-w-[180px] truncate">
                              {lead.notes || "—"}
                            </p>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1"
                                onClick={() => setHistoryLead(lead)}
                              >
                                <Activity className="h-3 w-3" /> History
                              </Button>
                              <Button
                                size="sm"
                                className="h-7 text-xs gap-1 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-700 hover:to-blue-700 text-white border-0"
                                onClick={() => setComposeLead(lead)}
                              >
                                <Sparkles className="h-3 w-3" /> AI Email
                              </Button>
                              {session?.user?.role === "admin" && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="h-7 text-xs"
                                  onClick={() => handleDelete(lead._id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <ComposeAiEmailModal
        open={!!composeLead}
        onClose={() => setComposeLead(null)}
        lead={composeLead}
      />
      <CommHistorySheet
        open={!!historyLead}
        onClose={() => setHistoryLead(null)}
        lead={historyLead}
      />
    </div>
  );
}
