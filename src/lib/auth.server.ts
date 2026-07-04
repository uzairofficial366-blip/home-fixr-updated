import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { getCookie, setCookie, deleteCookie } from "@tanstack/react-start/server";

const COOKIE_NAME = "hf_session";

function getSecret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET not configured");
  return new TextEncoder().encode(s);
}

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}
export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

export type SessionPayload = {
  uid: number;
  role: "homeowner" | "provider" | "admin";
  email: string;
};

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret());
  const isLocal = process.env.NODE_ENV === "development" || !process.env.NODE_ENV;
  setCookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: !isLocal,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = getCookie(COOKIE_NAME);
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      uid: Number(payload.uid),
      role: payload.role as SessionPayload["role"],
      email: String(payload.email),
    };
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<SessionPayload> {
  const s = await getSession();
  if (!s) throw new Error("UNAUTHENTICATED");
  return s;
}

export function clearSession() {
  const isLocal = process.env.NODE_ENV === "development" || !process.env.NODE_ENV;
  deleteCookie(COOKIE_NAME, { path: "/", secure: !isLocal });
}
