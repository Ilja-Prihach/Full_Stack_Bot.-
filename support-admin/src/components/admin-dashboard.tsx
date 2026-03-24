"use client";

import { useDeferredValue, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Message = {
  id: string | number;
  chat_id: number;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  text: string;
  created_at: string;
};

type ChatPreview = {
  chatId: number;
  title: string;
  subtitle: string;
  lastMessage: string;
  lastTimestamp: string;
  totalMessages: number;
};

type AdminDashboardProps = {
  initialMessages: Message[];
  errorMessage: string | null;
};

function formatTime(timestamp: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(timestamp));
}

function getDisplayName(message: Message) {
  const fullName = [message.first_name, message.last_name].filter(Boolean).join(" ");

  return message.username || fullName || "Unknown user";
}

function getUsernameLabel(message: Message) {
  return message.username ? `@${message.username}` : "без username";
}

function getChatPreviews(messages: Message[]) {
  const byChat = new Map<number, Message[]>();

  for (const message of messages) {
    const existing = byChat.get(message.chat_id) ?? [];
    existing.push(message);
    byChat.set(message.chat_id, existing);
  }

  const previews: ChatPreview[] = [];

  for (const [chatId, chatMessages] of byChat.entries()) {
    const latestMessage = chatMessages[0];

    previews.push({
      chatId,
      title: getDisplayName(latestMessage),
      subtitle: getUsernameLabel(latestMessage),
      lastMessage: latestMessage.text,
      lastTimestamp: latestMessage.created_at,
      totalMessages: chatMessages.length,
    });
  }

  previews.sort(
    (left, right) =>
      new Date(right.lastTimestamp).getTime() - new Date(left.lastTimestamp).getTime(),
  );

  return previews;
}

