import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components";
import type { Message } from "@/components";
import { getSupabaseSessionCookies } from "@/lib/admin-auth";
import { createAuthenticatedSupabaseClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function Home() {
  const cookieStore = await cookies();
  const { accessToken } = getSupabaseSessionCookies(cookieStore);

  if (!accessToken) {
    redirect("/login");
  }

  const supabase = createAuthenticatedSupabaseClient(accessToken);

  const { data: messages, error } = await supabase
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
    .order("created_at", { ascending: false });

  const typedMessages = (messages ?? []) as Message[];

  return <AdminDashboard initialMessages={typedMessages} errorMessage={error?.message ?? null} />;
}
