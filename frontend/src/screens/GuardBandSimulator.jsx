import { useState } from "react";
import { C, Card, Btn, Tag, Sel, Lbl } from "../theme.jsx";
import { api } from "../api.js";

// The GuardBand Simulator IS the device interface for this prototype — every
// button here calls the exact same API routes a real wearable/connected
// device would call (POST /observations, POST /safety-events). Nothing here
// is a fake message; each press changes real state you can see reflected in
// the patient's GuardBand tab, Worklist, and Dashboard counts.
const OBSERVATION_BUTTONS = [
  { label: "Normal", kind: "normal" },
  { label: "High Heart Rate", parameter: "HEART_RATE", value: 128 },
  { label: "Low SpO2", parameter: "SPO2", value: 89 },
  { label: "High Respiratory Rate", parameter: "RESPIRATORY_RATE", value: 27 },
  { label: "Temperature Change", parameter: "TEMPERATURE", value: 38.6 },
  { label: "High Blood Pressure", kind: "highBP" },
  { label: "Low Blood Pressure", kind: "lowBP" },
  { label: "Glucose Change", parameter: "GLUCOSE", value: 13.2 },
  { label: "Reduced Activity", parameter: "ACTIVITY", value: 1, unit: "level" },
];
const SAFETY_BUTTONS = [
  { label: "Fall", type: "FALL_DETECTED" },
  { label: "Near Fall", type: "NEAR_FALL" },
  { label: "No Movement", type: "NO_MOVEMENT" },
  { label: "Long Lie", type: "LONG_LIE" },
  { label: "SOS", type: "SOS" },
  { label: "Device Offline", type: "DEVICE_OFFLINE" },
];

export default function GuardBandSimulator({ patients, onBack, onOpenPatient, onRefresh }) {
  const withDevice = patients; // any patient can be enrolled/simulated against
  const [patientId, setPatientId] = useState(withDevice[0]?.id || "");
  const [busy, setBusy] = useState(null);
  const [log, setLog] = useState([]);

  function pushLog(text) {
    setLog((l) => [{ text, at: new Date().toLocaleTimeString() }, ...l].slice(0, 8));
  }

  async function ensureDevice() {
    const devices = await api.devices(patientId);
    if (devices.length > 0) return devices[0].device_id;
    const created = await api.registerDevice(patientId, { deviceId: `GB-${String(patientId).padStart(3, "0")}`, deviceType: "guardband" });
    return created[0].device_id;
  }

  async function fireObservation(btn) {
    setBusy(btn.label);
    try {
      const deviceId = await ensureDevice();
      if (btn.kind === "normal") {
        await api.postObservation(patientId, { parameter: "HEART_RATE", value: 74, deviceId });
        await api.postObservation(patientId, { parameter: "SPO2", value: 97, deviceId });
        await api.postObservation(patientId, { parameter: "RESPIRATORY_RATE", value: 16, deviceId });
        await api.postObservation(patientId, { parameter: "TEMPERATURE", value: 36.7, deviceId });
      } else if (btn.kind === "highBP") {
        await api.postObservation(patientId, { parameter: "BLOOD_PRESSURE_SYSTOLIC", value: 168, deviceId });
        await api.postObservation(patientId, { parameter: "BLOOD_PRESSURE_DIASTOLIC", value: 102, deviceId });
      } else if (btn.kind === "lowBP") {
        await api.postObservation(patientId, { parameter: "BLOOD_PRESSURE_SYSTOLIC", value: 84, deviceId });
        await api.postObservation(patientId, { parameter: "BLOOD_PRESSURE_DIASTOLIC", value: 48, deviceId });
      } else {
        await api.postObservation(patientId, { parameter: btn.parameter, value: btn.value, deviceId, unit: btn.unit });
      }
      pushLog(`${btn.label} sent for patient #${patientId}`);
      onRefresh?.();
    } catch (e) {
      pushLog(`Error: ${e.message}`);
    } finally {
      setBusy(null);
    }
  }

  async function fireSafetyEvent(btn) {
    setBusy(btn.label);
    try {
      const deviceId = await ensureDevice();
      const result = await api.postSafetyEvent(patientId, { type: btn.type, deviceId });
      pushLog(`${btn.label} → patient status now "${result.patientStatus}"`);
      onRefresh?.();
    } catch (e) {
      pushLog(`Error: ${e.message}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <h3 style={{ fontWeight: 800, marginBottom: "0.3rem" }}>🩺 GuardBand Simulator</h3>
      <Tag v="neutral">SIMULATED DATA — no real hardware involved</Tag>
      <div style={{ fontSize: "0.76rem", color: C.textSub, margin: "0.5rem 0 0.7rem" }}>
        The physical GuardBand doesn't exist yet — this simulator calls the exact same API a real device would, so the pipeline behaves identically once real hardware is connected.
      </div>

      <Card>
        <Lbl>Patient</Lbl>
        <Sel value={patientId} onChange={(e) => setPatientId(Number(e.target.value))}>
          {withDevice.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.demoId})</option>)}
        </Sel>
        <Btn sm v="ghost" style={{ marginTop: "0.5rem" }} onClick={() => onOpenPatient(patientId)}>View patient's GuardBand tab →</Btn>
      </Card>

      <Card>
        <div style={{ fontWeight: 700, marginBottom: "0.5rem" }}>Physiological / Activity</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem" }}>
          {OBSERVATION_BUTTONS.map((b) => (
            <Btn key={b.label} sm v="ghost" onClick={() => fireObservation(b)} style={{ opacity: busy === b.label ? 0.6 : 1 }}>
              {busy === b.label ? "…" : b.label}
            </Btn>
          ))}
        </div>
      </Card>

      <Card>
        <div style={{ fontWeight: 700, marginBottom: "0.5rem" }}>Safety Events</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem" }}>
          {SAFETY_BUTTONS.map((b) => (
            <Btn key={b.label} sm v="danger" onClick={() => fireSafetyEvent(b)} style={{ opacity: busy === b.label ? 0.6 : 1 }}>
              {busy === b.label ? "…" : b.label}
            </Btn>
          ))}
        </div>
      </Card>

      {log.length > 0 && (
        <Card>
          <div style={{ fontWeight: 700, marginBottom: "0.4rem", fontSize: "0.8rem" }}>Recent actions</div>
          {log.map((l, i) => (
            <div key={i} style={{ fontSize: "0.72rem", color: C.textSub, padding: "0.15rem 0" }}>{l.at} — {l.text}</div>
          ))}
        </Card>
      )}

      <Btn v="ghost" onClick={onBack} style={{ marginTop: "0.5rem" }}>← Back</Btn>
    </div>
  );
}
