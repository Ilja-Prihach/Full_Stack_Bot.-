"use client";

import { useEffect, useDeferredValue, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChatSidebar } from "../chat-sidebar";
import { DashboardHero } from "../dashboard-hero";
import type { AdminDashboardProps } from "../dashboard-shared";
import { getChatPreviews, getDisplayName, getUsernameLabel } from "../dashboard-shared";
import { MessagePanel } from "../message-panel";
import styles from "./admin-dashboard.module.css";

export function AdminDashboard({
  initialMessages,
  errorMessage,
  currentManager = null,
  managers = [],
}: AdminDashboardProps) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const [isLoggingOut, startLogout] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const normalizedQuery = deferredSearchQuery.trim().toLowerCase();
  const chatPreviews = getChatPreviews(initialMessages);
  const activeClientId = selectedClientId ?? chatPreviews[0]?.clientId ?? null;

  const visibleChats = chatPreviews.filter((chat) => {
    if (!normalizedQuery) {
      return true;
    }

    return (
      chat.title.toLowerCase().includes(normalizedQuery) ||
      chat.subtitle.toLowerCase().includes(normalizedQuery) ||
      String(chat.clientId).includes(normalizedQuery) ||
      String(chat.telegramChatId ?? "").includes(normalizedQuery) ||
      chat.lastMessage.toLowerCase().includes(normalizedQuery)
    );
  });

  const visibleMessages = initialMessages.filter((message) => {
    const matchesChat = activeClientId ? message.client_id === activeClientId : true;

    if (!matchesChat) {
      return false;
    }

    if (!normalizedQuery) {
      return true;
    }

    return (
      getDisplayName(message).toLowerCase().includes(normalizedQuery) ||
      getUsernameLabel(message).toLowerCase().includes(normalizedQuery) ||
      String(message.client_id).includes(normalizedQuery) ||
      String(message.client?.telegram_chat_id ?? "").includes(normalizedQuery) ||
      message.text.toLowerCase().includes(normalizedQuery)
    );
  });

  const selectedChat = visibleChats.find((chat) => chat.clientId === activeClientId) ?? null;
  useEffect(() => {
    const savedTheme = window.localStorage.getItem("support-admin-theme");

    if (savedTheme === "light" || savedTheme === "dark") {
      queueMicrotask(() => setTheme(savedTheme));
      return;
    }

    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      queueMicrotask(() => setTheme("dark"));
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("support-admin-theme", theme);
  }, [theme]);

  function handleLogout() {
    startLogout(async () => {
      await fetch("/api/admin/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    });
  }

  return (
    <main className="min-h-screen overflow-x-hidden px-3 py-3 sm:px-5 sm:py-5 lg:h-screen lg:overflow-hidden lg:px-8 lg:py-4">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 lg:h-full lg:gap-4">
        <DashboardHero
          currentManager={currentManager}
          managers={managers}
          totalMessages={initialMessages.length}
          totalChats={chatPreviews.length}
          theme={theme}
          isLoggingOut={isLoggingOut}
          onLogout={handleLogout}
          onToggleTheme={() =>
            setTheme((currentTheme) => (currentTheme === "light" ? "dark" : "light"))
          }
        />

        <section
          className={`${styles.shell} rounded-[28px] border p-3 shadow-[var(--shadow)] sm:p-4 lg:min-h-0 lg:flex-1 lg:rounded-[32px] lg:p-5`}
        >
          {errorMessage ? (
            <div className="rounded-[24px] border border-red-200 bg-red-50 p-6 text-red-700">
              Не удалось загрузить сообщения из Supabase: {errorMessage}
            </div>
          ) : (
            <div className="grid gap-3 lg:h-full lg:min-h-0 lg:gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
              <ChatSidebar
                chats={visibleChats}
                activeClientId={activeClientId}
                searchQuery={searchQuery}
                isRefreshing={isRefreshing}
                onSearchChange={setSearchQuery}
                onSelectChat={setSelectedClientId}
                onRefresh={() => {
                  startRefresh(() => {
                    router.refresh();
                  });
                }}
              />

              <MessagePanel selectedChat={selectedChat} messages={visibleMessages} />
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
