export const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
export const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
export const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
export const INTERNAL_APP_URL = Deno.env.get("INTERNAL_APP_URL");
export const INTERNAL_API_TOKEN = Deno.env.get("INTERNAL_API_TOKEN");
export const PORT = Number(Deno.env.get("PORT") ?? "8000");
