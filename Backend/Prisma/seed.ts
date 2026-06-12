// packages/db/src/seed.ts
// Run: pnpm --filter @xeno/db db:seed

import { randomUUID } from "crypto";
import {
  PrismaClient,
  Channel,
  CampaignStatus,
  CommunicationStatus,
  EventType,
} from "@prisma/client";

const prisma = new PrismaClient();

const CITIES = ["Delhi", "Mumbai", "Bangalore", "Hyderabad", "Chennai", "Pune", "Kolkata"];
const GENDERS = ["Male", "Female", "Other"];
const CATEGORIES = ["Apparel", "Footwear", "Accessories", "Beauty", "Home", "Electronics"];
const CHANNELS: Channel[] = [Channel.EMAIL, Channel.SMS, Channel.WHATSAPP, Channel.RCS];

type Persona = "VIP" | "REGULAR" | "DORMANT" | "NEW" | "DISCOUNT_HUNTER";

type CustomerProfile = {
  id: string;
  email: string;
  name: string;
  phone: string;
  gender: string;
  city: string;
  signupDate: Date;
  persona: Persona;

  orderCount: number;
  totalSpend: number;
  lastOrderDate: Date | null;
  firstOrderDate: Date | null;
  favoriteCategory: string | null;
  categoryCounts: Record<string, number>;
};

type SegmentRule =
  | { field: "totalSpend" | "orderCount"; op: "gte" | "gt" | "lte" | "lt" | "eq"; value: number }
  | { field: "city" | "gender" | "favoriteCategory"; op: "eq" | "in"; value: string | string[] }
  | { field: "daysSinceLastOrder" | "daysSinceSignup"; op: "gte" | "gt" | "lte" | "lt" | "eq"; value: number };

type SegmentDefinition = {
  operator: "AND" | "OR";
  rules: SegmentRule[];
};

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

function daysAgo(days: number) {
  return new Date(Date.now() - days * 86_400_000);
}

function clampDateWithin(daysMinAgo: number, daysMaxAgo: number) {
  return randomDate(daysMaxAgo, daysMinAgo);
}

function weightedCategory(persona: Persona): string {
  const picks: Record<Persona, string[]> = {
    VIP: ["Apparel", "Accessories", "Footwear"],
    REGULAR: ["Apparel", "Footwear", "Home", "Beauty"],
    DORMANT: ["Apparel", "Accessories", "Beauty"],
    NEW: ["Apparel", "Beauty", "Accessories"],
    DISCOUNT_HUNTER: ["Apparel", "Footwear", "Beauty", "Home"],
  };
  return randomFrom(picks[persona]);
}

function pickPersona(): Persona {
  const r = Math.random();
  if (r < 0.15) return "VIP";
  if (r < 0.55) return "REGULAR";
  if (r < 0.75) return "DORMANT";
  if (r < 0.9) return "NEW";
  return "DISCOUNT_HUNTER";
}

function matchRule(profile: CustomerProfile, rule: SegmentRule): boolean {
  switch (rule.field) {
    case "totalSpend":
      return compareNumber(profile.totalSpend, rule.op, rule.value);
    case "orderCount":
      return compareNumber(profile.orderCount, rule.op, rule.value);
    case "city":
      return compareString(profile.city, rule.op, rule.value);
    case "gender":
      return compareString(profile.gender, rule.op, rule.value);
    case "favoriteCategory":
      return compareString(profile.favoriteCategory, rule.op, rule.value);
    case "daysSinceLastOrder": {
      const value =
        profile.lastOrderDate === null
          ? Number.POSITIVE_INFINITY
          : Math.floor((Date.now() - profile.lastOrderDate.getTime()) / 86_400_000);
      return compareNumber(value, rule.op, rule.value);
    }
    case "daysSinceSignup": {
      const value = Math.floor((Date.now() - profile.signupDate.getTime()) / 86_400_000);
      return compareNumber(value, rule.op, rule.value);
    }
    default:
      return false;
  }
}

function compareNumber(actual: number, op: SegmentRule["op"], expected: number): boolean {
  switch (op) {
    case "gte":
      return actual >= expected;
    case "gt":
      return actual > expected;
    case "lte":
      return actual <= expected;
    case "lt":
      return actual < expected;
    case "eq":
      return actual === expected;
    default:
      return false;
  }
}

function compareString(actual: string | null, op: SegmentRule["op"], expected: string | string[]): boolean {
  if (actual === null) return false;

  if (op === "eq") {
    return actual === expected;
  }

  if (op === "in" && Array.isArray(expected)) {
    return expected.includes(actual);
  }

  return false;
}

