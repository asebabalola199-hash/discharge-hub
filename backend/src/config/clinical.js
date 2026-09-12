// ═══════════════════════════════════════════════════════════════════════════
// Clinical configuration — the single source of truth for the demo's
// pathways, scripted check-in conversations, and the reference tables that
// the risk-assessment and recommendation logic depend on.
//
// Ported verbatim from DischargeHub-MVP-v4.jsx. The AI does NOT pre-decide an
// outcome: each scripted call produces structured, signal-by-signal data and
// the Red/Amber/Green status is DERIVED from that data (see logic/riskAssessment.js).
// ═══════════════════════════════════════════════════════════════════════════

export const REVIEWER = "Sarah Jones, RN";

export const AI_DISCLAIMER =
  "The AI identifies information from natural patient conversation against an agreed clinical pathway, and presents relevant signals to the clinical team. The clinician remains responsible for the clinical decision.";

export const PIPELINE = [
  "Discharge",
  "Care Plan",
  "Automated Check-In",
  "Patient Response",
  "Risk Assessment",
  "Clinical Review",
  "Escalation",
  "Follow-Up",
  "Closure",
];

export const DURATION_OPTIONS = [
  { key: "72h", label: "72 hours", checkIns: ["2h", "24h", "48h", "72h"] },
  { key: "7d", label: "7 days", checkIns: ["2h", "24h", "72h", "7 days"] },
  { key: "7-14d", label: "7–14 days", checkIns: ["2h", "24h", "72h", "7 days", "14 days"] },
  { key: "custom", label: "Custom", checkIns: ["2h", "24h", "As defined"] },
];

export const TRACKS = {
  acute: {
    key: "acute", label: "Acute Track", sub: "MAU / Respiratory", icon: "🫁", colToken: "blue",
    defaultDuration: "72h",
    monitor: ["Breathlessness", "Chest symptoms", "Inhaler use", "Ability to eat/drink", "General wellbeing"],
  },
  surgical: {
    key: "surgical", label: "Surgical Track", sub: "Post-Op / Orthopaedics", icon: "🩹", colToken: "amber",
    defaultDuration: "7d",
    monitor: ["Wound integrity", "Pain score (0–10)", "Fever", "Mobility progress", "Infection red flags"],
  },
  frailty: {
    key: "frailty", label: "Frailty Track", sub: "Virtual Ward", icon: "🦴", colToken: "teal",
    defaultDuration: "7-14d",
    monitor: ["Activities of daily living", "Fall / near-fall risk", "Confusion", "Community nurse visit confirmation"],
  },
};

export const ESCALATION_LEVELS = [
  { n: 1, label: "Automated Detection", desc: "Patient response indicates a possible deterioration signal.", icon: "🤖" },
  { n: 2, label: "Clinical Review Queue", desc: "Alert appears in the nurse's worklist.", icon: "📥" },
  { n: 3, label: "Nurse Assessment", desc: "Nurse reviews the patient's responses and clinical context.", icon: "🩺" },
  { n: 4, label: "Escalation", desc: "Routed per local pathway.", icon: "📡" },
  { n: 5, label: "Outcome Recorded", desc: "Resolved, monitoring continued, escalated, readmitted, or unable to contact.", icon: "✅" },
];

export const CLINICAL_DECISIONS = [
  { key: "contact", label: "Contact patient now" },
  { key: "same_day", label: "Arrange same-day assessment" },
  { key: "medical", label: "Escalate to medical team" },
  { key: "monitor", label: "Continue monitoring" },
  { key: "close", label: "Close alert" },
];

export const ESCALATION_DESTINATIONS = [
  "Medical Team", "GP / Primary Care", "Community Nursing Team",
  "Virtual Ward", "Acute Assessment Unit", "Emergency Pathway",
];

export const URGENCY_LEVELS = [
  ["routine", "Routine"],
  ["same_day", "Same day"],
  ["immediate", "Immediate"],
];

