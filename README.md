# The Discharge Hub

A digital care-orchestration platform that coordinates the transition from hospital to
home: automated post-discharge monitoring, structured risk assessment, human clinical
review, and a 5-level escalation workflow.

This repository is a **full-stack application**, not a UI prototype:

- **Backend** — Node.js + Express + SQLite (`better-sqlite3`). Owns all persistence and all
  clinical logic: the structured risk assessment (signals → status), the
  orchestrator/recommendation engine, the escalation state machine, and the pathway
  approval workflow. Exposes a REST API.
- **Frontend** — React (Vite). Renders what the API returns. No mock or in-memory state
  stands in for the backend.

> **All data in this build is SYNTHETIC** and labelled as such throughout the UI
> (`SYNTHETIC DATA` badges, `DEMO-00X` identifiers). Any EHR/TrakCare connection is a
> **simulated demo environment** and is visibly labelled. See
> [What is real vs. simulated](#what-is-real-vs-simulated).

---

## Run it locally

**Requirements:** Node.js **20 or newer** (tested on 20 LTS and 24). `better-sqlite3`
installs from a prebuilt binary on Windows/macOS/Linux x64 — no compiler needed.

```bash
npm install
```

```bash
npm run dev
```

- API: <http://localhost:3001>
- App: <http://localhost:5173>  ← open this

The database (`backend/data/discharge-hub.sqlite`) is created and seeded automatically on
first start. On Windows the first `npm run dev` can take ~10 s to bring both servers up
(nested workspace spawns); wait for the `VITE ready` line.

### Other commands

| Command | Effect |
|---|---|
| `npm run seed` | Wipe and reseed the demo data (6 patients, 3 pathways, care team) |
| `npm run build` | Build the frontend into `backend/public/` |
| `npm start` | Production mode — Express serves the built app **and** the API on `:3001` (one service) |

---

## Demo walkthrough

1. **Dashboard** — toggle **Clinical View** (worklist) / **Service View** (operational
   metrics). Counts are computed by the API from the seeded data.
2. **Margaret Whyte (DEMO-001)** — already flagged red.
   - *Risk* tab: the structured signal table (baseline vs current) and the AI-assisted
     assessment narrative with its disclaimer.
   - *Review* tab: choose **Escalate to medical team**, pick a destination + urgency, add a
     clinical note, **Confirm Clinical Decision** → then **Record Outcome**. Decision and
     outcome are stored separately, each attributed and timestamped.
   - *Audit* tab: the new decision + outcome events are appended to the immutable trail.
3. **Ishbel Coutts (DEMO-003)** — *Worklist* → **Start Check-In**. The scripted
   conversation is fetched from the API and animated; the backend then performs the
   check-in, extracts the signals, **derives** the Amber status, and moves her into the
   clinical review queue (escalation level 2). It does **not** escalate further on its own.
4. **David Okonkwo (DEMO-004)** — **Start Check-In** → all signals within baseline → Green
   → pathway closes, no review required.
5. **Robert Fraser (DEMO-006)** — **Start Check-In** → "no answer". After 2 attempts a
   risk-based rule notifies the clinical team; the pathway is **not** closed automatically.
6. **Pathways** → **+ New** → **Save as Draft** → **Submit for Clinical Approval** →
   **Approve**. Only a published pathway shows as usable.
7. **More → Patient View** — the patient-facing companion; toggle **Adult** / **Child /
   Parent-Carer**.

Restart the backend at any point — every change above persists (it's a real database).

---

## Clinical-safety design (carried over from the prototype, deliberately)

- **No autonomous clinical action.** The system recommends and flags; every escalation and
  every clinical decision requires a human action in the UI. A check-in can move a patient
  *to* "Clinical Review Queue" but never past it — advancing requires the clinical-review
  and outcome endpoints, which only fire from a form submit. (FR-5.3, NFR-2)
- **AI outputs are labelled.** Every recommendation and assessment carries an "AI-assisted"
  tag and the disclaimer: *"The AI identifies information from natural patient conversation
  against an agreed clinical pathway… The clinician remains responsible for the clinical
  decision."* (NFR-2)
- **Simulated EHR is labelled as simulated.** The EHR tab and the Sync screen both show
  "DEMO ENVIRONMENT — Simulated TrakCare connection". (FR-8.3)
- **No unproven capabilities.** No voice biometrics, no sentiment/emotion detection — these
  were removed after clinical review and are not present here. (NFR-23)
- **No clinical outcome claims** without a methodology and real data — analytics are shown
  as illustrative / pending pilot. (FR-11.3)

---

## What is real vs. simulated

Restating §9 of `Discharge_Hub_Requirements.md` for this build.

### Real (works end-to-end against the database)

| Area | Notes |
|---|---|
| Persistence | SQLite; patients, care plans, check-ins, signals, audit trail, clinical reviews, pathways, care team |
| REST API | See [API](#api) below |
| Care plan creation | Manual form + "sync from EHR" (simulated summary) |
| Automated check-in | Scripted conversation → structured signal extraction |
| Structured risk assessment | `deriveStatus(signals)` — status derived from signal severities, server-side (FR-4) |
| Recommendation engine | `recommendation(patient)` runs server-side; every patient payload carries its result (FR-5) |
| Clinical worklist | Prioritised by baseline risk |
| Clinical review + 5-level escalation | Decision and outcome recorded separately, attributed, timestamped (FR-6) |
| Audit trail | Append-only table; no update/delete route (FR-7) |
| Pathway builder | Draft → Pending Approval → Published workflow (FR-2) |
| Care team directory | Per ward (FR-9.1) |
| Analytics | Live counts from this DB + clearly-labelled illustrative platform figures |

### Simulated / not built (would be required before a real pilot)

| Area | Status |
|---|---|
| TrakCare / EHR sync (HL7 / FHIR) | **Simulated.** "Sync from EHR" inserts a fixed demo summary. No live integration. (FR-8.1/8.2 = Planned) |
| Telephony / SMS / patient portal delivery | **Simulated.** The check-in conversation is scripted; no calls are placed. (FR-3.1 = Partial) |
| Reviewer notification channel | **Simulated.** Shown in the audit trail only. (FR-9.2 = Partial) |
| Authentication / NHS identity / RBAC | **Not built.** No login. All clinician actions are attributed to a single seeded identity ("Sarah Jones, RN") shown as demo attribution. (NFR-9/10 = Planned) |
| Preferred-language delivery / translation | **Not built.** Preference is captured only. (FR-3.6 = Planned) |
| Voice identity verification | **Workflow step only**, no biometric claim. (FR-3.3) |
| Multi-tenancy | **Not built.** Single-tenant. (NFR-18 = Planned) |
| Encryption at rest, DCB0129/0160, DPIA, MHRA SaMD classification | **Not applicable to this demo.** Required before any real-patient use. |

---

## API

Base path `/api`. All state-changing routes append to the per-patient audit trail.

```
GET  /api/config                              reference data + copy (tracks, durations, decisions, disclaimer, templates)
GET  /api/patients                            list; each patient includes its derived recommendation + status
GET  /api/patients/:id                        full record + signals + audit trail + clinical review
POST /api/patients                            create a care plan (manual)
POST /api/patients/sync-ehr                   create from the simulated TrakCare summary
GET  /api/patients/:id/check-in               the scripted conversation for the next check-in (read-only)
POST /api/patients/:id/check-in               perform the check-in: extract signals, derive status, write audit
POST /api/patients/:id/clinical-review        record a clinical decision (+ destination/urgency/note)
POST /api/patients/:id/clinical-review/outcome  record the outcome of that decision
GET  /api/pathways                            all pathways
POST /api/pathways                            create as Draft
POST /api/pathways/:id/submit                 Draft → Pending Approval
POST /api/pathways/:id/approve                Pending Approval → Published
GET  /api/care-team                           directory by ward
GET  /api/analytics                           live counts (this DB) + illustrative figures + evaluation framework
```

---

## Deployment

Designed to deploy as **one web service**: `npm run build` bundles the frontend into
`backend/public/`, and `npm start` serves it alongside the API from a single port
(`process.env.PORT`).

`render.yaml` describes exactly this. **One caveat, flagged deliberately:** SQLite needs
durable storage. On Render/Railway the default filesystem is ephemeral, so `render.yaml`
mounts a small **persistent disk** at `backend/data` and sets `DB_DIR` to it. Without a
persistent disk the demo still runs but reseeds on every restart/redeploy. A `Dockerfile`
is included for container platforms.

### Project layout

```
discharge-hub/
├── backend/
│   └── src/
│       ├── index.js            Express app (+ static serve in prod)
│       ├── db.js               SQLite connection + schema
│       ├── seed.js             synthetic demo data
│       ├── config/clinical.js  tracks, scripted scenarios, reference tables
│       ├── logic/              riskAssessment · recommendation · store (serializer)
│       └── routes/             config · patients · checkins · reviews · pathways · careteam · analytics
└── frontend/
    └── src/
        ├── theme.jsx           navy/teal theme + atoms (verbatim from the prototype)
        ├── api.js  hooks.js  components.jsx
        ├── App.jsx             screen router + bottom nav
        └── screens/            Dashboard · Patients · NewDischarge · UploadSummary ·
                                PatientDetail · Worklist · PathwayBuilder · More ·
                                Analytics · Evidence · CareTeam · PatientPreview · LiveCallModal
```
