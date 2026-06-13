import { Request, Response, NextFunction } from "express";
import { campaignService } from "../services/campaign.service";
import { sendSuccess, sendError } from "../utils/response";

export async function draftCampaign(req: Request, res: Response, next: NextFunction) {
  try {
    const { name, objective, audienceId } = req.body as {
      name: string;
      objective: string;
      audienceId: string;
    };

    if (!name || !objective || !audienceId) {
      sendError(res, "name, objective, and audienceId are required", 400);
      return;
    }

    const result = await campaignService.draftAICampaign(name, objective, audienceId);
    sendSuccess(res, result, "Campaign draft created successfully", 201);
  } catch (error) {
    next(error);
  }
}

export async function getCampaigns(req: Request, res: Response, next: NextFunction) {
  try {
    const campaigns = await campaignService.getCampaigns();
    sendSuccess(res, campaigns);
  } catch (error) {
    next(error);
  }
}

export async function getCampaignById(req: Request, res: Response, next: NextFunction) {
  try {
    const campaign = await campaignService.getCampaignById(req.params.id);
    sendSuccess(res, campaign);
  } catch (error) {
    next(error);
  }
}

export async function updateCampaignStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, scheduledAt } = req.body as {
      status: string;
      scheduledAt?: string | null;
    };

    if (!status) {
      sendError(res, "status is required", 400);
      return;
    }

    const campaign = await campaignService.updateCampaignStatus(
      req.params.id,
      status,
      scheduledAt
    );
    sendSuccess(res, campaign, "Campaign status updated");
  } catch (error) {
    next(error);
  }
}
