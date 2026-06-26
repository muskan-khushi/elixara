import client from "./client";

export const startScan = () =>
  client.post("/compliance/scan", {}, { timeout: 300000 }).then((r) => r.data);

export const getScan = (scanId) =>
  client.get(`/compliance/scan/${scanId}`).then((r) => r.data);

export const getGaps = () =>
  client.get("/compliance/gaps").then((r) => r.data);

export const getReport = (scanId) =>
  client.get(`/compliance/report/${scanId}`).then((r) => r.data);

export const getLatestReport = () =>
  client.get("/compliance/report").then((r) => r.data);
