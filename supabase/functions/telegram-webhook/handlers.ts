import {
  INTERNAL_API_TOKEN,
  INTERNAL_APP_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
  TELEGRAM_BOT_TOKEN,
} from "./config.ts";
import {
  getLastAiReplyAt,
  getTodayAiReplyCount,
  hasSupabaseConfig,
  incrementTodayAiReplyCount,
  saveAiBotMessage,
  saveAiReplyEvent,
  saveIncomingMessage,
} from "./messages.ts";
import { sendTelegramMessage, type TelegramMessageData } from "./telegram.ts";

const MAX_MESSAGE_LENGTH = 500;
const DAILY_AI_REPLY_LIMIT = 20;
const AI_REPLY_RATE_LIMIT_MS = 30_000;

const GREETING_REPLY =
  "Здравствуйте! Я бот поддержки веб-студии PixelCraft. Чем могу помочь?";

const FALLBACK_REPLY =
  "К сожалению, я не нашёл точного ответа на ваш вопрос. Я передал ваш запрос менеджеру — он свяжется с вами в ближайшее время.";

const GREETING_PATTERNS = [
  "привет",
  "здравствуйте",
  "добрый день",
  "доброе утро",
  "добрый вечер",
  "хай",
  "хелло",
  "hello",
  "hi",
  "здорово",
  "салют",
];

type AutoReplyApiResponse = {
  ok?: boolean;
  shouldReply?: boolean;
  answer?: string | null;
  confidence?: number;
  matchedEntryIds?: number[];
  reason?: string;
  error?: string;
};

function normalizeMessageText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function isGreetingMessage(messageText: string) {
  const normalized = normalizeMessageText(messageText);

  return GREETING_PATTERNS.some((pattern) => normalized.includes(pattern));
}

function isRateLimited(lastReplyAt: string | null) {
  if (!lastReplyAt) {
    return false;
  }

  const diff = Date.now() - new Date(lastReplyAt).getTime();
  return diff < AI_REPLY_RATE_LIMIT_MS;
}

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

async function sendAndStoreAiReply(clientId: number, chatId: number, replyText: string) {
  await sendTelegramMessage(chatId, replyText);

  const { error: saveAiError } = await saveAiBotMessage(clientId, replyText);

  if (saveAiError) {
    console.error("Failed to save AI bot message:", saveAiError);
  }
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

  const normalizedMessageText = normalizeMessageText(message.messageText);

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

  if (!normalizedMessageText) {
    await saveAiReplyEvent({
      clientId,
      sourceMessageId: messageId,
      replyType: "none",
      decision: "ignored_empty_message",
      messageText: message.messageText,
    });

    return Response.json({ ok: true });
  }

  if (normalizedMessageText.length > MAX_MESSAGE_LENGTH) {
    await sendAndStoreAiReply(clientId, message.chatId, FALLBACK_REPLY);

    await saveAiReplyEvent({
      clientId,
      sourceMessageId: messageId,
      replyType: "fallback",
      decision: "fallback_message_too_long",
      messageText: message.messageText,
      replyText: FALLBACK_REPLY,
    });

    return Response.json({ ok: true });
  }

  const lastReplyAt = await getLastAiReplyAt(clientId);

  if (isRateLimited(lastReplyAt)) {
    await saveAiReplyEvent({
      clientId,
      sourceMessageId: messageId,
      replyType: "none",
      decision: "ignored_rate_limited",
      messageText: message.messageText,
    });

    return Response.json({ ok: true });
  }

  const todayReplyCount = await getTodayAiReplyCount(clientId);

  if (todayReplyCount >= DAILY_AI_REPLY_LIMIT) {
    await sendAndStoreAiReply(clientId, message.chatId, FALLBACK_REPLY);

    await saveAiReplyEvent({
      clientId,
      sourceMessageId: messageId,
      replyType: "fallback",
      decision: "fallback_daily_limit_reached",
      messageText: message.messageText,
      replyText: FALLBACK_REPLY,
    });

    return Response.json({ ok: true });
  }

  if (isGreetingMessage(normalizedMessageText)) {
    await sendAndStoreAiReply(clientId, message.chatId, GREETING_REPLY);
    await incrementTodayAiReplyCount(clientId);

    await saveAiReplyEvent({
      clientId,
      sourceMessageId: messageId,
      replyType: "greeting",
      decision: "greeting_sent",
      messageText: message.messageText,
      replyText: GREETING_REPLY,
    });

    return Response.json({ ok: true });
  }

  try {
    const aiResult = await requestAutoReply(message.messageText, clientId, messageId);

    if (aiResult.shouldReply && aiResult.answer) {
      await sendAndStoreAiReply(clientId, message.chatId, aiResult.answer);
      await incrementTodayAiReplyCount(clientId);

      await saveAiReplyEvent({
        clientId,
        sourceMessageId: messageId,
        replyType: "answer",
        decision: aiResult.reason ?? "match_found",
        confidence: aiResult.confidence ?? null,
        kbEntryIds: aiResult.matchedEntryIds ?? [],
        messageText: message.messageText,
        replyText: aiResult.answer,
      });

      return Response.json({ ok: true });
    }

    await sendAndStoreAiReply(clientId, message.chatId, FALLBACK_REPLY);

    await saveAiReplyEvent({
      clientId,
      sourceMessageId: messageId,
      replyType: "fallback",
      decision: aiResult.reason ?? "fallback_no_match",
      confidence: aiResult.confidence ?? null,
      kbEntryIds: aiResult.matchedEntryIds ?? [],
      messageText: message.messageText,
      replyText: FALLBACK_REPLY,
    });
  } catch (error) {
    console.error("Failed to generate auto-reply:", error);

    await sendAndStoreAiReply(clientId, message.chatId, FALLBACK_REPLY);

    await saveAiReplyEvent({
      clientId,
      sourceMessageId: messageId,
      replyType: "fallback",
      decision: "fallback_internal_error",
      messageText: message.messageText,
      replyText: FALLBACK_REPLY,
    });
  }

  return Response.json({ ok: true });
}
