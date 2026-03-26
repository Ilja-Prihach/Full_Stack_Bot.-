import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_AUTH_COOKIE = "support-admin-session";

const DEFAULT_ADMIN_LOGIN = "admin";
const DEFAULT_ADMIN_PASSWORD = "admin";
const SESSION_PAYLOAD = "support-admin";

function getAuthSecret() {
  const secret = process.env.ADMIN_AUTH_SECRET;

  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("ADMIN_AUTH_SECRET is required in production.");
  }

  return "support-admin-local-secret";
}

export function getAdminLogin() {
  return process.env.ADMIN_LOGIN || DEFAULT_ADMIN_LOGIN;
}

export function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;
}

function createSessionSignature(payload: string) {
  return createHmac("sha256", getAuthSecret()).update(payload).digest("hex");
}

export function createAdminSessionToken() {
  return `${SESSION_PAYLOAD}.${createSessionSignature(SESSION_PAYLOAD)}`;
}

export function verifyAdminSessionToken(token?: string | null) {
  if (!token) {
    return false;
  }

  const [payload, signature] = token.split(".");

  if (!payload || !signature || payload !== SESSION_PAYLOAD) {
    return false;
  }

  const expectedSignature = createSessionSignature(payload);

  return timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}

export function isValidAdminCredentials(login: string, password: string) {
  return login === getAdminLogin() && password === getAdminPassword();
}
