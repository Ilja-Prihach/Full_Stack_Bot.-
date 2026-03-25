import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL, TELEGRAM_BOT_TOKEN } from "./config.ts";
import { hasSupabaseConfig, saveIncomingMessage } from "./messages.ts";
import { sendTelegramMessage, type TelegramMessageData } from "./telegram.ts";

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

  const { error } = await saveIncomingMessage({
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

  await sendTelegramMessage(message.chatId, "Спасибо! Ваше сообщение получено.");

  return Response.json({ ok: true });
}
