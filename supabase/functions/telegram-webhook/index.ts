import { PORT } from "./config.ts";
import { handleIncomingTextMessage, handleStartCommand } from "./handlers.ts";
import { extractTelegramMessage } from "./telegram.ts";

Deno.serve({ port: PORT }, async (request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const update = await request.json();
  console.log("Incoming Telegram update:", JSON.stringify(update));

  const { chatId, userId, username, firstName, lastName, text, messageText } =
    extractTelegramMessage(update);

  console.log("Incoming message:", messageText);

  if (!chatId || !userId || !text) {
    console.log("Skipping unsupported update");
    return new Response("OK", { status: 200 });
  }

  if (text.trim() === "/start") {
    return await handleStartCommand(chatId);
  }

  return await handleIncomingTextMessage({
    chatId,
    userId,
    username,
    firstName,
    lastName,
    text,
    messageText,
  });
});
