import { create } from "zustand";

export const useDocStore = create((set, get) => ({
  documents: [],
  totalDocs: 0,
  activeJobs: {}, // jobId → job object
  selectedDoc: null,

  setDocuments: (documents, total) => set({ documents, totalDocs: total }),
  setSelectedDoc: (doc) => set({ selectedDoc: doc }),

  addJob: (job) =>
    set((s) => ({ activeJobs: { ...s.activeJobs, [job.job_id]: job } })),

  updateJob: (jobId, updates) =>
    set((s) => ({
      activeJobs: {
        ...s.activeJobs,
        [jobId]: { ...s.activeJobs[jobId], ...updates },
      },
    })),

  removeJob: (jobId) =>
    set((s) => {
      const { [jobId]: _, ...rest } = s.activeJobs;
      return { activeJobs: rest };
    }),

  getActiveJobsList: () => Object.values(get().activeJobs),
}));
