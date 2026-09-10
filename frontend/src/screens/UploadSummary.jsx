import { useState } from "react";
import { C, Card, Btn } from "../theme.jsx";
import { useConfig } from "../hooks.js";

// Sync Discharge Summary from EHR (FR-1.2). The connection is a SIMULATED
// TrakCare connection and is labelled as such throughout (FR-8.3, NFR-7).
// Mirrors the backend's EHR_DEMO_SUMMARY.
const DEMO = { name: "Thomas Kerr", age: 69, ward: "MAU", track: "acute", condition: "Community-acquired pneumonia, resolving. Background COPD." };

export default function UploadSummaryScreen({ onBack, onSave }) {
  const { tracks } = useConfig();
  const [stage, setStage] = useState("ready"); // ready | scanning | done
  const [saving, setSaving] = useState(false);

  function sync() {
    setStage("scanning");
    setTimeout(() => setStage("done"), 1400);
  }
  async function confirm() {
    setSaving(true);
    try { await onSave(); } finally { setSaving(false); }
  }

  return (
    <div>
      <h3 style={{ marginBottom: "0.2rem", fontWeight: 800 }}>📄 Sync Discharge Summary from EHR</h3>
      <Card style={{ background: C.amberBg, borderLeft: `3px solid ${C.amber}` }}><div style={{ fontSize: "0.7rem", fontWeight: 700, color: C.amber }}>🟠 DEMO ENVIRONMENT — simulated TrakCare connection</div></Card>
      {stage === "ready" && <Card style={{ textAlign: "center", padding: "1.4rem 1rem" }}><div style={{ fontSize: "2.4rem", marginBottom: "0.5rem" }}>📄</div><Btn sm onClick={sync}>🔄 Sync from TrakCare (Demo)</Btn></Card>}
      {stage === "scanning" && <Card style={{ textAlign: "center", padding: "1.6rem 1rem" }}><div style={{ width: 40, height: 40, border: `3px solid ${C.border}`, borderTop: `3px solid ${C.teal}`, borderRadius: "50%", animation: "spin 0.9s linear infinite", margin: "0 auto 0.8rem" }} /><div style={{ fontSize: "0.82rem", color: C.textSub }}>Reading discharge summary…</div></Card>}
      {stage === "done" && (
        <>
          <Card style={{ background: C.greenBg, borderLeft: `3px solid ${C.green}` }}><div style={{ fontWeight: 700, color: C.green }}>✅ Summary synced — draft care plan created</div></Card>
          <Card>
            <div style={{ fontWeight: 800, fontSize: "0.9rem" }}>{DEMO.name} · Age {DEMO.age}</div>
            <div style={{ fontSize: "0.78rem", color: C.textSub, marginTop: "0.2rem" }}>{DEMO.ward} · {tracks[DEMO.track].label}</div>
            <div style={{ fontSize: "0.78rem", color: C.text, marginTop: "0.3rem" }}>{DEMO.condition}</div>
          </Card>
          <Btn onClick={confirm} style={{ opacity: saving ? 0.6 : 1 }}>{saving ? "Adding…" : "✅ Confirm & Add to Journeys"}</Btn>
        </>
      )}
      <Btn v="ghost" style={{ marginTop: "0.5rem" }} onClick={onBack}>← Cancel</Btn>
    </div>
  );
}
