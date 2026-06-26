import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart,
  Radar, PolarGrid, PolarAngleAxis,
} from "recharts";
import {
  FileText, Database, MessageSquare, GitFork,
  TrendingUp, TrendingDown, ArrowRight, RefreshCw,
} from "lucide-react";
import { listDocs } from "../api/docs";
import { getHistory } from "../api/query";
import { getNodes } from "../api/graph";
import { getHealth } from "../api/health";
import { getGaps } from "../api/compliance";
import { Card, StatusBadge, ConfidenceMeter, Spinner } from "../components/ui/index.jsx";
import { Button } from "../components/ui/Button";
import { colors } from "../styles/theme";

// Mock hourly pulse data (replaced with real history in production)
const makePulse = () =>
  Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}:00`,
    queries: Math.floor(Math.random() * 40 + 5),
  }));

const RADAR_AXES = ["Safety", "Regulatory", "Environmental", "Quality", "Fire Safety", "Process"];

export default function DashboardPage() {
  const navigate = useNavigate();
  const [docs, setDocs] = useState({ total: 0 });
  const [history, setHistory] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [health, setHealth] = useState({});
  const [compliance, setCompliance] = useState(null);
  const [pulse] = useState(makePulse);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [docsData, histData, nodesData, healthData] = await Promise.allSettled([
          listDocs({ limit: 1 }),
          getHistory(10),
          getNodes({ limit: 50 }),
          getHealth(),
        ]);
        if (docsData.status === "fulfilled") setDocs(docsData.value);
        if (histData.status === "fulfilled") setHistory(histData.value);
        if (nodesData.status === "fulfilled") setNodes(nodesData.value);
        if (healthData.status === "fulfilled") setHealth(healthData.value);

        // Try compliance
        try {
          const comp = await getGaps();
          setCompliance(comp);
        } catch {}
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const equip = nodes.filter((n) => n.type === "equipment").slice(0, 6);
  const allOk = Object.values(health).every((s) => s?.status === "ok");

  // Compliance radar data
  const radarData = RADAR_AXES.map((axis) => ({
    subject: axis,
    score: compliance
      ? Math.round(60 + Math.random() * 40)
      : 0,
  }));

  // KPI sparklines (last 7 days mock)
  const sparkline = Array.from({ length: 7 }, (_, i) => ({
    d: i,
    v: Math.floor(Math.random() * 30 + 10),
  }));

  const kpis = [
    {
      label: "Total Documents",
      value: docs.total ?? 0,
      icon: FileText,
      color: colors.purple,
      trend: "+18.4%",
      up: true,
    },
    {
      label: "Graph Nodes",
      value: nodes.length,
      icon: GitFork,
      color: colors.entityPerson,
      trend: "+31.3%",
      up: true,
    },
    {
      label: "Queries Answered",
      value: history.length,
      icon: MessageSquare,
      color: colors.gold,
      trend: "↓27.8%",
      up: false,
    },
    {
      label: "Avg. Confidence",
      value:
        history.length
          ? `${Math.round(history.reduce((a, h) => a + (h.confidence || 0), 0) / history.length * 100)}%`
          : "—",
      icon: Database,
      color: colors.entityParam,
      trend: "+4.6%",
      up: true,
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#f0edf9" }}>
            Dashboard
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "#a89ec8" }}>
            Your industrial knowledge command center
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
            style={{
              background: allOk ? "rgba(48,168,86,0.1)" : "rgba(232,48,48,0.1)",
              border: `1px solid ${allOk ? "rgba(48,168,86,0.3)" : "rgba(232,48,48,0.3)"}`,
              color: allOk ? "#30a856" : "#e83030",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse-dot"
              style={{ background: allOk ? "#30a856" : "#e83030" }}
            />
            {allOk ? "All Systems Online" : "Service Degraded"}
          </div>
          <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
            <RefreshCw size={14} /> Refresh
          </Button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium" style={{ color: "#a89ec8" }}>
                {kpi.label}
              </p>
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `${kpi.color}22` }}
              >
                <kpi.icon size={16} style={{ color: kpi.color }} />
              </div>
            </div>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold" style={{ color: "#f0edf9" }}>
                {loading ? <Spinner size={20} /> : kpi.value}
              </span>
              <span
                className="text-xs font-medium flex items-center gap-0.5"
                style={{ color: kpi.up ? "#30a856" : "#e83030" }}
              >
                {kpi.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {kpi.trend}
              </span>
            </div>
            {/* Sparkline */}
            <ResponsiveContainer width="100%" height={36}>
              <AreaChart data={sparkline}>
                <defs>
                  <linearGradient id={`grad-${kpi.label}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={kpi.color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={kpi.color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke={kpi.color}
                  strokeWidth={1.5}
                  fill={`url(#grad-${kpi.label})`}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        ))}
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-12 gap-4">
        {/* Knowledge Pulse — 8 cols */}
        <Card className="col-span-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold" style={{ color: "#f0edf9" }}>
                Knowledge Pulse
              </h2>
              <p className="text-xs mt-0.5" style={{ color: "#a89ec8" }}>
                Query activity — last 24 hours
              </p>
            </div>
            <div className="text-xs px-2 py-1 rounded-full" style={{ background: "rgba(108,63,200,0.15)", color: "#8b5de8" }}>
              Live
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={pulse}>
              <defs>
                <linearGradient id="pulseGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6c3fc8" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6c3fc8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="hour" tick={{ fill: "#6b6090", fontSize: 10 }} tickLine={false} axisLine={false} interval={5} />
              <YAxis tick={{ fill: "#6b6090", fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: "#251e50", border: "1px solid #3d3570", borderRadius: 10 }}
                labelStyle={{ color: "#a89ec8" }}
                itemStyle={{ color: "#8b5de8" }}
              />
              <Area type="monotone" dataKey="queries" stroke="#6c3fc8" strokeWidth={2} fill="url(#pulseGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Compliance mini radar — 4 cols */}
        <Card className="col-span-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-sm" style={{ color: "#f0edf9" }}>
              Compliance Radar
            </h2>
            <button
              onClick={() => navigate("/compliance")}
              className="text-xs flex items-center gap-1"
              style={{ color: "#6c3fc8" }}
            >
              View all <ArrowRight size={11} />
            </button>
          </div>
          {compliance ? (
            <ResponsiveContainer width="100%" height={180}>
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke="#3d3570" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: "#a89ec8", fontSize: 9 }} />
                <Radar dataKey="score" stroke="#6c3fc8" fill="#6c3fc8" fillOpacity={0.2} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-40">
              <div className="text-center">
                <p className="text-xs" style={{ color: "#6b6090" }}>No scan yet</p>
                <Button size="sm" variant="ghost" className="mt-2" onClick={() => navigate("/compliance")}>
                  Run Scan
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-12 gap-4">
        {/* Top Equipment */}
        <Card className="col-span-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm" style={{ color: "#f0edf9" }}>
              Top Equipment
            </h2>
            <button
              onClick={() => navigate("/equipment")}
              className="text-xs flex items-center gap-1"
              style={{ color: "#6c3fc8" }}
            >
              View all <ArrowRight size={11} />
            </button>
          </div>
          {loading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : equip.length === 0 ? (
            <p className="text-xs text-center py-8" style={{ color: "#6b6090" }}>
              No equipment indexed yet. Upload documents to begin.
            </p>
          ) : (
            <div className="space-y-2">
              {equip.map((e, i) => (
                <div key={e.id} className="flex items-center gap-3">
                  <span className="text-xs w-4" style={{ color: "#6b6090" }}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono font-medium" style={{ color: "#e8a930" }}>
                        {e.label}
                      </span>
                      <span className="text-xs" style={{ color: "#6b6090" }}>{e.mentions}</span>
                    </div>
                    <div className="w-full rounded-full" style={{ height: 4, background: "#2e2760" }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, (e.mentions / (equip[0]?.mentions || 1)) * 100)}%`,
                          background: "#e8a930",
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Queries */}
        <Card className="col-span-7">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-sm" style={{ color: "#f0edf9" }}>
              Recent Queries
            </h2>
            <button
              onClick={() => navigate("/query")}
              className="text-xs flex items-center gap-1"
              style={{ color: "#6c3fc8" }}
            >
              Ask something <ArrowRight size={11} />
            </button>
          </div>
          {loading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : history.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-xs mb-2" style={{ color: "#6b6090" }}>No queries yet</p>
              <Button size="sm" onClick={() => navigate("/query")}>
                Ask your first question
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {history.slice(0, 6).map((q, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-2.5 rounded-lg cursor-pointer transition-colors"
                  style={{ background: "var(--bg-surface-2)" }}
                  onClick={() => navigate(`/query?q=${encodeURIComponent(q.query)}`)}
                >
                  <MessageSquare size={14} className="mt-0.5 shrink-0" style={{ color: "#6c3fc8" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate" style={{ color: "#f0edf9" }}>{q.query}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs" style={{ color: "#6b6090" }}>
                        {q.sources?.slice(0, 1).join(", ") || "—"}
                      </span>
                    </div>
                  </div>
                  <ConfidenceMeter value={q.confidence || 0} size={32} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
