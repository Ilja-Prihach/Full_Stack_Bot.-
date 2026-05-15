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

type RankedKbEntryMatch = {
  entry: KbEntry;
  similarity: number;
  score: number;
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
const MIN_MATCH_SIMILARITY = 0.22;

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

function normalizeText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function tokenizeText(value: string) {
  return normalizeText(value)
    .split(/[^a-zA-Zа-яА-Я0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function calculateKeywordBoost(messageText: string, entry: KbEntry) {
  const normalizedMessage = normalizeText(messageText);
  const questionText = normalizeText(entry.question);
  const answerText = normalizeText(entry.answer);
  const keywordTexts = (entry.keywords ?? []).map((keyword) => normalizeText(keyword));
  const messageTokens = new Set(tokenizeText(messageText));
  const answerTokens = new Set(tokenizeText(entry.answer));

  let boost = 0;

  if (questionText.includes(normalizedMessage) || normalizedMessage.includes(questionText)) {
    boost += 0.08;
  }

  const matchedAnswerTokens = [...messageTokens].filter((token) => answerTokens.has(token)).length;

  if (matchedAnswerTokens >= 2) {
    boost += 0.06;
  } else if (matchedAnswerTokens === 1) {
    boost += 0.03;
  }

  if (
    answerText.includes(normalizedMessage) ||
    normalizedMessage.includes("привод") && answerText.includes("привод")
  ) {
    boost += 0.06;
  }

  for (const keyword of keywordTexts) {
    if (!keyword) {
      continue;
    }

    if (normalizedMessage.includes(keyword) || keyword.includes(normalizedMessage)) {
      boost += 0.12;
      continue;
    }

    const keywordTokens = tokenizeText(keyword);

    if (keywordTokens.some((token) => messageTokens.has(token))) {
      boost += 0.04;
    }
  }

  return Math.min(boost, 0.2);
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

async function searchRelevantEntries(messageText: string): Promise<RankedKbEntryMatch[]> {
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

  return rows
    .map((row) => {
      const entry = {
        id: row.kb_entry_id,
        question: row.question,
        answer: row.answer,
        keywords: row.keywords ?? [],
        is_active: row.is_active,
      };
      const score = row.similarity + calculateKeywordBoost(messageText, entry);

      return {
        entry,
        similarity: row.similarity,
        score,
      };
    })
    .sort((left, right) => right.score - left.score);
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

  if (bestMatch.score < MIN_MATCH_SIMILARITY) {
    return {
      shouldReply: false,
      answer: null,
      confidence: bestMatch.score,
      matchedEntryIds: matches.map((item) => item.entry.id),
      reason: "no_match",
    };
  }

  let answer = bestMatch.entry.answer;

  try {
    answer = await formatAnswer(messageText, bestMatch.entry.answer);
  } catch (error) {
    console.error("Failed to format KB answer, using raw answer:", error);
  }

  return {
    shouldReply: true,
    answer,
    confidence: bestMatch.score,
    matchedEntryIds: matches.map((item) => item.entry.id),
    reason: "match_found",
  };
}
