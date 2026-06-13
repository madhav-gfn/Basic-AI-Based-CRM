import { Router } from "express";
import { getAllSegments, evaluateSegment, createSegment } from "../controllers/segment.controller";

const router = Router();

router.get("/", getAllSegments);

router.post("/evaluate", evaluateSegment);

router.post("/", createSegment);

export default router;
