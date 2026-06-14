import { Request, Response, NextFunction } from "express";
import { customerRepository } from "../repositories/customer.repository";
import { prisma } from "../config/database";
import { sendSuccess, sendError } from "../utils/response";

export async function getAllCustomers(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        skip,
        take: limit,
        orderBy: { signupDate: "desc" },
        include: {
          _count: { select: { orders: true } },
        },
      }),
      prisma.customer.count(),
    ]);

    sendSuccess(res, {
      customers,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
}

export async function getDashboardStats(_req: Request, res: Response, next: NextFunction) {
  try {
    const [totalCustomers, totalOrders, totalCampaigns, totalSegments, recentCampaigns] = await Promise.all([
      prisma.customer.count(),
      prisma.order.count(),
      prisma.campaign.count(),
      prisma.segment.count(),
      prisma.campaign.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { audience: { select: { name: true } } },
      }),
    ]);

    const revenueAgg = await prisma.order.aggregate({ _sum: { orderValue: true } });

    sendSuccess(res, {
      totalCustomers,
      totalOrders,
      totalCampaigns,
      totalSegments,
      totalRevenue: revenueAgg._sum.orderValue ?? 0,
      recentCampaigns,
    });
  } catch (error) {
    next(error);
  }
}

export async function getCustomerProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = await customerRepository.getCustomerProfile(req.params.id);
    if (!profile) {
      sendError(res, "Customer not found", 404);
      return;
    }
    sendSuccess(res, profile);
  } catch (error) {
    next(error);
  }
}

export async function getCustomerMetrics(req: Request, res: Response, next: NextFunction) {
  try {
    const metrics = await customerRepository.getCustomerMetrics(req.params.id);
    sendSuccess(res, metrics);
  } catch (error) {
    next(error);
  }
}

export async function getTopCustomers(req: Request, res: Response, next: NextFunction) {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
    const customers = await customerRepository.getTopCustomers(limit);
    sendSuccess(res, customers);
  } catch (error) {
    next(error);
  }
}

