// gateway/routes/health.routes.js
const express = require("express");
const axios   = require("axios");

const SERVICES = require("../config/services");

const router = express.Router();

router.get("/", async (_req, res) => {
  const checks = await Promise.allSettled(
    Object.entries(SERVICES).map(async ([name, url]) => {
      const t0 = Date.now();
      try {
        await axios.get(`${url}/health`, { timeout: 3_000 });
        return [name, { status: "ok", latency_ms: Date.now() - t0 }];
      } catch {
        return [name, { status: "down", latency_ms: null }];
      }
    })
  );

  const health = Object.fromEntries(
    checks.map((r) => (r.status === "fulfilled" ? r.value : ["unknown", { status: "error" }]))
  );

  // Check Ollama separately (it's not a Python service)
  const t0 = Date.now();
  try {
    await axios.get("http://localhost:11434/api/tags", { timeout: 3_000 });
    health.ollama = { status: "ok", latency_ms: Date.now() - t0 };
  } catch {
    health.ollama = { status: "down", latency_ms: null };
  }

  const allOk = Object.values(health).every((s) => s.status === "ok");
  res.status(allOk ? 200 : 207).json(health);
});

module.exports = router;