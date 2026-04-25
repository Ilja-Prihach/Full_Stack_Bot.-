import { MockAiProvider } from "./mock-provider";
import { generateAutoReply } from "./provider";
import type { AutoReplyResult } from "./types";

function getProviderMode() {
  return process.env.OPENAI_PROVIDER ?? "mock";
}

export async function generateAiReply(messageText: string): Promise<AutoReplyResult> {
  const providerMode = getProviderMode();

  if (providerMode !== "mock") {
    throw new Error(`Unsupported OPENAI_PROVIDER: ${providerMode}`);
  }

  const provider = new MockAiProvider();

  return generateAutoReply(provider, {
    messageText,
  });
}
