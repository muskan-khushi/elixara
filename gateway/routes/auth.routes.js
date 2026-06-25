// gateway/routes/auth.routes.js
// Simple demo auth — issues a JWT for the hackathon demo.
// In production: replace with real identity provider.
const express = require("express");
const jwt     = require("jsonwebtoken");
const { JWT_SECRET, JWT_EXPIRY } = require("../config");

const router = express.Router();

// POST /api/auth/login  { username, password }
router.post("/login", (req, res) => {
  const { username = "", password = "" } = req.body;
  // Demo credentials — change before production
  if (username === "demo" && password === "elixara2024") {
    const token = jwt.sign({ sub: username, role: "engineer" }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
    return res.json({ token, user: { username, role: "engineer" } });
  }
  res.status(401).json({ error: "Invalid credentials" });
});

// GET /api/auth/demo-token  — instant token for hackathon judges
router.get("/demo-token", (_req, res) => {
  const token = jwt.sign({ sub: "judge", role: "engineer" }, JWT_SECRET, { expiresIn: "12h" });
  res.json({ token, user: { username: "judge", role: "engineer" } });
});

module.exports = router;