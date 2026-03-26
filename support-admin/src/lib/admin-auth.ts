export const ADMIN_AUTH_COOKIE = "support-admin-session";

const DEFAULT_ADMIN_LOGIN = "admin";
const DEFAULT_ADMIN_PASSWORD = "admin";
const SESSION_PAYLOAD = "support-admin";

const encoder = new TextEncoder();

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

async function importHmacKey() {
  return await crypto.subtle.importKey(
    "raw",
    encoder.encode(getAuthSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex: string) {
  if (hex.length % 2 !== 0) {
    return null;
  }

  const bytes = new Uint8Array(hex.length / 2);

  for (let index = 0; index < hex.length; index += 2) {
    const value = Number.parseInt(hex.slice(index, index + 2), 16);

    if (Number.isNaN(value)) {
      return null;
    }

    bytes[index / 2] = value;
  }

  return bytes;
}

async function createSessionSignature(payload: string) {
  const key = await importHmacKey();
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));

  return bytesToHex(new Uint8Array(signature));
}

export async function createAdminSessionToken() {
  return `${SESSION_PAYLOAD}.${await createSessionSignature(SESSION_PAYLOAD)}`;
}

export async function verifyAdminSessionToken(token?: string | null) {
  if (!token) {
    return false;
  }

  const [payload, signature] = token.split(".");

  if (!payload || !signature || payload !== SESSION_PAYLOAD) {
    return false;
  }

  const key = await importHmacKey();
  const signatureBytes = hexToBytes(signature);

  if (!signatureBytes) {
    return false;
  }

  return await crypto.subtle.verify("HMAC", key, signatureBytes, encoder.encode(payload));
}

export function isValidAdminCredentials(login: string, password: string) {
  return login === getAdminLogin() && password === getAdminPassword();
}
