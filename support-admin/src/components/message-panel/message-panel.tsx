import type { ChatPreview, Message } from "../dashboard-shared";
import { formatTime, getDisplayName, getUsernameLabel } from "../dashboard-shared";
import styles from "./message-panel.module.css";

type MessagePanelProps = {
  selectedChat: ChatPreview | null;
  messages: Message[];
};

export function MessagePanel({ selectedChat, messages }: MessagePanelProps) {
  return (
    <section className={`${styles.mainPanel} min-h-0 rounded-[28px] border`}>
      <div className="flex h-full min-h-0 flex-col">
        <div
          className={`${styles.panelHeader} flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between`}
        >
          <div className="min-w-0">
            <div className="truncate text-xl font-semibold">
              {selectedChat?.title ?? "Сообщения"}
            </div>
            <div className={`${styles.muted} truncate text-sm`}>
              {selectedChat
                ? `${selectedChat.subtitle} • Chat ID ${selectedChat.chatId}`
                : "Выберите чат слева"}
            </div>
          </div>
          <div className={`${styles.muted} text-sm`}>{messages.length} сообщений</div>
        </div>

        <div className="message-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
          <div className="grid gap-4">
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
              messages.map((message) => (
                <article
                  key={message.id}
                  className={`${styles.messageCard} max-w-3xl rounded-[28px] border p-5 transition-transform duration-150 hover:-translate-y-0.5`}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-3">
                        <div
                          className={`${styles.avatar} flex h-11 w-11 items-center justify-center rounded-full text-base font-semibold text-white`}
                        >
                          {getDisplayName(message).slice(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h2 className="truncate text-lg font-semibold">
                            {getDisplayName(message)}
                          </h2>
                          <p className={`${styles.muted} truncate text-sm`}>
                            {getUsernameLabel(message)}
                          </p>
                        </div>
                      </div>

                      <p className="mt-4 whitespace-pre-wrap text-[15px] leading-7">
                        {message.text}
                      </p>
                    </div>

                    <div
                      className={`${styles.messageMeta} min-w-fit rounded-2xl border px-4 py-3 text-sm`}
                    >
                      <div className={styles.muted}>Отправлено</div>
                      <div className="mt-1 font-medium">{formatTime(message.created_at)}</div>
                    </div>
                  </div>

                  <div
                    className={`${styles.messageDivider} mt-4 flex flex-wrap gap-2 border-t pt-4 text-sm`}
                  >
                    <span className={`${styles.badgePrimary} rounded-full px-3 py-1`}>
                      Chat ID: {message.chat_id}
                    </span>
                    <span className={`${styles.badgeMuted} rounded-full px-3 py-1`}>
                      Message #{message.id}
                    </span>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
