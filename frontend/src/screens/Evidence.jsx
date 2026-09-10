import { C, Card, Btn } from "../theme.jsx";
import { useAsync } from "../hooks.js";
import { api } from "../api.js";
import { Loading, ErrorNote } from "../components.jsx";

export default function EvidenceScreen({ onBack }) {
  const { data, loading, error, refetch } = useAsync(api.analytics, []);

  if (loading && !data) return <Loading label="Loading evaluation framework…" />;
  if (error) return <ErrorNote error={error} onRetry={refetch} />;

  const ev = data.evidence;

  return (
    <div>
      <h3 style={{ marginBottom: "0.2rem", fontWeight: 800 }}>📈 Evidence & Evaluation</h3>
      <Card style={{ background: C.amberBg, borderLeft: `3px solid ${C.amber}` }}><div style={{ fontWeight: 700, color: C.amber }}>🟠 Pilot status: {ev.pilotStatus}</div></Card>
      <Card>
        <div style={{ fontWeight: 700, marginBottom: "0.3rem" }}>Primary Outcome</div>
        <div style={{ fontSize: "0.8rem", color: C.textSub }}>{ev.primaryOutcome}</div>
      </Card>
      <Card>
        <div style={{ fontWeight: 700, marginBottom: "0.4rem" }}>Secondary Outcomes</div>
        {ev.secondaryOutcomes.map((o) => <div key={o} style={{ fontSize: "0.78rem", color: C.textSub, padding: "0.15rem 0" }}>• {o}</div>)}
      </Card>
      {ev.frameworkReady && (
        <Card style={{ background: C.greenBg, borderLeft: `3px solid ${C.green}`, textAlign: "center" }}><div style={{ fontWeight: 700, color: C.green }}>✅ Pilot evaluation framework ready</div></Card>
      )}
      <Btn v="ghost" style={{ marginTop: "0.5rem" }} onClick={onBack}>← Back</Btn>
    </div>
  );
}
