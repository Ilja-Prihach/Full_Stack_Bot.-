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
    <aside className={`${styles.sidebar} min-h-0 rounded-[28px] border p-4`}>
      <div className="flex h-full min-h-0 flex-col">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">Чаты</div>
            <div className={`${styles.muted} text-sm`}>{chats.length} найдено</div>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className={`${styles.refreshButton} rounded-full px-4 py-2 text-sm font-medium text-white transition-opacity disabled:cursor-wait disabled:opacity-70`}
            disabled={isRefreshing}
          >
            {isRefreshing ? "Обновление..." : "Обновить"}
          </button>
        </div>

        <label className="mt-4 block">
          <span className={`${styles.muted} mb-2 block text-sm font-medium`}>Поиск</span>
          <input
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Имя, username, chat id, текст"
            className={`${styles.searchInput} w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:ring-2`}
          />
        </label>

        <div className="message-scrollbar mt-4 grid min-h-0 flex-1 gap-2 overflow-y-auto pr-1">
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
                  className={`${styles.chatButton} ${isActive ? styles.chatButtonActive : ""} w-full rounded-[24px] border px-4 py-4 text-left transition`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
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
