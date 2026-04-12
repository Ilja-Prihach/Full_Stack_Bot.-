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
  first_name: string;
  last_name: string;
};

type ClientRecord = {
  id: number;
};

type AssignmentRecord = {
  client_id: number;
  assigned_manager_id: number | null;
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

async function parseManagerId(request: Request) {
  const { managerId } = (await request.json()) as { managerId?: number | null };

  if (managerId == null) {
    return null;
  }

  if (!Number.isInteger(managerId) || managerId <= 0) {
    throw createRouteError("Некорректный managerId", 400);
  }

  return managerId;
}

function formatManagerName(manager: Pick<ManagerRecord, "first_name" | "last_name">) {
  return `${manager.first_name} ${manager.last_name}`.trim();
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
    .select("id, first_name, last_name")
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

async function requireTargetManager(supabase: SupabaseClient, managerId: number | null) {
  if (managerId == null) {
    return null;
  }

  const { data: manager, error: managerError } = await supabase
    .from("managers")
    .select("id, first_name, last_name")
    .eq("id", managerId)
    .maybeSingle();

  if (managerError || !manager) {
    throw createRouteError("Менеджер для назначения не найден", 404);
  }

  return manager as ManagerRecord;
}

async function getExistingAssignment(
  supabase: SupabaseClient,
  clientId: number,
): Promise<AssignmentRecord | null> {
  const { data: assignment, error: assignmentError } = await supabase
    .from("client_assignments")
    .select("client_id, assigned_manager_id")
    .eq("client_id", clientId)
    .maybeSingle();

  if (assignmentError) {
    throw createRouteError("Не удалось загрузить текущее назначение", 500);
  }

  return (assignment as AssignmentRecord | null) ?? null;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ clientId: string }> },
) {
  try {
    const accessToken = await requireAccessToken();
    const { clientId } = await context.params;
    const parsedClientId = parseClientId(clientId);
    const nextManagerId = await parseManagerId(request);

    const supabase = createAuthenticatedSupabaseClient(accessToken);
    const currentManager = await requireCurrentManager(supabase, accessToken);
    await requireClient(supabase, parsedClientId);
    const targetManager = await requireTargetManager(supabase, nextManagerId);
    const existingAssignment = await getExistingAssignment(supabase, parsedClientId);

    if (existingAssignment?.assigned_manager_id === nextManagerId) {
      return NextResponse.json({ ok: true, unchanged: true });
    }

    const { error: upsertError } = await supabase.from("client_assignments").upsert(
      {
        client_id: parsedClientId,
        assigned_manager_id: nextManagerId,
        previous_manager_id: existingAssignment?.assigned_manager_id ?? null,
        last_reassigned_by_manager_id: currentManager.id,
        last_reassigned_by_manager_name: formatManagerName(currentManager),
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "client_id",
      },
    );

    if (upsertError) {
      return NextResponse.json(
        { ok: false, error: "Не удалось сохранить назначение" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      assignedManagerId: targetManager?.id ?? null,
    });
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
