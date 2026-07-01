import React, { useEffect, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Send, X, Clock, ChevronRight,
  FileText, Zap, Star, Copy, RotateCcw,
} from "lucide-react";
import { useStream } from "../hooks/useStream";
import { useQueryStore } from "../store/useQueryStore";
import { getHistory } from "../api/query";
import { listDocs } from "../api/docs";
import {
  Card, ConfidenceMeter, StatusBadge, Spinner, EntityChip,
} from "../components/ui/index.jsx";
import { Button } from "../components/ui/Button";
import toast from "react-hot-toast";

const EXAMPLE_QUERIES = [
  "What is the lubrication interval for P-101 main bearing?",
  "List all safety procedures for pressure vessel inspection",
  "Why did Compressor C-204 fail in March 2024?",
  "What OISD regulations apply to pump maintenance?",
  "When was the last inspection of HX-102?",
  "What is the safe working pressure for the high-pressure vessels?",
];

/** Highlight equipment tags, regulations, and [N] citations in answer text */
function highlightAnswer(text) {
  return text
    .replace(/\b([A-Z]{1,4}-\d{2,4}[A-Z]?)\b/g, '<span class="entity-equip">$1</span>')
    .replace(/\[(\d+)\]/g, '<span class="citation">[$1]</span>')
    .replace(
      /\b(OISD-\d+|PESO[\s\-]\w+|Factory Act[\s\w.]+|ISO[\s\-]\d+)\b/gi,
      '<span class="entity-reg">$1</span>'
    )
    .replace(/⚠/g, '<span style="color:#e8a930">⚠</span>');
}

