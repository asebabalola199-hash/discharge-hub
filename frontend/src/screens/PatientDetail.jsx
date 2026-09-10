import { useState } from "react";
import { C, Card, Btn, Tag, Inp, Sel, TA, Lbl, Avatar, RISK_DOT, STATUS_STYLE, KIND_COLOR, SEVERITY_COL } from "../theme.jsx";
import { useConfig } from "../hooks.js";
import { JourneyTimeline } from "../components.jsx";

export default function PatientDetailScreen({ patient, onBack, onStartCall, onSubmitDecision, onSubmitOutcome }) {
  const cfg = useConfig();
  const [tab, setTab] = useState("overview");
  const track = cfg.tracks[patient.track];
  const audit = patient.audit || [];
  const rec = patient.recommendation;
  const team = cfg.careTeam[patient.ward] || cfg.careTeam.MAU;
  const durOpt = cfg.durationOptions.find((d) => d.key === patient.duration) || cfg.durationOptions[0];
  const durationLabel = durOpt.label;
  const checkIns = durOpt.checkIns;
  const [scol, sicon, slabel] = STATUS_STYLE[patient.pathwayStatus];

  return (
    <div>
      <div style={{ display: "flex", gap: "0.65rem", alignItems: "center", marginBottom: "0.5rem" }}>
        <Avatar name={patient.name} size={52} ring={scol} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: "1.02rem" }}>{patient.name} <span style={{ fontSize: "0.66rem", fontWeight: 400, color: C.textDim }}>{patient.demoId}</span></div>
          <div style={{ fontSize: "0.74rem", color: C.textSub }}>Age {patient.age}</div>
          <div style={{ fontSize: "0.7rem", color: C.textDim, marginTop: "0.1rem" }}>{patient.ward} · discharged {patient.discharged}</div>
        </div>
      </div>
      <Tag v="neutral">SYNTHETIC DATA — DEMO PATIENT</Tag>

      <div style={{ display: "flex", gap: "0.25rem", margin: "0.6rem 0", overflowX: "auto" }}>
        {[["overview", "Overview"], ["plan", "📋 Plan"], ["risk", "⚠️ Risk"], ["audit", "🕒 Audit"], ["review", "🩺 Review"], ["ehr", "🔗 EHR"]].map(([id, l]) => (
          <button key={id} onClick={() => setTab(id)} style={{ padding: "0.22rem 0.5rem", borderRadius: 50, border: tab === id ? "none" : `1px solid ${C.border}`, background: tab === id ? C.teal : C.surfaceHi, color: tab === id ? C.bg : C.textSub, fontSize: "0.66rem", fontWeight: tab === id ? 700 : 400, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0 }}>{l}</button>
        ))}
      </div>

      {tab === "overview" && (
        <div>
          <Card><div style={{ fontWeight: 700, fontSize: "0.8rem", marginBottom: "0.6rem" }}>Patient Journey</div><JourneyTimeline stage={patient.pipelineStage} /></Card>

          <Card style={{ borderLeft: `3px solid ${KIND_COLOR[rec.kind]}`, background: `${KIND_COLOR[rec.kind]}14` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.2rem" }}>
              <div style={{ fontWeight: 800, fontSize: "0.8rem", color: C.text }}>Recommended Next Step</div>
              <span style={{ fontSize: "1.1rem" }}>{rec.icon}</span>
            </div>
            <Tag v="purple">AI-assisted</Tag>
            <div style={{ fontWeight: 700, fontSize: "0.85rem", marginTop: "0.35rem" }}>{rec.label}</div>
            {rec.detail && <div style={{ fontSize: "0.75rem", color: C.textSub, margin: "0.2rem 0 0.55rem" }}>{rec.detail}</div>}
            {rec.kind === "call" ? (
              <Btn sm onClick={() => onStartCall(patient)}>▶ {rec.label}</Btn>
            ) : rec.kind === "review" ? (
              <Btn sm v="danger" onClick={() => setTab("review")}>🩺 Open Clinical Review</Btn>
            ) : (
              <Tag v="success">Pathway complete</Tag>
            )}
          </Card>

          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.65rem" }}>
            <Card style={{ flex: 1, textAlign: "center" }}><div style={{ fontSize: "0.6rem", color: C.textDim, textTransform: "uppercase", marginBottom: "0.25rem" }}>Baseline Risk</div><Tag v={patient.baselineRisk === "High" ? "danger" : patient.baselineRisk === "Medium" ? "warning" : "success"}>{RISK_DOT[patient.baselineRisk]} {patient.baselineRisk}</Tag></Card>
            <Card style={{ flex: 1, textAlign: "center" }}><div style={{ fontSize: "0.6rem", color: C.textDim, textTransform: "uppercase", marginBottom: "0.25rem" }}>Current Pathway Status</div><Tag v={patient.pathwayStatus === "red" ? "danger" : patient.pathwayStatus === "amber" ? "warning" : patient.pathwayStatus === "green" ? "success" : "neutral"}>{sicon} {slabel}</Tag></Card>
          </div>

          <Card>
            <div style={{ fontWeight: 700, marginBottom: "0.4rem", fontSize: "0.82rem" }}>👥 Care Team</div>
            {[["👩‍⚕️", team.nurse, "Primary reviewer"], ["👨‍⚕️", team.medical, "Escalation"], ["🏠", team.community, "Community follow-up"]].map(([icon, who, role]) => (
              <div key={role} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.22rem 0" }}><span style={{ fontSize: "1rem" }}>{icon}</span><div><div style={{ fontSize: "0.78rem", fontWeight: 600 }}>{who}</div><div style={{ fontSize: "0.64rem", color: C.textDim }}>{role}</div></div></div>
            ))}
          </Card>
        </div>
      )}

      {tab === "plan" && (
        <div>
          <Card>
            <div style={{ fontWeight: 700, marginBottom: "0.5rem" }}>Post-Discharge Care Plan</div>
            {[["Diagnosis", patient.condition], ["Discharging service", patient.ward], ["Discharged", patient.discharged], ["Monitoring period", durationLabel]].map(([l, v]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "0.3rem 0", borderBottom: `1px solid ${C.border}`, fontSize: "0.8rem" }}><span style={{ color: C.textSub }}>{l}</span><span style={{ fontWeight: 600 }}>{v}</span></div>
            ))}
          </Card>
          <Card>
            <div style={{ fontWeight: 700, marginBottom: "0.5rem" }}>Monitoring Plan</div>
            <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap", marginBottom: "0.55rem" }}>{checkIns.map((c, i) => <Tag key={c} v="info">{i + 1}. {c}</Tag>)}</div>
            <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>{track.monitor.map((m) => <Tag key={m} v="teal">{m}</Tag>)}</div>
          </Card>
          <Card>
            <div style={{ fontWeight: 700, marginBottom: "0.5rem" }}>Escalation Rules</div>
            {[["🔴 Red", "Immediate clinical review", C.red], ["🟠 Amber", "Nurse review within defined timeframe", C.amber], ["🟢 Green", "Continue pathway", C.green]].map(([l, d, col]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "0.3rem 0", borderBottom: `1px solid ${C.border}` }}><span style={{ fontSize: "0.8rem", fontWeight: 700, color: col }}>{l}</span><span style={{ fontSize: "0.76rem", color: C.textSub }}>{d}</span></div>
            ))}
          </Card>
          <Card>
            <div style={{ fontWeight: 700, marginBottom: "0.4rem" }}>Patient Communication</div>
            <div style={{ fontSize: "0.8rem", marginBottom: "0.2rem" }}>Method: <strong>{patient.comms.method}</strong> · Language: <strong>{patient.comms.language}</strong></div>
            {patient.comms.accessibility.length > 0 && <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap", marginTop: "0.35rem" }}>{patient.comms.accessibility.map((a) => <Tag key={a} v="purple">{a}</Tag>)}</div>}
          </Card>
        </div>
      )}

      {tab === "risk" && (
        <div>
          <Card style={{ borderLeft: `3px solid ${scol}` }}>
            <div style={{ fontWeight: 800, fontSize: "0.84rem", marginBottom: "0.3rem" }}>Overall Pathway Status</div>
            <Tag v={patient.pathwayStatus === "red" ? "danger" : patient.pathwayStatus === "amber" ? "warning" : patient.pathwayStatus === "green" ? "success" : "neutral"}>{sicon} {slabel}</Tag>
          </Card>
          <Card>
            <div style={{ fontWeight: 700, marginBottom: "0.4rem", fontSize: "0.82rem" }}>Why Baseline Risk Is {patient.baselineRisk}</div>
            {patient.baselineReasons.map((r) => <div key={r} style={{ fontSize: "0.78rem", color: C.textSub, padding: "0.15rem 0" }}>• {r}</div>)}
          </Card>
          {patient.signals.length > 0 ? (
            <>
              <Card>
                <div style={{ fontWeight: 700, marginBottom: "0.5rem", fontSize: "0.82rem" }}>Signals Detected — This Check-In</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.3rem", fontSize: "0.62rem", color: C.textDim, textTransform: "uppercase", marginBottom: "0.3rem", fontWeight: 700 }}><span>Signal</span><span>Baseline</span><span>Current</span></div>
                {patient.signals.map(([sig, base, cur, col]) => (
                  <div key={sig} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.3rem", padding: "0.28rem 0", borderTop: `1px solid ${C.border}`, alignItems: "center" }}>
                    <span style={{ fontSize: "0.76rem" }}>{sig}</span><span style={{ fontSize: "0.74rem", color: C.textSub }}>{base}</span>
                    <span style={{ fontSize: "0.74rem", fontWeight: 700, color: SEVERITY_COL[col] }}>{cur}</span>
                  </div>
                ))}
              </Card>
              <Card style={{ borderLeft: `3px solid ${C.purple}` }}>
                <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", marginBottom: "0.3rem" }}><Tag v="purple">AI-assisted assessment</Tag></div>
                <div style={{ fontSize: "0.8rem" }}>{patient.assessment}</div>
                <div style={{ fontSize: "0.64rem", color: C.textDim, marginTop: "0.45rem", fontStyle: "italic", lineHeight: 1.5 }}>{cfg.aiDisclaimer}</div>
              </Card>
            </>
          ) : (
            <Card><div style={{ fontSize: "0.8rem", color: C.textSub, textAlign: "center" }}>No check-in completed yet — no signals to display.</div></Card>
          )}
        </div>
      )}

      {tab === "audit" && (
        <Card>
          <div style={{ fontWeight: 700, marginBottom: "0.5rem" }}>Audit Trail</div>
          {audit.length === 0 && <div style={{ fontSize: "0.8rem", color: C.textSub }}>No events yet.</div>}
          {audit.map((e, i) => (
            <div key={i} style={{ display: "flex", gap: "0.55rem", paddingBottom: i < audit.length - 1 ? "0.5rem" : 0, marginBottom: i < audit.length - 1 ? "0.5rem" : 0, borderBottom: i < audit.length - 1 ? `1px solid ${C.border}` : "none" }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", background: C.surfaceHi, border: `2px solid ${C.blue}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", flexShrink: 0 }}>{e.icon}</div>
              <div style={{ flex: 1 }}><div style={{ fontSize: "0.64rem", color: C.textDim, fontWeight: 700 }}>{e.time}</div><div style={{ fontSize: "0.8rem" }}>{e.label}</div></div>
            </div>
          ))}
        </Card>
      )}

      {tab === "review" && (
        <div>
          <Card>
            <div style={{ fontWeight: 700, marginBottom: "0.6rem" }}>Escalation Pathway</div>
            {cfg.escalationLevels.map((lvl) => {
              const state = lvl.n < patient.escalationLevel ? "complete" : lvl.n === patient.escalationLevel ? "current" : "pending";
              const col = state === "complete" ? C.teal : state === "current" ? C.red : C.textDim;
              return (
                <div key={lvl.n} style={{ display: "flex", gap: "0.5rem", padding: "0.35rem 0", borderBottom: lvl.n < 5 ? `1px solid ${C.border}` : "none" }}>
                  <div style={{ width: 24, height: 24, borderRadius: "50%", background: `${col}22`, border: `2px solid ${col}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.7rem", flexShrink: 0 }}>{state === "complete" ? "✓" : lvl.icon}</div>
                  <div style={{ flex: 1 }}><div style={{ fontSize: "0.78rem", fontWeight: 700 }}>Level {lvl.n} — {lvl.label}</div><div style={{ fontSize: "0.7rem", color: C.textSub }}>{lvl.desc}</div></div>
                </div>
              );
            })}
          </Card>

          {!patient.flagged && !patient.unableToContact && <Card><div style={{ fontSize: "0.8rem", color: C.textSub, textAlign: "center" }}>No clinical review required for this patient.</div></Card>}

          {(patient.flagged || patient.unableToContact) && !patient.clinicalReview && <ClinicalDecisionForm patient={patient} onSubmit={onSubmitDecision} />}

          {patient.clinicalReview && !patient.clinicalReview.outcome && (
            <Card style={{ borderLeft: `3px solid ${C.blue}` }}>
              <div style={{ fontWeight: 700, color: C.blue, marginBottom: "0.3rem" }}>Clinical decision recorded</div>
              <div style={{ fontSize: "0.8rem", fontWeight: 600 }}>{patient.clinicalReview.decisionLabel}{patient.clinicalReview.destination ? ` → ${patient.clinicalReview.destination} (${patient.clinicalReview.urgency})` : ""}</div>
              {patient.clinicalReview.note && <div style={{ fontSize: "0.78rem", color: C.textSub, marginTop: "0.3rem", fontStyle: "italic" }}>"{patient.clinicalReview.note}"</div>}
              <div style={{ fontSize: "0.64rem", color: C.textDim, marginTop: "0.3rem" }}>{patient.clinicalReview.by} · {patient.clinicalReview.decisionTime}</div>
              <OutcomeForm patient={patient} onSubmit={onSubmitOutcome} />
            </Card>
          )}

          {patient.clinicalReview && patient.clinicalReview.outcome && (
            <Card style={{ background: C.greenBg, borderLeft: `3px solid ${C.green}` }}>
              <div style={{ fontWeight: 700, color: C.green, marginBottom: "0.3rem" }}>✅ Outcome recorded</div>
              <div style={{ fontSize: "0.66rem", color: C.textDim, textTransform: "uppercase" }}>Decision</div>
              <div style={{ fontSize: "0.79rem", marginBottom: "0.3rem" }}>{patient.clinicalReview.decisionLabel}{patient.clinicalReview.destination ? ` → ${patient.clinicalReview.destination} (${patient.clinicalReview.urgency})` : ""}</div>
              <div style={{ fontSize: "0.66rem", color: C.textDim, textTransform: "uppercase" }}>Outcome</div>
              <div style={{ fontSize: "0.79rem", fontWeight: 700 }}>{patient.clinicalReview.outcome}</div>
              <div style={{ fontSize: "0.64rem", color: C.textDim, marginTop: "0.3rem" }}>{patient.clinicalReview.by} · {patient.clinicalReview.outcomeTime}</div>
            </Card>
          )}
        </div>
      )}

      {tab === "ehr" && (
        <Card>
          <div style={{ background: C.amberBg, borderRadius: 8, padding: "0.4rem 0.6rem", marginBottom: "0.6rem", fontSize: "0.72rem", fontWeight: 700, color: C.amber }}>🟠 DEMO ENVIRONMENT — Simulated TrakCare connection</div>
          <div style={{ fontWeight: 700, marginBottom: "0.3rem" }}>🔗 EHR Integration</div>
          <div style={{ fontSize: "0.7rem", color: C.textDim, textTransform: "uppercase", fontWeight: 700, margin: "0.5rem 0 0.3rem" }}>Data Received</div>
          {["Demographics", "Discharge summary", "Diagnosis", "Discharge date", "Discharging ward", "Follow-up requirements"].map((d) => (
            <div key={d} style={{ display: "flex", justifyContent: "space-between", padding: "0.2rem 0", fontSize: "0.78rem" }}><span>{d}</span><span style={{ color: patient.ehrSynced ? C.teal : C.textDim }}>{patient.ehrSynced ? "✓" : "—"}</span></div>
          ))}
          <div style={{ fontSize: "0.7rem", color: C.textDim, textTransform: "uppercase", fontWeight: 700, margin: "0.5rem 0 0.3rem" }}>Data Returned</div>
          {["Check-in outcome", "Patient-reported symptoms", "Clinical review", "Escalation outcome"].map((d) => (
            <div key={d} style={{ display: "flex", justifyContent: "space-between", padding: "0.2rem 0", fontSize: "0.78rem" }}><span>{d}</span><span style={{ color: patient.ehrNotePushed ? C.teal : C.amber }}>{patient.ehrNotePushed ? "✓" : "Pending"}</span></div>
          ))}
          <div style={{ fontSize: "0.66rem", color: C.textDim, marginTop: "0.5rem" }}>Production integration is subject to NHS technical, information-governance and clinical-safety assurance.</div>
        </Card>
      )}

      <Btn v="ghost" onClick={onBack} style={{ marginTop: "0.5rem" }}>← Back to Journeys</Btn>
    </div>
  );
}

function ClinicalDecisionForm({ patient, onSubmit }) {
  const cfg = useConfig();
  const [decision, setDecision] = useState("");
  const [destination, setDestination] = useState(cfg.escalationDestinations[0]);
  const [urgency, setUrgency] = useState("routine");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function confirm() {
    if (!decision || busy) return;
    setBusy(true);
    try { await onSubmit(patient.id, decision, destination, urgency, note); } finally { setBusy(false); }
  }

  return (
    <Card style={{ borderLeft: `3px solid ${C.blue}` }}>
      <div style={{ fontWeight: 800, fontSize: "0.85rem", marginBottom: "0.5rem" }}>Clinical Review Required</div>
      <div style={{ fontSize: "0.66rem", color: C.textDim, textTransform: "uppercase", marginBottom: "0.35rem" }}>Nurse decision</div>
      {cfg.clinicalDecisions.map((d) => (
        <div key={d.key} onClick={() => setDecision(d.key)} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.38rem 0.1rem", cursor: "pointer" }}>
          <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${decision === d.key ? C.teal : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{decision === d.key && <div style={{ width: 9, height: 9, borderRadius: "50%", background: C.teal }} />}</div>
          <span style={{ fontSize: "0.8rem" }}>{d.label}</span>
        </div>
      ))}
      {decision === "medical" && (
        <div style={{ background: C.surfaceHi, borderRadius: 10, padding: "0.6rem", margin: "0.4rem 0" }}>
          <Lbl>Escalation destination</Lbl>
          <Sel value={destination} onChange={(e) => setDestination(e.target.value)}>{cfg.escalationDestinations.map((d) => <option key={d}>{d}</option>)}</Sel>
          <Lbl>Urgency</Lbl>
          <div style={{ display: "flex", gap: "0.4rem" }}>
            {cfg.urgencyLevels.map(([k, l]) => (
              <button key={k} onClick={() => setUrgency(k)} style={{ flex: 1, padding: "0.3rem", borderRadius: 8, border: `2px solid ${urgency === k ? (k === "immediate" ? C.red : C.teal) : C.border}`, background: urgency === k ? (k === "immediate" ? C.redBg : C.tealBg) : C.surface, color: urgency === k ? (k === "immediate" ? C.red : C.teal) : C.textSub, fontSize: "0.7rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{l}</button>
            ))}
          </div>
        </div>
      )}
      <Lbl>Clinical note / reason</Lbl>
      <TA value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Record your clinical reasoning…" />
      <Btn style={{ marginTop: "0.6rem", opacity: decision && !busy ? 1 : 0.5 }} onClick={confirm}>{busy ? "Saving…" : "✅ Confirm Clinical Decision"}</Btn>
    </Card>
  );
}

function OutcomeForm({ patient, onSubmit }) {
  const cfg = useConfig();
  const [outcome, setOutcome] = useState("");
  const [busy, setBusy] = useState(false);

  async function record() {
    if (!outcome || busy) return;
    setBusy(true);
    try { await onSubmit(patient.id, outcome); } finally { setBusy(false); }
  }

  return (
    <div style={{ marginTop: "0.7rem", paddingTop: "0.6rem", borderTop: `1px solid ${C.border}` }}>
      <Lbl>Record outcome of this decision</Lbl>
      <Sel value={outcome} onChange={(e) => setOutcome(e.target.value)}><option value="">Select outcome…</option>{cfg.outcomeOptions.map((o) => <option key={o}>{o}</option>)}</Sel>
      <Btn sm style={{ marginTop: "0.5rem", opacity: outcome && !busy ? 1 : 0.5 }} onClick={record}>{busy ? "Saving…" : "Record Outcome"}</Btn>
    </div>
  );
}
