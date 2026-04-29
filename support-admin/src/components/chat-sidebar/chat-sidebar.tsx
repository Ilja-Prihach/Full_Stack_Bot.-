"use client";

import { useEffect, useRef, useState } from "react";
import type {
  ChatAssignmentFilter,
  ChatPriorityFilter,
  ChatPreview,
  ChatWorkflowFilter,
  ManagerDisplayStatus,
  ManagerProfile,
  TeamMessage,
  TeamReadState,
  WorkflowStatus,
} from "../dashboard-shared";
import { formatTime, getManagerStatusMeta } from "../dashboard-shared";
import styles from "./chat-sidebar.module.css";

type ChatSidebarProps = {
  chats: ChatPreview[];
  activeClientId: number | null;
  searchQuery: string;
  assignmentFilter: ChatAssignmentFilter;
  workflowFilter: ChatWorkflowFilter;
  priorityFilter: ChatPriorityFilter;
  currentManager: ManagerProfile | null;
  managers: ManagerProfile[];
  managerStatuses: Map<number, ManagerDisplayStatus>;
  isTeamChatActive: boolean;
  teamMessages: TeamMessage[];
  teamReadState: TeamReadState | null;
  onSearchChange: (value: string) => void;
  onAssignmentFilterChange: (filter: ChatAssignmentFilter) => void;
  onWorkflowFilterChange: (filter: ChatWorkflowFilter) => void;
  onPriorityFilterChange: (filter: ChatPriorityFilter) => void;
  onSelectChat: (clientId: number) => void;
  onSelectTeamChat: () => void;
};

function getFilterLabel(
  filter: ChatAssignmentFilter,
  currentManager: ManagerProfile | null,
  managers: ManagerProfile[],
) {
  if (filter === "all") {
    return "Все чаты";
  }

  if (filter === "unread") {
    return "Непрочитанные";
  }

  if (filter === "unassigned") {
    return "Без назначения";
  }

  if (filter === "mine") {
    return currentManager ? "Назначены мне" : "Назначены мне";
  }

  if (filter.startsWith("manager:")) {
    const managerId = Number(filter.split(":")[1]);
    const manager = managers.find((item) => item.id === managerId);

    if (manager) {
      return `${manager.first_name} ${manager.last_name}`.trim();
    }
  }

  return "Все чаты";
}

function getWorkflowFilterLabel(filter: ChatWorkflowFilter) {
  switch (filter) {
    case "new":
      return "Новые";
    case "in_progress":
      return "В работе";
    case "waiting_client":
      return "Ждут клиента";
    case "completed":
      return "Завершённые";
    default:
      return "Все статусы";
  }
}

function getPriorityFilterLabel(filter: ChatPriorityFilter) {
  switch (filter) {
    case "high":
      return "High";
    case "medium":
      return "Medium";
    case "low":
      return "Low";
    default:
      return "Все приоритеты";
  }
}

function getWorkflowStatusLabel(status: WorkflowStatus) {
  switch (status) {
    case "new":
      return "Новый";
    case "in_progress":
      return "В работе";
    case "waiting_client":
      return "Ждёт клиента";
    case "completed":
      return "Завершён";
    default:
      return "Новый";
  }
}

