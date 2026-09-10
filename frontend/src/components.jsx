import { C, Tag } from "./theme.jsx";
import { useConfig } from "./hooks.js";

// Visual patient-journey timeline — the product's 9-stage spine. Ported from
// the prototype; the stage list now comes from /api/config.
export function JourneyTimeline({ stage }) {
  const { pipeline } = useConfig();
  return (
    <div>
      {pipeline.map((label, i) => {
        const n = i + 1;
        const done = n < stage, current = n === stage;
        const marker = done ? "✓" : current ? "●" : "○";
        const col = done ? C.teal : current ? C.red : C.textDim;
        return (
          <div key={label} style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 20 }}>
              <div style={{ width: 20, height: 20, borderRadius: "50%", background: done ? C.teal : current ? C.redBg : "transparent", border: `2px solid ${col}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", fontWeight: 800, color: done ? C.bg : col, flexShrink: 0 }}>{marker}</div>
              {n < pipeline.length && <div style={{ width: 2, height: 18, background: done ? C.teal : C.border }} />}
            </div>
            <div style={{ fontSize: "0.8rem", fontWeight: current ? 700 : 500, color: current ? C.text : done ? C.textSub : C.textDim, paddingBottom: "0.3rem" }}>
              {label}{current && <span style={{ marginLeft: "0.4rem" }}><Tag v="danger">In progress</Tag></span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Loading({ label = "Loading…" }) {
  return (
    <div style={{ textAlign: "center", padding: "3rem 1rem", color: C.textSub }}>
      <div style={{ width: 34, height: 34, border: `3px solid ${C.border}`, borderTop: `3px solid ${C.teal}`, borderRadius: "50%", animation: "spin 0.9s linear infinite", margin: "0 auto 0.8rem" }} />
      <div style={{ fontSize: "0.82rem" }}>{label}</div>
    </div>
  );
}

export function ErrorNote({ error, onRetry }) {
  return (
    <div style={{ margin: "1rem 0", background: C.redBg, border: `1px solid ${C.red}`, borderRadius: 12, padding: "0.9rem 1rem" }}>
      <div style={{ fontWeight: 700, color: C.red, fontSize: "0.82rem" }}>Couldn't reach the Discharge Hub API</div>
      <div style={{ fontSize: "0.75rem", color: C.textSub, marginTop: "0.3rem" }}>{String(error?.message || error)}</div>
      {onRetry && <button onClick={onRetry} style={{ marginTop: "0.6rem", background: C.surfaceHi, color: C.text, border: `1px solid ${C.border}`, borderRadius: 50, padding: "0.35rem 1rem", fontSize: "0.75rem", cursor: "pointer", fontFamily: "inherit" }}>Retry</button>}
    </div>
  );
}
