import { Response, NextFunction } from "express";
import { AuthRequest } from "./authenticate.js";
import { sendError } from "../utils/response.js";

export function authorizeRoles(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      sendError(res, "Unauthorized", 401);
      return;
    }
    if (!roles.includes(req.user.role)) {
      sendError(res, "Forbidden: insufficient permissions", 403);
      return;
    }
    next();
  };
}
