import { useState, useEffect, useCallback } from "react";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from "recharts";

/* =========================================================================
   API helpers — all requests go through the Vite proxy (/api → :4000)
   ========================================================================= */

async function api(path) {
  const res = await fetch(`/api${path}`);
  if (!res.ok) throw new Error(`API ${path} failed (${res.status})`);
  return res.json();
}

async function apiPost(path, body) {
  const res = await fetch(`/api${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API POST ${path} failed (${res.status})`);
  return res.json();
}

async function loadAll() {
  const keys = ["admissions", "beds", "bedPreds", "staffing", "alerts", "forecast"];
  const results = await Promise.allSettled([
    api("/admissions"),
    api("/beds"),
    api("/beds/predictions"),
    api("/staffing"),
    api("/alerts"),
    api("/forecast"),
  ]);

  const out = {};
  let failures = 0;
  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      out[keys[i]] = r.value;
    } else {
      out[keys[i]] = null;
      failures++;
      console.warn(`[Dashboard] ${keys[i]} failed:`, r.reason?.message);
    }
  });

  if (failures === keys.length) throw new Error("All API endpoints are unreachable.");
  return out;
}

/* =========================================================================
   Colour palette & tiny utilities
   ========================================================================= */

const C = {
  bg: "#0f172a", card: "#1e293b", border: "#334155", hover: "#273449",
  text: "#f1f5f9", sub: "#94a3b8", muted: "#64748b",
  blue: "#3b82f6", blueL: "#60a5fa",
  purple: "#8b5cf6", purpleL: "#a78bfa",
  green: "#10b981", greenBg: "rgba(16,185,129,.12)",
  yellow: "#f59e0b", yellowBg: "rgba(245,158,11,.12)",
  red: "#ef4444", redBg: "rgba(239,68,68,.12)",
  cyan: "#06b6d4", cyanBg: "rgba(6,182,212,.12)",
};

const severity = (v) =>
  v === "critical" ? { color: C.red, bg: C.redBg }
    : v === "warning" ? { color: C.yellow, bg: C.yellowBg }
      : { color: C.green, bg: C.greenBg };

/* =========================================================================
   Global CSS — injected once
   ========================================================================= */

const GLOBAL_CSS = `
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;
     background:${C.bg};color:${C.text};-webkit-font-smoothing:antialiased;min-height:100vh}
#root{min-height:100vh;display:flex;flex-direction:column}
::-webkit-scrollbar{width:6px;height:6px}
::-webkit-scrollbar-track{background:${C.bg}}
::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px}
`;

function injectCSS() {
  if (document.getElementById("__hrip_css")) return;
  const el = document.createElement("style");
  el.id = "__hrip_css";
  el.textContent = GLOBAL_CSS;
  document.head.appendChild(el);
}

/* =========================================================================
   Reusable micro-components (all inline-styled)
   ========================================================================= */

function Badge({ label, variant = "success" }) {
  const s = severity(variant);
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 99,
      background: s.bg, color: s.color,
    }}>
      {label}
    </span>
  );
}

