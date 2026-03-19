const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const PORT = Number(Deno.env.get("PORT") ?? "8000");

Deno.serve({ port: PORT }, async (request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const update = await request.json();
  console.log("Incoming Telegram update:", JSON.stringify(update));

  const chatId = update?.message?.chat?.id;
  const text = update?.message?.text;

  console.log("Incoming message:", text ?? "[non-text message]");

  if (!chatId || !TELEGRAM_BOT_TOKEN) {
    return Response.json({ ok: false }, { status: 400 });
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