export function AdminDashboard({
  initialMessages,
  errorMessage,
}: AdminDashboardProps) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChatId, setSelectedChatId] = useState<number | null>(null);
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const normalizedQuery = deferredSearchQuery.trim().toLowerCase();
  const chatPreviews = getChatPreviews(initialMessages);
  const activeChatId = selectedChatId ?? chatPreviews[0]?.chatId ?? null;

  const visibleChats = chatPreviews.filter((chat) => {
    if (!normalizedQuery) {
      return true;
    }

    return (
      chat.title.toLowerCase().includes(normalizedQuery) ||
      chat.subtitle.toLowerCase().includes(normalizedQuery) ||
      String(chat.chatId).includes(normalizedQuery) ||
      chat.lastMessage.toLowerCase().includes(normalizedQuery)
    );
  });

  const visibleMessages = initialMessages.filter((message) => {
    const matchesChat = activeChatId ? message.chat_id === activeChatId : true;

    if (!matchesChat) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return (
      getDisplayName(message).toLowerCase().includes(normalizedQuery) ||
      getUsernameLabel(message).toLowerCase().includes(normalizedQuery) ||
      String(message.chat_id).includes(normalizedQuery) ||
      message.text.toLowerCase().includes(normalizedQuery)
    );
  });

  const selectedChat = visibleChats.find((chat) => chat.chatId === activeChatId) ?? null;

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section
          className="overflow-hidden rounded-[32px] border p-6 shadow-[var(--shadow)] sm:p-8"
          style={{
            background:
              "linear-gradient(135deg, rgba(42,171,238,0.95), rgba(26,140,206,0.92))",
            borderColor: "rgba(255,255,255,0.28)",
          }}
        >
          <div className="flex flex-col gap-4 text-white sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-medium uppercase tracking-[0.28em] text-white/72">
                Telegram-style dashboard
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                SupportBot — Сообщения
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-white/80 sm:text-base">
                Минимальная админка с чат-листом, поиском и просмотром входящих
                сообщений без усложнения схемы данных.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm sm:min-w-80">
              <div className="rounded-2xl border border-white/22 bg-white/14 p-4 backdrop-blur-sm">
                <div className="text-white/68">Всего сообщений</div>
                <div className="mt-2 text-2xl font-semibold">{initialMessages.length}</div>
              </div>
              <div className="rounded-2xl border border-white/22 bg-white/14 p-4 backdrop-blur-sm">
                <div className="text-white/68">Чатов</div>
                <div className="mt-2 text-2xl font-semibold">{chatPreviews.length}</div>
              </div>
            </div>
          </div>
        </section>

        <section
          className="rounded-[32px] border p-4 shadow-[var(--shadow)] sm:p-5"
          style={{
            background: "linear-gradient(180deg, rgba(239,244,248,0.98), rgba(230,239,247,0.96))",
            borderColor: "var(--line)",
          }}
        >
          {errorMessage ? (
            <div className="rounded-[24px] border border-red-200 bg-red-50 p-6 text-red-700">
              Не удалось загрузить сообщения из Supabase: {errorMessage}
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
              <aside
                className="rounded-[28px] border p-4"
                style={{ background: "var(--card)", borderColor: "var(--line)" }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold">Чаты</div>
                    <div className="text-sm" style={{ color: "var(--muted)" }}>
                      {visibleChats.length} из {chatPreviews.length}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      startRefresh(() => {
                        router.refresh();
                      });
                    }}
                    className="rounded-full px-4 py-2 text-sm font-medium text-white transition-opacity disabled:cursor-wait disabled:opacity-70"
                    style={{
                      background:
                        "linear-gradient(135deg, var(--accent), var(--accent-deep))",
                    }}
                    disabled={isRefreshing}
                  >
                    {isRefreshing ? "Обновление..." : "Обновить"}
                  </button>
                </div>

                <label className="mt-4 block">
                  <span className="mb-2 block text-sm font-medium" style={{ color: "var(--muted)" }}>
                    Поиск
                  </span>
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Имя, username, chat id, текст"
                    className="w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:ring-2"
                    style={{
                      background: "rgba(230,243,255,0.55)",
                      borderColor: "var(--line)",
                      boxShadow: "0 0 0 0 rgba(42,171,238,0)",
                    }}
                  />
                </label>

                <div className="message-scrollbar mt-4 grid max-h-[62vh] gap-2 overflow-y-auto pr-1">
                  {visibleChats.length === 0 ? (
                    <div
                      className="rounded-2xl border px-4 py-5 text-sm"
                      style={{ borderColor: "var(--line)", color: "var(--muted)" }}
                    >
                      Ничего не найдено по текущему запросу.
                    </div>
                  ) : (
                    visibleChats.map((chat) => {
                      const isActive = chat.chatId === activeChatId;

                      return (
                        <button
                          key={chat.chatId}
                          type="button"
                          onClick={() => setSelectedChatId(chat.chatId)}
                          className="w-full rounded-[24px] border px-4 py-4 text-left transition"
                          style={{
                            background: isActive ? "rgba(42,171,238,0.14)" : "var(--panel)",
                            borderColor: isActive ? "rgba(42,171,238,0.35)" : "var(--line)",
                          }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate font-semibold">{chat.title}</div>
                              <div className="truncate text-sm" style={{ color: "var(--muted)" }}>
                                {chat.subtitle}
                              </div>
                            </div>
                            <div className="shrink-0 text-xs" style={{ color: "var(--muted)" }}>
                              {chat.totalMessages}
                            </div>
                          </div>
                          <div className="mt-3 truncate text-sm">{chat.lastMessage}</div>
                          <div className="mt-2 text-xs" style={{ color: "var(--muted)" }}>
                            {formatTime(chat.lastTimestamp)}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </aside>

              <section
                className="rounded-[28px] border"
                style={{ background: "var(--card)", borderColor: "var(--line)" }}
              >
                <div
                  className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                  style={{ borderColor: "var(--line)" }}
                >
                  <div className="min-w-0">
                    <div className="truncate text-xl font-semibold">
                      {selectedChat?.title ?? "Сообщения"}
                    </div>
                    <div className="truncate text-sm" style={{ color: "var(--muted)" }}>
                      {selectedChat
                        ? `${selectedChat.subtitle} • Chat ID ${selectedChat.chatId}`
                        : "Выберите чат слева"}
                    </div>
                  </div>
                  <div className="text-sm" style={{ color: "var(--muted)" }}>
                    {visibleMessages.length} сообщений
                  </div>
                </div>

                <div className="message-scrollbar grid max-h-[72vh] gap-4 overflow-y-auto p-4">
                  {visibleMessages.length === 0 ? (
                    <div
                      className="rounded-[24px] border px-6 py-12 text-center"
                      style={{ background: "var(--panel)", borderColor: "var(--line)" }}
                    >
                      <div className="text-lg font-semibold">Сообщения не найдены</div>
                      <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
                        Выберите чат или измените строку поиска.
                      </p>
                    </div>
                  ) : (
                    visibleMessages.map((message) => (
                      <article
                        key={message.id}
                        className="max-w-3xl rounded-[28px] border p-5 transition-transform duration-150 hover:-translate-y-0.5"
                        style={{
                          background:
                            "linear-gradient(180deg, var(--card-alt) 0%, rgba(255,255,255,0.98) 42%)",
                          borderColor: "var(--line)",
                        }}
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex items-center gap-3">
                              <div
                                className="flex h-11 w-11 items-center justify-center rounded-full text-base font-semibold text-white"
                                style={{
                                  background:
                                    "linear-gradient(135deg, var(--accent), var(--accent-deep))",
                                }}
                              >
                                {getDisplayName(message).slice(0, 1).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <h2 className="truncate text-lg font-semibold">
                                  {getDisplayName(message)}
                                </h2>
                                <p
                                  className="truncate text-sm"
                                  style={{ color: "var(--muted)" }}
                                >
                                  {getUsernameLabel(message)}
                                </p>
                              </div>
                            </div>

                            <p className="mt-4 whitespace-pre-wrap text-[15px] leading-7">
                              {message.text}
                            </p>
                          </div>

                          <div
                            className="min-w-fit rounded-2xl border px-4 py-3 text-sm"
                            style={{
                              borderColor: "var(--line)",
                              background: "rgba(255,255,255,0.7)",
                            }}
                          >
                            <div style={{ color: "var(--muted)" }}>Отправлено</div>
                            <div className="mt-1 font-medium">
                              {formatTime(message.created_at)}
                            </div>
                          </div>
                        </div>

                        <div
                          className="mt-4 flex flex-wrap gap-2 border-t pt-4 text-sm"
                          style={{ borderColor: "var(--line)" }}
                        >
                          <span
                            className="rounded-full px-3 py-1"
                            style={{
                              background: "rgba(42,171,238,0.12)",
                              color: "var(--accent-deep)",
                            }}
                          >
                            Chat ID: {message.chat_id}
                          </span>
                          <span
                            className="rounded-full px-3 py-1"
                            style={{
                              background: "rgba(88,113,132,0.08)",
                              color: "var(--muted)",
                            }}
                          >
                            Message #{message.id}
                          </span>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </section>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
