import { Router } from "express";
import { db } from "../db.js";
import { getPatientRow, serializePatient, addAudit } from "../logic/store.js";
import { applyNoAnswer, applyCompletedCheckIn } from "../logic/checkinResult.js";
import { TRACKS } from "../config/clinical.js";
import { telephonyConfig } from "../telephony/env.js";
import { getTwilioClient, isValidTwilioRequest } from "../telephony/twilioClient.js";
import { nextTurn, extractSignals } from "../telephony/voiceAgent.js";

const router = Router();

// ─── helpers ────────────────────────────────────────────────────────────
function xmlEscape(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
function twimlGather(sayText, actionPath) {
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Gather input="speech" action="${xmlEscape(actionPath)}" method="POST" speechTimeout="auto" speechModel="phone_call"><Say voice="Polly.Amy">${xmlEscape(sayText)}</Say></Gather><Say voice="Polly.Amy">I didn't catch a response. Someone from your care team will follow up with you directly.</Say></Response>`;
}
function twimlSayAndHangup(sayText) {
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Amy">${xmlEscape(sayText)}</Say><Hangup/></Response>`;
}

function saveTurn(callId, speaker, text) {
  db.prepare("INSERT INTO call_turns (call_id, speaker, text) VALUES (?, ?, ?)").run(callId, speaker, text);
  db.prepare("UPDATE calls SET turn = turn + 1, updated_at = datetime('now') WHERE id = ?").run(callId);
}
function getTranscript(callId) {
  return db.prepare("SELECT speaker, text FROM call_turns WHERE call_id = ? ORDER BY id").all(callId);
}
function getCall(callId) {
  return db.prepare("SELECT * FROM calls WHERE id = ?").get(callId);
}

/** Idempotent: runs signal extraction + applies the check-in result exactly once per call. */
async function finalizeCall(callId, endedReason) {
  const claimed = db
    .prepare("UPDATE calls SET status = 'completing', ended_reason = ? WHERE id = ? AND status NOT IN ('completed', 'completing')")
    .run(endedReason, callId);
  if (claimed.changes === 0) return; // another path already finalized this call

  const call = getCall(callId);
  const row = getPatientRow(call.patient_id);
  if (!row) return;
  const patient = serializePatient(row);
  const track = TRACKS[patient.track];
  const transcript = getTranscript(callId);
  const cfg = telephonyConfig();

  let result;
  try {
    result = await extractSignals({ apiKey: cfg.anthropicApiKey, patient, track, transcript, endedReason });
  } catch (err) {
    console.error("Signal extraction failed for call", callId, err);
    result = {
      signals: [],
      assessment: "Automated signal extraction failed for this call — a clinician should review the transcript directly.",
      flagged: true,
    };
  }

  db.prepare("UPDATE calls SET status = 'completed' WHERE id = ?").run(callId);
  addAudit(patient.id, "Real automated check-in call completed", "📱");
  applyCompletedCheckIn(patient, {
    mode: "live_call",
    callId,
    signals: result.signals,
    assessment: result.assessment,
    flagged: result.flagged,
  });
}

// ─── patient-facing: place a real call ─────────────────────────────────
// POST /api/patients/:id/call
router.post("/patients/:id/call", async (req, res) => {
  const cfg = telephonyConfig();
  if (!cfg.enabled) {
    return res.status(501).json({
      error: "Real telephony is not configured on this server.",
      missing: cfg.missing,
    });
  }
  const row = getPatientRow(req.params.id);
  if (!row) return res.status(404).json({ error: "patient not found" });
  const patient = serializePatient(row);
  if (!patient.phone) return res.status(400).json({ error: "This patient has no phone number on file." });

  const info = db
    .prepare("INSERT INTO calls (patient_id, to_phone, status) VALUES (?, ?, 'initiated')")
    .run(patient.id, patient.phone);
  const callId = info.lastInsertRowid;

  try {
    const client = getTwilioClient();
    const call = await client.calls.create({
      to: patient.phone,
      from: cfg.fromNumber,
      url: `${cfg.publicBaseUrl}/api/telephony/voice/${callId}`,
      statusCallback: `${cfg.publicBaseUrl}/api/telephony/status/${callId}`,
      statusCallbackEvent: ["completed", "no-answer", "busy", "failed"],
      statusCallbackMethod: "POST",
    });
    db.prepare("UPDATE calls SET call_sid = ?, status = 'in-progress' WHERE id = ?").run(call.sid, callId);
    addAudit(patient.id, "Real automated check-in call placed", "📱");
    res.status(201).json({ callId, callSid: call.sid });
  } catch (err) {
    db.prepare("UPDATE calls SET status = 'failed', ended_reason = ? WHERE id = ?").run(String(err.message || err), callId);
    res.status(502).json({ error: `Failed to place the call: ${err.message || err}` });
  }
});

// GET /api/patients/:id/calls/:callId — poll while a real call is in progress
router.get("/patients/:id/calls/:callId", (req, res) => {
  const call = getCall(req.params.callId);
  if (!call || String(call.patient_id) !== String(req.params.id)) return res.status(404).json({ error: "call not found" });
  res.json({
    id: call.id,
    status: call.status,
    endedReason: call.ended_reason,
    turns: getTranscript(call.id),
  });
});

// ─── Twilio webhooks (public, signature-verified) ──────────────────────
router.post("/telephony/voice/:callId", async (req, res) => {
  if (!isValidTwilioRequest(req)) return res.status(403).send("Forbidden");
  const callId = req.params.callId;
  const call = getCall(callId);
  if (!call) return res.type("text/xml").send(twimlSayAndHangup("Sorry, this call could not be connected."));

  const patient = serializePatient(getPatientRow(call.patient_id));
  const track = TRACKS[patient.track];
  const cfg = telephonyConfig();

  const turn = await nextTurn({ apiKey: cfg.anthropicApiKey, patient, track, transcript: [], assistantTurnCount: 0 });
  saveTurn(callId, "ai", turn.say);

  if (turn.endCall) {
    finalizeCall(callId, turn.endReason).catch((e) => console.error("finalizeCall error", e));
    return res.type("text/xml").send(twimlSayAndHangup(turn.say));
  }
  res.type("text/xml").send(twimlGather(turn.say, `/api/telephony/gather/${callId}`));
});

router.post("/telephony/gather/:callId", async (req, res) => {
  if (!isValidTwilioRequest(req)) return res.status(403).send("Forbidden");
  const callId = req.params.callId;
  const call = getCall(callId);
  if (!call) return res.type("text/xml").send(twimlSayAndHangup("Sorry, something went wrong with this call."));

  const speechResult = req.body.SpeechResult || "(no speech was detected)";
  saveTurn(callId, "patient", speechResult);

  const patient = serializePatient(getPatientRow(call.patient_id));
  const track = TRACKS[patient.track];
  const transcript = getTranscript(callId);
  const assistantTurnCount = transcript.filter((t) => t.speaker === "ai").length;
  const cfg = telephonyConfig();

  const turn = await nextTurn({ apiKey: cfg.anthropicApiKey, patient, track, transcript, assistantTurnCount });
  saveTurn(callId, "ai", turn.say);

  if (turn.endCall) {
    finalizeCall(callId, turn.endReason).catch((e) => console.error("finalizeCall error", e));
    return res.type("text/xml").send(twimlSayAndHangup(turn.say));
  }
  res.type("text/xml").send(twimlGather(turn.say, `/api/telephony/gather/${callId}`));
});

router.post("/telephony/status/:callId", async (req, res) => {
  if (!isValidTwilioRequest(req)) return res.status(403).send("Forbidden");
  const callId = req.params.callId;
  const status = req.body.CallStatus;
  const call = getCall(callId);
  if (!call) return res.sendStatus(200);

  if (["no-answer", "busy", "failed"].includes(status)) {
    const patient = serializePatient(getPatientRow(call.patient_id));
    db.prepare("UPDATE calls SET status = ? WHERE id = ?").run(status, callId);
    applyNoAnswer(patient, { mode: "live_call", callId });
  } else if (status === "completed") {
    await finalizeCall(callId, call.ended_reason || "hangup");
  }
  res.sendStatus(200);
});

export default router;
