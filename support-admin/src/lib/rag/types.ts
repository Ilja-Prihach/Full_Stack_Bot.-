export type KbEntry = {
  id: number;
  question: string;
  answer: string;
  keywords: string[];
  is_active: boolean;
};

export type SearchMatch = {
  entryId: number;
  similarity: number;
};

export type AutoReplyReason =
  | "match_found"
  | "low_confidence"
  | "no_match"
  | "generation_refused";

export type AutoReplyResult = {
  shouldReply: boolean;
  answer: string | null;
  confidence: number;
  matchedEntryIds: number[];
  reason: AutoReplyReason;
};
