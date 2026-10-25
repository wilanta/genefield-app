import { create } from "zustand";
import type { LineExplorerFilters } from "@/types/research";

export const DEFAULT_LINE_EXPLORER_FILTERS: LineExplorerFilters = {
  search: "",
  genotype: "any",
  phenotype: "any",
  pedigree: "any",
};

// Preserve filters across route changes for the current app session.
export const useLineExplorerFilters = create<{
  filters: LineExplorerFilters;
  setFilters: (filters: LineExplorerFilters) => void;
  resetFilters: () => void;
}>((set) => ({
  filters: DEFAULT_LINE_EXPLORER_FILTERS,
  setFilters: (filters) => set({ filters }),
  resetFilters: () => set({ filters: DEFAULT_LINE_EXPLORER_FILTERS }),
}));
