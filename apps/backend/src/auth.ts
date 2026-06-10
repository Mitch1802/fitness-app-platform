import type { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import type { AuthedRequest, AuthUser } from "./types.js";

const secret = process.env.JWT_SECRET || "dev-secret-change-me";

export function signToken(user: AuthUser) {
  return jwt.sign(user, secret, { expiresIn: "7d" });
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

  if (!token) {
    res.status(401).json({ message: "Nicht angemeldet." });
    return;
  }

  try {
    const payload = jwt.verify(token, secret) as AuthUser;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ message: "Ungueltiges Token." });
  }
}
