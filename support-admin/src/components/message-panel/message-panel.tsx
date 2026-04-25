"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  ChatPreview,
  ClientAssignment,
  ManagerDisplayStatus,
  ManagerProfile,
  Message,
  TeamMessage,
} from "../dashboard-shared";
import { formatTime, getManagerStatusMeta } from "../dashboard-shared";
import styles from "./message-panel.module.css";

type MessagePanelProps = {
  selectedChat: ChatPreview | null;
  messages: Message[];
  teamMessages: TeamMessage[];
  isTeamChatActive: boolean;
  managerStatuses: Map<number, ManagerDisplayStatus>;
  currentManager: ManagerProfile | null;
  managers: ManagerProfile[];
  assignment: ClientAssignment | null;
};

function formatManagerName(manager: ManagerProfile) {
  return `${manager.first_name} ${manager.last_name}`.trim();
}

function getTeamMessageSenderName(message: TeamMessage, managers: ManagerProfile[]) {
  const manager = managers.find((item) => Number(item.id) === Number(message.sender_id)) ?? null;
  const computedName = [manager?.first_name, manager?.position].filter(Boolean).join(" · ");

  return computedName || message.sender_name || "Менеджер";
}

export function MessagePanel({
  selectedChat,
  messages,
  teamMessages,
  isTeamChatActive,
  managerStatuses,
  currentManager,
  managers,
  assignment,
}: MessagePanelProps) {
  const router = useRouter();
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const lastReadSyncKeyRef = useRef<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSending, startSending] = useTransition();
  const [isAssigning, startAssigning] = useTransition();

  const assignedManager =
    assignment?.assigned_manager_id != null
      ? managers.find((manager) => manager.id === assignment.assigned_manager_id) ?? null
      : null;
  const lastReassignedByManager =
    assignment?.last_reassigned_by_manager_id != null
      ? managers.find((manager) => manager.id === assignment.last_reassigned_by_manager_id) ?? null
      : null;
  const selectedChatMeta = selectedChat
    ? [
        selectedChat.subtitle || null,
        `Client ID ${selectedChat.clientId}`,
        selectedChat.telegramChatId ? `Telegram ${selectedChat.telegramChatId}` : null,
      ]
        .filter(Boolean)
        .join(" • ")
    : "Выберите чат слева";
  const latestClientMessageId =
    [...messages]
      .reverse()
      .find((message) => message.sender_type === "client")?.id ?? null;

  useEffect(() => {
    const hydrationFrame = window.requestAnimationFrame(() => {
      setIsHydrated(true);
    });

    return () => {
      window.cancelAnimationFrame(hydrationFrame);
    };
  }, []);

  useEffect(() => {
    const container = messagesContainerRef.current;

    if (!container) {
      return;
    }

    container.scrollTop = container.scrollHeight;
  }, [messages, selectedChat?.clientId]);

  useEffect(() => {
    if (!selectedChat || latestClientMessageId == null) {
      return;
    }

    const clientId = selectedChat.clientId;
    const syncKey = `${clientId}:${latestClientMessageId}`;

    if (lastReadSyncKeyRef.current === syncKey) {
      return;
    }

    let cancelled = false;

    async function markChatAsRead() {
      const response = await fetch(`/api/clients/${clientId}/read`, {
        method: "POST",
      });

      const payload = (await response.json()) as { ok?: boolean };

      if (cancelled || !response.ok || payload.ok === false) {
        return;
      }

      lastReadSyncKeyRef.current = syncKey;
      router.refresh();
    }

    void markChatAsRead();

    return () => {
      cancelled = true;
    };
  }, [latestClientMessageId, router, selectedChat]);

  // При открытии team чата — отмечаем последнее сообщение как прочитанное
  useEffect(() => {
    if (!isTeamChatActive || teamMessages.length === 0) return;

    const lastMessage = teamMessages[teamMessages.length - 1];
    const syncKey = `team:${lastMessage.id}`;

    if (lastReadSyncKeyRef.current === syncKey) return;

    let cancelled = false;

    async function markTeamChatAsRead() {
      const response = await fetch("/api/team-messages/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId: lastMessage.id }),
      });

      const payload = (await response.json()) as { ok?: boolean };

      if (cancelled || !response.ok || payload.ok === false) return;

      lastReadSyncKeyRef.current = syncKey;
      router.refresh();
    }

    void markTeamChatAsRead();

    return () => { cancelled = true; };
  }, [isTeamChatActive, teamMessages, router]);

  function sendMessage() {
    const trimmed = draft.trim();
    if (!trimmed) return;

    if (isTeamChatActive) {
      setSendError(null);

      startSending(async () => {
        const response = await fetch("/api/team-messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: trimmed }),
        });

        const payload = (await response.json()) as { ok?: boolean; error?: string };

        if (!response.ok || payload.ok === false) {
          setSendError(payload.error ?? "Не удалось отправить сообщение");
          return;
        }

        setDraft("");
        router.refresh();
      });
      return;
    }

    if (!selectedChat) return;

    setSendError(null);

    startSending(async () => {
      const response = await fetch(`/api/clients/${selectedChat.clientId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: trimmed,
        }),
      });

      const payload = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || payload.ok === false) {
        setSendError(payload.error ?? "Не удалось отправить сообщение");
        return;
      }

      setDraft("");
      router.refresh();
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendMessage();
  }

  function handleDraftKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }

    event.preventDefault();
    sendMessage();
  }

  function handleAssignmentChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const nextManagerId = event.target.value;

    if (!selectedChat) {
      return;
    }

    setAssignmentError(null);

    startAssigning(async () => {
      const response = await fetch(`/api/clients/${selectedChat.clientId}/assignment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          managerId: nextManagerId ? Number(nextManagerId) : null,
        }),
      });

      const payload = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || payload.ok === false) {
        setAssignmentError(payload.error ?? "Не удалось сохранить назначение");
        return;
      }

      router.refresh();
    });
  }

  return (
    <section className={`${styles.mainPanel} min-w-0 overflow-hidden rounded-[24px] border lg:min-h-0 lg:rounded-[28px]`}>
      <div className="flex min-w-0 flex-col lg:h-full lg:min-h-0">
        <div
          className={`${styles.panelHeader} flex flex-col gap-2 border-b px-4 py-3 sm:px-5`}
        >
          <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <div className="truncate text-base font-semibold sm:text-lg">
                  {isTeamChatActive ? "Чат команды" : (selectedChat?.title ?? "Сообщения")}
                </div>
                <span className={`${styles.messageCount} shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium`}>
                  Всего сообщений {isTeamChatActive ? teamMessages.length : messages.length}
                </span>
              </div>
              <div className={`${styles.muted} truncate text-xs sm:text-sm`}>
                {isTeamChatActive ? "Общий чат менеджеров" : selectedChatMeta}
              </div>
            </div>

            {!isTeamChatActive && (
            <div className="min-w-0 space-y-1 lg:w-[280px]">
              <div className="flex items-center justify-between gap-3">
                <span className={`${styles.muted} text-[11px] font-medium uppercase tracking-[0.08em]`}>
                  Ответственный
                </span>
                <span className={`${styles.assignmentBadge} rounded-full px-2.5 py-1 text-[11px] font-medium`}>
                  {assignedManager ? formatManagerName(assignedManager) : "Не назначен"}
                </span>
              </div>

              <label className="block">
                <select
                  value={assignment?.assigned_manager_id != null ? String(assignment.assigned_manager_id) : ""}
                  onChange={handleAssignmentChange}
                  disabled={!selectedChat || !currentManager || isAssigning}
                  className={`${styles.assignmentSelect} w-full rounded-xl px-3 py-2 text-sm outline-none`}
                >
                  <option value="">Без назначения</option>
                  {managers.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {formatManagerName(manager)} · {manager.position}
                    </option>
                  ))}
                </select>
              </label>

              <div className={`${styles.muted} min-h-[16px] truncate text-right text-[11px]`}>
                {assignmentError
                  ? assignmentError
                  : assignment?.last_reassigned_by_manager_name ||
                      (lastReassignedByManager ? formatManagerName(lastReassignedByManager) : null)
                    ? `Последнее изменение: ${
                        assignment?.last_reassigned_by_manager_name ??
                        (lastReassignedByManager ? formatManagerName(lastReassignedByManager) : "")
                      }`
                    : assignedManager
                      ? `Текущий: ${formatManagerName(assignedManager)}`
                      : "Назначение не задано"}
              </div>
            </div>
            )}
          </div>
        </div>

        <div
          ref={messagesContainerRef}
          className="message-scrollbar min-w-0 overflow-x-hidden p-3 sm:p-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto"
        >
          <div className="grid min-w-0 gap-3">
            {isTeamChatActive ? (
              teamMessages.length === 0 ? (
                <div
                  className="rounded-[24px] border px-6 py-12 text-center"
                  style={{ background: "var(--panel)", borderColor: "var(--line)" }}
                >
                  <div className="text-lg font-semibold">Пока нет сообщений</div>
                  <p className={`${styles.muted} mt-2 text-sm`}>
                    Напишите первое сообщение в чат команды.
                  </p>
                </div>
              ) : (
                teamMessages.map((message) => {
                  const isOwn = message.sender_id === currentManager?.id;
                  const senderStatus = managerStatuses.get(message.sender_id) ?? "offline";
                  const senderStatusMeta = getManagerStatusMeta(senderStatus);

                  return (
                    <article
                      key={message.id}
                      className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`${styles.messageBubble} ${
                          isOwn
                            ? styles.messageBubbleOutgoing
                            : styles.messageBubbleIncoming
                        } max-w-[88%] rounded-[20px] px-3 py-3 sm:max-w-[72%] sm:px-4 sm:py-3.5`}
                      >
                        {!isOwn && (
                          <div className="mb-2 flex items-center gap-1.5">
                            <span
                              className={`inline-block h-2 w-2 rounded-full ${senderStatusMeta.colorClassName}`}
                            />
                            <span className={`${styles.badgeMuted} rounded-full px-2.5 py-0.5 text-[11px] inline-block`}>
                              {isHydrated
                                ? getTeamMessageSenderName(message, managers)
                                : (message.sender_name || "Менеджер")}
                            </span>
                            {senderStatus === "away" && (
                              <span className="text-[10px] text-yellow-600">отошёл</span>
                            )}
                            {senderStatusMeta.showCoffeeIcon && (
                              <span className="text-xs">☕</span>
                            )}
                          </div>
                        )}
                        <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-[13px] leading-5 sm:text-[14px] sm:leading-6">
                          {message.text}
                        </p>
                        <div className="mt-2 text-right text-[11px]">
                          <span className={styles.muted}>{formatTime(message.created_at)}</span>
                        </div>
                      </div>
                    </article>
                  );
                })
              )
            ) : (
              messages.length === 0 ? (
                <div
                  className="rounded-[24px] border px-6 py-12 text-center"
                  style={{ background: "var(--panel)", borderColor: "var(--line)" }}
                >
                  <div className="text-lg font-semibold">Сообщения не найдены</div>
                  <p className={`${styles.muted} mt-2 text-sm`}>
                    Выберите чат или измените строку поиска.
                  </p>
                </div>
              ) : (
                messages.map((message) => {
                  const isManagerMessage = message.sender_type === "manager";
                  const isAiBotMessage = message.sender_type === "ai_bot";
                  const badgeLabel = isManagerMessage
                    ? "Менеджер"
                    : isAiBotMessage
                      ? "ИИ Ассистент"
                      : "Клиент";

                  return (
                    <article
                      key={message.id}
                      className={`flex ${(isManagerMessage || isAiBotMessage) ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`${styles.messageBubble} ${
                          isManagerMessage || isAiBotMessage
                            ? styles.messageBubbleOutgoing
                            : styles.messageBubbleIncoming
                        } max-w-[88%] rounded-[20px] px-3 py-3 sm:max-w-[72%] sm:px-4 sm:py-3.5`}
                      >
                        <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-[13px] leading-5 sm:text-[14px] sm:leading-6">
                          {message.text}
                        </p>

                        <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
                          <span className={`${styles.badgeMuted} rounded-full px-2.5 py-0.5`}>
                            {badgeLabel}
                          </span>
                          <span className={styles.muted}>{formatTime(message.created_at)}</span>
                        </div>
                      </div>
                    </article>
                  );
                })
              )
            )}
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className={`${styles.composer} border-t px-3 py-3 sm:px-4`}
        >
          <div className="flex flex-col gap-3">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={handleDraftKeyDown}
              placeholder={
                isTeamChatActive
                  ? "Написать в чат команды"
                  : selectedChat
                    ? `Ответить клиенту ${selectedChat.title}`
                    : "Сначала выберите чат"
              }
              disabled={(!isTeamChatActive && !selectedChat) || isSending}
              rows={3}
              className={`${styles.composerInput} min-h-[96px] w-full rounded-[20px] px-4 py-3 text-sm outline-none`}
            />
            <div className="flex items-center justify-between gap-3">
              <div className="min-h-[20px] text-sm text-red-600">{sendError ?? ""}</div>
              <button
                type="submit"
                disabled={(!isTeamChatActive && !selectedChat) || !draft.trim() || isSending}
                className={`${styles.sendButton} rounded-full px-5 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {isSending ? "Отправка..." : "Отправить"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </section>
  );
}
