import { Request, Response, NextFunction } from "express";
import { ensureDemoOrgSeeded } from "../services/demoSeed.service";
import { sendSuccess, sendError } from "../utils/response";

export async function seedDemo(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await ensureDemoOrgSeeded();
    sendSuccess(res, result, "Demo workspace ready");
  } catch (error) {
    sendError(res, (error as Error).message || "Could not prepare the demo workspace", 500);
  }
}
