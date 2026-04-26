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
  clientId: number | null;
  messageId: number | null;
};

type AiReplyEventInput = {
  clientId: number;
  sourceMessageId: number | null;
  replyType: "greeting" | "answer" | "fallback" | "none";
  decision: string;
  confidence?: number | null;
  kbEntryIds?: number[];
  messageText?: string | null;
  replyText?: string | null;
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

async function isAiAutoReplyEnabled(clientId: number) {
  if (!supabase) {
    throw new Error("Supabase client is not configured");
  }

  const { data, error } = await supabase
    .from("client_assignments")
    .select("ai_auto_reply_enabled")
    .eq("client_id", clientId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.ai_auto_reply_enabled ?? true;
}

export async function saveIncomingMessage(
  message: IncomingTelegramMessage,
): Promise<SaveIncomingMessageResult> {
  if (!supabase) {
    throw new Error("Supabase client is not configured");
  }

  const client = await findOrCreateClient(message);
  const shouldSendAutoReply = await isAiAutoReplyEnabled(client.id);

  const { data, error } = await supabase
    .from("messages")
    .insert({
      client_id: client.id,
      sender_type: "client",
      sender_manager_id: null,
      sender_label: getSenderLabel(message),
      text: message.text,
    })
    .select("id")
    .single();

  return {
    error,
    shouldSendAutoReply,
    clientId: client.id ?? null,
    messageId: data?.id ?? null,
  };
}

export async function saveAiBotMessage(clientId: number, text: string) {
  if (!supabase) {
    throw new Error("Supabase client is not configured");
  }

  const { error } = await supabase.from("messages").insert({
    client_id: clientId,
    sender_type: "ai_bot",
    sender_manager_id: null,
    sender_label: "ИИ Ассистент",
    text,
  });

  return { error };
}

export async function getTodayAiReplyCount(clientId: number) {
  if (!supabase) {
    throw new Error("Supabase client is not configured");
  }

  const today = new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from("ai_daily_usage")
    .select("reply_count")
    .eq("usage_date", today)
    .eq("client_id", clientId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.reply_count ?? 0;
}

export async function incrementTodayAiReplyCount(clientId: number) {
  if (!supabase) {
    throw new Error("Supabase client is not configured");
  }

  const today = new Date().toISOString().slice(0, 10);
  const currentCount = await getTodayAiReplyCount(clientId);

  const { error } = await supabase.from("ai_daily_usage").upsert(
    {
      usage_date: today,
      client_id: clientId,
      reply_count: currentCount + 1,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "usage_date,client_id" },
  );

  return { error };
}

export async function getLastAiReplyAt(clientId: number) {
  if (!supabase) {
    throw new Error("Supabase client is not configured");
  }

  const { data, error } = await supabase
    .from("ai_reply_events")
    .select("created_at")
    .eq("client_id", clientId)
    .in("reply_type", ["greeting", "answer", "fallback"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.created_at ?? null;
}

export async function saveAiReplyEvent(input: AiReplyEventInput) {
  if (!supabase) {
    throw new Error("Supabase client is not configured");
  }

  const { error } = await supabase.from("ai_reply_events").insert({
    client_id: input.clientId,
    source_message_id: input.sourceMessageId,
    reply_type: input.replyType,
    decision: input.decision,
    confidence: input.confidence ?? null,
    kb_entry_ids: input.kbEntryIds ?? [],
    message_text: input.messageText ?? null,
    reply_text: input.replyText ?? null,
  });

  return { error };
}
