import { useState } from "react";
import { C, Card, Btn, Inp, Sel, Lbl } from "../theme.jsx";
import { useConfig } from "../hooks.js";

// New Discharge Plan — set up the post-discharge pathway before the patient
// leaves the ward (FR-1.1, FR-1.3–1.5).
export default function NewDischargeScreen({ onBack, onSave }) {
  const { tracks, durationOptions, telephonyEnabled } = useConfig();
  const [f, setF] = useState({ name: "", age: "", ward: "", track: "acute", condition: "", duration: "72h", method: "Automated voice call", language: "English", accessibility: [], phone: "" });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const toggleAccess = (opt) => setF((s) => ({ ...s, accessibility: s.accessibility.includes(opt) ? s.accessibility.filter((a) => a !== opt) : [...s.accessibility, opt] }));
  const valid = f.name.trim() && !saving;
  const track = tracks[f.track];

  async function save() {
    if (!f.name.trim()) return;
    setSaving(true);
    try { await onSave(f); } finally { setSaving(false); }
  }

  return (
    <div>
      <h3 style={{ marginBottom: "0.2rem", fontWeight: 800 }}>📋 New Discharge Plan</h3>
      <p style={{ color: C.textSub, fontSize: "0.76rem", marginBottom: "0.7rem" }}>Set up the patient's post-discharge pathway before they leave the ward.</p>
      <Card>
        <Lbl>Full name (demo)</Lbl><Inp value={f.name} onChange={set("name")} placeholder="e.g. Jean Forsyth" />
        <div style={{ display: "flex", gap: "0.4rem" }}>
          <div style={{ flex: 1 }}><Lbl>Age</Lbl><Inp type="number" value={f.age} onChange={set("age")} placeholder="71" /></div>
          <div style={{ flex: 1.5 }}><Lbl>Discharging ward</Lbl><Inp value={f.ward} onChange={set("ward")} placeholder="e.g. MAU" /></div>
        </div>
        <Lbl>Diagnosis / condition</Lbl><Inp value={f.condition} onChange={set("condition")} placeholder="e.g. Asthma exacerbation" />
      </Card>
      <Card style={{ borderLeft: `3px solid ${C.blue}` }}>
        <Lbl>Specialty track</Lbl>
        <Sel value={f.track} onChange={set("track")}>{Object.values(tracks).map((t) => <option key={t.key} value={t.key}>{t.label} — {t.sub}</option>)}</Sel>
        <Lbl>Monitoring period</Lbl>
        <Sel value={f.duration} onChange={set("duration")}>{durationOptions.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}</Sel>
        <div style={{ fontSize: "0.72rem", color: C.textSub, marginTop: "0.4rem" }}>Monitoring: {track.monitor.join(", ")}</div>
      </Card>
      <Card style={{ borderLeft: `3px solid ${C.purple}` }}>
        <Lbl>Patient communication preferences</Lbl>
        <div style={{ fontSize: "0.7rem", color: C.textSub, marginBottom: "0.3rem" }}>
          Phone number {telephonyEnabled ? "(a real automated call will be placed to this number)" : "(optional — real calling is not configured on this server)"}
        </div>
        <Inp value={f.phone} onChange={set("phone")} placeholder="+447700900123" />
        <div style={{ fontSize: "0.7rem", color: C.textSub, margin: "0.5rem 0 0.3rem" }}>Preferred method</div>
        <Sel value={f.method} onChange={set("method")}>{["Automated voice call", "SMS", "Patient portal"].map((m) => <option key={m}>{m}</option>)}</Sel>
        <div style={{ fontSize: "0.7rem", color: C.textSub, margin: "0.5rem 0 0.3rem" }}>Preferred language</div>
        <Sel value={f.language} onChange={set("language")}>{["English", "Welsh", "Polish", "Urdu", "Punjabi", "Arabic", "Other"].map((l) => <option key={l}>{l}</option>)}</Sel>
        <div style={{ fontSize: "0.7rem", color: C.textSub, margin: "0.5rem 0 0.3rem" }}>Accessibility</div>
        {["Hearing impairment", "Speech impairment", "Interpreter required", "Carer/family involvement"].map((opt) => (
          <div key={opt} onClick={() => toggleAccess(opt)} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.25rem 0", cursor: "pointer" }}>
            <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${f.accessibility.includes(opt) ? C.teal : C.border}`, background: f.accessibility.includes(opt) ? C.teal : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{f.accessibility.includes(opt) && <span style={{ color: C.bg, fontSize: "0.6rem", fontWeight: 800 }}>✓</span>}</div>
            <span style={{ fontSize: "0.78rem" }}>{opt}</span>
          </div>
        ))}
      </Card>
      <Btn style={{ opacity: valid ? 1 : 0.5 }} onClick={save}>{saving ? "Saving…" : "💾 Create Care Plan"}</Btn>
      <Btn v="ghost" style={{ marginTop: "0.5rem" }} onClick={onBack}>← Cancel</Btn>
    </div>
  );
}
