// packages/db/src/index.ts
// Re-export the Prisma client as a singleton.
// Both `api` and `channel-service` import from "@xeno/db".

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Re-export all generated types so consumers never import from @prisma/client directly
export * from "@prisma/client";
