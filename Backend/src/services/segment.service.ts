import { prisma } from "../config/database";
import { Prisma, Segment } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────────
// SegmentFilters — the canonical JSON shape stored in Segment.definition
// ─────────────────────────────────────────────────────────────────────────────

export interface SegmentFilters {
  gender?: string;              // e.g. "Female"
  city?: string;                // e.g. "Mumbai"
  lastPurchaseDaysAgo?: number; // customers who ordered within the last N days
  minOrderCount?: number;       // customers with at least N orders  (aggregation)
  minLifetimeSpend?: number;    // customers whose SUM(order_value) >= N  (aggregation)
  productCategory?: string;     // customers who bought from this category
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal result types
// ─────────────────────────────────────────────────────────────────────────────

export interface EvaluationResult {
  count: number;
  filters: SegmentFilters;
}

// ─────────────────────────────────────────────────────────────────────────────
// SegmentService
// ─────────────────────────────────────────────────────────────────────────────

export class SegmentService {
  /**
   * buildPrismaWhereClause
   *
   * Converts a SegmentFilters object into a valid Prisma.CustomerWhereInput.
   *
   * Three layers of translation:
   *
   *  1. Direct fields  (gender, city)
   *     → simple equality predicates on the Customer table.
   *
   *  2. Relation existence filters  (lastPurchaseDaysAgo, productCategory)
   *     → `orders: { some: { ... } }` — Prisma emits a correlated EXISTS sub-query.
   *       "Does this customer have at least one order that matches?"
   *
   *  3. Aggregation filters  (minOrderCount, minLifetimeSpend)
   *     → Cannot be expressed as a single WHERE predicate on Customer.
   *       Strategy: run groupBy+having on the Order table to collect qualifying
   *       customerIds, then inject `id: { in: [...] }` into the Customer WHERE.
   *       Multiple aggregation filters are intersected (AND semantics).
   */
  async buildPrismaWhereClause(
    filters: SegmentFilters
  ): Promise<Prisma.CustomerWhereInput> {
    const where: Prisma.CustomerWhereInput = {};

    // ── Layer 1: Direct Customer field filters ────────────────────────────────
    if (filters.gender) {
      where.gender = filters.gender;
    }

    if (filters.city) {
      where.city = filters.city;
    }

    // ── Layer 2: Relation filters → orders.some ───────────────────────────────
    // Each filter becomes a condition on an individual Order row.
    // Combining them inside one `some` means "at least one order satisfies ALL
    // of these conditions simultaneously". For independent checks (e.g. any
    // recent order + any order in category), use separate `some` clauses.

    const orderSomeConditions: Prisma.OrderWhereInput[] = [];

    if (filters.lastPurchaseDaysAgo !== undefined) {
      const cutoff = new Date(
        Date.now() - filters.lastPurchaseDaysAgo * 86_400_000
      );
      // "Customer has at least one order placed on or after the cutoff date"
      orderSomeConditions.push({ orderDate: { gte: cutoff } });
    }

    if (filters.productCategory) {
      orderSomeConditions.push({ category: filters.productCategory });
    }

    if (orderSomeConditions.length === 1) {
      where.orders = { some: orderSomeConditions[0] };
    } else if (orderSomeConditions.length > 1) {
      // Prisma translates this to: EXISTS (SELECT 1 FROM orders WHERE AND [...])
      where.orders = { some: { AND: orderSomeConditions } };
    }

    // ── Layer 3: Aggregation sub-queries ──────────────────────────────────────
    // groupBy+having pushes SUM / COUNT down to the DB; only qualifying
    // customerIds are returned to Node — never raw order rows.
    const aggregationIdSets: string[][] = [];

    if (filters.minOrderCount !== undefined) {
      //  SELECT customer_id FROM orders
      //  GROUP BY customer_id
      //  HAVING COUNT(id) >= :minOrderCount
      const groups = await prisma.order.groupBy({
        by: ["customerId"],
        _count: { id: true },
        having: {
          id: { _count: { gte: filters.minOrderCount } },
        },
      });
      aggregationIdSets.push(groups.map((g) => g.customerId));
    }

    if (filters.minLifetimeSpend !== undefined) {
      //  SELECT customer_id FROM orders
      //  GROUP BY customer_id
      //  HAVING SUM(order_value) >= :minLifetimeSpend
      const groups = await prisma.order.groupBy({
        by: ["customerId"],
        _sum: { orderValue: true },
        having: {
          orderValue: { _sum: { gte: filters.minLifetimeSpend } },
        },
      });
      aggregationIdSets.push(groups.map((g) => g.customerId));
    }

    // Intersect all aggregation sets (AND semantics across filters).
    // If any set is empty the intersection is empty → no customers qualify.
    if (aggregationIdSets.length > 0) {
      const qualifyingIds = aggregationIdSets.reduce((acc, curr) => {
        const lookup = new Set(curr);
        return acc.filter((id) => lookup.has(id));
      });
      where.id = { in: qualifyingIds };
    }

    return where;
  }

  /**
   * evaluateSegment
   *
   * Returns the live count of customers that match the given filters.
   * Uses prisma.customer.count() — fetches a single integer from the DB,
   * not the actual customer rows.
   */
  async evaluateSegment(filters: SegmentFilters): Promise<EvaluationResult> {
    const where = await this.buildPrismaWhereClause(filters);
    const count = await prisma.customer.count({ where });
    return { count, filters };
  }

  /**
   * saveSegment
   *
   * Persists the segment name + filter definition to the Segment table.
   * The `definition` JSON column stores the raw SegmentFilters object so it can
   * be re-evaluated at any time without schema changes.
   */
  async saveSegment(
    name: string,
    filters: SegmentFilters,
    createdBy: string
  ): Promise<Segment> {
    return prisma.segment.create({
      data: {
        name,
        definition: filters as Prisma.InputJsonValue,
        createdBy,
      },
    });
  }

  /**
   * evaluateAndSave
   *
   * Convenience method: preview the audience size, then persist.
   * Returns both the saved Segment record and the live audience count.
   */
  async evaluateAndSave(
    name: string,
    filters: SegmentFilters,
    createdBy: string
  ): Promise<{ segment: Segment; audienceCount: number }> {
    const [{ count }, segment] = await Promise.all([
      this.evaluateSegment(filters),
      this.saveSegment(name, filters, createdBy),
    ]);
    return { segment, audienceCount: count };
  }
}

export const segmentService = new SegmentService();