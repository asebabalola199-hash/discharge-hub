// Structured risk assessment (Requirements FR-4).
//
// The overall pathway status is DERIVED from the structured signal severities
// of a check-in — it is never inferred from the patient's baseline risk tier.
// This is the "core fix" the prototype was built around and it lives here, in
// the backend, as the single source of truth.

/**
 * @param {Array<[string,string,string,string]>} signals rows of
 *        [label, baseline, current, severity] where severity is one of
 *        'red' | 'amber' | 'green' | 'grey'.
 * @returns {'red'|'amber'|'green'}
 */
export function deriveStatus(signals) {
  if (signals.some((s) => s[3] === "red")) return "red";
  if (signals.some((s) => s[3] === "amber")) return "amber";
  return "green";
}

/**
 * Resolve a scripted check-in into its structured assessment.
 * Returns the signal rows, the derived status, whether it is flagged for
 * clinical review, and the AI-assisted narrative.
 */
export function assessCheckIn(scenario) {
  const status = deriveStatus(scenario.signals);
  return {
    signals: scenario.signals,
    status,
    flagged: scenario.flagged,
    assessment: scenario.assessment,
  };
}
