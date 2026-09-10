import { useState } from "react";
import { C, Card, Btn, Tag, Avatar, STATUS_STYLE, trackColor } from "../theme.jsx";
import { useConfig } from "../hooks.js";

// Patient Journeys list — filterable by specialty track.
export default function PatientsScreen({ patients, onOpenPatient, onNewDischarge, onUploadSummary }) {
  const { tracks, pipeline } = useConfig();
  const [filter, setFilter] = useState("all");
  const filtered = filter === "all" ? patients : patients.filter((p) => p.track === filter);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
        <h3 style={{ margin: 0, fontWeight: 800 }}>Patient Journeys</h3>
        <Tag v="neutral">SYNTHETIC DATA</Tag>
      </div>
      <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.55rem" }}>
        <Btn sm style={{ flex: 1 }} onClick={onNewDischarge}>+ New Discharge Plan</Btn>
        <Btn sm v="ghost" style={{ flex: 1 }} onClick={onUploadSummary}>📄 Sync from EHR</Btn>
      </div>
      <div style={{ display: "flex", gap: "0.3rem", marginBottom: "0.6rem", overflowX: "auto" }}>
        <button onClick={() => setFilter("all")} style={{ padding: "0.25rem 0.6rem", borderRadius: 50, border: filter === "all" ? "none" : `1px solid ${C.border}`, background: filter === "all" ? C.teal : C.surfaceHi, color: filter === "all" ? C.bg : C.textSub, fontSize: "0.7rem", fontWeight: filter === "all" ? 700 : 400, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 }}>All</button>
        {Object.values(tracks).map((t) => (
          <button key={t.key} onClick={() => setFilter(t.key)} style={{ padding: "0.25rem 0.6rem", borderRadius: 50, border: filter === t.key ? "none" : `1px solid ${C.border}`, background: filter === t.key ? trackColor(t) : C.surfaceHi, color: filter === t.key ? C.bg : C.textSub, fontSize: "0.7rem", fontWeight: filter === t.key ? 700 : 400, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0 }}>{t.icon} {t.label}</button>
        ))}
      </div>
      {filtered.map((p) => {
        const [scol, sicon, slabel] = STATUS_STYLE[p.pathwayStatus];
        return (
          <Card key={p.id} onClick={() => onOpenPatient(p.id)} style={{ borderLeft: `3px solid ${scol}` }}>
            <div style={{ display: "flex", gap: "0.65rem", alignItems: "flex-start" }}>
              <Avatar name={p.name} size={44} ring={scol} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div style={{ fontWeight: 800, fontSize: "0.9rem" }}>{p.name} <span style={{ fontSize: "0.62rem", color: C.textDim, fontWeight: 400 }}>{p.demoId}</span></div>
                  <span style={{ fontSize: "0.68rem", color: C.textDim }}>{pipeline[p.pipelineStage - 1]}</span>
                </div>
                <div style={{ fontSize: "0.72rem", color: C.textSub, marginTop: "0.1rem" }}>{tracks[p.track].icon} {tracks[p.track].label} · {p.ward}</div>
                <div style={{ fontSize: "0.72rem", color: C.textDim, marginTop: "0.15rem" }}>{p.condition}</div>
                <div style={{ marginTop: "0.35rem", display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
                  <Tag v={p.pathwayStatus === "red" ? "danger" : p.pathwayStatus === "amber" ? "warning" : p.pathwayStatus === "green" ? "success" : "neutral"}>{sicon} {slabel}</Tag>
                  <Tag v="neutral">Baseline: {p.baselineRisk}</Tag>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
