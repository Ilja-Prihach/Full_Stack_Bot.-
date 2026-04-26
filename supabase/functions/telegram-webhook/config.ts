export const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
export const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
export const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
export const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? Deno.env.get("OPEN_AI_API");
export const OPENAI_TEXT_MODEL = Deno.env.get("OPENAI_TEXT_MODEL") ?? "gpt-4o-mini";
export const OPENAI_EMBEDDING_MODEL =
  Deno.env.get("OPENAI_EMBEDDING_MODEL") ?? "text-embedding-3-small";
export const PORT = Number(Deno.env.get("PORT") ?? "8000");
