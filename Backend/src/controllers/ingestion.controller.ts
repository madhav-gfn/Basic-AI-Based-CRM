import { Request, Response, NextFunction } from "express";
import { Readable } from "stream";
import csv from "csv-parser";
import { prisma } from "../config/database";
import { Prisma } from "@prisma/client";
import { sendSuccess, sendError } from "../utils/response";

function parseCSV(buffer: Buffer): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    const rows: Record<string, string>[] = [];

    Readable.from(buffer)
      .pipe(csv({ mapHeaders: ({ header }) => header.trim().toLowerCase() }))
      .on("data", (row: Record<string, string>) => rows.push(row))
      .on("end", () => resolve(rows))
      .on("error", reject);
  });
}

export async function uploadCustomers(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      sendError(res, "No file uploaded", 400);
      return;
    }

    const rows = await parseCSV(req.file.buffer);

    if (rows.length === 0) {
      sendError(res, "CSV is empty", 422);
      return;
    }

    const customers: Prisma.CustomerCreateManyInput[] = rows
      .filter((r) => r.name?.trim() && r.email?.trim())
      .map((r) => ({
        name: r.name.trim(),
        email: r.email.trim().toLowerCase(),
        phone: r.phone?.trim() || null,
        gender: r.gender?.trim() || null,
        city: r.city?.trim() || null,
        signupDate: r.signup_date ? new Date(r.signup_date) : new Date(),
      }));

    const skipped = rows.length - customers.length;

    const result = await prisma.customer.createMany({
      data: customers,
      skipDuplicates: true,
    });

    sendSuccess(
      res,
      {
        total_rows: rows.length,
        ingested: result.count,
        skipped_invalid: skipped,
        skipped_duplicates: customers.length - result.count,
      },
      "Customer ingestion complete"
    );
  } catch (error) {
    next(error);
  }
}

export async function uploadOrders(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      sendError(res, "No file uploaded", 400);
      return;
    }

    const rows = await parseCSV(req.file.buffer);

    if (rows.length === 0) {
      sendError(res, "CSV is empty", 422);
      return;
    }

    const orders: Prisma.OrderCreateManyInput[] = rows
      .filter(
        (r) =>
          r.customer_id?.trim() &&
          r.order_value?.trim() &&
          r.category?.trim()
      )
      .map((r) => ({
        customerId: r.customer_id.trim(),
        orderDate: r.order_date ? new Date(r.order_date) : new Date(),
        orderValue: parseFloat(r.order_value),
        category: r.category.trim(),
      }))
      .filter((o) => !isNaN(o.orderValue));

    const skipped = rows.length - orders.length;

    const result = await prisma.order.createMany({
      data: orders,
      skipDuplicates: true,
    });

    sendSuccess(
      res,
      {
        total_rows: rows.length,
        ingested: result.count,
        skipped_invalid: skipped,
        skipped_duplicates: orders.length - result.count,
      },
      "Order ingestion complete"
    );
  } catch (error) {
    next(error);
  }
}
