// gateway/server.js
require("dotenv").config({ path: "../.env" });

const express = require("express");
const cors    = require("cors");
const morgan  = require("morgan");

const config = require("./config");

const app = express();

// ── Middleware ────────────────────────────────────────────────────────────
app.use(cors({ origin: config.FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

// ── Routes ────────────────────────────────────────────────────────────────
app.use("/api/auth",       require("./routes/auth.routes"));
app.use("/api/docs",       require("./routes/docs.routes"));
app.use("/api/query",      require("./routes/query.routes"));
app.use("/api/graph",      require("./routes/graph.routes"));
app.use("/api/compliance", require("./routes/compliance.routes"));
app.use("/api/health",     require("./routes/health.routes"));

// ── Global error handler ──────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message });
});

// ── Start ─────────────────────────────────────────────────────────────────
app.listen(config.GATEWAY_PORT, () => {
  console.log(`⬡  Elixara Gateway running on :${config.GATEWAY_PORT}`);
});