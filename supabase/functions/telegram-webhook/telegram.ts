import { TELEGRAM_BOT_TOKEN } from "./config.ts";

export interface TelegramMessageData {
  chatId: number | null;
  userId: number | null;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  text: string | undefined;
  messageText: string;
}

export function extractTelegramMessage(update: any): TelegramMessageData {
  const chatId = update?.message?.chat?.id ?? null;
  const userId = update?.message?.from?.id ?? null;
  const username = update?.message?.from?.username ?? null;
  const firstName = update?.message?.from?.first_name ?? null;
  const lastName = update?.message?.from?.last_name ?? null;
  const text = update?.message?.text;

  return {
    chatId,
    userId,
    username,
    firstName,
    lastName,
    text,
    messageText: text ?? "[non-text message]",
  };
}

export async function sendTelegramMessage(chatId: number, text: string) {
  if (!TELEGRAM_BOT_TOKEN) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  }

  const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  });

  const payload = await response.json();

  if (!response.ok || payload?.ok === false) {
    throw new Error(payload?.description ?? "Failed to send message to Telegram");
  }

  return payload;
}
