import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSupabaseSessionCookies } from "@/lib/admin-auth";
import { createAuthenticatedSupabaseClient } from "@/lib/supabase";

type RouteError = {
  error: string;
  status: number;
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

async function parseEnabled(request: Request) {
  const { enabled } = (await request.json()) as { enabled?: boolean };

  if (typeof enabled !== "boolean") {
    throw createRouteError("Некорректное значение enabled", 400);
  }

  return enabled;
}

async function requireCurrentManager(
  supabase: ReturnType<typeof createAuthenticatedSupabaseClient>,
  accessToken: string,
) {
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

  return manager as { id: number };
}

export async function POST(
  request: Request,
  context: { params: Promise<{ clientId: string }> },
) {
  try {
    const accessToken = await requireAccessToken();
    const { clientId } = await context.params;
    const parsedClientId = parseClientId(clientId);
    const enabled = await parseEnabled(request);
    const supabase = createAuthenticatedSupabaseClient(accessToken);

    await requireCurrentManager(supabase, accessToken);

    const { error } = await supabase.from("client_assignments").upsert(
      {
        client_id: parsedClientId,
        ai_auto_reply_enabled: enabled,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "client_id",
      },
    );

    if (error) {
      return NextResponse.json(
        { ok: false, error: "Не удалось обновить настройку AI" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, enabled });
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
