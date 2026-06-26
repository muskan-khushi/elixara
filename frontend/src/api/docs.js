import client from "./client";

export const uploadDoc = (formData) =>
  client.post("/docs/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 30000,
  }).then((r) => r.data);

export const listDocs = (params = {}) =>
  client.get("/docs", { params }).then((r) => r.data);

export const getDoc = (docId) =>
  client.get(`/docs/${docId}`).then((r) => r.data);

export const deleteDoc = (docId) =>
  client.delete(`/docs/${docId}`).then((r) => r.data);

export const getJob = (jobId) =>
  client.get(`/docs/jobs/${jobId}`).then((r) => r.data);

export const listJobs = () =>
  client.get("/docs/jobs").then((r) => r.data);
