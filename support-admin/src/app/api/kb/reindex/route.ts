import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSupabaseSessionCookies } from "@/lib/admin-auth";
import { markKbEntryEmbeddingFailed, reindexKbEntry } from "@/lib/rag/kb-embeddings";
import { createAuthenticatedSupabaseClient } from "@/lib/supabase";

type RouteError = {
  error: string;
  status: number;
};

type KbEntryRow = {
  id: number;
  question: string;
  answer: string;
  keywords: string[];
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

export async function POST() {
  try {
    const accessToken = await requireAccessToken();
    const supabase = createAuthenticatedSupabaseClient(accessToken);

    await requireCurrentManager(supabase, accessToken);

    const { data, error } = await supabase
      .from("kb_entries")
      .select("id, question, answer, keywords")
      .eq("is_active", true)
      .order("id", { ascending: true });

    if (error) {
      return NextResponse.json(
        { ok: false, error: "Не удалось загрузить статьи для индексации" },
        { status: 500 },
      );
    }

    const entries = (data ?? []) as KbEntryRow[];
    let successCount = 0;
    let failedCount = 0;

    for (const entry of entries) {
      try {
        await reindexKbEntry(entry);
        successCount += 1;
      } catch (embeddingError) {
        console.error(`Failed to reindex KB entry ${entry.id}:`, embeddingError);
        await markKbEntryEmbeddingFailed(entry.id);
        failedCount += 1;
      }
    }

    return NextResponse.json({
      ok: true,
      total: entries.length,
      successCount,
      failedCount,
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
