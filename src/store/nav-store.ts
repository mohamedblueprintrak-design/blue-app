import { create } from "zustand";

interface NavStore {
  currentPage: string;
  currentProjectId: string | null;
  currentProjectTab: string;
  currentProjectSubTab: string;
  setCurrentPage: (page: string) => void;
  setCurrentProjectId: (id: string | null) => void;
  setCurrentProjectTab: (tab: string) => void;
  setCurrentProjectSubTab: (subTab: string) => void;
  initFromUrl: () => void;
}

function getPageFromHash(): string {
  if (typeof window === "undefined") return "dashboard";
  const hash = window.location.hash.replace("#", "");
  return hash.split("/")[0] || "dashboard";
}

function getProjectIdFromHash(): string | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash.replace("#", "");
  const parts = hash.split("/");
  return parts[1] || null;
}

export const useNavStore = create<NavStore>()((set, get) => ({
  currentPage: "dashboard",
  currentProjectId: null,
  currentProjectTab: "overview",
  currentProjectSubTab: "",

  setCurrentPage: (page) => {
    set({ currentPage: page });
    // Sync to URL hash
    if (typeof window !== "undefined") {
      const { currentProjectId } = get();
      if (currentProjectId && page === "projects") {
        window.location.hash = `${page}/${currentProjectId}`;
      } else {
        window.location.hash = page;
      }
    }
  },

  setCurrentProjectId: (id) => {
    set({ currentProjectId: id, currentProjectTab: "overview", currentProjectSubTab: "" });
    // Update hash to include project id if present
    if (typeof window !== "undefined") {
      const { currentPage } = get();
      const basePage = currentPage || "projects";
      if (id) {
        window.location.hash = `${basePage}/${id}`;
      } else {
        window.location.hash = basePage;
      }
    }
  },

  setCurrentProjectTab: (tab) => set({ currentProjectTab: tab, currentProjectSubTab: "" }),
  setCurrentProjectSubTab: (subTab) => set({ currentProjectSubTab: subTab }),

  initFromUrl: () => {
    const page = getPageFromHash();
    const projectId = getProjectIdFromHash();
    set({ currentPage: page, currentProjectId: projectId });
  },
}));
