import { useState } from "react";
import { C, Card, Tag, PATIENT_STATUS_STYLE } from "../theme.jsx";

const FILTERS = [
  ["all", "All"],
  ["watch", "Watch"],
  ["concern", "Concern"],
  ["urgent_review", "Urgent"],
  ["active_safety_event", "Safety Events"],
];

// Population-level monitoring view (§16/17 of the brief) — simple counts +
// filter over the existing patient list, no separate data source.
export default function MonitoringOverview({ patients, onBack, onOpenPatient }) {
  const [filter, setFilter] = useState("all");
  const counts = {
    stable: patients.filter((p) => p.patientStatus === "stable").length,
    watch: patients.filter((p) => p.patientStatus === "watch").length,
    concern: patients.filter((p) => p.patientStatus === "concern").length,
    urgent_review: patients.filter((p) => p.patientStatus === "urgent_review").length,
    active_safety_event: patients.filter((p) => p.patientStatus === "active_safety_event").length,
  };
  const shown = filter === "all" ? patients : patients.filter((p) => p.patientStatus === filter);

  return (
    <div>
      <h3 style={{ fontWeight: 800, marginBottom: "0.6rem" }}>📡 Patient Monitoring Overview</h3>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.7rem" }}>
        <Card style={{ textAlign: "center" }}><div style={{ fontSize: "1.6rem", fontWeight: 800 }}>{patients.length}</div><div style={{ fontSize: "0.62rem", color: C.textDim }}>ACTIVE PATIENTS</div></Card>
        <Card style={{ textAlign: "center" }}><div style={{ fontSize: "1.6rem", fontWeight: 800, color: C.green }}>{counts.stable}</div><div style={{ fontSize: "0.62rem", color: C.textDim }}>STABLE</div></Card>
        <Card style={{ textAlign: "center" }}><div style={{ fontSize: "1.6rem", fontWeight: 800, color: C.blue }}>{counts.watch}</div><div style={{ fontSize: "0.62rem", color: C.textDim }}>WATCH</div></Card>
        <Card style={{ textAlign: "center" }}><div style={{ fontSize: "1.6rem", fontWeight: 800, color: C.amber }}>{counts.concern}</div><div style={{ fontSize: "0.62rem", color: C.textDim }}>CONCERN</div></Card>
        <Card style={{ textAlign: "center" }}><div style={{ fontSize: "1.6rem", fontWeight: 800, color: C.red }}>{counts.urgent_review}</div><div style={{ fontSize: "0.62rem", color: C.textDim }}>URGENT REVIEW</div></Card>
        <Card style={{ textAlign: "center" }}><div style={{ fontSize: "1.6rem", fontWeight: 800, color: C.red }}>{counts.active_safety_event}</div><div style={{ fontSize: "0.62rem", color: C.textDim }}>ACTIVE SAFETY EVENTS</div></Card>
      </div>

      <div style={{ display: "flex", gap: "0.3rem", marginBottom: "0.6rem", overflowX: "auto" }}>
        {FILTERS.map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} style={{ padding: "0.22rem 0.55rem", borderRadius: 50, border: filter === k ? "none" : `1px solid ${C.border}`, background: filter === k ? C.teal : C.surfaceHi, color: filter === k ? C.bg : C.textSub, fontSize: "0.68rem", fontWeight: filter === k ? 700 : 400, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0 }}>{l}</button>
        ))}
      </div>

      {shown.length === 0 && <Card><div style={{ fontSize: "0.8rem", color: C.textSub, textAlign: "center" }}>No patients match this filter.</div></Card>}
      {shown.map((p) => {
        const [scol, sicon, slabel] = PATIENT_STATUS_STYLE[p.patientStatus] || PATIENT_STATUS_STYLE.stable;
        return (
          <Card key={p.id} onClick={() => onOpenPatient(p.id)} style={{ borderLeft: `3px solid ${scol}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.85rem" }}>{p.name} <span style={{ fontSize: "0.64rem", color: C.textDim, fontWeight: 400 }}>{p.demoId}</span></div>
                <div style={{ fontSize: "0.72rem", color: C.textSub }}>{p.ward}</div>
              </div>
              <Tag v={p.patientStatus === "stable" ? "success" : p.patientStatus === "watch" ? "info" : p.patientStatus === "concern" ? "warning" : "danger"}>{sicon} {slabel}</Tag>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
