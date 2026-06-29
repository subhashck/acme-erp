import { EventEmitter } from "node:events";

class ChatEmitter extends EventEmitter {}
export const chatEmitter = new ChatEmitter();

export function dispatchMessage(message: any) {
  if (message.channelType === "organization") {
    chatEmitter.emit("organization", message);
  } else if (message.channelType === "department" && message.departmentId) {
    chatEmitter.emit(`department:${message.departmentId}`, message);
  } else if (message.channelType === "direct") {
    chatEmitter.emit(`user:${message.senderId}`, message);
    if (message.receiverId) {
      chatEmitter.emit(`user:${message.receiverId}`, message);
    }
  }
}
