import type { AiProvider, SearchRelevantEntriesInput } from "./provider";
import type { KbEntry } from "./types";

const MOCK_KB_ENTRIES: KbEntry[] = [
  {
    id: 1,
    question: "Какие у вас часы работы?",
    answer: "Мы работаем с понедельника по пятницу с 9:00 до 18:00.",
    keywords: ["часы работы", "график", "время работы"],
    is_active: true,
  },
  {
    id: 2,
    question: "Как связаться с менеджером?",
    answer: "Напишите ваш вопрос в чат, и менеджер ответит в ближайшее время.",
    keywords: ["менеджер", "связаться", "оператор"],
    is_active: true,
  },
];

function normalizeText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function countKeywordMatches(messageText: string, entry: KbEntry) {
  const normalizedMessage = normalizeText(messageText);
  const candidates = [entry.question, ...entry.keywords];

  let score = 0;

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeText(candidate);

    if (normalizedCandidate && normalizedMessage.includes(normalizedCandidate)) {
      score += 1;
    }
  }

  return score;
}

export class MockAiProvider implements AiProvider {
  async searchRelevantEntries(input: SearchRelevantEntriesInput) {
    const limit = input.limit ?? 3;

    const matches = MOCK_KB_ENTRIES
      .filter((entry) => entry.is_active)
      .map((entry) => {
        const keywordHits = countKeywordMatches(input.messageText, entry);
        const similarity = keywordHits > 0 ? Math.min(0.8 + keywordHits * 0.05, 0.99) : 0.2;

        return {
          entry,
          similarity,
        };
      })
      .sort((left, right) => right.similarity - left.similarity)
      .slice(0, limit);

    return { matches };
  }

  async generateAnswer(_question: string, contextEntries: KbEntry[]) {
    const primaryEntry = contextEntries[0] ?? null;

    if (!primaryEntry) {
      return null;
    }

    return primaryEntry.answer;
  }
}
