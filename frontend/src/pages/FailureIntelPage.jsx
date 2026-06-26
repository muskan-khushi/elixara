import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis,
} from "recharts";
import { Zap, AlertTriangle, TrendingUp, ChevronRight } from "lucide-react";
import { getNodes } from "../api/graph";
import { Card, EntityChip, Spinner } from "../components/ui/index.jsx";
import { Button } from "../components/ui/Button";

const FAILURE_AXES = ["Mechanical", "Electrical", "Instrumentation", "Process", "Human", "External"];
const COLORS = ["#e8a930", "#6c3fc8", "#30c8a9", "#e85a30", "#5a9ee8"];

function generateDNA(equipment) {
  // Seeded mock data based on label hash so it's consistent
  const seed = equipment.label.charCodeAt(0) + equipment.label.charCodeAt(1 % equipment.label.length);
  return FAILURE_AXES.reduce((acc, axis, i) => {
    acc[axis] = Math.max(1, Math.floor(((seed * (i + 1) * 37) % 10)));
    return acc;
  }, {});
}

const PATTERN_ALERTS = [
  {
    pattern: "Bearing failures in P-series pumps",
    count: 3,
    severity: "high",
    recommendation: "Reduce PM interval from 6M to 3M. Investigate lubrication quality.",
  },
  {
    pattern: "Seal failures co-occurring with high process temp",
    count: 2,
    severity: "medium",
    recommendation: "Review operating temperature limits. Check cooling system effectiveness.",
  },
  {
    pattern: "Compressor trips correlate with instrument calibration schedule",
    count: 2,
    severity: "medium",
    recommendation: "Implement pre-calibration checks. Cross-reference with C-series maintenance logs.",
  },
];

