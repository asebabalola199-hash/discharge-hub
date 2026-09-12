// Seed the database with the same synthetic demo data as the prototype.
// All records are SYNTHETIC and are labelled as such in the UI (NFR-7).
//
//   node src/seed.js           -> seed only if the patients table is empty
//   node src/seed.js --force   -> wipe demo tables and reseed

import { db, migrate } from "./db.js";
import { TRACK_SCENARIOS, REVIEWER } from "./config/clinical.js";

const REVIEWER_NAME = REVIEWER;

// ─── Synthetic demo patients (mirrors INITIAL_PATIENTS) ───────────────────
const PATIENTS = [
  {
    demo_id: "DEMO-001", name: "Margaret Whyte", age: 78, ward: "MAU", track: "acute",
    condition: "COPD exacerbation", discharged: "13 Aug 2026, 09:10", duration: "72h",
    baseline_risk: "High",
    baseline_reasons: ["Age >75", "Recent acute exacerbation", "Previous admission within 90 days"],
    status: "called", contact_attempts: 1, unable_to_contact: 0, ehr_synced: 1, ehr_note_pushed: 1,
    flagged: 1, pipeline_stage: 6, escalation_level: 2, pathway_status: "red",
    last_scenario: "concern",
    comms: { method: "Automated voice call", language: "English", accessibility: [] },
    scenario: ["acute", "concern"],
  },
  {
    demo_id: "DEMO-002", name: "Harold Buchan", age: 66, ward: "Orthopaedics", track: "surgical",
    condition: "Total hip replacement", discharged: "13 Aug 2026, 10:40", duration: "7d",
    baseline_risk: "Medium",
    baseline_reasons: ["Post-operative recovery", "Reduced mobility"],
    status: "called", contact_attempts: 1, unable_to_contact: 0, ehr_synced: 1, ehr_note_pushed: 1,
    flagged: 0, pipeline_stage: 9, escalation_level: 0, pathway_status: "green",
    last_scenario: "clear",
    comms: { method: "SMS", language: "English", accessibility: [] },
    scenario: ["surgical", "clear"],
  },
  {
    demo_id: "DEMO-003", name: "Ishbel Coutts", age: 84, ward: "Virtual Ward", track: "frailty",
    condition: "Fall + UTI, stepped down to Virtual Ward", discharged: "13 Aug 2026, 08:20", duration: "7-14d",
    baseline_risk: "High",
    baseline_reasons: ["Age >75", "Fall history", "Multiple comorbidities"],
    status: "pending", contact_attempts: 0, unable_to_contact: 0, ehr_synced: 0, ehr_note_pushed: 0,
    flagged: 0, pipeline_stage: 2, escalation_level: 0, pathway_status: "grey",
    last_scenario: "concern",
    comms: { method: "Automated voice call", language: "English", accessibility: ["Carer/family involvement"] },
    scenario: null,
  },
  {
    demo_id: "DEMO-004", name: "David Okonkwo", age: 57, ward: "Surgical Assessment", track: "surgical",
    condition: "Laparoscopic cholecystectomy", discharged: "13 Aug 2026, 11:55", duration: "7d",
    baseline_risk: "Low",
    baseline_reasons: ["Elective procedure", "No significant comorbidities"],
    status: "pending", contact_attempts: 0, unable_to_contact: 0, ehr_synced: 1, ehr_note_pushed: 0,
    flagged: 0, pipeline_stage: 2, escalation_level: 0, pathway_status: "grey",
    last_scenario: "clear",
    comms: { method: "Patient portal", language: "English", accessibility: [] },
    scenario: null,
  },
  {
    demo_id: "DEMO-005", name: "Agnes Reilly", age: 79, ward: "MAU", track: "acute",
    condition: "Community-acquired pneumonia", discharged: "12 Aug 2026, 16:00", duration: "72h",
    baseline_risk: "Medium",
    baseline_reasons: ["Age >75", "Recent pneumonia"],
    status: "called", contact_attempts: 1, unable_to_contact: 0, ehr_synced: 1, ehr_note_pushed: 1,
    flagged: 0, pipeline_stage: 9, escalation_level: 0, pathway_status: "green",
    last_scenario: "clear",
    comms: { method: "Automated voice call", language: "Polish", accessibility: ["Interpreter required"] },
    scenario: ["acute", "clear"],
  },
  {
    demo_id: "DEMO-006", name: "Robert Fraser", age: 68, ward: "MAU", track: "acute",
    condition: "Ischaemic heart disease, medication review", discharged: "13 Aug 2026, 07:40", duration: "72h",
    baseline_risk: "Medium",
    baseline_reasons: ["Ischaemic heart disease", "Recent medication changes"],
    status: "called", contact_attempts: 2, unable_to_contact: 1, ehr_synced: 1, ehr_note_pushed: 0,
    flagged: 0, pipeline_stage: 6, escalation_level: 2, pathway_status: "amber",
    last_scenario: "concern",
    comms: { method: "Automated voice call", language: "English", accessibility: ["Hearing impairment"] },
    assessment:
      "No answer on 2 attempts. Risk-based rule triggered: clinical team notified rather than closed automatically.",
    scenario: null,
  },
  {
    // Dedicated GuardBand demonstration patient (kept separate from the
    // original 6 so their behaviour is completely unaffected).
    demo_id: "DEMO-007", name: "Margaret Thompson", age: 81, ward: "Virtual Ward", track: "frailty",
    condition: "Fall + dehydration, stepped down to Virtual Ward", discharged: "13 Aug 2026, 09:00", duration: "7-14d",
    baseline_risk: "High",
    baseline_reasons: ["Age >75", "Recent fall history", "Lives alone"],
    status: "pending", contact_attempts: 0, unable_to_contact: 0, ehr_synced: 1, ehr_note_pushed: 0,
    flagged: 0, pipeline_stage: 2, escalation_level: 0, pathway_status: "grey",
    last_scenario: "clear",
    comms: { method: "Automated voice call", language: "English", accessibility: ["Carer/family involvement"] },
    scenario: null,
    monitoring_baseline: {
      heartRate: { min: 60, max: 85 },
      spo2: { min: 94, max: 100 },
      respiratoryRate: { min: 12, max: 20 },
      temperature: { min: 36.0, max: 37.5 },
      systolicBP: { min: 100, max: 145 },
      diastolicBP: { min: 60, max: 90 },
    },
  },
];

