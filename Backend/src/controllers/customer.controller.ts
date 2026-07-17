import { Request, Response, NextFunction } from "express";
import { customerRepository } from "../repositories/customer.repository";
import { prisma } from "../config/database";
import { sendSuccess, sendError } from "../utils/response";

export async function getAllCustomers(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;
    const orgFilter = req.auth?.organizationId ? { organizationId: req.auth.organizationId } : {};

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where: orgFilter,
        skip,
        take: limit,
        orderBy: { signupDate: "desc" },
        include: {
          _count: { select: { orders: true } },
        },
      }),
      prisma.customer.count({ where: orgFilter }),
    ]);

    sendSuccess(res, {
      customers,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
}

export async function getDashboardStats(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.auth?.organizationId;
    const custFilter = orgId ? { organizationId: orgId } : {};
    const campFilter = orgId ? { organizationId: orgId } : {};
    const segFilter = orgId ? { organizationId: orgId } : {};

    const [totalCustomers, totalOrders, totalCampaigns, totalSegments, recentCampaigns] = await Promise.all([
      prisma.customer.count({ where: custFilter }),
      orgId
        ? prisma.order.count({ where: { customer: { organizationId: orgId } } })
        : prisma.order.count(),
      prisma.campaign.count({ where: campFilter }),
      prisma.segment.count({ where: segFilter }),
      prisma.campaign.findMany({
        where: campFilter,
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { audience: { select: { name: true } } },
      }),
    ]);

    const revenueAgg = orgId
      ? await prisma.order.aggregate({
          where: { customer: { organizationId: orgId } },
          _sum: { orderValue: true },
        })
      : await prisma.order.aggregate({ _sum: { orderValue: true } });

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

export async function searchCustomers(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));

    const { customers, total } = await customerRepository.searchCustomers({
      q: req.query.q as string | undefined,
      city: req.query.city as string | undefined,
      gender: req.query.gender as string | undefined,
      tag: req.query.tag as string | undefined,
      page,
      limit,
    });

    sendSuccess(res, {
      customers,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
}

export async function getCustomerActivity(req: Request, res: Response, next: NextFunction) {
  try {
    const limit = req.query.limit ? Math.min(200, parseInt(req.query.limit as string)) : 50;
    const activity = await customerRepository.getCustomerActivity(req.params.id, limit);
    sendSuccess(res, activity);
  } catch (error) {
    next(error);
  }
}

