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

    const result = await campaignService.draftAICampaign(
      name,
      objective,
      audienceId,
      req.auth?.organizationId
    );
    sendSuccess(res, result, "Campaign draft created successfully", 201);
  } catch (error) {
    next(error);
  }
}

export async function getCampaigns(req: Request, res: Response, next: NextFunction) {
  try {
    const campaigns = await campaignService.getCampaigns(req.auth?.organizationId);
    sendSuccess(res, campaigns);
  } catch (error) {
    next(error);
  }
}

export async function getCampaignById(req: Request, res: Response, next: NextFunction) {
  try {
    const campaign = await campaignService.getCampaignById(
      req.params.id,
      req.auth?.organizationId
    );
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

// ── A/B Variant Endpoints ──────────────────────────────────────────────────

export async function addVariant(req: Request, res: Response, next: NextFunction) {
  try {
    const { label, message, weight } = req.body as {
      label?: string;
      message?: string;
      weight?: number;
    };

    if (!label || !message) {
      sendError(res, "label and message are required", 400);
      return;
    }

    const variant = await campaignService.addVariant(req.params.id, { label, message, weight });
    sendSuccess(res, variant, "Variant created", 201);
  } catch (error) {
    next(error);
  }
}

export async function getVariants(req: Request, res: Response, next: NextFunction) {
  try {
    const variants = await campaignService.getVariants(req.params.id);
    sendSuccess(res, variants);
  } catch (error) {
    next(error);
  }
}

export async function deleteVariant(req: Request, res: Response, next: NextFunction) {
  try {
    await campaignService.deleteVariant(req.params.variantId);
    sendSuccess(res, null, "Variant deleted");
  } catch (error) {
    next(error);
  }
}
