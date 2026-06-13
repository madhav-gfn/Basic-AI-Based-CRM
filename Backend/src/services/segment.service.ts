import { prisma } from "../config/database";
import { Prisma, Segment } from "@prisma/client";

export interface SegmentFilters {
  gender?: string;
  city?: string;
  lastPurchaseDaysAgo?: number;
  minOrderCount?: number;
  minLifetimeSpend?: number;
  productCategory?: string;
}

type NumericOp = "gte" | "gt" | "lte" | "lt" | "eq";
type StringOp = "eq" | "in";

type RuleBasedSegmentRule =
  | { field: "totalSpend" | "orderCount"; op: NumericOp; value: number }
  | { field: "city" | "gender" | "favoriteCategory"; op: StringOp; value: string | string[] }
  | { field: "daysSinceLastOrder" | "daysSinceSignup"; op: NumericOp; value: number };

export interface RuleBasedSegmentDefinition {
  operator?: "AND" | "OR";
  rules: RuleBasedSegmentRule[];
}

export type SegmentDefinition = SegmentFilters | RuleBasedSegmentDefinition;

export interface EvaluationResult {
  count: number;
  filters: SegmentDefinition;
}

function isRuleBasedDefinition(value: unknown): value is RuleBasedSegmentDefinition {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as RuleBasedSegmentDefinition).rules)
  );
}

function toPrismaNumberOperator(op: NumericOp): "gte" | "gt" | "lte" | "lt" | "equals" {
  return op === "eq" ? "equals" : op;
}

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 86_400_000);
}

function asStringArray(value: string | string[]): string[] {
  return Array.isArray(value) ? value : [value];
}

export class SegmentService {
  async buildPrismaWhereClause(
    definition: SegmentDefinition
  ): Promise<Prisma.CustomerWhereInput> {
    if (isRuleBasedDefinition(definition)) {
      return this.buildRuleBasedWhereClause(definition);
    }

    return this.buildFlatFilterWhereClause(definition);
  }

  private async buildFlatFilterWhereClause(
    filters: SegmentFilters
  ): Promise<Prisma.CustomerWhereInput> {
    const where: Prisma.CustomerWhereInput = {};

    if (filters.gender) {
      where.gender = filters.gender;
    }

    if (filters.city) {
      where.city = filters.city;
    }

    const orderSomeConditions: Prisma.OrderWhereInput[] = [];

    if (filters.lastPurchaseDaysAgo !== undefined) {
      orderSomeConditions.push({ orderDate: { gte: daysAgo(filters.lastPurchaseDaysAgo) } });
    }

    if (filters.productCategory) {
      orderSomeConditions.push({ category: filters.productCategory });
    }

    if (orderSomeConditions.length === 1) {
      where.orders = { some: orderSomeConditions[0] };
    } else if (orderSomeConditions.length > 1) {
      where.orders = { some: { AND: orderSomeConditions } };
    }

    const aggregationIdSets: string[][] = [];

    if (filters.minOrderCount !== undefined) {
      aggregationIdSets.push(await this.getOrderCountCustomerIds("gte", filters.minOrderCount));
    }

    if (filters.minLifetimeSpend !== undefined) {
      aggregationIdSets.push(await this.getTotalSpendCustomerIds("gte", filters.minLifetimeSpend));
    }

    if (aggregationIdSets.length > 0) {
      where.id = { in: this.intersectIdSets(aggregationIdSets) };
    }

    return where;
  }

  private async buildRuleBasedWhereClause(
    definition: RuleBasedSegmentDefinition
  ): Promise<Prisma.CustomerWhereInput> {
    const clauses = await Promise.all(
      definition.rules.map((rule) => this.buildRuleWhereClause(rule))
    );

    const activeClauses = clauses.filter((clause) => Object.keys(clause).length > 0);

    if (activeClauses.length === 0) return {};
    if (activeClauses.length === 1) return activeClauses[0];

    return (definition.operator ?? "AND") === "OR"
      ? { OR: activeClauses }
      : { AND: activeClauses };
  }

