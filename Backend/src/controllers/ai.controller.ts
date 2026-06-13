import { Request, Response, NextFunction } from "express";
import { aiService } from "../services/AI.service";
import { segmentService } from "../services/segment.service";
import { sendSuccess, sendError } from "../utils/response";

export async function suggestSegment(req: Request, res: Response, next: NextFunction) {
  try {
    const { prompt } = req.body as { prompt: string };

    if (!prompt?.trim()) {
      sendError(res, "prompt is required", 400);
      return;
    }

    const { filters, explanation } = await aiService.generateSegmentFilters(prompt);
    const { count } = await segmentService.evaluateSegment(filters);

    sendSuccess(res, { filters, explanation, audienceCount: count });
  } catch (error) {
    next(error);
  }
}
