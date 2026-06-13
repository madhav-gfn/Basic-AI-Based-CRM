import { Request, Response, NextFunction } from "express";
import { sendError } from "../utils/response";

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  console.error("[ERROR]", err.message);
  console.error(err.stack);

  if (err.message.includes("GEMINI_API_KEY")) {
    sendError(res, "AI service configuration error", 500, "GEMINI_API_KEY not configured");
    return;
  }

  if (err.message.includes("API key not valid")) {
    sendError(res, "Invalid API key for AI service", 500, "Check GEMINI_API_KEY in .env");
    return;
  }

  if (err.message.includes("Customer not found")) {
    sendError(res, err.message, 404);
    return;
  }

  sendError(res, "Internal server error", 500, err.message);
}
