import { Router } from "express";
import { unsubscribe, updateConsent } from "../controllers/consent.controller";

const router = Router();

// Public one-click unsubscribe (opened directly in a browser)
router.get("/unsubscribe/:token", unsubscribe);

// Programmatic consent update / re-subscribe
router.patch("/:customerId", updateConsent);

export default router;
