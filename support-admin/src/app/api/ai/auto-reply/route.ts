import { NextResponse } from "next/server";
import { requireInternalApiToken } from "@/lib/internal-api";
import { generateAiReply } from "@/lib/rag/pipeline";

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

async function parseRequest(request: Request) {
  const body = (await request.json()) as {
    messageText?: string;
    clientId?: number;
    sourceMessageId?: number;
  };

  const messageText = body.messageText?.trim();

  if (!messageText) {
    throw createRouteError("Текст сообщения обязателен", 400);
  }

  if (messageText.length > 500) {
    throw createRouteError("Текст сообщения слишком длинный", 400);
  }

  return {
    messageText,
    clientId: body.clientId ?? null,
    sourceMessageId: body.sourceMessageId ?? null,
  };
}

export async function POST(request: Request) {
  try {
    requireInternalApiToken(request);

    const { messageText, clientId, sourceMessageId } = await parseRequest(request);
    const result = await generateAiReply(messageText);

    return NextResponse.json({
      ok: true,
      clientId,
      sourceMessageId,
      ...result,
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
