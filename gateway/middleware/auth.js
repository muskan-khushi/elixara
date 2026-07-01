// gateway/middleware/auth.js
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config");

// Routes that bypass auth
const PUBLIC_PATHS = ["/api/health", "/api/auth/login", "/api/auth/demo-token"];

function requireAuth(req, res, next) {
  // Skip auth for public paths
  if (PUBLIC_PATHS.some((p) => req.path.startsWith(p) || req.originalUrl.startsWith(p))) {
    return next();
  }

  const header = req.headers["authorization"] || "";
  const token  = header.startsWith("Bearer ") ? header.slice(7) : (req.query.token || null);

  if (!token) {
    return res.status(401).json({ error: "Missing authorization token" });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

module.exports = { requireAuth };