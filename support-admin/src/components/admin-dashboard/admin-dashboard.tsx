"use client";

import { useDeferredValue, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getBrowserRealtimeClient } from "@/lib/supabase";
import { ChatSidebar } from "../chat-sidebar";
import { DashboardHero } from "../dashboard-hero";
import { KnowledgeBase } from "../knowledge-base";
import type {
  AdminDashboardProps,
  ChatAssignmentFilter,
  ChatPriorityFilter,
  ChatWorkflowFilter,
  ManagerAvailabilityStatus,
  ManagerDisplayStatus,
} from "../dashboard-shared";
import { getChatPreviews, getDisplayName, getUsernameLabel } from "../dashboard-shared";
import { MessagePanel } from "../message-panel";
import styles from "./admin-dashboard.module.css";

type ManagerStatusRealtimePayload = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: {
    manager_id?: number;
    status?: string;
  };
  old: {
    manager_id?: number;
  };
};

function isManagerAvailabilityStatus(value: unknown): value is ManagerAvailabilityStatus {
  return value === "online" || value === "away" || value === "coffee";
}

export function AdminDashboard({
  initialMessages,
  teamMessages = [],
  teamReadState,
  errorMessage,
  currentManager = null,
  managers = [],
  managerStatuses = [],
  assignments = [],
  readStates = [],
  realtimeAccessToken,
}: AdminDashboardProps) {
  const router = useRouter();
  const [, startRefresh] = useTransition();
  const [isLoggingOut, startLogout] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [isTeamChatActive, setIsTeamChatActive] = useState(true);
  const [isKnowledgeBaseActive, setIsKnowledgeBaseActive] = useState(false);
  const [assignmentFilter, setAssignmentFilter] = useState<ChatAssignmentFilter>("all");
  const [workflowFilter, setWorkflowFilter] = useState<ChatWorkflowFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<ChatPriorityFilter>("all");
  const [managerStatusOverrides, setManagerStatusOverrides] = useState(
    () => new Map<number, ManagerAvailabilityStatus | null>(),
  );
  const [onlineManagerIds, setOnlineManagerIds] = useState<Set<number>>(new Set());
  const [theme, setTheme] = useState<"light" | "dark">("light");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channelRef = useRef<any>(null);
  const isSubscribedRef = useRef(false);
  const managerRef = useRef(currentManager);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const presenceKeyRef = useRef<string | null>(null);
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const normalizedQuery = deferredSearchQuery.trim().toLowerCase();
  const chatPreviews = getChatPreviews(initialMessages, readStates, assignments);
  const assignmentsByClientId = new Map(
    assignments.map((assignment) => [assignment.client_id, assignment]),
  );
  const activeClientId = selectedClientId ?? chatPreviews[0]?.clientId ?? null;
  const managerAvailabilityById = new Map<number, ManagerAvailabilityStatus>(
    managerStatuses.map((status) => [status.manager_id, status.status]),
  );

  for (const [managerId, status] of managerStatusOverrides.entries()) {
    if (status == null) {
      managerAvailabilityById.delete(managerId);
      continue;
    }

    managerAvailabilityById.set(managerId, status);
  }

  const currentManagerStatus = currentManager
    ? (managerAvailabilityById.get(currentManager.id) ?? "online")
    : "online";
  const managerDisplayStatuses = new Map<number, ManagerDisplayStatus>();

  for (const manager of managers) {
    managerDisplayStatuses.set(
      manager.id,
      onlineManagerIds.has(manager.id)
        ? (managerAvailabilityById.get(manager.id) ?? "online")
        : "offline",
    );
  }

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

    if (workflowFilter !== "all" && chat.workflowStatus !== workflowFilter) {
      return false;
    }

    if (priorityFilter !== "all" && chat.priorityLabel !== priorityFilter) {
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
  const orderedVisibleMessages = [...visibleMessages].sort((left, right) => {
    const createdAtDiff =
      new Date(left.created_at).getTime() - new Date(right.created_at).getTime();

    if (createdAtDiff !== 0) {
      return createdAtDiff;
    }

    return Number(left.id) - Number(right.id);
  });

  const selectedChat = visibleChats.find((chat) => chat.clientId === activeClientId) ?? null;
  const selectedAssignment =
    assignments.find((assignment) => assignment.client_id === activeClientId) ?? null;

  useEffect(() => {
    managerRef.current = currentManager;
  }, [currentManager]);

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

  useEffect(() => {
    let isActive = true;
    const supabase = getBrowserRealtimeClient();

    if (!presenceKeyRef.current) {
      presenceKeyRef.current =
        window.crypto?.randomUUID?.() ??
        `presence-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }

    function clearReconnectTimer() {
      if (reconnectTimeoutRef.current != null) {
        window.clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    }

    function scheduleReconnect(failedChannel: typeof channelRef.current) {
      if (!isActive || reconnectTimeoutRef.current != null) {
        return;
      }

      reconnectTimeoutRef.current = window.setTimeout(async () => {
        reconnectTimeoutRef.current = null;

        if (!isActive) {
          return;
        }

        if (channelRef.current === failedChannel && failedChannel) {
          channelRef.current = null;
          await supabase.removeChannel(failedChannel);
        }

        if (!isActive) {
          return;
        }

        await setupRealtime();
      }, 3000);
    }

    async function setupRealtime() {
      await supabase.realtime.setAuth(realtimeAccessToken);

      if (!isActive) {
        return;
      }

      const existingChannel = channelRef.current;

      if (existingChannel) {
        channelRef.current = null;
        await supabase.removeChannel(existingChannel);
      }

      const nextChannel = supabase
        .channel("admin-messages-realtime", {
          config: { presence: { key: presenceKeyRef.current ?? "manager-presence" } },
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
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "manager_statuses",
          },
          (payload: ManagerStatusRealtimePayload) => {
            if (!isActive) {
              return;
            }

            setManagerStatusOverrides((currentStatuses) => {
              const nextStatuses = new Map(currentStatuses);
              const managerId =
                payload.eventType === "DELETE"
                  ? payload.old.manager_id
                  : payload.new.manager_id;

              if (typeof managerId !== "number") {
                return currentStatuses;
              }

              if (payload.eventType === "DELETE") {
                nextStatuses.set(managerId, null);
                return nextStatuses;
              }

              if (!isManagerAvailabilityStatus(payload.new.status)) {
                return currentStatuses;
              }

              nextStatuses.set(managerId, payload.new.status);
              return nextStatuses;
            });
          },
        )
        .on("presence", { event: "sync" }, () => {
          if (!isActive) {
            return;
          }

          const state = nextChannel.presenceState<Record<string, unknown>>();
          const nextOnlineManagerIds = new Set<number>();

          for (const presences of Object.values(state)) {
            for (const presence of presences) {
              if (typeof presence.manager_id === "number") {
                nextOnlineManagerIds.add(presence.manager_id);
              }
            }
          }

          setOnlineManagerIds(nextOnlineManagerIds);
        });

      channelRef.current = nextChannel;

      nextChannel.subscribe(async (subscribeStatus) => {
        if (!isActive || channelRef.current !== nextChannel) {
          return;
        }

        if ((subscribeStatus as string) === "SUBSCRIBED") {
          clearReconnectTimer();
          isSubscribedRef.current = true;

          const manager = managerRef.current;

          if (manager) {
            await nextChannel.track({ manager_id: manager.id });
          }

          return;
        }

        if ((subscribeStatus as string) !== "SUBSCRIBING") {
          isSubscribedRef.current = false;
          scheduleReconnect(nextChannel);
        }
      });
    }

    void setupRealtime();

    return () => {
      isActive = false;
      isSubscribedRef.current = false;
      clearReconnectTimer();
      setOnlineManagerIds(new Set());

      const activeChannel = channelRef.current;

      if (activeChannel) {
        channelRef.current = null;
        void supabase.removeChannel(activeChannel);
      }
    };
  }, [realtimeAccessToken, router, startRefresh]);

  function handleLogout() {
    startLogout(async () => {
      await fetch("/api/admin/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    });
  }

  function handleStatusChange(status: ManagerAvailabilityStatus) {
    const manager = managerRef.current;

    if (!manager) {
      return;
    }

    const previousStatus = managerAvailabilityById.get(manager.id) ?? "online";

    setManagerStatusOverrides((currentStatuses) => {
      const nextStatuses = new Map(currentStatuses);
      nextStatuses.set(manager.id, status);
      return nextStatuses;
    });

    void fetch("/api/manager-status", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    })
      .then(async (response) => {
        const payload = (await response.json()) as {
          ok?: boolean;
          status?: { manager_id?: number; status?: string };
        };
        const nextStatus = payload.status?.status;

        if (!response.ok || !payload.ok || !isManagerAvailabilityStatus(nextStatus)) {
          throw new Error("Failed to update manager status");
        }

        setManagerStatusOverrides((currentStatuses) => {
          const nextStatuses = new Map(currentStatuses);
          nextStatuses.set(manager.id, nextStatus);
          return nextStatuses;
        });
      })
      .catch(() => {
        setManagerStatusOverrides((currentStatuses) => {
          const nextStatuses = new Map(currentStatuses);
          nextStatuses.set(manager.id, previousStatus);
          return nextStatuses;
        });
      });
  }

  return (
    <main className="min-h-screen overflow-x-hidden px-3 py-3 sm:px-5 sm:py-5 lg:h-screen lg:overflow-hidden lg:px-8 lg:py-4">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 lg:h-full lg:gap-4">
        <DashboardHero
          currentManager={currentManager}
          managers={managers}
          managerStatus={currentManagerStatus}
          onStatusChange={handleStatusChange}
          totalMessages={initialMessages.length}
          totalChats={chatPreviews.length}
          theme={theme}
          isLoggingOut={isLoggingOut}
          onLogout={handleLogout}
          isKnowledgeBaseActive={isKnowledgeBaseActive}
          onToggleKnowledgeBase={() =>
            setIsKnowledgeBaseActive((current) => !current)
          }
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
          ) : isKnowledgeBaseActive ? (
            <KnowledgeBase />
          ) : (
            <div className="grid gap-3 lg:h-full lg:min-h-0 lg:gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
              <ChatSidebar
                chats={visibleChats}
                activeClientId={activeClientId}
                searchQuery={searchQuery}
                assignmentFilter={assignmentFilter}
                workflowFilter={workflowFilter}
                priorityFilter={priorityFilter}
                currentManager={currentManager}
                managers={managers}
                managerStatuses={managerDisplayStatuses}
                isTeamChatActive={isTeamChatActive}
                teamMessages={teamMessages}
                teamReadState={teamReadState}
                onSearchChange={setSearchQuery}
                onAssignmentFilterChange={setAssignmentFilter}
                onWorkflowFilterChange={setWorkflowFilter}
                onPriorityFilterChange={setPriorityFilter}
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
                managerStatuses={managerDisplayStatuses}
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
