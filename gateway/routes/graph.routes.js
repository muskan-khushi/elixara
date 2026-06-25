// gateway/routes/graph.routes.js
const express = require("express");
const axios   = require("axios");

const { requireAuth } = require("../middleware/auth");
const SERVICES        = require("../config/services");

const router = express.Router();

// Generic proxy helper
async function proxy(req, res, method, path, opts = {}) {
  try {
    const resp = await axios({
      method,
      url:     `${SERVICES.graph}${path}`,
      params:  req.query,
      data:    req.body,
      timeout: 10_000,
      ...opts,
    });
    res.json(resp.data);
  } catch (err) {
    const status = err.response?.status || 502;
    res.status(status).json({ error: err.response?.data?.detail || err.message });
  }
}

router.get("/nodes",              requireAuth, (req, res) => proxy(req, res, "get",  "/nodes"));
router.get("/nodes/:nodeId(*)",   requireAuth, (req, res) => proxy(req, res, "get",  `/nodes/${req.params.nodeId}`));
router.get("/edges",              requireAuth, (req, res) => proxy(req, res, "get",  "/edges"));
router.get("/subgraph/:nodeId(*)",requireAuth, (req, res) => proxy(req, res, "get",  `/subgraph/${req.params.nodeId}`));
router.get("/path",               requireAuth, (req, res) => proxy(req, res, "get",  "/path"));

module.exports = router;