import type { Pair } from "@/lib/genefield/types";

export interface TourEventMap {
  "line-search": { query: string; valid: boolean };
  "line-search-state": { query: string; valid: boolean };
  "line-profile-opened": { id: string };
  "pedigree-node-selected": { id: string };
  "parent-edited": { slot: "A" | "B"; value: string };
  "cross-analysis-state": { ready: boolean };
  "cross-analysis-complete": { parents: Pair };
  "breed-config-edited": { field: "objectives" | "weights" | "filters" };
  "breed-ranking-state": { ready: boolean };
  "breed-ranking-complete": { count: number };
  "candidate-saved": { id: string; parents: Pair };
  "workspace-candidate-opened": { id: string };
  "candidate-comparison-reviewed": { ids: string[] };
}
export type TourEvent = keyof TourEventMap;
export type TourSignal = {
  [K in TourEvent]: { type: K; detail: TourEventMap[K] };
}[TourEvent];
export type TourRequirement =
  | "search"
  | "profile"
  | "pedigree"
  | "parent-a"
  | "parent-b"
  | "analysis"
  | "objectives"
  | "weights"
  | "filters"
  | "ranking"
  | "save"
  | "workspace"
  | "compare"
  | "limitations";

export interface TourStep {
  id: string;
  route: string;
  target: string;
  targetLine?: "parentA";
  category: string;
  title: string;
  body: string;
  hint?: string;
  event?: TourEvent;
  requirement?: TourRequirement;
  task?: string;
}

export interface TourProgress {
  hasSeenWelcome: boolean;
  hasCompletedTour: boolean;
  lastTourStep: number;
}
