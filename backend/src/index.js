import "dotenv/config";
import express from "express";
import cors from "cors";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";

import { migrate } from "./db.js";
import { ensureSeed } from "./seed.js";
import configRoutes from "./routes/config.js";
import patientsRoutes from "./routes/patients.js";
import checkinRoutes from "./routes/checkins.js";
import reviewRoutes from "./routes/reviews.js";
import pathwaysRoutes from "./routes/pathways.js";
import careTeamRoutes from "./routes/careteam.js";
import analyticsRoutes from "./routes/analytics.js";
import telephonyRoutes from "./routes/telephony.js";
import monitoringRoutes from "./routes/monitoring.js";

const here = dirname(fileURLToPath(import.meta.url));

migrate();
ensureSeed(); // seeds only when the DB is empty

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false })); // Twilio webhooks post form-encoded bodies

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/config", configRoutes);
app.use("/api/patients", patientsRoutes);
app.use("/api/patients", checkinRoutes);
app.use("/api/patients", reviewRoutes);
app.use("/api/pathways", pathwaysRoutes);
app.use("/api/care-team", careTeamRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api", telephonyRoutes); // /api/patients/:id/call + /api/telephony/* webhooks
app.use("/api", monitoringRoutes); // GuardBand: /api/patients/:id/monitoring, /devices, /observations, /safety-events

// In production the built frontend is served from backend/public.
const publicDir = join(here, "..", "public");
if (existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    res.sendFile(join(publicDir, "index.html"), (err) => err && next());
  });
}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Internal error" });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`The Discharge Hub API listening on :${PORT}`));
