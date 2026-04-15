import type { ChatPreview, ClientReadState, ManagerDisplayStatus, Message } from "./dashboard.types";

export function formatTime(timestamp: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

export function getManagerStatusMeta(status: ManagerDisplayStatus) {
  switch (status) {
    case "away":
      return { colorClassName: "bg-yellow-500", label: "Отошёл", showCoffeeIcon: false };
    case "coffee":
      return { colorClassName: "bg-amber-700", label: "Кофе-пауза", showCoffeeIcon: true };
    case "online":
      return { colorClassName: "bg-green-500", label: "В сети", showCoffeeIcon: false };
    default:
      return { colorClassName: "bg-gray-400", label: "Офлайн", showCoffeeIcon: false };
  }
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

  return message.client?.username ? `@${message.client.username}` : "";
}

export function getClientDisplayName(message: Message) {
  const fullName = [message.client?.first_name, message.client?.last_name]
    .filter(Boolean)
    .join(" ");

  return message.client?.username || fullName || message.sender_label || `Client ${message.client_id}`;
}

export function getClientUsernameLabel(message: Message) {
  return message.client?.username
    ? `@${message.client.username}`
    : message.client?.telegram_chat_id
      ? `chat ${message.client.telegram_chat_id}`
      : "";
}

function getChatIdentity(chatMessages: Message[]) {
  const candidate =
    chatMessages.find((message) => {
      if (message.sender_type !== "client") {
        return false;
      }

      const fullName = [message.client?.first_name, message.client?.last_name]
        .filter(Boolean)
        .join(" ");

      return Boolean(message.client?.username || fullName || message.sender_label);
    }) ??
    chatMessages.find((message) => message.sender_type === "client") ??
    chatMessages[0];

  return {
    title: getClientDisplayName(candidate),
    subtitle: getClientUsernameLabel(candidate),
    telegramChatId: candidate.client?.telegram_chat_id ?? null,
  };
}

export function getChatPreviews(messages: Message[], readStates: ClientReadState[] = []) {
  const byChat = new Map<number, Message[]>();
  const readStateByClientId = new Map(readStates.map((readState) => [readState.client_id, readState]));

  for (const message of messages) {
    const existing = byChat.get(message.client_id) ?? [];
    existing.push(message);
    byChat.set(message.client_id, existing);
  }

  const previews: ChatPreview[] = [];

  for (const [clientId, chatMessages] of byChat.entries()) {
    const latestMessage = chatMessages[0];
    const identity = getChatIdentity(chatMessages);

    previews.push({
      clientId,
      telegramChatId: identity.telegramChatId,
      title: identity.title,
      subtitle: identity.subtitle,
      lastMessage: latestMessage.text,
      lastTimestamp: latestMessage.created_at,
      totalMessages: chatMessages.length,
      unreadCount: chatMessages.filter((message) => {
        if (message.sender_type !== "client") {
          return false;
        }

        const readState = readStateByClientId.get(clientId);

        if (!readState?.last_read_message_id) {
          return true;
        }

        return Number(message.id) > readState.last_read_message_id;
      }).length,
    });
  }

  previews.sort(
    (left, right) =>
      new Date(right.lastTimestamp).getTime() - new Date(left.lastTimestamp).getTime(),
  );

  return previews;
}
