import client from "./client";

export const queryDocs = (query, scopeDocId = null) =>
  client.post("/query", { query, scope_doc_id: scopeDocId }, { timeout: 90000 }).then((r) => r.data);

export const getHistory = (limit = 50) =>
  client.get("/query/history", { params: { limit } }).then((r) => r.data);

export const rebuildIndex = () =>
  client.post("/query/rebuild-index").then((r) => r.data);

/**
 * Returns an EventSource URL for streaming queries.
 * The caller creates new EventSource(streamUrl(...)) directly.
 */
export const streamUrl = (query, scopeDocId = null) => {
  const token = localStorage.getItem("elixara_token");
  const params = new URLSearchParams({ q: query });
  if (scopeDocId) params.set("scope_doc_id", scopeDocId);
  if (token) params.set("token", token); // gateway reads from query param as fallback
  return `/api/query/stream?${params.toString()}`;
};
