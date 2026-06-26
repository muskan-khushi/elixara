import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { Cpu, Search, FileText, Zap, ArrowRight } from "lucide-react";
import { getNodes, getSubgraph } from "../api/graph";
import { listDocs } from "../api/docs";
import { Card, EntityChip, Spinner, EmptyState } from "../components/ui/index.jsx";
import { Button } from "../components/ui/Button";

export default function EquipmentPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [equipList, setEquipList] = useState([]);
  const [selected, setSelected] = useState(null);
  const [subgraph, setSubgraph] = useState(null);
  const [docs, setDocs] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [subLoading, setSubLoading] = useState(false);

  useEffect(() => {
    getNodes({ type: "equipment", limit: 200 }).then((n) => {
      setEquipList(n);
      setLoading(false);
      const tag = searchParams.get("tag");
      if (tag) {
        const found = n.find((e) => e.label === tag || e.id.includes(tag));
        if (found) handleSelect(found);
      }
    });
  }, []);

  const handleSelect = async (node) => {
    setSelected(node);
    setSubLoading(true);
    try {
      const [sg, docsData] = await Promise.all([
        getSubgraph(node.id, 2),
        listDocs({ status: "indexed", limit: 50 }),
      ]);
      setSubgraph(sg);
      setDocs(docsData.documents || []);
    } catch {}
    setSubLoading(false);
  };

  const filtered = equipList.filter((e) =>
    search ? e.label.toLowerCase().includes(search.toLowerCase()) : true
  );

  // Mock failure frequency data
  const failureData = Array.from({ length: 12 }, (_, i) => ({
    month: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][i],
    failures: Math.floor(Math.random() * 4),
  }));
  const avgFailures = failureData.reduce((a, b) => a + b.failures, 0) / failureData.length;

  const relatedRegs = subgraph?.nodes?.filter((n) => n.type === "regulation") || [];
  const relatedPersons = subgraph?.nodes?.filter((n) => n.type === "person") || [];

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#f0edf9" }}>Equipment Intelligence</h1>
        <p className="text-sm mt-0.5" style={{ color: "#a89ec8" }}>
          Equipment-centric knowledge — history, failures, regulations, documents
        </p>
      </div>

      <div className="grid grid-cols-12 gap-5">
        {/* Equipment selector */}
        <div
          className="col-span-3 rounded-2xl overflow-hidden flex flex-col"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", maxHeight: 600 }}
        >
          <div className="p-3 border-b" style={{ borderColor: "var(--border-subtle)" }}>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "#6b6090" }} />
              <input
                type="text"
                placeholder="Search equipment…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {loading ? (
              <div className="flex justify-center py-10"><Spinner /></div>
            ) : filtered.length === 0 ? (
              <p className="text-xs text-center py-10" style={{ color: "#6b6090" }}>No equipment indexed</p>
            ) : (
              filtered.map((e) => (
                <button
                  key={e.id}
                  onClick={() => handleSelect(e)}
                  className="w-full text-left px-3 py-2.5 rounded-xl transition-all"
                  style={{
                    background: selected?.id === e.id ? "rgba(108,63,200,0.2)" : "transparent",
                    border: `1px solid ${selected?.id === e.id ? "#6c3fc8" : "transparent"}`,
                  }}
                >
                  <p className="text-sm font-mono font-semibold" style={{ color: "#e8a930" }}>{e.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#6b6090" }}>{e.mentions} mentions</p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Detail area */}
        <div className="col-span-9 space-y-4">
          {!selected ? (
            <Card className="flex items-center justify-center h-64">
              <EmptyState
                icon={Cpu}
                title="Select equipment to explore"
                description="Choose a tag from the left panel to see intelligence"
              />
            </Card>
          ) : (
            <>
              {/* Header card */}
              <Card>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-3xl font-mono font-bold" style={{ color: "#e8a930" }}>
                        {selected.label}
                      </span>
                      <EntityChip type="equipment" label="equipment" />
                    </div>
                    <div className="flex items-center gap-4 text-sm" style={{ color: "#a89ec8" }}>
                      <span>{selected.mentions} document mentions</span>
                      <span>·</span>
                      <span>{subgraph?.edges?.length || 0} graph connections</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => navigate(`/query?q=${encodeURIComponent(`Tell me everything about ${selected.label}`)}`)}
                  >
                    <Zap size={13} /> Ask AI
                  </Button>
                </div>

                {subLoading && (
                  <div className="flex items-center gap-2 mt-3">
                    <Spinner size={14} /><span className="text-xs" style={{ color: "#6b6090" }}>Loading subgraph…</span>
                  </div>
                )}

                {!subLoading && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {relatedRegs.map((r) => <EntityChip key={r.id} type="regulation" label={r.label} />)}
                    {relatedPersons.map((p) => <EntityChip key={p.id} type="person" label={p.label} />)}
                  </div>
                )}
              </Card>

              <div className="grid grid-cols-2 gap-4">
                {/* Failure frequency */}
                <Card>
                  <h3 className="font-semibold text-sm mb-4" style={{ color: "#f0edf9" }}>
                    Failure Frequency (12 months)
                  </h3>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={failureData}>
                      <XAxis dataKey="month" tick={{ fill: "#6b6090", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#6b6090", fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ background: "#251e50", border: "1px solid #3d3570", borderRadius: 8 }}
                        labelStyle={{ color: "#a89ec8" }}
                      />
                      {/* Average line reference via max color */}
                      <Bar dataKey="failures" radius={[4, 4, 0, 0]}>
                        {failureData.map((entry, i) => (
                          <Cell
                            key={i}
                            fill={entry.failures > avgFailures ? "#e83030" : "#6c3fc8"}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Card>

                {/* Connected documents */}
                <Card>
                  <h3 className="font-semibold text-sm mb-3" style={{ color: "#f0edf9" }}>
                    Related Documents
                  </h3>
                  <div className="space-y-2 overflow-y-auto" style={{ maxHeight: 160 }}>
                    {docs.slice(0, 6).map((doc) => (
                      <div
                        key={doc.doc_id}
                        className="flex items-center gap-2 p-2 rounded-lg cursor-pointer"
                        style={{ background: "var(--bg-surface-2)" }}
                        onClick={() => navigate(`/query?scope=${doc.doc_id}&q=${encodeURIComponent(selected.label)}`)}
                      >
                        <FileText size={13} style={{ color: "#6c3fc8" }} />
                        <p className="text-xs truncate flex-1" style={{ color: "#f0edf9" }}>
                          {doc.filename}
                        </p>
                        <ArrowRight size={11} style={{ color: "#6b6090" }} />
                      </div>
                    ))}
                    {docs.length === 0 && (
                      <p className="text-xs" style={{ color: "#6b6090" }}>No documents indexed yet</p>
                    )}
                  </div>
                </Card>
              </div>

              {/* Scoped ask bar */}
              <Card>
                <p className="text-xs font-semibold mb-2" style={{ color: "#a89ec8" }}>
                  Ask about {selected.label}
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={`e.g. "What are the maintenance procedures for ${selected.label}?"`}
                    className="flex-1 px-3 py-2 text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        navigate(`/query?q=${encodeURIComponent(e.target.value)}`);
                      }
                    }}
                  />
                  <Button size="sm">Ask</Button>
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
