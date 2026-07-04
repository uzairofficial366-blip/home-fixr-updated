import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ensureSchema, getSql } from "./db.server";
import {
  hashPassword,
  verifyPassword,
  createSession,
  clearSession,
  getSession,
} from "./auth.server";

const SignupInput = z.object({
  email: z.string().email().max(200),
  password: z.string().min(6).max(200),
  name: z.string().min(1).max(120),
  role: z.enum(["homeowner", "provider"]),
  phone: z.string().max(40).optional(),
});

export const signup = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SignupInput.parse(d))
  .handler(async ({ data }) => {
    await ensureSchema();
    const sql = getSql();
    const existing = await sql`SELECT id FROM users WHERE email = ${data.email.toLowerCase()}`;
    if (existing.length) throw new Error("Email already registered");
    const hash = await hashPassword(data.password);
    const rows = await sql`
      INSERT INTO users (email, password_hash, name, role, phone)
      VALUES (${data.email.toLowerCase()}, ${hash}, ${data.name}, ${data.role}, ${data.phone ?? null})
      RETURNING id, email, role, name
    `;
    const u = rows[0] as {
      id: number;
      email: string;
      role: "homeowner" | "provider";
      name: string;
    };
    if (u.role === "provider") {
      await sql`INSERT INTO provider_profiles (user_id) VALUES (${u.id}) ON CONFLICT DO NOTHING`;
    }
    await createSession({ uid: u.id, role: u.role, email: u.email });
    return { id: u.id, email: u.email, role: u.role, name: u.name };
  });

const LoginInput = z.object({
  email: z.string().email().max(200),
  password: z.string().min(1).max(200),
});

export const login = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => LoginInput.parse(d))
  .handler(async ({ data }) => {
    await ensureSchema();
    const sql = getSql();
    const rows =
      await sql`SELECT id, email, role, name, password_hash FROM users WHERE email = ${data.email.toLowerCase()}`;
    const u = rows[0] as
      | {
          id: number;
          email: string;
          role: "homeowner" | "provider" | "admin";
          name: string;
          password_hash: string;
        }
      | undefined;
    if (!u) throw new Error("Invalid credentials");
    const ok = await verifyPassword(data.password, u.password_hash);
    if (!ok) throw new Error("Invalid credentials");
    await createSession({ uid: u.id, role: u.role, email: u.email });
    return { id: u.id, email: u.email, role: u.role, name: u.name };
  });

export const logout = createServerFn({ method: "POST" }).handler(async () => {
  clearSession();
  return { ok: true };
});

export const me = createServerFn({ method: "GET" }).handler(async () => {
  const s = await getSession();
  if (!s) return null;
  await ensureSchema();
  const sql = getSql();
  const rows =
    await sql`SELECT id, email, name, role, phone, created_at FROM users WHERE id = ${s.uid}`;
  return (
    (rows[0] as
      | {
          id: number;
          email: string;
          name: string;
          role: string;
          phone: string | null;
          created_at: string;
        }
      | undefined) ?? null
  );
});
