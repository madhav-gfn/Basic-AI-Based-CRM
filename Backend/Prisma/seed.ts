// packages/db/src/seed.ts
// Run: pnpm --filter @xeno/db db:seed

import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";
import { prisma } from "../src/config/database";
import { generateDemoOrgData } from "../src/services/demoDataGenerator";

async function main() {
  console.log("🌱  Seeding database...");

  // Clean slate in dependency order — this wipes EVERY organization, not just
  // the demo one. Only ever run this against a local/dev database.
  await prisma.communicationEvent.deleteMany();
  await prisma.communication.deleteMany();
  await prisma.journeyEnrollment.deleteMany();
  await prisma.journeyStep.deleteMany();
  await prisma.journey.deleteMany();
  await prisma.campaignVariant.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.segment.deleteMany();
  await prisma.messageTemplate.deleteMany();
  await prisma.order.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  // ── Default Organization + Admin User ──────────────────────────────
  const orgId = randomUUID();
  const adminUserId = randomUUID();
  const passwordHash = await bcrypt.hash("password123", 10);

  await prisma.organization.create({
    data: {
      id: orgId,
      name: "Saucer AI Demo",
      slug: "saucer-ai-demo",
    },
  });

  await prisma.user.create({
    data: {
      id: adminUserId,
      organizationId: orgId,
      email: "admin@saucer.ai",
      name: "Admin User",
      passwordHash,
      role: UserRole.ADMIN,
    },
  });
  console.log("  ✓ Default organization (Saucer AI Demo) + admin user (admin@saucer.ai / password123)");

  const result = await generateDemoOrgData(orgId, { customerCount: 2000 });

  console.log(`  ✓ ${result.customers} customers`);
  console.log(`  ✓ ${result.orders} orders`);
  console.log(`  ✓ ${result.segments} segments`);
  console.log(`  ✓ ${result.campaigns} campaigns`);
  console.log(`  ✓ ${result.communications} communications (+ events)`);
  console.log(`  ✓ ${result.journeys} journeys (Welcome Series, Win-Back Journey)`);
  console.log("🎉  Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
