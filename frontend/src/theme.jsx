// Visual theme + atomic components — ported verbatim from
// DischargeHub-MVP-v4.jsx. The dark navy / teal palette is the established
// brand and must not change.

export const C = {
  bg: "#060d18", surface: "#0b1525", surfaceHi: "#112035", border: "#1a2d45", borderHi: "#1e3a56",
  teal: "#00d4a0", tealBg: "rgba(0,212,160,0.12)",
  red: "#f04060", redBg: "rgba(240,64,96,0.12)",
  amber: "#f5a623", amberBg: "rgba(245,166,35,0.12)",
  blue: "#4a9eff", blueBg: "rgba(74,158,255,0.12)",
  green: "#22c55e", greenBg: "rgba(34,197,94,0.12)",
  purple: "#a78bfa", purpleBg: "rgba(167,139,250,0.12)",
  grey: "#5b6b7a", greyBg: "rgba(91,107,122,0.12)",
  text: "#e8f0fe", textSub: "#7a9bb5", textDim: "#3d5a73", white: "#ffffff",
};

export const S = {
  app: { fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", background: C.bg, color: C.text, height: "100vh", display: "flex", flexDirection: "column", maxWidth: 480, margin: "0 auto", border: `1px solid ${C.border}`, position: "relative", overflow: "hidden" },
  header: { background: C.surface, padding: "0.55rem 1rem", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, zIndex: 10 },
  content: { flex: 1, overflowY: "auto", padding: "1rem", paddingBottom: "5.5rem" },
  nav: { position: "absolute", bottom: 0, left: 0, right: 0, background: C.surface, borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-around", padding: "0.4rem 0 0.5rem", zIndex: 100 },
};

export function card(extra = {}) { return { background: C.surface, borderRadius: 14, padding: "0.9rem 1rem", border: `1px solid ${C.border}`, marginBottom: "0.65rem", ...extra }; }
export function pill(col, bg) { return { background: bg, color: col, padding: "0.18rem 0.6rem", borderRadius: 50, fontSize: "0.67rem", fontWeight: 700, display: "inline-block", letterSpacing: "0.02em" }; }
export function btn(variant = "primary", small = false) {
  const base = { borderRadius: 50, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", fontSize: small ? "0.75rem" : "0.88rem", padding: small ? "0.3rem 0.85rem" : "0.65rem 1.4rem", border: "none", width: small ? "auto" : "100%", transition: "opacity 0.15s" };
  if (variant === "primary") return { ...base, background: C.teal, color: C.bg };
  if (variant === "danger") return { ...base, background: C.red, color: C.white };
  if (variant === "ghost") return { ...base, background: C.surfaceHi, color: C.text, border: `1px solid ${C.border}` };
  return base;
}
export function inp() { return { width: "100%", padding: "0.6rem 0.8rem", border: `1px solid ${C.border}`, borderRadius: 10, fontSize: "0.88rem", background: C.surfaceHi, color: C.text, fontFamily: "inherit", boxSizing: "border-box", outline: "none" }; }

export function Tag({ v = "info", children }) {
  const m = { success: [C.green, C.greenBg], danger: [C.red, C.redBg], warning: [C.amber, C.amberBg], info: [C.blue, C.blueBg], teal: [C.teal, C.tealBg], purple: [C.purple, C.purpleBg], neutral: [C.grey, C.greyBg] };
  const [col, bg] = m[v] || m.info;
  return <span style={pill(col, bg)}>{children}</span>;
}
export function Card({ children, style, onClick }) { return <div style={{ ...card(), ...style, cursor: onClick ? "pointer" : "default" }} onClick={onClick}>{children}</div>; }
export function Btn({ v = "primary", sm, onClick, children, style }) { return <button style={{ ...btn(v, sm), ...style }} onClick={onClick}>{children}</button>; }
export function Inp({ style, ...props }) { return <input style={{ ...inp(), ...style }} {...props} />; }
export function Sel({ style, ...props }) { return <select style={{ ...inp(), ...style }} {...props} />; }
export function TA({ style, ...props }) { return <textarea style={{ ...inp(), resize: "vertical", ...style }} {...props} />; }
export function Lbl({ children }) { return <div style={{ fontSize: "0.63rem", fontWeight: 700, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.3rem", marginTop: "0.75rem" }}>{children}</div>; }
export function NavBtn({ icon, label, active, onClick }) {
  return <button onClick={onClick} style={{ display: "flex", flexDirection: "column", alignItems: "center", fontSize: "0.56rem", color: active ? C.teal : C.textDim, background: "none", border: "none", cursor: "pointer", padding: "0.2rem 0.4rem", fontFamily: "inherit", gap: "0.15rem" }}>
    <span style={{ fontSize: "1.1rem" }}>{icon}</span><span style={{ fontWeight: active ? 700 : 400 }}>{label}</span>
  </button>;
}
export function initials(name) { return String(name).split(" ").filter(Boolean).map(w => w[0]).slice(0, 2).join("").toUpperCase(); }
export function Avatar({ name, size = 44, ring }) {
  return <div style={{ width: size, height: size, borderRadius: "50%", background: C.blueBg, border: `2px solid ${ring || C.teal}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.36, fontWeight: 800, color: C.blue, flexShrink: 0 }}>{initials(name)}</div>;
}

// ─── Colour / icon maps (depend on C) ────────────────────────────────────
export const RISK_COL = { High: C.red, Medium: C.amber, Low: C.teal };
export const RISK_DOT = { High: "🔴", Medium: "🟠", Low: "🟢" };
export const STATUS_STYLE = {
  red: [C.red, "🔴", "Clinical review required"],
  amber: [C.amber, "🟠", "Unable to contact — reviewed"],
  green: [C.green, "🟢", "Stable"],
  grey: [C.grey, "⚪", "Not yet assessed"],
};
export const KIND_COLOR = { call: C.blue, review: C.red, done: C.teal };
export const TRACK_COL = { blue: C.blue, amber: C.amber, teal: C.teal, purple: C.purple, green: C.green, red: C.red, grey: C.grey };
export const SEVERITY_COL = { red: C.red, amber: C.amber, green: C.green, grey: C.textDim };

// Resolve a track (from /api/config) to include its hex accent colour.
export function trackColor(track) { return TRACK_COL[track?.colToken] || C.blue; }
