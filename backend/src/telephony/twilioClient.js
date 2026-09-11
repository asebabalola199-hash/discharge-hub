import twilio from "twilio";
import { telephonyConfig } from "./env.js";

let cached = null;

export function getTwilioClient() {
  const cfg = telephonyConfig();
  if (!cfg.enabled) return null;
  if (!cached) cached = twilio(cfg.accountSid, cfg.authToken);
  return cached;
}

/** Verifies an inbound webhook actually came from Twilio (not a forged request). */
export function isValidTwilioRequest(req) {
  const cfg = telephonyConfig();
  if (!cfg.enabled) return false;
  const signature = req.headers["x-twilio-signature"];
  if (!signature) return false;
  const url = `${cfg.publicBaseUrl}${req.originalUrl}`;
  return twilio.validateRequest(cfg.authToken, signature, url, req.body);
}
