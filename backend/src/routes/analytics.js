import { Router } from "express";
import { db } from "../db.js";

const router = Router();

// GET /api/analytics
//
// `live` = counts computed from the actual database (this demo instance).
// `illustrative` = the platform-scale figures shown in the prototype, kept
// clearly labelled as illustrative — never presented as measured clinical
// impact (FR-11.2, FR-11.3).
router.get("/", (_req, res) => {
  const count = (sql, ...args) => db.prepare(sql).get(...args).n;

  const live = {
    patientsMonitored: count("SELECT COUNT(*) AS n FROM patients"),
    onPathway: count("SELECT COUNT(*) AS n FROM patients WHERE pipeline_stage < 9"),
    checkInsCompleted: count("SELECT COUNT(*) AS n FROM check_ins WHERE no_answer = 0 AND status != 'seed'"),
    alertsGenerated: count("SELECT COUNT(*) AS n FROM patients WHERE flagged = 1 OR unable_to_contact = 1"),
    clinicalReviews: count("SELECT COUNT(*) AS n FROM clinical_reviews"),
    unableToContact: count("SELECT COUNT(*) AS n FROM patients WHERE unable_to_contact = 1"),
    escalations: count("SELECT COUNT(*) AS n FROM clinical_reviews WHERE decision_key = 'medical'"),
  };

  res.json({
    live,
    illustrative: {
      note: "Illustrative platform metrics — the operational data this system is designed to collect, not a claim of clinical impact.",
      volume: [
        ["Patients monitored", "1,248"],
        ["Check-ins completed", "4,672"],
        ["Alerts generated", "183"],
        ["Clinical reviews", "161"],
        ["Unable to contact", "22"],
        ["Escalations", "47"],
        ["Average response time", "34 min"],
      ],
      operational: [
        ["Avg. nurse review time", "12 min"],
        ["Alerts requiring action", "88%"],
        ["Alerts resolved remotely", "76%"],
        ["Successful patient contacts", "91%"],
      ],
      serviceView: [
        ["Avg. nurse review time", "12 min"],
        ["Alerts requiring action", "88%"],
        ["Alerts resolved remotely", "76%"],
        ["Successful contact rate", "91%"],
      ],
      outcomes: [
        ["7-day readmission", "Pending pilot"],
        ["30-day readmission", "Pending pilot"],
      ],
    },
    evidence: {
      pilotStatus: "Pre-pilot",
      primaryOutcome: "30-day readmission rate",
      secondaryOutcomes: [
        "Time to clinical review",
        "Escalation rate",
        "Contact success rate",
        "Patient experience",
        "Staff workload",
        "Unplanned care utilisation",
      ],
      frameworkReady: true,
    },
  });
});

export default router;
