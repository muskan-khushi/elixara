// gateway/config/index.js
require("dotenv").config({ path: "../.env" });

module.exports = {
  GATEWAY_PORT: process.env.GATEWAY_PORT || 4000,
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5173",
  JWT_SECRET:   process.env.JWT_SECRET   || "elixara_hackathon_secret_change_this",
  JWT_EXPIRY:   process.env.JWT_EXPIRY   || "24h",
};