// GuardBand continuous monitoring — structured, deterministic decision
// support. Mirrors logic/riskAssessment.js's philosophy exactly: a status is
// DERIVED from structured data (observations vs. a patient's baseline,
// unresolved safety events), never guessed by an AI. Nothing here diagnoses.

import { OBSERVATION_PARAMETERS } from "../config/clinical.js";

/** Resolve the baseline range for a parameter, patient-specific if set. */
export function baselineFor(parameter, monitoringBaseline) {
  const def = OBSERVATION_PARAMETERS[parameter];
  if (!def) return null;
  const patientRange = def.baselineKey && monitoringBaseline ? monitoringBaseline[def.baselineKey] : null;
  return patientRange || def.default || null;
}

/**
 * @returns {'normal'|'watch'|'concern'} purely from comparing value to range.
 */
export function observationStatus(parameter, value, monitoringBaseline) {
  const range = baselineFor(parameter, monitoringBaseline);
  if (!range || value == null) return "normal";
  const { min, max } = range;
  if (value >= min && value <= max) return "normal";
  const span = Math.max(max - min, 1);
  const overBy = value > max ? value - max : min - value;
  return overBy > span * 0.4 ? "concern" : "watch";
}

/**
 * Combine the existing pathway status (from check-ins), the latest reading
 * per parameter, and any unresolved safety events into the single
 * PATIENT STATUS shown across the app. Returns the level plus the plain-
 * English contributing reasons, so the UI can show WHY (§6 of the brief).
 *
 * This is additive to — never a replacement for — the existing
 * deriveStatus()/pathway_status red-amber-green from riskAssessment.js.
 */
export function derivePatientStatus({ pathwayStatus, flagged, latestObservations, monitoringBaseline, unresolvedEvents }) {
  const reasons = [];

  if (unresolvedEvents && unresolvedEvents.length > 0) {
    unresolvedEvents.forEach((e) => reasons.push(e.reasonLabel || e.type));
    return { level: "active_safety_event", reasons };
  }

  let concernCount = 0;
  let watchCount = 0;
  for (const obs of latestObservations || []) {
    const status = observationStatus(obs.parameter, obs.value, monitoringBaseline);
    if (status === "concern") {
      concernCount++;
      reasons.push(`${OBSERVATION_PARAMETERS[obs.parameter]?.label || obs.parameter} outside baseline (${obs.value}${obs.unit || ""})`);
    } else if (status === "watch") {
      watchCount++;
      reasons.push(`${OBSERVATION_PARAMETERS[obs.parameter]?.label || obs.parameter} trending away from baseline (${obs.value}${obs.unit || ""})`);
    }
  }

  if (flagged || pathwayStatus === "red") reasons.push("Flagged from most recent check-in");

  if ((flagged || pathwayStatus === "red") && concernCount >= 1) return { level: "urgent_review", reasons };
  if (concernCount >= 2) return { level: "urgent_review", reasons };
  if (concernCount === 1 || (flagged && concernCount === 0)) return { level: "concern", reasons };
  if (watchCount >= 1) return { level: "watch", reasons };
  return { level: "stable", reasons: reasons.length ? reasons : ["No significant deviation from baseline."] };
}

/**
 * Merge observations, safety events, check-ins and audit entries into one
 * chronological timeline for the Monitoring tab (§8 of the brief).
 */
export function buildTimeline({ observations = [], events = [], checkIns = [] }) {
  const rows = [
    ...observations.map((o) => ({
      time: o.created_at,
      kind: "observation",
      label: `${OBSERVATION_PARAMETERS[o.parameter]?.label || o.parameter} ${o.value}${o.unit || ""}`,
    })),
    ...events.map((e) => ({
      time: e.created_at,
      kind: "event",
      label: e.label,
      status: e.status,
    })),
    ...checkIns.map((c) => ({
      time: c.created_at,
      kind: "check_in",
      label: c.no_answer ? "Check-in — no answer" : "Automated check-in completed",
    })),
  ];
  return rows.sort((a, b) => new Date(a.time) - new Date(b.time));
}
