import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { prisma } from "../config/database";
import { authService, type AuthResult } from "./auth.service";
import { generateDemoOrgData } from "./demoDataGenerator";

// ─────────────────────────────────────────────────────────────────────────────
// DemoSeedService — powers the "Try the live demo" button on the login page.
//
// Unlike `Prisma/seed.ts` (which wipes the ENTIRE database and is only ever
// meant to be run by hand for local dev), this is safe to expose as a public
// endpoint: it only ever touches one fixed, dedicated demo organization. The
// first call creates it; every call after that is a no-op that just signs
// the caller in. No other tenant's data is ever read, deleted, or modified.
// ─────────────────────────────────────────────────────────────────────────────

const DEMO_ORG_SLUG = "saucer-ai-demo";
const DEMO_ORG_NAME = "Saucer AI Demo";
const DEMO_ADMIN_EMAIL = "admin@saucer.ai";
const DEMO_ADMIN_PASSWORD = "password123";
const DEMO_CUSTOMER_COUNT = 300;

export async function ensureDemoOrgSeeded(): Promise<AuthResult> {
  const existingOrg = await prisma.organization.findUnique({
    where: { slug: DEMO_ORG_SLUG },
    select: { id: true },
  });

  if (!existingOrg) {
    const orgId = randomUUID();
    const passwordHash = await bcrypt.hash(DEMO_ADMIN_PASSWORD, 10);

    await prisma.organization.create({
      data: { id: orgId, name: DEMO_ORG_NAME, slug: DEMO_ORG_SLUG },
    });

    await prisma.user.create({
      data: {
        id: randomUUID(),
        organizationId: orgId,
        email: DEMO_ADMIN_EMAIL,
        name: "Admin User",
        passwordHash,
        role: UserRole.ADMIN,
      },
    });

    await generateDemoOrgData(orgId, { customerCount: DEMO_CUSTOMER_COUNT });
  }

  return authService.login(DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD);
}
