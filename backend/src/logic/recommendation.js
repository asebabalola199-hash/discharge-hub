// Orchestrator / recommendation logic (Requirements FR-5).
//
// The system SUGGESTS a single next step. It never acts on it: every
// recommendation of kind "review" requires a clinician to open the patient
// and record a decision (see routes/reviews.js). Ported verbatim from the
// prototype's recommendation() so behaviour is identical, but it now runs
// server-side and every patient payload from the API carries its result.

/**
 * @param {object} patient serialized patient (camelCase)
 * @returns {{label:string, detail:string, icon:string, kind:'call'|'review'|'done'}}
 */
export function recommendation(patient) {
  if (patient.status === "pending") {
    return {
      label: "Start automated check-in call",
      detail: "Not yet contacted for this monitoring period.",
      icon: "📞",
      kind: "call",
    };
  }
  if (patient.unableToContact && patient.escalationLevel < 5) {
    return {
      label: "Attempt alternative contact / welfare check",
      detail: patient.assessment,
      icon: "📵",
      kind: "review",
    };
  }
  if (patient.flagged && patient.escalationLevel < 5) {
    return {
      label: "Clinical review required",
      detail: patient.assessment,
      icon: "🩺",
      kind: "review",
    };
  }
  if (patient.pipelineStage < 9) {
    return {
      label: "Continue monitoring per care plan",
      detail: "Next scheduled check-in due.",
      icon: "🗓️",
      kind: "call",
    };
  }
  return {
    label: "Pathway closed",
    detail: "Monitoring period complete.",
    icon: "✅",
    kind: "done",
  };
}
