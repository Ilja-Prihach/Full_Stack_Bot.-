"use client";

import { useEffect, useRef } from "react";
import type { ChatAssignmentFilter, ChatPreview, ManagerProfile, TeamMessage, TeamReadState } from "../dashboard-shared";
import { formatTime } from "../dashboard-shared";
import styles from "./chat-sidebar.module.css";

type ChatSidebarProps = {
  chats: ChatPreview[];
  activeClientId: number | null;
  searchQuery: string;
  assignmentFilter: ChatAssignmentFilter;
  currentManager: ManagerProfile | null;
  managers: ManagerProfile[];
  isTeamChatActive: boolean;
  teamMessages: TeamMessage[];
  teamReadState: TeamReadState | null;
  onSearchChange: (value: string) => void;
  onAssignmentFilterChange: (filter: ChatAssignmentFilter) => void;
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

export function ChatSidebar({
  chats,
  activeClientId,
  searchQuery,
  assignmentFilter,
  currentManager,
  managers,
  isTeamChatActive,
  teamMessages = [],
  teamReadState,
  onSearchChange,
  onAssignmentFilterChange,
  onSelectChat,
  onSelectTeamChat,
}: ChatSidebarProps) {
  const filterMenuRef = useRef<HTMLDetailsElement | null>(null);

  useEffect(() => {
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
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function applyAssignmentFilter(filter: ChatAssignmentFilter) {
    onAssignmentFilterChange(filter);

    if (filterMenuRef.current) {
      filterMenuRef.current.open = false;
    }
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
                  onClick={() => applyAssignmentFilter("all")}
                  className={`${styles.filterOption} ${
                    assignmentFilter === "all" ? styles.filterOptionActive : ""
                  } w-full rounded-2xl px-3 py-2 text-left text-sm transition`}
                >
                  Все чаты
                </button>
                <button
                  type="button"
                  onClick={() => applyAssignmentFilter("unread")}
                  className={`${styles.filterOption} ${
                    assignmentFilter === "unread" ? styles.filterOptionActive : ""
                  } w-full rounded-2xl px-3 py-2 text-left text-sm transition`}
                >
                  Непрочитанные
                </button>
                <button
                  type="button"
                  onClick={() => applyAssignmentFilter("unassigned")}
                  className={`${styles.filterOption} ${
                    assignmentFilter === "unassigned" ? styles.filterOptionActive : ""
                  } w-full rounded-2xl px-3 py-2 text-left text-sm transition`}
                >
                  Без назначения
                </button>
                <button
                  type="button"
                  onClick={() => applyAssignmentFilter("mine")}
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
                      onClick={() => applyAssignmentFilter(filterValue)}
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
                {teamMessages[teamMessages.length - 1].sender_name}: {teamMessages[teamMessages.length - 1].text}
              </div>
            )}
          </button>
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
      </div>
    </aside>
  );
}
