// Real telephony is entirely opt-in via environment variables. With none of
// these set, the app behaves exactly as it always has (the scripted demo
// check-in) — nothing crashes, nothing silently pretends to be real.
//
// Required to place a real call:
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN
//   TWILIO_PHONE_NUMBER — either a Twilio-purchased number, OR your own
//                         mobile number verified as an Outgoing Caller ID
//                         in the Twilio console (avoids the ~$1/mo number
//                         rental; still requires a Twilio account, since
//                         placing a real call onto the phone network always
//                         goes through some paid telephony provider).
//   GROQ_API_KEY        — free tier (console.groq.com), drives the live
//                         conversation + signal extraction
//   PUBLIC_BASE_URL     — the publicly-reachable https URL of this server,
//                         e.g. https://discharge-hub-xxxx.onrender.com
//                         (Twilio must be able to reach it; localhost will not work)

export function telephonyConfig() {
  const {
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_PHONE_NUMBER,
    GROQ_API_KEY,
    PUBLIC_BASE_URL,
  } = process.env;

  const enabled = Boolean(
    TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER && GROQ_API_KEY && PUBLIC_BASE_URL
  );

  return {
    enabled,
    accountSid: TWILIO_ACCOUNT_SID,
    authToken: TWILIO_AUTH_TOKEN,
    fromNumber: TWILIO_PHONE_NUMBER,
    groqApiKey: GROQ_API_KEY,
    publicBaseUrl: PUBLIC_BASE_URL ? PUBLIC_BASE_URL.replace(/\/+$/, "") : null,
    missing: [
      !TWILIO_ACCOUNT_SID && "TWILIO_ACCOUNT_SID",
      !TWILIO_AUTH_TOKEN && "TWILIO_AUTH_TOKEN",
      !TWILIO_PHONE_NUMBER && "TWILIO_PHONE_NUMBER",
      !GROQ_API_KEY && "GROQ_API_KEY",
      !PUBLIC_BASE_URL && "PUBLIC_BASE_URL",
    ].filter(Boolean),
  };
}
