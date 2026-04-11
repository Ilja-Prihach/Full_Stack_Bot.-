import { createClient } from "@supabase/supabase-js";
import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from "./config.ts";

const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

type IncomingTelegramMessage = {
  chatId: number;
  userId: number;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  text: string;
};

type SaveIncomingMessageResult = {
  error: { message: string } | null;
  shouldSendAutoReply: boolean;
};

export function hasSupabaseConfig() {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && supabase);
}

function getSenderLabel(message: IncomingTelegramMessage) {
  return message.username ?? message.firstName ?? "Клиент";
}

function getClientPatch(message: IncomingTelegramMessage) {
  return Object.fromEntries(
    Object.entries({
      username: message.username,
      first_name: message.firstName,
      last_name: message.lastName,
    }).filter(([, value]) => value !== null),
  );
}

async function findOrCreateClient(message: IncomingTelegramMessage) {
  if (!supabase) {
    throw new Error("Supabase client is not configured");
  }

  const { data: existingClient, error: selectError } = await supabase
    .from("clients")
    .select("id")
    .or(`telegram_chat_id.eq.${message.chatId},telegram_user_id.eq.${message.userId}`)
    .maybeSingle();

  if (selectError) {
    throw selectError;
  }

  if (existingClient) {
    const clientPatch = getClientPatch(message);

    if (Object.keys(clientPatch).length > 0) {
      const { error: updateError } = await supabase
        .from("clients")
        .update(clientPatch)
        .eq("id", existingClient.id);

      if (updateError) {
        throw updateError;
      }
    }

    return existingClient;
  }

  const { data: createdClient, error: insertError } = await supabase
    .from("clients")
    .insert({
      telegram_user_id: message.userId,
      telegram_chat_id: message.chatId,
      username: message.username,
      first_name: message.firstName,
      last_name: message.lastName,
    })
    .select("id")
    .single();

  if (insertError) {
    throw insertError;
  }

  return createdClient;
}

async function hasManagerReply(clientId: number) {
  if (!supabase) {
    throw new Error("Supabase client is not configured");
  }

  const { data, error } = await supabase
    .from("messages")
    .select("id")
    .eq("client_id", clientId)
    .eq("sender_type", "manager")
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

export async function saveIncomingMessage(
  message: IncomingTelegramMessage,
): Promise<SaveIncomingMessageResult> {
  if (!supabase) {
    throw new Error("Supabase client is not configured");
  }

  const client = await findOrCreateClient(message);
  const shouldSendAutoReply = !(await hasManagerReply(client.id));

  const { error } = await supabase.from("messages").insert({
    client_id: client.id,
    sender_type: "client",
    sender_manager_id: null,
    sender_label: getSenderLabel(message),
    text: message.text,
  });

  return {
    error,
    shouldSendAutoReply,
  };
}
