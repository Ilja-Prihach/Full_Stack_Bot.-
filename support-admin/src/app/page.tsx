import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components";
import type { ClientAssignment, ClientReadState, ManagerProfile, Message, TeamMessage, TeamReadState } from "@/components";
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

export default async function Home() {
  const cookieStore = await cookies();
  const { accessToken } = getSupabaseSessionCookies(cookieStore);

  if (!accessToken) {
    redirect("/login");
  }

  const supabase = createAuthenticatedSupabaseClient(accessToken);
  const [{ data: userData }, { data: messages, error: messagesError }, { data: managersData }, { data: assignmentsData }, { data: teamMessagesData }] =
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
        .from("client_assignments")
        .select(
          `
            client_id,
            assigned_manager_id,
            previous_manager_id,
            last_reassigned_by_manager_id,
            last_reassigned_by_manager_name
          `,
        ),
      supabase
        .from("team_messages")
        .select(
          `
            id,
            sender_id,
            text,
            created_at,
            managers (
              first_name,
              last_name
            )
          `,
        )
        .order("created_at", { ascending: true }),
    ]);

  const typedMessages: Message[] = ((messages ?? []) as RawMessage[]).map((message) => ({
    ...message,
    client: message.client[0] ?? null,
  }));
  const managers = (managersData ?? []) as ManagerProfile[];
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

  // Supabase при JOIN возвращает managers как массив.
  // Берём первый элемент и собираем "Имя Фамилия" в sender_name.
  // Если менеджера вдруг нет — фолбэк "Менеджер".
  const teamMessages: TeamMessage[] = ((teamMessagesData ?? []) as Array<{
    id: number;
    sender_id: number;
    text: string;
    created_at: string;
    managers: Array<{ first_name: string; last_name: string }>;
  }>).map((msg) => ({
    id: msg.id,
    sender_id: msg.sender_id,
    sender_name: msg.managers?.[0]
      ? `${msg.managers[0].first_name} ${msg.managers[0].last_name}`
      : "Менеджер",
    text: msg.text,
    created_at: msg.created_at,
  }));

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
      assignments={assignments}
      readStates={readStates}
      realtimeAccessToken={accessToken}
    />
  );
}
