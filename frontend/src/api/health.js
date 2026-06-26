import client from "./client";

export const getHealth = () =>
  client.get("/health", { timeout: 5000 }).then((r) => r.data);
