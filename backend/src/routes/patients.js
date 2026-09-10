import { Router } from "express";
import { db } from "../db.js";
import {
  listPatients, serializePatient, getPatientRow, addAudit, nextDemoId, nowDateTime,
} from "../logic/store.js";
import { EHR_DEMO_SUMMARY, TRACKS } from "../config/clinical.js";

const router = Router();

// GET /api/patients — list, each with its derived recommendation + status
router.get("/", (_req, res) => {
  res.json(listPatients());
});

// GET /api/patients/:id — full record incl. audit trail + clinical review
router.get("/:id", (req, res) => {
  const row = getPatientRow(req.params.id);
  if (!row) return res.status(404).json({ error: "patient not found" });
  res.json(serializePatient(row, { withAudit: true }));
});

// POST /api/patients — create a care plan manually (FR-1.1, FR-1.3–1.5)
router.post("/", (req, res) => {
  const f = req.body || {};
  if (!f.name || !String(f.name).trim()) {
    return res.status(400).json({ error: "Patient name is required" });
  }
  const track = TRACKS[f.track] ? f.track : "acute";

  const info = db
    .prepare(
      `INSERT INTO patients
        (demo_id, name, age, ward, track, condition, discharged, duration, baseline_risk,
         baseline_reasons, status, contact_attempts, unable_to_contact, ehr_synced, ehr_note_pushed,
         flagged, pipeline_stage, escalation_level, pathway_status, last_scenario, comms)
       VALUES
        (@demo_id, @name, @age, @ward, @track, @condition, @discharged, @duration, 'Medium',
         @baseline_reasons, 'pending', 0, 0, 0, 0, 0, 2, 0, 'grey', 'clear', @comms)`
    )
    .run({
      demo_id: nextDemoId(),
      name: String(f.name).trim(),
      age: f.age ? Number(f.age) : null,
      ward: f.ward || "—",
      track,
      condition: f.condition || "Not specified",
      discharged: nowDateTime(),
      duration: f.duration || "72h",
      baseline_reasons: JSON.stringify(["New discharge — baseline not yet fully assessed"]),
      comms: JSON.stringify({
        method: f.method || "Automated voice call",
        language: f.language || "English",
        accessibility: Array.isArray(f.accessibility) ? f.accessibility : [],
      }),
    });

  addAudit(info.lastInsertRowid, "Care plan created", "📄");
  res.status(201).json(serializePatient(getPatientRow(info.lastInsertRowid), { withAudit: true }));
});

// POST /api/patients/sync-ehr — create from a simulated TrakCare discharge
// summary (FR-1.2). Clearly a demo/simulated connection (FR-8.3).
router.post("/sync-ehr", (_req, res) => {
  const d = EHR_DEMO_SUMMARY;
  const info = db
    .prepare(
      `INSERT INTO patients
        (demo_id, name, age, ward, track, condition, discharged, duration, baseline_risk,
         baseline_reasons, status, contact_attempts, unable_to_contact, ehr_synced, ehr_note_pushed,
         flagged, pipeline_stage, escalation_level, pathway_status, last_scenario, comms)
       VALUES
        (@demo_id, @name, @age, @ward, @track, @condition, @discharged, @duration, 'Medium',
         @baseline_reasons, 'pending', 0, 0, 1, 0, 0, 2, 0, 'grey', 'clear', @comms)`
    )
    .run({
      demo_id: nextDemoId(),
      name: d.name,
      age: d.age,
      ward: d.ward,
      track: d.track,
      condition: d.condition,
      discharged: nowDateTime(),
      duration: d.duration,
      baseline_reasons: JSON.stringify(["Synced from EHR — baseline not yet fully assessed"]),
      comms: JSON.stringify({ method: d.method, language: d.language, accessibility: d.accessibility }),
    });

  addAudit(info.lastInsertRowid, "Discharge summary synced from TrakCare; care plan created", "📄");
  res.status(201).json(serializePatient(getPatientRow(info.lastInsertRowid), { withAudit: true }));
});

export default router;
