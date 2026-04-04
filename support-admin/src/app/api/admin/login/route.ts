import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { setSupabaseSessionCookies } from "@/lib/admin-auth";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables for support-admin.");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(request: Request) {
  const { email, password } = (await request.json()) as {
    email?: string;
    password?: string;
  };

  if (!email || !password) {
    return NextResponse.json(
      { ok: false, error: "Email и пароль обязательны" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session) {
    return NextResponse.json(
      { ok: false, error: error?.message ?? "Не удалось выполнить вход" },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ ok: true });

  setSupabaseSessionCookies(response, data.session);

  return response;
}