export function ChatSidebar({
  chats,
  activeClientId,
  searchQuery,
  assignmentFilter,
  workflowFilter,
  priorityFilter,
  currentManager,
  managers,
  managerStatuses,
  isTeamChatActive,
  teamMessages = [],
  teamReadState,
  onSearchChange,
  onAssignmentFilterChange,
  onWorkflowFilterChange,
  onPriorityFilterChange,
  onSelectChat,
  onSelectTeamChat,
}: ChatSidebarProps) {
  const filterMenuRef = useRef<HTMLDetailsElement | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const hydrationFrame = window.requestAnimationFrame(() => {
      setIsHydrated(true);
    });

    function handlePointerDown(event: PointerEvent) {
      const filterMenu = filterMenuRef.current;

      if (!filterMenu?.open) {
        return;
      }

      if (event.target instanceof Node && !filterMenu.contains(event.target)) {
        filterMenu.open = false;
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && filterMenuRef.current?.open) {
        filterMenuRef.current.open = false;
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(hydrationFrame);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function applyAssignmentFilter(filter: ChatAssignmentFilter) {
    onAssignmentFilterChange(filter);
  }

  function closeFilterMenu() {
    if (filterMenuRef.current) {
      filterMenuRef.current.open = false;
    }
  }

  function applyWorkflowFilter(filter: ChatWorkflowFilter) {
    onWorkflowFilterChange(filter);
    closeFilterMenu();
  }

  function applyPriorityFilter(filter: ChatPriorityFilter) {
    onPriorityFilterChange(filter);
    closeFilterMenu();
  }

  function applyAssignmentFilterAndClose(filter: ChatAssignmentFilter) {
    applyAssignmentFilter(filter);
    closeFilterMenu();
  }

  function getTeamMessageSenderName(message: TeamMessage) {
    if (!isHydrated) {
      return message.sender_name || "Менеджер";
    }

    const manager = managers.find((item) => Number(item.id) === Number(message.sender_id)) ?? null;
    const computedName = [manager?.first_name, manager?.position].filter(Boolean).join(" · ");

    return computedName || message.sender_name || "Менеджер";
  }

  return (
    <aside className={`${styles.sidebar} min-w-0 overflow-hidden rounded-[24px] border p-3 sm:p-4 lg:min-h-0 lg:rounded-[28px]`}>
      <div className="flex min-w-0 flex-col gap-3 lg:h-full lg:min-h-0 lg:gap-0">
        <div className="flex items-baseline justify-between gap-3">
          <div className="text-lg font-semibold">Чаты</div>
          <div className={`${styles.muted} text-sm`}>{chats.length} найдено</div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <details ref={filterMenuRef} className={`${styles.filterMenu} relative shrink-0`}>
            <summary
              className={`${styles.filterSummary} flex list-none items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition`}
            >
              <span>Фильтр</span>
              <span className={`${styles.filterValue} rounded-full px-2 py-1 text-[11px]`}>
                {getFilterLabel(assignmentFilter, currentManager, managers)}
              </span>
            </summary>

            <div className={`${styles.filterPopover} absolute left-0 top-[calc(100%+0.5rem)] z-20 w-72 rounded-[20px] p-3 shadow-2xl`}>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => applyAssignmentFilterAndClose("all")}
                  className={`${styles.filterOption} ${
                    assignmentFilter === "all" ? styles.filterOptionActive : ""
                  } w-full rounded-2xl px-3 py-2 text-left text-sm transition`}
                >
                  Все чаты
                </button>
                <button
                  type="button"
                  onClick={() => applyAssignmentFilterAndClose("unread")}
                  className={`${styles.filterOption} ${
                    assignmentFilter === "unread" ? styles.filterOptionActive : ""
                  } w-full rounded-2xl px-3 py-2 text-left text-sm transition`}
                >
                  Непрочитанные
                </button>
                <button
                  type="button"
                  onClick={() => applyAssignmentFilterAndClose("unassigned")}
                  className={`${styles.filterOption} ${
                    assignmentFilter === "unassigned" ? styles.filterOptionActive : ""
                  } w-full rounded-2xl px-3 py-2 text-left text-sm transition`}
                >
                  Без назначения
                </button>
                <button
                  type="button"
                  onClick={() => applyAssignmentFilterAndClose("mine")}
                  className={`${styles.filterOption} ${
                    assignmentFilter === "mine" ? styles.filterOptionActive : ""
                  } w-full rounded-2xl px-3 py-2 text-left text-sm transition`}
                >
                  Назначены мне
                </button>
              </div>

              <div className={`${styles.muted} mt-3 mb-2 px-1 text-[11px] font-medium uppercase tracking-[0.08em]`}>
                По менеджерам
              </div>
              <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
                {managers.map((manager) => {
                  const filterValue = `manager:${manager.id}` as ChatAssignmentFilter;
                  const managerName = `${manager.first_name} ${manager.last_name}`.trim();

                  return (
                    <button
                      key={manager.id}
                      type="button"
                      onClick={() => applyAssignmentFilterAndClose(filterValue)}
                      className={`${styles.filterOption} ${
                        assignmentFilter === filterValue ? styles.filterOptionActive : ""
                      } w-full rounded-2xl px-3 py-2 text-left text-sm transition`}
                    >
                      <div className="truncate font-medium">{managerName}</div>
                      <div className={`${styles.muted} truncate text-xs`}>{manager.position}</div>
                    </button>
                  );
                })}
              </div>

              <div className={`${styles.muted} mt-3 mb-2 px-1 text-[11px] font-medium uppercase tracking-[0.08em]`}>
                По статусу
              </div>
              <div className="space-y-1">
                {(["all", "new", "in_progress", "waiting_client", "completed"] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => applyWorkflowFilter(filter)}
                    className={`${styles.filterOption} ${
                      workflowFilter === filter ? styles.filterOptionActive : ""
                    } w-full rounded-2xl px-3 py-2 text-left text-sm transition`}
                  >
                    {getWorkflowFilterLabel(filter)}
                  </button>
                ))}
              </div>

              <div className={`${styles.muted} mt-3 mb-2 px-1 text-[11px] font-medium uppercase tracking-[0.08em]`}>
                По приоритету
              </div>
              <div className="space-y-1">
                {(["all", "high", "medium", "low"] as const).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => applyPriorityFilter(filter)}
                    className={`${styles.filterOption} ${
                      priorityFilter === filter ? styles.filterOptionActive : ""
                    } w-full rounded-2xl px-3 py-2 text-left text-sm transition`}
                  >
                    {getPriorityFilterLabel(filter)}
                  </button>
                ))}
              </div>
            </div>
          </details>

          <label className="min-w-0 flex-1">
            <span className="sr-only">Поиск</span>
            <input
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Имя, username, client id, текст"
              className={`${styles.searchInput} w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:ring-2`}
            />
          </label>
        </div>

        <div
          className={`${styles.chatList} message-scrollbar min-w-0 overflow-x-hidden overflow-y-auto grid auto-rows-max content-start gap-2 pr-1 lg:mt-4 lg:min-h-0 lg:flex-1`}
        >
          <button
            type="button"
            onClick={onSelectTeamChat}
            className={`${styles.chatButton} ${isTeamChatActive ? styles.chatButtonActive : ""} w-full min-w-0 max-w-full overflow-hidden rounded-[22px] border px-4 py-3 text-left transition sm:rounded-[24px] sm:py-4`}
          >
            <div className="flex min-w-0 items-center justify-between gap-3">
              <div className="truncate font-semibold">Чат команды</div>
              {(() => {
                const lastReadId = teamReadState?.last_read_message_id ?? 0;
                const unreadCount = teamMessages.filter((m) => m.id > lastReadId).length;
                return unreadCount > 0 ? (
                  <span className={`${styles.unreadBadge} rounded-full px-2 py-0.5 text-[11px] font-medium`}>
                    {unreadCount}
                  </span>
                ) : null;
              })()}
            </div>
            {teamMessages.length > 0 && (
              <div className="mt-2 truncate text-sm">
                {getTeamMessageSenderName(teamMessages[teamMessages.length - 1])}: {teamMessages[teamMessages.length - 1].text}
              </div>
            )}
          </button>

          <details className="group">
            <summary
              className={`${styles.chatButton} w-full min-w-0 max-w-full cursor-pointer list-none overflow-hidden rounded-[22px] border px-4 py-3 text-left transition sm:rounded-[24px] sm:py-4`}
            >
              <div className="flex min-w-0 items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <svg
                    viewBox="0 0 20 20" fill="currentColor"
                    className="h-3.5 w-3.5 shrink-0 text-[var(--muted-fg)] transition-transform group-open:rotate-90"
                  >
                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                  </svg>
                  <span className="truncate font-semibold">Менеджеры</span>
                </div>
                <span className={`${styles.unreadBadge} rounded-full px-2 py-0.5 text-[11px] font-medium`}>
                  {managers.length}
                </span>
              </div>
            </summary>

            <div className="mt-2 grid gap-2">
              {managers.map((manager) => {
                const isCurrent = currentManager?.id === manager.id;
                const status = managerStatuses.get(manager.id) ?? "offline";
                const statusMeta = getManagerStatusMeta(status);

                return (
                  <div
                    key={manager.id}
                    className={`${styles.chatButton} w-full min-w-0 max-w-full overflow-hidden rounded-[22px] border px-4 py-3 sm:rounded-[24px] sm:py-4 ${isCurrent ? styles.chatButtonActive : ""}`}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${statusMeta.colorClassName}`} />
                      <span className="truncate font-semibold">
                        {manager.first_name} {manager.last_name}
                      </span>
                      {isCurrent && (
                        <span className={`${styles.unreadBadge} rounded-full px-2 py-0.5 text-[11px] font-medium`}>
                          Вы
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-[var(--muted-fg)]">{manager.position}</div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-[var(--muted-fg)]">
                      <span>{statusMeta.label}</span>
                      {statusMeta.showCoffeeIcon && <span>☕</span>}
                      <span className="truncate">{manager.email}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </details>

          <details className="group">
            <summary
              className={`${styles.chatButton} w-full min-w-0 max-w-full cursor-pointer list-none overflow-hidden rounded-[22px] border px-4 py-3 text-left transition sm:rounded-[24px] sm:py-4`}
            >
              <div className="flex min-w-0 items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <svg
                    viewBox="0 0 20 20" fill="currentColor"
                    className="h-3.5 w-3.5 shrink-0 text-[var(--muted-fg)] transition-transform group-open:rotate-90"
                  >
                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                  </svg>
                  <span className="truncate font-semibold">Чаты с клиентами</span>
                </div>
                <span className={`${styles.unreadBadge} rounded-full px-2 py-0.5 text-[11px] font-medium`}>
                  {chats.length}
                </span>
              </div>
            </summary>

            <div className="mt-2 grid gap-2">
              {chats.length === 0 ? (
                <div
                  className={`${styles.muted} rounded-2xl border px-4 py-5 text-sm`}
                  style={{ borderColor: "var(--line)" }}
                >
                  Ничего не найдено по текущему запросу.
                </div>
              ) : (
                chats.map((chat) => {
                  const isActive = chat.clientId === activeClientId;

                  return (
                    <button
                      key={chat.clientId}
                      type="button"
                      onClick={() => onSelectChat(chat.clientId)}
                      className={`${styles.chatButton} ${isActive ? styles.chatButtonActive : ""} w-full min-w-0 max-w-full overflow-hidden rounded-[22px] border px-4 py-3 text-left transition sm:rounded-[24px] sm:py-4`}
                    >
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-semibold">{chat.title}</div>
                          {chat.subtitle ? (
                            <div className={`${styles.muted} truncate text-sm`}>{chat.subtitle}</div>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 items-center">
                          {chat.unreadCount > 0 ? (
                            <span className={`${styles.unreadBadge} rounded-full px-2 py-0.5 text-[11px] font-medium`}>
                              {chat.unreadCount}
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <div className="mt-3 truncate text-sm">{chat.lastMessage}</div>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-medium text-sky-700">
                          {getWorkflowStatusLabel(chat.workflowStatus)}
                        </span>
                        <span className={`${chat.priorityLabel === "high" ? "bg-red-100 text-red-700" : chat.priorityLabel === "medium" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700"} rounded-full px-2 py-0.5 text-[10px] font-medium`}>
                          {chat.priorityLabel.toUpperCase()}{chat.priorityMode === "manual" ? " · ручной" : ""}
                        </span>
                        {!chat.isAssigned ? (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                            Без назначения
                          </span>
                        ) : null}
                      </div>
                      {chat.priorityReason ? (
                        <div className={`${styles.muted} mt-2 truncate text-xs`}>
                          {chat.priorityReason}
                        </div>
                      ) : null}
                      {chat.telegramChatId ? (
                        <div className={`${styles.muted} mt-2 truncate text-xs`}>
                          Telegram chat: {chat.telegramChatId}
                        </div>
                      ) : null}
                      <div className={`${styles.muted} mt-2 text-xs`}>
                        {formatTime(chat.lastTimestamp)}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </details>
        </div>
      </div>
    </aside>
  );
}
