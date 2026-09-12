import { C, Lbl } from "../theme.jsx";

export default function MoreScreen({ onNavigate }) {
  const sections = [
    { t: "Insights", items: [["📊", "Analytics & Outcomes", "analytics"], ["📈", "Evidence & Evaluation", "evidence"]] },
    { t: "Monitoring", items: [["🩺", "GuardBand Simulator", "guardband-sim"], ["📡", "Monitoring Overview", "monitoring-overview"]] },
    { t: "Care Setup", items: [["👥", "Care Team Directory", "team"]] },
    { t: "Patient Experience", items: [["🧑", "Patient View (Preview)", "patientview"]] },
  ];
  return (
    <div>
      <h3 style={{ marginBottom: "0.65rem", fontWeight: 800 }}>More</h3>
      {sections.map((sec) => (
        <div key={sec.t}>
          <Lbl>{sec.t}</Lbl>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "0.45rem", marginBottom: "0.65rem" }}>
            {sec.items.map(([icon, label, sc]) => (
              <button key={sc} onClick={() => onNavigate(sc)} style={{ background: C.surfaceHi, border: `1px solid ${C.border}`, borderRadius: 14, padding: "0.75rem 0.4rem", textAlign: "center", cursor: "pointer", fontFamily: "inherit" }}>
                <div style={{ fontSize: "1.4rem" }}>{icon}</div>
                <div style={{ fontSize: "0.62rem", color: C.textSub, marginTop: "0.15rem" }}>{label}</div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
