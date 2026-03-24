import type { ChatPreview, Message } from "./dashboard.types";

export function formatTime(timestamp: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

export function getDisplayName(message: Message) {
  const fullName = [message.first_name, message.last_name].filter(Boolean).join(" ");

  return message.username || fullName || "Unknown user";
}

export function getUsernameLabel(message: Message) {
  return message.username ? `@${message.username}` : "без username";
}

export function getChatPreviews(messages: Message[]) {
  const byChat = new Map<number, Message[]>();

  for (const message of messages) {
    const existing = byChat.get(message.chat_id) ?? [];
    existing.push(message);
    byChat.set(message.chat_id, existing);
  }

  const previews: ChatPreview[] = [];

  for (const [chatId, chatMessages] of byChat.entries()) {
    const latestMessage = chatMessages[0];

    previews.push({
      chatId,
      title: getDisplayName(latestMessage),
      subtitle: getUsernameLabel(latestMessage),
      lastMessage: latestMessage.text,
      lastTimestamp: latestMessage.created_at,
      totalMessages: chatMessages.length,
    });
  }

  previews.sort(
    (left, right) =>
      new Date(right.lastTimestamp).getTime() - new Date(left.lastTimestamp).getTime(),
  );

  return previews;
}
