// Shared "apply the outcome of a check-in" logic — used by BOTH the
// scripted demo check-in (routes/checkins.js) and a real telephony call
// (routes/telephony.js). This is the single source of truth for what
// happens to a patient's state after any check-in, regardless of channel
// (NFR-22: the AI/recommendation layer is separate from — and this is
// separate again from — how the conversation itself was carried out).
//
// Neither path may advance a patient past escalation level 2 (the clinical
// review queue). Only routes/reviews.js, driven by a human form submit, can
// do that (FR-5.3 / NFR-2 — no autonomous clinical action).

import { db } from "../db.js";
import { updatePatient, addAudit } from "./store.js";
import { deriveStatus } from "./riskAssessment.js";
import { REVIEWER } from "../config/clinical.js";

/** Record a failed contact attempt; on the 2nd, notify the clinical team but never auto-close. */
export function applyNoAnswer(patient, { scenarioKey = null, mode = "scripted", callId = null } = {}) {
  const attempts = patient.contactAttempts + 1;
  db.prepare(
    "INSERT INTO check_ins (patient_id, scenario_key, no_answer, status, mode, call_id) VALUES (?, ?, 1, 'no-answer', ?, ?)"
  ).run(patient.id, scenarioKey, mode, callId);
  addAudit(patient.id, `Contact attempt ${attempts} — no answer`, "📵");

  if (attempts >= 2) {
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
  return { attempts };
}

/**
 * Record a completed check-in's structured signals, DERIVE the status from
 * them, write the audit trail, and — if flagged — move the patient into the
 * clinical review queue (escalation level 2). Never advances further than
 * that on its own.
 *
 * @param signals [[label, baseline, current, severity], ...]
 * @param assessment AI-assisted narrative to show alongside the signals
 * @param flagged whether this check-in requires clinical review
 */
export function applyCompletedCheckIn(patient, { scenarioKey = null, mode = "scripted", callId = null, signals, assessment, flagged }) {
  const ci = db
    .prepare(
      "INSERT INTO check_ins (patient_id, scenario_key, no_answer, status, mode, call_id) VALUES (?, ?, 0, 'completed', ?, ?)"
    )
    .run(patient.id, scenarioKey, mode, callId);

  signals.forEach((s, i) =>
    db
      .prepare(
        "INSERT INTO signals (check_in_id, patient_id, label, baseline, current, severity, ord) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .run(ci.lastInsertRowid, patient.id, s[0], s[1], s[2], s[3], i)
  );

  const status = deriveStatus(signals); // <- derived, not assumed

  addAudit(patient.id, mode === "live_call" ? "Automated check-in call completed" : "Automated check-in completed", "📞");
  addAudit(patient.id, `Patient response recorded — ${signals.length} signals extracted`, "🗣️");
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
    assessment,
    pathway_status: status,
    ehr_note_pushed: 1,
    pipeline_stage: flagged ? 6 : 9,
    escalation_level: flagged ? 2 : 0,
  });

  return { status, checkInId: ci.lastInsertRowid };
}