export const OUTCOME_OPTIONS = [
  "Patient contacted",
  "Same-day assessment arranged",
  "Patient subsequently admitted",
  "Monitoring continues",
  "Resolved",
];

// Pathway Builder reference data
export const CHECKPOINTS = ["2h", "24h", "48h", "72h"];
export const PATHWAY_QUESTIONS = [
  "Breathlessness", "Chest tightness", "Inhaler use", "Fever",
  "Eating/drinking", "General wellbeing", "Recovery",
];

// ─── Patient-facing content ────────────────────────────────────────────────
export const PATIENT_EDUCATION = {
  acute: {
    title: "Understanding COPD",
    points: [
      "COPD is a long-term lung condition that makes breathing harder over time.",
      "Your symptoms may vary day to day, especially for a while after a chest infection like the one that brought you into hospital.",
      "Use your inhaler exactly as shown — a spacer can help more of the medicine reach your lungs.",
      "If your breathlessness suddenly gets worse, or your usual inhaler isn't helping, contact your care team.",
      "Seek emergency help if you have severe breathlessness, blue lips or fingertips, or new confusion.",
    ],
  },
  surgical: {
    title: "Recovering from Surgery",
    points: [
      "Some soreness and swelling is normal in the first week after your operation.",
      "Keep the wound clean and dry, and change dressings as advised.",
      "Watch for increasing redness, warmth, swelling, or discharge — these can be early signs of infection.",
      "Take pain relief as prescribed and gradually increase your activity as you're able.",
      "Seek urgent help for a fever, spreading redness, or a wound that opens.",
    ],
  },
  frailty: {
    title: "Staying Safe at Home",
    points: [
      "A few near-falls are common while you're regaining strength — always use your walking frame.",
      "Keep floors clear of trip hazards and wear supportive, well-fitted footwear.",
      "Your community nurse will check on your progress and your home safety.",
      "Tell your care team about any new dizziness, weakness, or confusion.",
      "Call for help immediately after any fall, even if you feel okay afterwards.",
    ],
  },
};

export const PATIENT_PLAN_TEMPLATE = {
  acute: {
    treatment: "Nebulisers, antibiotics and steroid tablets to settle the chest infection and open your airways.",
    whatNext: "Your breathing and inhaler use will be checked by phone over the next 72 hours.",
    medications: [
      "Salbutamol inhaler — 2 puffs as needed",
      "Prednisolone 30mg — reducing course, once daily",
      "Amoxicillin 500mg — three times a day, 5 days",
    ],
    urgent: "Sudden worsening breathlessness, blue lips or fingertips, or new confusion.",
  },
  surgical: {
    treatment: "Surgical procedure under general anaesthetic, with routine post-operative pain relief and wound care.",
    whatNext: "Your wound and pain levels will be checked by phone over the next 7 days.",
    medications: [
      "Paracetamol 1g — four times a day",
      "Ibuprofen 400mg — as needed with food",
      "Codeine 30mg — as needed for breakthrough pain",
    ],
    urgent: "Fever, spreading redness around the wound, or the wound opening.",
  },
  frailty: {
    treatment: "Assessment and treatment on the ward, then stepped down for recovery and monitoring at home.",
    whatNext: "Your mobility and wellbeing will be checked by phone over the next 7–14 days, alongside community nurse visits.",
    medications: [
      "Regular medications reviewed and confirmed at discharge — see your discharge letter for the full list",
    ],
    urgent: "A fall, sudden confusion, or new weakness.",
  },
};

