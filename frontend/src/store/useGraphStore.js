import { create } from "zustand";

export const useGraphStore = create((set) => ({
  nodes: [],
  edges: [],
  selectedNode: null,
  typeFilters: {
    equipment: true,
    regulation: true,
    person: true,
    process_param: true,
    location: true,
    document: false,
  },
  minMentions: 1,
  pathResult: null,

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setSelectedNode: (node) => set({ selectedNode: node }),
  toggleTypeFilter: (type) =>
    set((s) => ({
      typeFilters: { ...s.typeFilters, [type]: !s.typeFilters[type] },
    })),
  setMinMentions: (n) => set({ minMentions: n }),
  setPathResult: (result) => set({ pathResult: result }),
}));
