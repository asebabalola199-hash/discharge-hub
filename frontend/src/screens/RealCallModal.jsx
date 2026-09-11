import { useEffect, useRef, useState } from "react";
import { C, Card, Btn, Tag, initials } from "../theme.jsx";
import { useConfig } from "../hooks.js";
import { api } from "../api.js";

const TERMINAL = ["completed", "no-answer", "busy", "failed"];
const POLL_MS = 2000;

// A REAL automated check-in call, placed via Twilio, driven live by Claude.
// Unlike the scripted demo modal, nothing here is pre-written: this polls
// the server for what is actually happening on the call as it happens, then
// shows the same signals/assessment the backend actually extracted once it
// ends — via the identical downstream pipeline (logic/checkinResult.js).
export default function RealCallModal({ patient, onClose, onComplete }) {
  const cfg = useConfig();
  const track = cfg.tracks[patient.track];

  const [callId, setCallId] = useState(null);
  const [call, setCall] = useState(null); // { status, endedReason, turns }
  const [error, setError] = useState(null);
  const [finalPatient, setFinalPatient] = useState(null);
  const pollRef = useRef(null);
  const notifiedRef = useRef(false);

  useEffect(() => {
    let live = true;
    api
      .startRealCall(patient.id)
      .then((r) => live && setCallId(r.callId))
      .catch((e) => live && setError(e));
    return () => { live = false; };
  }, [patient.id]);

  useEffect(() => {
    if (!callId) return;
    let live = true;
    async function poll() {
      try {
        const c = await api.pollRealCall(patient.id, callId);
        if (!live) return;
        setCall(c);
        if (TERMINAL.includes(c.status)) {
          clearInterval(pollRef.current);
          if (!notifiedRef.current) {
            notifiedRef.current = true;
            onComplete();
            api.patient(patient.id).then((p) => live && setFinalPatient(p)).catch(() => {});
          }
        }
      } catch (e) {
        if (live) { setError(e); clearInterval(pollRef.current); }
      }
    }
    poll();
    pollRef.current = setInterval(poll, POLL_MS);
    return () => { live = false; clearInterval(pollRef.current); };
  }, [callId]); // eslint-disable-line

  const done = call && TERMINAL.includes(call.status);
  const noAnswer = call && ["no-answer", "busy", "failed"].includes(call.status);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(6,13,24,0.97)", zIndex: 999, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1.2rem", fontFamily: "inherit" }}>
      <div style={{ width: "100%", maxWidth: 400, background: C.surface, borderRadius: 24, border: `1px solid ${C.border}`, padding: "1.3rem", maxHeight: "92vh", overflowY: "auto" }}>
        <div style={{ textAlign: "center", marginBottom: "0.8rem" }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: C.redBg, border: `2px solid ${C.red}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.4rem", margin: "0 auto 0.4rem" }}>📱</div>
          <div style={{ fontWeight: 700, fontSize: "0.88rem" }}>{track.label} — Real Automated Call</div>
          <div style={{ fontSize: "0.7rem", color: C.textSub, marginTop: "0.1rem" }}>
            {!call ? `Dialling ${patient.phone}…` : done ? (noAnswer ? `No answer (${call.status})` : "Call complete") : "Call in progress · live"}
          </div>
          <Tag v="danger">Live — real phone call</Tag>
        </div>

        {error && (
          <Card style={{ background: C.redBg, borderLeft: `3px solid ${C.red}` }}>
            <div style={{ fontSize: "0.8rem", color: C.red, fontWeight: 700 }}>Couldn't place the call</div>
            <div style={{ fontSize: "0.72rem", color: C.textSub, marginTop: "0.3rem" }}>{String(error.message || error)}</div>
          </Card>
        )}

        {!error && noAnswer && (
          <div style={{ background: C.bg, borderRadius: 14, padding: "1.1rem", textAlign: "center" }}>
            <div style={{ fontSize: "1.5rem", marginBottom: "0.4rem" }}>📵</div>
            <div style={{ fontSize: "0.8rem", color: C.textSub }}>Twilio reported: {call.status}</div>
          </div>
        )}

        {!error && !noAnswer && (
          <>
            <div style={{ fontSize: "0.64rem", color: C.textDim, textTransform: "uppercase", fontWeight: 700, marginBottom: "0.3rem" }}>Live Conversation</div>
            <div style={{ background: C.bg, borderRadius: 14, padding: "0.7rem", minHeight: 160, maxHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "0.7rem" }}>
              {(!call || call.turns.length === 0) && <div style={{ textAlign: "center", color: C.textDim, fontSize: "0.7rem", paddingTop: "3rem" }}>Connecting…</div>}
              {call && call.turns.map((l, i) => (
                <div key={i} style={{ display: "flex", flexDirection: l.speaker === "ai" ? "row" : "row-reverse", gap: "0.35rem", alignItems: "flex-end" }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", flexShrink: 0, background: l.speaker === "ai" ? C.blueBg : C.tealBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.62rem" }}>{l.speaker === "ai" ? "🤖" : initials(patient.name)}</div>
                  <div style={{ background: l.speaker === "ai" ? C.surfaceHi : C.tealBg, borderRadius: l.speaker === "ai" ? "12px 12px 12px 3px" : "12px 12px 3px 12px", padding: "0.42rem 0.6rem", fontSize: "0.72rem", color: C.text, lineHeight: 1.45, maxWidth: "82%" }}>{l.text}</div>
                </div>
              ))}
            </div>

            {done && finalPatient && (
              <>
                <div style={{ fontSize: "0.64rem", color: C.textDim, textTransform: "uppercase", fontWeight: 700, marginBottom: "0.3rem" }}>Extracted Information</div>
                <Card style={{ marginBottom: "0.5rem" }}>
                  {finalPatient.signals.map(([sig, base, cur, col]) => (
                    <div key={sig} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.22rem 0", borderBottom: `1px solid ${C.border}` }}>
                      <span style={{ fontSize: "0.74rem" }}>{sig}</span>
                      <Tag v={col === "red" ? "danger" : col === "amber" ? "warning" : col === "green" ? "success" : "neutral"}>{cur}</Tag>
                    </div>
                  ))}
                </Card>
                <Card style={{ borderLeft: `3px solid ${finalPatient.pathwayStatus === "red" ? C.red : finalPatient.pathwayStatus === "amber" ? C.amber : C.green}` }}>
                  <div style={{ fontSize: "0.64rem", color: C.textDim, textTransform: "uppercase", marginBottom: "0.2rem" }}>Risk Assessment</div>
                  <Tag v={finalPatient.pathwayStatus === "red" ? "danger" : finalPatient.pathwayStatus === "amber" ? "warning" : "success"}>{finalPatient.pathwayStatus === "red" ? "🔴" : finalPatient.pathwayStatus === "amber" ? "🟠" : "🟢"} {finalPatient.flagged ? "Review required" : "Continue pathway"}</Tag>
                </Card>
              </>
            )}
            {done && !finalPatient && <div style={{ fontSize: "0.74rem", color: C.textSub, textAlign: "center" }}>Extracting signals from the call…</div>}
          </>
        )}

        <Btn v={done || error ? "primary" : "ghost"} style={{ marginTop: "0.7rem" }} onClick={onClose}>{done || error ? "✓ Done" : "Close"}</Btn>
      </div>
    </div>
  );
}
