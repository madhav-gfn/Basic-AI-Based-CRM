import { Request, Response, NextFunction } from "express";
import { journeyService } from "../services/journey.service";
import { sendSuccess, sendError } from "../utils/response";

export async function createJourney(req: Request, res: Response, next: NextFunction) {
  try {
    const journey = await journeyService.createJourney(req.body, req.auth?.organizationId);
    sendSuccess(res, journey, "Journey created", 201);
  } catch (error) {
    next(error);
  }
}

export async function listJourneys(req: Request, res: Response, next: NextFunction) {
  try {
    const journeys = await journeyService.listJourneys(req.auth?.organizationId);
    sendSuccess(res, journeys);
  } catch (error) {
    next(error);
  }
}

export async function getJourney(req: Request, res: Response, next: NextFunction) {
  try {
    const journey = await journeyService.getJourneyById(req.params.id, req.auth?.organizationId);
    sendSuccess(res, journey);
  } catch (error) {
    next(error);
  }
}

export async function updateJourneyStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { status } = req.body as { status: string };
    if (!status) {
      sendError(res, "status is required", 400);
      return;
    }
    const journey = await journeyService.updateStatus(req.params.id, status, req.auth?.organizationId);
    sendSuccess(res, journey, "Journey status updated");
  } catch (error) {
    next(error);
  }
}

export async function addJourneyStep(req: Request, res: Response, next: NextFunction) {
  try {
    const step = await journeyService.addStep(req.params.id, req.body);
    sendSuccess(res, step, "Step added", 201);
  } catch (error) {
    next(error);
  }
}

export async function removeJourneyStep(req: Request, res: Response, next: NextFunction) {
  try {
    await journeyService.removeStep(req.params.id, req.params.stepId);
    sendSuccess(res, { id: req.params.stepId }, "Step removed");
  } catch (error) {
    next(error);
  }
}

export async function getJourneyEnrollments(req: Request, res: Response, next: NextFunction) {
  try {
    const limit = req.query.limit ? Math.min(500, parseInt(req.query.limit as string)) : 100;
    const enrollments = await journeyService.getEnrollments(req.params.id, limit);
    sendSuccess(res, enrollments);
  } catch (error) {
    next(error);
  }
}
