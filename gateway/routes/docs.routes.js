// gateway/routes/docs.routes.js
const express  = require("express");
const axios    = require("axios");
const FormData = require("form-data");
const fs       = require("fs");
const path     = require("path");

const { requireAuth } = require("../middleware/auth");
const { upload }      = require("../middleware/upload");
const SERVICES        = require("../config/services");

const router = express.Router();

// POST /api/docs/upload
router.post("/upload", requireAuth, (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
}, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const form = new FormData();
  form.append("file", fs.createReadStream(req.file.path), {
    filename:    req.file.originalname,
    contentType: req.file.mimetype,
  });
  form.append("doc_type", req.body.doc_type || "unknown");

  try {
    const resp = await axios.post(`${SERVICES.ingest}/upload`, form, {
      headers: form.getHeaders(),
      timeout: 30_000,
    });
    res.status(202).json(resp.data);
  } catch (err) {
    res.status(502).json({ error: "Ingest service error", detail: err.message });
  } finally {
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, () => {});  // clean up temp file
    }
  }
});

// GET /api/docs/jobs/:jobId
router.get("/jobs/:jobId", requireAuth, async (req, res) => {
  try {
    const resp = await axios.get(`${SERVICES.ingest}/jobs/${req.params.jobId}`, { timeout: 5_000 });
    res.json(resp.data);
  } catch (err) {
    const status = err.response?.status || 502;
    res.status(status).json({ error: err.response?.data?.detail || err.message });
  }
});

// GET /api/docs/jobs
router.get("/jobs", requireAuth, async (req, res) => {
  try {
    const resp = await axios.get(`${SERVICES.ingest}/jobs`, { timeout: 5_000 });
    res.json(resp.data);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// GET /api/docs
router.get("/", requireAuth, async (req, res) => {
  try {
    const resp = await axios.get(`${SERVICES.ingest}/docs`, {
      params:  req.query,
      timeout: 5_000,
    });
    res.json(resp.data);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// GET /api/docs/:docId
router.get("/:docId", requireAuth, async (req, res) => {
  try {
    const resp = await axios.get(`${SERVICES.ingest}/docs/${req.params.docId}`, { timeout: 5_000 });
    res.json(resp.data);
  } catch (err) {
    const status = err.response?.status || 502;
    res.status(status).json({ error: err.message });
  }
});

// DELETE /api/docs/:docId
router.delete("/:docId", requireAuth, async (req, res) => {
  try {
    const resp = await axios.delete(`${SERVICES.ingest}/docs/${req.params.docId}`, { timeout: 10_000 });
    res.json(resp.data);
  } catch (err) {
    const status = err.response?.status || 502;
    res.status(status).json({ error: err.message });
  }
});

module.exports = router;