import { Request, Response, NextFunction } from "express";
import { segmentService, SegmentFilters } from "../services/segment.service";
import { sendSuccess, sendError } from "../utils/response";
import { prisma } from "../config/database";

export async function getAllSegments(req: Request, res: Response, next: NextFunction) {
  try {
    const orgId = req.auth?.organizationId;
    const segments = await prisma.segment.findMany({
      where: orgId ? { organizationId: orgId } : {},
      orderBy: { createdAt: "desc" },
    });
    sendSuccess(res, segments);
  } catch (error) {
    next(error);
  }
}

export async function evaluateSegment(req: Request, res: Response, next: NextFunction) {
  try {
    const filters: SegmentFilters = req.body;
    const result = await segmentService.evaluateSegment(filters);
    sendSuccess(res, result);
  } catch (error) {
    next(error);
  }
}

export async function createSegment(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, filters, createdBy } = req.body as {
      name: string;
      filters: SegmentFilters;
      createdBy: string;
    };

    if (!name || !filters) {
      sendError(res, "name and filters are required", 400);
      return;
    }

    const result = await segmentService.evaluateAndSave(
      name,
      filters,
      createdBy ?? req.auth?.email ?? "admin",
      req.auth?.organizationId
    );

    sendSuccess(res, result, "Segment created successfully", 201);
  } catch (error) {
    next(error);
  }
}
