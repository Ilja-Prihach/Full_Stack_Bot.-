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

function parseCategoryId(categoryId: string) {
  const parsedCategoryId = Number(categoryId);

  if (!Number.isInteger(parsedCategoryId) || parsedCategoryId <= 0) {
    throw createRouteError("Некорректный categoryId", 400);
  }

  return parsedCategoryId;
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

async function parsePatchRequest(request: Request) {
  const { name, description } = (await request.json()) as {
    name?: string;
    description?: string | null;
  };

  const normalizedName = name?.trim();
  const normalizedDescription = description?.trim() || null;

  if (!normalizedName) {
    throw createRouteError("Название категории обязательно", 400);
  }

  return {
    name: normalizedName,
    description: normalizedDescription,
  };
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ categoryId: string }> },
) {
  try {
    const accessToken = await requireAccessToken();
    const { categoryId } = await context.params;
    const parsedCategoryId = parseCategoryId(categoryId);
    const supabase = createAuthenticatedSupabaseClient(accessToken);

    await requireCurrentManager(supabase, accessToken);
    const payload = await parsePatchRequest(request);

    const { data, error } = await supabase
      .from("kb_categories")
      .update(payload)
      .eq("id", parsedCategoryId)
      .select("id, name, description, created_at")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { ok: false, error: "Не удалось обновить категорию" },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true, category: data });
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
  context: { params: Promise<{ categoryId: string }> },
) {
  try {
    const accessToken = await requireAccessToken();
    const { categoryId } = await context.params;
    const parsedCategoryId = parseCategoryId(categoryId);
    const supabase = createAuthenticatedSupabaseClient(accessToken);

    await requireCurrentManager(supabase, accessToken);

    const { error } = await supabase
      .from("kb_categories")
      .delete()
      .eq("id", parsedCategoryId);

    if (error) {
      return NextResponse.json(
        { ok: false, error: "Не удалось удалить категорию" },
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
