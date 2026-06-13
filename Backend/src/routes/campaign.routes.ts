import { Router } from "express";
import {
  draftCampaign,
  getCampaigns,
  getCampaignById,
  updateCampaignStatus,
} from "../controllers/campaign.controller";

const router = Router();

// POST /api/campaigns/draft
router.post("/draft", draftCampaign);

// GET /api/campaigns
router.get("/", getCampaigns);

// GET /api/campaigns/:id
router.get("/:id", getCampaignById);

// PATCH /api/campaigns/:id/status
router.patch("/:id/status", updateCampaignStatus);

export default router;
