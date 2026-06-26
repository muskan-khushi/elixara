import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Sun, Moon, Bell, Activity } from "lucide-react";
import { useAppStore } from "../../store/useAppStore";

export default function Topbar() {
  const { theme, toggleTheme } = useAppStore();
  const [searchVal, setSearchVal] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e) => {
    if (e.key === "Enter" && searchVal.trim()) {
      navigate(`/query?q=${encodeURIComponent(searchVal.trim())}`);
      setSearchVal("");
    }
  };

  return (
    <header
      className="flex items-center gap-4 px-6 py-3 shrink-0"
      style={{
        background: "var(--bg-surface)",
        borderBottom: "1px solid var(--border-subtle)",
        height: 60,
      }}
    >
      {/* Global search */}
      <div className="flex-1 max-w-xl relative">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: "#6b6090" }}
        />
        <input
          type="search"
          value={searchVal}
          onChange={(e) => setSearchVal(e.target.value)}
          onKeyDown={handleSearch}
          placeholder="Ask anything about your plant, documents, equipment…"
          className="w-full pl-9 pr-4 py-2 text-sm"
          style={{
            background: "var(--bg-surface-2)",
            border: "1px solid var(--border-medium)",
            borderRadius: "var(--radius-md)",
            color: "var(--text-1)",
          }}
        />
        <span
          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs px-1.5 py-0.5 rounded"
          style={{
            background: "var(--bg-surface-3)",
            color: "var(--text-3)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          ⌘K
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* System status indicator */}
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{
            background: "rgba(48,168,86,0.1)",
            border: "1px solid rgba(48,168,86,0.25)",
            color: "#30a856",
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#30a856] animate-pulse-dot" />
          Live
        </div>

        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg transition-colors"
          style={{ color: "#a89ec8" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-surface-2)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        <button
          className="p-2 rounded-lg transition-colors relative"
          style={{ color: "#a89ec8" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-surface-2)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <Bell size={17} />
          <span
            className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
            style={{ background: "#e8a930" }}
          />
        </button>
      </div>
    </header>
  );
}
