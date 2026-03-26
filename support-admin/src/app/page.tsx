import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components";
import { ADMIN_AUTH_COOKIE, verifyAdminSessionToken } from "@/lib/admin-auth";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type Message = {
  id: string | number;
  chat_id: number;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  text: string;
  created_at: string;
};

export default async function Home() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(ADMIN_AUTH_COOKIE)?.value;

  if (!(await verifyAdminSessionToken(sessionToken))) {
    redirect("/login");
  }

  const { data: messages, error } = await supabase
    .from("messages")
    .select("*")
    .order("created_at", { ascending: false });

  const typedMessages = (messages ?? []) as Message[];

  return <AdminDashboard initialMessages={typedMessages} errorMessage={error?.message ?? null} />;
}
