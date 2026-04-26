import {
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
  TELEGRAM_BOT_TOKEN,
} from "./config.ts";
import { generateAutoReply } from "./ai.ts";
import {
  hasSupabaseConfig,
  incrementTodayAiReplyCount,
  saveAiBotMessage,
  saveAiReplyEvent,
  saveIncomingMessage,
} from "./messages.ts";
import { sendTelegramMessage, type TelegramMessageData } from "./telegram.ts";

const MAX_MESSAGE_LENGTH = 500;

const GREETING_REPLY =
  "Здравствуйте! Я бот поддержки веб-студии PixelCraft. Чем могу помочь?";

const GRATITUDE_REPLY =
  "Пожалуйста! Всегда рад помочь. Если появятся ещё вопросы по сайту или проекту, пишите.";

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

const GRATITUDE_PATTERNS = [
  "спасибо",
  "благодарю",
  "благодарствую",
  "спс",
  "thanks",
  "thank you",
  "thx",
];

function normalizeMessageText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function isGreetingMessage(messageText: string) {
  const normalized = normalizeMessageText(messageText);

  return GREETING_PATTERNS.some((pattern) => normalized.includes(pattern));
}

function isGratitudeMessage(messageText: string) {
  const normalized = normalizeMessageText(messageText);

  return GRATITUDE_PATTERNS.some((pattern) => normalized.includes(pattern));
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

  if (isGratitudeMessage(normalizedMessageText)) {
    await sendAndStoreAiReply(clientId, message.chatId, GRATITUDE_REPLY);
    await incrementTodayAiReplyCount(clientId);

    await saveAiReplyEvent({
      clientId,
      sourceMessageId: messageId,
      replyType: "answer",
      decision: "gratitude_sent",
      messageText: message.messageText,
      replyText: GRATITUDE_REPLY,
    });

    return Response.json({ ok: true });
  }

  try {
    const aiResult = await generateAutoReply(message.messageText);

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
