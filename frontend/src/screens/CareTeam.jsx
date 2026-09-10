import { C, Card, Btn } from "../theme.jsx";
import { useConfig } from "../hooks.js";

// Care Team Directory per ward (FR-9.1). Data comes from /api/care-team.
export default function CareTeamScreen({ onBack }) {
  const { careTeam } = useConfig();
  return (
    <div>
      <h3 style={{ marginBottom: "0.6rem", fontWeight: 800 }}>👥 Care Team Directory</h3>
      {Object.entries(careTeam).map(([ward, team]) => (
        <Card key={ward}>
          <div style={{ fontWeight: 700, marginBottom: "0.4rem", fontSize: "0.85rem" }}>{ward}</div>
          {[["👩‍⚕️", team.nurse, "Primary reviewer"], ["👨‍⚕️", team.medical, "Escalation"], ["🏠", team.community, "Community follow-up"]].map(([icon, who, role]) => (
            <div key={role} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.2rem 0" }}><span>{icon}</span><div style={{ fontSize: "0.78rem" }}>{who} <span style={{ color: C.textDim, fontSize: "0.7rem" }}>· {role}</span></div></div>
          ))}
        </Card>
      ))}
      <Btn v="ghost" style={{ marginTop: "0.5rem" }} onClick={onBack}>← Back</Btn>
    </div>
  );
}
