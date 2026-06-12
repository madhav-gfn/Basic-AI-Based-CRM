// packages/db/src/seed.ts
// Run: pnpm --filter @xeno/db db:seed

import { PrismaClient, Channel, CampaignStatus } from "@prisma/client";

const prisma = new PrismaClient();

const CITIES = ["Delhi", "Mumbai", "Bangalore", "Hyderabad", "Chennai", "Pune", "Kolkata"];
const GENDERS = ["Male", "Female", "Other"];
const CATEGORIES = ["Apparel", "Footwear", "Accessories", "Beauty", "Home", "Electronics"];
const CHANNELS: Channel[] = ["EMAIL", "SMS", "WHATSAPP", "RCS"];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomFloat(min: number, max: number) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

function randomDate(startDaysAgo: number, endDaysAgo = 0) {
  const now = Date.now();
  const start = now - startDaysAgo * 86_400_000;
  const end = now - endDaysAgo * 86_400_000;
  return new Date(start + Math.random() * (end - start));
}

async function main() {
  console.log("🌱  Seeding database...");

  // ── Clean slate ──────────────────────────────────────────────────
  await prisma.communicationEvent.deleteMany();
  await prisma.communication.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.segment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.customer.deleteMany();

  // ── Customers (50) ───────────────────────────────────────────────
  const customerData = Array.from({ length: 50 }, (_, i) => ({
    name: `Customer ${i + 1}`,
    email: `customer${i + 1}@example.com`,
    phone: `+91${9000000000 + i}`,
    gender: randomFrom(GENDERS),
    city: randomFrom(CITIES),
    signupDate: randomDate(365, 30),
  }));

  await prisma.customer.createMany({ data: customerData });
  const customers = await prisma.customer.findMany();
  console.log(`  ✓ ${customers.length} customers`);

  // ── Orders (2–6 per customer) ─────────────────────────────────────
  const orderData = customers.flatMap((c) => {
    const count = Math.floor(Math.random() * 5) + 2;
    return Array.from({ length: count }, () => ({
      customerId: c.id,
      orderDate: randomDate(180),
      orderValue: randomFloat(299, 9999),
      category: randomFrom(CATEGORIES),
    }));
  });

  await prisma.order.createMany({ data: orderData });
  const orders = await prisma.order.findMany();
  console.log(`  ✓ ${orders.length} orders`);

  // ── Segments ──────────────────────────────────────────────────────
  const segments = await Promise.all([
    prisma.segment.create({
      data: {
        name: "High-Value Shoppers",
        createdBy: "system",
        definition: {
          operator: "AND",
          rules: [
            { field: "totalSpend", op: "gte", value: 5000 },
          ],
        },
      },
    }),
    prisma.segment.create({
      data: {
        name: "Delhi + Mumbai Customers",
        createdBy: "system",
        definition: {
          operator: "OR",
          rules: [
            { field: "city", op: "eq", value: "Delhi" },
            { field: "city", op: "eq", value: "Mumbai" },
          ],
        },
      },
    }),
    prisma.segment.create({
      data: {
        name: "Inactive (90+ days)",
        createdBy: "system",
        definition: {
          operator: "AND",
          rules: [
            { field: "lastOrderDate", op: "lt", value: "90_days_ago" },
          ],
        },
      },
    }),
  ]);
  console.log(`  ✓ ${segments.length} segments`);

  // ── Campaign ──────────────────────────────────────────────────────
  const campaign = await prisma.campaign.create({
    data: {
      name: "Summer Re-engagement",
      audienceId: segments[2].id,
      channel: "EMAIL",
      objective: "Re-engage inactive customers with a 15% discount offer",
      status: "DRAFT",
    },
  });
  console.log(`  ✓ 1 campaign`);

  console.log("🎉  Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