export const PAEDIATRIC_TEMPLATE = {
  treatment: "Nebulisers and steroid medicine to help your child breathe more easily.",
  whatNext: "We'll check in by phone over the next 72 hours to see how your child is doing.",
  medications: [
    "Salbutamol inhaler — as shown by the ward team",
    "Steroid syrup — short course as prescribed",
  ],
  urgent: "Fast or noisy breathing, blue lips, or your child becoming difficult to wake, poor feeding, or a high temperature that won't come down.",
  education: {
    title: "Caring for Your Child at Home",
    points: [
      "Children's breathing can change quickly — trust your instincts if something seems wrong.",
      "Offer small amounts of fluid often to keep your child hydrated, even if appetite is reduced.",
      "Check your child's temperature if they seem unwell, and follow the guidance you were given on managing fever.",
      "Watch for fast breathing, flaring nostrils, or the skin pulling in around the ribs — these need urgent attention.",
      "Trust your instincts — you know your child best. Contact us or seek emergency help if you're worried.",
    ],
  },
};

// ─── Scripted check-in scenarios ──────────────────────────────────────────
// Each track has a "concern" and a "clear" conversation. The structured
// signal rows are read directly off what the patient says in that specific
// script — the status is then DERIVED from the signal severities.
export const TRACK_SCENARIOS = {
  acute: {
    concern: {
      script: [
        { speaker: "ai", text: "Hello {name}, it's the Discharge Hub calling from your care team. How are you getting on since you came home?" },
        { speaker: "patient", text: "I'm alright, but I'm finding my breathing a little difficult today and I'm getting tired walking upstairs." },
        { speaker: "ai", text: "I'm sorry to hear that. Is that something you've noticed today, or has it been building since you came home?" },
        { speaker: "patient", text: "Since yesterday, really." },
        { speaker: "ai", text: "Thank you. Have you needed to use your inhaler more than usual because of that?" },
        { speaker: "patient", text: "Yes, I've used it twice extra today." },
        { speaker: "ai", text: "And any chest pain or fever alongside the breathlessness?" },
        { speaker: "patient", text: "No, neither of those." },
        { speaker: "ai", text: "Thank you for telling me all that. I'm passing this on to your clinical team to review." },
      ],
      signals: [
        ["Breathlessness", "Mild", "Worse", "red"],
        ["Rescue inhaler use", "2/day", "4/day (2 extra)", "red"],
        ["Chest pain", "No", "No", "green"],
        ["Fever", "No", "Not reported", "grey"],
      ],
      assessment: "Increased breathlessness and increased rescue inhaler use compared with the patient's reported baseline.",
      flagged: true,
    },
    clear: {
      script: [
        { speaker: "ai", text: "Hello {name}, it's the Discharge Hub calling from your care team. How are you getting on since you came home?" },
        { speaker: "patient", text: "Actually I'm doing well — breathing feels normal and I've got more energy than I expected." },
        { speaker: "ai", text: "That's great to hear. Have you needed your inhaler any more than usual?" },
        { speaker: "patient", text: "No, just the normal amount." },
        { speaker: "ai", text: "Wonderful — thank you for letting us know." },
      ],
      signals: [
        ["Breathlessness", "Mild", "Same as baseline", "green"],
        ["Rescue inhaler use", "2/day", "2/day", "green"],
        ["Chest pain", "No", "No", "green"],
        ["Fever", "No", "No", "green"],
      ],
      assessment: "All monitored signals within baseline — no deterioration indicated.",
      flagged: false,
    },
  },
  surgical: {
    concern: {
      script: [
        { speaker: "ai", text: "Hello {name}, it's the Discharge Hub calling from your care team. How are you getting on since your operation?" },
        { speaker: "patient", text: "It's been a bit more uncomfortable today — the wound feels sorer and looks a little red around the edge." },
        { speaker: "ai", text: "Thanks for telling me. On a scale of 0 to 10, how would you describe the pain right now?" },
        { speaker: "patient", text: "About a 6 — it was more like a 3 yesterday." },
        { speaker: "ai", text: "Have you noticed any warmth, fever, or chills?" },
        { speaker: "patient", text: "I did feel a bit hot this morning, actually." },
        { speaker: "ai", text: "Thank you — I'm passing this on to your clinical team to review." },
      ],
      signals: [
        ["Wound appearance", "Clean, dry", "Redness at edge", "amber"],
        ["Pain score", "3/10", "6/10", "amber"],
        ["Fever", "No", "Felt hot this morning", "amber"],
        ["Discharge from wound", "No", "Not reported", "grey"],
      ],
      assessment: "Increasing pain, new redness, and a possible low-grade fever — consistent with a possible early wound infection.",
      flagged: true,
    },
    clear: {
      script: [
        { speaker: "ai", text: "Hello {name}, it's the Discharge Hub calling from your care team. How are you getting on since your operation?" },
        { speaker: "patient", text: "Not bad at all — a bit sore but nothing more than I expected." },
        { speaker: "ai", text: "Good to hear. Any redness, swelling, or discharge from the wound?" },
        { speaker: "patient", text: "No, it looks the same as when I left hospital." },
        { speaker: "ai", text: "That's reassuring — your recovery looks on track." },
      ],
      signals: [
        ["Wound appearance", "Clean, dry", "Clean, dry", "green"],
        ["Pain score", "3/10", "3/10", "green"],
        ["Fever", "No", "No", "green"],
        ["Discharge from wound", "No", "No", "green"],
      ],
      assessment: "All monitored signals within baseline — recovery on track.",
      flagged: false,
    },
  },
  frailty: {
    concern: {
      script: [
        { speaker: "ai", text: "Hello {name}, it's the Discharge Hub calling from the Virtual Ward team. How are you managing at home?" },
        { speaker: "patient", text: "Mostly okay, but I did have a stumble in the hallway yesterday — didn't fall, but it gave me a fright." },
        { speaker: "ai", text: "I'm glad you weren't hurt. Has that happened more than once, or was it just the one time?" },
        { speaker: "patient", text: "Just the once, but I've been a bit more nervous on my feet since." },
        { speaker: "ai", text: "Thank you for telling me. Has the community nurse been out to see you yet?" },
        { speaker: "patient", text: "Not yet, no." },
        { speaker: "ai", text: "Thank you — I'm passing this to your clinical team to review." },
      ],
      signals: [
        ["Falls / near-falls", "None", "1 near-fall reported", "amber"],
        ["Community nurse visit", "Confirmed", "Not yet visited", "amber"],
        ["Mobility aid use", "Frame", "Frame", "green"],
      ],
      assessment: "A reported near-fall and an unconfirmed community nurse visit — combined fall-risk signal.",
      flagged: true,
    },
    clear: {
      script: [
        { speaker: "ai", text: "Hello {name}, it's the Discharge Hub calling from the Virtual Ward team. How are you managing at home?" },
        { speaker: "patient", text: "Doing well, feeling pretty steady on my feet with the frame." },
        { speaker: "ai", text: "That's great to hear. Has the community nurse visited yet?" },
        { speaker: "patient", text: "Yes, this morning." },
        { speaker: "ai", text: "Wonderful — thank you for letting me know." },
      ],
      signals: [
        ["Falls / near-falls", "None", "None", "green"],
        ["Community nurse visit", "Confirmed", "Confirmed", "green"],
        ["Mobility aid use", "Frame", "Frame", "green"],
      ],
      assessment: "All monitored signals within baseline — no deterioration indicated.",
      flagged: false,
    },
  },
};

