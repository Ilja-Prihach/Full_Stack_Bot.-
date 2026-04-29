import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSupabaseSessionCookies } from "@/lib/admin-auth";
import { createAuthenticatedSupabaseClient } from "@/lib/supabase";

type RouteError = {
  error: string;
  status: number;
};

type WorkflowStatus = "new" | "in_progress" | "completed";

type ClientRecord = {
  id: number;
};

const WORKFLOW_STATUSES: WorkflowStatus[] = [
  "new",
  "in_progress",
  "completed",
];

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

async function parseWorkflowStatus(request: Request): Promise<WorkflowStatus> {
  const { status } = (await request.json()) as { status?: string };

  if (!status || !WORKFLOW_STATUSES.includes(status as WorkflowStatus)) {
    throw createRouteError("Некорректное значение status", 400);
  }

  return status as WorkflowStatus;
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

async function saveWorkflowStatus(
  supabase: ReturnType<typeof createAuthenticatedSupabaseClient>,
  clientId: number,
  workflowStatus: WorkflowStatus,
) {
  const now = new Date().toISOString();
  const updatePayload = {
    workflow_status: workflowStatus,
    status_updated_at: now,
    updated_at: now,
  };

  const { data: updatedRows, error: updateError } = await supabase
    .from("client_assignments")
    .update(updatePayload)
    .eq("client_id", clientId)
    .select("client_id");

  if (updateError) {
    throw updateError;
  }

  if ((updatedRows ?? []).length > 0) {
    return;
  }

  const { error: insertError } = await supabase.from("client_assignments").insert({
    client_id: clientId,
    workflow_status: workflowStatus,
    status_updated_at: now,
    updated_at: now,
  });

  if (insertError) {
    throw insertError;
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
    const workflowStatus = await parseWorkflowStatus(request);
    const supabase = createAuthenticatedSupabaseClient(accessToken);

    await requireCurrentManager(supabase, accessToken);
    await requireClient(supabase, parsedClientId);
    try {
      await saveWorkflowStatus(supabase, parsedClientId, workflowStatus);
    } catch (error) {
      console.error("Failed to save workflow status:", error);
      return NextResponse.json(
        { ok: false, error: "Не удалось обновить статус клиента" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, status: workflowStatus });
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
