import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables for support-admin.");
}

const resolvedSupabaseUrl = supabaseUrl;
const resolvedSupabaseAnonKey = supabaseAnonKey;

export const supabase = createClient(resolvedSupabaseUrl, resolvedSupabaseAnonKey);

let browserRealtimeClient: ReturnType<typeof createClient> | null = null;

export function createAuthenticatedSupabaseClient(accessToken: string) {
  return createClient(resolvedSupabaseUrl, resolvedSupabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

export function getBrowserRealtimeClient() {
  if (typeof window === "undefined") {
    throw new Error("Browser realtime client can only be created in the browser.");
  }

  if (!browserRealtimeClient) {
    browserRealtimeClient = createClient(resolvedSupabaseUrl, resolvedSupabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return browserRealtimeClient;
}
