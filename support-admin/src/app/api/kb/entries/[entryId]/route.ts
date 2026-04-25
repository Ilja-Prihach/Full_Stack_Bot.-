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

function parseEntryId(entryId: string) {
  const parsedEntryId = Number(entryId);

  if (!Number.isInteger(parsedEntryId) || parsedEntryId <= 0) {
    throw createRouteError("Некорректный entryId", 400);
  }

  return parsedEntryId;
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

function normalizeKeywords(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

async function parsePatchRequest(request: Request) {
  const { categoryId, question, answer, keywords, isActive } = (await request.json()) as {
    categoryId?: number | null;
    question?: string;
    answer?: string;
    keywords?: unknown;
    isActive?: boolean;
  };

  const normalizedQuestion = question?.trim();
  const normalizedAnswer = answer?.trim();

  if (!normalizedQuestion) {
    throw createRouteError("Вопрос обязателен", 400);
  }

  if (!normalizedAnswer) {
    throw createRouteError("Ответ обязателен", 400);
  }

  if (categoryId != null && (!Number.isInteger(categoryId) || categoryId <= 0)) {
    throw createRouteError("Некорректная категория", 400);
  }

  return {
    category_id: categoryId ?? null,
    question: normalizedQuestion,
    answer: normalizedAnswer,
    keywords: normalizeKeywords(keywords),
    is_active: isActive ?? true,
    status: "embedding_pending" as const,
    updated_at: new Date().toISOString(),
  };
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ entryId: string }> },
) {
  try {
    const accessToken = await requireAccessToken();
    const { entryId } = await context.params;
    const parsedEntryId = parseEntryId(entryId);
    const supabase = createAuthenticatedSupabaseClient(accessToken);

    await requireCurrentManager(supabase, accessToken);
    const payload = await parsePatchRequest(request);

    const { data, error } = await supabase
      .from("kb_entries")
      .update(payload)
      .eq("id", parsedEntryId)
      .select(
        `
          id,
          category_id,
          question,
          answer,
          keywords,
          status,
          is_active,
          created_by_manager_id,
          created_at,
          updated_at
        `,
      )
      .single();

    if (error || !data) {
      return NextResponse.json(
        { ok: false, error: "Не удалось обновить статью базы знаний" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, entry: data });
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

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ entryId: string }> },
) {
  try {
    const accessToken = await requireAccessToken();
    const { entryId } = await context.params;
    const parsedEntryId = parseEntryId(entryId);
    const supabase = createAuthenticatedSupabaseClient(accessToken);

    await requireCurrentManager(supabase, accessToken);

    const { error } = await supabase
      .from("kb_entries")
      .delete()
      .eq("id", parsedEntryId);

    if (error) {
      return NextResponse.json(
        { ok: false, error: "Не удалось удалить статью базы знаний" },
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
