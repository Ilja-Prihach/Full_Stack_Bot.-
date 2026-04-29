import type {
  ChatPreview,
  ClientAssignment,
  ClientReadState,
  ManagerDisplayStatus,
  Message,
  PriorityLabel,
  WorkflowStatus,
} from "./dashboard.types";

const DASHBOARD_TIME_ZONE = "Europe/Minsk";

export function formatTime(timestamp: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: DASHBOARD_TIME_ZONE,
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

  if (message.sender_type === "ai_bot") {
    return message.sender_label || "ИИ Ассистент";
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

  if (message.sender_type === "ai_bot") {
    return "автоответ";
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

function getWorkflowStatusOrder(status: WorkflowStatus) {
  switch (status) {
    case "new":
      return 0;
    case "in_progress":
      return 1;
    case "completed":
      return 2;
    default:
      return 99;
  }
}

function getLatestClientMessageTimestamp(chatMessages: Message[]) {
  return (
    chatMessages.find((message) => message.sender_type === "client")?.created_at ??
    chatMessages[0]?.created_at ??
    null
  );
}

function getPriorityLabelRank(priority: PriorityLabel) {
  switch (priority) {
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
      return 1;
    default:
      return 0;
  }
}

export function getChatPreviews(
  messages: Message[],
  readStates: ClientReadState[] = [],
  assignments: ClientAssignment[] = [],
) {
  const byChat = new Map<number, Message[]>();
  const readStateByClientId = new Map(readStates.map((readState) => [readState.client_id, readState]));
  const assignmentsByClientId = new Map(
    assignments.map((assignment) => [assignment.client_id, assignment]),
  );

  for (const message of messages) {
    const existing = byChat.get(message.client_id) ?? [];
    existing.push(message);
    byChat.set(message.client_id, existing);
  }

  const previews: ChatPreview[] = [];

  for (const [clientId, chatMessages] of byChat.entries()) {
    const latestMessage = chatMessages[0];
    const identity = getChatIdentity(chatMessages);
    const assignment = assignmentsByClientId.get(clientId) ?? null;
    const workflowStatus = assignment?.workflow_status ?? "new";
    const priorityMode = assignment?.priority_mode ?? "auto";
    const manualPriorityLabel = assignment?.manual_priority_label ?? null;
    const priorityScore = assignment?.priority_score ?? 0;
    const priorityLabel = assignment?.priority_label ?? "low";
    const priorityReason = assignment?.priority_reason ?? null;
    const lastClientTimestamp =
      assignment?.last_client_message_at ?? getLatestClientMessageTimestamp(chatMessages);

    previews.push({
      clientId,
      telegramChatId: identity.telegramChatId,
      title: identity.title,
      subtitle: identity.subtitle,
      lastMessage: latestMessage.text,
      lastTimestamp: latestMessage.created_at,
      totalMessages: chatMessages.length,
      workflowStatus,
      priorityMode,
      manualPriorityLabel,
      priorityScore,
      priorityLabel,
      priorityReason,
      isAssigned: assignment?.assigned_manager_id != null,
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

    if (lastClientTimestamp) {
      previews[previews.length - 1].lastTimestamp = lastClientTimestamp;
    }
  }

  previews.sort((left, right) => {
    const statusDiff =
      getWorkflowStatusOrder(left.workflowStatus) - getWorkflowStatusOrder(right.workflowStatus);

    if (statusDiff !== 0) {
      return statusDiff;
    }

    const assignmentDiff = Number(left.isAssigned) - Number(right.isAssigned);

    if (assignmentDiff !== 0) {
      return assignmentDiff;
    }

    const manualModeDiff = Number(right.priorityMode === "manual") - Number(left.priorityMode === "manual");

    if (manualModeDiff !== 0) {
      return manualModeDiff;
    }

    if (left.priorityMode === "manual" && right.priorityMode === "manual") {
      const manualPriorityDiff =
        getPriorityLabelRank(right.manualPriorityLabel ?? "low") -
        getPriorityLabelRank(left.manualPriorityLabel ?? "low");

      if (manualPriorityDiff !== 0) {
        return manualPriorityDiff;
      }
    }

    const priorityDiff = right.priorityScore - left.priorityScore;

    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    return new Date(right.lastTimestamp).getTime() - new Date(left.lastTimestamp).getTime();
  });

  return previews;
}
