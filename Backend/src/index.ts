import "dotenv/config";
import express from "express";
import cors from "cors";
import ingestionRouter from "./routes/ingestion.routes";
import customerRouter from "./routes/customer.routes";
import segmentRouter from "./routes/segment.routes";
import aiRouter from "./routes/ai.routes";
import campaignRouter from "./routes/campaign.routes";
import webhookRouter from "./controllers/webhook.controller";
import { errorHandler } from "./middleware/errorHandler";
import { initCron } from "./cron/campaign.cron";

const app = express();
const PORT = process.env.PORT ?? 3001;
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

app.use(cors());
app.use(express.json());

app.use("/api/ingestion", ingestionRouter);
app.use("/api/customers", customerRouter);
app.use("/api/segments", segmentRouter);
app.use("/api/ai", aiRouter);
app.use("/api/campaigns", campaignRouter);
app.use("/api/webhooks", webhookRouter);

app.use(errorHandler);

initCron();

app.listen(PORT, () => {
  console.log(`[CRM Backend] Running on port ${PORT}`);
  console.log(`[CRM Backend] Gemini model configured: ${GEMINI_MODEL}`);
});
