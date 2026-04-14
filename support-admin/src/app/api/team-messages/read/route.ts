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
  return (
    typeof error === "object" &&
    error !== null &&
    "error" in error &&
    "status" in error
  );
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const { accessToken } = getSupabaseSessionCookies(cookieStore);

    if (!accessToken) {
      throw createRouteError("Не авторизован", 401);
    }

    const { messageId } = (await request.json()) as { messageId?: number };

    if (!messageId || !Number.isInteger(messageId)) {
      throw createRouteError("Некорректный messageId", 400);
    }

    const supabase = createAuthenticatedSupabaseClient(accessToken);

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

    const { error } = await supabase
      .from("team_read_states")
      .upsert(
        { manager_id: manager.id, last_read_message_id: messageId, updated_at: new Date().toISOString() },
        { onConflict: "manager_id" },
      );

    if (error) {
      return NextResponse.json(
        { ok: false, error: "Не удалось обновить статус прочтения" },
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
