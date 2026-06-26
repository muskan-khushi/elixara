import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Wrench, Calendar, AlertTriangle, CheckCircle, Clock, Zap } from "lucide-react";
import { Card, StatusBadge, Spinner } from "../components/ui/index.jsx";
import { Button } from "../components/ui/Button";

// Mock maintenance data
const WORK_ORDERS = [
  { id: "WO-2401", equipment: "P-101", desc: "Bearing replacement — vibration alert", priority: "P1", due: "2024-04-02", status: "overdue" },
  { id: "WO-2402", equipment: "C-204A", desc: "Quarterly PM — oil change and filter", priority: "P2", due: "2024-04-10", status: "upcoming" },
  { id: "WO-2403", equipment: "HX-102", desc: "Tube bundle inspection", priority: "P2", due: "2024-04-15", status: "upcoming" },
  { id: "WO-2404", equipment: "V-301B", desc: "Safety valve calibration", priority: "P1", due: "2024-04-05", status: "upcoming" },
  { id: "WO-2405", equipment: "TCV-1042", desc: "Control valve actuator check", priority: "P3", due: "2024-04-25", status: "scheduled" },
  { id: "WO-2406", equipment: "P-102", desc: "Seal flush system inspection", priority: "P3", due: "2024-04-28", status: "scheduled" },
];

const AI_RECOMMENDATIONS = [
  {
    equipment: "P-101",
    current: "6 months",
    recommended: "3 months",
    confidence: 0.87,
    reason: "3 bearing failures in 18 months — statistically significant pattern",
  },
  {
    equipment: "C-204A",
    current: "12 months",
    recommended: "9 months",
    confidence: 0.74,
    reason: "Compressor trips correlate with pre-inspection period",
  },
  {
    equipment: "HX-102",
    current: "Annual",
    recommended: "Semi-annual",
    confidence: 0.68,
    reason: "Fouling rate above design spec per Q3 inspection report",
  },
];

const MTBF_DATA = [
  { equip: "P-101", mtbf: 142 },
  { equip: "C-204A", mtbf: 210 },
  { equip: "HX-102", mtbf: 380 },
  { equip: "V-301B", mtbf: 520 },
  { equip: "P-102", mtbf: 195 },
];

const PRIORITY_COLORS = { P1: "#e83030", P2: "#e8a930", P3: "#3090e8" };
const STATUS_ICONS = {
  overdue: <AlertTriangle size={14} style={{ color: "#e83030" }} />,
  upcoming: <Clock size={14} style={{ color: "#e8a930" }} />,
  scheduled: <Calendar size={14} style={{ color: "#3090e8" }} />,
  done: <CheckCircle size={14} style={{ color: "#30a856" }} />,
};

