import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import AppShell from "./components/layout/AppShell";
import ProtectedRoute from "./components/layout/ProtectedRoute";

import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import UploadPage from "./pages/UploadPage";
import LibraryPage from "./pages/LibraryPage";
import QueryPage from "./pages/QueryPage";
import KnowledgeGraphPage from "./pages/KnowledgeGraphPage";
import EquipmentPage from "./pages/EquipmentPage";
import FailureIntelPage from "./pages/FailureIntelPage";
import CompliancePage from "./pages/CompliancePage";
import MaintenancePage from "./pages/MaintenancePage";
import AnalyticsPage from "./pages/AnalyticsPage";
import SettingsPage from "./pages/SettingsPage";

const TOAST_STYLE = {
  background: "#251e50",
  color: "#f0edf9",
  border: "1px solid #3d3570",
  borderRadius: "10px",
  fontSize: "13px",
};

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: TOAST_STYLE,
          success: {
            iconTheme: { primary: "#30a856", secondary: "#251e50" },
          },
          error: {
            iconTheme: { primary: "#e83030", secondary: "#251e50" },
          },
        }}
      />

      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected — all inside AppShell */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          {/* Default redirect */}
          <Route index element={<Navigate to="/dashboard" replace />} />

          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="upload" element={<UploadPage />} />
          <Route path="library" element={<LibraryPage />} />
          <Route path="query" element={<QueryPage />} />
          <Route path="graph" element={<KnowledgeGraphPage />} />
          <Route path="equipment" element={<EquipmentPage />} />
          <Route path="failures" element={<FailureIntelPage />} />
          <Route path="compliance" element={<CompliancePage />} />
          <Route path="maintenance" element={<MaintenancePage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
