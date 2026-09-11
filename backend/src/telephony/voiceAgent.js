// The live conversation driver for a REAL automated check-in call, and the
// signal-extraction step that runs once the call ends.
//
// Runs on Groq's free tier (Llama 3.3 70B) — chosen for speed, since the
// patient is waiting on the phone for each reply, and it supports the
// tool/function calling this needs for reliable structured output.
//
// Safety rails (do not weaken these without clinical sign-off — they mirror
// the non-negotiables the rest of the app already enforces):
//   - Always identifies itself as automated, never impersonates a clinician.
//   - Never gives medical advice, never diagnoses, never recommends treatment.
//   - Any emergency-sounding report gets exactly one fixed redirect line to
//     emergency services, then the call ends — the agent does not try to
//     triage an emergency itself.
//   - Only asks about the pathway's monitored topics.
//   - Always closes by saying the information is going to the clinical team
//     — never claims to make the clinical decision itself.
//   - Hard-capped turn count regardless of what the model wants, to bound
//     call length and cost.

import Groq from "groq-sdk";

const MODEL = "llama-3.3-70b-versatile";
const MAX_ASSISTANT_TURNS = 7;

function client(apiKey) {
  return new Groq({ apiKey });
}

function firstName(name) {
  return String(name).split(" ")[0];
}

function systemPromptForTurn({ patient, track }) {
  return `You are the automated post-discharge check-in system for "The Discharge Hub", calling ${firstName(patient.name)} on behalf of their care team (${patient.ward}) following discharge for: ${patient.condition}.

Monitored topics for this call — ask about these, and ONLY these:
${track.monitor.map((m) => `- ${m}`).join("\n")}

Baseline risk noted at discharge (for your context only, never read aloud verbatim): ${patient.baselineReasons.join("; ")}.

STRICT RULES — do not deviate from these:
1. Your very first line must identify the call as automated: "Hello ${firstName(patient.name)}, this is an automated call from the Discharge Hub, on behalf of your care team." Never claim to be, or imply you are, a human clinician.
2. Never give medical advice, never suggest a diagnosis, never recommend a medication or treatment change.
3. If the patient reports anything that could be a medical emergency (e.g. severe breathing difficulty, chest pain, blue lips/skin, collapse, severe bleeding, stroke symptoms, feeling unsafe or suicidal), your ONLY response is exactly: "This sounds like it could be a medical emergency. Please hang up and call emergency services right now, or ask someone nearby to help." — set endReason to "emergency_redirect" and end the call immediately. Do not continue asking other questions after this.
4. Otherwise, ask about the monitored topics one or two at a time, in a brief, warm, natural phone-call style — not a checklist read aloud. Ask a short natural follow-up only if genuinely needed to clarify (e.g. "since when?").
5. Do not ask about anything outside the monitored topics. No small talk beyond a brief opening/closing pleasantry.
6. Once you have enough information on the monitored topics (usually after 3-6 of your own turns), close with exactly this style of line: "Thank you for telling me that — I'm passing this on to your clinical team to review." and set endCall to true.
7. Never claim to make the clinical decision yourself, and never promise a specific outcome or timeframe.
8. Keep every line to one or two short sentences — this is being read aloud on a phone call.

You must respond by calling the "speak" tool with your next line.`;
}

/**
 * Given the transcript so far, get the assistant's next line (or its closing
 * / emergency-redirect line). Enforces the hard turn cap regardless of what
 * the model returns.
 */
