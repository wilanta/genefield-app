import { create } from "zustand";
import type { Trait } from "@/lib/genefield/types";
import type {
  BreedDesignerFilters,
  BreedDesignerGenerationRules,
} from "@/pages/BreedDesigner/types";

interface BreedDesignerDraft {
  filters: BreedDesignerFilters;
  rules: BreedDesignerGenerationRules;
  weights: Record<Trait, number>;
  dtf: "" | "minimize" | "maximize";
  setPool: (patch: Partial<BreedDesignerFilters>) => void;
  setRule: <K extends keyof BreedDesignerGenerationRules>(
    key: K,
    value: BreedDesignerGenerationRules[K],
  ) => void;
  setWeight: (trait: Trait, value: number) => void;
  setDtf: (priority: BreedDesignerDraft["dtf"]) => void;
}

// Keep configuration across route changes for the current app session.
export const useBreedDesignerDraft = create<BreedDesignerDraft>((set) => ({
  filters: { search: "", genotype: "yes", phenotype: "any", pedigree: "any" },
  rules: {
    excludeSelfCrosses: true,
    excludeDuplicatePairs: true,
    excludeHistorical: true,
    maxCandidates: 50,
  },
  weights: { GY: 1, DTF: 0, NO: 0, LB: 0 },
  dtf: "",
  setPool: (patch) =>
    set((state) => ({ filters: { ...state.filters, ...patch } })),
  setRule: (key, value) =>
    set((state) => ({ rules: { ...state.rules, [key]: value } })),
  setWeight: (trait, value) =>
    set((state) => ({ weights: { ...state.weights, [trait]: value } })),
  setDtf: (dtf) => set({ dtf }),
}));
