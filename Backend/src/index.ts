import "dotenv/config";
import express from "express";
import cors from "cors";
import ingestionRouter from "./routes/ingestion.routes";
import customerRouter from "./routes/customer.routes";
import segmentRouter from "./routes/segment.routes";
import aiRouter from "./routes/ai.routes";
import campaignRouter from "./routes/campaign.routes";
import importRouter from "./routes/import.routes";
import consentRouter from "./routes/consent.routes";
import templateRouter from "./routes/template.routes";
import authRouter from "./routes/auth.routes";
import webhookRouter from "./controllers/webhook.controller";
import { errorHandler } from "./middleware/errorHandler";
import { optionalAuth } from "./middleware/auth";
import { initCron } from "./cron/campaign.cron";

const app = express();
const PORT = process.env.PORT ?? 3001;
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
const GROQ_MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : [];

app.use(
  cors(
    allowedOrigins.length > 0
      ? { origin: allowedOrigins, credentials: true }
      : undefined // allow all in dev when ALLOWED_ORIGINS is not set
  )
);
app.use(express.json());

// Attach org/user context when a Bearer token is present. Never blocks —
// endpoints remain publicly reachable, but can scope by organization when
// the caller is authenticated.
app.use(optionalAuth);

// ── Auth ────────────────────────────────────────────────────────────────
app.use("/api/auth", authRouter);

// ── Existing Xeno CRM routes ────────────────────────────────────────────
app.use("/api/ingestion", ingestionRouter);
app.use("/api/customers", customerRouter);
app.use("/api/segments", segmentRouter);
app.use("/api/ai", aiRouter);
app.use("/api/campaigns", campaignRouter);
app.use("/api/consent", consentRouter);
app.use("/api/templates", templateRouter);
app.use("/api/webhooks", webhookRouter);

// ── AI CSV Import route ─────────────────────────────────────────────────
app.use("/api/import", importRouter);

app.use(errorHandler);

initCron();

app.listen(PORT, () => {
  console.log(`[CRM Backend] Running on port ${PORT}`);
  console.log(`[CRM Backend] Gemini model: ${GEMINI_MODEL}`);
  console.log(`[CRM Backend] Groq model: ${GROQ_MODEL}`);
});
