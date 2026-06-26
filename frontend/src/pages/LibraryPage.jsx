import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Filter, Grid, List, FileText, Trash2,
  ExternalLink, RefreshCw, Eye, ChevronDown,
} from "lucide-react";
import { listDocs, deleteDoc } from "../api/docs";
import { Card, StatusBadge, EntityChip, Spinner, EmptyState } from "../components/ui/index.jsx";
import { Button } from "../components/ui/Button";
import toast from "react-hot-toast";

const DOC_TYPE_COLORS = {
  manual: "#6c3fc8",
  inspection: "#e8a930",
  procedure: "#30c8a9",
  work_order: "#5a9ee8",
  regulatory: "#e85a30",
  unknown: "#6b6090",
};

const DOC_TYPES = ["manual", "inspection", "procedure", "work_order", "regulatory", "unknown"];

function DocCard({ doc, onDelete, onView, onQuery }) {
  const color = DOC_TYPE_COLORS[doc.doc_type] || "#6b6090";
  return (
    <Card
      className="flex flex-col gap-3 cursor-pointer transition-all duration-150 group"
      style={{ borderColor: "var(--border-subtle)" }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#3d3570")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-subtle)")}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${color}22` }}
        >
          <FileText size={18} style={{ color }} />
        </div>
        <StatusBadge status={doc.status} />
      </div>

      {/* Name */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: "#f0edf9" }}>
          {doc.filename}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: `${color}22`, color }}
          >
            {doc.doc_type}
          </span>
          <span className="text-xs" style={{ color: "#6b6090" }}>
            {new Date(doc.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 text-xs" style={{ color: "#a89ec8" }}>
        <span>{doc.total_chunks || 0} chunks</span>
        <span>·</span>
        <span>{doc.total_entities || 0} entities</span>
      </div>

      {/* Actions */}
      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button size="xs" variant="secondary" onClick={() => onView(doc)}>
          <Eye size={12} /> View
        </Button>
        <Button size="xs" variant="primary" onClick={() => onQuery(doc)}>
          <ExternalLink size={12} /> Query
        </Button>
        <Button size="xs" variant="danger" onClick={() => onDelete(doc)}>
          <Trash2 size={12} />
        </Button>
      </div>
    </Card>
  );
}

