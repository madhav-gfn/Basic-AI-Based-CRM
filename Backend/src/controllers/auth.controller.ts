import { Request, Response, NextFunction } from "express";
import { authService } from "../services/auth.service";
import { prisma } from "../config/database";
import { sendSuccess, sendError } from "../utils/response";

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { organizationName, name, email, password } = req.body as {
      organizationName?: string;
      name?: string;
      email?: string;
      password?: string;
    };

    if (!name || !email || !password) {
      sendError(res, "name, email, and password are required", 400);
      return;
    }

    const result = await authService.register({
      organizationName: organizationName ?? "",
      name,
      email,
      password,
    });
    sendSuccess(res, result, "Account created", 201);
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      sendError(res, "email and password are required", 400);
      return;
    }
    const result = await authService.login(email, password);
    sendSuccess(res, result, "Signed in");
  } catch (error) {
    // Auth failures are 401, not 500.
    sendError(res, (error as Error).message || "Invalid credentials", 401);
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.auth) {
      sendError(res, "Authentication required", 401);
      return;
    }
    const user = await prisma.user.findUnique({
      where: { id: req.auth.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        organizationId: true,
        organization: { select: { name: true, slug: true } },
      },
    });
    if (!user) {
      sendError(res, "User not found", 404);
      return;
    }
    sendSuccess(res, user);
  } catch (error) {
    next(error);
  }
}