export async function nextTurn({ apiKey, patient, track, transcript, assistantTurnCount }) {
  if (assistantTurnCount >= MAX_ASSISTANT_TURNS) {
    return {
      say: "Thank you for telling me that — I'm passing this on to your clinical team to review.",
      endCall: true,
      endReason: "max_turns",
    };
  }

  const groq = client(apiKey);
  const history = transcript.map((t) => ({
    role: t.speaker === "ai" ? "assistant" : "user",
    content: t.text,
  }));
  if (history.length === 0) {
    // Prime the very first turn.
    history.push({ role: "user", content: "(The call has just connected. Begin the check-in.)" });
  }

  const resp = await groq.chat.completions.create({
    model: MODEL,
    max_tokens: 300,
    messages: [{ role: "system", content: systemPromptForTurn({ patient, track }) }, ...history],
    tools: [
      {
        type: "function",
        function: {
          name: "speak",
          description: "Say the next line of the phone call and indicate whether the call should end.",
          parameters: {
            type: "object",
            properties: {
              say: { type: "string", description: "The exact line to speak next, one or two short sentences." },
              endCall: { type: "boolean" },
              endReason: { type: "string", enum: ["none", "assistant_closed", "emergency_redirect"] },
            },
            required: ["say", "endCall", "endReason"],
          },
        },
      },
    ],
    tool_choice: { type: "function", function: { name: "speak" } },
  });

  const toolCall = resp.choices?.[0]?.message?.tool_calls?.[0];
  const out = toolCall ? safeParse(toolCall.function.arguments) : {};
  return {
    say: out.say || "Thank you — I'm passing this on to your clinical team to review.",
    endCall: Boolean(out.endCall),
    endReason: out.endReason && out.endReason !== "none" ? out.endReason : out.endCall ? "assistant_closed" : null,
  };
}

/**
 * Once the call has ended, extract structured signals from the full
 * transcript — the same [label, baseline, current, severity] shape the
 * scripted demo produces, so it flows through the identical downstream
 * risk-derivation and escalation logic (logic/riskAssessment.js).
 */
export async function extractSignals({ apiKey, patient, track, transcript, endedReason }) {
  const groq = client(apiKey);
  const transcriptText = transcript.map((t) => `${t.speaker === "ai" ? "System" : firstName(patient.name)}: ${t.text}`).join("\n");

  const system = `You are extracting structured clinical signals from a completed automated check-in call transcript for a patient on the ${track.label} pathway. This is decision SUPPORT only — you never diagnose and never make the clinical decision.

Monitored topics for this pathway: ${track.monitor.join(", ")}.
Baseline noted at discharge: ${patient.baselineReasons.join("; ")}.

For each monitored topic that was actually discussed, produce one row: label, the baseline value/state (infer a short reasonable baseline phrase if not explicit, e.g. "None", "No"), the current value as the patient described it, and a severity of exactly "red" (clear deterioration / red-flag for this pathway), "amber" (mild or possible concern), "green" (reassuring, no material change), or "grey" (topic not clearly reported). Skip a topic only if it was not discussed at all.

Then write a 1-2 sentence assessment narrative summarising the signals and how they compare to baseline — description only, no advice, no diagnosis, no recommended action.

Then set flagged = true if any signal is red or amber, or if the call ended in an emergency redirect; otherwise false.

Respond by calling the "record_assessment" tool.`;

  const resp = await groq.chat.completions.create({
    model: MODEL,
    max_tokens: 800,
    messages: [
      { role: "system", content: system },
      { role: "user", content: `Transcript:\n${transcriptText}\n\nCall ended because: ${endedReason}` },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "record_assessment",
          description: "Record the structured signals extracted from this check-in call.",
          parameters: {
            type: "object",
            properties: {
              signals: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    label: { type: "string" },
                    baseline: { type: "string" },
                    current: { type: "string" },
                    severity: { type: "string", enum: ["red", "amber", "green", "grey"] },
                  },
                  required: ["label", "baseline", "current", "severity"],
                },
              },
              assessment: { type: "string" },
              flagged: { type: "boolean" },
            },
            required: ["signals", "assessment", "flagged"],
          },
        },
      },
    ],
    tool_choice: { type: "function", function: { name: "record_assessment" } },
  });

  const toolCall = resp.choices?.[0]?.message?.tool_calls?.[0];
  const out = toolCall
    ? safeParse(toolCall.function.arguments)
    : { signals: [], assessment: "Unable to extract signals from this call.", flagged: true };

  const forcedEmergency = endedReason === "emergency_redirect";
  return {
    signals: (out.signals || []).map((s) => [s.label, s.baseline, s.current, s.severity]),
    assessment: forcedEmergency
      ? `Patient was directed to emergency services during this call. ${out.assessment || ""}`.trim()
      : out.assessment,
    flagged: forcedEmergency ? true : Boolean(out.flagged),
  };
}

function safeParse(json) {
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}
