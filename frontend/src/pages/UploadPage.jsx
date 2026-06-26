import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { uploadDoc } from "../api/docs";
import { useDocStore } from "../store/useDocStore";
import { useIngestion } from "../hooks/useIngestion";
import { Card, StatusBadge, Spinner, Divider } from "../components/ui/index.jsx";
import { Button } from "../components/ui/Button";
import toast from "react-hot-toast";

const DOC_TYPES = [
  { value: "manual", label: "Manual" },
  { value: "inspection", label: "Inspection Report" },
  { value: "procedure", label: "Procedure" },
  { value: "work_order", label: "Work Order" },
  { value: "regulatory", label: "Regulatory" },
  { value: "unknown", label: "General" },
];

const PIPELINE_STEPS = [
  { key: "queued", label: "Job Registered", icon: null },
  { key: "parsing", label: "MinerU Parsing", desc: "Extracting structure, tables, text" },
  { key: "chunking", label: "Semantic Chunking", desc: "Splitting into retrieval units" },
  { key: "extracting", label: "Entity Extraction", desc: "phi4-mini NER — equipment, regs, personnel" },
  { key: "embedding", label: "Vector Embedding", desc: "nomic-embed-text → ChromaDB" },
  { key: "graphing", label: "Knowledge Graph", desc: "Building entity relationships" },
  { key: "done", label: "Indexed & Ready", desc: "Document is now queryable" },
];

const STATUS_ORDER = ["queued", "parsing", "chunking", "extracting", "embedding", "graphing", "done"];

