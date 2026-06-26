import client from "./client";

export const login = (username, password) =>
  client.post("/auth/login", { username, password }).then((r) => r.data);

export const getDemoToken = () =>
  client.get("/auth/demo-token").then((r) => r.data);
