import { Router } from "express";
import { db } from "../db.js";
import { REVIEWER } from "../config/clinical.js";
import { nowDate } from "../logic/store.js";

const router = Router();

function serializePathway(row) {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    createdBy: row.created_by,
    owner: row.owner,
    lastReviewed: row.last_reviewed,
    config: JSON.parse(row.config || "{}"),
  };
}

const list = () => db.prepare("SELECT * FROM pathways ORDER BY id").all().map(serializePathway);
const getOne = (id) => db.prepare("SELECT * FROM pathways WHERE id = ?").get(id);

// GET /api/pathways
router.get("/", (_req, res) => res.json(list()));

// POST /api/pathways — new pathways default to Draft and cannot be used for
// monitoring until approved (FR-2.2, FR-2.3).
router.post("/", (req, res) => {
  const { name, config } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: "Pathway name is required" });
  const info = db
    .prepare(
      "INSERT INTO pathways (name, status, created_by, owner, last_reviewed, config) VALUES (?, 'draft', ?, '—', '—', ?)"
    )
    .run(String(name).trim(), REVIEWER, JSON.stringify(config || {}));
  res.status(201).json(serializePathway(getOne(info.lastInsertRowid)));
});

// POST /api/pathways/:id/submit — Draft -> Pending Clinical Approval (FR-2.4)
router.post("/:id/submit", (req, res) => {
  const row = getOne(req.params.id);
  if (!row) return res.status(404).json({ error: "pathway not found" });
  if (row.status !== "draft") return res.status(409).json({ error: "Only a draft can be submitted for approval" });
  db.prepare("UPDATE pathways SET status = 'pending_approval' WHERE id = ?").run(row.id);
  res.json(serializePathway(getOne(row.id)));
});

// POST /api/pathways/:id/approve — Pending -> Published (FR-2.5)
router.post("/:id/approve", (req, res) => {
  const row = getOne(req.params.id);
  if (!row) return res.status(404).json({ error: "pathway not found" });
  if (row.status !== "pending_approval") {
    return res.status(409).json({ error: "Only a pathway pending approval can be published" });
  }
  db.prepare("UPDATE pathways SET status = 'published', owner = ?, last_reviewed = ? WHERE id = ?").run(
    "Dr Ahmed",
    nowDate(),
    row.id
  );
  res.json(serializePathway(getOne(row.id)));
});

export default router;