  private async buildRuleWhereClause(
    rule: RuleBasedSegmentRule
  ): Promise<Prisma.CustomerWhereInput> {
    switch (rule.field) {
      case "city":
      case "gender":
        return {
          [rule.field]:
            rule.op === "in"
              ? { in: asStringArray(rule.value) }
              : { equals: rule.value as string },
        } as Prisma.CustomerWhereInput;

      case "orderCount":
        return { id: { in: await this.getOrderCountCustomerIds(rule.op, rule.value) } };

      case "totalSpend":
        return { id: { in: await this.getTotalSpendCustomerIds(rule.op, rule.value) } };

      case "favoriteCategory":
        return { id: { in: await this.getFavoriteCategoryCustomerIds(rule.op, rule.value) } };

      case "daysSinceLastOrder":
        return this.buildDaysSinceLastOrderWhere(rule.op, rule.value);

      case "daysSinceSignup":
        return this.buildDaysSinceSignupWhere(rule.op, rule.value);
    }
  }

  private async getOrderCountCustomerIds(op: NumericOp, value: number): Promise<string[]> {
    const groups = await prisma.order.groupBy({
      by: ["customerId"],
      _count: { id: true },
      having: {
        id: { _count: { [toPrismaNumberOperator(op)]: value } },
      } as Prisma.OrderScalarWhereWithAggregatesInput,
    });

    return groups.map((group) => group.customerId);
  }

  private async getTotalSpendCustomerIds(op: NumericOp, value: number): Promise<string[]> {
    const groups = await prisma.order.groupBy({
      by: ["customerId"],
      _sum: { orderValue: true },
      having: {
        orderValue: { _sum: { [toPrismaNumberOperator(op)]: value } },
      } as Prisma.OrderScalarWhereWithAggregatesInput,
    });

    return groups.map((group) => group.customerId);
  }

  private async getFavoriteCategoryCustomerIds(
    _op: StringOp,
    value: string | string[]
  ): Promise<string[]> {
    const accepted = new Set(asStringArray(value));
    const categoryCounts = await prisma.order.groupBy({
      by: ["customerId", "category"],
      _count: { id: true },
    });

    const favoriteByCustomer = new Map<string, { category: string; count: number }>();

    for (const group of categoryCounts) {
      const count = group._count.id;
      const current = favoriteByCustomer.get(group.customerId);

      if (!current || count > current.count) {
        favoriteByCustomer.set(group.customerId, { category: group.category, count });
      }
    }

    return Array.from(favoriteByCustomer.entries())
      .filter(([, favorite]) => accepted.has(favorite.category))
      .map(([customerId]) => customerId);
  }

  private buildDaysSinceLastOrderWhere(
    op: NumericOp,
    value: number
  ): Prisma.CustomerWhereInput {
    const cutoff = daysAgo(value);

    switch (op) {
      case "gte":
        return { orders: { none: { orderDate: { gt: cutoff } } } };
      case "gt":
        return { orders: { none: { orderDate: { gte: cutoff } } } };
      case "lte":
        return { orders: { some: { orderDate: { gte: cutoff } } } };
      case "lt":
        return { orders: { some: { orderDate: { gt: cutoff } } } };
      case "eq": {
        const start = daysAgo(value + 1);
        const end = cutoff;
        return {
          AND: [
            { orders: { some: { orderDate: { gte: start, lt: end } } } },
            { orders: { none: { orderDate: { gte: end } } } },
          ],
        };
      }
    }
  }

  private buildDaysSinceSignupWhere(
    op: NumericOp,
    value: number
  ): Prisma.CustomerWhereInput {
    const cutoff = daysAgo(value);

    switch (op) {
      case "gte":
        return { signupDate: { lte: cutoff } };
      case "gt":
        return { signupDate: { lt: cutoff } };
      case "lte":
        return { signupDate: { gte: cutoff } };
      case "lt":
        return { signupDate: { gt: cutoff } };
      case "eq": {
        const start = daysAgo(value + 1);
        const end = cutoff;
        return { signupDate: { gte: start, lt: end } };
      }
    }
  }

  private intersectIdSets(idSets: string[][]): string[] {
    return idSets.reduce((acc, curr) => {
      const lookup = new Set(curr);
      return acc.filter((id) => lookup.has(id));
    });
  }

  async evaluateSegment(filters: SegmentDefinition): Promise<EvaluationResult> {
    const where = await this.buildPrismaWhereClause(filters);
    const count = await prisma.customer.count({ where });
    return { count, filters };
  }

  async saveSegment(
    name: string,
    filters: SegmentDefinition,
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

  async evaluateAndSave(
    name: string,
    filters: SegmentDefinition,
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
