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
  `);

  // Additive migrations for DBs created before a column existed.
  ensureColumn("patients", "phone", "TEXT");
  ensureColumn("check_ins", "mode", "TEXT DEFAULT 'scripted'");
  ensureColumn("check_ins", "call_id", "INTEGER");
}

function ensureColumn(table, column, ddlType) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!cols.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddlType}`);
  }
}
