import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Upload,
  Library,
  MessageSquare,
  GitFork,
  Cpu,
  Zap,
  ShieldCheck,
  Wrench,
  BarChart2,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { useAppStore } from "../../store/useAppStore";

const NAV_ITEMS = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/upload", icon: Upload, label: "Ingestion" },
  { to: "/library", icon: Library, label: "Documents" },
  { to: "/query", icon: MessageSquare, label: "AI Assistant" },
  { to: "/graph", icon: GitFork, label: "Knowledge Graph" },
  { to: "/equipment", icon: Cpu, label: "Equipment" },
  { to: "/failures", icon: Zap, label: "Failure DNA" },
  { to: "/compliance", icon: ShieldCheck, label: "Compliance" },
  { to: "/maintenance", icon: Wrench, label: "Maintenance" },
  { to: "/analytics", icon: BarChart2, label: "Analytics" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, clearAuth, user } = useAppStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    clearAuth();
    navigate("/login");
  };

  return (
    <aside
      className="fixed left-0 top-0 h-full flex flex-col z-40 transition-all duration-300"
      style={{
        width: sidebarCollapsed ? 64 : 220,
        background: "var(--bg-surface)",
        borderRight: "1px solid var(--border-subtle)",
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-4 py-5"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        {/* Hexagonal logo mark */}
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <path
            d="M16 2L28.7 9.5V24.5L16 32L3.3 24.5V9.5L16 2Z"
            fill="rgba(108,63,200,0.2)"
            stroke="#6c3fc8"
            strokeWidth="1.5"
          />
          <path
            d="M16 7L24.6 12V22L16 27L7.4 22V12L16 7Z"
            fill="rgba(108,63,200,0.15)"
            stroke="#8b5de8"
            strokeWidth="1"
          />
          <circle cx="16" cy="16" r="3" fill="#6c3fc8" />
        </svg>
        {!sidebarCollapsed && (
          <div>
            <div className="font-bold text-sm tracking-wide" style={{ color: "#f0edf9" }}>
              ELIXARA
            </div>
            <div className="text-xs" style={{ color: "#6b6090" }}>
              Industrial AI
            </div>
          </div>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-[10px] transition-all duration-150 group ${
                isActive
                  ? "bg-[rgba(108,63,200,0.2)] text-[#8b5de8]"
                  : "text-[#a89ec8] hover:bg-[rgba(108,63,200,0.1)] hover:text-[#f0edf9]"
              }`
            }
          >
            <Icon size={18} className="shrink-0" />
            {!sidebarCollapsed && (
              <span className="text-sm font-medium truncate">{label}</span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User + collapse */}
      <div style={{ borderTop: "1px solid var(--border-subtle)" }} className="p-3 space-y-2">
        {!sidebarCollapsed && user && (
          <div className="flex items-center gap-2 px-2 py-1">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{ background: "var(--purple)", color: "white" }}
            >
              {(user.username || "U")[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium truncate" style={{ color: "#f0edf9" }}>
                {user.username}
              </p>
              <p className="text-xs truncate" style={{ color: "#6b6090" }}>
                {user.role}
              </p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-[10px] text-sm transition-colors"
          style={{ color: "#6b6090" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#e83030";
            e.currentTarget.style.background = "rgba(232,48,48,0.1)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "#6b6090";
            e.currentTarget.style.background = "transparent";
          }}
        >
          <LogOut size={16} />
          {!sidebarCollapsed && <span>Logout</span>}
        </button>
        <button
          onClick={toggleSidebar}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-[10px] text-sm transition-colors"
          style={{ color: "#6b6090" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(108,63,200,0.1)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          {!sidebarCollapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
