import { useState } from "react";
import { C, Card, Btn, Tag, Inp, Lbl } from "../theme.jsx";
import { useConfig, useAsync } from "../hooks.js";
import { api } from "../api.js";
import { Loading, ErrorNote } from "../components.jsx";

// Pathway Builder with the Draft → Pending Approval → Published workflow
// (FR-2.2–2.5). Only approved, published pathways can be used for monitoring.
export default function PathwayBuilderScreen() {
  const { checkpoints, pathwayQuestions } = useConfig();
  const { data: pathways, loading, error, refetch } = useAsync(api.pathways, []);

  const [building, setBuilding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("COPD Discharge");
  const [eligibility, setEligibility] = useState({ "COPD exacerbation": true, "Discharged home": true, Adult: true });
  const [checkpointQs, setCheckpointQs] = useState({
    "2h": { Breathlessness: true, "Inhaler use": true },
    "24h": { Breathlessness: true, "Eating/drinking": true },
    "48h": { Recovery: true },
    "72h": { "General wellbeing": true },
  });
  const [redFlag, setRedFlag] = useState("Breathlessness at rest");
  const [amberFlag, setAmberFlag] = useState("Increased rescue inhaler use");

  const toggleElig = (k) => setEligibility((e) => ({ ...e, [k]: !e[k] }));
  const toggleQ = (cp, q) => setCheckpointQs((s) => ({ ...s, [cp]: { ...s[cp], [q]: !((s[cp] || {})[q]) } }));

  async function saveDraft() {
    setBusy(true);
    try {
      await api.createPathway({ name, config: { eligibility, checkpointQs, redFlag, amberFlag } });
      await refetch();
      setBuilding(false);
    } finally {
      setBusy(false);
    }
  }
  async function submitForApproval(id) { await api.submitPathway(id); refetch(); }
  async function approve(id) { await api.approvePathway(id); refetch(); }

  const statusTag = (s) =>
    s === "published" ? <Tag v="success">🟢 Published</Tag> :
    s === "pending_approval" ? <Tag v="warning">🟠 Pending Clinical Approval</Tag> :
    <Tag v="neutral">⚪ Draft</Tag>;

  if (building) {
    return (
      <div>
        <h3 style={{ marginBottom: "0.2rem", fontWeight: 800 }}>🧩 Create Pathway</h3>
        <p style={{ color: C.textSub, fontSize: "0.76rem", marginBottom: "0.7rem" }}>Configurable per hospital — not hard-coded. Draft pathways require clinical approval before use.</p>
        <Card><Lbl>Pathway name</Lbl><Inp value={name} onChange={(e) => setName(e.target.value)} /></Card>
        <Card>
          <Lbl>Patient eligibility</Lbl>
          {Object.keys(eligibility).map((k) => (
            <div key={k} onClick={() => toggleElig(k)} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.22rem 0", cursor: "pointer" }}>
              <div style={{ width: 17, height: 17, borderRadius: 5, border: `2px solid ${eligibility[k] ? C.teal : C.border}`, background: eligibility[k] ? C.teal : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{eligibility[k] && <span style={{ color: C.bg, fontSize: "0.58rem", fontWeight: 800 }}>✓</span>}</div>
              <span style={{ fontSize: "0.78rem" }}>{k}</span>
            </div>
          ))}
        </Card>
        <Card>
          <Lbl>Monitoring by checkpoint</Lbl>
          {checkpoints.map((cp) => (
            <div key={cp} style={{ marginBottom: "0.5rem" }}>
              <div style={{ fontSize: "0.74rem", fontWeight: 700, color: C.teal, marginBottom: "0.2rem" }}>{cp}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                {pathwayQuestions.map((q) => {
                  const on = !!(checkpointQs[cp] || {})[q];
                  return <button key={q} onClick={() => toggleQ(cp, q)} style={{ padding: "0.18rem 0.5rem", borderRadius: 20, border: `1px solid ${on ? C.teal : C.border}`, background: on ? C.tealBg : C.surfaceHi, color: on ? C.teal : C.textDim, fontSize: "0.66rem", cursor: "pointer", fontFamily: "inherit" }}>{q}</button>;
                })}
              </div>
            </div>
          ))}
        </Card>
        <Card>
          <Lbl>Red flag → action</Lbl><Inp value={redFlag} onChange={(e) => setRedFlag(e.target.value)} />
          <div style={{ fontSize: "0.7rem", color: C.red, marginTop: "0.3rem" }}>→ 🔴 Clinical review</div>
          <Lbl>Amber signal → action</Lbl><Inp value={amberFlag} onChange={(e) => setAmberFlag(e.target.value)} />
          <div style={{ fontSize: "0.7rem", color: C.amber, marginTop: "0.3rem" }}>→ 🟠 Nurse review</div>
          <div style={{ fontSize: "0.7rem", color: C.green, marginTop: "0.4rem" }}>Otherwise → 🟢 Continue pathway</div>
        </Card>
        <Btn onClick={saveDraft} style={{ opacity: busy ? 0.6 : 1 }}>{busy ? "Saving…" : "💾 Save as Draft"}</Btn>
        <Btn v="ghost" style={{ marginTop: "0.5rem" }} onClick={() => setBuilding(false)}>← Cancel</Btn>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
        <h3 style={{ margin: 0, fontWeight: 800 }}>🧩 Pathways</h3>
        <Btn sm onClick={() => setBuilding(true)}>+ New</Btn>
      </div>
      <p style={{ color: C.textSub, fontSize: "0.76rem", marginBottom: "0.7rem" }}>Only approved, published pathways can be used for patient monitoring.</p>
      {loading && !pathways && <Loading label="Loading pathways…" />}
      {error && <ErrorNote error={error} onRetry={refetch} />}
      {(pathways || []).map((p) => (
        <Card key={p.id}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ fontWeight: 700, fontSize: "0.85rem" }}>{p.name}</div>
            {statusTag(p.status)}
          </div>
          <div style={{ fontSize: "0.72rem", color: C.textSub, marginTop: "0.3rem" }}>Created by {p.createdBy}</div>
          <div style={{ fontSize: "0.72rem", color: C.textSub }}>Clinical owner: {p.owner}</div>
          <div style={{ fontSize: "0.68rem", color: C.textDim }}>Last reviewed: {p.lastReviewed}</div>
          {p.status === "draft" && <Btn sm style={{ marginTop: "0.5rem" }} onClick={() => submitForApproval(p.id)}>Submit for Clinical Approval</Btn>}
          {p.status === "pending_approval" && <Btn sm v="ghost" style={{ marginTop: "0.5rem" }} onClick={() => approve(p.id)}>✅ Approve (as Dr Ahmed — demo)</Btn>}
        </Card>
      ))}
    </div>
  );
}
