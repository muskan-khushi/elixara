import axios from "axios";

const client = axios.create({
  baseURL: "/api",
  timeout: 90000,
});

// Attach JWT on every request
client.interceptors.request.use((config) => {
  const token = localStorage.getItem("elixara_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401 → clear token and redirect to login
client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("elixara_token");
      localStorage.removeItem("elixara_user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default client;
