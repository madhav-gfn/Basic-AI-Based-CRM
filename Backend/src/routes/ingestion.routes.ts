import { Router } from "express";
import multer from "multer";
import {
  uploadCustomers,
  uploadOrders,
} from "../controllers/ingestion.controller";

const router = Router();

// Memory storage — file lives in req.file.buffer, never touches disk
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
      cb(null, true);
    } else {
      cb(new Error("Only .csv files are accepted"));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB cap
});

router.post("/upload/customers", upload.single("file"), uploadCustomers);

router.post("/upload/orders", upload.single("file"), uploadOrders);

export default router;
