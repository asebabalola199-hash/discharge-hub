import { C, Card, Btn, Lbl } from "../theme.jsx";
import { useAsync } from "../hooks.js";
import { api } from "../api.js";
import { Loading, ErrorNote } from "../components.jsx";

export default function AnalyticsScreen({ onBack }) {
  const { data, loading, error, refetch } = useAsync(api.analytics, []);

  if (loading && !data) return <Loading label="Loading analytics…" />;
  if (error) return <ErrorNote error={error} onRetry={refetch} />;

  const { live, illustrative } = data;
  const liveRows = [
    ["Patients monitored", live.patientsMonitored],
    ["Patients on pathway", live.onPathway],
    ["Check-ins completed", live.checkInsCompleted],
    ["Alerts generated", live.alertsGenerated],
    ["Clinical reviews", live.clinicalReviews],
    ["Unable to contact", live.unableToContact],
    ["Escalations to medical team", live.escalations],
  ];

  return (
    <div>
      <h3 style={{ marginBottom: "0.2rem", fontWeight: 800 }}>📊 Analytics & Outcomes</h3>
      <p style={{ color: C.textSub, fontSize: "0.76rem", marginBottom: "0.7rem" }}>{illustrative.note}</p>

      <Lbl>This demo instance (live from the database)</Lbl>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.4rem" }}>
        {liveRows.map(([l, v]) => (
          <Card key={l} style={{ padding: "0.65rem 0.55rem" }}><div style={{ fontSize: "1.1rem", fontWeight: 800, color: C.green }}>{v}</div><div style={{ fontSize: "0.6rem", color: C.textDim, marginTop: "0.2rem" }}>{l}</div></Card>
        ))}
      </div>

      <Lbl>Volume (illustrative platform scale)</Lbl>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.4rem" }}>
        {illustrative.volume.map(([l, v]) => (
          <Card key={l} style={{ padding: "0.65rem 0.55rem" }}><div style={{ fontSize: "1.1rem", fontWeight: 800, color: C.teal }}>{v}</div><div style={{ fontSize: "0.6rem", color: C.textDim, marginTop: "0.2rem" }}>{l}</div></Card>
        ))}
      </div>

      <Lbl>Operational Impact (illustrative)</Lbl>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.4rem" }}>
        {illustrative.operational.map(([l, v]) => (
          <Card key={l} style={{ padding: "0.65rem 0.55rem" }}><div style={{ fontSize: "1.1rem", fontWeight: 800, color: C.blue }}>{v}</div><div style={{ fontSize: "0.6rem", color: C.textDim, marginTop: "0.2rem" }}>{l}</div></Card>
        ))}
      </div>

      <Card style={{ borderLeft: `3px solid ${C.amber}` }}>
        <div style={{ fontWeight: 700, marginBottom: "0.3rem" }}>Clinical Outcomes — Baseline vs. Discharge Hub Cohort</div>
        {illustrative.outcomes.map(([l, v]) => (
          <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "0.2rem 0", fontSize: "0.78rem" }}><span>{l}</span><span style={{ color: C.textDim }}>{v}</span></div>
        ))}
      </Card>
      <Btn v="ghost" style={{ marginTop: "0.5rem" }} onClick={onBack}>← Back</Btn>
    </div>
  );
}
