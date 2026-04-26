import { createClient } from "@supabase/supabase-js";
import {
  OPENAI_API_KEY,
  OPENAI_EMBEDDING_MODEL,
  OPENAI_TEXT_MODEL,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
} from "./config.ts";

type KbEntry = {
  id: number;
  question: string;
  answer: string;
  keywords: string[];
  is_active: boolean;
};

type AutoReplyResult = {
  shouldReply: boolean;
  answer: string | null;
  confidence: number;
  matchedEntryIds: number[];
  reason: "match_found" | "no_match";
};

type MatchKbEntryRow = {
  kb_entry_id: number;
  question: string;
  answer: string;
  keywords: string[];
  is_active: boolean;
  similarity: number;
};

type OpenAiEmbeddingsResponse = {
  data?: Array<{
    embedding?: number[];
  }>;
  error?: {
    message?: string;
  };
};

type OpenAiResponsesResponse = {
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
  error?: {
    message?: string;
  };
};

const MATCH_LIMIT = 5;

const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    : null;

function requireAiConfig() {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  if (!supabase) {
    throw new Error("Supabase client is not configured");
  }

  return supabase;
}

function formatVector(values: number[]) {
  return `[${values.join(",")}]`;
}

function buildFormattingPrompt(question: string, answer: string) {
  return [
    `Вопрос клиента: ${question}`,
    "",
    "Готовый ответ из базы знаний:",
    answer,
    "",
    "Переформулируй ответ кратко, понятно и дружелюбно на русском языке.",
    "Не добавляй новых фактов. Не меняй смысл. Не упоминай, что это база знаний.",
  ].join("\n");
}

async function createEmbedding(input: string) {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_EMBEDDING_MODEL,
      input,
      encoding_format: "float",
    }),
  });

  const payload = (await response.json()) as OpenAiEmbeddingsResponse;
  const embedding = payload.data?.[0]?.embedding;

  if (!response.ok || !embedding) {
    throw new Error(payload.error?.message ?? "Failed to create embedding");
  }

  return embedding;
}

async function searchRelevantEntries(messageText: string) {
  const supabaseClient = requireAiConfig();
  const embedding = await createEmbedding(messageText);

  const { data, error } = await supabaseClient.rpc("match_kb_entries", {
    query_embedding_text: formatVector(embedding),
    match_count: MATCH_LIMIT,
  });

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as MatchKbEntryRow[];

  return rows.map((row) => ({
    entry: {
      id: row.kb_entry_id,
      question: row.question,
      answer: row.answer,
      keywords: row.keywords ?? [],
      is_active: row.is_active,
    },
    similarity: row.similarity,
  }));
}

async function formatAnswer(question: string, answer: string) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_TEXT_MODEL,
      instructions:
        "Ты помощник веб-студии. Перепиши ответ кратко и естественно, не добавляя новых фактов.",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: buildFormattingPrompt(question, answer),
            },
          ],
        },
      ],
      max_output_tokens: 180,
      temperature: 0.2,
    }),
  });

  const payload = (await response.json()) as OpenAiResponsesResponse;

  if (!response.ok || !Array.isArray(payload.output)) {
    throw new Error(payload.error?.message ?? "Failed to format answer");
  }

  const textParts: string[] = [];

  for (const item of payload.output) {
    if (!Array.isArray(item.content)) {
      continue;
    }

    for (const contentItem of item.content) {
      if (contentItem.type === "output_text" && contentItem.text) {
        textParts.push(contentItem.text);
      }
    }
  }

  const formatted = textParts.join("\n").trim();
  return formatted || answer;
}

export async function generateAutoReply(messageText: string): Promise<AutoReplyResult> {
  const matches = await searchRelevantEntries(messageText);

  if (matches.length === 0) {
    return {
      shouldReply: false,
      answer: null,
      confidence: 0,
      matchedEntryIds: [],
      reason: "no_match",
    };
  }

  const bestMatch = matches[0];
  let answer = bestMatch.entry.answer;

  try {
    answer = await formatAnswer(messageText, bestMatch.entry.answer);
  } catch (error) {
    console.error("Failed to format KB answer, using raw answer:", error);
  }

  return {
    shouldReply: true,
    answer,
    confidence: bestMatch.similarity,
    matchedEntryIds: matches.map((item) => item.entry.id),
    reason: "match_found",
  };
}
