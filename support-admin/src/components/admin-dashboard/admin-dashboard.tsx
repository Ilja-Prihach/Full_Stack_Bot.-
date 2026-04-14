"use client";

import { useEffect, useDeferredValue, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getBrowserRealtimeClient } from "@/lib/supabase";
import { ChatSidebar } from "../chat-sidebar";
import { DashboardHero } from "../dashboard-hero";
import type { AdminDashboardProps, ChatAssignmentFilter } from "../dashboard-shared";
import { getChatPreviews, getDisplayName, getUsernameLabel } from "../dashboard-shared";
import { MessagePanel } from "../message-panel";
import styles from "./admin-dashboard.module.css";

export function AdminDashboard({
  initialMessages,
  teamMessages = [],
  teamReadState,
  errorMessage,
  currentManager = null,
  managers = [],
  assignments = [],
  readStates = [],
  realtimeAccessToken,
}: AdminDashboardProps) {
  const router = useRouter();
  const [, startRefresh] = useTransition();
  const [isLoggingOut, startLogout] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [isTeamChatActive, setIsTeamChatActive] = useState(false);
  const [assignmentFilter, setAssignmentFilter] = useState<ChatAssignmentFilter>("all");
  const [managerStatus, setManagerStatus] = useState<"online" | "away" | "coffee">("online");
  const [onlineManagers, setOnlineManagers] = useState<Map<number, string>>(new Map());
  const [theme, setTheme] = useState<"light" | "dark">("light");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channelRef = useRef<any>(null);
  const isSubscribedRef = useRef(false);
  const managerRef = useRef(currentManager);
  managerRef.current = currentManager;
  const statusRef = useRef(managerStatus);
  statusRef.current = managerStatus;
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const normalizedQuery = deferredSearchQuery.trim().toLowerCase();
  const chatPreviews = getChatPreviews(initialMessages, readStates);
  const assignmentsByClientId = new Map(
    assignments.map((assignment) => [assignment.client_id, assignment]),
  );
  const activeClientId = selectedClientId ?? chatPreviews[0]?.clientId ?? null;

  const visibleChats = chatPreviews.filter((chat) => {
    const assignment = assignmentsByClientId.get(chat.clientId) ?? null;
    const passesAssignmentFilter =
      assignmentFilter === "all" ||
      (assignmentFilter === "unread" && chat.unreadCount > 0) ||
      (assignmentFilter === "unassigned" && assignment?.assigned_manager_id == null) ||
      (assignmentFilter === "mine" &&
        currentManager != null &&
        assignment?.assigned_manager_id === currentManager.id) ||
      (assignmentFilter.startsWith("manager:") &&
        assignment?.assigned_manager_id === Number(assignmentFilter.split(":")[1]));

    if (!passesAssignmentFilter) {
      return false;
    }

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
  const orderedVisibleMessages = [...visibleMessages].sort(
    (left, right) => {
      const createdAtDiff =
        new Date(left.created_at).getTime() - new Date(right.created_at).getTime();

      if (createdAtDiff !== 0) {
        return createdAtDiff;
      }

      return Number(left.id) - Number(right.id);
    },
  );

  const selectedChat = visibleChats.find((chat) => chat.clientId === activeClientId) ?? null;
  const selectedAssignment =
    assignments.find((assignment) => assignment.client_id === activeClientId) ?? null;
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
    const savedStatus = window.localStorage.getItem("support-admin-status");
    if (savedStatus === "online" || savedStatus === "away" || savedStatus === "coffee") {
      queueMicrotask(() => setManagerStatus(savedStatus));
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("support-admin-theme", theme);
  }, [theme]);

  useEffect(() => {
    let isActive = true;
    const supabase = getBrowserRealtimeClient();
    let currentChannel: ReturnType<typeof supabase.channel> | null = null;

    async function setupRealtime() {
      await supabase.realtime.setAuth(realtimeAccessToken);

      if (!isActive) {
        return;
      }

      currentChannel = supabase
        .channel("admin-messages-realtime", {
          config: { presence: { key: managerRef.current?.id.toString() ?? "unknown" } },
        })
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "messages",
          },
          () => {
            startRefresh(() => {
              router.refresh();
            });
          },
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "team_messages",
          },
          () => {
            startRefresh(() => {
              router.refresh();
            });
          },
        )
        .on("presence", { event: "sync" }, () => {
          if (!isActive) return;
          const state = currentChannel!.presenceState<Record<string, unknown>>();
          console.log("[presence] sync, raw state:", JSON.stringify(state));
          const map = new Map<number, string>();
          for (const presences of Object.values(state)) {
            for (const p of presences) {
              if (typeof p.manager_id === "number") {
                map.set(p.manager_id, typeof p.status === "string" ? p.status : "online");
              }
            }
          }
          console.log("[presence] resolved map:", JSON.stringify(Object.fromEntries(map)));
          setOnlineManagers(map);
        })
        .subscribe(async (subscribeStatus) => {
          console.log("[channel] subscribe status:", subscribeStatus, "isActive:", isActive);
          if ((subscribeStatus as string) === "SUBSCRIBED") {
            isSubscribedRef.current = true;
            const mgr = managerRef.current;
            if (mgr) {
              const savedStatus = window.localStorage.getItem("support-admin-status");
              const currentStatus = savedStatus === "online" || savedStatus === "away" || savedStatus === "coffee"
                ? savedStatus
                : "online";
              await currentChannel!.track({ manager_id: mgr.id, status: currentStatus });
            }
          } else if ((subscribeStatus as string) !== "SUBSCRIBING" && isActive) {
            isSubscribedRef.current = false;
            setTimeout(async () => {
              if (!isActive) return;
              await supabase.removeChannel(currentChannel!);
              if (!isActive) return;
              await setupRealtime();
            }, 3000);
          }
        });

      channelRef.current = currentChannel;
    }

    void setupRealtime();

    return () => {
      isActive = false;
      isSubscribedRef.current = false;

      if (currentChannel) {
        void supabase.removeChannel(currentChannel);
      }
    };
  }, [router, startRefresh, realtimeAccessToken]);

  function handleLogout() {
    startLogout(async () => {
      await fetch("/api/admin/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    });
  }

  function handleStatusChange(status: "online" | "away" | "coffee") {
    setManagerStatus(status);
    window.localStorage.setItem("support-admin-status", status);
    const channel = channelRef.current;
    const manager = managerRef.current;
    console.log("[status] change to:", status, "subscribed:", isSubscribedRef.current, "hasManager:", !!manager, "hasChannel:", !!channel);
    if (channel && manager && isSubscribedRef.current) {
      channel.track({ manager_id: manager.id, status }).then(() => {
        console.log("[status] track resolved:", status);
      }).catch((err: unknown) => {
        console.error("[status] track error:", err);
      });
    } else {
      console.warn("[status] skipped track — subscribed:", isSubscribedRef.current, "manager:", !!manager, "channel:", !!channel);
    }
  }

  return (
    <main className="min-h-screen overflow-x-hidden px-3 py-3 sm:px-5 sm:py-5 lg:h-screen lg:overflow-hidden lg:px-8 lg:py-4">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 lg:h-full lg:gap-4">
        <DashboardHero
          currentManager={currentManager}
          managers={managers}
          managerStatus={managerStatus}
          onStatusChange={handleStatusChange}
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
                assignmentFilter={assignmentFilter}
                currentManager={currentManager}
                managers={managers}
                onlineManagers={onlineManagers}
                isTeamChatActive={isTeamChatActive}
                teamMessages={teamMessages}
                teamReadState={teamReadState}
                onSearchChange={setSearchQuery}
                onAssignmentFilterChange={setAssignmentFilter}
                onSelectChat={(clientId) => {
                  setIsTeamChatActive(false);
                  setSelectedClientId(clientId);
                }}
                onSelectTeamChat={() => {
                  setIsTeamChatActive(true);
                  setSelectedClientId(null);
                }}
              />

              <MessagePanel
                selectedChat={isTeamChatActive ? null : selectedChat}
                messages={isTeamChatActive ? [] : orderedVisibleMessages}
                teamMessages={isTeamChatActive ? teamMessages : []}
                isTeamChatActive={isTeamChatActive}
                onlineManagers={onlineManagers}
                currentManager={currentManager}
                managers={managers}
                assignment={isTeamChatActive ? null : selectedAssignment}
              />
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