function Panel({ title, icon, badge, badgeVariant, headerRight, full, children }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`, borderRadius: 14,
      display: "flex", flexDirection: "column", overflow: "hidden",
      ...(full ? { gridColumn: "1 / -1" } : {}),
    }}>
      <div style={{
        padding: "16px 20px", borderBottom: `1px solid ${C.border}`,
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
        flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 15, fontWeight: 600 }}>
          {icon && <span style={{ fontSize: 18 }}>{icon}</span>}
          {title}
          {badge && <Badge label={badge} variant={badgeVariant} />}
        </div>
        {headerRight}
      </div>
      <div style={{ padding: "18px 20px", flex: 1, minHeight: 0 }}>{children}</div>
    </div>
  );
}

function Tabs({ items, active, onChange }) {
  return (
    <div style={{
      display: "flex", gap: 3, background: C.bg, borderRadius: 6, padding: 3,
    }}>
      {items.map((t) => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          padding: "5px 13px", border: "none", borderRadius: 4, fontSize: 12, fontWeight: 500,
          cursor: "pointer", transition: "all .15s",
          background: active === t.id ? C.blue : "transparent",
          color: active === t.id ? "#fff" : C.muted,
        }}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

function ProgressBar({ pct }) {
  const col = pct >= 90 ? C.red : pct >= 80 ? C.yellow : C.green;
  return (
    <div style={{ height: 7, background: C.bg, borderRadius: 99, overflow: "hidden", margin: "8px 0" }}>
      <div style={{ height: "100%", width: `${pct}%`, background: col, borderRadius: 99, transition: "width .6s" }} />
    </div>
  );
}

const tooltipStyle = {
  background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12,
};

/* =========================================================================
   Summary cards row
   ========================================================================= */

function SummaryCards({ admissions, beds, alerts }) {
  const ad = admissions?.data || [];
  const bd = beds?.data || [];
  const al = alerts?.summary || {};
  const er = ad.find((d) => d.departmentId === "er");
  const totalWait = ad.reduce((s, d) => s + d.waitingPatients, 0);
  const totalBeds = bd.reduce((s, d) => s + d.totalBeds, 0);
  const occ = bd.reduce((s, d) => s + d.occupied, 0);
  const occPct = totalBeds ? Math.round((occ / totalBeds) * 100) : 0;

  const cards = [
    { label: "ER Wait Time", value: `${er?.avgWaitMinutes ?? "—"}m`, sub: `${er?.waitingPatients ?? 0} patients waiting`, color: (er?.avgWaitMinutes ?? 0) > 90 ? C.red : (er?.avgWaitMinutes ?? 0) > 45 ? C.yellow : C.green },
    { label: "Total Waiting", value: totalWait, sub: "Across all departments", color: totalWait > 40 ? C.red : totalWait > 20 ? C.yellow : C.cyan },
    { label: "Bed Occupancy", value: `${occPct}%`, sub: `${totalBeds - occ} of ${totalBeds} available`, color: occPct > 90 ? C.red : occPct > 80 ? C.yellow : C.green },
    { label: "Active Alerts", value: al.total ?? 0, sub: `${al.critical ?? 0} critical · ${al.warning ?? 0} warning`, color: (al.critical ?? 0) > 0 ? C.red : (al.warning ?? 0) > 0 ? C.yellow : C.green },
    { label: "Hourly Admissions", value: ad.reduce((s, d) => s + d.hourlyAdmissions, 0), sub: "Current hour estimate", color: C.blue },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 14, marginBottom: 22 }}>
      {cards.map((c) => (
        <div key={c.label} style={{
          background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "18px 20px",
          transition: "border-color .2s",
        }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.blue)}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.border)}
        >
          <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: .5, fontWeight: 600, marginBottom: 6 }}>{c.label}</div>
          <div style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.1, color: c.color }}>{c.value}</div>
          <div style={{ fontSize: 12, color: C.sub, marginTop: 5 }}>{c.sub}</div>
        </div>
      ))}
    </div>
  );
}

/* =========================================================================
   Admission Forecast panel
   ========================================================================= */

function ForecastPanel({ forecast }) {
  const depts = forecast?.data || [];
  const [sel, setSel] = useState(depts[0]?.departmentId || "er");
  const dept = depts.find((d) => d.departmentId === sel) || depts[0];
  if (!dept) return null;

  const chart = [
    ...dept.historical.map((h) => ({ date: h.date.slice(5), actual: h.admissions })),
    ...dept.forecast.map((f) => ({ date: f.date.slice(5), predicted: f.predicted, lower: f.lower, upper: f.upper })),
  ];

  const trendLabel = dept.trend === "increasing" ? "Trending Up" : dept.trend === "decreasing" ? "Trending Down" : "Stable";
  const trendVariant = dept.trend === "increasing" ? "warning" : "success";

  return (
    <Panel
      title="Admission Forecast" icon="📈"
      badge={trendLabel} badgeVariant={trendVariant}
      headerRight={<Tabs items={depts.map((d) => ({ id: d.departmentId, label: d.departmentId.toUpperCase() }))} active={sel} onChange={setSel} />}
    >
      <div style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer>
          <AreaChart data={chart} margin={{ top: 5, right: 8, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id="gActual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={C.blue} stopOpacity={.3} />
                <stop offset="95%" stopColor={C.blue} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gPred" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={C.purple} stopOpacity={.3} />
                <stop offset="95%" stopColor={C.purple} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: C.sub }} />
            <YAxis tick={{ fontSize: 10, fill: C.sub }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Area type="monotone" dataKey="upper" stroke="none" fill={C.purple} fillOpacity={.08} />
            <Area type="monotone" dataKey="lower" stroke="none" fill={C.bg} />
            <Area type="monotone" dataKey="actual" stroke={C.blue} fill="url(#gActual)" strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="predicted" stroke={C.purple} fill="url(#gPred)" strokeWidth={2} strokeDasharray="6 3" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div style={{ display: "flex", gap: 18, justifyContent: "center", marginTop: 10, flexWrap: "wrap" }}>
        {[{ c: C.blue, l: `Historical (${dept.recentAvg}/d)` }, { c: C.purple, l: `Forecast (${dept.forecastAvg}/d)` }, { c: C.purpleL, l: "Confidence Band" }].map((i) => (
          <span key={i.l} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.sub }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: i.c }} />{i.l}
          </span>
        ))}
      </div>
    </Panel>
  );
}

/* =========================================================================
   Custom Forecast panel (POST /forecast)
   ========================================================================= */

function CustomForecastPanel() {
  const [horizon, setHorizon] = useState(7);
  const [deptFilter, setDeptFilter] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const body = { horizon: Number(horizon) };
      if (deptFilter.trim()) body.departments = deptFilter.split(",").map((s) => s.trim().toLowerCase());
      const res = await apiPost("/forecast", body);
      setResult(res.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Panel title="Custom Forecast" icon="🔮" badge="POST /forecast" badgeVariant="success">
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14, alignItems: "flex-end" }}>
        <label style={{ fontSize: 12, color: C.sub }}>
          Horizon (days)
          <input type="number" min={1} max={30} value={horizon} onChange={(e) => setHorizon(e.target.value)}
            style={{ display: "block", marginTop: 4, width: 80, padding: "6px 10px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13 }} />
        </label>
        <label style={{ fontSize: 12, color: C.sub }}>
          Departments (comma-separated, optional)
          <input type="text" placeholder="er, icu" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}
            style={{ display: "block", marginTop: 4, width: 180, padding: "6px 10px", borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: 13 }} />
        </label>
        <button onClick={run} disabled={loading}
          style={{ padding: "8px 18px", background: C.blue, color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: "pointer", opacity: loading ? .6 : 1 }}>
          {loading ? "Running…" : "Run Forecast"}
        </button>
      </div>
      {error && <div style={{ color: C.red, fontSize: 13, marginBottom: 8 }}>Error: {error}</div>}
      {result && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 10 }}>
          {result.map((d) => (
            <div key={d.departmentId} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 14 }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>{d.department}</div>
              <div style={{ fontSize: 12, color: C.sub }}>Trend: <span style={{ color: d.trend === "increasing" ? C.yellow : d.trend === "decreasing" ? C.green : C.cyan }}>{d.trend}</span></div>
              <div style={{ fontSize: 12, color: C.sub }}>Recent avg: {d.recentAvg}/day → Forecast avg: {d.forecastAvg}/day</div>
              <div style={{ marginTop: 6, fontSize: 11, color: C.muted, maxHeight: 100, overflow: "auto" }}>
                {d.forecast.map((f) => (
                  <div key={f.date}>{f.date}: {f.predicted} ({f.lower}–{f.upper})</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {!result && !error && (
        <div style={{ textAlign: "center", padding: 24, color: C.muted, fontSize: 13 }}>
          Configure parameters above and click <strong>Run Forecast</strong> to call POST /forecast.
        </div>
      )}
    </Panel>
  );
}

/* =========================================================================
   Bed Occupancy panel
   ========================================================================= */

function BedPanel({ beds, bedPreds }) {
  const [view, setView] = useState("current");
  const bd = beds?.data || [];
  const preds = bedPreds?.data || [];
  const [predDept, setPredDept] = useState(preds[0]?.departmentId || "er");

  const totalBeds = bd.reduce((s, d) => s + d.totalBeds, 0);
  const totalOcc = bd.reduce((s, d) => s + d.occupied, 0);
  const crits = bd.filter((d) => d.occupancyPct >= 90).length;

  const selPred = preds.find((p) => p.departmentId === predDept) || preds[0];
  const predChart = selPred?.predictions.filter((_, i) => i % 2 === 0).map((p) => ({
    time: new Date(p.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    pct: p.occupancyPct,
  })) || [];

  return (
    <Panel title="Bed Occupancy" icon="🛏️"
      badge={crits > 0 ? `${crits} Critical` : "Normal"} badgeVariant={crits > 0 ? "critical" : "success"}
      headerRight={<Tabs items={[{ id: "current", label: "Current" }, { id: "forecast", label: "24h Forecast" }]} active={view} onChange={setView} />}
    >
      {view === "current" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 10 }}>
          {bd.map((d) => (
            <div key={d.departmentId} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{d.department}</span>
                <Badge label={`${d.occupancyPct}%`} variant={d.occupancyPct >= 90 ? "critical" : d.occupancyPct >= 80 ? "warning" : "success"} />
              </div>
              <ProgressBar pct={d.occupancyPct} />
              <div style={{ display: "flex", justifyContent: "space-between", textAlign: "center", marginTop: 4 }}>
                {[{ v: d.occupied, l: "Occupied" }, { v: d.available, l: "Available" }, { v: d.totalBeds, l: "Total" }].map((x) => (
                  <div key={x.l}>
                    <div style={{ fontSize: 17, fontWeight: 700 }}>{x.v}</div>
                    <div style={{ fontSize: 10, color: C.muted }}>{x.l}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 10 }}>
            <Tabs items={preds.map((p) => ({ id: p.departmentId, label: p.departmentId.toUpperCase() }))} active={predDept} onChange={setPredDept} />
            {selPred && (
              <span style={{ marginLeft: 12, fontSize: 12, color: C.sub }}>
                Peak: {selPred.peakOccupancyPct}% · Risk: <span style={{ color: severity(selPred.risk).color }}>{selPred.risk}</span>
              </span>
            )}
          </div>
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <LineChart data={predChart} margin={{ top: 5, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: C.sub }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: C.sub }} />
                <Tooltip contentStyle={tooltipStyle} />
                <ReferenceLine y={90} stroke={C.red} strokeDasharray="4 4" label={{ value: "Critical 90%", fill: C.red, fontSize: 10 }} />
                <ReferenceLine y={80} stroke={C.yellow} strokeDasharray="4 4" label={{ value: "Warning 80%", fill: C.yellow, fontSize: 10 }} />
                <Line type="monotone" dataKey="pct" stroke={C.purple} strokeWidth={2} dot={false} name="Occupancy %" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </Panel>
  );
}

/* =========================================================================
   Staffing Recommendations panel
   ========================================================================= */

function StaffingPanel({ staffing }) {
  const depts = staffing?.data || [];
  const [sel, setSel] = useState(depts[0]?.departmentId || "er");
  const dept = depts.find((d) => d.departmentId === sel) || depts[0];
  if (!dept) return null;

  const crits = depts.filter((d) => d.overallUrgency === "critical").length;

  return (
    <Panel title="Staffing Recommendations" icon="👨‍⚕️"
      badge={crits > 0 ? `${crits} Dept Critical` : "Adequate"} badgeVariant={crits > 0 ? "critical" : "success"}
      headerRight={<Tabs items={depts.map((d) => ({ id: d.departmentId, label: d.departmentId.toUpperCase() }))} active={sel} onChange={setSel} />}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, paddingBottom: 8, borderBottom: `1px solid ${C.border}` }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>{dept.department}</span>
        <Badge label={`${dept.patients} patients / ${dept.totalBeds} beds`} variant={dept.overallUrgency === "critical" ? "critical" : dept.overallUrgency === "attention" ? "warning" : "success"} />
      </div>
      {dept.shifts.map((sh) => (
        <div key={sh.shift} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: 14, marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: C.sub }}>{sh.shiftLabel}</span>
            <Badge label={sh.urgency.charAt(0).toUpperCase() + sh.urgency.slice(1)} variant={sh.urgency} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, textAlign: "center" }}>
            {Object.entries(sh.roles).map(([role, g]) => (
              <div key={role}>
                <div style={{ fontSize: 10, color: C.muted, marginBottom: 2 }}>{role.charAt(0).toUpperCase() + role.slice(1)}</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{g.present}/{g.optimal}</div>
                <div style={{ fontSize: 10, color: g.status === "understaffed" ? C.red : g.status === "overstaffed" ? C.cyan : C.green }}>
                  {g.gap > 0 ? `Need +${g.gap}` : g.gap < 0 ? `Over by ${Math.abs(g.gap)}` : "Optimal"}
                </div>
              </div>
            ))}
          </div>
          {sh.totalGap > 0 && (
            <div style={{ fontSize: 12, color: C.sub, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.border}`, fontStyle: "italic" }}>
              {sh.recommendation}
            </div>
          )}
        </div>
      ))}
    </Panel>
  );
}

