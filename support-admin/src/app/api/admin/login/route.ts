import { NextResponse } from "next/server";
import {
  ADMIN_AUTH_COOKIE,
  createAdminSessionToken,
  isValidAdminCredentials,
} from "@/lib/admin-auth";

export async function POST(request: Request) {
  const { login, password } = (await request.json()) as {
    login?: string;
    password?: string;
  };

  if (!isValidAdminCredentials(login ?? "", password ?? "")) {
    return NextResponse.json(
      { ok: false, error: "Неверный логин или пароль" },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ ok: true });

  response.cookies.set({
    name: ADMIN_AUTH_COOKIE,
    value: createAdminSessionToken(),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
