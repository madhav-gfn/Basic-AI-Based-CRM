import "dotenv/config";
import express from "express";
import cors from "cors";
import ingestionRouter from "./routes/ingestion.routes";
import customerRouter from "./routes/customer.routes";
import segmentRouter from "./routes/segment.routes";
import aiRouter from "./routes/ai.routes";
import campaignRouter from "./routes/campaign.routes";
import { errorHandler } from "./middleware/errorHandler";

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors());
app.use(express.json());

app.use("/api/ingestion", ingestionRouter);
app.use("/api/customers", customerRouter);
app.use("/api/segments", segmentRouter);
app.use("/api/ai", aiRouter);
app.use("/api/campaigns", campaignRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