export default function FailureIntelPage() {
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState([]);
  const [selectedEquip, setSelectedEquip] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getNodes({ type: "equipment", limit: 20 }).then((n) => {
      setEquipment(n);
      setSelectedEquip(n.slice(0, 3));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const toggleEquip = (e) => {
    setSelectedEquip((prev) =>
      prev.find((p) => p.id === e.id)
        ? prev.filter((p) => p.id !== e.id)
        : [...prev, e].slice(0, 5)
    );
  };

  // Build radar chart data
  const radarData = FAILURE_AXES.map((axis) => {
    const row = { axis };
    selectedEquip.forEach((e) => {
      row[e.label] = generateDNA(e)[axis];
    });
    return row;
  });

  // Bar chart: failure count by equipment
  const barData = equipment.slice(0, 10).map((e) => ({
    label: e.label,
    failures: Math.floor(Math.random() * 8 + 1),
  }));

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#f0edf9" }}>Failure Intelligence</h1>
          <p className="text-sm mt-0.5" style={{ color: "#a89ec8" }}>
            Failure DNA fingerprints · Pattern detection · Root cause clusters
          </p>
        </div>
        <Button size="sm" onClick={() => navigate("/query?q=What+are+the+most+common+failure+modes?")}>
          <Zap size={13} /> Ask AI About Failures
        </Button>
      </div>

      <div className="grid grid-cols-12 gap-5">
        {/* DNA Radar — main feature */}
        <Card className="col-span-7">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold" style={{ color: "#f0edf9" }}>Failure DNA Fingerprint</h2>
              <p className="text-xs mt-0.5" style={{ color: "#a89ec8" }}>
                Visual failure mode signature per equipment class
              </p>
            </div>
            <div className="text-xs px-2 py-1 rounded-full" style={{ background: "rgba(232,169,48,0.15)", color: "#e8a930" }}>
              Innovation
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><Spinner size={36} /></div>
          ) : selectedEquip.length === 0 ? (
            <p className="text-center py-16 text-sm" style={{ color: "#6b6090" }}>
              Select equipment to compare DNA
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={340}>
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                <PolarGrid stroke="#3d3570" />
                <PolarAngleAxis
                  dataKey="axis"
                  tick={{ fill: "#a89ec8", fontSize: 12 }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 10]}
                  tick={{ fill: "#6b6090", fontSize: 9 }}
                />
                {selectedEquip.map((e, i) => (
                  <Radar
                    key={e.id}
                    name={e.label}
                    dataKey={e.label}
                    stroke={COLORS[i % COLORS.length]}
                    fill={COLORS[i % COLORS.length]}
                    fillOpacity={0.18}
                    strokeWidth={2}
                  />
                ))}
                <Legend
                  iconType="circle"
                  wrapperStyle={{ color: "#a89ec8", fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{ background: "#251e50", border: "1px solid #3d3570", borderRadius: 10 }}
                  labelStyle={{ color: "#a89ec8" }}
                />
              </RadarChart>
            </ResponsiveContainer>
          )}

          {/* Equipment selector chips */}
          <div className="mt-3 flex flex-wrap gap-2">
            {equipment.map((e, i) => {
              const isSelected = !!selectedEquip.find((s) => s.id === e.id);
              return (
                <button
                  key={e.id}
                  onClick={() => toggleEquip(e)}
                  className="text-xs font-mono px-2.5 py-1 rounded-full transition-all"
                  style={{
                    background: isSelected ? `${COLORS[selectedEquip.findIndex((s) => s.id === e.id) % COLORS.length]}22` : "var(--bg-surface-2)",
                    border: `1px solid ${isSelected ? COLORS[selectedEquip.findIndex((s) => s.id === e.id) % COLORS.length] : "#3d3570"}`,
                    color: isSelected ? COLORS[selectedEquip.findIndex((s) => s.id === e.id) % COLORS.length] : "#a89ec8",
                  }}
                >
                  {e.label}
                </button>
              );
            })}
            {equipment.length === 0 && !loading && (
              <p className="text-xs" style={{ color: "#6b6090" }}>No equipment indexed yet</p>
            )}
          </div>
        </Card>

        {/* Pattern alerts */}
        <div className="col-span-5 space-y-4">
          <Card>
            <h2 className="font-semibold mb-3" style={{ color: "#f0edf9" }}>
              Systemic Pattern Alerts
            </h2>
            <div className="space-y-3">
              {PATTERN_ALERTS.map((alert, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl"
                  style={{
                    background: "var(--bg-surface-2)",
                    borderLeft: `3px solid ${alert.severity === "high" ? "#e83030" : "#e8a930"}`,
                  }}
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle
                      size={14}
                      className="mt-0.5 shrink-0"
                      style={{ color: alert.severity === "high" ? "#e83030" : "#e8a930" }}
                    />
                    <div>
                      <p className="text-sm font-medium" style={{ color: "#f0edf9" }}>{alert.pattern}</p>
                      <p className="text-xs mt-1" style={{ color: "#a89ec8" }}>{alert.recommendation}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: "rgba(108,63,200,0.15)", color: "#6c3fc8" }}>
                          {alert.count} occurrences
                        </span>
                        <button
                          className="text-xs flex items-center gap-0.5"
                          style={{ color: "#6c3fc8" }}
                          onClick={() => navigate(`/query?q=${encodeURIComponent(alert.pattern)}`)}
                        >
                          Investigate <ChevronRight size={11} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Failure count by equipment */}
          <Card>
            <h2 className="font-semibold mb-3 text-sm" style={{ color: "#f0edf9" }}>
              Failure Count by Equipment
            </h2>
            {loading ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : barData.length === 0 ? (
              <p className="text-xs text-center py-6" style={{ color: "#6b6090" }}>No data</p>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={barData} layout="vertical">
                  <XAxis type="number" tick={{ fill: "#6b6090", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="label" type="category" tick={{ fill: "#e8a930", fontSize: 10, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} width={55} />
                  <Tooltip
                    contentStyle={{ background: "#251e50", border: "1px solid #3d3570", borderRadius: 8 }}
                    labelStyle={{ color: "#a89ec8" }}
                  />
                  <Bar dataKey="failures" fill="#6c3fc8" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
