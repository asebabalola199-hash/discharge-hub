// Shared persistence helpers + the patient serializer used by every route.

import { db } from "../db.js";
import { recommendation } from "./recommendation.js";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Timestamp label in the prototype's style, e.g. "13 Aug 2026 · 14:32". */
export function nowDateTime(d = new Date()) {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()} · ${hh}:${mm}`;
}

/** Date-only label, e.g. "13 Aug 2026". */
export function nowDate(d = new Date()) {
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function getPatientRow(id) {
  return db.prepare("SELECT * FROM patients WHERE id = ?").get(id);
}

export function updatePatient(id, patch) {
  const keys = Object.keys(patch);
  if (!keys.length) return;
  const set = keys.map((k) => `${k} = @${k}`).join(", ");
  db.prepare(`UPDATE patients SET ${set} WHERE id = @id`).run({ ...patch, id });
}

export function addAudit(patientId, label, icon) {
  db.prepare(
    "INSERT INTO audit_events (patient_id, time_label, label, icon) VALUES (?, ?, ?, ?)"
  ).run(patientId, nowDateTime(), label, icon);
}

export function nextDemoId() {
  const { n } = db.prepare("SELECT COUNT(*) AS n FROM patients").get();
  return `DEMO-${String(n + 1).padStart(3, "0")}`;
}

/**
 * Convert a patients row into the camelCase shape the frontend expects
 * (matching the prototype's patient object), attaching the derived
 * recommendation and, optionally, the full audit trail.
 */
export function serializePatient(row, { withAudit = false } = {}) {
  const latestCheckIn = db
    .prepare("SELECT id FROM check_ins WHERE patient_id = ? ORDER BY id DESC LIMIT 1")
    .get(row.id);

  let signals = [];
  if (latestCheckIn) {
    signals = db
      .prepare("SELECT label, baseline, current, severity FROM signals WHERE check_in_id = ? ORDER BY ord")
      .all(latestCheckIn.id)
      .map((s) => [s.label, s.baseline, s.current, s.severity]);
  }

  const review = db
    .prepare("SELECT * FROM clinical_reviews WHERE patient_id = ? ORDER BY id DESC LIMIT 1")
    .get(row.id);

  const patient = {
    id: row.id,
    demoId: row.demo_id,
    name: row.name,
    age: row.age,
    ward: row.ward,
    track: row.track,
    condition: row.condition,
    discharged: row.discharged,
    duration: row.duration,
    baselineRisk: row.baseline_risk,
    baselineReasons: JSON.parse(row.baseline_reasons || "[]"),
    status: row.status,
    contactAttempts: row.contact_attempts,
    unableToContact: !!row.unable_to_contact,
    ehrSynced: !!row.ehr_synced,
    ehrNotePushed: !!row.ehr_note_pushed,
    flagged: !!row.flagged,
    pipelineStage: row.pipeline_stage,
    escalationLevel: row.escalation_level,
    pathwayStatus: row.pathway_status,
    lastScenario: row.last_scenario,
    comms: JSON.parse(row.comms || '{"method":"","language":"","accessibility":[]}'),
    assessment: row.assessment,
    signals,
    clinicalReview: review
      ? {
          decisionKey: review.decision_key,
          decisionLabel: review.decision_label,
          destination: review.destination,
          urgency: review.urgency,
          note: review.note,
          by: review.by_name,
          decisionTime: review.decision_time,
          outcome: review.outcome,
          outcomeTime: review.outcome_time,
        }
      : null,
  };

  patient.recommendation = recommendation(patient);

  if (withAudit) {
    patient.audit = db
      .prepare("SELECT time_label AS time, label, icon FROM audit_events WHERE patient_id = ? ORDER BY id")
      .all(row.id);
  }

  return patient;
}

export function listPatients() {
  return db
    .prepare("SELECT * FROM patients ORDER BY id")
    .all()
    .map((row) => serializePatient(row));
}
