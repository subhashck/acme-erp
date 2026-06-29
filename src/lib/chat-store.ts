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
}

export const chatStore = new Store<ChatState>({
  channels: [
    { id: "org", name: "Organization Announcements", type: "organization" }
  ],
  activeChannel: { id: "org", name: "Organization Announcements", type: "organization" },
  messages: [],
  isConnected: false,
  colleagues: []
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

          if (!isMatch) return state;

          const exists = state.messages.some((m) => m.id === newMsg.id);
          if (exists) return state;

          return {
            ...state,
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
