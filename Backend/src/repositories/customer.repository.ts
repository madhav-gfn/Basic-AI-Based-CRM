import { prisma } from "../config/database";
import { Prisma } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────────
// Return types
// ─────────────────────────────────────────────────────────────────────────────

export type CustomerProfile = Prisma.CustomerGetPayload<{
  include: {
    orders: {
      orderBy: { orderDate: "desc" };
    };
  };
}>;

export interface CustomerMetrics {
  customerId: string;
  totalOrders: number;
  lifetimeSpend: number;
  averageOrderValue: number;
  lastPurchaseDate: Date | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// CustomerRepository
// Owns all DB access for the Customer domain.
// Controllers call these methods; they never touch prisma directly.
// ─────────────────────────────────────────────────────────────────────────────

export class CustomerRepository {
  /**
   * getCustomerProfile
   *
   * Returns the customer row together with their full order history,
   * most recent orders first.
   *
   * Single JOIN query — Prisma translates the `include` into one SQL
   * statement rather than two round-trips.
   */
  async getCustomerProfile(customerId: string): Promise<CustomerProfile | null> {
    return prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        orders: {
          orderBy: { orderDate: "desc" },
        },
      },
    });
  }

  /**
   * getCustomerMetrics
   *
   * All four metrics are computed in a SINGLE Prisma aggregate call,
   * which becomes one SQL query with SUM / AVG / COUNT / MAX evaluated
   * by the database engine — no records are transferred to Node.
   *
   *   SELECT
   *     SUM(order_value)  AS lifetimeSpend,
   *     AVG(order_value)  AS averageOrderValue,
   *     COUNT(id)         AS totalOrders,
   *     MAX(order_date)   AS lastPurchaseDate
   *   FROM orders
   *   WHERE customer_id = $1;
   */
  async getCustomerMetrics(customerId: string): Promise<CustomerMetrics> {
    // Confirm customer exists before running aggregation
    const exists = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true }, // fetch only PK — minimal data transfer
    });

    if (!exists) {
      throw new Error(`Customer not found: ${customerId}`);
    }

    const agg = await prisma.order.aggregate({
      where: { customerId },
      _sum: { orderValue: true },
      _avg: { orderValue: true },
      _count: { id: true },
      _max: { orderDate: true },
    });

    return {
      customerId,
      totalOrders: agg._count.id,
      lifetimeSpend: agg._sum.orderValue ?? 0,
      averageOrderValue: agg._avg.orderValue ?? 0,
      lastPurchaseDate: agg._max.orderDate ?? null,
    };
  }

  /**
   * getTopCustomers
   *
   * Bonus utility — ranks customers by lifetime spend using groupBy.
   * Kept here so controllers never need to write raw aggregations.
   *
   * Uses Prisma's `groupBy` with `_sum` pushed down to the DB:
   *
   *   SELECT customer_id, SUM(order_value) AS total
   *   FROM orders
   *   GROUP BY customer_id
   *   ORDER BY total DESC
   *   LIMIT $1;
   */
  async getTopCustomers(limit = 10): Promise<
    { customerId: string; lifetimeSpend: number }[]
  > {
    const groups = await prisma.order.groupBy({
      by: ["customerId"],
      _sum: { orderValue: true },
      orderBy: { _sum: { orderValue: "desc" } },
      take: limit,
    });

    return groups.map((g) => ({
      customerId: g.customerId,
      lifetimeSpend: g._sum.orderValue ?? 0,
    }));
  }

  /**
   * searchCustomers
   *
   * Free-text + faceted search over the customer base. Matches `q` against
   * name/email/city (case-insensitive), and optionally filters by city, gender,
   * or a tag. Paginated and index-backed on the filter columns.
   */
  async searchCustomers(params: {
    q?: string;
    city?: string;
    gender?: string;
    tag?: string;
    page: number;
    limit: number;
  }): Promise<{ customers: Prisma.CustomerGetPayload<{ include: { _count: { select: { orders: true } } } }>[]; total: number }> {
    const { q, city, gender, tag, page, limit } = params;

    const and: Prisma.CustomerWhereInput[] = [];

    if (q?.trim()) {
      const term = q.trim();
      and.push({
        OR: [
          { name: { contains: term, mode: "insensitive" } },
          { email: { contains: term, mode: "insensitive" } },
          { city: { contains: term, mode: "insensitive" } },
        ],
      });
    }
    if (city?.trim()) and.push({ city: { equals: city.trim(), mode: "insensitive" } });
    if (gender?.trim()) and.push({ gender: { equals: gender.trim(), mode: "insensitive" } });
    if (tag?.trim()) and.push({ tags: { has: tag.trim() } });

    const where: Prisma.CustomerWhereInput = and.length > 0 ? { AND: and } : {};

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { signupDate: "desc" },
        include: { _count: { select: { orders: true } } },
      }),
      prisma.customer.count({ where }),
    ]);

    return { customers, total };
  }

  /**
   * getCustomerActivity
   *
   * A unified, reverse-chronological activity timeline for a customer: their
   * orders and the campaign communications they received, merged into one feed.
   */
  async getCustomerActivity(
    customerId: string,
    limit = 50
  ): Promise<
    {
      type: "order" | "communication";
      timestamp: Date;
      title: string;
      detail: string;
      status?: string;
    }[]
  > {
    const exists = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true },
    });
    if (!exists) throw new Error(`Customer not found: ${customerId}`);

    const [orders, communications] = await Promise.all([
      prisma.order.findMany({
        where: { customerId },
        orderBy: { orderDate: "desc" },
        take: limit,
      }),
      prisma.communication.findMany({
        where: { customerId },
        orderBy: { createdAt: "desc" },
        take: limit,
        include: { campaign: { select: { name: true } } },
      }),
    ]);

    const feed = [
      ...orders.map((o) => ({
        type: "order" as const,
        timestamp: o.orderDate,
        title: `Order · ${o.category}`,
        detail: `₹${o.orderValue.toLocaleString("en-IN")}`,
      })),
      ...communications.map((c) => ({
        type: "communication" as const,
        timestamp: c.createdAt,
        title: `Campaign · ${c.campaign.name}`,
        detail: `${c.channel} message`,
        status: c.status,
      })),
    ];

    feed.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return feed.slice(0, limit);
  }
}

// Export a singleton so every controller shares the same instance
export const customerRepository = new CustomerRepository();