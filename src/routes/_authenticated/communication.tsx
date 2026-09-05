import { useEffect, useRef, useState } from "react";
import { useStore } from "@tanstack/react-store";
import { createFileRoute } from "@tanstack/react-router";
import { Send, Hash, Users, Globe, Building2, User, Radio, PenSquare, Search, X } from "lucide-react";
import { chatStore, chatActions, type ChatChannel } from "@/lib/chat-store";
import { useRpcQuery } from "@/lib/query";
import { client } from "@/services/rpc";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/ui/button";
import { Card } from "@/ui/card";
import { cn } from "@/utils/cn";

export const Route = createFileRoute("/_authenticated/communication")({
  component: CommunicationPage,
});

function CommunicationPage() {
  const { session } = Route.useRouteContext() as { session?: any };
  const currentUser = session.data?.user;
  const store = useStore(chatStore);
  const [inputText, setInputText] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const staffQuery = useRpcQuery<any[]>(["staff"], () => client.hr.staff.$get());
  const deptsQuery = useRpcQuery<any[]>(["departments"], () => client.departments.$get());

  const currentStaff = staffQuery.data?.find((s) => s.email === session.data?.user.email);
  const userDept = deptsQuery.data?.find((d) => d.id === currentStaff?.departmentId);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [store.messages]);

  // Synchronize colleagues, conversations, and SSE connection
  useEffect(() => {
    chatActions.fetchColleagues();
    chatActions.fetchConversations();
    chatActions.connectSSE();
    chatActions.fetchMessages(store.activeChannel || { id: "org", name: "Organization Announcements", type: "organization" });
  }, []);

  // Channels (org + user's dept only)
  const availableChannels: ChatChannel[] = [
    { id: "org", name: "Organization Announcements", type: "organization" },
    ...(userDept ? [{
      id: `dept:${userDept.id}`,
      name: `${userDept.name} Chat`,
      type: "department" as const,
      targetId: userDept.id,
    }] : []),
  ];

  // Staff list for "New Chat" modal (exclude self)
  const allColleagues = store.colleagues.filter((c) => c.id !== currentUser?.id);
  const filteredColleagues = newChatSearch.trim()
    ? allColleagues.filter((c) =>
        c.name.toLowerCase().includes(newChatSearch.toLowerCase()) ||
        c.email.toLowerCase().includes(newChatSearch.toLowerCase())
      )
    : allColleagues;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    chatActions.sendMessage(inputText);
    setInputText("");
  };

  const handleOpenNewChat = (colleague: { id: string; name: string; email: string; image: string | null }) => {
    setShowNewChat(false);
    setNewChatSearch("");
    chatActions.openDirectChat(colleague);
  };

  const handleSelectConversation = (conv: { id: string; name: string; email: string; image: string | null }) => {
    chatActions.openDirectChat(conv);
  };

  return (
    <ModuleLayout
      title="Communication Hub"
      description="Connect and chat in real-time with colleagues, departments, or the entire organization."
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[calc(100vh-220px)] min-h-[500px]">
        {/* Left Sidebar: Channels & Users */}
        <Card className="md:col-span-1 flex flex-col h-full overflow-hidden border border-border bg-card/60 backdrop-blur-xs">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <span className="font-semibold text-foreground text-sm flex items-center gap-2">
              <Users size={16} className="text-primary" /> Channels & Chats
            </span>
            <div className="flex items-center gap-1">
              <span className={cn("h-2 w-2 rounded-full", store.isConnected ? "bg-emerald-500" : "bg-rose-500 animate-pulse")} />
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                {store.isConnected ? "Live" : "Offline"}
              </span>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-4">
            {/* Rooms Section */}
            <div>
              <p className="px-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Broadcasts & Departments</p>
              <div className="space-y-0.5">
                {availableChannels.map((channel) => {
                  const isActive = store.activeChannel?.id === channel.id;
                  return (
                    <button
                      key={channel.id}
                      onClick={() => chatActions.setActiveChannel(channel)}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 cursor-pointer",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-xs shadow-primary/20"
                          : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                      )}
                    >
                      {channel.type === "organization" ? <Globe size={14} /> : <Building2 size={14} />}
                      <span className="truncate">{channel.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Direct Messages Section */}
            <div>
              <div className="flex items-center justify-between px-2 mb-2">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center">Direct Messages</p>
                <Button
                  onClick={() => setShowNewChat(true)}
                  className="h-7 px-2.5 text-[10px] bg-primary text-primary-foreground font-bold rounded-lg flex items-center gap-1 hover:bg-primary/90 transition-all shadow-xs cursor-pointer"
                >
                  <PenSquare size={11} />
                  New Chat
                </Button>
              </div>
              <div className="space-y-0.5">
                {store.conversations.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-muted-foreground italic">No conversations yet</p>
                ) : (
                  store.conversations.map((conv) => {
                    const channelId = `direct:${conv.id}`;
                    const isActive = store.activeChannel?.id === channelId;
                    const hasUnread = conv.unread > 0;
                    return (
                      <button
                        key={conv.id}
                        onClick={() => handleSelectConversation(conv)}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 cursor-pointer",
                          isActive
                            ? "bg-primary text-primary-foreground shadow-xs shadow-primary/20"
                            : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                        )}
                      >
                        <User size={14} className="shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className={cn("truncate", hasUnread && !isActive && "text-foreground font-semibold")}>
                              {conv.name}
                            </span>
                            {hasUnread && !isActive && (
                              <span className="shrink-0 h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center leading-none">
                                {conv.unread > 99 ? "99+" : conv.unread}
                              </span>
                            )}
                          </div>
                          {conv.lastMessage && (
                            <p className="text-[10px] truncate opacity-70 mt-0.5">{conv.lastMessage}</p>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Center/Right: Chat Feed & Input */}
        <Card className="md:col-span-3 flex flex-col h-full overflow-hidden border border-border bg-card/60 backdrop-blur-xs">
          {/* Header */}
          <div className="p-4 border-b border-border flex items-center justify-between bg-muted/20">
            <div>
              <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                <Hash size={16} className="text-primary" /> {store.activeChannel?.name || "Select Channel"}
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {store.activeChannel?.type === "organization" && "Post announcements to everyone"}
                {store.activeChannel?.type === "department" && "Team-only department chatroom"}
                {store.activeChannel?.type === "direct" && `Private message with ${store.activeChannel.name}`}
              </p>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {store.messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-2">
                <Radio className="h-8 w-8 text-muted-foreground/60 animate-pulse" />
                <p className="text-sm font-semibold text-foreground">Welcome to the channel</p>
                <p className="text-xs text-muted-foreground max-w-xs">Be the first to drop a message or start a discussion.</p>
              </div>
            ) : (
              store.messages.map((msg) => {
                const isOwn = msg.senderId === currentUser?.id;
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex flex-col max-w-[80%] md:max-w-[70%] animate-in fade-in duration-200",
                      isOwn ? "ml-auto items-end" : "mr-auto items-start"
                    )}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] font-semibold text-foreground">{msg.senderName}</span>
                      <span className="text-[9px] text-muted-foreground">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div
                      className={cn(
                        "px-3 py-2 rounded-2xl text-xs leading-relaxed break-words",
                        isOwn
                          ? "bg-primary text-primary-foreground rounded-tr-none shadow-xs shadow-primary/10"
                          : "bg-muted/70 text-foreground rounded-tl-none border border-border"
                      )}
                    >
                      {msg.content}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Form Input */}
          <form onSubmit={handleSend} className="p-3 border-t border-border bg-muted/20 flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Message ${store.activeChannel?.name || "channel"}...`}
              className="flex-1 px-4 py-2 text-xs rounded-xl border border-input bg-background text-foreground outline-hidden focus:ring-1 focus:ring-primary focus:border-primary transition-all"
            />
            <Button type="submit" size="icon" className="rounded-xl shrink-0 cursor-pointer h-9 w-9" disabled={!inputText.trim()}>
              <Send size={14} />
            </Button>
          </form>
        </Card>
      </div>

      {/* New Chat Modal */}
      {showNewChat && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => { setShowNewChat(false); setNewChatSearch(""); }}
        >
          <div
            className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-semibold text-sm text-foreground">New Conversation</h2>
              <button
                onClick={() => { setShowNewChat(false); setNewChatSearch(""); }}
                className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  autoFocus
                  type="text"
                  value={newChatSearch}
                  onChange={(e) => setNewChatSearch(e.target.value)}
                  placeholder="Search by name or email..."
                  className="w-full pl-8 pr-4 py-2 text-xs rounded-lg border border-input bg-background text-foreground outline-hidden focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                />
              </div>
            </div>
            <div className="max-h-72 overflow-y-auto p-2">
              {filteredColleagues.length === 0 ? (
                <p className="px-3 py-4 text-xs text-muted-foreground text-center italic">No staff found</p>
              ) : (
                filteredColleagues.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleOpenNewChat(c)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer text-left"
                  >
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User size={14} className="text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{c.email}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </ModuleLayout>
  );
}
