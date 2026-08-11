"use client";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@/lib/convex";
import { api } from "@convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Hash,
  Plus,
  Send,
  Smile,
  Reply,
  Trash2,
  Bot,
  ChevronDown,
  ChevronRight,
  Search,
  Settings,
  Zap,
  AlertCircle,
  Stethoscope,
  FlaskConical,
  Pill,
  Loader2,
  Sparkles,
  X,
  CornerUpLeft,
} from "lucide-react";

// ─── Role colors ──────────────────────────────────────────────────────
const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-500",
  doctor: "bg-blue-500",
  nurse: "bg-emerald-500",
  pharmacist: "bg-amber-500",
  lab_tech: "bg-purple-500",
  patient: "bg-gray-500",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  doctor: "Dr.",
  nurse: "RN",
  pharmacist: "Pharm",
  lab_tech: "Lab",
  patient: "Patient",
};

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  general: <Hash className="h-3.5 w-3.5" />,
  department: <Hash className="h-3.5 w-3.5" />,
  emergency: <AlertCircle className="h-3.5 w-3.5 text-red-400" />,
  ai_bot: <Bot className="h-3.5 w-3.5 text-purple-400" />,
  direct: <Hash className="h-3.5 w-3.5" />,
};

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "🙏", "🔥", "✅", "👏"];

