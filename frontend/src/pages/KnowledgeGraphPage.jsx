import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GitFork, Search, X, Zap, Filter, Info } from "lucide-react";
import { getNodes, getEdges, findPath } from "../api/graph";
import { useGraphStore } from "../store/useGraphStore";
import { useD3Graph } from "../hooks/useD3Graph";
import { Card, EntityChip, Spinner } from "../components/ui/index.jsx";
import { Button } from "../components/ui/Button";
import { ENTITY_COLORS } from "../styles/theme";
import toast from "react-hot-toast";

const ENTITY_TYPES = [
  { key: "equipment", label: "Equipment", color: "#e8a930" },
  { key: "regulation", label: "Regulation", color: "#e85a30" },
  { key: "person", label: "Personnel", color: "#30c8a9" },
  { key: "process_param", label: "Process Param", color: "#5a9ee8" },
  { key: "location", label: "Location", color: "#a830c8" },
];

function NodeInfoPanel({ node, onClose, onQuery }) {
  if (!node) return null;
  const color = ENTITY_COLORS[node.type] || "#6c3fc8";
  return (
    <motion.div
      initial={{ x: 320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 320, opacity: 0 }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="absolute right-0 top-0 h-full w-72 z-20 overflow-y-auto"
      style={{
        background: "var(--bg-surface)",
        borderLeft: "1px solid var(--border-medium)",
        boxShadow: "-8px 0 24px rgba(0,0,0,0.4)",
      }}
    >
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold" style={{ color: "#a89ec8" }}>Node Details</p>
          <button onClick={onClose} style={{ color: "#6b6090" }}><X size={15} /></button>
        </div>

        <div
          className="w-full h-20 rounded-xl flex items-center justify-center"
          style={{ background: `${color}18`, border: `1px solid ${color}44` }}
        >
          <span className="font-mono font-bold text-lg" style={{ color }}>{node.label}</span>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span style={{ color: "#6b6090" }}>Type</span>
            <EntityChip type={node.type} label={node.type} />
          </div>
          <div className="flex justify-between">
            <span style={{ color: "#6b6090" }}>Mentions</span>
            <span style={{ color: "#f0edf9" }}>{node.mentions}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: "#6b6090" }}>Node ID</span>
            <span className="font-mono text-xs" style={{ color: "#6c3fc8" }}>{node.id?.slice(0, 20)}</span>
          </div>
        </div>

        <Button
          size="sm"
          className="w-full"
          onClick={() => onQuery(node)}
        >
          <Zap size={13} /> Ask About This
        </Button>
      </div>
    </motion.div>
  );
}