// ─── Audit trails (mirrors AUDIT_TRAILS), keyed by demo_id ────────────────
const AUDIT = {
  "DEMO-001": [
    { time: "13 Aug 2026 · 09:10", label: "Discharged from MAU", icon: "🚪" },
    { time: "13 Aug 2026 · 09:15", label: "Discharge summary synced from TrakCare; care plan created", icon: "📄" },
    { time: "13 Aug 2026 · 11:10", label: "Automated check-in completed", icon: "📞" },
    { time: "13 Aug 2026 · 11:14", label: "Patient reported increased breathlessness and increased inhaler use", icon: "🗣️" },
    { time: "13 Aug 2026 · 11:14", label: "Risk assessment: 🔴 Red — alert generated", icon: "🚩" },
    { time: "13 Aug 2026 · 11:15", label: `${REVIEWER_NAME} notified (clinical review queue)`, icon: "📡" },
  ],
  "DEMO-002": [
    { time: "13 Aug 2026 · 10:40", label: "Discharged from Orthopaedics", icon: "🚪" },
    { time: "13 Aug 2026 · 10:45", label: "Discharge summary synced; care plan created", icon: "📄" },
    { time: "13 Aug 2026 · 12:50", label: "Automated check-in completed — all signals within baseline", icon: "✅" },
    { time: "13 Aug 2026 · 12:50", label: "Pathway closed — recovery on track", icon: "🏁" },
  ],
  "DEMO-003": [
    { time: "13 Aug 2026 · 08:20", label: "Stepped down to Virtual Ward", icon: "🚪" },
    { time: "13 Aug 2026 · 08:25", label: "Care plan created", icon: "📄" },
  ],
  "DEMO-004": [
    { time: "13 Aug 2026 · 11:55", label: "Discharged from Surgical Assessment", icon: "🚪" },
    { time: "13 Aug 2026 · 12:00", label: "Discharge summary synced; care plan created", icon: "📄" },
  ],
  "DEMO-005": [
    { time: "12 Aug 2026 · 16:00", label: "Discharged from MAU", icon: "🚪" },
    { time: "12 Aug 2026 · 16:05", label: "Care plan created", icon: "📄" },
    { time: "12 Aug 2026 · 18:05", label: "Automated check-in completed — all signals within baseline", icon: "✅" },
    { time: "12 Aug 2026 · 18:05", label: "Pathway closed", icon: "🏁" },
  ],
  "DEMO-006": [
    { time: "13 Aug 2026 · 07:40", label: "Discharged from MAU", icon: "🚪" },
    { time: "13 Aug 2026 · 07:45", label: "Care plan created", icon: "📄" },
    { time: "13 Aug 2026 · 08:10", label: "Contact attempt 1 — no answer", icon: "📵" },
    { time: "13 Aug 2026 · 09:40", label: "Contact attempt 2 — no answer", icon: "📵" },
    { time: "13 Aug 2026 · 09:41", label: "Risk-based rule triggered — clinical team notified", icon: "🚩" },
  ],
  "DEMO-007": [
    { time: "13 Aug 2026 · 09:00", label: "Stepped down to Virtual Ward", icon: "🚪" },
    { time: "13 Aug 2026 · 09:05", label: "Care plan created", icon: "📄" },
    { time: "13 Aug 2026 · 09:10", label: "GuardBand (GB-007) enrolled — SIMULATED", icon: "📡" },
  ],
};