export const DECISION_LABELS = Object.fromEntries(CLINICAL_DECISIONS.map((d) => [d.key, d.label]));
export const URGENCY_LABELS = Object.fromEntries(URGENCY_LEVELS.map(([k, l]) => [k, l]));

// ═══════════════════════════════════════════════════════════════════════════
// GuardBand — continuous monitoring layer reference data. Backend owns this
// copy the same way it owns everything above; the frontend renders from it.
// ═══════════════════════════════════════════════════════════════════════════

export const DEVICE_TYPES = {
  guardband:   { label: "GuardBand", icon: "⌚" },
  bp_monitor:  { label: "Blood Pressure Monitor", icon: "🩺" },
  cgm:         { label: "Continuous Glucose Monitor", icon: "🩸" },
  scale:       { label: "Smart Scale", icon: "⚖️" },
  thermometer: { label: "Connected Thermometer", icon: "🌡️" },
};

// unit + a default baseline range used when a patient has no explicit
// monitoring_baseline set yet (a reasonable adult-general default, NOT a
// clinical guideline — always overridden by the patient's own baseline).
export const OBSERVATION_PARAMETERS = {
  HEART_RATE:                 { label: "Heart Rate",          unit: "bpm",    baselineKey: "heartRate",     default: { min: 60, max: 90 } },
  SPO2:                       { label: "SpO2",                unit: "%",      baselineKey: "spo2",          default: { min: 94, max: 100 } },
  RESPIRATORY_RATE:           { label: "Respiratory Rate",     unit: "/min",   baselineKey: "respiratoryRate", default: { min: 12, max: 20 } },
  TEMPERATURE:                { label: "Temperature",          unit: "°C",     baselineKey: "temperature",   default: { min: 36.0, max: 37.5 } },
  BLOOD_PRESSURE_SYSTOLIC:    { label: "Blood Pressure (systolic)",  unit: "mmHg", baselineKey: "systolicBP",  default: { min: 100, max: 140 } },
  BLOOD_PRESSURE_DIASTOLIC:   { label: "Blood Pressure (diastolic)", unit: "mmHg", baselineKey: "diastolicBP", default: { min: 60, max: 90 } },
  GLUCOSE:                    { label: "Glucose",              unit: "mmol/L", baselineKey: "glucose",       default: { min: 4.0, max: 7.8 } },
  WEIGHT:                     { label: "Weight",                unit: "kg",     baselineKey: "weight",        default: null },
  ACTIVITY:                   { label: "Activity",              unit: "level",  baselineKey: null,            default: null },
  STEPS:                      { label: "Steps",                 unit: "steps",  baselineKey: null,            default: null },
};

