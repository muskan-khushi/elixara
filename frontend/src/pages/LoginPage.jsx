import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login, getDemoToken } from "../api/auth";
import { useAppStore } from "../store/useAppStore";
import { Button } from "../components/ui/Button";
import toast from "react-hot-toast";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAppStore();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await login(username, password);
      setAuth(data.token, data.user);
      navigate("/dashboard");
    } catch {
      toast.error("Invalid credentials. Try demo / elixara2024");
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async () => {
    setLoading(true);
    try {
      const data = await getDemoToken();
      setAuth(data.token, data.user);
      navigate("/dashboard");
    } catch {
      toast.error("Could not reach gateway. Is it running on :4000?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        background: "var(--bg-page)",
        backgroundImage:
          "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(108,63,200,0.25) 0%, transparent 60%)",
      }}
    >
      <div
        className="w-full max-w-sm p-8 rounded-2xl"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-medium)",
          boxShadow: "var(--shadow-glow)",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <svg width="36" height="36" viewBox="0 0 32 32" fill="none">
            <path
              d="M16 2L28.7 9.5V24.5L16 32L3.3 24.5V9.5L16 2Z"
              fill="rgba(108,63,200,0.2)"
              stroke="#6c3fc8"
              strokeWidth="1.5"
            />
            <circle cx="16" cy="16" r="3" fill="#6c3fc8" />
          </svg>
          <div>
            <div className="font-bold tracking-widest text-sm" style={{ color: "#f0edf9" }}>
              ELIXARA
            </div>
            <div className="text-xs" style={{ color: "#6b6090" }}>
              Industrial Knowledge Intelligence
            </div>
          </div>
        </div>

        <h1 className="text-xl font-bold mb-1" style={{ color: "#f0edf9" }}>
          Welcome back
        </h1>
        <p className="text-sm mb-6" style={{ color: "#a89ec8" }}>
          Sign in to your plant workspace
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#a89ec8" }}>
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="demo"
              className="w-full px-3 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#a89ec8" }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="elixara2024"
              className="w-full px-3 py-2.5 text-sm"
            />
          </div>
          <Button type="submit" size="lg" loading={loading} className="w-full mt-2">
            Sign In
          </Button>
        </form>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full" style={{ height: 1, background: "var(--border-subtle)" }} />
          </div>
          <div className="relative flex justify-center text-xs" style={{ color: "#6b6090" }}>
            <span style={{ background: "var(--bg-surface)", padding: "0 12px" }}>or</span>
          </div>
        </div>

        <Button variant="secondary" size="lg" onClick={handleDemo} loading={loading} className="w-full">
          ⚡ Judge Demo Access
        </Button>

        <p className="text-xs text-center mt-4" style={{ color: "#6b6090" }}>
          Credentials: demo / elixara2024
        </p>
      </div>
    </div>
  );
}