// ─── Pathways (mirrors SEED_PATHWAYS) ────────────────────────────────────
const PATHWAYS = [
  { name: "COPD 72-Hour Discharge", status: "published", created_by: REVIEWER_NAME, owner: "Dr Ahmed", last_reviewed: "10 Aug 2026" },
  { name: "Post-Op Surgical 7-Day", status: "published", created_by: "Nina Patel, RN", owner: "Mr Fraser", last_reviewed: "8 Aug 2026" },
  { name: "Frailty / Virtual Ward 14-Day", status: "published", created_by: "Tom Reid, RN", owner: "Dr Patel", last_reviewed: "5 Aug 2026" },
];

// ─── Care team directory (mirrors CARE_TEAM_BY_WARD) ─────────────────────
const CARE_TEAM = [
  { ward: "MAU", nurse: "Sarah Jones, RN", medical: "Dr Ahmed", community: "Lothian Community Nursing" },
  { ward: "Orthopaedics", nurse: "Nina Patel, RN", medical: "Mr Fraser", community: "Lothian Community Nursing" },
  { ward: "Virtual Ward", nurse: "Tom Reid, RN", medical: "Dr Patel", community: "Lothian Community Nursing" },
  { ward: "Surgical Assessment", nurse: "Nina Patel, RN", medical: "Mr Fraser", community: "Lothian Community Nursing" },
];

function alreadySeeded() {
  const { n } = db.prepare("SELECT COUNT(*) AS n FROM patients").get();
  return n > 0;
}

function wipe() {
  db.exec(`
    DELETE FROM signals;
    DELETE FROM check_ins;
    DELETE FROM audit_events;
    DELETE FROM clinical_reviews;
    DELETE FROM safety_events;
    DELETE FROM observations;
    DELETE FROM devices;
    DELETE FROM patients;
    DELETE FROM pathways;
    DELETE FROM care_team;
    DELETE FROM sqlite_sequence WHERE name IN
      ('patients','signals','check_ins','audit_events','clinical_reviews','pathways','devices','observations','safety_events');
  `);
}

