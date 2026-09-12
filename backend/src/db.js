import Database from "better-sqlite3";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdirSync } from "node:fs";

const here = dirname(fileURLToPath(import.meta.url));

// DB_DIR is overridable so a hosting platform can point it at a persistent disk.
const DATA_DIR = process.env.DB_DIR || join(here, "..", "data");
mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = process.env.DB_PATH || join(DATA_DIR, "discharge-hub.sqlite");

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

export function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS patients (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      demo_id           TEXT    NOT NULL,
      name              TEXT    NOT NULL,
      age               INTEGER,
      ward              TEXT,
      track             TEXT    NOT NULL,
      condition         TEXT,
      discharged        TEXT,
      duration          TEXT,
      baseline_risk     TEXT,
      baseline_reasons  TEXT,            -- JSON array of strings
      status            TEXT,            -- 'pending' | 'called'
      contact_attempts  INTEGER DEFAULT 0,
      unable_to_contact INTEGER DEFAULT 0,
      ehr_synced        INTEGER DEFAULT 0,
      ehr_note_pushed   INTEGER DEFAULT 0,
      flagged           INTEGER DEFAULT 0,
      pipeline_stage    INTEGER DEFAULT 2,
      escalation_level  INTEGER DEFAULT 0,
      pathway_status    TEXT    DEFAULT 'grey',   -- 'red' | 'amber' | 'green' | 'grey'
      last_scenario     TEXT    DEFAULT 'clear',  -- 'concern' | 'clear' (which scripted check-in plays)
      comms             TEXT,            -- JSON { method, language, accessibility[] }
      assessment        TEXT,
      phone             TEXT,            -- E.164 real phone number; NULL for synthetic seed patients
      created_at        TEXT    DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS check_ins (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id   INTEGER NOT NULL REFERENCES patients(id),
      scenario_key TEXT,
      no_answer    INTEGER DEFAULT 0,
      status       TEXT,
      mode         TEXT    DEFAULT 'scripted',  -- 'scripted' | 'live_call'
      call_id      INTEGER,                     -- REFERENCES calls(id) when mode = 'live_call'
      created_at   TEXT DEFAULT (datetime('now'))
    );

    -- A real, Twilio-placed automated check-in call (FR-3, real telephony).
    CREATE TABLE IF NOT EXISTS calls (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id    INTEGER NOT NULL REFERENCES patients(id),
      to_phone      TEXT NOT NULL,
      call_sid      TEXT,               -- Twilio CallSid, set once Twilio accepts the call
      status        TEXT DEFAULT 'initiated',  -- initiated | in-progress | completed | no-answer | busy | failed
      turn          INTEGER DEFAULT 0,
      ended_reason  TEXT,               -- 'assistant_closed' | 'max_turns' | 'emergency_redirect' | 'hangup'
      created_at    TEXT DEFAULT (datetime('now')),
      updated_at    TEXT DEFAULT (datetime('now'))
    );

    -- Full transcript of a live call — durable + auditable (FR-7 spirit),
    -- and it's what the signal-extraction step reads once the call ends.
    CREATE TABLE IF NOT EXISTS call_turns (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      call_id    INTEGER NOT NULL REFERENCES calls(id),
      speaker    TEXT NOT NULL,   -- 'ai' | 'patient'
      text       TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS signals (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      check_in_id INTEGER REFERENCES check_ins(id),
      patient_id  INTEGER NOT NULL REFERENCES patients(id),
      label       TEXT,
      baseline    TEXT,
      current     TEXT,
      severity    TEXT,               -- 'red' | 'amber' | 'green' | 'grey'
      ord         INTEGER
    );

    -- Append-only. No UPDATE or DELETE route is exposed for this table (FR-7.1).
    CREATE TABLE IF NOT EXISTS audit_events (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id INTEGER NOT NULL REFERENCES patients(id),
      time_label TEXT,
      label      TEXT,
      icon       TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS clinical_reviews (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id    INTEGER NOT NULL REFERENCES patients(id),
      decision_key  TEXT,
      decision_label TEXT,
      destination   TEXT,
      urgency       TEXT,
      note          TEXT,
      by_name       TEXT,
      decision_time TEXT,
      outcome       TEXT,
      outcome_time  TEXT,
      created_at    TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pathways (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT NOT NULL,
      status        TEXT NOT NULL,     -- 'draft' | 'pending_approval' | 'published'
      created_by    TEXT,
      owner         TEXT,
      last_reviewed TEXT,
      config        TEXT,              -- JSON { eligibility, checkpointQs, redFlag, amberFlag }
      created_at    TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS care_team (
      ward      TEXT PRIMARY KEY,
      nurse     TEXT,
      medical   TEXT,
      community TEXT
    );

    -- ─── GuardBand: continuous monitoring layer ──────────────────────────
    -- A patient can have several connected devices contributing data to the
    -- one patient record (FR: multi-sensor ecosystem).
    CREATE TABLE IF NOT EXISTS devices (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id   INTEGER NOT NULL REFERENCES patients(id),
      device_id    TEXT    NOT NULL,   -- e.g. "GB-001"
      device_type  TEXT    NOT NULL,   -- 'guardband' | 'bp_monitor' | 'cgm' | 'scale' | 'thermometer'
      name         TEXT,
      status       TEXT    DEFAULT 'online',  -- 'online' | 'connected' | 'offline'
      battery      INTEGER,
      connection   TEXT,               -- 'BLE' | 'LTE' | 'WiFi'
      last_sync    TEXT    DEFAULT (datetime('now')),
      created_at   TEXT    DEFAULT (datetime('now'))
    );

    -- Unified physiological/activity observation model. One row per reading,
    -- from any device. simulated=1 for everything in this prototype — never
    -- described in the UI as a real measurement.
    CREATE TABLE IF NOT EXISTS observations (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id  INTEGER NOT NULL REFERENCES patients(id),
      device_id   TEXT,
      parameter   TEXT    NOT NULL,   -- HEART_RATE | SPO2 | RESPIRATORY_RATE | TEMPERATURE |
                                       -- BLOOD_PRESSURE_SYSTOLIC | BLOOD_PRESSURE_DIASTOLIC |
                                       -- GLUCOSE | WEIGHT | ACTIVITY | STEPS
      value       REAL,
      unit        TEXT,
      source_type TEXT    DEFAULT 'SIMULATED',  -- 'WEARABLE' | 'CONNECTED_DEVICE' | 'SIMULATED'
      simulated   INTEGER DEFAULT 1,
      confidence  REAL    DEFAULT 0.95,
      created_at  TEXT    DEFAULT (datetime('now'))
    );

    -- Safety events (fall, SOS, long-lie, etc). The response workflow
    -- (patient confirm -> family notified -> clinical alert) only ever
    -- advances via an explicit human/demo action (routes/monitoring.js) —
    -- never automatically, and never straight to emergency services.
    CREATE TABLE IF NOT EXISTS safety_events (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id   INTEGER NOT NULL REFERENCES patients(id),
      device_id    TEXT,
      type         TEXT    NOT NULL,   -- FALL_DETECTED | NEAR_FALL | SOS | NO_MOVEMENT |
                                        -- LONG_LIE | LOW_BATTERY | DEVICE_OFFLINE |
                                        -- DEVICE_ONLINE | HEALTH_ALERT | PATIENT_CONFIRMED_SAFE
      status       TEXT    DEFAULT 'awaiting_response',
                                        -- 'awaiting_response' | 'family_notified' |
                                        -- 'clinical_alerted' | 'resolved'
      confidence   REAL    DEFAULT 0.9,
      simulated    INTEGER DEFAULT 1,
      created_at   TEXT    DEFAULT (datetime('now')),
      resolved_at  TEXT
    );
  `);

  // Additive migrations for DBs created before a column existed.
  ensureColumn("patients", "phone", "TEXT");
  ensureColumn("check_ins", "mode", "TEXT DEFAULT 'scripted'");
  ensureColumn("check_ins", "call_id", "INTEGER");
  ensureColumn("patients", "monitoring_baseline", "TEXT");
  ensureColumn("patients", "patient_status", "TEXT DEFAULT 'stable'");
}

function ensureColumn(table, column, ddlType) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddlType}`);
  }
}
