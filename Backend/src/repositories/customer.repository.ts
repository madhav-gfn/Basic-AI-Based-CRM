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
}

// Export a singleton so every controller shares the same instance
export const customerRepository = new CustomerRepository();