import { useEffect, useState } from "react";
import { C, Card, Btn, Tag, initials } from "../theme.jsx";
import { useConfig } from "../hooks.js";
import { api } from "../api.js";

// Automated Check-In (FR-3). The scripted conversation is fetched from the
// API (read-only), animated here, and then the check-in is actually
// performed by the backend — which extracts the structured signals and
// DERIVES the Red/Amber/Green status. The panel shows exactly what the API
// returned, so the assessment is traceable to the call, not computed here.
export default function LiveCallModal({ patient, onClose, onComplete }) {
  const cfg = useConfig();
  const track = cfg.tracks[patient.track];

  const [script, setScript] = useState(null);
  const [noAnswer, setNoAnswer] = useState(false);
  const [attempt, setAttempt] = useState(patient.contactAttempts + 1);
  const [line, setLine] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const done = !!result;

  // 1 — fetch the scripted conversation for this patient's next check-in
  useEffect(() => {
    let live = true;
    api
      .checkInScript(patient.id)
      .then((d) => {
        if (!live) return;
        setNoAnswer(d.noAnswer);
        setAttempt(d.contactAttempt);
        setScript(d.script);
      })
      .catch((e) => live && setError(e));
    return () => { live = false; };
  }, [patient.id]);

  // 2 — animate the conversation, then 3 — perform the check-in
  useEffect(() => {
    if (!script || result || error) return;
    const run = () => api.runCheckIn(patient.id).then(setResult).catch(setError);
    if (noAnswer) {
      const t = setTimeout(run, 1400);
      return () => clearTimeout(t);
    }
    if (line >= script.length) {
      const t = setTimeout(run, 700);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setLine((l) => l + 1), line === 0 ? 550 : 1600);
    return () => clearTimeout(t);
  }, [script, line, noAnswer, result, error, patient.id]);

  // Refresh the app's data once the check-in has been recorded
  useEffect(() => { if (result) onComplete(); }, [result]); // eslint-disable-line

  const extracted = result?.extracted || null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(6,13,24,0.97)", zIndex: 999, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1.2rem", fontFamily: "inherit" }}>
      <div style={{ width: "100%", maxWidth: 400, background: C.surface, borderRadius: 24, border: `1px solid ${C.border}`, padding: "1.3rem", maxHeight: "92vh", overflowY: "auto" }}>
        <div style={{ textAlign: "center", marginBottom: "0.8rem" }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: track.colToken ? `${trackHex(track, C)}22` : C.blueBg, border: `2px solid ${trackHex(track, C)}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", margin: "0 auto 0.4rem" }}>{track.icon}</div>
          <div style={{ fontWeight: 700, fontSize: "0.88rem" }}>{track.label} — Automated Check-In</div>
          <div style={{ fontSize: "0.7rem", color: C.textSub, marginTop: "0.1rem" }}>{done ? (noAnswer ? "No answer" : "Call complete") : `Connecting · ${patient.name}`}</div>
          {!done && !noAnswer && <Tag v="info">Identity confirmation required</Tag>}
        </div>

        {error && (
          <Card style={{ background: C.redBg, borderLeft: `3px solid ${C.red}` }}>
            <div style={{ fontSize: "0.8rem", color: C.red, fontWeight: 700 }}>Check-in failed</div>
            <div style={{ fontSize: "0.72rem", color: C.textSub, marginTop: "0.3rem" }}>{String(error.message || error)}</div>
          </Card>
        )}

        {!error && noAnswer ? (
          <div style={{ background: C.bg, borderRadius: 14, padding: "1.1rem", textAlign: "center" }}>
            <div style={{ fontSize: "1.5rem", marginBottom: "0.4rem" }}>📵</div>
            <div style={{ fontSize: "0.8rem", color: C.textSub }}>{done ? `No answer — attempt ${attempt} of 2` : "Dialling…"}</div>
          </div>
        ) : !error ? (
          <>
            <div style={{ fontSize: "0.64rem", color: C.textDim, textTransform: "uppercase", fontWeight: 700, marginBottom: "0.3rem" }}>Conversation</div>
            <div style={{ background: C.bg, borderRadius: 14, padding: "0.7rem", minHeight: 160, maxHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "0.7rem" }}>
              {(!script || line === 0) && <div style={{ textAlign: "center", color: C.textDim, fontSize: "0.7rem", paddingTop: "3rem" }}>Connecting…</div>}
              {script && script.slice(0, line).map((l, i) => (
                <div key={i} style={{ display: "flex", flexDirection: l.speaker === "ai" ? "row" : "row-reverse", gap: "0.35rem", alignItems: "flex-end" }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", flexShrink: 0, background: l.speaker === "ai" ? C.blueBg : C.tealBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.62rem" }}>{l.speaker === "ai" ? "🤖" : initials(patient.name)}</div>
                  <div style={{ background: l.speaker === "ai" ? C.surfaceHi : C.tealBg, borderRadius: l.speaker === "ai" ? "12px 12px 12px 3px" : "12px 12px 3px 12px", padding: "0.42rem 0.6rem", fontSize: "0.72rem", color: C.text, lineHeight: 1.45, maxWidth: "82%" }}>{l.text}</div>
                </div>
              ))}
            </div>

            {done && extracted && (
              <>
                <div style={{ fontSize: "0.64rem", color: C.textDim, textTransform: "uppercase", fontWeight: 700, marginBottom: "0.3rem" }}>Extracted Information</div>
                <Card style={{ marginBottom: "0.5rem" }}>
                  {extracted.signals.map(([sig, base, cur, col]) => (
                    <div key={sig} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.22rem 0", borderBottom: `1px solid ${C.border}` }}>
                      <span style={{ fontSize: "0.74rem" }}>{sig}</span>
                      <Tag v={col === "red" ? "danger" : col === "amber" ? "warning" : col === "green" ? "success" : "neutral"}>{cur}</Tag>
                    </div>
                  ))}
                </Card>
                <Card style={{ borderLeft: `3px solid ${extracted.status === "red" ? C.red : extracted.status === "amber" ? C.amber : C.green}` }}>
                  <div style={{ fontSize: "0.64rem", color: C.textDim, textTransform: "uppercase", marginBottom: "0.2rem" }}>Risk Assessment</div>
                  <Tag v={extracted.status === "red" ? "danger" : extracted.status === "amber" ? "warning" : "success"}>{extracted.status === "red" ? "🔴" : extracted.status === "amber" ? "🟠" : "🟢"} {extracted.flagged ? "Review required" : "Continue pathway"}</Tag>
                </Card>
              </>
            )}
          </>
        ) : null}

        <Btn v={done || error ? "primary" : "ghost"} style={{ marginTop: "0.7rem" }} onClick={onClose}>{done || error ? "✓ Done" : "Close"}</Btn>
      </div>
    </div>
  );
}

function trackHex(track, C) {
  return { blue: C.blue, amber: C.amber, teal: C.teal, purple: C.purple, green: C.green, red: C.red }[track.colToken] || C.blue;
}
