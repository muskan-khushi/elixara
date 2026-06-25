// gateway/config/services.js
require("dotenv").config({ path: "../.env" });

module.exports = {
  ingest:     process.env.INGEST_SERVICE_URL     || "http://localhost:5001",
  rag:        process.env.RAG_SERVICE_URL        || "http://localhost:5002",
  graph:      process.env.GRAPH_SERVICE_URL      || "http://localhost:5003",
  compliance: process.env.COMPLIANCE_SERVICE_URL || "http://localhost:5004",
};