function JobTimeline({ jobId }) {
  const job = useDocStore((s) => s.activeJobs[jobId]);
  useIngestion(jobId);

  if (!job) return null;

  const currentIdx = STATUS_ORDER.indexOf(job.status);
  const isFailed = job.status === "failed";

  return (
    <div className="space-y-3">
      {PIPELINE_STEPS.map((step, i) => {
        const done = !isFailed && (i < currentIdx || job.status === "done");
        const active = !isFailed && i === currentIdx && job.status !== "done";
        const pending = !done && !active;
        const failed = isFailed && i === currentIdx;

        return (
          <div key={step.key} className="flex items-start gap-3">
            {/* Icon */}
            <div className="mt-0.5 shrink-0">
              {failed ? (
                <XCircle size={18} style={{ color: "#e83030" }} />
              ) : done ? (
                <CheckCircle size={18} style={{ color: "#30a856" }} />
              ) : active ? (
                <Spinner size={18} color="#6c3fc8" />
              ) : (
                <div
                  className="w-[18px] h-[18px] rounded-full border-2"
                  style={{ borderColor: "#3d3570" }}
                />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0" style={{ opacity: pending ? 0.4 : 1 }}>
              <p
                className="text-sm font-medium"
                style={{ color: done || active ? "#f0edf9" : "#a89ec8" }}
              >
                {step.label}
              </p>
              {step.desc && (
                <p className="text-xs mt-0.5" style={{ color: "#6b6090" }}>
                  {step.desc}
                </p>
              )}
              {/* Event message for this step */}
              {job.events?.[i] && (
                <p className="text-xs mt-1 font-mono" style={{ color: "#6c3fc8" }}>
                  {job.events[i].message}
                </p>
              )}
            </div>
          </div>
        );
      })}

      {isFailed && job.error && (
        <div
          className="flex items-start gap-2 p-3 rounded-lg mt-2"
          style={{ background: "rgba(232,48,48,0.1)", border: "1px solid rgba(232,48,48,0.3)" }}
        >
          <AlertCircle size={15} style={{ color: "#e83030", marginTop: 1 }} />
          <p className="text-xs" style={{ color: "#e83030" }}>{job.error}</p>
        </div>
      )}

      {job.status === "done" && (
        <div
          className="mt-3 p-3 rounded-lg text-xs space-y-1"
          style={{ background: "rgba(48,168,86,0.08)", border: "1px solid rgba(48,168,86,0.2)" }}
        >
          <p style={{ color: "#30a856" }}>
            ✓ {job.total_chunks} chunks indexed · {job.total_entities} entities extracted
          </p>
        </div>
      )}
    </div>
  );
}

export default function UploadPage() {
  const [docType, setDocType] = useState("unknown");
  const [jobs, setJobs] = useState([]); // [{jobId, filename}]
  const [uploading, setUploading] = useState(false);
  const { addJob } = useDocStore();

  const onDrop = useCallback(
    async (accepted) => {
      if (!accepted.length) return;
      setUploading(true);
      for (const file of accepted) {
        try {
          const form = new FormData();
          form.append("file", file);
          form.append("doc_type", docType);
          const data = await uploadDoc(form);
          addJob({ job_id: data.job_id, status: "queued", events: [], filename: file.name });
          setJobs((prev) => [{ jobId: data.job_id, filename: file.name }, ...prev]);
          toast.success(`${file.name} queued for ingestion`);
        } catch (err) {
          toast.error(`Upload failed: ${err.response?.data?.error || err.message}`);
        }
      }
      setUploading(false);
    },
    [docType, addJob]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
    },
    maxSize: 50 * 1024 * 1024,
    disabled: uploading,
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#f0edf9" }}>
          Document Ingestion
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "#a89ec8" }}>
          Upload plant documents — MinerU parses, phi4-mini extracts, nomic-embed indexes
        </p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Drop Zone Panel */}
        <div className="col-span-5 space-y-4">
          {/* Doc type selector */}
          <Card>
            <label className="block text-xs font-medium mb-2" style={{ color: "#a89ec8" }}>
              Document Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {DOC_TYPES.map((dt) => (
                <button
                  key={dt.value}
                  onClick={() => setDocType(dt.value)}
                  className="py-1.5 px-2 rounded-lg text-xs font-medium transition-all"
                  style={{
                    background: docType === dt.value ? "rgba(108,63,200,0.25)" : "var(--bg-surface-2)",
                    border: `1px solid ${docType === dt.value ? "#6c3fc8" : "#3d3570"}`,
                    color: docType === dt.value ? "#8b5de8" : "#a89ec8",
                  }}
                >
                  {dt.label}
                </button>
              ))}
            </div>
          </Card>

          {/* Drop zone */}
          <div
            {...getRootProps()}
            className="rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200"
            style={{
              border: `2px dashed ${isDragActive ? "#6c3fc8" : "#3d3570"}`,
              background: isDragActive ? "rgba(108,63,200,0.08)" : "var(--bg-surface)",
              minHeight: 220,
            }}
          >
            <input {...getInputProps()} />
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "rgba(108,63,200,0.15)" }}
            >
              {uploading ? (
                <Spinner size={28} />
              ) : (
                <Upload size={28} style={{ color: "#6c3fc8" }} />
              )}
            </div>
            <p className="font-semibold" style={{ color: "#f0edf9" }}>
              {isDragActive ? "Drop files here" : "Drop files or click to upload"}
            </p>
            <p className="text-xs mt-1.5" style={{ color: "#6b6090" }}>
              PDF · DOCX · PPTX · XLSX · PNG · JPG — up to 50MB
            </p>
          </div>

          {/* Pipeline info */}
          <Card>
            <p className="text-xs font-semibold mb-2" style={{ color: "#a89ec8" }}>
              Ingestion Pipeline
            </p>
            <div className="space-y-1.5">
              {[
                ["MinerU", "86.2 OmniDocBench", "#e8a930"],
                ["phi4-mini", "NER entity extraction", "#30c8a9"],
                ["nomic-embed-text", "768-dim vectors", "#5a9ee8"],
                ["ChromaDB + BM25", "Hybrid retrieval index", "#6c3fc8"],
                ["Knowledge Graph", "MongoDB entity graph", "#a830c8"],
              ].map(([name, desc, color]) => (
                <div key={name} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
                  <span className="text-xs font-mono" style={{ color: "#f0edf9" }}>{name}</span>
                  <span className="text-xs" style={{ color: "#6b6090" }}>— {desc}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Timeline Panel */}
        <div className="col-span-7">
          <Card className="min-h-[500px]">
            <h2 className="font-semibold mb-4" style={{ color: "#f0edf9" }}>
              Live Ingestion Timeline
            </h2>
            {jobs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <FileText size={40} style={{ color: "#3d3570" }} />
                <p className="text-sm" style={{ color: "#6b6090" }}>
                  Upload a document to watch the pipeline in real time
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {jobs.map(({ jobId, filename }) => (
                  <div key={jobId}>
                    <div className="flex items-center gap-2 mb-3">
                      <FileText size={14} style={{ color: "#6c3fc8" }} />
                      <span className="text-sm font-medium truncate" style={{ color: "#f0edf9" }}>
                        {filename}
                      </span>
                    </div>
                    <JobTimeline jobId={jobId} />
                    <Divider className="mt-4" />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
