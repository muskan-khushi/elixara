// gateway/routes/query.routes.js
const express = require("express");
const axios   = require("axios");

const { requireAuth } = require("../middleware/auth");
const SERVICES        = require("../config/services");

const router = express.Router();

// GET /api/query/stream  — SSE streaming (MUST NOT buffer)
router.get("/stream", requireAuth, async (req, res) => {
  // Set SSE headers FIRST before any async work
  res.setHeader("Content-Type",       "text/event-stream");
  res.setHeader("Cache-Control",      "no-cache");
  res.setHeader("Connection",         "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");   // disable nginx buffering if behind proxy
  res.flushHeaders();

  try {
    const upstream = await axios.get(`${SERVICES.rag}/stream`, {
      params:       { q: req.query.q, scope_doc_id: req.query.scope_doc_id },
      responseType: "stream",    // CRITICAL: do not let axios buffer the response
      timeout:      120_000,     // 2-minute timeout for slow LLM generation
    });

    upstream.data.pipe(res);
    upstream.data.on("end",   () => res.end());
    upstream.data.on("error", (err) => {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    });

    // If browser disconnects, destroy upstream
    req.on("close", () => upstream.data.destroy());

  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: "RAG service unavailable: " + err.message })}\n\n`);
    res.end();
  }
});

// POST /api/query  — blocking JSON response
router.post("/", requireAuth, async (req, res) => {
  try {
    const resp = await axios.post(`${SERVICES.rag}/query`, req.body, { timeout: 90_000 });
    res.json(resp.data);
  } catch (err) {
    res.status(502).json({ error: "RAG service error", detail: err.message });
  }
});

// GET /api/query/history
router.get("/history", requireAuth, async (req, res) => {
  try {
    const resp = await axios.get(`${SERVICES.rag}/history`, {
      params:  req.query,
      timeout: 5_000,
    });
    res.json(resp.data);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// POST /api/query/rebuild-index — trigger BM25 rebuild after ingestion
router.post("/rebuild-index", requireAuth, async (req, res) => {
  try {
    const resp = await axios.post(`${SERVICES.rag}/rebuild-index`, {}, { timeout: 30_000 });
    res.json(resp.data);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

module.exports = router;