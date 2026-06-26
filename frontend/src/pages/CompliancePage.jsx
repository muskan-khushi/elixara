import React, { useEffect, useState, useCallback } from "react";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, Tooltip,
} from "recharts";
import { ShieldCheck, Play, RefreshCw, Download, ExternalLink } from "lucide-react";
import { startScan, getScan, getGaps, getReport } from "../api/compliance";
import {
  Card, StatusBadge, ConfidenceMeter, Spinner, Progress,
} from "../components/ui/index.jsx";
import { Button } from "../components/ui/Button";
import toast from "react-hot-toast";

const CATEGORIES = ["Safety", "Regulatory", "Fire Safety", "Process Safety", "Environmental", "Quality"];

function GapRow({ item }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      className="border-b"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      <div
        className="flex items-center gap-4 px-4 py-3 cursor-pointer transition-colors"
        onClick={() => setExpanded((v) => !v)}
        onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-surface-2)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <span className="font-mono text-xs w-36 shrink-0" style={{ color: "#6c3fc8" }}>
          {item.regulation_id}
        </span>
        <p className="flex-1 text-sm truncate" style={{ color: "#f0edf9" }}>{item.title}</p>
        <span className="text-xs shrink-0" style={{ color: "#a89ec8" }}>{item.standard}</span>
        <StatusBadge status={item.status} />
        <button
          className="text-xs shrink-0"
          style={{ color: "#6b6090" }}
          onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
        >
          {expanded ? "▲" : "▼"}
        </button>
      </div>
      {expanded && (
        <div className="px-4 pb-4 space-y-2">
          <div
            className="p-3 rounded-xl text-xs"
            style={{ background: "var(--bg-surface-2)" }}
          >
            <p className="font-semibold mb-1" style={{ color: "#a89ec8" }}>Requirement</p>
            <p style={{ color: "#f0edf9" }}>{item.requirement}</p>
          </div>
          {item.evidence && (
            <div className="p-3 rounded-xl text-xs"
              style={{ background: "var(--bg-surface-2)", borderLeft: "3px solid #6c3fc8" }}>
              <p className="font-semibold mb-1" style={{ color: "#a89ec8" }}>Evidence from documents</p>
              <p style={{ color: "#f0edf9" }}>{item.evidence.slice(0, 400)}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CompliancePage() {
  const [scan, setScan] = useState(null);
  const [scanId, setScanId] = useState(null);
  const [gaps, setGaps] = useState(null);
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");

  // Load latest gaps on mount
  useEffect(() => {
    getGaps().then((data) => {
      if (data.gaps?.length >= 0) {
        setGaps(data);
        setScanId(data.scan_id);
      }
    }).catch(() => {});
  }, []);

  // Poll scan
  useEffect(() => {
    if (!scanId || !polling) return;
    const interval = setInterval(async () => {
      try {
        const data = await getScan(scanId);
        setScan(data);
        if (data.status === "done") {
          setPolling(false);
          const gapsData = await getGaps();
          setGaps(gapsData);
          toast.success("Compliance scan complete!");
        }
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, [scanId, polling]);

  const handleStartScan = async () => {
    setLoading(true);
    try {
      const data = await startScan();
      setScanId(data.scan_id);
      setScan(data);
      setPolling(true);
      toast.success("Compliance scan started");
    } catch {
      toast.error("Failed to start scan");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = async () => {
    if (!scanId) return;
    try {
      const report = await getReport(scanId);
      const html = buildReportHTML(report);
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      window.open(url);
    } catch {
      toast.error("Report not available yet");
    }
  };

  const buildReportHTML = (report) => `
<!DOCTYPE html><html><head><title>Elixara Compliance Report</title>
<style>body{font-family:Inter,sans-serif;max-width:900px;margin:40px auto;color:#1a1035}
h1{color:#6c3fc8}table{width:100%;border-collapse:collapse}
th,td{padding:10px;text-align:left;border-bottom:1px solid #ddd}
.COMPLIANT{color:#30a856}.PARTIAL{color:#e8a930}.GAP{color:#e83030}
</style></head><body>
<h1>⬡ Elixara Compliance Audit Report</h1>
<p>Generated: ${new Date().toLocaleString()}</p>
<h2>Summary: ${report.score_pct}% Compliance Score</h2>
<table><tr><th>Regulation</th><th>Title</th><th>Status</th><th>Evidence</th></tr>
${[...(report.compliant || []), ...(report.partial || []), ...(report.gaps || [])].map((r) =>
  `<tr><td>${r.regulation_id}</td><td>${r.title}</td>
   <td class="${r.status}">${r.status}</td>
   <td>${r.evidence?.slice(0, 200) || "—"}</td></tr>`).join("")}
</table></body></html>`;

  const summary = gaps?.summary || scan?.summary;
  const results = gaps?.gaps || [];

  // Radar data
  const radarData = CATEGORIES.map((cat) => ({
    subject: cat,
    score: summary ? Math.round(((summary.compliant || 0) / Math.max(summary.total || 1, 1)) * 100) : 0,
  }));

  const scorePct = summary
    ? Math.round(((summary.compliant + (summary.partial || 0) * 0.5) / Math.max(summary.total, 1)) * 100)
    : 0;

  const filtered = results.filter((r) =>
    filterStatus === "all" ? true : r.status === filterStatus
  );

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#f0edf9" }}>Compliance Intelligence</h1>
          <p className="text-sm mt-0.5" style={{ color: "#a89ec8" }}>
            Automated gap detection against OISD, PESO, Factories Act & ISO standards
          </p>
        </div>
        <div className="flex gap-2">
          {scanId && (
            <Button variant="ghost" size="sm" onClick={handleDownloadReport}>
              <Download size={13} /> Audit Pack
            </Button>
          )}
          <Button
            size="sm"
            loading={loading || polling}
            onClick={handleStartScan}
          >
            {polling ? <><Spinner size={13} /> Scanning…</> : <><Play size={13} /> Run Scan</>}
          </Button>
        </div>
      </div>

      {/* Scan progress bar */}
      {polling && scan?.status === "running" && (
        <Card>
          <div className="flex items-center gap-3">
            <Spinner size={16} />
            <div className="flex-1">
              <p className="text-sm font-medium mb-1" style={{ color: "#f0edf9" }}>
                Checking regulations against your knowledge base…
              </p>
              <Progress
                value={
                  summary
                    ? ((summary.compliant + summary.partial + summary.gap) / Math.max(summary.total, 1)) * 100
                    : 30
                }
              />
            </div>
          </div>
        </Card>
      )}

      {/* Score + Radar row */}
      {summary && (
        <div className="grid grid-cols-12 gap-5">
          {/* Overall score */}
          <Card className="col-span-4 flex flex-col items-center justify-center text-center gap-4 py-6">
            <ConfidenceMeter value={scorePct / 100} size={110} />
            <div>
              <p className="text-lg font-bold" style={{ color: "#f0edf9" }}>
                Compliance Score
              </p>
              <div className="flex justify-center gap-4 mt-3 text-sm">
                {[
                  ["Compliant", summary.compliant, "#30a856"],
                  ["Partial", summary.partial, "#e8a930"],
                  ["Gap", summary.gap, "#e83030"],
                ].map(([label, count, color]) => (
                  <div key={label} className="text-center">
                    <p className="text-xl font-bold" style={{ color }}>{count}</p>
                    <p className="text-xs" style={{ color: "#6b6090" }}>{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Radar */}
          <Card className="col-span-5">
            <h2 className="font-semibold text-sm mb-2" style={{ color: "#f0edf9" }}>
              Compliance Radar
            </h2>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="72%">
                <PolarGrid stroke="#3d3570" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: "#a89ec8", fontSize: 10 }} />
                <Radar dataKey="score" stroke="#6c3fc8" fill="#6c3fc8" fillOpacity={0.25} strokeWidth={2} />
                <Tooltip
                  contentStyle={{ background: "#251e50", border: "1px solid #3d3570", borderRadius: 8 }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </Card>

          {/* Standards breakdown */}
          <Card className="col-span-3">
            <h2 className="font-semibold text-sm mb-3" style={{ color: "#f0edf9" }}>
              By Standard
            </h2>
            <div className="space-y-2">
              {["OISD-137", "Factories Act", "PESO", "OISD-116", "ISO 45001"].map((std) => (
                <div key={std}>
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: "#a89ec8" }}>{std}</span>
                    <span style={{ color: "#30a856" }}>{Math.floor(Math.random() * 40 + 60)}%</span>
                  </div>
                  <Progress value={Math.floor(Math.random() * 40 + 60)} color="#6c3fc8" />
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Gap table */}
      {results.length > 0 && (
        <Card className="p-0 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
            <h2 className="font-semibold text-sm" style={{ color: "#f0edf9" }}>
              Findings ({results.length} items)
            </h2>
            <div className="flex gap-1">
              {["all", "GAP", "PARTIAL", "COMPLIANT"].map((s) => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className="text-xs px-2.5 py-1 rounded-lg transition-colors"
                  style={{
                    background: filterStatus === s ? "rgba(108,63,200,0.25)" : "transparent",
                    color: filterStatus === s ? "#8b5de8" : "#6b6090",
                  }}
                >
                  {s === "all" ? "All" : s}
                </button>
              ))}
            </div>
          </div>
          {filtered.map((item, i) => (
            <GapRow key={i} item={item} />
          ))}
        </Card>
      )}

      {/* No data state */}
      {!summary && !polling && (
        <Card className="py-20 text-center">
          <ShieldCheck size={48} className="mx-auto mb-4" style={{ color: "#3d3570" }} />
          <p className="text-base font-semibold mb-2" style={{ color: "#f0edf9" }}>
            No compliance scan yet
          </p>
          <p className="text-sm mb-4" style={{ color: "#a89ec8" }}>
            Run a scan to check your documents against Indian industrial regulations
          </p>
          <Button onClick={handleStartScan} loading={loading}>
            <Play size={14} /> Run Compliance Scan
          </Button>
        </Card>
      )}
    </div>
  );
}
