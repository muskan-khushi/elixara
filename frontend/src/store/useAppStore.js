import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useAppStore = create(
  persist(
    (set, get) => ({
      // Auth
      token: null,
      user: null,
      setAuth: (token, user) => {
        localStorage.setItem("elixara_token", token);
        localStorage.setItem("elixara_user", JSON.stringify(user));
        set({ token, user });
      },
      clearAuth: () => {
        localStorage.removeItem("elixara_token");
        localStorage.removeItem("elixara_user");
        set({ token: null, user: null });
      },
      isAuthed: () => !!get().token,

      // Sidebar
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      // Theme
      theme: "dark",
      toggleTheme: () => set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
    }),
    { name: "elixara-app" }
  )
);
