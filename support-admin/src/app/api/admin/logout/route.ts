import { NextResponse } from "next/server";
import { clearSupabaseSessionCookies } from "@/lib/admin-auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });

  clearSupabaseSessionCookies(response);

  return response;
}
