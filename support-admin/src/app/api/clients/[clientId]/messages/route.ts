import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSupabaseSessionCookies } from "@/lib/admin-auth";
import { createAuthenticatedSupabaseClient } from "@/lib/supabase";

const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;

if (!telegramBotToken) {
  throw new Error("Missing TELEGRAM_BOT_TOKEN for support-admin.");
}

type RouteError = {
  error: string;
  status: number;
};

type ManagerRecord = {
  id: number;
};

type ClientRecord = {
  id: number;
  telegram_chat_id: number;
};

function createRouteError(error: string, status: number): RouteError {
  return { error, status };
}

function isRouteError(error: unknown): error is RouteError {
  return (
    typeof error === "object" &&
    error !== null &&
    "error" in error &&
    "status" in error
  );
}

async function requireAccessToken() {
  const cookieStore = await cookies();
  const { accessToken } = getSupabaseSessionCookies(cookieStore);

  if (!accessToken) {
    throw createRouteError("Не авторизован", 401);
  }

  return accessToken;
}

function parseClientId(clientId: string) {
  const parsedClientId = Number(clientId);

  if (!Number.isInteger(parsedClientId) || parsedClientId <= 0) {
    throw createRouteError("Некорректный clientId", 400);
  }

  return parsedClientId;
}

async function parseMessageText(request: Request) {
  const { text } = (await request.json()) as { text?: string };
  const normalizedText = text?.trim();

  if (!normalizedText) {
    throw createRouteError("Текст сообщения обязателен", 400);
  }

  return normalizedText;
}

async function requireCurrentManager(
  supabase: SupabaseClient,
  accessToken: string,
): Promise<ManagerRecord> {
  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);

  if (userError || !userData.user) {
    throw createRouteError("Не удалось определить пользователя", 401);
  }

  const { data: manager, error: managerError } = await supabase
    .from("managers")
    .select("id")
    .eq("auth_user_id", userData.user.id)
    .maybeSingle();

  if (managerError || !manager) {
    throw createRouteError("Текущий пользователь не является менеджером", 403);
  }

  return manager as ManagerRecord;
}

async function requireClient(
  supabase: SupabaseClient,
  clientId: number,
): Promise<ClientRecord> {
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, telegram_chat_id")
    .eq("id", clientId)
    .maybeSingle();

  if (clientError || !client) {
    throw createRouteError("Клиент не найден", 404);
  }

  if (!client.telegram_chat_id) {
    throw createRouteError("У клиента отсутствует telegram_chat_id", 400);
  }

  return client as ClientRecord;
}

async function sendTelegramMessage(chatId: number, text: string) {
  const response = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
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
    throw createRouteError(
      payload?.description ?? "Не удалось отправить сообщение в Telegram",
      502,
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ clientId: string }> },
) {
  try {
    const accessToken = await requireAccessToken();
    const { clientId } = await context.params;
    const parsedClientId = parseClientId(clientId);
    const text = await parseMessageText(request);

    const supabase = createAuthenticatedSupabaseClient(accessToken);
    const manager = await requireCurrentManager(supabase, accessToken);
    const client = await requireClient(supabase, parsedClientId);

    await sendTelegramMessage(client.telegram_chat_id, text);

    const { error } = await supabase.from("messages").insert({
      client_id: client.id,
      sender_type: "manager",
      sender_manager_id: manager.id,
      sender_label: "Менеджер",
      text,
    });

    if (error) {
      return NextResponse.json(
        { ok: false, error: "Сообщение отправлено в Telegram, но не сохранено в базе" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (isRouteError(error)) {
      return NextResponse.json(
        { ok: false, error: error.error },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { ok: false, error: "Внутренняя ошибка сервера" },
      { status: 500 },
    );
  }
}
