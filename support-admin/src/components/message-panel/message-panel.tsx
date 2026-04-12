"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  ChatPreview,
  ClientAssignment,
  ManagerProfile,
  Message,
} from "../dashboard-shared";
import { formatTime, getDisplayName, getUsernameLabel } from "../dashboard-shared";
import styles from "./message-panel.module.css";

type MessagePanelProps = {
  selectedChat: ChatPreview | null;
  messages: Message[];
  currentManager: ManagerProfile | null;
  managers: ManagerProfile[];
  assignment: ClientAssignment | null;
};

function formatManagerName(manager: ManagerProfile) {
  return `${manager.first_name} ${manager.last_name}`.trim();
}

export function MessagePanel({
  selectedChat,
  messages,
  currentManager,
  managers,
  assignment,
}: MessagePanelProps) {
  const router = useRouter();
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
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

  useEffect(() => {
    const container = messagesContainerRef.current;

    if (!container) {
      return;
    }

    container.scrollTop = container.scrollHeight;
  }, [messages, selectedChat?.clientId]);

  function sendMessage() {
    if (!selectedChat || !draft.trim()) {
      return;
    }

    setSendError(null);

    startSending(async () => {
      const response = await fetch(`/api/clients/${selectedChat.clientId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: draft.trim(),
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
                  {selectedChat?.title ?? "Сообщения"}
                </div>
                <span className={`${styles.messageCount} shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium`}>
                  Всего сообщений {messages.length}
                </span>
              </div>
              <div className={`${styles.muted} truncate text-xs sm:text-sm`}>
                {selectedChatMeta}
              </div>
            </div>

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
          </div>
        </div>

        <div
          ref={messagesContainerRef}
          className="message-scrollbar min-w-0 overflow-x-hidden p-3 sm:p-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto"
        >
          <div className="grid min-w-0 gap-3">
            {messages.length === 0 ? (
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

                return (
                  <article
                    key={message.id}
                    className={`flex ${isManagerMessage ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`${styles.messageBubble} ${
                        isManagerMessage
                          ? styles.messageBubbleOutgoing
                          : styles.messageBubbleIncoming
                      } max-w-[85%] rounded-[24px] px-4 py-4 sm:max-w-[75%] sm:px-5 sm:py-5`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`${styles.avatar} flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white`}
                        >
                          {getDisplayName(message).slice(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">
                            {getDisplayName(message)}
                          </div>
                          {getUsernameLabel(message) ? (
                            <div className={`${styles.muted} truncate text-xs`}>
                              {getUsernameLabel(message)}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <p className="mt-3 whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-[14px] leading-6 sm:text-[15px] sm:leading-7">
                        {message.text}
                      </p>

                      <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                        <span className={`${styles.badgeMuted} rounded-full px-3 py-1`}>
                          {isManagerMessage ? "Менеджер" : "Клиент"}
                        </span>
                        <span className={styles.muted}>{formatTime(message.created_at)}</span>
                      </div>
                    </div>
                  </article>
                );
              })
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
                selectedChat
                  ? `Ответить клиенту ${selectedChat.title}`
                  : "Сначала выберите чат"
              }
              disabled={!selectedChat || isSending}
              rows={3}
              className={`${styles.composerInput} min-h-[96px] w-full rounded-[20px] px-4 py-3 text-sm outline-none`}
            />
            <div className="flex items-center justify-between gap-3">
              <div className="min-h-[20px] text-sm text-red-600">{sendError ?? ""}</div>
              <button
                type="submit"
                disabled={!selectedChat || !draft.trim() || isSending}
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
