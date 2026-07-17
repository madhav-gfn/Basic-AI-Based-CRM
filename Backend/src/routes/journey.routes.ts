import { Router } from "express";
import {
  createJourney,
  listJourneys,
  getJourney,
  updateJourneyStatus,
  addJourneyStep,
  removeJourneyStep,
  getJourneyEnrollments,
} from "../controllers/journey.controller";

const router = Router();

router.post("/", createJourney);
router.get("/", listJourneys);
router.get("/:id", getJourney);
router.patch("/:id/status", updateJourneyStatus);
router.post("/:id/steps", addJourneyStep);
router.delete("/:id/steps/:stepId", removeJourneyStep);
router.get("/:id/enrollments", getJourneyEnrollments);

export default router;
