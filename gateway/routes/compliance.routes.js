// gateway/routes/compliance.routes.js
const express = require("express");
const axios   = require("axios");

const { requireAuth } = require("../middleware/auth");
const SERVICES        = require("../config/services");

const router = express.Router();

async function proxy(req, res, method, path) {
  try {
    const resp = await axios({
      method,
      url:     `${SERVICES.compliance}${path}`,
      params:  req.query,
      data:    req.body,
      timeout: method === "post" ? 300_000 : 10_000,  // scans can take minutes
    });
    res.status(resp.status).json(resp.data);
  } catch (err) {
    const status = err.response?.status || 502;
    res.status(status).json({ error: err.response?.data?.detail || err.message });
  }
}

router.post("/scan",           requireAuth, (req, res) => proxy(req, res, "post", "/scan"));
router.get("/scan/:scanId",    requireAuth, (req, res) => proxy(req, res, "get",  `/scan/${req.params.scanId}`));
router.get("/gaps",            requireAuth, (req, res) => proxy(req, res, "get",  "/gaps"));
router.get("/report",          requireAuth, (req, res) => proxy(req, res, "get",  "/report"));
router.get("/report/:scanId",  requireAuth, (req, res) => proxy(req, res, "get",  `/report/${req.params.scanId}`));

module.exports = router;