import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { ManagerAvailabilityStatus } from "@/components";
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

async function requireAccessToken() {
  const cookieStore = await cookies();
  const { accessToken } = getSupabaseSessionCookies(cookieStore);

  if (!accessToken) {
    throw createRouteError("Не авторизован", 401);
  }

  return accessToken;
}

async function parseStatus(request: Request): Promise<ManagerAvailabilityStatus> {
  const { status } = (await request.json()) as { status?: string };

  if (status === "online" || status === "away" || status === "coffee") {
    return status;
  }

  throw createRouteError("Некорректный статус менеджера", 400);
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

export async function POST(request: Request) {
  try {
    const accessToken = await requireAccessToken();
    const status = await parseStatus(request);
    const supabase = createAuthenticatedSupabaseClient(accessToken);
    const manager = await requireCurrentManager(supabase, accessToken);

    const { data, error } = await supabase
      .from("manager_statuses")
      .upsert(
        {
          manager_id: manager.id,
          status,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "manager_id" },
      )
      .select("manager_id, status, updated_at")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { ok: false, error: "Не удалось обновить статус менеджера" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, status: data });
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
