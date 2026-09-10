import { Router } from "express";
import { db } from "../db.js";
import { getPatientRow, serializePatient, updatePatient, addAudit, nowDateTime } from "../logic/store.js";
import { DECISION_LABELS, URGENCY_LABELS, REVIEWER } from "../config/clinical.js";

const router = Router();

// POST /api/patients/:id/clinical-review — a nurse records a clinical
// decision (FR-6.2, FR-6.3, FR-6.5). This is the human action that the
// system can never take on its own.
router.post("/:id/clinical-review", (req, res) => {
  const row = getPatientRow(req.params.id);
  if (!row) return res.status(404).json({ error: "patient not found" });

  const { decision, destination, urgency, note } = req.body || {};
  const decisionLabel = DECISION_LABELS[decision];
  if (!decisionLabel) return res.status(400).json({ error: "Unknown clinical decision" });

  const isMedical = decision === "medical";
  const destText = isMedical ? destination || "Medical Team" : null;
  const urgText = isMedical ? URGENCY_LABELS[urgency] || "Routine" : null;
  const when = nowDateTime();

  db.transaction(() => {
    addAudit(
      row.id,
      `${REVIEWER} reviewed alert — decision: ${decisionLabel}${destText ? ` → ${destText} (${urgText})` : ""}`,
      "🩺"
    );
    db.prepare(
      `INSERT INTO clinical_reviews
        (patient_id, decision_key, decision_label, destination, urgency, note, by_name, decision_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(row.id, decision, decisionLabel, destText, urgText, note || "", REVIEWER, when);

    updatePatient(row.id, { escalation_level: 4, pipeline_stage: 7 });
  })();

  res.json({ patient: serializePatient(getPatientRow(row.id), { withAudit: true }) });
});

// POST /api/patients/:id/clinical-review/outcome — the outcome of that
// decision, recorded once known and separately from the decision (FR-6.4).
router.post("/:id/clinical-review/outcome", (req, res) => {
  const row = getPatientRow(req.params.id);
  if (!row) return res.status(404).json({ error: "patient not found" });

  const { outcome } = req.body || {};
  if (!outcome) return res.status(400).json({ error: "An outcome is required" });

  const review = db
    .prepare("SELECT * FROM clinical_reviews WHERE patient_id = ? ORDER BY id DESC LIMIT 1")
    .get(row.id);
  if (!review) return res.status(400).json({ error: "No clinical review to attach an outcome to" });
  if (review.outcome) return res.status(409).json({ error: "An outcome has already been recorded" });

  const when = nowDateTime();
  db.transaction(() => {
    addAudit(row.id, `${REVIEWER} recorded outcome: ${outcome}`, "✅");
    db.prepare("UPDATE clinical_reviews SET outcome = ?, outcome_time = ? WHERE id = ?").run(outcome, when, review.id);
    updatePatient(row.id, {
      escalation_level: 5,
      pipeline_stage: outcome === "Resolved" ? 9 : 8,
      ...(outcome === "Resolved" || outcome === "Monitoring continues" ? { pathway_status: "green" } : {}),
    });
  })();

  res.json({ patient: serializePatient(getPatientRow(row.id), { withAudit: true }) });
});

export default router;