export default function KnowledgeGraphPage() {
  const svgRef = useRef(null);
  const {
    nodes, edges, selectedNode, typeFilters, minMentions, pathResult,
    setNodes, setEdges, setSelectedNode, toggleTypeFilter, setMinMentions, setPathResult,
  } = useGraphStore();

  const [loading, setLoading] = useState(true);
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [pathLoading, setPathLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  // Filtered nodes/edges by type + minMentions
  const visibleNodes = nodes.filter(
    (n) => typeFilters[n.type] !== false && (n.mentions || 1) >= minMentions
  );
  const visibleNodeIds = new Set(visibleNodes.map((n) => n.id));
  const visibleEdges = edges.filter(
    (e) => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)
  );

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [nodesData, edgesData] = await Promise.all([
          getNodes({ limit: 500, min_mentions: 1 }),
          getEdges({ limit: 2000 }),
        ]);
        setNodes(nodesData);
        setEdges(edgesData);
      } catch {
        toast.error("Failed to load knowledge graph");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleFindPath = async () => {
    if (!fromId || !toId) return toast.error("Enter both node IDs");
    setPathLoading(true);
    try {
      const result = await findPath(fromId, toId);
      setPathResult(result);
      if (result.hops === -1) toast.error("No path found within 5 hops");
      else toast.success(`Path found: ${result.hops} hop${result.hops !== 1 ? "s" : ""}`);
    } catch {
      toast.error("Pathfinder failed");
    } finally {
      setPathLoading(false);
    }
  };

  const handleNodeQuery = (node) => {
    window.location.href = `/query?q=${encodeURIComponent(`Tell me everything about ${node.label}`)}`;
  };

  useD3Graph(svgRef, { nodes: visibleNodes, edges: visibleEdges }, {
    onNodeClick: setSelectedNode,
    pathNodeIds: pathResult?.path || [],
  });

  return (
    <div className="flex h-[calc(100vh-120px)] gap-4 animate-fade-in">
      {/* Left controls */}
      <div
        className="w-60 shrink-0 flex flex-col rounded-2xl overflow-hidden"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
      >
        {/* Stats */}
        <div className="p-3 border-b" style={{ borderColor: "var(--border-subtle)" }}>
          <p className="text-xs font-semibold mb-2" style={{ color: "#a89ec8" }}>
            <GitFork size={12} className="inline mr-1" />
            Graph Stats
          </p>
          <div className="grid grid-cols-2 gap-2">
            {[
              ["Nodes", visibleNodes.length],
              ["Edges", visibleEdges.length],
            ].map(([k, v]) => (
              <div key={k} className="rounded-lg p-2 text-center" style={{ background: "var(--bg-surface-2)" }}>
                <p className="text-lg font-bold" style={{ color: "#f0edf9" }}>{v}</p>
                <p className="text-xs" style={{ color: "#6b6090" }}>{k}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="p-3 border-b" style={{ borderColor: "var(--border-subtle)" }}>
          <button
            className="flex items-center justify-between w-full text-xs font-semibold mb-2"
            style={{ color: "#a89ec8" }}
            onClick={() => setShowFilters((v) => !v)}
          >
            <span><Filter size={12} className="inline mr-1" />Entity Types</span>
          </button>
          {ENTITY_TYPES.map(({ key, label, color }) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer py-1.5">
              <input
                type="checkbox"
                checked={typeFilters[key] !== false}
                onChange={() => toggleTypeFilter(key)}
                className="w-3.5 h-3.5 rounded accent-purple-600"
              />
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
              <span className="text-xs" style={{ color: "#a89ec8" }}>{label}</span>
            </label>
          ))}

          <div className="mt-3">
            <label className="text-xs mb-1 block" style={{ color: "#6b6090" }}>
              Min mentions: {minMentions}
            </label>
            <input
              type="range"
              min={1}
              max={20}
              value={minMentions}
              onChange={(e) => setMinMentions(Number(e.target.value))}
              className="w-full accent-purple-600"
            />
          </div>
        </div>

        {/* Pathfinder */}
        <div className="p-3 flex-1">
          <p className="text-xs font-semibold mb-3" style={{ color: "#a89ec8" }}>
            <Zap size={12} className="inline mr-1" />
            Pathfinder
          </p>
          <div className="space-y-2">
            <input
              type="text"
              placeholder="From: equip:P-101"
              value={fromId}
              onChange={(e) => setFromId(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-mono"
            />
            <input
              type="text"
              placeholder="To: reg:OISD-137"
              value={toId}
              onChange={(e) => setToId(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-mono"
            />
            <Button
              size="sm"
              className="w-full"
              loading={pathLoading}
              onClick={handleFindPath}
            >
              Find Path
            </Button>
          </div>

          {pathResult && pathResult.hops >= 0 && (
            <div className="mt-3 space-y-1">
              <p className="text-xs font-semibold" style={{ color: "#e8a930" }}>
                Path: {pathResult.hops} hop{pathResult.hops !== 1 ? "s" : ""}
              </p>
              {pathResult.labels?.map((label, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  {i > 0 && <div className="w-px h-3 ml-2.5" style={{ background: "#3d3570" }} />}
                  <span
                    className="text-xs font-mono px-2 py-0.5 rounded"
                    style={{ background: "rgba(232,169,48,0.15)", color: "#e8a930" }}
                  >
                    {label}
                  </span>
                </div>
              ))}
              <button
                onClick={() => setPathResult(null)}
                className="text-xs mt-1"
                style={{ color: "#6b6090" }}
              >
                Clear path
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Graph canvas */}
      <div
        className="flex-1 relative rounded-2xl overflow-hidden"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-subtle)",
          backgroundImage: "radial-gradient(circle at 50% 50%, rgba(108,63,200,0.04) 0%, transparent 70%)",
        }}
      >
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-3">
              <Spinner size={40} />
              <p className="text-sm" style={{ color: "#6b6090" }}>Loading knowledge graph…</p>
            </div>
          </div>
        ) : visibleNodes.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-3">
              <GitFork size={48} style={{ color: "#3d3570" }} className="mx-auto" />
              <p className="text-sm" style={{ color: "#6b6090" }}>
                No graph data yet. Upload and ingest documents first.
              </p>
            </div>
          </div>
        ) : (
          <svg ref={svgRef} className="w-full h-full" />
        )}

        {/* Legend */}
        <div
          className="absolute bottom-4 left-4 flex gap-3 flex-wrap"
          style={{ pointerEvents: "none" }}
        >
          {ENTITY_TYPES.filter((t) => typeFilters[t.key] !== false).map(({ key, label, color }) => (
            <div key={key} className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full"
              style={{ background: "rgba(15,11,38,0.8)", color: "#a89ec8", border: "1px solid #2e2755" }}>
              <span className="w-2 h-2 rounded-full" style={{ background: color }} />
              {label}
            </div>
          ))}
        </div>

        {/* Hint */}
        <div
          className="absolute top-3 right-3 flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg"
          style={{ background: "rgba(15,11,38,0.8)", color: "#6b6090", border: "1px solid #2e2755" }}
        >
          <Info size={11} /> Drag nodes · Scroll to zoom · Click for details
        </div>

        {/* Node info panel */}
        <AnimatePresence>
          {selectedNode && (
            <NodeInfoPanel
              node={selectedNode}
              onClose={() => setSelectedNode(null)}
              onQuery={handleNodeQuery}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
