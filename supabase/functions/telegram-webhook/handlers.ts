import {
  INTERNAL_API_TOKEN,
  INTERNAL_APP_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
  TELEGRAM_BOT_TOKEN,
} from "./config.ts";
import { hasSupabaseConfig, saveAiBotMessage, saveIncomingMessage } from "./messages.ts";
import { sendTelegramMessage, type TelegramMessageData } from "./telegram.ts";

const FALLBACK_REPLY =
  "К сожалению, я не нашёл точного ответа на ваш вопрос. Я передал ваш запрос менеджеру — он свяжется с вами в ближайшее время.";

type AutoReplyApiResponse = {
  ok?: boolean;
  shouldReply?: boolean;
  answer?: string | null;
  confidence?: number;
  matchedEntryIds?: number[];
  reason?: string;
  error?: string;
};

async function requestAutoReply(messageText: string, clientId: number, sourceMessageId: number) {
  if (!INTERNAL_APP_URL || !INTERNAL_API_TOKEN) {
    throw new Error("Internal AI API is not configured");
  }

  const response = await fetch(`${INTERNAL_APP_URL}/api/ai/auto-reply`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-api-token": INTERNAL_API_TOKEN,
    },
    body: JSON.stringify({
      messageText,
      clientId,
      sourceMessageId,
    }),
  });

  const payload = (await response.json()) as AutoReplyApiResponse;

  if (!response.ok || payload.ok === false) {
    throw new Error(payload.error ?? "Auto-reply API request failed");
  }

  return payload;
}

export async function handleStartCommand(chatId: number) {
  console.log("Handling /start command");

  await sendTelegramMessage(
    chatId,
    "Привет! Я бот поддержки.\nОтправьте сюда ваш вопрос или сообщение, и менеджер увидит его в админке.",
  );

  return new Response("OK", { status: 200 });
}

export async function handleIncomingTextMessage(message: TelegramMessageData) {
  if (!message.chatId || !message.userId || !message.text) {
    throw new Error("Unsupported message payload");
  }

  if (!TELEGRAM_BOT_TOKEN || !hasSupabaseConfig()) {
    console.error("Missing TELEGRAM_BOT_TOKEN or Supabase config", {
      hasTelegramToken: Boolean(TELEGRAM_BOT_TOKEN),
      hasSupabaseUrl: Boolean(SUPABASE_URL),
      hasServiceRoleKey: Boolean(SUPABASE_SERVICE_ROLE_KEY),
      hasSupabaseClient: hasSupabaseConfig(),
    });

    return new Response("Server misconfigured", { status: 500 });
  }

  const { error, shouldSendAutoReply, clientId, messageId } = await saveIncomingMessage({
    chatId: message.chatId,
    userId: message.userId,
    username: message.username,
    firstName: message.firstName,
    lastName: message.lastName,
    text: message.messageText,
  });

  if (error) {
    console.error("Failed to save message:", error);
    return Response.json({ ok: false }, { status: 500 });
  }

  if (!shouldSendAutoReply || !clientId || !messageId) {
    return Response.json({ ok: true });
  }

  try {
    const aiResult = await requestAutoReply(message.messageText, clientId, messageId);
    const replyText =
      aiResult.shouldReply && aiResult.answer ? aiResult.answer : FALLBACK_REPLY;

    await sendTelegramMessage(message.chatId, replyText);
    const { error: saveAiError } = await saveAiBotMessage(clientId, replyText);

    if (saveAiError) {
      console.error("Failed to save AI bot message:", saveAiError);
    }
  } catch (error) {
    console.error("Failed to generate auto-reply:", error);

    await sendTelegramMessage(message.chatId, FALLBACK_REPLY);
    const { error: saveFallbackError } = await saveAiBotMessage(clientId, FALLBACK_REPLY);

    if (saveFallbackError) {
      console.error("Failed to save fallback AI bot message:", saveFallbackError);
    }
  }

  return Response.json({ ok: true });
}
