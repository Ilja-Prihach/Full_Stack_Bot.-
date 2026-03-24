import type { ChatPreview } from "../dashboard-shared";
import { formatTime } from "../dashboard-shared";
import styles from "./chat-sidebar.module.css";

type ChatSidebarProps = {
  chats: ChatPreview[];
  activeChatId: number | null;
  searchQuery: string;
  isRefreshing: boolean;
  onSearchChange: (value: string) => void;
  onSelectChat: (chatId: number) => void;
  onRefresh: () => void;
};

export function ChatSidebar({
  chats,
  activeChatId,
  searchQuery,
  isRefreshing,
  onSearchChange,
  onSelectChat,
  onRefresh,
}: ChatSidebarProps) {
  return (
    <aside className={`${styles.sidebar} min-w-0 overflow-hidden rounded-[24px] border p-3 sm:p-4 lg:min-h-0 lg:rounded-[28px]`}>
      <div className="flex min-w-0 flex-col gap-3 lg:h-full lg:min-h-0 lg:gap-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-lg font-semibold">Чаты</div>
            <div className={`${styles.muted} text-sm`}>{chats.length} найдено</div>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className={`${styles.refreshButton} w-full rounded-full px-4 py-2 text-sm font-medium text-white transition-opacity disabled:cursor-wait disabled:opacity-70 sm:w-auto`}
            disabled={isRefreshing}
          >
            {isRefreshing ? "Обновление..." : "Обновить"}
          </button>
        </div>

        <label className="block lg:mt-4">
          <span className={`${styles.muted} mb-2 block text-sm font-medium`}>Поиск</span>
          <input
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Имя, username, chat id, текст"
            className={`${styles.searchInput} w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:ring-2`}
          />
        </label>

        <div className="message-scrollbar min-w-0 overflow-x-hidden grid gap-2 pr-1 lg:mt-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
          {chats.length === 0 ? (
            <div
              className={`${styles.muted} rounded-2xl border px-4 py-5 text-sm`}
              style={{ borderColor: "var(--line)" }}
            >
              Ничего не найдено по текущему запросу.
            </div>
          ) : (
            chats.map((chat) => {
              const isActive = chat.chatId === activeChatId;

              return (
                <button
                  key={chat.chatId}
                  type="button"
                  onClick={() => onSelectChat(chat.chatId)}
                  className={`${styles.chatButton} ${isActive ? styles.chatButtonActive : ""} w-full min-w-0 max-w-full overflow-hidden rounded-[22px] border px-4 py-3 text-left transition sm:rounded-[24px] sm:py-4`}
                >
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{chat.title}</div>
                      <div className={`${styles.muted} truncate text-sm`}>{chat.subtitle}</div>
                    </div>
                    <div className={`${styles.muted} shrink-0 text-xs`}>
                      {chat.totalMessages}
                    </div>
                  </div>
                  <div className="mt-3 truncate text-sm">{chat.lastMessage}</div>
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