function matchesSegment(profile: CustomerProfile, definition: SegmentDefinition): boolean {
  const results = definition.rules.map((rule) => matchRule(profile, rule));
  return definition.operator === "AND" ? results.every(Boolean) : results.some(Boolean);
}

function sample<T>(arr: T[], maxCount: number): T[] {
  if (arr.length <= maxCount) return [...arr];
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, maxCount);
}

async function main() {
  console.log("🌱  Seeding database...");

  // Clean slate in dependency order
  await prisma.communicationEvent.deleteMany();
  await prisma.communication.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.segment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.customer.deleteMany();

  // ── Customers + Profiles ──────────────────────────────────────────
  const customerProfiles: CustomerProfile[] = [];
  const customerData = Array.from({ length: 2000 }, (_, i) => {
    const persona = pickPersona();
    const customer = {
      id: randomUUID(),
      name: `Customer ${i + 1}`,
      email: `customer${i + 1}@example.com`,
      phone: `+91${9000000000 + i}`,
      gender: randomFrom(GENDERS),
      city: randomFrom(CITIES),
      signupDate: randomDate(730, 1),
      persona,
      orderCount: 0,
      totalSpend: 0,
      lastOrderDate: null,
      firstOrderDate: null,
      favoriteCategory: null,
      categoryCounts: {} as Record<string, number>,
    };

    customerProfiles.push(customer);
    return {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      gender: customer.gender,
      city: customer.city,
      signupDate: customer.signupDate,
    };
  });

  await prisma.customer.createMany({
    data: customerData,
  });
  console.log(`  ✓ ${customerData.length} customers`);

  // ── Orders ───────────────────────────────────────────────────────
  const orderData: {
    id: string;
    customerId: string;
    orderDate: Date;
    orderValue: number;
    category: string;
  }[] = [];

  for (const profile of customerProfiles) {
    let orderCount = 0;

    switch (profile.persona) {
      case "VIP":
        orderCount = Math.floor(Math.random() * 13) + 10; // 10–22
        break;
      case "REGULAR":
        orderCount = Math.floor(Math.random() * 5) + 4; // 4–8
        break;
      case "DORMANT":
        orderCount = Math.floor(Math.random() * 4) + 2; // 2–5
        break;
      case "NEW":
        orderCount = Math.floor(Math.random() * 2) + 1; // 1–2
        break;
      case "DISCOUNT_HUNTER":
        orderCount = Math.floor(Math.random() * 7) + 3; // 3–9
        break;
    }

    for (let i = 0; i < orderCount; i++) {
      let orderDate: Date;
      let orderValue: number;

      switch (profile.persona) {
        case "VIP":
          orderDate = clampDateWithin(1, 90);
          orderValue = randomFloat(4000, 15000);
          break;
        case "REGULAR":
          orderDate = clampDateWithin(1, 180);
          orderValue = randomFloat(1200, 7000);
          break;
        case "DORMANT":
          orderDate = clampDateWithin(90, 360);
          orderValue = randomFloat(800, 4500);
          break;
        case "NEW":
          orderDate = clampDateWithin(1, 30);
          orderValue = randomFloat(500, 3500);
          break;
        case "DISCOUNT_HUNTER":
          orderDate = clampDateWithin(1, 180);
          orderValue = randomFloat(300, 2500);
          break;
      }

      const category = weightedCategory(profile.persona);

      orderData.push({
        id: randomUUID(),
        customerId: profile.id,
        orderDate,
        orderValue,
        category,
      });

      profile.orderCount += 1;
      profile.totalSpend += orderValue;
      profile.categoryCounts[category] = (profile.categoryCounts[category] ?? 0) + 1;

      if (!profile.firstOrderDate || orderDate < profile.firstOrderDate) {
        profile.firstOrderDate = orderDate;
      }
      if (!profile.lastOrderDate || orderDate > profile.lastOrderDate) {
        profile.lastOrderDate = orderDate;
      }
    }

    const favorite = Object.entries(profile.categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    profile.favoriteCategory = favorite;
  }

  await prisma.order.createMany({
    data: orderData,
  });
  console.log(`  ✓ ${orderData.length} orders`);

  // ── Segments ─────────────────────────────────────────────────────
  const segmentDefinitions: Array<{ name: string; definition: SegmentDefinition }> = [
    {
      name: "VIP Customers",
      definition: {
        operator: "AND",
        rules: [
          { field: "totalSpend", op: "gte", value: 50000 },
          { field: "orderCount", op: "gte", value: 8 },
        ],
      },
    },
    {
      name: "Dormant Customers",
      definition: {
        operator: "AND",
        rules: [{ field: "daysSinceLastOrder", op: "gte", value: 90 }],
      },
    },
    {
      name: "New Customers",
      definition: {
        operator: "AND",
        rules: [
          { field: "daysSinceSignup", op: "lte", value: 30 },
          { field: "orderCount", op: "lte", value: 2 },
        ],
      },
    },
    {
      name: "Delhi Shoppers",
      definition: {
        operator: "AND",
        rules: [{ field: "city", op: "eq", value: "Delhi" }],
      },
    },
    {
      name: "Mumbai + Pune Buyers",
      definition: {
        operator: "OR",
        rules: [
          { field: "city", op: "eq", value: "Mumbai" },
          { field: "city", op: "eq", value: "Pune" },
        ],
      },
    },
    {
      name: "High Frequency Buyers",
      definition: {
        operator: "AND",
        rules: [{ field: "orderCount", op: "gte", value: 8 }],
      },
    },
    {
      name: "Fashion Heavy Spenders",
      definition: {
        operator: "AND",
        rules: [
          { field: "favoriteCategory", op: "eq", value: "Apparel" },
          { field: "totalSpend", op: "gte", value: 15000 },
        ],
      },
    },
    {
      name: "Footwear Enthusiasts",
      definition: {
        operator: "AND",
        rules: [{ field: "favoriteCategory", op: "eq", value: "Footwear" }],
      },
    },
    {
      name: "Beauty Buyers",
      definition: {
        operator: "AND",
        rules: [{ field: "favoriteCategory", op: "eq", value: "Beauty" }],
      },
    },
    {
      name: "Discount Hunters",
      definition: {
        operator: "AND",
        rules: [
          { field: "orderCount", op: "gte", value: 3 },
          { field: "totalSpend", op: "lt", value: 12000 },
        ],
      },
    },
  ];

  const segments = await Promise.all(
    segmentDefinitions.map((segment) =>
      prisma.segment.create({
        data: {
          id: randomUUID(),
          name: segment.name,
          createdBy: "system",
          definition: segment.definition,
        },
      })
    )
  );
  console.log(`  ✓ ${segments.length} segments`);

  // Map segment name -> id
  const segmentByName = new Map(segments.map((s) => [s.name, s]));

  // ── Campaigns ────────────────────────────────────────────────────
  const campaignsSeed = [
    {
      name: "Summer Re-Engagement",
      audience: "Dormant Customers",
      channel: Channel.EMAIL,
      objective: "Re-engage inactive shoppers with a fashion discount.",
      status: CampaignStatus.COMPLETED,
    },
    {
      name: "VIP Exclusive Drop",
      audience: "VIP Customers",
      channel: Channel.WHATSAPP,
      objective: "Launch an exclusive premium collection to top spenders.",
      status: CampaignStatus.COMPLETED,
    },
    {
      name: "New Arrival Push",
      audience: "New Customers",
      channel: Channel.SMS,
      objective: "Drive first repeat purchase with a new arrivals offer.",
      status: CampaignStatus.COMPLETED,
    },
    {
      name: "Delhi Style Week",
      audience: "Delhi Shoppers",
      channel: Channel.RCS,
      objective: "Promote city-specific fashion styling content.",
      status: CampaignStatus.COMPLETED,
    },
    {
      name: "Footwear Weekend",
      audience: "Footwear Enthusiasts",
      channel: Channel.EMAIL,
      objective: "Promote a footwear collection weekend sale.",
      status: CampaignStatus.COMPLETED,
    },
    {
      name: "Beauty Add-On Offer",
      audience: "Beauty Buyers",
      channel: Channel.WHATSAPP,
      objective: "Cross-sell beauty products to fashion shoppers.",
      status: CampaignStatus.COMPLETED,
    },
    {
      name: "Premium Members Preview",
      audience: "Fashion Heavy Spenders",
      channel: Channel.WHATSAPP,
      objective: "Offer early access to premium apparel drops.",
      status: CampaignStatus.RUNNING,
    },
    {
      name: "Mumbai-Pune Flash Sale",
      audience: "Mumbai + Pune Buyers",
      channel: Channel.SMS,
      objective: "Push limited-time offers to nearby shoppers.",
      status: CampaignStatus.SCHEDULED,
    },
    {
      name: "Discount Hunter Offer",
      audience: "Discount Hunters",
      channel: Channel.EMAIL,
      objective: "Target value-sensitive shoppers with a time-bound coupon.",
      status: CampaignStatus.SCHEDULED,
    },
    {
      name: "High Frequency Rewards",
      audience: "High Frequency Buyers",
      channel: Channel.WHATSAPP,
      objective: "Reward frequent buyers with a loyalty-style incentive.",
      status: CampaignStatus.COMPLETED,
    },
    {
      name: "Monsoon Collection",
      audience: "Apparel Buyers",
      channel: Channel.RCS,
      objective: "Promote monsoon-ready fashion essentials.",
      status: CampaignStatus.DRAFT,
    },
    {
      name: "Apparel Replenishment",
      audience: "Fashion Heavy Spenders",
      channel: Channel.EMAIL,
      objective: "Encourage repeat apparel purchases with style recommendations.",
      status: CampaignStatus.COMPLETED,
    },
  ];

  // Add one extra segment for apparel buyers if needed
  let apparelSegment = segmentByName.get("Fashion Heavy Spenders");
  if (!apparelSegment) {
    apparelSegment = await prisma.segment.create({
      data: {
        id: randomUUID(),
        name: "Apparel Buyers",
        createdBy: "system",
        definition: {
          operator: "AND",
          rules: [{ field: "favoriteCategory", op: "eq", value: "Apparel" }],
        } satisfies SegmentDefinition,
      },
    });
    segments.push(apparelSegment);
    segmentByName.set(apparelSegment.name, apparelSegment);
  }

  const campaignIdsForExecution = new Set<string>();

  const campaigns = await Promise.all(
    campaignsSeed.map(async (campaignSeed) => {
      const audienceSegment =
        segmentByName.get(campaignSeed.audience) ?? segmentByName.get("Fashion Heavy Spenders") ?? segments[0];

      const launchedAt =
        campaignSeed.status === CampaignStatus.COMPLETED || campaignSeed.status === CampaignStatus.RUNNING
          ? randomDate(45, 1)
          : campaignSeed.status === CampaignStatus.SCHEDULED
            ? randomDate(2, 0)
            : null;

      const campaign = await prisma.campaign.create({
        data: {
          id: randomUUID(),
          name: campaignSeed.name,
          audienceId: audienceSegment.id,
          channel: campaignSeed.channel,
          objective: campaignSeed.objective,
          status: campaignSeed.status,
          launchedAt,
        },
      });

      if (campaignSeed.status !== CampaignStatus.DRAFT) {
        campaignIdsForExecution.add(campaign.id);
      }

      return campaign;
    })
  );
  console.log(`  ✓ ${campaigns.length} campaigns`);

  // ── Communications + Events ──────────────────────────────────────
  const communicationsToInsert: {
    id: string;
    campaignId: string;
    customerId: string;
    channel: Channel;
    message: string;
    status: CommunicationStatus;
    createdAt: Date;
  }[] = [];

  const eventsToInsert: {
    id: string;
    communicationId: string;
    eventType: EventType;
    timestamp: Date;
    metadata: any;
  }[] = [];

  function buildMessage(profile: CustomerProfile, campaignName: string, channel: Channel) {
    const offer =
      profile.persona === "VIP"
        ? "an exclusive early-access offer"
        : profile.persona === "DORMANT"
          ? "a comeback discount"
          : profile.persona === "NEW"
            ? "a welcome offer"
            : profile.persona === "DISCOUNT_HUNTER"
              ? "a limited-time savings offer"
              : "a personalized style offer";

    const category = profile.favoriteCategory ?? "Apparel";
    const channelHint =
      channel === Channel.WHATSAPP
        ? "Reply now to shop the collection."
        : channel === Channel.SMS
          ? "Tap to view the offer."
          : channel === Channel.RCS
            ? "Explore the curated looks."
            : "Open to see your personalized picks.";

    return `Hi ${profile.name}, ${campaignName} brings you ${offer} on ${category}. ${channelHint}`;
  }

  function getAudienceCustomers(segmentName: string): CustomerProfile[] {
    const segment = segmentDefinitions.find((s) => s.name === segmentName);
    if (!segment) return [];
    return customerProfiles.filter((profile) => matchesSegment(profile, segment.definition));
  }

  function chooseExecutionAudience(segmentName: string): CustomerProfile[] {
    const audience = getAudienceCustomers(segmentName);

    // keep demo data large enough to be meaningful but not too heavy
    const caps: Record<string, number> = {
      "VIP Customers": 250,
      "Dormant Customers": 350,
      "New Customers": 300,
      "Delhi Shoppers": 350,
      "Mumbai + Pune Buyers": 350,
      "High Frequency Buyers": 300,
      "Fashion Heavy Spenders": 300,
      "Footwear Enthusiasts": 250,
      "Beauty Buyers": 250,
      "Discount Hunters": 350,
      "Apparel Buyers": 300,
    };

    return sample(audience, caps[segmentName] ?? 300);
  }

  function eventTimeline(base: Date, stage: "success" | "fail") {
    const sentAt = new Date(base.getTime());
    const deliveredAt = new Date(base.getTime() + 2 * 60 * 1000);
    const openedAt = new Date(base.getTime() + 25 * 60 * 1000);
    const readAt = new Date(base.getTime() + 40 * 60 * 1000);
    const clickedAt = new Date(base.getTime() + 70 * 60 * 1000);
    const convertedAt = new Date(base.getTime() + 2 * 86_400_000);

    if (stage === "fail") {
      return [
        { eventType: EventType.SENT, timestamp: sentAt, metadata: { provider: "stub-channel" } },
        { eventType: EventType.FAILED, timestamp: deliveredAt, metadata: { reason: "Simulated delivery failure" } },
      ];
    }

    const events: { eventType: EventType; timestamp: Date; metadata: Record<string, unknown> }[] = [
      { eventType: EventType.SENT, timestamp: sentAt, metadata: { provider: "stub-channel" } },
      { eventType: EventType.DELIVERED, timestamp: deliveredAt, metadata: {} },
    ];

    const openRoll = Math.random();
    const readRoll = Math.random();
    const clickRoll = Math.random();
    const convertRoll = Math.random();

    if (openRoll < 0.72) events.push({ eventType: EventType.OPENED, timestamp: openedAt, metadata: {} });
    if (readRoll < 0.58) events.push({ eventType: EventType.READ, timestamp: readAt, metadata: {} });
    if (clickRoll < 0.22) events.push({ eventType: EventType.CLICKED, timestamp: clickedAt, metadata: { url: "/collections/new-arrivals" } });
    if (convertRoll < 0.05) events.push({ eventType: EventType.CONVERTED, timestamp: convertedAt, metadata: { orderValue: randomFloat(999, 7999) } });

    return events;
  }

  for (const campaign of campaigns) {
    if (!campaignIdsForExecution.has(campaign.id)) continue;

    const campaignSeed = campaignsSeed.find((c) => c.name === campaign.name);
    if (!campaignSeed) continue;

    const audience = chooseExecutionAudience(campaignSeed.audience);
    const baseLaunch = campaign.launchedAt ?? randomDate(30, 1);

    for (const profile of audience) {
      const communicationId = randomUUID();
      const shouldFail = Math.random() < 0.04;
      const events = eventTimeline(baseLaunch, shouldFail ? "fail" : "success");
      const finalStatus =
        shouldFail
          ? CommunicationStatus.FAILED
          : events.some((e) => e.eventType === EventType.CONVERTED)
            ? CommunicationStatus.CLICKED
            : events.some((e) => e.eventType === EventType.CLICKED)
              ? CommunicationStatus.CLICKED
              : events.some((e) => e.eventType === EventType.READ)
                ? CommunicationStatus.READ
                : events.some((e) => e.eventType === EventType.OPENED)
                  ? CommunicationStatus.OPENED
                  : events.some((e) => e.eventType === EventType.DELIVERED)
                    ? CommunicationStatus.DELIVERED
                    : CommunicationStatus.SENT;

      communicationsToInsert.push({
        id: communicationId,
        campaignId: campaign.id,
        customerId: profile.id,
        channel: campaign.channel,
        message: buildMessage(profile, campaign.name, campaign.channel),
        status: finalStatus,
        createdAt: baseLaunch,
      });

      for (const event of events) {
        eventsToInsert.push({
          id: randomUUID(),
          communicationId,
          eventType: event.eventType,
          timestamp: event.timestamp,
          metadata: event.metadata,
        });
      }
    }
  }

  await prisma.communication.createMany({
    data: communicationsToInsert,
  });

  await prisma.communicationEvent.createMany({
    data: eventsToInsert,
  });

  console.log(`  ✓ ${communicationsToInsert.length} communications`);
  console.log(`  ✓ ${eventsToInsert.length} communication events`);

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