// ─── Timestamp helper ─────────────────────────────────────────────────
function fmtTime(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ─── Message Bubble ───────────────────────────────────────────────────
function MessageBubble({
  msg, userId, onReact, onReply, onDelete, isCompact,
}: {
  msg: any; userId: string; onReact: (msgId: string, emoji: string) => void;
  onReply: (msg: any) => void; onDelete: (msgId: string) => void; isCompact?: boolean;
}) {
  const [showActions, setShowActions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const isAi = msg.type === "ai";
  const isSystem = msg.type === "system";

  if (isSystem) {
    return (
      <div className="flex items-center gap-2 py-1 px-4">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground px-2">{msg.content}</span>
        <div className="h-px flex-1 bg-border" />
      </div>
    );
  }

  return (
    <div
      className={`group flex gap-3 px-4 py-1 hover:bg-white/5 rounded-lg transition-colors relative ${isCompact ? "pt-0.5" : "pt-2"}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowEmojiPicker(false); }}
    >
      {!isCompact && (
        <div className={`h-9 w-9 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold mt-0.5 ${isAi ? "bg-gradient-to-br from-purple-500 to-blue-600" : (ROLE_COLORS[msg.senderRole ?? ""] ?? "bg-gray-500")}`}>
          {isAi ? <Bot className="h-4 w-4" /> : msg.senderName?.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
        </div>
      )}
      {isCompact && <div className="w-9 flex-shrink-0" />}

      <div className="flex-1 min-w-0">
        {!isCompact && (
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className="font-semibold text-sm text-foreground">{isAi ? "🤖 MedFlow AI" : msg.senderName}</span>
            {msg.senderRole && !isAi && (
              <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-normal">
                {ROLE_LABELS[msg.senderRole] ?? msg.senderRole}
              </Badge>
            )}
            <span className="text-[11px] text-muted-foreground">{fmtTime(msg.createdAt)}</span>
          </div>
        )}

        {/* Reply reference */}
        {msg.replyToId && (
          <div className="flex items-center gap-1.5 mb-1 pl-2 border-l-2 border-primary/50">
            <CornerUpLeft className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <span className="text-xs text-muted-foreground truncate">Replying to a message</span>
          </div>
        )}

        <p className={`text-sm leading-relaxed break-words whitespace-pre-wrap ${isAi ? "text-purple-100" : "text-foreground/90"}`}>
          {isAi ? (
            <span className="bg-gradient-to-br from-purple-900/40 to-blue-900/40 border border-purple-500/20 rounded-lg px-3 py-2 block">
              {msg.content}
            </span>
          ) : msg.content}
        </p>

        {/* Reactions */}
        {msg.reactions && msg.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {msg.reactions.map((r: any) => r.userIds.length > 0 && (
              <button
                key={r.emoji}
                onClick={() => onReact(msg._id, r.emoji)}
                className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition-colors ${r.userIds.includes(userId) ? "bg-primary/20 border-primary/50 text-primary" : "bg-white/5 border-border hover:bg-white/10"}`}
              >
                {r.emoji} <span>{r.userIds.length}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Action toolbar */}
      {showActions && (
        <div className="absolute right-4 top-1 flex items-center gap-0.5 bg-background border border-border rounded-lg shadow-lg p-1 z-10">
          <div className="relative">
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                  <Smile className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Add Reaction</TooltipContent>
            </Tooltip>
            {showEmojiPicker && (
              <div className="absolute bottom-8 right-0 bg-background border border-border rounded-lg shadow-xl p-2 flex gap-1 z-20">
                {QUICK_EMOJIS.map(e => (
                  <button key={e} onClick={() => { onReact(msg._id, e); setShowEmojiPicker(false); }} className="text-lg hover:scale-125 transition-transform p-0.5">
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={() => onReply(msg)} className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                <Reply className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Reply</TooltipContent>
          </Tooltip>
          {(msg.senderId === userId) && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={() => onDelete(msg._id)} className="h-7 w-7 flex items-center justify-center rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Delete</TooltipContent>
            </Tooltip>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Create Channel Modal ─────────────────────────────────────────────
function CreateChannelModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createChannel = useMutation(api.messaging.createChannel);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [type, setType] = useState("department");
  const [loading, setLoading] = useState(false);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createChannel.mutate({ name, description: desc, type });
      toast.success(`#${name} channel created!`);
      onClose();
      setName(""); setDesc("");
    } catch (err: any) {
      toast.error(err.message);
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Hash className="h-4 w-4" /> New Channel</DialogTitle>
        </DialogHeader>
        <form onSubmit={handle} className="space-y-3">
          <Input required placeholder="channel-name" value={name} onChange={e => setName(e.target.value.toLowerCase().replace(/\s/g, "-"))} />
          <Input placeholder="Description (optional)" value={desc} onChange={e => setDesc(e.target.value)} />
          <select value={type} onChange={e => setType(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="general">General</option>
            <option value="department">Department</option>
            <option value="emergency">Emergency</option>
          </select>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Channel"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Messaging Page ──────────────────────────────────────────────
export default function MessagingPage() {
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id ?? "";
  const userName = session?.user?.name ?? "User";
  const userRole = (session?.user as any)?.role ?? "staff";

  const { data: channels = [] } = useQuery(api.messaging.listChannels, {});
  const sendMsg = useMutation(api.messaging.sendMessage);
  const reactMut = useMutation(api.messaging.addReaction);
  const deleteMut = useMutation(api.messaging.deleteMessage);
  const setPresence = useMutation(api.messaging.setPresence);
  const seedChannels = useMutation(api.messaging.seedDefaultChannels);
  const { data: presence = [] } = useQuery(api.messaging.listPresence, {});

  const [activeChannelId, setActiveChannelId] = useState<string>("");
  const [input, setInput] = useState("");
  const [replyTo, setReplyTo] = useState<any>(null);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [search, setSearch] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState<Record<string, boolean>>({});
  const [aiThinking, setAiThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: messages = [] } = useQuery(
    api.messaging.listMessages,
    activeChannelId ? { channelId: activeChannelId } : "skip"
  );

  const activeChannel = channels.find((c: any) => c._id === activeChannelId);

  // Seed default channels and set online presence on mount
  useEffect(() => {
    if (!userId) return;
    seedChannels.mutate({ userId }).catch(() => {});
    setPresence.mutate({ userId, status: "online" }).catch(() => {});

    const interval = setInterval(() => {
      setPresence.mutate({ userId, status: "online" }).catch(() => {});
    }, 30000);

    return () => {
      clearInterval(interval);
      setPresence.mutate({ userId, status: "offline" }).catch(() => {});
    };
  }, [userId]);

  // Auto-select first channel
  useEffect(() => {
    if (channels.length > 0 && !activeChannelId) {
      setActiveChannelId(channels[0]._id);
    }
  }, [channels]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const presenceMap = Object.fromEntries(presence.map((p: any) => [p.userId, p.status]));

  const filteredChannels = channels.filter((c: any) =>
    c.name.includes(search.toLowerCase())
  );

  const groupedChannels = {
    emergency: filteredChannels.filter((c: any) => c.type === "emergency"),
    general: filteredChannels.filter((c: any) => c.type === "general"),
    department: filteredChannels.filter((c: any) => c.type === "department"),
    ai_bot: filteredChannels.filter((c: any) => c.type === "ai_bot"),
  };

  const handleSend = async () => {
    if (!input.trim() || !activeChannelId) return;
    const content = input.trim();
    setInput("");

    try {
      await sendMsg.mutate({
        channelId: activeChannelId,
        content,
        senderName: userName,
        senderId: userId,
        senderRole: userRole,
        type: "text",
        replyToId: replyTo?._id,
      });
      setReplyTo(null);

      // AI auto-reply in ai_bot channel
      if (activeChannel?.type === "ai_bot") {
        setAiThinking(true);
        try {
          const puter = (window as any).puter;
          if (puter) {
            const sysPrompt = `You are MedFlow AI, an expert hospital assistant. You help doctors, nurses, and staff with clinical questions, medication queries, procedures, and administrative tasks. Be concise, professional, and helpful. Use medical terminology where appropriate but remain accessible.`;
            const response = await puter.ai.chat(`${sysPrompt}\n\nUser (${userRole}): ${content}`, { model: "gpt-4o-mini" });
            const aiText = typeof response === "string" ? response : response?.message?.content ?? response?.text ?? "I'm sorry, I couldn't process that request.";
            await sendMsg.mutate({
              channelId: activeChannelId,
              content: aiText,
              senderName: "MedFlow AI",
              senderId: "ai-bot",
              senderRole: "ai",
              type: "ai",
            });
          }
        } catch { /* silent */ } finally {
          setAiThinking(false);
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to send message.");
      setInput(content);
    }
  };

  const handleReact = async (msgId: string, emoji: string) => {
    try {
      await reactMut.mutate({ messageId: msgId as any, emoji, userId });
    } catch { /* silent */ }
  };

  const handleDelete = async (msgId: string) => {
    try {
      await deleteMut.mutate({ messageId: msgId as any, userId });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Group consecutive messages from same sender (compact mode)
  const groupedMessages = messages.reduce((acc: any[], msg: any, i: number) => {
    const prev = messages[i - 1];
    const isCompact = prev && prev.senderId === msg.senderId && prev.type !== "system" && msg.type !== "system" && (msg.createdAt - prev.createdAt < 5 * 60 * 1000);
    acc.push({ ...msg, isCompact });
    return acc;
  }, []);

  const ChannelGroup = ({ title, items, groupKey }: { title: string; items: any[]; groupKey: string }) => {
    const collapsed = sidebarCollapsed[groupKey];
    if (items.length === 0) return null;
    return (
      <div className="mb-1">
        <button
          onClick={() => setSidebarCollapsed(p => ({ ...p, [groupKey]: !p[groupKey] }))}
          className="flex items-center gap-1 w-full px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {title}
        </button>
        {!collapsed && items.map((ch: any) => (
          <button
            key={ch._id}
            onClick={() => setActiveChannelId(ch._id)}
            className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors group ${activeChannelId === ch._id ? "bg-primary/20 text-primary font-medium" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"}`}
          >
            <span className="text-base leading-none">{ch.icon}</span>
            <span className="truncate flex-1 text-left">{ch.name}</span>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] rounded-xl overflow-hidden border border-border shadow-2xl bg-background">
      {/* ── Sidebar ── */}
      <div className="w-60 flex-shrink-0 bg-zinc-950/80 border-r border-white/5 flex flex-col">
        {/* Workspace header */}
        <div className="h-14 flex items-center justify-between px-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-sm">MedFlow</span>
          </div>
          <div className="flex items-center gap-1">
            <div className={`h-2 w-2 rounded-full ${presenceMap[userId] === "online" ? "bg-green-400" : "bg-gray-500"}`} />
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search channels..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-xs bg-white/5 border-white/10" />
          </div>
        </div>

        {/* Channel list */}
        <ScrollArea className="flex-1 px-2 py-1">
          <ChannelGroup title="🚨 Emergency" items={groupedChannels.emergency} groupKey="emergency" />
          <ChannelGroup title="💬 General" items={groupedChannels.general} groupKey="general" />
          <ChannelGroup title="🏥 Departments" items={groupedChannels.department} groupKey="department" />
          <ChannelGroup title="🤖 AI" items={groupedChannels.ai_bot} groupKey="ai_bot" />
        </ScrollArea>

        {/* Add channel */}
        <div className="p-3 border-t border-white/5">
          <button onClick={() => setShowCreateChannel(true)} className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-white/5 rounded-md transition-colors">
            <Plus className="h-3.5 w-3.5" /> Add Channel
          </button>
        </div>

        {/* Current user */}
        <div className="p-3 border-t border-white/5 flex items-center gap-2">
          <div className={`h-7 w-7 rounded-full flex items-center justify-center text-white text-xs font-bold ${ROLE_COLORS[userRole] ?? "bg-gray-500"}`}>
            {userName.split(" ").map(n => n[0]).join("").slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{userName}</p>
            <p className="text-[10px] text-muted-foreground capitalize">{userRole}</p>
          </div>
          <div className="h-2 w-2 rounded-full bg-green-400 flex-shrink-0" />
        </div>
      </div>

      {/* ── Main chat area ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeChannel ? (
          <>
            {/* Channel header */}
            <div className="h-14 flex items-center gap-3 px-5 border-b border-border flex-shrink-0">
              <span className="text-xl">{activeChannel.icon}</span>
              <div>
                <h2 className="font-semibold text-sm">{activeChannel.name}</h2>
                {activeChannel.description && (
                  <p className="text-xs text-muted-foreground truncate max-w-md">{activeChannel.description}</p>
                )}
              </div>
              {activeChannel.type === "emergency" && (
                <Badge className="ml-auto bg-red-500/20 text-red-400 border-red-500/30">🚨 Emergency Channel</Badge>
              )}
              {activeChannel.type === "ai_bot" && (
                <Badge className="ml-auto bg-purple-500/20 text-purple-400 border-purple-500/30">
                  <Sparkles className="h-3 w-3 mr-1" /> Puter AI Powered
                </Badge>
              )}
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 py-2">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full py-20 text-center px-8">
                  <div className="text-5xl mb-4">{activeChannel.icon}</div>
                  <h3 className="font-bold text-lg mb-1">Welcome to #{activeChannel.name}!</h3>
                  <p className="text-sm text-muted-foreground">{activeChannel.description ?? "Start the conversation."}</p>
                  {activeChannel.type === "ai_bot" && (
                    <p className="text-xs text-purple-400 mt-3">💡 Ask me anything about medications, procedures, or patient care!</p>
                  )}
                </div>
              )}
              <div className="space-y-0.5">
                {groupedMessages.map((msg: any) => (
                  <MessageBubble
                    key={msg._id}
                    msg={msg}
                    userId={userId}
                    onReact={handleReact}
                    onReply={setReplyTo}
                    onDelete={handleDelete}
                    isCompact={msg.isCompact}
                  />
                ))}
                {aiThinking && (
                  <div className="flex gap-3 px-4 py-2">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">🤖 MedFlow AI</span>
                      <div className="flex gap-1">
                        {[0,1,2].map(i => (
                          <div key={i} className="h-2 w-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            </ScrollArea>

            {/* Reply indicator */}
            {replyTo && (
              <div className="flex items-center gap-2 px-5 py-2 bg-primary/10 border-t border-primary/20">
                <CornerUpLeft className="h-4 w-4 text-primary flex-shrink-0" />
                <span className="text-xs text-muted-foreground flex-1 truncate">
                  Replying to <strong>{replyTo.senderName}</strong>: {replyTo.content.slice(0, 60)}...
                </span>
                <button onClick={() => setReplyTo(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Input */}
            <div className="px-5 py-3 border-t border-border flex-shrink-0">
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder={activeChannel.type === "ai_bot" ? "Ask MedFlow AI anything..." : `Message #${activeChannel.name}`}
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                />
                <Button size="sm" onClick={handleSend} disabled={!input.trim()} className={`h-8 w-8 p-0 rounded-lg ${activeChannel.type === "ai_bot" ? "bg-gradient-to-r from-purple-600 to-blue-600" : ""}`}>
                  {activeChannel.type === "ai_bot" ? <Sparkles className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 ml-1">
                Press Enter to send · Shift+Enter for new line
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Hash className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">Select a channel to start messaging</p>
            </div>
          </div>
        )}
      </div>

      <CreateChannelModal open={showCreateChannel} onClose={() => setShowCreateChannel(false)} />
    </div>
  );
}
