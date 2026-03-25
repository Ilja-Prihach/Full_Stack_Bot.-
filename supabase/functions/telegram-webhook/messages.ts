import { createClient } from "@supabase/supabase-js";
import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from "./config.ts";

const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

export function hasSupabaseConfig() {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && supabase);
}

export async function saveIncomingMessage(message: {
  chatId: number;
  userId: number;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  text: string;
}) {
  if (!supabase) {
    throw new Error("Supabase client is not configured");
  }

  return await supabase.from("messages").insert({
    chat_id: message.chatId,
    user_id: message.userId,
    username: message.username,
    first_name: message.firstName,
    last_name: message.lastName,
    text: message.text,
  });
}
