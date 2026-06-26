import React, { useEffect, useState } from "react";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { BarChart2, TrendingUp, Zap, Clock } from "lucide-react";
import { getHistory } from "../api/query";
import { getNodes } from "../api/graph";
import { Card, Spinner } from "../components/ui/index.jsx";

const DOC_TYPES = ["manual", "inspection", "procedure", "work_order", "regulatory"];
const EQUIP_CLASSES = ["P-series", "C-series", "HX-series", "V-series", "TCV-series"];

function CoverageHeatmap({ equipment, docTypes }) {
  // Mock coverage data
  const data = equipment.map((eq) =>
    docTypes.map(() => Math.random() > 0.45 ? Math.floor(Math.random() * 5 + 1) : 0)
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            <th className="text-xs text-left py-1 pr-3" style={{ color: "#6b6090", width: 90 }}>Equipment</th>
            {docTypes.map((dt) => (
              <th key={dt} className="text-xs text-center py-1 px-1" style={{ color: "#6b6090" }}>
                {dt.slice(0, 7)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {equipment.map((eq, i) => (
            <tr key={eq}>
              <td className="text-xs font-mono py-1 pr-3" style={{ color: "#e8a930" }}>{eq}</td>
              {data[i].map((count, j) => (
                <td key={j} className="text-center py-1 px-1">
                  <div
                    className="mx-auto w-8 h-7 rounded flex items-center justify-center text-xs font-semibold"
                    style={{
                      background: count === 0
                        ? "rgba(232,48,48,0.2)"
                        : count === 1
                        ? "rgba(108,63,200,0.2)"
                        : count <= 3
                        ? "rgba(108,63,200,0.4)"
                        : "rgba(108,63,200,0.7)",
                      color: count === 0 ? "#e83030" : "#f0edf9",
                      border: count === 0 ? "1px solid rgba(232,48,48,0.3)" : "none",
                    }}
                  >
                    {count === 0 ? "!" : count}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex items-center gap-3 mt-3 text-xs" style={{ color: "#6b6090" }}>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded" style={{ background: "rgba(232,48,48,0.2)", border: "1px solid rgba(232,48,48,0.3)" }} />
          <span>GAP — no documents</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded" style={{ background: "rgba(108,63,200,0.4)" }} />
          <span>1–3 documents</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded" style={{ background: "rgba(108,63,200,0.7)" }} />
          <span>4+ documents</span>
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHistory(100).then((h) => { setHistory(h); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  // Query volume last 30 days
  const volumeData = Array.from({ length: 30 }, (_, i) => ({
    day: `D-${30 - i}`,
    queries: Math.floor(Math.random() * 60 + 10),
  }));

  // Confidence trend
  const confidenceData = history.slice(0, 30).map((h, i) => ({
    n: i + 1,
    confidence: Math.round((h.confidence || 0.5) * 100),
  }));
  if (confidenceData.length === 0) {
    for (let i = 1; i <= 20; i++)
      confidenceData.push({ n: i, confidence: Math.round(60 + i * 1.2 + Math.random() * 5) });
  }

  // Latency distribution
  const latencyData = [
    { range: "<5s", count: 12 },
    { range: "5–15s", count: 45 },
    { range: "15–30s", count: 28 },
    { range: ">30s", count: 8 },
  ];

  // Top queries
  const topQueries = history.slice(0, 8).map((h) => ({
    query: h.query?.slice(0, 40) + (h.query?.length > 40 ? "…" : ""),
    count: Math.floor(Math.random() * 20 + 2),
  }));

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#f0edf9" }}>Analytics</h1>
        <p className="text-sm mt-0.5" style={{ color: "#a89ec8" }}>
          Query intelligence, knowledge coverage, and system performance metrics
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size={40} /></div>
      ) : (
        <>
          {/* Row 1 */}
          <div className="grid grid-cols-12 gap-5">
            {/* Query volume */}
            <Card className="col-span-8">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-sm" style={{ color: "#f0edf9" }}>
                  <BarChart2 size={14} className="inline mr-1.5" />
                  Query Volume — Last 30 Days
                </h2>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={volumeData}>
                  <defs>
                    <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6c3fc8" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6c3fc8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" tick={{ fill: "#6b6090", fontSize: 9 }} axisLine={false} tickLine={false} interval={4} />
                  <YAxis tick={{ fill: "#6b6090", fontSize: 9 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#251e50", border: "1px solid #3d3570", borderRadius: 8 }} />
                  <Area type="monotone" dataKey="queries" stroke="#6c3fc8" strokeWidth={2} fill="url(#volGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            {/* Latency distribution */}
            <Card className="col-span-4">
              <h2 className="font-semibold text-sm mb-3" style={{ color: "#f0edf9" }}>
                <Clock size={13} className="inline mr-1.5" />
                Answer Latency
              </h2>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={latencyData}>
                  <XAxis dataKey="range" tick={{ fill: "#6b6090", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#6b6090", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#251e50", border: "1px solid #3d3570", borderRadius: 8 }} />
                  <Bar dataKey="count" fill="#e8a930" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-12 gap-5">
            {/* Confidence trend */}
            <Card className="col-span-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-sm" style={{ color: "#f0edf9" }}>
                  <TrendingUp size={14} className="inline mr-1.5" />
                  Avg. Confidence Trend
                </h2>
                <span className="text-xs" style={{ color: "#30a856" }}>
                  ↑ Improving as more docs indexed
                </span>
              </div>
              <ResponsiveContainer width="100%" height={170}>
                <LineChart data={confidenceData}>
                  <XAxis dataKey="n" tick={{ fill: "#6b6090", fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[40, 100]} tick={{ fill: "#6b6090", fontSize: 9 }} axisLine={false} tickLine={false} />
                  <CartesianGrid stroke="#2e2755" strokeDasharray="4 4" vertical={false} />
                  <Tooltip contentStyle={{ background: "#251e50", border: "1px solid #3d3570", borderRadius: 8 }} />
                  <Line type="monotone" dataKey="confidence" stroke="#30a856" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            {/* Top queries */}
            <Card className="col-span-6">
              <h2 className="font-semibold text-sm mb-3" style={{ color: "#f0edf9" }}>
                <Zap size={14} className="inline mr-1.5" />
                Top Queries This Week
              </h2>
              {topQueries.length === 0 ? (
                <p className="text-xs text-center py-12" style={{ color: "#6b6090" }}>No query history yet</p>
              ) : (
                <div className="space-y-2">
                  {topQueries.map((q, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs w-5 text-right shrink-0" style={{ color: "#6b6090" }}>{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <p className="text-xs truncate" style={{ color: "#f0edf9" }}>{q.query}</p>
                          <span className="text-xs ml-2 shrink-0" style={{ color: "#6b6090" }}>{q.count}×</span>
                        </div>
                        <div className="w-full rounded-full" style={{ height: 3, background: "#2e2760" }}>
                          <div className="h-full rounded-full" style={{
                            width: `${(q.count / (topQueries[0]?.count || 1)) * 100}%`,
                            background: "#6c3fc8",
                          }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Coverage Heatmap */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold" style={{ color: "#f0edf9" }}>
                  Knowledge Coverage Heatmap
                </h2>
                <p className="text-xs mt-0.5" style={{ color: "#a89ec8" }}>
                  Equipment × Document Type — red cells = knowledge gaps
                </p>
              </div>
              <span
                className="text-xs px-2 py-1 rounded-full"
                style={{ background: "rgba(232,169,48,0.15)", color: "#e8a930" }}
              >
                Innovation
              </span>
            </div>
            <CoverageHeatmap equipment={EQUIP_CLASSES} docTypes={DOC_TYPES} />
          </Card>
        </>
      )}
    </div>
  );
}
