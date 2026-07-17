import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Prisma, UserRole } from "@prisma/client";
import { prisma } from "../config/database";

// ─────────────────────────────────────────────────────────────────────────────
// AuthService — organization-scoped users with JWT sessions.
// ─────────────────────────────────────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-insecure-secret-change-me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "7d";

if (!process.env.JWT_SECRET) {
  console.warn(
    "[Auth] JWT_SECRET is not set — using an insecure development secret. " +
      "Set JWT_SECRET in production."
  );
}

export interface AuthTokenPayload {
  userId: string;
  organizationId: string;
  role: UserRole;
  email: string;
}

export interface AuthResult {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    organizationId: string;
  };
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "org"
  );
}

export class AuthService {
  private sign(payload: AuthTokenPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
  }

  verifyToken(token: string): AuthTokenPayload {
    return jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
  }

  /**
   * register — creates a new organization and its first (ADMIN) user atomically.
   */
  async register(input: {
    organizationName: string;
    name: string;
    email: string;
    password: string;
  }): Promise<AuthResult> {
    const email = input.email.trim().toLowerCase();
    if (!email || !input.password) throw new Error("Email and password are required.");
    if (input.password.length < 8)
      throw new Error("Password must be at least 8 characters.");

    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) throw new Error("An account with this email already exists.");

    const passwordHash = await bcrypt.hash(input.password, 10);

    // Ensure a unique org slug.
    const base = slugify(input.organizationName || input.name);
    let slug = base;
    for (let i = 1; await prisma.organization.findUnique({ where: { slug }, select: { id: true } }); i++) {
      slug = `${base}-${i}`;
    }

    const user = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { name: input.organizationName || `${input.name}'s Org`, slug },
      });
      return tx.user.create({
        data: {
          organizationId: org.id,
          email,
          name: input.name.trim(),
          passwordHash,
          role: UserRole.ADMIN,
        },
      });
    });

    return this.toAuthResult(user);
  }

  /**
   * login — verifies credentials and issues a token.
   */
  async login(email: string, password: string): Promise<AuthResult> {
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    // Constant-ish failure path: run a hash compare even when the user is
    // missing to avoid trivially leaking which emails exist.
    const hash = user?.passwordHash ?? "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva";
    const ok = await bcrypt.compare(password, hash);

    if (!user || !ok) throw new Error("Invalid email or password.");

    return this.toAuthResult(user);
  }

  private toAuthResult(user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    organizationId: string;
  }): AuthResult {
    const token = this.sign({
      userId: user.id,
      organizationId: user.organizationId,
      role: user.role,
      email: user.email,
    });
    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
      },
    };
  }
}

export const authService = new AuthService();

// Re-exported for callers that need the Prisma namespace alongside auth.
export type { Prisma };