/* =========================================================================
   Alerts panel
   ========================================================================= */

function AlertsPanel({ alerts }) {
  const list = alerts?.alerts || [];
  const summary = alerts?.summary || {};

  const badgeLabel = summary.critical > 0 ? `${summary.critical} Critical` : summary.warning > 0 ? `${summary.warning} Warnings` : "All Clear";
  const badgeVariant = summary.critical > 0 ? "critical" : summary.warning > 0 ? "warning" : "success";

  return (
    <Panel title="Operational Alerts" icon="🔔" badge={badgeLabel} badgeVariant={badgeVariant} full>
      {list.length === 0 ? (
        <div style={{ textAlign: "center", padding: 36, color: C.muted }}>
          <div style={{ fontSize: 32, marginBottom: 6 }}>✅</div>
          <div style={{ fontSize: 13 }}>No active alerts — all systems operating normally.</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {list.map((a) => {
            const s = severity(a.severity);
            return (
              <div key={a.id} style={{ borderRadius: 10, padding: 16, borderLeft: `4px solid ${s.color}`, background: s.bg }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 5 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: s.color }}>⚠ {a.title}</span>
                  <span style={{ fontSize: 11, color: C.muted, padding: "2px 8px", background: "rgba(255,255,255,.05)", borderRadius: 99 }}>{a.department}</span>
                </div>
                <div style={{ fontSize: 13, color: C.sub, marginBottom: 8 }}>{a.message}</div>
                <div style={{ fontSize: 12, padding: "8px 12px", background: "rgba(255,255,255,.05)", borderRadius: 6, fontWeight: 500 }}>
                  <strong>Action:</strong> {a.action}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

/* =========================================================================
   Main App
   ========================================================================= */

export default function App() {
  injectCSS();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const d = await loadAll();
      setData(d);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [load]);

  const refresh = () => { setLoading(true); load(); };

  /* --- Header --- */
  const header = (
    <header style={{
      background: C.card, borderBottom: `1px solid ${C.border}`, padding: "14px 28px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(8px)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{
          width: 38, height: 38, background: `linear-gradient(135deg,${C.blue},${C.purple})`,
          borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 20, fontWeight: 700, color: "#fff",
        }}>H</div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: -.3 }}>Hospital Resource Intelligence</div>
          <div style={{ fontSize: 12, color: C.muted }}>Predictive Operations Dashboard</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        {lastUpdated && (
          <span style={{ fontSize: 12, color: C.muted }}>
            Updated {lastUpdated.toLocaleTimeString()}
          </span>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: C.sub }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.green, animation: "pulse 2s ease-in-out infinite" }} />
          Live
        </div>
        <button onClick={refresh} disabled={loading}
          style={{ padding: "7px 16px", background: C.blue, color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: "pointer", opacity: loading && data ? .6 : 1 }}>
          {loading && data ? "Refreshing…" : "Refresh"}
        </button>
      </div>
    </header>
  );

  /* --- Loading / Error states --- */
  if (loading && !data) {
    return (
      <>
        {header}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
          <div style={{
            width: 36, height: 36, border: `3px solid ${C.border}`, borderTopColor: C.blue,
            borderRadius: "50%", animation: "spin .8s linear infinite",
          }} />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
          <span style={{ fontSize: 14, color: C.muted }}>Loading hospital operations data…</span>
        </div>
      </>
    );
  }

  if (error && !data) {
    return (
      <>
        {header}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
          <div style={{ fontSize: 32 }}>⚠️</div>
          <div style={{ fontSize: 14, color: C.red, textAlign: "center", maxWidth: 400 }}>{error}</div>
          <button onClick={refresh} style={{ padding: "8px 20px", background: C.red, color: "#fff", border: "none", borderRadius: 6, fontSize: 13, cursor: "pointer" }}>
            Try Again
          </button>
        </div>
      </>
    );
  }

  /* --- Dashboard --- */
  const { admissions, beds, bedPreds, staffing, alerts, forecast } = data;

  return (
    <>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
      {header}
      <main style={{ flex: 1, padding: "22px 28px", maxWidth: 1440, margin: "0 auto", width: "100%" }}>
        <SummaryCards admissions={admissions} beds={beds} alerts={alerts} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
          <ForecastPanel forecast={forecast} />
          <BedPanel beds={beds} bedPreds={bedPreds} />
          <StaffingPanel staffing={staffing} />
          <CustomForecastPanel />
          <AlertsPanel alerts={alerts} />
        </div>
      </main>
    </>
  );
}
