export const SUPABASE_ACCESS_TOKEN_COOKIE = "sb-access-token";
export const SUPABASE_REFRESH_TOKEN_COOKIE = "sb-refresh-token";

type CookieReader = {
  get(name: string): { value: string } | undefined;
};

type CookieWriter = {
  cookies: {
    set(options: {
      name: string;
      value: string;
      httpOnly: boolean;
      sameSite: "lax";
      secure: boolean;
      path: string;
      maxAge: number;
    }): void;
  };
};

export type SupabaseSessionCookies = {
  accessToken: string | null;
  refreshToken: string | null;
};

export type SupabaseSessionPayload = {
  access_token: string;
  refresh_token: string;
};

export function getSupabaseSessionCookies(cookieStore: CookieReader): SupabaseSessionCookies {
  return {
    accessToken: cookieStore.get(SUPABASE_ACCESS_TOKEN_COOKIE)?.value ?? null,
    refreshToken: cookieStore.get(SUPABASE_REFRESH_TOKEN_COOKIE)?.value ?? null,
  };
}

export function setSupabaseSessionCookies(
  response: CookieWriter,
  session: SupabaseSessionPayload,
) {
  const secure = process.env.NODE_ENV === "production";

  response.cookies.set({
    name: SUPABASE_ACCESS_TOKEN_COOKIE,
    value: session.access_token,
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 60 * 60,
  });

  response.cookies.set({
    name: SUPABASE_REFRESH_TOKEN_COOKIE,
    value: session.refresh_token,
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearSupabaseSessionCookies(response: CookieWriter) {
  const secure = process.env.NODE_ENV === "production";

  response.cookies.set({
    name: SUPABASE_ACCESS_TOKEN_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 0,
  });

  response.cookies.set({
    name: SUPABASE_REFRESH_TOKEN_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 0,
  });
}