export function seed({ force = false } = {}) {
  migrate();
  if (alreadySeeded()) {
    if (!force) return { seeded: false, reason: "already populated" };
    wipe();
  }

  const insertPatient = db.prepare(`
    INSERT INTO patients
      (demo_id, name, age, ward, track, condition, discharged, duration, baseline_risk,
       baseline_reasons, status, contact_attempts, unable_to_contact, ehr_synced, ehr_note_pushed,
       flagged, pipeline_stage, escalation_level, pathway_status, last_scenario, comms, assessment,
       monitoring_baseline, patient_status)
    VALUES
      (@demo_id, @name, @age, @ward, @track, @condition, @discharged, @duration, @baseline_risk,
       @baseline_reasons, @status, @contact_attempts, @unable_to_contact, @ehr_synced, @ehr_note_pushed,
       @flagged, @pipeline_stage, @escalation_level, @pathway_status, @last_scenario, @comms, @assessment,
       @monitoring_baseline, @patient_status)
  `);
  const insertDevice = db.prepare(
    "INSERT INTO devices (patient_id, device_id, device_type, name, status, battery, connection, last_sync) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );
  const insertObservation = db.prepare(
    "INSERT INTO observations (patient_id, device_id, parameter, value, unit, source_type, simulated, created_at) VALUES (?, ?, ?, ?, ?, 'SIMULATED', 1, ?)"
  );
  const insertCheckIn = db.prepare(
    "INSERT INTO check_ins (patient_id, scenario_key, no_answer, status) VALUES (?, ?, 0, 'seed')"
  );
  const insertSignal = db.prepare(
    "INSERT INTO signals (check_in_id, patient_id, label, baseline, current, severity, ord) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  const insertAudit = db.prepare(
    "INSERT INTO audit_events (patient_id, time_label, label, icon) VALUES (?, ?, ?, ?)"
  );
  const insertPathway = db.prepare(
    "INSERT INTO pathways (name, status, created_by, owner, last_reviewed, config) VALUES (@name, @status, @created_by, @owner, @last_reviewed, @config)"
  );
  const insertCareTeam = db.prepare(
    "INSERT INTO care_team (ward, nurse, medical, community) VALUES (@ward, @nurse, @medical, @community)"
  );

  const tx = db.transaction(() => {
    for (const p of PATIENTS) {
      const info = insertPatient.run({
        demo_id: p.demo_id,
        name: p.name,
        age: p.age ?? null,
        ward: p.ward,
        track: p.track,
        condition: p.condition,
        discharged: p.discharged,
        duration: p.duration,
        baseline_risk: p.baseline_risk,
        baseline_reasons: JSON.stringify(p.baseline_reasons),
        status: p.status,
        contact_attempts: p.contact_attempts,
        unable_to_contact: p.unable_to_contact,
        ehr_synced: p.ehr_synced,
        ehr_note_pushed: p.ehr_note_pushed,
        flagged: p.flagged,
        pipeline_stage: p.pipeline_stage,
        escalation_level: p.escalation_level,
        pathway_status: p.pathway_status,
        last_scenario: p.last_scenario,
        comms: JSON.stringify(p.comms),
        assessment: p.assessment ?? null,
        monitoring_baseline: p.monitoring_baseline ? JSON.stringify(p.monitoring_baseline) : null,
        patient_status: p.patient_status || "stable",
      });
      const patientId = info.lastInsertRowid;

      // Seed the completed check-in + extracted signals for patients who
      // already have a check-in in their history.
      if (p.scenario) {
        const [track, key] = p.scenario;
        const scenario = TRACK_SCENARIOS[track][key];
        const ci = insertCheckIn.run(patientId, key);
        scenario.signals.forEach((s, i) =>
          insertSignal.run(ci.lastInsertRowid, patientId, s[0], s[1], s[2], s[3], i)
        );
        if (!p.assessment) {
          db.prepare("UPDATE patients SET assessment = ? WHERE id = ?").run(scenario.assessment, patientId);
        }
      }

      for (const e of AUDIT[p.demo_id] || []) {
        insertAudit.run(patientId, e.time, e.label, e.icon);
      }

      // Margaret Thompson (DEMO-007): enroll a GuardBand + seed ~6 hours of
      // normal readings, so her Monitoring tab has real history to show
      // before anyone touches the Simulator.
      if (p.demo_id === "DEMO-007") {
        insertDevice.run(patientId, "GB-007", "guardband", "GuardBand", "online", 91, "LTE", "2026-08-13 15:00:00");
        const hours = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00"];
        const readings = [
          [72, 97, 16, 36.7], [74, 97, 16, 36.7], [73, 96, 17, 36.8], [75, 97, 16, 36.7],
          [72, 97, 16, 36.6], [76, 96, 17, 36.8], [74, 97, 16, 36.7],
        ];
        hours.forEach((h, i) => {
          const ts = `2026-08-13 ${h}:00`;
          const [hr, spo2, rr, temp] = readings[i];
          insertObservation.run(patientId, "GB-007", "HEART_RATE", hr, "bpm", ts);
          insertObservation.run(patientId, "GB-007", "SPO2", spo2, "%", ts);
          insertObservation.run(patientId, "GB-007", "RESPIRATORY_RATE", rr, "/min", ts);
          insertObservation.run(patientId, "GB-007", "TEMPERATURE", temp, "°C", ts);
        });
      }
    }

    for (const pw of PATHWAYS) insertPathway.run({ ...pw, config: JSON.stringify(pw.config || {}) });
    for (const ct of CARE_TEAM) insertCareTeam.run(ct);
  });
  tx();

  return { seeded: true, patients: PATIENTS.length, pathways: PATHWAYS.length };
}

/** Called on server boot — seeds only when the DB is empty. */
export function ensureSeed() {
  const result = seed({ force: false });
  if (result.seeded) console.log(`[seed] inserted ${result.patients} demo patients, ${result.pathways} pathways`);
  return result;
}

// Run directly: `node src/seed.js [--force]`
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("seed.js")) {
  const force = process.argv.includes("--force");
  const result = seed({ force });
  if (result.seeded) {
    console.log(`[seed] done — ${result.patients} patients, ${result.pathways} pathways${force ? " (forced reseed)" : ""}`);
  } else {
    console.log(`[seed] skipped — ${result.reason}. Use --force to wipe and reseed.`);
  }
}
