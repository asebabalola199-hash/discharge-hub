// GuardBand — continuous monitoring routes. Every state-changing route here
// writes to the same append-only audit_events table the rest of the app
// uses, so the existing Audit tab shows GuardBand activity for free.
//
// The safety-event response ladder (awaiting_response -> family_notified ->
// clinical_alerted) only ever advances via an explicit call to /advance —
// never automatically, and this app never contacts emergency services
// itself. That stays a human decision, exactly like every other escalation
// in this app (FR-5.3 / NFR-2).

import { Router } from "express";
import { db } from "../db.js";
import { getPatientRow, serializePatient, updatePatient, addAudit } from "../logic/store.js";
import { observationStatus, derivePatientStatus, buildTimeline } from "../logic/monitoring.js";
import { OBSERVATION_PARAMETERS, SAFETY_EVENT_TYPES, DEVICE_TYPES } from "../config/clinical.js";

const router = Router();

function getDevices(patientId) {
  return db.prepare("SELECT * FROM devices WHERE patient_id = ? ORDER BY id").all(patientId);
}
function getLatestObservations(patientId) {
  return db
    .prepare(
      `SELECT o.* FROM observations o
       INNER JOIN (SELECT parameter, MAX(id) AS max_id FROM observations WHERE patient_id = ? GROUP BY parameter) latest
         ON o.parameter = latest.parameter AND o.id = latest.max_id
       WHERE o.patient_id = ?`
    )
    .all(patientId, patientId);
}
function getUnresolvedEvents(patientId) {
  return db
    .prepare("SELECT * FROM safety_events WHERE patient_id = ? AND status != 'resolved' ORDER BY id")
    .all(patientId)
    .map((e) => ({ ...e, reasonLabel: SAFETY_EVENT_TYPES[e.type]?.label || e.type }));
}

/** Recompute + persist patient_status; audits only on an actual level change. */
function recalcPatientStatus(patientId) {
  const row = getPatientRow(patientId);
  const patient = serializePatient(row);
  const latestObservations = getLatestObservations(patientId);
  const unresolvedEvents = getUnresolvedEvents(patientId);

  const { level, reasons } = derivePatientStatus({
    pathwayStatus: patient.pathwayStatus,
    flagged: patient.flagged,
    latestObservations,
    monitoringBaseline: patient.monitoringBaseline,
    unresolvedEvents,
  });

  if (level !== patient.patientStatus) {
    updatePatient(patientId, { patient_status: level });
    const icon = { stable: "🟢", watch: "🔵", concern: "🟠", urgent_review: "🔴", active_safety_event: "🚨" }[level] || "📡";
    addAudit(patientId, `GuardBand: patient status → ${level.replace(/_/g, " ")} (${reasons[0] || "monitoring update"})`, icon);
  }
  return { level, reasons };
}

// ─── devices ────────────────────────────────────────────────────────────
router.get("/patients/:id/devices", (req, res) => {
  const row = getPatientRow(req.params.id);
  if (!row) return res.status(404).json({ error: "patient not found" });
  res.json(getDevices(req.params.id));
});

