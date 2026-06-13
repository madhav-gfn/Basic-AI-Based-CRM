import { Router } from "express";
import { suggestSegment } from "../controllers/ai.controller";

const router = Router();

// POST /api/ai/segment-suggest
router.post("/segment-suggest", suggestSegment);

export default router;
