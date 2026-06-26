import React, { useEffect, useState } from "react";
import {
  Settings, Activity, Cpu, Database, Zap,
  RefreshCw, CheckCircle, XCircle, Clock,
} from "lucide-react";
import { getHealth } from "../api/health";
import { rebuildIndex } from "../api/query";
import { Card, Spinner, Progress } from "../components/ui/index.jsx";
import { Button } from "../components/ui/Button";
import toast from "react-hot-toast";

const SERVICE_META = {
  ingest:     { label: "Ingest Service",     port: 5001, icon: Database },
  rag:        { label: "RAG Service",        port: 5002, icon: Zap },
  graph:      { label: "Graph Service",      port: 5003, icon: Activity },
  compliance: { label: "Compliance Service", port: 5004, icon: CheckCircle },
  ollama:     { label: "Ollama (LLM/Embed)", port: 11434, icon: Cpu },
};

function ServiceCard({ name, data }) {
  const meta = SERVICE_META[name] || { label: name, port: "—", icon: Activity };
  const Icon = meta.icon;
  const ok = data?.status === "ok";
  const latency = data?.latency_ms;

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl"
      style={{
        background: "var(--bg-surface-2)",
        border: `1px solid ${ok ? "rgba(48,168,86,0.25)" : "rgba(232,48,48,0.25)"}`,
      }}
    >
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: ok ? "rgba(48,168,86,0.12)" : "rgba(232,48,48,0.12)" }}
      >
        <Icon size={16} style={{ color: ok ? "#30a856" : "#e83030" }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium" style={{ color: "#f0edf9" }}>{meta.label}</p>
          <div className="flex items-center gap-1.5">
            {ok ? (
              <CheckCircle size={13} style={{ color: "#30a856" }} />
            ) : (
              <XCircle size={13} style={{ color: "#e83030" }} />
            )}
            <span className="text-xs" style={{ color: ok ? "#30a856" : "#e83030" }}>
              {ok ? "Online" : "Down"}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-xs" style={{ color: "#6b6090" }}>
          <span>:{meta.port}</span>
          {latency !== null && latency !== undefined && (
            <span className="flex items-center gap-1">
              <Clock size={10} /> {latency}ms
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const [health, setHealth] = useState({});
  const [loading, setLoading] = useState(true);
  const [rebuilding, setRebuilding] = useState(false);

  // Model config state
  const [temperature, setTemperature] = useState(0.1);
  const [maxTokens, setMaxTokens] = useState(512);
  const [chunkSize, setChunkSize] = useState(400);
  const [chunkOverlap, setChunkOverlap] = useState(100);

  const loadHealth = async () => {
    setLoading(true);
    try {
      const data = await getHealth();
      setHealth(data);
    } catch {
      toast.error("Could not reach gateway");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHealth();
    const interval = setInterval(loadHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleRebuildIndex = async () => {
    setRebuilding(true);
    try {
      await rebuildIndex();
      toast.success("BM25 index rebuilt successfully");
    } catch {
      toast.error("Index rebuild failed");
    } finally {
      setRebuilding(false);
    }
  };

  const allOk = Object.values(health).every((s) => s?.status === "ok");
  const services = Object.entries(health);

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#f0edf9" }}>Settings</h1>
        <p className="text-sm mt-0.5" style={{ color: "#a89ec8" }}>
          System health, model configuration, and index management
        </p>
      </div>

      {/* System Health */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold" style={{ color: "#f0edf9" }}>System Health</h2>
            <div
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs"
              style={{
                background: allOk ? "rgba(48,168,86,0.12)" : "rgba(232,48,48,0.12)",
                color: allOk ? "#30a856" : "#e83030",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse-dot"
                style={{ background: allOk ? "#30a856" : "#e83030" }}
              />
              {allOk ? "All Systems Nominal" : "Degraded"}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={loadHealth} loading={loading}>
            <RefreshCw size={13} /> Refresh
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {services.length === 0 ? (
              <p className="text-sm col-span-2 text-center py-6" style={{ color: "#6b6090" }}>
                Could not reach gateway on :4000 — is it running?
              </p>
            ) : (
              services.map(([name, data]) => (
                <ServiceCard key={name} name={name} data={data} />
              ))
            )}
          </div>
        )}
      </Card>

      {/* AI Model Settings */}
      <Card>
        <h2 className="font-semibold mb-4" style={{ color: "#f0edf9" }}>AI Model Configuration</h2>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: "var(--bg-surface-2)" }}>
              <Cpu size={16} style={{ color: "#6c3fc8" }} />
              <div>
                <p className="text-xs font-semibold" style={{ color: "#f0edf9" }}>LLM Model</p>
                <p className="text-xs font-mono" style={{ color: "#e8a930" }}>phi4-mini (3.8B Q4_K_M)</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: "var(--bg-surface-2)" }}>
              <Zap size={16} style={{ color: "#30c8a9" }} />
              <div>
                <p className="text-xs font-semibold" style={{ color: "#f0edf9" }}>Embedding Model</p>
                <p className="text-xs font-mono" style={{ color: "#30c8a9" }}>nomic-embed-text (137M, 768-dim)</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: "var(--bg-surface-2)" }}>
              <Activity size={16} style={{ color: "#5a9ee8" }} />
              <div>
                <p className="text-xs font-semibold" style={{ color: "#f0edf9" }}>Reranker</p>
                <p className="text-xs font-mono" style={{ color: "#5a9ee8" }}>ms-marco-MiniLM-L-6-v2 (22MB)</p>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <div className="flex justify-between text-xs mb-2">
                <label style={{ color: "#a89ec8" }}>Temperature</label>
                <span className="font-mono" style={{ color: "#f0edf9" }}>{temperature}</span>
              </div>
              <input
                type="range" min={0} max={1} step={0.05} value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full accent-purple-600"
              />
              <p className="text-xs mt-1" style={{ color: "#6b6090" }}>
                Lower = more deterministic answers (recommended: 0.1)
              </p>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-2">
                <label style={{ color: "#a89ec8" }}>Max Tokens</label>
                <span className="font-mono" style={{ color: "#f0edf9" }}>{maxTokens}</span>
              </div>
              <input
                type="range" min={128} max={1024} step={64} value={maxTokens}
                onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                className="w-full accent-purple-600"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Chunking settings */}
      <Card>
        <h2 className="font-semibold mb-4" style={{ color: "#f0edf9" }}>
          Chunking & Retrieval Parameters
        </h2>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-5">
            <div>
              <div className="flex justify-between text-xs mb-2">
                <label style={{ color: "#a89ec8" }}>Chunk Size (tokens)</label>
                <span className="font-mono" style={{ color: "#f0edf9" }}>{chunkSize}</span>
              </div>
              <input
                type="range" min={200} max={1000} step={50} value={chunkSize}
                onChange={(e) => setChunkSize(parseInt(e.target.value))}
                className="w-full accent-purple-600"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-2">
                <label style={{ color: "#a89ec8" }}>Chunk Overlap (tokens)</label>
                <span className="font-mono" style={{ color: "#f0edf9" }}>{chunkOverlap}</span>
              </div>
              <input
                type="range" min={0} max={200} step={25} value={chunkOverlap}
                onChange={(e) => setChunkOverlap(parseInt(e.target.value))}
                className="w-full accent-purple-600"
              />
            </div>
          </div>

          <div className="space-y-3">
            {[
              ["Dense Top-K", "20", "ChromaDB cosine similarity candidates"],
              ["Sparse Top-K", "20", "BM25 term-frequency candidates"],
              ["RRF k constant", "60", "Reciprocal rank fusion smoothing"],
              ["Rerank Top-K", "5", "Cross-encoder final candidates"],
            ].map(([label, value, desc]) => (
              <div key={label} className="flex items-center justify-between p-2.5 rounded-xl" style={{ background: "var(--bg-surface-2)" }}>
                <div>
                  <p className="text-xs font-semibold" style={{ color: "#f0edf9" }}>{label}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#6b6090" }}>{desc}</p>
                </div>
                <span className="font-mono text-sm font-bold" style={{ color: "#6c3fc8" }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Index management */}
      <Card>
        <h2 className="font-semibold mb-4" style={{ color: "#f0edf9" }}>Index Management</h2>
        <div className="grid grid-cols-2 gap-4">
          <div
            className="p-4 rounded-xl"
            style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border-medium)" }}
          >
            <p className="text-sm font-semibold mb-1" style={{ color: "#f0edf9" }}>
              Rebuild BM25 Index
            </p>
            <p className="text-xs mb-3" style={{ color: "#a89ec8" }}>
              Reloads all chunks from MongoDB into the in-memory BM25 sparse retrieval index.
              Run after adding new documents.
            </p>
            <Button size="sm" loading={rebuilding} onClick={handleRebuildIndex}>
              <RefreshCw size={13} /> Rebuild Now
            </Button>
          </div>

          <div
            className="p-4 rounded-xl"
            style={{ background: "var(--bg-surface-2)", border: "1px solid rgba(232,48,48,0.25)" }}
          >
            <p className="text-sm font-semibold mb-1" style={{ color: "#e83030" }}>
              Danger Zone
            </p>
            <p className="text-xs mb-3" style={{ color: "#a89ec8" }}>
              Re-ingest all documents with current chunk settings. All vectors and
              graph data will be rebuilt. This takes significant time.
            </p>
            <Button
              size="sm"
              variant="danger"
              onClick={() => toast.error("Re-ingestion must be triggered via the backend CLI for safety")}
            >
              Re-ingest All
            </Button>
          </div>
        </div>
      </Card>

      {/* Version info */}
      <div className="text-center pb-4">
        <p className="text-xs" style={{ color: "#3d3570" }}>
          Elixara v1.0.0 · CPU-Only · Zero Cloud Cost · Built for Indian Industry
        </p>
        <p className="text-xs mt-1" style={{ color: "#3d3570" }}>
          MinerU · phi4-mini · nomic-embed-text · ChromaDB · BM25 + RRF + CrossEncoder
        </p>
      </div>
    </div>
  );
}
