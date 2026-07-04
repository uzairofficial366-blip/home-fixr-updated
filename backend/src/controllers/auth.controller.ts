import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../database/prisma.js";
import { env } from "../config/env.js";
import { sendSuccess, sendError } from "../utils/response.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { SignupSchema, LoginSchema } from "../validators/index.js";
import { AuthRequest } from "../middleware/authenticate.js";

function signToken(payload: { uid: number; role: string; email: string }) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: "30d" });
}

export async function signup(req: Request, res: Response) {
  const parse = SignupSchema.safeParse(req.body);
  if (!parse.success) {
    sendError(res, parse.error.issues[0]?.message || "Validation error", 422);
    return;
  }
  const data = parse.data;

  const existing = await prisma.user.findUnique({
    where: { email: data.email.toLowerCase() },
  });
  if (existing) {
    sendError(res, "Email already registered", 409);
    return;
  }

  const passwordHash = await hashPassword(data.password);
  const user = await prisma.user.create({
    data: {
      email: data.email.toLowerCase(),
      passwordHash,
      name: data.name,
      role: data.role,
      phone: data.phone ?? null,
    },
  });

  if (user.role === "provider") {
    await prisma.providerProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
    });
  }

  const token = signToken({ uid: user.id, role: user.role, email: user.email });
  sendSuccess(res, { token, user: { id: user.id, email: user.email, role: user.role, name: user.name } }, 201);
}

export async function login(req: Request, res: Response) {
  const parse = LoginSchema.safeParse(req.body);
  if (!parse.success) {
    sendError(res, parse.error.issues[0]?.message || "Validation error", 422);
    return;
  }
  const data = parse.data;

  const user = await prisma.user.findUnique({
    where: { email: data.email.toLowerCase() },
  });
  if (!user) {
    sendError(res, "Invalid credentials", 401);
    return;
  }

  const ok = await verifyPassword(data.password, user.passwordHash);
  if (!ok) {
    sendError(res, "Invalid credentials", 401);
    return;
  }

  const token = signToken({ uid: user.id, role: user.role, email: user.email });
  sendSuccess(res, { token, user: { id: user.id, email: user.email, role: user.role, name: user.name } });
}

export async function me(req: AuthRequest, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.uid },
    select: { id: true, email: true, name: true, role: true, phone: true, createdAt: true },
  });
  if (!user) {
    sendError(res, "User not found", 404);
    return;
  }
  sendSuccess(res, user);
}

export async function logout(_req: Request, res: Response) {
  sendSuccess(res, { ok: true });
}
