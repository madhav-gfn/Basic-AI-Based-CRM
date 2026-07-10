import { Router } from "express";
import multer from "multer";
import { importCSV, importChunk } from "../controllers/import.controller";

// ─────────────────────────────────────────────────────────────────────────────
// import.routes.ts — POST /api/import/csv and POST /api/import/chunk
// ─────────────────────────────────────────────────────────────────────────────

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    const isCSV =
      file.mimetype === "text/csv" ||
      file.mimetype === "application/vnd.ms-excel" ||
      file.originalname.toLowerCase().endsWith(".csv");
    if (isCSV) {
      cb(null, true);
    } else {
      cb(new Error("Only .csv files are accepted"));
    }
  },
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB cap
});

router.post("/csv", upload.single("file"), importCSV);
router.post("/chunk", importChunk);

export default router;
