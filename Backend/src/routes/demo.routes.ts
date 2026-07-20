import { Router } from "express";
import { seedDemo } from "../controllers/demo.controller";

const router = Router();

router.post("/seed", seedDemo);

export default router;
