import type { ChatPreview, Message } from "./dashboard.types";

export function formatTime(timestamp: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

export function getDisplayName(message: Message) {
  if (message.sender_type === "manager") {
    return message.sender_label || "Менеджер";
  }

  const fullName = [message.client?.first_name, message.client?.last_name]
    .filter(Boolean)
    .join(" ");

  return message.client?.username || fullName || message.sender_label || "Unknown user";
}

export function getUsernameLabel(message: Message) {
  if (message.sender_type === "manager") {
    return "менеджер";
  }

  return message.client?.username ? `@${message.client.username}` : "без username";
}

export function getClientDisplayName(message: Message) {
  const fullName = [message.client?.first_name, message.client?.last_name]
    .filter(Boolean)
    .join(" ");

  return message.client?.username || fullName || "Unknown user";
}

export function getClientUsernameLabel(message: Message) {
  return message.client?.username ? `@${message.client.username}` : "без username";
}

export function getChatPreviews(messages: Message[]) {
  const byChat = new Map<number, Message[]>();

  for (const message of messages) {
    const existing = byChat.get(message.client_id) ?? [];
    existing.push(message);
    byChat.set(message.client_id, existing);
  }

  const previews: ChatPreview[] = [];

  for (const [clientId, chatMessages] of byChat.entries()) {
    const latestMessage = chatMessages[0];

    previews.push({
      clientId,
      telegramChatId: latestMessage.client?.telegram_chat_id ?? null,
      title: getClientDisplayName(latestMessage),
      subtitle: getClientUsernameLabel(latestMessage),
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
