import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components";
import type {
  ClientAssignment,
  ClientReadState,
  ManagerProfile,
  ManagerStatusRecord,
  Message,
  TeamMessage,
  TeamReadState,
} from "@/components";
import { getSupabaseSessionCookies } from "@/lib/admin-auth";
import { createAuthenticatedSupabaseClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type RawMessage = Omit<Message, "client"> & {
  client: Message["client"] extends infer Client
    ? Client extends null
      ? never
      : Client[]
    : never;
};

type RawManager = Omit<ManagerProfile, "id"> & {
  id: number | string;
};

type RawManagerStatus = Omit<ManagerStatusRecord, "manager_id"> & {
  manager_id: number | string;
};

type RawTeamMessage = Omit<TeamMessage, "id" | "sender_id" | "sender_name"> & {
  id: number | string;
  sender_id: number | string;
};

export default async function Home() {
  const cookieStore = await cookies();
  const { accessToken } = getSupabaseSessionCookies(cookieStore);

  if (!accessToken) {
    redirect("/login");
  }

  const supabase = createAuthenticatedSupabaseClient(accessToken);
  const [
    { data: userData },
    { data: messages, error: messagesError },
    { data: managersData },
    { data: managerStatusesData },
    { data: assignmentsData },
    { data: teamMessagesData },
  ] =
    await Promise.all([
      supabase.auth.getUser(accessToken),
      supabase
        .from("messages")
        .select(
          `
            id,
            client_id,
            sender_type,
            sender_label,
            text,
            created_at,
            client:clients (
              id,
              telegram_chat_id,
              username,
              first_name,
              last_name
            )
          `,
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("managers")
        .select(
          `
            id,
            auth_user_id,
            email,
            first_name,
            last_name,
            position
          `,
        )
        .order("first_name", { ascending: true }),
      supabase
        .from("manager_statuses")
        .select(
          `
            manager_id,
            status,
            updated_at
          `,
        ),
      supabase
        .from("client_assignments")
        .select(
          `
            client_id,
            assigned_manager_id,
            previous_manager_id,
            last_reassigned_by_manager_id,
            last_reassigned_by_manager_name,
            ai_auto_reply_enabled,
            workflow_status,
            priority_score,
            priority_label,
            priority_reason,
            last_client_message_at,
            last_manager_message_at,
            status_updated_at,
            priority_updated_at
          `,
        ),
      supabase
        .from("team_messages")
        .select(
          `
            id,
            sender_id,
            text,
            created_at
          `,
        )
        .order("created_at", { ascending: true }),
    ]);

  const typedMessages: Message[] = ((messages ?? []) as RawMessage[]).map((message) => ({
    ...message,
    client: message.client[0] ?? null,
  }));
  const managers: ManagerProfile[] = ((managersData ?? []) as RawManager[]).map((manager) => ({
    ...manager,
    id: Number(manager.id),
  }));
  const managerStatuses: ManagerStatusRecord[] = ((managerStatusesData ?? []) as RawManagerStatus[]).map((status) => ({
    ...status,
    manager_id: Number(status.manager_id),
  }));
  const assignments = (assignmentsData ?? []) as ClientAssignment[];
  const currentManager =
    managers.find((manager) => manager.auth_user_id === userData.user?.id) ?? null;
  const readStates = currentManager
    ? (((
        await supabase
          .from("client_read_states")
          .select(
            `
              client_id,
              manager_id,
              last_read_message_id,
              last_read_at
            `,
          )
          .eq("manager_id", currentManager.id)
      ).data ?? []) as ClientReadState[])
    : [];

  // Для team chat отображаем отправителя по уже загруженному списку managers.
  // Это надёжнее, чем полагаться на embedded relation в select team_messages.
  const teamMessages: TeamMessage[] = ((teamMessagesData ?? []) as RawTeamMessage[]).map((msg) => {
    const senderId = Number(msg.sender_id);
    const manager = managers.find((item) => item.id === senderId) ?? null;
    const senderName = [manager?.first_name, manager?.position].filter(Boolean).join(" · ");

    return {
      id: Number(msg.id),
      sender_id: senderId,
      sender_name: senderName || "Менеджер",
      text: msg.text,
      created_at: msg.created_at,
    };
  });

  // Фетчим last_read_message_id для текущего менеджера.
  // Одна строка — используется для подсчёта непрочитанных в сайдбаре.
  const teamReadState = currentManager
    ? ((await supabase
        .from("team_read_states")
        .select("manager_id, last_read_message_id")
        .eq("manager_id", currentManager.id)
        .maybeSingle()
      ).data as TeamReadState | null)
    : null;

  return (
    <AdminDashboard
      initialMessages={typedMessages}
      teamMessages={teamMessages}
      teamReadState={teamReadState}
      errorMessage={messagesError?.message ?? null}
      currentManager={currentManager}
      managers={managers}
      managerStatuses={managerStatuses}
      assignments={assignments}
      readStates={readStates}
      realtimeAccessToken={accessToken}
    />
  );
}
