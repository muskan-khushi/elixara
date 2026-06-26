import React from "react";

// ── Badge ────────────────────────────────────────────────────
export function Badge({ variant = "purple", children, className = "" }) {
  return (
    <span className={`badge badge-${variant} ${className}`}>{children}</span>
  );
}

export function StatusBadge({ status }) {
  const map = {
    done: ["success", "Indexed"],
    indexed: ["success", "Indexed"],
    queued: ["info", "Queued"],
    parsing: ["info", "Parsing"],
    chunking: ["info", "Chunking"],
    extracting: ["warning", "Extracting"],
    embedding: ["warning", "Embedding"],
    graphing: ["warning", "Graphing"],
    failed: ["danger", "Failed"],
    running: ["info", "Running"],
    COMPLIANT: ["success", "Compliant"],
    PARTIAL: ["warning", "Partial"],
    GAP: ["danger", "Gap"],
  };
  const [variant, label] = map[status] || ["info", status];
  return (
    <span className={`badge badge-${variant}`}>
      <span
        className="w-1.5 h-1.5 rounded-full inline-block"
        style={{
          background:
            variant === "success"
              ? "#30a856"
              : variant === "warning"
              ? "#e8a930"
              : variant === "danger"
              ? "#e83030"
              : "#3090e8",
          animation:
            ["parsing", "chunking", "extracting", "embedding", "graphing", "running"].includes(status)
              ? "pulse-dot 1.5s ease infinite"
              : "none",
        }}
      />
      {label}
    </span>
  );
}

// ── Card ─────────────────────────────────────────────────────
export function Card({ children, className = "", elevated = false, ...props }) {
  return (
    <div className={`${elevated ? "card-elevated" : "card"} ${className}`} {...props}>
      {children}
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────────
export function Spinner({ size = 20, color = "#6c3fc8" }) {
  return (
    <span
      className="inline-block rounded-full border-2 border-transparent animate-spin"
      style={{
        width: size,
        height: size,
        borderTopColor: color,
        borderRightColor: color,
      }}
    />
  );
}

// ── ConfidenceMeter (SVG ring) ────────────────────────────────
export function ConfidenceMeter({ value = 0, size = 80 }) {
  const pct = Math.round(value * 100);
  const r = size / 2 - 8;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - value);
  const color =
    value >= 0.7 ? "#30a856" : value >= 0.4 ? "#e8a930" : "#e83030";

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#3d3570"
        strokeWidth={6}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={6}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 1s ease, stroke 0.3s" }}
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
        fontSize={size * 0.22}
        fontWeight="700"
        fill={color}
      >
        {pct}%
      </text>
    </svg>
  );
}

// ── Progress bar ──────────────────────────────────────────────
export function Progress({ value = 0, label = "", color = "#6c3fc8" }) {
  return (
    <div>
      {label && (
        <div className="flex justify-between text-xs mb-1" style={{ color: "#a89ec8" }}>
          <span>{label}</span>
          <span>{Math.round(value)}%</span>
        </div>
      )}
      <div
        className="w-full rounded-full overflow-hidden"
        style={{ height: 6, background: "#3d3570" }}
      >
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
    </div>
  );
}

// ── Entity Chip ───────────────────────────────────────────────
const ENTITY_STYLE = {
  equipment: { bg: "rgba(232,169,48,0.15)", color: "#e8a930", border: "rgba(232,169,48,0.3)" },
  regulation: { bg: "rgba(232,90,48,0.15)", color: "#e85a30", border: "rgba(232,90,48,0.3)" },
  person: { bg: "rgba(48,200,169,0.15)", color: "#30c8a9", border: "rgba(48,200,169,0.3)" },
  process_param: { bg: "rgba(90,158,232,0.15)", color: "#5a9ee8", border: "rgba(90,158,232,0.3)" },
  location: { bg: "rgba(168,48,200,0.15)", color: "#a830c8", border: "rgba(168,48,200,0.3)" },
};

export function EntityChip({ type = "equipment", label }) {
  const style = ENTITY_STYLE[type] || ENTITY_STYLE.equipment;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-medium"
      style={{
        background: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
      }}
    >
      {label}
    </span>
  );
}

// ── Empty State ───────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      {Icon && (
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: "rgba(108,63,200,0.15)" }}
        >
          <Icon size={28} style={{ color: "#6c3fc8" }} />
        </div>
      )}
      <div>
        <p className="font-semibold text-[#f0edf9] mb-1">{title}</p>
        {description && <p className="text-sm text-[#a89ec8]">{description}</p>}
      </div>
      {action}
    </div>
  );
}

// ── Divider ───────────────────────────────────────────────────
export function Divider({ className = "" }) {
  return (
    <div
      className={`w-full ${className}`}
      style={{ height: 1, background: "#2e2755" }}
    />
  );
}
