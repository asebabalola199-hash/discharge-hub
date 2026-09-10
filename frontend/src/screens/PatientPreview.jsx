import { useState } from "react";
import { C, Card, Btn, Tag, Lbl, trackColor } from "../theme.jsx";
import { useConfig, useAsync } from "../hooks.js";
import { api } from "../api.js";
import { Loading, ErrorNote } from "../components.jsx";

// Patient-facing companion (FR-10) — a digital discharge companion that
// informs the patient, not just monitors them. Adult and paediatric modes.
export default function PatientPreviewScreen({ onBack }) {
  const cfg = useConfig();
  const { data: patients, loading, error, refetch } = useAsync(api.patients, []);
  const [audience, setAudience] = useState("adult"); // adult | paediatric
  const [mode, setMode] = useState(null);

  if (loading && !patients) return <Loading label="Loading patient view…" />;
  if (error) return <ErrorNote error={error} onRetry={refetch} />;

  const demoPatient = patients.find((p) => p.track === "acute") || patients[0];
  const track = cfg.tracks[demoPatient.track];
  const plan = audience === "paediatric" ? cfg.paediatricTemplate : cfg.patientPlanTemplate[demoPatient.track];
  const edu = audience === "paediatric" ? cfg.paediatricTemplate.education : cfg.patientEducation[demoPatient.track];
  const team = cfg.careTeam[demoPatient.ward] || cfg.careTeam.MAU;

  return (
    <div>
      <h3 style={{ marginBottom: "0.2rem", fontWeight: 800 }}>🧑 Patient View — Preview</h3>
      <p style={{ color: C.textSub, fontSize: "0.74rem", marginBottom: "0.6rem" }}>A digital discharge companion — informing the patient, not just monitoring them.</p>

      <div style={{ display: "flex", gap: "0.3rem", marginBottom: "0.7rem" }}>
        {[["adult", "🧑 Adult / Patient"], ["paediatric", "👶 Child / Parent-Carer"]].map(([k, l]) => (
          <button key={k} onClick={() => setAudience(k)} style={{ flex: 1, padding: "0.32rem", borderRadius: 50, border: audience === k ? "none" : `1px solid ${C.border}`, background: audience === k ? C.teal : C.surfaceHi, color: audience === k ? C.bg : C.textSub, fontSize: "0.72rem", fontWeight: audience === k ? 700 : 400, cursor: "pointer", fontFamily: "inherit" }}>{l}</button>
        ))}
      </div>

      <Card style={{ textAlign: "center", padding: "1.2rem 1rem" }}>
        <div style={{ fontSize: "1.15rem", fontWeight: 800, marginBottom: "0.4rem" }}>{audience === "paediatric" ? "Welcome home 👋" : `Welcome home, ${demoPatient.name.split(" ")[0]} 👋`}</div>
        <div style={{ fontSize: "0.8rem", color: C.textSub, lineHeight: 1.6, marginBottom: "1rem" }}>{audience === "paediatric" ? `Your care team at ${demoPatient.ward} is checking in on your child's recovery.` : `Your care team at ${demoPatient.ward} is checking in with you during your recovery.`}</div>
        <Lbl>Today's Check-In</Lbl>
        <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", margin: "0.6rem 0 1rem" }}>
          {["🫁", "💊", "🌡️", "🏠"].map((icon) => <div key={icon} style={{ width: 36, height: 36, borderRadius: "50%", background: C.surfaceHi, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.95rem" }}>{icon}</div>)}
        </div>
        {!mode && <Btn onClick={() => setMode("choose")}>Start Check-In</Btn>}
        {mode === "choose" && (
          <div>
            <div style={{ fontSize: "0.8rem", marginBottom: "0.6rem" }}>Would you like to speak your answers or select them?</div>
            <div style={{ display: "flex", gap: "0.5rem" }}><Btn sm style={{ flex: 1 }} onClick={() => setMode("done")}>🎤 Speak</Btn><Btn sm v="ghost" style={{ flex: 1 }} onClick={() => setMode("done")}>👆 Select</Btn></div>
          </div>
        )}
        {mode === "done" && <Card style={{ marginTop: "0.6rem", textAlign: "left" }}><div style={{ fontSize: "0.78rem", color: C.textSub, lineHeight: 1.55 }}>"Hello, it's the Discharge Hub calling from your care team. How are you getting on since you came home?" — a natural, open conversation, not a checklist. This connects into the same automated check-in shown in the Clinical View.</div></Card>}
      </Card>

      <div style={{ fontSize: "0.68rem", fontWeight: 700, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0.9rem 0 0.4rem" }}>{audience === "paediatric" ? "👶 My Child's Recovery" : "🏠 My Discharge Plan"}</div>
      <Card>
        {[
          [audience === "paediatric" ? "Why my child was in hospital" : "Why I was in hospital", demoPatient.condition],
          ["Treatment received", plan.treatment],
          ["What happens next", plan.whatNext],
          [audience === "paediatric" ? "Who's looking after my child" : "Who's looking after me", `${team.nurse} (nurse) · ${team.medical} (medical escalation)`],
          ["Community services involved", team.community],
          [audience === "paediatric" ? "When to seek emergency help" : "When to seek urgent help", plan.urgent],
        ].map(([l, v]) => (
          <div key={l} style={{ padding: "0.4rem 0", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ fontSize: "0.68rem", color: C.textDim, textTransform: "uppercase" }}>{l}</div>
            <div style={{ fontSize: "0.8rem", marginTop: "0.1rem" }}>{v}</div>
          </div>
        ))}
        <div style={{ paddingTop: "0.4rem" }}>
          <div style={{ fontSize: "0.68rem", color: C.textDim, textTransform: "uppercase", marginBottom: "0.25rem" }}>{audience === "paediatric" ? "Medicines" : "My medications"}</div>
          {plan.medications.map((m) => <div key={m} style={{ fontSize: "0.78rem", padding: "0.1rem 0" }}>💊 {m}</div>)}
        </div>
        <div style={{ paddingTop: "0.4rem" }}>
          <div style={{ fontSize: "0.68rem", color: C.textDim, textTransform: "uppercase", marginBottom: "0.25rem" }}>{audience === "paediatric" ? "Warning signs to watch for" : "Symptoms to watch for"}</div>
          <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>{track.monitor.map((m) => <Tag key={m} v="info">{m}</Tag>)}</div>
        </div>
      </Card>

      <div style={{ fontSize: "0.68rem", fontWeight: 700, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0.9rem 0 0.4rem" }}>📚 {audience === "paediatric" ? "Caring for Your Child" : "My Health Information"}</div>
      <Card style={{ borderLeft: `3px solid ${trackColor(track)}` }}>
        <div style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: "0.5rem" }}>{edu.title}</div>
        {edu.points.map((p, i) => <div key={i} style={{ fontSize: "0.78rem", color: C.textSub, padding: "0.22rem 0", lineHeight: 1.55 }}>• {p}</div>)}
        <div style={{ fontSize: "0.66rem", color: C.textDim, marginTop: "0.4rem", fontStyle: "italic" }}>Personalised to this patient's diagnosis — replaces generic paper leaflets that can be lost, forgotten, or hard to understand.</div>
      </Card>

      <Card>
        <div style={{ fontWeight: 700, fontSize: "0.82rem", marginBottom: "0.4rem" }}>Need help?</div>
        <div style={{ fontSize: "0.78rem", color: C.textSub }}>📞 Call your care team — details in your discharge letter.</div>
      </Card>
      <Card style={{ background: C.redBg, borderLeft: `3px solid ${C.red}` }}>
        <div style={{ fontWeight: 700, fontSize: "0.82rem", color: C.red, marginBottom: "0.3rem" }}>Emergency?</div>
        <div style={{ fontSize: "0.78rem", color: C.red }}>If you are experiencing a medical emergency, use your local emergency service. The Discharge Hub does not replace emergency care.</div>
      </Card>
      <Btn v="ghost" onClick={onBack}>← Back to Clinical View</Btn>
    </div>
  );
}
