import { useState } from "react";
import { C, Card, Btn, RISK_COL, RISK_DOT, PATIENT_STATUS_STYLE } from "../theme.jsx";

// Dashboard — Clinical View (who needs attention today?) and Service View
// (is this pathway working?). Recommendations come from the API (p.recommendation).
export default function DashboardScreen({ patients, onNavigate, onOpenPatient }) {
  const [mode, setMode] = useState("clinical");
  const onPathway = patients.filter((p) => p.pipelineStage < 9).length;
  const dueToday = patients.filter((p) => p.status === "pending").length;
  const needsReview = patients.filter((p) => p.flagged && p.escalationLevel < 5).length;
  const awaitingEscalation = patients.filter((p) => p.flagged && p.escalationLevel >= 2 && p.escalationLevel < 5).length;
  const monitoringCounts = {
    watch: patients.filter((p) => p.patientStatus === "watch").length,
    concern: patients.filter((p) => p.patientStatus === "concern").length,
    urgent_review: patients.filter((p) => p.patientStatus === "urgent_review").length,
    active_safety_event: patients.filter((p) => p.patientStatus === "active_safety_event").length,
  };
  const worklist = [...patients]
    .filter((p) => p.flagged || p.status === "pending" || p.unableToContact || (p.patientStatus && p.patientStatus !== "stable" && p.patientStatus !== "watch"))
    .sort(
      (a, b) =>
        (a.baselineRisk === "High" ? 0 : a.baselineRisk === "Medium" ? 1 : 2) -
        (b.baselineRisk === "High" ? 0 : b.baselineRisk === "Medium" ? 1 : 2)
    );

  return (
    <div>
      <Card style={{ background: C.greenBg, borderLeft: `3px solid ${C.green}`, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.6rem 0.9rem" }}>
        <div style={{ fontSize: "0.78rem", fontWeight: 700, color: C.green }}>🟢 Discharge Hub Operational</div>
        <div style={{ fontSize: "0.72rem", color: C.textSub }}>{patients.length} patients currently monitored</div>
      </Card>

      <div style={{ marginBottom: "0.8rem" }}>
        <h2 style={{ fontSize: "1.2rem", margin: 0, fontWeight: 800, letterSpacing: "-0.02em" }}>{mode === "clinical" ? "Clinical Dashboard" : "Service Dashboard"}</h2>
        <p style={{ color: C.textSub, fontSize: "0.76rem", margin: "0.15rem 0 0" }}>{mode === "clinical" ? "Who needs attention today?" : "Is this pathway working?"}</p>
      </div>

      <div style={{ display: "flex", gap: "0.3rem", marginBottom: "0.7rem" }}>
        {[["clinical", "🩺 Clinical View"], ["service", "📊 Service View"]].map(([k, l]) => (
          <button key={k} onClick={() => setMode(k)} style={{ flex: 1, padding: "0.32rem", borderRadius: 50, border: mode === k ? "none" : `1px solid ${C.border}`, background: mode === k ? C.teal : C.surfaceHi, color: mode === k ? C.bg : C.textSub, fontSize: "0.74rem", fontWeight: mode === k ? 700 : 400, cursor: "pointer", fontFamily: "inherit" }}>{l}</button>
        ))}
      </div>

      {mode === "clinical" ? (
        <>
          <Card style={{ padding: "0.6rem 0.7rem", marginBottom: "0.6rem" }}>
            <div style={{ fontSize: "0.66rem", fontWeight: 700, color: C.textDim, textTransform: "uppercase", marginBottom: "0.35rem" }}>📡 Patient Monitoring (GuardBand)</div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem" }}>
              <span style={{ color: C.blue }}>{monitoringCounts.watch} Watch</span>
              <span style={{ color: C.amber }}>{monitoringCounts.concern} Concern</span>
              <span style={{ color: C.red }}>{monitoringCounts.urgent_review} Urgent</span>
              <span style={{ color: C.red, fontWeight: 700 }}>{monitoringCounts.active_safety_event} Safety Events</span>
            </div>
          </Card>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.55rem", marginBottom: "0.75rem" }}>
            {[["Patients on pathway", onPathway, C.text], ["Check-ins due today", dueToday, C.blue], ["Responses requiring review", needsReview, C.red], ["Escalations awaiting action", awaitingEscalation, C.amber]].map(([l, v, col]) => (
              <Card key={l} style={{ textAlign: "center", padding: "0.7rem 0.5rem" }}>
                <div style={{ fontSize: "1.7rem", fontWeight: 800, color: col }}>{v}</div>
                <div style={{ fontSize: "0.62rem", color: C.textDim, marginTop: "0.15rem" }}>{l}</div>
              </Card>
            ))}
          </div>
          <div style={{ fontSize: "0.68rem", fontWeight: 700, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0.8rem 0 0.5rem" }}>Today's Clinical Worklist</div>
          {worklist.length === 0 && <Card><div style={{ fontSize: "0.8rem", color: C.textSub, textAlign: "center" }}>Nothing requires attention right now.</div></Card>}
          {worklist.map((p) => {
            const rec = p.recommendation;
            return (
              <Card key={p.id} onClick={() => onOpenPatient(p.id)} style={{ borderLeft: `3px solid ${RISK_COL[p.baselineRisk]}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", gap: "0.55rem", alignItems: "center" }}>
                    <span style={{ fontSize: "1rem" }}>{RISK_DOT[p.baselineRisk]}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.85rem" }}>{p.name} <span style={{ fontSize: "0.64rem", color: C.textDim, fontWeight: 400 }}>{p.demoId}</span></div>
                      <div style={{ fontSize: "0.72rem", color: C.textSub }}>{rec.detail || rec.label}</div>
                    </div>
                  </div>
                  <Btn sm onClick={(e) => { e.stopPropagation(); onOpenPatient(p.id); }}>{rec.kind === "call" ? "Start check-in" : "Review now"}</Btn>
                </div>
              </Card>
            );
          })}
        </>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.6rem" }}>
            {[["Avg. nurse review time", "12 min"], ["Alerts requiring action", "88%"], ["Alerts resolved remotely", "76%"], ["Successful contact rate", "91%"]].map(([l, v]) => (
              <Card key={l} style={{ padding: "0.7rem 0.6rem" }}><div style={{ fontSize: "1.2rem", fontWeight: 800, color: C.teal }}>{v}</div><div style={{ fontSize: "0.62rem", color: C.textDim, marginTop: "0.2rem" }}>{l}</div></Card>
            ))}
          </div>
          <Card style={{ borderLeft: `3px solid ${C.amber}` }}>
            <div style={{ fontWeight: 700, marginBottom: "0.3rem", fontSize: "0.82rem" }}>Readmission Rate — Baseline vs. Cohort</div>
            <div style={{ fontSize: "0.76rem", color: C.textSub }}>Pending pilot data. Evaluation framework is ready — see Evidence &amp; Evaluation.</div>
          </Card>
        </>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.55rem", marginTop: "0.7rem" }}>
        <Card style={{ padding: "0.7rem", cursor: "pointer" }} onClick={() => onNavigate("patients")}><div style={{ fontSize: "1.2rem" }}>🗂️</div><div style={{ fontSize: "0.76rem", fontWeight: 600 }}>Patient Journeys</div></Card>
        <Card style={{ padding: "0.7rem", cursor: "pointer" }} onClick={() => onNavigate("worklist")}><div style={{ fontSize: "1.2rem" }}>🧭</div><div style={{ fontSize: "0.76rem", fontWeight: 600 }}>Clinical Worklist</div></Card>
      </div>
    </div>
  );
}
