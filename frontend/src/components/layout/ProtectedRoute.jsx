import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAppStore } from "../../store/useAppStore";

export default function ProtectedRoute({ children }) {
  const token = useAppStore((s) => s.token);
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
