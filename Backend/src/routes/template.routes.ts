import { Router } from "express";
import {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from "../controllers/template.controller";

const router = Router();

router.get("/", listTemplates);
router.post("/", createTemplate);
router.get("/:id", getTemplate);
router.patch("/:id", updateTemplate);
router.delete("/:id", deleteTemplate);

export default router;
