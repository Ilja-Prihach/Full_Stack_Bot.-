import type { ChatPreview, Message } from "../dashboard-shared";
import { formatTime, getDisplayName, getUsernameLabel } from "../dashboard-shared";
import styles from "./message-panel.module.css";

type MessagePanelProps = {
  selectedChat: ChatPreview | null;
  messages: Message[];
};

export function MessagePanel({ selectedChat, messages }: MessagePanelProps) {
  return (
    <section className={`${styles.mainPanel} min-w-0 overflow-hidden rounded-[24px] border lg:min-h-0 lg:rounded-[28px]`}>
      <div className="flex min-w-0 flex-col lg:h-full lg:min-h-0">
        <div
          className={`${styles.panelHeader} flex flex-col gap-2 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5`}
        >
          <div className="min-w-0">
            <div className="truncate text-lg font-semibold sm:text-xl">
              {selectedChat?.title ?? "Сообщения"}
            </div>
            <div className={`${styles.muted} truncate text-sm`}>
              {selectedChat
                ? `${selectedChat.subtitle} • Client ID ${selectedChat.clientId}${selectedChat.telegramChatId ? ` • Telegram ${selectedChat.telegramChatId}` : ""}`
                : "Выберите чат слева"}
            </div>
          </div>
          <div className={`${styles.muted} text-sm`}>{messages.length} сообщений</div>
        </div>

        <div className="message-scrollbar min-w-0 overflow-x-hidden p-3 sm:p-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
          <div className="grid min-w-0 gap-4">
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
                  className={`${styles.messageCard} w-full min-w-0 max-w-full overflow-hidden rounded-[24px] border p-4 transition-transform duration-150 hover:-translate-y-0.5 lg:max-w-3xl sm:rounded-[28px] sm:p-5`}
                >
                  <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 w-full">
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

                      <p className="mt-4 whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-[14px] leading-6 sm:text-[15px] sm:leading-7">
                        {message.text}
                      </p>
                    </div>

                    <div
                      className={`${styles.messageMeta} w-full max-w-full rounded-2xl border px-4 py-3 text-sm sm:w-auto sm:min-w-fit`}
                    >
                      <div className={styles.muted}>Отправлено</div>
                      <div className="mt-1 font-medium">{formatTime(message.created_at)}</div>
                    </div>
                  </div>

                  <div
                    className={`${styles.messageDivider} mt-4 flex min-w-0 flex-wrap gap-2 border-t pt-4 text-sm`}
                  >
                    <span className={`${styles.badgePrimary} max-w-full break-all rounded-full px-3 py-1`}>
                      Client ID: {message.client_id}
                    </span>
                    <span className={`${styles.badgeMuted} max-w-full break-all rounded-full px-3 py-1`}>
                      {message.sender_type === "manager" ? "Менеджер" : "Клиент"}
                    </span>
                    <span className={`${styles.badgeMuted} max-w-full break-all rounded-full px-3 py-1`}>
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
