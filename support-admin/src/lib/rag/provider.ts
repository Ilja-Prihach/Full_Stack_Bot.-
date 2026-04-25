import type { AutoReplyResult, KbEntry } from "./types";

export type SearchRelevantEntriesInput = {
  messageText: string;
  threshold?: number;
  limit?: number;
};

export type AiProvider = {
  searchRelevantEntries(input: SearchRelevantEntriesInput): Promise<{
    matches: Array<{
      entry: KbEntry;
      similarity: number;
    }>;
  }>;
  generateAnswer(question: string, contextEntries: KbEntry[]): Promise<string | null>;
};

export type GenerateAutoReplyInput = {
  messageText: string;
  threshold?: number;
  limit?: number;
};

export async function generateAutoReply(
  provider: AiProvider,
  input: GenerateAutoReplyInput,
): Promise<AutoReplyResult> {
  const threshold = input.threshold ?? 0.75;
  const limit = input.limit ?? 3;

  const searchResult = await provider.searchRelevantEntries({
    messageText: input.messageText,
    threshold,
    limit,
  });

  if (searchResult.matches.length === 0) {
    return {
      shouldReply: false,
      answer: null,
      confidence: 0,
      matchedEntryIds: [],
      reason: "no_match",
    };
  }

  const bestMatch = searchResult.matches[0];

  if (bestMatch.similarity < threshold) {
    return {
      shouldReply: false,
      answer: null,
      confidence: bestMatch.similarity,
      matchedEntryIds: searchResult.matches.map((item) => item.entry.id),
      reason: "low_confidence",
    };
  }

  const answer = await provider.generateAnswer(
    input.messageText,
    searchResult.matches.map((item) => item.entry),
  );

  if (!answer) {
    return {
      shouldReply: false,
      answer: null,
      confidence: bestMatch.similarity,
      matchedEntryIds: searchResult.matches.map((item) => item.entry.id),
      reason: "generation_refused",
    };
  }

  return {
    shouldReply: true,
    answer,
    confidence: bestMatch.similarity,
    matchedEntryIds: searchResult.matches.map((item) => item.entry.id),
    reason: "match_found",
  };
}
