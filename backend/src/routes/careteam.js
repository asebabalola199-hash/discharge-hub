import { Router } from "express";
import { db } from "../db.js";

const router = Router();

// GET /api/care-team — directory per ward (FR-9.1)
router.get("/", (_req, res) => {
  const rows = db.prepare("SELECT * FROM care_team ORDER BY ward").all();
  const byWard = {};
  for (const r of rows) byWard[r.ward] = { nurse: r.nurse, medical: r.medical, community: r.community };
  res.json(byWard);
});

export default router;
