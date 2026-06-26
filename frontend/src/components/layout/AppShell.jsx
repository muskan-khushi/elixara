import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { useAppStore } from "../../store/useAppStore";

export default function AppShell() {
  const { sidebarCollapsed } = useAppStore();

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg-page)" }}>
      <Sidebar />
      <div
        className="flex flex-col flex-1 min-w-0 transition-all duration-300"
        style={{
          marginLeft: sidebarCollapsed ? 64 : 220,
        }}
      >
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
