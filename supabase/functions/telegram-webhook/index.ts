import { createClient } from "@supabase/supabase-js";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const PORT = Number(Deno.env.get("PORT") ?? "8000");

const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

Deno.serve({ port: PORT }, async (request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const update = await request.json();
  console.log("Incoming Telegram update:", JSON.stringify(update));

  const chatId = update?.message?.chat?.id;
  const userId = update?.message?.from?.id;
  const username = update?.message?.from?.username ?? null;
  const firstName = update?.message?.from?.first_name ?? null;
  const lastName = update?.message?.from?.last_name ?? null;
  const text = update?.message?.text;
  const messageText = text ?? "[non-text message]";

  console.log("Incoming message:", messageText);

  if (!chatId || !userId || !TELEGRAM_BOT_TOKEN || !supabase) {
    return Response.json({ ok: false }, { status: 400 });
  }

  const { error } = await supabase.from("messages").insert({
    chat_id: chatId,
    user_id: userId,
    username,
    first_name: firstName,
    last_name: lastName,
    text: messageText,
  });

  if (error) {
    console.error("Failed to save message:", error);
    return Response.json({ ok: false }, { status: 500 });
  }

  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: text ? `I got your message: "${text}"` : "I hear your message.",
    }),
  });

  return Response.json({ ok: true });
});