export const SAFETY_EVENT_TYPES = {
  FALL_DETECTED:          { label: "Possible fall detected", icon: "🚨", severity: "red" },
  NEAR_FALL:               { label: "Near-fall detected",     icon: "⚠️", severity: "amber" },
  SOS:                     { label: "SOS activated",          icon: "🆘", severity: "red" },
  NO_MOVEMENT:             { label: "No movement detected",   icon: "🛑", severity: "amber" },
  LONG_LIE:                { label: "Long-lie detected",      icon: "🚨", severity: "red" },
  LOW_BATTERY:             { label: "Device battery low",     icon: "🔋", severity: "grey" },
  DEVICE_OFFLINE:          { label: "Device went offline",    icon: "📴", severity: "amber" },
  DEVICE_ONLINE:           { label: "Device back online",     icon: "📶", severity: "green" },
  HEALTH_ALERT:            { label: "Health alert",           icon: "❤️‍🩹", severity: "amber" },
  PATIENT_CONFIRMED_SAFE:  { label: "Patient confirmed safe", icon: "✅", severity: "green" },
};

export const PATIENT_STATUS_LEVELS = {
  stable:              { label: "Stable",              desc: "No significant deviation from baseline.", icon: "🟢" },
  watch:               { label: "Watch",               desc: "Small changes detected.", icon: "🔵" },
  concern:              { label: "Concern",             desc: "Persistent or multiple deviations from baseline.", icon: "🟠" },
  urgent_review:        { label: "Urgent Review",       desc: "Significant changes requiring clinical review.", icon: "🔴" },
  active_safety_event:  { label: "Active Safety Event", desc: "Fall / SOS / long-lie / other event awaiting response.", icon: "🚨" },
};

// Simulated EHR (TrakCare) discharge summary used by the "Sync from EHR" flow.
export const EHR_DEMO_SUMMARY = {
  name: "Thomas Kerr",
  age: 69,
  ward: "MAU",
  track: "acute",
  condition: "Community-acquired pneumonia, resolving. Background COPD.",
  duration: "72h",
  method: "Automated voice call",
  language: "English",
  accessibility: [],
};
