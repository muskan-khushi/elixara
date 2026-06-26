import { create } from "zustand";

export const useQueryStore = create((set) => ({
  history: [],
  currentQuery: "",
  currentAnswer: "",
  currentSources: [],
  currentConfidence: 0,
  isStreaming: false,
  isCached: false,
  scopeDocId: null,

  setHistory: (history) => set({ history }),

  addToHistory: (entry) =>
    set((s) => ({ history: [entry, ...s.history].slice(0, 100) })),

  startStream: (query, scopeDocId = null) =>
    set({
      currentQuery: query,
      currentAnswer: "",
      currentSources: [],
      currentConfidence: 0,
      isStreaming: true,
      isCached: false,
      scopeDocId,
    }),

  appendToken: (token) =>
    set((s) => ({ currentAnswer: s.currentAnswer + token })),

  finishStream: (sources, confidence, cached = false) =>
    set({ isStreaming: false, currentSources: sources, currentConfidence: confidence, isCached: cached }),

  setScopeDocId: (id) => set({ scopeDocId: id }),

  clearCurrent: () =>
    set({
      currentQuery: "",
      currentAnswer: "",
      currentSources: [],
      currentConfidence: 0,
      isStreaming: false,
      isCached: false,
    }),
}));