router.post("/patients/:id/devices", (req, res) => {
  const row = getPatientRow(req.params.id);
  if (!row) return res.status(404).json({ error: "patient not found" });
  const { deviceId, deviceType, name, status = "online", battery = 100, connection = "BLE" } = req.body || {};
  if (!deviceId || !DEVICE_TYPES[deviceType]) return res.status(400).json({ error: "deviceId and a valid deviceType are required" });

  db.prepare(
    "INSERT INTO devices (patient_id, device_id, device_type, name, status, battery, connection) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(req.params.id, deviceId, deviceType, name || DEVICE_TYPES[deviceType].label, status, battery, connection);
  addAudit(req.params.id, `${DEVICE_TYPES[deviceType].label} (${deviceId}) enrolled — SIMULATED`, "📡");
  res.status(201).json(getDevices(req.params.id));
});

// ─── combined monitoring summary ───────────────────────────────────────
router.get("/patients/:id/monitoring", (req, res) => {
  const row = getPatientRow(req.params.id);
  if (!row) return res.status(404).json({ error: "patient not found" });
  const patient = serializePatient(row);

  const devices = getDevices(req.params.id);
  const latestObservations = getLatestObservations(req.params.id);
  const unresolvedEvents = getUnresolvedEvents(req.params.id);
  const allEvents = db.prepare("SELECT * FROM safety_events WHERE patient_id = ? ORDER BY id").all(req.params.id)
    .map((e) => ({ ...e, label: SAFETY_EVENT_TYPES[e.type]?.label || e.type }));
  const allObservations = db.prepare("SELECT * FROM observations WHERE patient_id = ? ORDER BY id").all(req.params.id);
  const checkIns = db.prepare("SELECT * FROM check_ins WHERE patient_id = ? ORDER BY id").all(req.params.id);

  const vitals = latestObservations.map((o) => ({
    parameter: o.parameter,
    label: OBSERVATION_PARAMETERS[o.parameter]?.label || o.parameter,
    value: o.value,
    unit: o.unit,
    status: observationStatus(o.parameter, o.value, patient.monitoringBaseline),
    simulated: !!o.simulated,
    sourceType: o.source_type,
    createdAt: o.created_at,
  }));

  const { level, reasons } = derivePatientStatus({
    pathwayStatus: patient.pathwayStatus,
    flagged: patient.flagged,
    latestObservations,
    monitoringBaseline: patient.monitoringBaseline,
    unresolvedEvents,
  });

  res.json({
    devices,
    vitals,
    patientStatus: level,
    reasons,
    unresolvedEvents,
    timeline: buildTimeline({ observations: allObservations, events: allEvents, checkIns }),
  });
});

// ─── observations ───────────────────────────────────────────────────────
router.post("/patients/:id/observations", (req, res) => {
  const row = getPatientRow(req.params.id);
  if (!row) return res.status(404).json({ error: "patient not found" });
  const { parameter, value, deviceId = null, unit = null, sourceType = "SIMULATED" } = req.body || {};
  if (!OBSERVATION_PARAMETERS[parameter] || typeof value !== "number") {
    return res.status(400).json({ error: "a valid parameter and numeric value are required" });
  }
  const resolvedUnit = unit || OBSERVATION_PARAMETERS[parameter].unit;

  db.prepare(
    "INSERT INTO observations (patient_id, device_id, parameter, value, unit, source_type, simulated) VALUES (?, ?, ?, ?, ?, ?, 1)"
  ).run(req.params.id, deviceId, parameter, value, resolvedUnit, sourceType);
  if (deviceId) db.prepare("UPDATE devices SET last_sync = datetime('now') WHERE patient_id = ? AND device_id = ?").run(req.params.id, deviceId);

  const { level, reasons } = recalcPatientStatus(req.params.id);
  res.status(201).json({ patientStatus: level, reasons });
});

// ─── safety events ──────────────────────────────────────────────────────
router.post("/patients/:id/safety-events", (req, res) => {
  const row = getPatientRow(req.params.id);
  if (!row) return res.status(404).json({ error: "patient not found" });
  const { type, deviceId = null, confidence = 0.9 } = req.body || {};
  if (!SAFETY_EVENT_TYPES[type]) return res.status(400).json({ error: "a valid safety-event type is required" });

  const info = db
    .prepare("INSERT INTO safety_events (patient_id, device_id, type, status, confidence) VALUES (?, ?, ?, 'awaiting_response', ?)")
    .run(req.params.id, deviceId, type, confidence);
  addAudit(req.params.id, `GuardBand: ${SAFETY_EVENT_TYPES[type].label} — awaiting patient response (SIMULATED)`, SAFETY_EVENT_TYPES[type].icon);

  const { level, reasons } = recalcPatientStatus(req.params.id);
  const event = db.prepare("SELECT * FROM safety_events WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json({ event, patientStatus: level, reasons });
});

router.post("/patients/:id/safety-events/:eventId/advance", (req, res) => {
  const event = db.prepare("SELECT * FROM safety_events WHERE id = ? AND patient_id = ?").get(req.params.eventId, req.params.id);
  if (!event) return res.status(404).json({ error: "safety event not found" });
  if (event.status === "resolved") return res.status(400).json({ error: "event already resolved" });

  const next = event.status === "awaiting_response" ? "family_notified" : "clinical_alerted";
  db.prepare("UPDATE safety_events SET status = ? WHERE id = ?").run(next, event.id);

  const label = next === "family_notified" ? "Family notified — no patient response" : "Clinical team alerted — no response from patient or family";
  addAudit(req.params.id, `GuardBand: ${label}`, next === "family_notified" ? "👪" : "🩺");

  const { level, reasons } = recalcPatientStatus(req.params.id);
  res.json({ event: { ...event, status: next }, patientStatus: level, reasons });
});

router.post("/patients/:id/safety-events/:eventId/confirm-safe", (req, res) => {
  const event = db.prepare("SELECT * FROM safety_events WHERE id = ? AND patient_id = ?").get(req.params.eventId, req.params.id);
  if (!event) return res.status(404).json({ error: "safety event not found" });
  if (event.status === "resolved") return res.status(400).json({ error: "event already resolved" });

  db.prepare("UPDATE safety_events SET status = 'resolved', resolved_at = datetime('now') WHERE id = ?").run(event.id);
  addAudit(req.params.id, `GuardBand: patient confirmed safe — ${SAFETY_EVENT_TYPES[event.type]?.label || event.type} resolved`, "✅");
  addAudit(req.params.id, "Recovery monitoring follow-up created", "🩹");

  const { level, reasons } = recalcPatientStatus(req.params.id);
  res.json({ event: { ...event, status: "resolved" }, patientStatus: level, reasons });
});

export default router;
