import { C, Card, Btn, Tag, Avatar, KIND_COLOR } from "../theme.jsx";
import { useConfig } from "../hooks.js";

// Clinical Worklist & Orchestration. The system recommends; a clinician
// always reviews and decides (FR-5.1–5.3).
export default function WorklistScreen({ patients, onExecute, onOpenPatient }) {
  const { tracks } = useConfig();
  return (
    <div>
      <h3 style={{ marginBottom: "0.2rem", fontWeight: 800 }}>🧭 Clinical Worklist & Orchestration</h3>
      <p style={{ color: C.textSub, fontSize: "0.76rem", marginBottom: "0.5rem" }}>The system identifies patterns and recommends a next step. A clinician always reviews and decides.</p>
      <Card style={{ background: C.surfaceHi, marginBottom: "0.7rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.66rem", color: C.textSub, textAlign: "center", flexWrap: "wrap", gap: "0.2rem" }}>
          <span>AI identifies</span><span>→</span><span>System recommends</span><span>→</span><span>Clinician reviews</span><span>→</span><span>Clinician acts</span>
        </div>
      </Card>
      {patients.map((p) => {
        const rec = p.recommendation;
        return (
          <Card key={p.id} style={{ borderLeft: `3px solid ${KIND_COLOR[rec.kind]}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ display: "flex", gap: "0.55rem", cursor: "pointer" }} onClick={() => onOpenPatient(p.id)}>
                <Avatar name={p.name} size={38} ring={KIND_COLOR[rec.kind]} />
                <div><div style={{ fontWeight: 700, fontSize: "0.85rem" }}>{p.name}</div><div style={{ fontSize: "0.66rem", color: C.textDim }}>{tracks[p.track].label} · {p.demoId}</div></div>
              </div>
              <span style={{ fontSize: "1.2rem" }}>{rec.icon}</span>
            </div>
            <div style={{ background: C.surfaceHi, borderRadius: 10, padding: "0.5rem 0.65rem", margin: "0.5rem 0" }}>
              <Tag v="purple">AI-assisted</Tag>
              <div style={{ fontSize: "0.82rem", fontWeight: 700, marginTop: "0.3rem" }}>{rec.label}</div>
              {rec.detail && <div style={{ fontSize: "0.72rem", color: C.textSub, marginTop: "0.15rem" }}>{rec.detail}</div>}
            </div>
            {rec.kind !== "done" ? (
              <Btn sm onClick={() => onExecute(p)}>{rec.kind === "call" ? "▶ Start Check-In" : "🩺 Open Clinical Review"}</Btn>
            ) : (
              <Tag v="success">Pathway complete</Tag>
            )}
          </Card>
        );
      })}
    </div>
  );
}
