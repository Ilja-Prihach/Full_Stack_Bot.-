import { createHash } from "node:crypto";
import { createServiceRoleSupabaseClient } from "@/lib/supabase-server";
import { getOpenAiApiKey, getOpenAiEmbeddingModel } from "@/lib/server-env";

type KbEntryEmbeddingPayload = {
  id: number;
  question: string;
  answer: string;
  keywords: string[];
};

type OpenAiEmbeddingsResponse = {
  data?: Array<{
    embedding?: number[];
  }>;
  error?: {
    message?: string;
  };
};

function buildEmbeddingSourceText(entry: KbEntryEmbeddingPayload) {
  const keywords = entry.keywords.length > 0 ? entry.keywords.join(", ") : "нет";

  return [
    `Основной вопрос: ${entry.question}`,
    `Ключевые слова: ${keywords}`,
    `Краткая тема: ${entry.question}`,
    `Синонимы и ключевые слова: ${keywords}`,
    `Ответ: ${entry.answer}`,
  ].join("\n");
}

function createContentHash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function formatVector(values: number[]) {
  return `[${values.join(",")}]`;
}

async function requestEmbedding(input: string) {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getOpenAiApiKey()}`,
    },
    body: JSON.stringify({
      model: getOpenAiEmbeddingModel(),
      input,
      encoding_format: "float",
    }),
  });

  const payload = (await response.json()) as OpenAiEmbeddingsResponse;
  const embedding = payload.data?.[0]?.embedding;

  if (!response.ok || !embedding) {
    throw new Error(payload.error?.message ?? "Failed to create KB embedding");
  }

  return embedding;
}

export async function reindexKbEntry(entry: KbEntryEmbeddingPayload) {
  const sourceText = buildEmbeddingSourceText(entry);
  const contentHash = createContentHash(sourceText);
  const embedding = await requestEmbedding(sourceText);
  const supabase = createServiceRoleSupabaseClient();

  const { error: embeddingError } = await supabase.from("kb_embeddings").upsert(
    {
      kb_entry_id: entry.id,
      content_hash: contentHash,
      embedding: formatVector(embedding),
    },
    {
      onConflict: "kb_entry_id",
    },
  );

  if (embeddingError) {
    throw new Error(embeddingError.message);
  }

  const { error: statusError } = await supabase
    .from("kb_entries")
    .update({
      status: "embedding_ready",
      updated_at: new Date().toISOString(),
    })
    .eq("id", entry.id);

  if (statusError) {
    throw new Error(statusError.message);
  }
}

export async function markKbEntryEmbeddingFailed(entryId: number) {
  const supabase = createServiceRoleSupabaseClient();

  const { error } = await supabase
    .from("kb_entries")
    .update({
      status: "embedding_failed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", entryId);

  if (error) {
    throw new Error(error.message);
  }
}
