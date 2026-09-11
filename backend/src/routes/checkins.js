import { Router } from "express";
import { db } from "../db.js";
import { getPatientRow, serializePatient } from "../logic/store.js";
import { TRACK_SCENARIOS } from "../config/clinical.js";
import { deriveStatus } from "../logic/riskAssessment.js";
import { applyNoAnswer, applyCompletedCheckIn } from "../logic/checkinResult.js";

const router = Router();

function resolveScenario(patient) {
  const noAnswer = patient.unableToContact && patient.status === "called";
  const scenarioKey = patient.lastScenario || "clear";
  const scenario = TRACK_SCENARIOS[patient.track]?.[scenarioKey];
  return { noAnswer, scenarioKey, scenario };
}

function firstName(name) {
  return String(name).split(" ")[0];
}

// GET /api/patients/:id/check-in — the scripted conversation for this
// patient's next check-in. Read-only: nothing is persisted until POST.
router.get("/:id/check-in", (req, res) => {
  const row = getPatientRow(req.params.id);
  if (!row) return res.status(404).json({ error: "patient not found" });
  const patient = serializePatient(row);
  const { noAnswer, scenarioKey, scenario } = resolveScenario(patient);
  if (!scenario) return res.status(400).json({ error: "no scenario configured for this track" });

  res.json({
    noAnswer,
    scenarioKey,
    contactAttempt: patient.contactAttempts + 1,
    script: noAnswer
      ? []
      : scenario.script.map((l) => ({ ...l, text: l.text.replace("{name}", firstName(patient.name)) })),
  });
});

// POST /api/patients/:id/check-in — perform the check-in (FR-3, FR-4).
// Extracts structured signals, DERIVES the Red/Amber/Green status from them,
// writes the audit trail, and — if flagged — moves the patient into the
// clinical review queue (escalation level 2). It never advances past that:
// a human must record the clinical decision (routes/reviews.js).
router.post("/:id/check-in", (req, res) => {
  const row = getPatientRow(req.params.id);
  if (!row) return res.status(404).json({ error: "patient not found" });
  const patient = serializePatient(row);
  const { noAnswer, scenarioKey, scenario } = resolveScenario(patient);
  if (!scenario) return res.status(400).json({ error: "no scenario configured for this track" });

  const tx = db.transaction(() => {
    if (noAnswer) {
      applyNoAnswer(patient, { scenarioKey, mode: "scripted" });
      return;
    }
    applyCompletedCheckIn(patient, {
      scenarioKey,
      mode: "scripted",
      signals: scenario.signals,
      assessment: scenario.assessment,
      flagged: scenario.flagged,
    });
  });
  tx();

  const updated = serializePatient(getPatientRow(patient.id), { withAudit: true });
  res.json({
    patient: updated,
    noAnswer,
    extracted: noAnswer
      ? null
      : { signals: scenario.signals, status: deriveStatus(scenario.signals), flagged: scenario.flagged },
  });
});

export default router;
