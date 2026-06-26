import client from "./client";

export const getNodes = (params = {}) =>
  client.get("/graph/nodes", { params }).then((r) => r.data);

export const getNode = (nodeId) =>
  client.get(`/graph/nodes/${encodeURIComponent(nodeId)}`).then((r) => r.data);

export const getEdges = (params = {}) =>
  client.get("/graph/edges", { params }).then((r) => r.data);

export const getSubgraph = (nodeId, hops = 1) =>
  client
    .get(`/graph/subgraph/${encodeURIComponent(nodeId)}`, { params: { hops } })
    .then((r) => r.data);

export const findPath = (fromId, toId, maxHops = 5) =>
  client
    .get("/graph/path", { params: { from_id: fromId, to_id: toId, max_hops: maxHops } })
    .then((r) => r.data);