// Simple month calendar grid
function MiniCalendar() {
  const today = new Date();
  const days = Array.from({ length: 30 }, (_, i) => i + 1);
  const eventDays = { 2: "P1", 5: "P2", 10: "P2", 15: "P1", 25: "P3", 28: "P3" };

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} className="text-xs font-semibold py-1" style={{ color: "#6b6090" }}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const ev = eventDays[d];
          const isToday = d === today.getDate();
          return (
            <div
              key={d}
              className="aspect-square flex flex-col items-center justify-center rounded-lg text-xs cursor-pointer transition-colors relative"
              style={{
                background: isToday ? "var(--purple)" : "transparent",
                color: isToday ? "#fff" : "#a89ec8",
              }}
              onMouseEnter={(e) => !isToday && (e.currentTarget.style.background = "var(--bg-surface-2)")}
              onMouseLeave={(e) => !isToday && (e.currentTarget.style.background = "transparent")}
            >
              {d}
              {ev && (
                <span
                  className="w-1.5 h-1.5 rounded-full absolute bottom-1"
                  style={{ background: PRIORITY_COLORS[ev] }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function MaintenancePage() {
  const navigate = useNavigate();
  const [accepted, setAccepted] = useState({});

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#f0edf9" }}>Maintenance Intelligence</h1>
          <p className="text-sm mt-0.5" style={{ color: "#a89ec8" }}>
            AI-optimised PM schedules · Work order tracking · MTBF analysis
          </p>
        </div>
        <Button size="sm" onClick={() => navigate("/query?q=What+maintenance+is+overdue?")}>
          <Zap size={13} /> Ask AI
        </Button>
      </div>

      <div className="grid grid-cols-12 gap-5">
        {/* Calendar */}
        <Card className="col-span-3">
          <h2 className="font-semibold text-sm mb-4" style={{ color: "#f0edf9" }}>
            <Calendar size={14} className="inline mr-1.5" />
            April 2024
          </h2>
          <MiniCalendar />
          <div className="mt-3 space-y-1.5 text-xs">
            {Object.entries(PRIORITY_COLORS).map(([p, c]) => (
              <div key={p} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full" style={{ background: c }} />
                <span style={{ color: "#a89ec8" }}>{p} — {p === "P1" ? "Critical" : p === "P2" ? "High" : "Normal"}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Work Orders */}
        <Card className="col-span-5 p-0 overflow-hidden">
          <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
            <h2 className="font-semibold text-sm" style={{ color: "#f0edf9" }}>
              <Wrench size={14} className="inline mr-1.5" />
              Open Work Orders
            </h2>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 340 }}>
            <table className="w-full">
              <thead>
                <tr style={{ background: "var(--bg-surface-2)" }}>
                  {["WO#", "Equipment", "Description", "Priority", "Due", ""].map((h) => (
                    <th key={h} className="text-left px-3 py-2 text-xs font-semibold" style={{ color: "#6b6090" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {WORK_ORDERS.map((wo) => (
                  <tr
                    key={wo.id}
                    className="border-b transition-colors"
                    style={{ borderColor: "var(--border-subtle)" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-surface-2)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td className="px-3 py-2.5 text-xs font-mono" style={{ color: "#6c3fc8" }}>{wo.id}</td>
                    <td className="px-3 py-2.5 text-xs font-mono font-semibold" style={{ color: "#e8a930" }}>{wo.equipment}</td>
                    <td className="px-3 py-2.5 text-xs" style={{ color: "#f0edf9", maxWidth: 140 }}>
                      <span className="block truncate">{wo.desc}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-xs font-bold" style={{ color: PRIORITY_COLORS[wo.priority] }}>
                        {wo.priority}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs" style={{ color: wo.status === "overdue" ? "#e83030" : "#a89ec8" }}>
                      {wo.due}
                    </td>
                    <td className="px-3 py-2.5">{STATUS_ICONS[wo.status]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* MTBF Chart */}
        <Card className="col-span-4">
          <h2 className="font-semibold text-sm mb-3" style={{ color: "#f0edf9" }}>MTBF Tracker (days)</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={MTBF_DATA}>
              <XAxis dataKey="equip" tick={{ fill: "#e8a930", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#6b6090", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "#251e50", border: "1px solid #3d3570", borderRadius: 8 }}
                labelStyle={{ color: "#a89ec8" }}
              />
              <Bar dataKey="mtbf" fill="#6c3fc8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* AI Recommendations */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold" style={{ color: "#f0edf9" }}>
              <Zap size={15} className="inline mr-1.5 text-amber-400" />
              AI Schedule Recommendations
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "#a89ec8" }}>
              phi4-mini analysis of failure patterns vs. current PM intervals
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {AI_RECOMMENDATIONS.map((rec, i) => (
            <div
              key={i}
              className="p-4 rounded-xl"
              style={{
                background: "var(--bg-surface-2)",
                border: `1px solid ${accepted[i] ? "rgba(48,168,86,0.4)" : "var(--border-medium)"}`,
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono font-bold" style={{ color: "#e8a930" }}>{rec.equipment}</span>
                <span className="text-xs" style={{ color: accepted[i] ? "#30a856" : "#a89ec8" }}>
                  {Math.round(rec.confidence * 100)}% conf.
                </span>
              </div>
              <div className="flex items-center gap-2 mb-2 text-xs">
                <span className="line-through" style={{ color: "#6b6090" }}>{rec.current}</span>
                <span style={{ color: "#30a856" }}>→ {rec.recommended}</span>
              </div>
              <p className="text-xs mb-3" style={{ color: "#a89ec8" }}>{rec.reason}</p>
              {accepted[i] ? (
                <div className="flex items-center gap-1 text-xs" style={{ color: "#30a856" }}>
                  <CheckCircle size={12} /> Accepted
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button size="xs" variant="primary" onClick={() => setAccepted((a) => ({ ...a, [i]: true }))}>
                    Accept
                  </Button>
                  <Button size="xs" variant="ghost">Dismiss</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
