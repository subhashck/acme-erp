import { Store } from "@tanstack/react-store";

export interface Message {
  id: number;
  senderId: string;
  senderName: string;
  senderImage: string | null;
  receiverId: string | null;
  channelType: "organization" | "department" | "direct";
  departmentId: number | null;
  content: string;
  createdAt: string;
}

export interface Colleague {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

export interface Conversation {
  id: string;         // user id of the partner
  name: string;
  email: string;
  image: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unread: number;
}

export interface ChatChannel {
  id: string; // e.g. "org", "dept:1", "direct:user-id"
  name: string;
  type: "organization" | "department" | "direct";
  targetId?: string | number;
}

interface ChatState {
  channels: ChatChannel[];
  activeChannel: ChatChannel | null;
  messages: Message[];
  isConnected: boolean;
  colleagues: Colleague[];
  conversations: Conversation[];
}

export const chatStore = new Store<ChatState>({
  channels: [
    { id: "org", name: "Organization Announcements", type: "organization" }
  ],
  activeChannel: { id: "org", name: "Organization Announcements", type: "organization" },
  messages: [],
  isConnected: false,
  colleagues: [],
  conversations: [],
});

let chatEventSource: EventSource | null = null;

export const chatActions = {
  fetchColleagues: async () => {
    try {
      const res = await fetch("/api/colleagues");
      if (res.ok) {
        const colleagues: Colleague[] = await res.json();
        chatStore.setState((state) => ({
          ...state,
          colleagues
        }));
      }
    } catch (err) {
      console.error("Failed to fetch colleagues:", err);
    }
  },

  fetchConversations: async () => {
    try {
      const res = await fetch("/api/messages/conversations");
      if (res.ok) {
        const conversations: Conversation[] = await res.json();
        chatStore.setState((state) => ({
          ...state,
          conversations
        }));
      }
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
    }
  },

  markConversationRead: async (partnerId: string) => {
    try {
      await fetch(`/api/messages/read/${partnerId}`, { method: "POST" });
      // Zero out unread locally so badge clears immediately
      chatStore.setState((state) => ({
        ...state,
        conversations: state.conversations.map((c) =>
          c.id === partnerId ? { ...c, unread: 0 } : c
        )
      }));
    } catch (err) {
      console.error("Failed to mark read:", err);
    }
  },

  /** Open a direct conversation (adds it to conversations list if it wasn't there yet) */
  openDirectChat: (partner: { id: string; name: string; email: string; image: string | null }) => {
    const channel: ChatChannel = {
      id: `direct:${partner.id}`,
      name: partner.name,
      type: "direct",
      targetId: partner.id,
    };
    // Ensure partner is in conversations list
    chatStore.setState((state) => {
      const exists = state.conversations.some((c) => c.id === partner.id);
      return {
        ...state,
        conversations: exists
          ? state.conversations
          : [
              {
                id: partner.id,
                name: partner.name,
                email: partner.email,
                image: partner.image,
                lastMessage: "",
                lastMessageAt: new Date().toISOString(),
                unread: 0,
              },
              ...state.conversations,
            ],
      };
    });
    chatActions.setActiveChannel(channel);
    chatActions.markConversationRead(partner.id);
  },

  fetchMessages: async (channel: ChatChannel) => {
    try {
      let url = `/api/messages?channelType=${channel.type}`;
      if (channel.type === "department") {
        url += `&departmentId=${channel.targetId}`;
      } else if (channel.type === "direct") {
        url += `&colleagueId=${channel.targetId}`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const messages: Message[] = await res.json();
        chatStore.setState((state) => ({
          ...state,
          messages
        }));
      }
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    }
  },

  setActiveChannel: (channel: ChatChannel) => {
    chatStore.setState((state) => ({
      ...state,
      activeChannel: channel
    }));
    chatActions.fetchMessages(channel);
    // Mark read when opening a direct channel
    if (channel.type === "direct" && channel.targetId) {
      chatActions.markConversationRead(String(channel.targetId));
    }
  },

  sendMessage: async (content: string) => {
    const state = chatStore.state;
    if (!state.activeChannel || !content.trim()) return;

    const payload: Partial<Message> = {
      content: content.trim(),
      channelType: state.activeChannel.type
    };

    if (state.activeChannel.type === "department") {
      payload.departmentId = Number(state.activeChannel.targetId);
    } else if (state.activeChannel.type === "direct") {
      payload.receiverId = String(state.activeChannel.targetId);
    }

    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      // Refresh conversations so last message updates
      if (state.activeChannel.type === "direct") {
        setTimeout(() => chatActions.fetchConversations(), 300);
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  },

  connectSSE: () => {
    if (chatEventSource) return;

    chatEventSource = new EventSource("/api/messages/stream");

    chatStore.setState((state) => ({
      ...state,
      isConnected: true
    }));

    chatEventSource.addEventListener("message", (event) => {
      try {
        const newMsg: Message = JSON.parse(event.data);

        chatStore.setState((state) => {
          const current = state.activeChannel;
          let isMatch = false;

          if (current) {
            if (current.type === "organization" && newMsg.channelType === "organization") {
              isMatch = true;
            } else if (current.type === "department" && newMsg.channelType === "department" && Number(current.targetId) === newMsg.departmentId) {
              isMatch = true;
            } else if (current.type === "direct" && newMsg.channelType === "direct") {
              const targetUser = String(current.targetId);
              if (newMsg.senderId === targetUser || newMsg.receiverId === targetUser) {
                isMatch = true;
              }
            }
          }

          // If it's a direct message NOT in the active channel, bump unread and update conversation preview
          if (newMsg.channelType === "direct" && !isMatch) {
            const partnerId = newMsg.senderId; // incoming: sender is the partner
            const updated = state.conversations.map((c) =>
              c.id === partnerId
                ? {
                    ...c,
                    unread: c.unread + 1,
                    lastMessage: newMsg.content,
                    lastMessageAt: newMsg.createdAt,
                  }
                : c
            );
            // Add conversation if not yet in list
            const exists = updated.some((c) => c.id === partnerId);
            return {
              ...state,
              conversations: exists ? updated : [
                {
                  id: partnerId,
                  name: newMsg.senderName,
                  email: "",
                  image: newMsg.senderImage,
                  lastMessage: newMsg.content,
                  lastMessageAt: newMsg.createdAt,
                  unread: 1,
                },
                ...state.conversations,
              ],
            };
          }

          if (!isMatch) return state;

          const exists = state.messages.some((m) => m.id === newMsg.id);
          if (exists) return state;

          // Also refresh conversation preview if it's the active direct channel
          let conversations = state.conversations;
          if (newMsg.channelType === "direct" && current?.type === "direct") {
            const partnerId = newMsg.senderId === state.conversations[0]?.id
              ? newMsg.senderId
              : newMsg.receiverId ?? "";
            conversations = state.conversations.map((c) =>
              c.id === (current?.targetId)
                ? { ...c, lastMessage: newMsg.content, lastMessageAt: newMsg.createdAt }
                : c
            );
          }

          return {
            ...state,
            conversations,
            messages: [...state.messages, newMsg]
          };
        });
      } catch (err) {
        console.error("Failed to parse chat message event:", err);
      }
    });

    chatEventSource.addEventListener("error", (err) => {
      console.error("Chat SSE stream disconnected, reconnecting...", err);
      chatStore.setState((state) => ({
        ...state,
        isConnected: false
      }));
    });
  },

  disconnectSSE: () => {
    if (chatEventSource) {
      chatEventSource.close();
      chatEventSource = null;
    }
    chatStore.setState((state) => ({
      ...state,
      isConnected: false
    }));
  }
};
