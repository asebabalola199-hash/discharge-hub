import { Router } from "express";
import { db } from "../db.js";
import { getPatientRow, serializePatient, updatePatient, addAudit } from "../logic/store.js";
import { TRACK_SCENARIOS, REVIEWER } from "../config/clinical.js";
import { deriveStatus } from "../logic/riskAssessment.js";

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
      const attempts = patient.contactAttempts + 1;
      db.prepare(
        "INSERT INTO check_ins (patient_id, scenario_key, no_answer, status) VALUES (?, ?, 1, 'no-answer')"
      ).run(patient.id, scenarioKey);
      addAudit(patient.id, `Contact attempt ${attempts} — no answer`, "📵");

      if (attempts >= 2) {
        // Risk-based rule: notify the clinical team rather than close
        // automatically (FR-3.4, NFR-13). Still a human decision from here.
        addAudit(patient.id, "Risk-based rule triggered — clinical team notified", "🚩");
        updatePatient(patient.id, {
          contact_attempts: attempts,
          unable_to_contact: 1,
          status: "called",
          pipeline_stage: 6,
          escalation_level: 2,
          pathway_status: "amber",
          assessment:
            "No answer on 2 attempts. Risk-based rule triggered: clinical team notified rather than closed automatically.",
        });
      } else {
        updatePatient(patient.id, { contact_attempts: attempts });
      }
      return;
    }

    // Successful check-in: record the conversation + extracted signals.
    const ci = db
      .prepare("INSERT INTO check_ins (patient_id, scenario_key, no_answer, status) VALUES (?, ?, 0, 'completed')")
      .run(patient.id, scenarioKey);
    scenario.signals.forEach((s, i) =>
      db
        .prepare(
          "INSERT INTO signals (check_in_id, patient_id, label, baseline, current, severity, ord) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .run(ci.lastInsertRowid, patient.id, s[0], s[1], s[2], s[3], i)
    );

    const status = deriveStatus(scenario.signals); // <- derived, not assumed
    const flagged = scenario.flagged;

    addAudit(patient.id, "Automated check-in completed", "📞");
    addAudit(patient.id, `Patient response recorded — ${scenario.signals.length} signals extracted`, "🗣️");
    addAudit(
      patient.id,
      `Risk assessment: ${status === "red" ? "🔴 Red" : status === "amber" ? "🟠 Amber" : "🟢 Green"}${flagged ? " — alert generated" : ""}`,
      "🚩"
    );
    if (flagged) addAudit(patient.id, `${REVIEWER} notified (clinical review queue)`, "📡");
    else addAudit(patient.id, "Pathway closed — recovery on track", "🏁");

    updatePatient(patient.id, {
      status: "called",
      contact_attempts: patient.contactAttempts + 1,
      flagged: flagged ? 1 : 0,
      assessment: scenario.assessment,
      pathway_status: status,
      ehr_note_pushed: 1,
      pipeline_stage: flagged ? 6 : 9,
      escalation_level: flagged ? 2 : 0,
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
