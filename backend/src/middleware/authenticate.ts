import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { sendError } from "../utils/response.js";

export interface AuthUser {
  uid: number;
  role: "homeowner" | "provider" | "admin";
  email: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export function authenticateUser(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    sendError(res, "No token provided", 401);
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthUser;
    req.user = payload;
    next();
  } catch {
    sendError(res, "Invalid or expired token", 401);
  }
}
