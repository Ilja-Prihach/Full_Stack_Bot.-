import { AdminDashboard } from "@/components/admin-dashboard";
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
  const { data: messages, error } = await supabase
    .from("messages")
    .select("*")
    .order("created_at", { ascending: false });

  const typedMessages = (messages ?? []) as Message[];

  return <AdminDashboard initialMessages={typedMessages} errorMessage={error?.message ?? null} />;
}
