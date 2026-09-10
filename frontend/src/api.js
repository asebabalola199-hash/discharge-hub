// Thin fetch wrapper over the Discharge Hub REST API. Same origin in
// production; proxied to :3001 by Vite in dev.

const BASE = "/api";

async function request(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error((data && data.error) || `${res.status} ${res.statusText}`);
  return data;
}

export const api = {
  config: () => request("GET", "/config"),

  patients: () => request("GET", "/patients"),
  patient: (id) => request("GET", `/patients/${id}`),
  createPatient: (form) => request("POST", "/patients", form),
  syncEhr: () => request("POST", "/patients/sync-ehr"),

  checkInScript: (id) => request("GET", `/patients/${id}/check-in`),
  runCheckIn: (id) => request("POST", `/patients/${id}/check-in`),

  submitDecision: (id, payload) => request("POST", `/patients/${id}/clinical-review`, payload),
  submitOutcome: (id, outcome) => request("POST", `/patients/${id}/clinical-review/outcome`, { outcome }),

  pathways: () => request("GET", "/pathways"),
  createPathway: (payload) => request("POST", "/pathways", payload),
  submitPathway: (id) => request("POST", `/pathways/${id}/submit`),
  approvePathway: (id) => request("POST", `/pathways/${id}/approve`),

  careTeam: () => request("GET", "/care-team"),
  analytics: () => request("GET", "/analytics"),
};