function SourceCard({ source, index }) {
  const score = source.rerank_score || 0;
  const pct = Math.max(0, Math.min(100, ((score + 10) / 20) * 100));
  const color = pct > 65 ? "#30a856" : pct > 40 ? "#e8a930" : "#e83030";
  return (
    <div
      className="p-3 rounded-xl space-y-2"
      style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border-subtle)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            style={{ background: "rgba(108,63,200,0.25)", color: "#8b5de8" }}
          >
            {index}
          </span>
          <p className="text-xs font-medium truncate" style={{ color: "#f0edf9" }}>
            {source.doc_name}
          </p>
        </div>
        <span className="text-xs shrink-0" style={{ color }}>
          {Math.round(pct)}%
        </span>
      </div>
      {source.section && (
        <p className="text-xs" style={{ color: "#6b6090" }}>§ {source.section}</p>
      )}
      <div className="w-full rounded-full" style={{ height: 3, background: "#2e2760" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <p className="text-xs leading-relaxed" style={{ color: "#a89ec8" }}>
        {source.excerpt?.slice(0, 200)}{source.excerpt?.length > 200 ? "…" : ""}
      </p>
    </div>
  );
}

export default function QueryPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { submit, cancel } = useStream();
  const {
    currentQuery, currentAnswer, currentSources,
    currentConfidence, isStreaming, isCached, scopeDocId,
    setScopeDocId, clearCurrent,
  } = useQueryStore();

  const [input, setInput] = useState("");
  const [history, setHistory] = useState([]);
  const [docs, setDocs] = useState([]);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const answerRef = useRef(null);
  const inputRef = useRef(null);

  // Rotate placeholder
  useEffect(() => {
    const t = setInterval(() => setPlaceholderIdx((i) => (i + 1) % EXAMPLE_QUERIES.length), 4000);
    return () => clearInterval(t);
  }, []);

  // Load history + docs
  useEffect(() => {
    getHistory(50).then(setHistory).catch(() => {});
    listDocs({ status: "indexed", limit: 50 }).then((d) => setDocs(d.documents || [])).catch(() => {});
  }, []);

  // Handle ?q= and ?scope= from URL
  useEffect(() => {
    const q = searchParams.get("q");
    const scope = searchParams.get("scope");
    if (scope) setScopeDocId(scope);
    if (q) {
      setInput(q);
      setTimeout(() => handleSubmit(q, scope), 300);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll answer
  useEffect(() => {
    if (answerRef.current) {
      answerRef.current.scrollTop = answerRef.current.scrollHeight;
    }
  }, [currentAnswer]);

  const handleSubmit = (q = input, scope = scopeDocId) => {
    const query = (q || input).trim();
    if (!query || isStreaming) return;
    setInput("");
    submit(query, scope || null);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const copyAnswer = () => {
    navigator.clipboard.writeText(currentAnswer);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="flex h-[calc(100vh-120px)] gap-5 animate-fade-in">
      {/* Left — Query History */}
      <div
        className="w-64 shrink-0 flex flex-col rounded-2xl overflow-hidden"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
      >
        <div className="p-3 border-b" style={{ borderColor: "var(--border-subtle)" }}>
          <p className="text-xs font-semibold" style={{ color: "#a89ec8" }}>
            <Clock size={12} className="inline mr-1" />
            Recent Queries
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {history.length === 0 ? (
            <p className="text-xs text-center py-8" style={{ color: "#6b6090" }}>
              No history yet
            </p>
          ) : (
            history.map((h, i) => (
              <button
                key={i}
                onClick={() => { setInput(h.query); handleSubmit(h.query); }}
                className="w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors"
                style={{ color: "#a89ec8" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-surface-2)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <p className="truncate" style={{ color: "#f0edf9" }}>{h.query}</p>
                <p className="mt-0.5" style={{ color: "#6b6090" }}>
                  {Math.round((h.confidence || 0) * 100)}% confidence
                </p>
              </button>
            ))
          )}
        </div>

        {/* Example queries */}
        <div className="p-3 border-t space-y-1" style={{ borderColor: "var(--border-subtle)" }}>
          <p className="text-xs font-semibold mb-2" style={{ color: "#6b6090" }}>Try asking…</p>
          {EXAMPLE_QUERIES.slice(0, 3).map((q, i) => (
            <button
              key={i}
              onClick={() => { setInput(q); handleSubmit(q); }}
              className="w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors"
              style={{ color: "#6c3fc8" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(108,63,200,0.1)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <ChevronRight size={10} className="inline mr-1" />
              {q.slice(0, 48)}…
            </button>
          ))}
        </div>
      </div>

      {/* Center — Main query area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Scope selector */}
        <div
          className="flex items-center gap-3 p-3 mb-3 rounded-xl"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
        >
          <span className="text-xs font-medium" style={{ color: "#a89ec8" }}>Scope:</span>
          <select
            value={scopeDocId || ""}
            onChange={(e) => setScopeDocId(e.target.value || null)}
            className="flex-1 text-xs py-1 px-2"
            style={{ background: "var(--bg-surface-2)", border: "1px solid var(--border-medium)", borderRadius: 8 }}
          >
            <option value="">All Documents</option>
            {docs.map((d) => (
              <option key={d.doc_id} value={d.doc_id}>{d.filename}</option>
            ))}
          </select>
          {scopeDocId && (
            <button onClick={() => setScopeDocId(null)} style={{ color: "#6b6090" }}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* Answer area */}
        <div
          ref={answerRef}
          className="flex-1 overflow-y-auto rounded-2xl p-5 mb-3"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
        >
          {!currentQuery && !isStreaming ? (
            <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(108,63,200,0.15)" }}
              >
                <Zap size={28} style={{ color: "#6c3fc8" }} />
              </div>
              <div>
                <h2 className="text-xl font-bold mb-2" style={{ color: "#f0edf9" }}>
                  Expert Knowledge Copilot
                </h2>
                <p className="text-sm" style={{ color: "#a89ec8" }}>
                  Ask any question about your plant documents. Get cited, accurate answers.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 max-w-lg w-full">
                {EXAMPLE_QUERIES.slice(0, 4).map((q, i) => (
                  <button
                    key={i}
                    onClick={() => { setInput(q); handleSubmit(q); }}
                    className="text-left p-3 rounded-xl text-xs transition-all"
                    style={{
                      background: "var(--bg-surface-2)",
                      border: "1px solid var(--border-medium)",
                      color: "#a89ec8",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#6c3fc8"; e.currentTarget.style.color = "#f0edf9"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-medium)"; e.currentTarget.style.color = "#a89ec8"; }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Question */}
              <div className="flex items-start gap-3">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: "var(--purple)", color: "white", fontSize: 11, fontWeight: 700 }}
                >
                  Q
                </div>
                <p className="text-sm font-medium pt-1" style={{ color: "#f0edf9" }}>
                  {currentQuery}
                </p>
              </div>

              {/* Answer */}
              <div className="flex items-start gap-3">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: "rgba(108,63,200,0.25)", border: "1px solid #6c3fc8" }}
                >
                  <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
                    <path d="M16 2L28.7 9.5V24.5L16 32L3.3 24.5V9.5L16 2Z" fill="#6c3fc8" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  {currentAnswer ? (
                    <div
                      className={`text-sm leading-relaxed ${isStreaming ? "streaming-cursor" : ""}`}
                      style={{ color: "#f0edf9" }}
                      dangerouslySetInnerHTML={{ __html: highlightAnswer(currentAnswer) }}
                    />
                  ) : isStreaming ? (
                    <div className="flex items-center gap-2">
                      <Spinner size={16} />
                      <span className="text-sm" style={{ color: "#6b6090" }}>Thinking…</span>
                    </div>
                  ) : null}

                  {!isStreaming && currentAnswer && (
                    <div className="flex items-center gap-2 mt-3">
                      {isCached && (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(48,144,232,0.15)", color: "#3090e8", border: "1px solid rgba(48,144,232,0.3)" }}>
                          ⚡ Cached
                        </span>
                      )}
                      <button onClick={copyAnswer} className="text-xs flex items-center gap-1" style={{ color: "#6b6090" }}>
                        <Copy size={11} /> Copy
                      </button>
                      <button onClick={clearCurrent} className="text-xs flex items-center gap-1" style={{ color: "#6b6090" }}>
                        <RotateCcw size={11} /> New
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input bar */}
        <div
          className="flex items-end gap-3 p-3 rounded-2xl"
          style={{ background: "var(--bg-surface)", border: "1px solid var(--border-medium)" }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={EXAMPLE_QUERIES[placeholderIdx]}
            rows={2}
            className="flex-1 resize-none bg-transparent text-sm outline-none border-none"
            style={{ color: "#f0edf9", minHeight: 44 }}
          />
          <div className="flex items-center gap-2 shrink-0">
            {isStreaming ? (
              <Button variant="danger" size="sm" onClick={cancel}>
                <X size={14} /> Stop
              </Button>
            ) : (
              <Button size="sm" onClick={() => handleSubmit()} disabled={!input.trim()}>
                <Send size={14} /> Ask
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Right — Sources + Confidence */}
      <div
        className="w-72 shrink-0 flex flex-col rounded-2xl overflow-hidden"
        style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
      >
        <div className="p-3 border-b" style={{ borderColor: "var(--border-subtle)" }}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold" style={{ color: "#a89ec8" }}>
              <Star size={12} className="inline mr-1" />
              Sources & Confidence
            </p>
            {currentConfidence > 0 && (
              <ConfidenceMeter value={currentConfidence} size={44} />
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {currentSources.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
              <FileText size={28} style={{ color: "#3d3570" }} />
              <p className="text-xs" style={{ color: "#6b6090" }}>
                Sources will appear here after your query is answered
              </p>
            </div>
          ) : (
            <>
              {currentSources.map((src, i) => (
                <SourceCard key={i} source={src} index={i + 1} />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
