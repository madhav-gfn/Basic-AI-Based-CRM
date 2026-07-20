import { Router } from "express";
import {
  draftCampaign,
  getCampaigns,
  getCampaignById,
  updateCampaignStatus,
  addVariant,
  getVariants,
  deleteVariant,
} from "../controllers/campaign.controller";
import { AnalyticsController } from "../controllers/analytics.controller";
import { requireAuth } from "../middleware/auth";

const router = Router();

// Campaigns are org-private: every route below requires a valid session so
// campaign.service's organizationId scoping is always enforced (not optional).
router.use(requireAuth);

// POST /api/campaigns/draft
router.post("/draft", draftCampaign);

// GET /api/campaigns
router.get("/", getCampaigns);

// GET /api/campaigns/:id/analytics
router.get("/:id/analytics", AnalyticsController.getAnalytics);

// ── A/B Variants ─────────────────────────────────────────────────────────────
router.post("/:id/variants", addVariant);
router.get("/:id/variants", getVariants);
router.delete("/:id/variants/:variantId", deleteVariant);

// GET /api/campaigns/:id
router.get("/:id", getCampaignById);

// PATCH /api/campaigns/:id/status
router.patch("/:id/status", updateCampaignStatus);

export default router;