function DocTableRow({ doc, onDelete, onView, onQuery }) {
  const color = DOC_TYPE_COLORS[doc.doc_type] || "#6b6090";
  return (
    <tr
      className="border-b transition-colors cursor-pointer"
      style={{ borderColor: "var(--border-subtle)" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-surface-2)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <FileText size={14} style={{ color }} />
          <span className="text-sm" style={{ color: "#f0edf9" }}>{doc.filename}</span>
        </div>
      </td>
      <td className="py-3 px-4">
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${color}22`, color }}>
          {doc.doc_type}
        </span>
      </td>
      <td className="py-3 px-4 text-xs" style={{ color: "#a89ec8" }}>
        {new Date(doc.created_at).toLocaleDateString()}
      </td>
      <td className="py-3 px-4 text-xs" style={{ color: "#a89ec8" }}>
        {doc.total_chunks || 0}
      </td>
      <td className="py-3 px-4 text-xs" style={{ color: "#a89ec8" }}>
        {doc.total_entities || 0}
      </td>
      <td className="py-3 px-4">
        <StatusBadge status={doc.status} />
      </td>
      <td className="py-3 px-4">
        <div className="flex gap-1">
          <Button size="xs" variant="ghost" onClick={() => onView(doc)}><Eye size={11} /></Button>
          <Button size="xs" variant="primary" onClick={() => onQuery(doc)}><ExternalLink size={11} /></Button>
          <Button size="xs" variant="danger" onClick={() => onDelete(doc)}><Trash2 size={11} /></Button>
        </div>
      </td>
    </tr>
  );
}

function DocViewer({ doc, onClose }) {
  if (!doc) return null;
  const color = DOC_TYPE_COLORS[doc.doc_type] || "#6b6090";

  return (
    <div
      className="fixed right-0 top-0 h-full w-96 z-50 overflow-y-auto"
      style={{
        background: "var(--bg-surface)",
        borderLeft: "1px solid var(--border-medium)",
        boxShadow: "-8px 0 32px rgba(0,0,0,0.4)",
      }}
    >
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm" style={{ color: "#f0edf9" }}>
            Document Details
          </h3>
          <button onClick={onClose} className="text-xs px-2 py-1 rounded" style={{ color: "#6b6090" }}>
            ✕ Close
          </button>
        </div>

        <div
          className="w-full h-24 rounded-xl flex items-center justify-center mb-4"
          style={{ background: `${color}18`, border: `1px solid ${color}33` }}
        >
          <FileText size={40} style={{ color }} />
        </div>

        <h2 className="font-semibold mb-1" style={{ color: "#f0edf9" }}>
          {doc.filename}
        </h2>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: `${color}22`, color }}>
          {doc.doc_type}
        </span>

        <div
          className="mt-4 p-3 rounded-xl space-y-2 text-xs"
          style={{ background: "var(--bg-surface-2)" }}
        >
          {[
            ["Doc ID", doc.doc_id?.slice(0, 8) + "…"],
            ["Status", doc.status],
            ["Chunks", doc.total_chunks || 0],
            ["Entities", doc.total_entities || 0],
            ["Created", new Date(doc.created_at).toLocaleString()],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <span style={{ color: "#6b6090" }}>{k}</span>
              <span style={{ color: "#f0edf9" }}>{v}</span>
            </div>
          ))}
        </div>

        {doc.entity_summary && (
          <div className="mt-4 space-y-3">
            <p className="text-xs font-semibold" style={{ color: "#a89ec8" }}>Extracted Entities</p>
            {Object.entries(doc.entity_summary).map(([type, vals]) =>
              vals.length > 0 ? (
                <div key={type}>
                  <p className="text-xs mb-1.5 capitalize" style={{ color: "#6b6090" }}>
                    {type.replace("_", " ")}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {vals.slice(0, 10).map((v) => (
                      <EntityChip key={v} type={type.replace("_tags", "")} label={v} />
                    ))}
                    {vals.length > 10 && (
                      <span className="text-xs" style={{ color: "#6b6090" }}>
                        +{vals.length - 10} more
                      </span>
                    )}
                  </div>
                </div>
              ) : null
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function LibraryPage() {
  const navigate = useNavigate();
  const [docs, setDocs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("grid"); // grid | list
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [selectedDoc, setSelectedDoc] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 50 };
      if (filterType) params.doc_type = filterType;
      if (filterStatus) params.status = filterStatus;
      const data = await listDocs(params);
      setDocs(data.documents || []);
      setTotal(data.total || 0);
    } catch (err) {
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, [filterType, filterStatus]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (doc) => {
    if (!window.confirm(`Delete "${doc.filename}"? This cannot be undone.`)) return;
    try {
      await deleteDoc(doc.doc_id);
      toast.success("Document deleted");
      load();
      if (selectedDoc?.doc_id === doc.doc_id) setSelectedDoc(null);
    } catch {
      toast.error("Delete failed");
    }
  };

  const handleQuery = (doc) => navigate(`/query?scope=${doc.doc_id}`);

  const filtered = docs.filter((d) =>
    search ? d.filename.toLowerCase().includes(search.toLowerCase()) : true
  );

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#f0edf9" }}>Document Library</h1>
          <p className="text-sm mt-0.5" style={{ color: "#a89ec8" }}>
            {total} documents indexed
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={load}>
            <RefreshCw size={14} /> Refresh
          </Button>
          <Button size="sm" onClick={() => navigate("/upload")}>
            + Upload
          </Button>
        </div>
      </div>

      {/* Filters row */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#6b6090" }} />
          <input
            type="text"
            placeholder="Search documents…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm"
          />
        </div>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 text-sm"
        >
          <option value="">All Types</option>
          {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 text-sm"
        >
          <option value="">All Status</option>
          <option value="indexed">Indexed</option>
          <option value="queued">Queued</option>
          <option value="failed">Failed</option>
        </select>

        <div
          className="flex rounded-lg overflow-hidden"
          style={{ border: "1px solid var(--border-medium)" }}
        >
          {[["grid", Grid], ["list", List]].map(([mode, Icon]) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className="px-3 py-2 transition-colors"
              style={{
                background: viewMode === mode ? "var(--bg-surface-2)" : "transparent",
                color: viewMode === mode ? "#f0edf9" : "#6b6090",
              }}
            >
              <Icon size={14} />
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20"><Spinner size={36} /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No documents found"
          description="Upload plant documents to begin building your knowledge base"
          action={<Button onClick={() => navigate("/upload")}>Upload Documents</Button>}
        />
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-3 gap-4">
          {filtered.map((doc) => (
            <DocCard
              key={doc.doc_id}
              doc={doc}
              onDelete={handleDelete}
              onView={setSelectedDoc}
              onQuery={handleQuery}
            />
          ))}
        </div>
      ) : (
        <Card className="p-0 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr style={{ background: "var(--bg-surface-2)", borderBottom: "1px solid var(--border-subtle)" }}>
                {["File", "Type", "Date", "Chunks", "Entities", "Status", "Actions"].map((h) => (
                  <th key={h} className="text-left py-2.5 px-4 text-xs font-semibold" style={{ color: "#6b6090" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((doc) => (
                <DocTableRow
                  key={doc.doc_id}
                  doc={doc}
                  onDelete={handleDelete}
                  onView={setSelectedDoc}
                  onQuery={handleQuery}
                />
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Side panel */}
      {selectedDoc && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setSelectedDoc(null)}
          />
          <DocViewer doc={selectedDoc} onClose={() => setSelectedDoc(null)} />
        </>
      )}
    </div>
  );
}
