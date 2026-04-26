function requireEnv(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getOpenAiApiKey() {
  return requireEnv(
    "OPENAI_API_KEY",
    process.env.OPENAI_API_KEY ?? process.env.OPEN_AI_API,
  );
}

export function getOpenAiEmbeddingModel() {
  return process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";
}

export function getSupabaseUrl() {
  return requireEnv("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function getSupabaseAnonKey() {
  return requireEnv(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function getSupabaseServiceRoleKey() {
  return requireEnv(
    "SUPABASE_SECRET_KEY",
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}
