import { Request, Response, NextFunction } from "express";
import { authService, AuthTokenPayload } from "../services/auth.service";

// Augment Express Request with the authenticated principal.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthTokenPayload;
    }
  }
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7).trim();
  return null;
}

/**
 * requireAuth — rejects the request with 401 unless a valid Bearer token is
 * present. On success, attaches the decoded payload to `req.auth`.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ success: false, error: "Authentication required." });
    return;
  }
  try {
    req.auth = authService.verifyToken(token);
    next();
  } catch {
    res.status(401).json({ success: false, error: "Invalid or expired token." });
  }
}

/**
 * optionalAuth — attaches `req.auth` when a valid token is present but never
 * blocks the request. Lets endpoints scope results by organization when the
 * caller is authenticated while remaining publicly accessible otherwise
 * (preserves backward compatibility with the pre-auth MVP).
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (token) {
    try {
      req.auth = authService.verifyToken(token);
    } catch {
      /* ignore invalid token in optional mode */
    }
  }
  next();
}
