import { Router } from "express";
import {
  TRACKS, DURATION_OPTIONS, PIPELINE, ESCALATION_LEVELS, CLINICAL_DECISIONS,
  ESCALATION_DESTINATIONS, URGENCY_LEVELS, OUTCOME_OPTIONS, CHECKPOINTS,
  PATHWAY_QUESTIONS, PATIENT_EDUCATION, PATIENT_PLAN_TEMPLATE, PAEDIATRIC_TEMPLATE,
  AI_DISCLAIMER, REVIEWER,
} from "../config/clinical.js";
import { telephonyConfig } from "../telephony/env.js";

const router = Router();

// Reference data + copy that the backend owns. The frontend renders from
// this rather than keeping its own clinical constants.
router.get("/", (_req, res) => {
  const tel = telephonyConfig();
  res.json({
    reviewer: REVIEWER,
    aiDisclaimer: AI_DISCLAIMER,
    telephonyEnabled: tel.enabled,
    telephonyMissing: tel.missing,
    pipeline: PIPELINE,
    tracks: TRACKS,
    durationOptions: DURATION_OPTIONS,
    escalationLevels: ESCALATION_LEVELS,
    clinicalDecisions: CLINICAL_DECISIONS,
    escalationDestinations: ESCALATION_DESTINATIONS,
    urgencyLevels: URGENCY_LEVELS,
    outcomeOptions: OUTCOME_OPTIONS,
    checkpoints: CHECKPOINTS,
    pathwayQuestions: PATHWAY_QUESTIONS,
    patientEducation: PATIENT_EDUCATION,
    patientPlanTemplate: PATIENT_PLAN_TEMPLATE,
    paediatricTemplate: PAEDIATRIC_TEMPLATE,
  });
});

export default router;
