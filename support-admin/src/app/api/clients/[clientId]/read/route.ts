import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSupabaseSessionCookies } from "@/lib/admin-auth";
import { createAuthenticatedSupabaseClient } from "@/lib/supabase";

type RouteError = {
  error: string;
  status: number;
};

type ManagerRecord = {
  id: number;
};

type ClientRecord = {
  id: number;
};

type ReadStateRecord = {
  last_read_message_id: number | null;
};

function createRouteError(error: string, status: number): RouteError {
  return { error, status };
}

function isRouteError(error: unknown): error is RouteError {
  return typeof error === "object" && error !== null && "error" in error && "status" in error;
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

async function requireClient(supabase: SupabaseClient, clientId: number): Promise<ClientRecord> {
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .maybeSingle();

  if (clientError || !client) {
    throw createRouteError("Клиент не найден", 404);
  }

  return client as ClientRecord;
}

async function getLatestMessageId(supabase: SupabaseClient, clientId: number) {
  const { data: latestMessage, error: latestMessageError } = await supabase
    .from("messages")
    .select("id")
    .eq("client_id", clientId)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestMessageError) {
    throw createRouteError("Не удалось определить последнее сообщение", 500);
  }

  return latestMessage ? Number(latestMessage.id) : null;
}

async function getExistingReadState(
  supabase: SupabaseClient,
  clientId: number,
  managerId: number,
): Promise<ReadStateRecord | null> {
  const { data: readState, error: readStateError } = await supabase
    .from("client_read_states")
    .select("last_read_message_id")
    .eq("client_id", clientId)
    .eq("manager_id", managerId)
    .maybeSingle();

  if (readStateError) {
    throw createRouteError("Не удалось загрузить текущее состояние прочтения", 500);
  }

  return (readState as ReadStateRecord | null) ?? null;
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ clientId: string }> },
) {
  try {
    const accessToken = await requireAccessToken();
    const { clientId } = await context.params;
    const parsedClientId = parseClientId(clientId);
    const supabase = createAuthenticatedSupabaseClient(accessToken);

    const manager = await requireCurrentManager(supabase, accessToken);
    await requireClient(supabase, parsedClientId);

    const [latestMessageId, existingReadState] = await Promise.all([
      getLatestMessageId(supabase, parsedClientId),
      getExistingReadState(supabase, parsedClientId, manager.id),
    ]);

    if (latestMessageId == null) {
      return NextResponse.json({ ok: true, unchanged: true });
    }

    if (
      existingReadState?.last_read_message_id != null &&
      existingReadState.last_read_message_id >= latestMessageId
    ) {
      return NextResponse.json({ ok: true, unchanged: true });
    }

    const { error: upsertError } = await supabase.from("client_read_states").upsert(
      {
        client_id: parsedClientId,
        manager_id: manager.id,
        last_read_message_id: latestMessageId,
        last_read_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "client_id,manager_id",
      },
    );

    if (upsertError) {
      return NextResponse.json(
        { ok: false, error: "Не удалось сохранить состояние прочтения" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, lastReadMessageId: latestMessageId });
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
