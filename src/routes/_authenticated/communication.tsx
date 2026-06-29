import { useEffect, useRef, useState } from "react";
import { useStore } from "@tanstack/react-store";
import { createFileRoute } from "@tanstack/react-router";
import { Send, Hash, Users, Globe, Building2, User, Radio } from "lucide-react";
import { chatStore, chatActions, type ChatChannel } from "@/lib/chat-store";
import { authClient } from "@/services/auth";
import { useRpcQuery } from "@/lib/query";
import { client } from "@/services/rpc";
import { ModuleLayout } from "@/components/ModuleLayout";
import { Button } from "@/ui/button";
import { Card, CardContent } from "@/ui/card";
import { cn } from "@/utils/cn";

export const Route = createFileRoute("/_authenticated/communication")({
  component: CommunicationPage,
});

function CommunicationPage() {
  const session = authClient.useSession();
  const currentUser = session.data?.user;
  const store = useStore(chatStore);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load departments via standard RPC query
  const deptsQuery = useRpcQuery<any[]>(["departments"], () => client.departments.$get());

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [store.messages]);

  // Synchronize colleagues and SSE connection
  useEffect(() => {
    chatActions.fetchColleagues();
    chatActions.connectSSE();
    chatActions.fetchMessages(store.activeChannel || { id: "org", name: "Organization Announcements", type: "organization" });

    return () => {
      chatActions.disconnectSSE();
    };
  }, []);

  // Update channels list dynamically once departments query completes
  const availableChannels: ChatChannel[] = [
    { id: "org", name: "Organization Announcements", type: "organization" },
    ...(deptsQuery.data ?? []).map((d) => ({
      id: `dept:${d.id}`,
      name: `${d.name} Chat`,
      type: "department" as const,
      targetId: d.id,
    })),
  ];

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    chatActions.sendMessage(inputText);
    setInputText("");
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
              <p className="px-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Direct Messages</p>
              <div className="space-y-0.5">
                {store.colleagues.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-muted-foreground italic">No colleagues found</p>
                ) : (
                  store.colleagues.map((colleague) => {
                    const channelId = `direct:${colleague.id}`;
                    const isActive = store.activeChannel?.id === channelId;
                    return (
                      <button
                        key={colleague.id}
                        onClick={() =>
                          chatActions.setActiveChannel({
                            id: channelId,
                            name: colleague.name,
                            type: "direct",
                            targetId: colleague.id,
                          })
                        }
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 cursor-pointer",
                          isActive
                            ? "bg-primary text-primary-foreground shadow-xs shadow-primary/20"
                            : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                        )}
                      >
                        <User size={14} />
                        <span className="truncate">{colleague.name}</span>
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
    </ModuleLayout>
  );
}
