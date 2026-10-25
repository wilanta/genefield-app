import type { TourRequirement, TourSignal } from "./tourTypes";
import type { TourExample } from "./tourExample";
import type { Trait } from "@/lib/genefield/types";

export interface TourPractice {
  actions: Partial<Record<TourRequirement, boolean>>;
  analysisParents: string | null;
  rankingCount: number;
  saved: Record<string, string>;
  searchQuery: string;
  searchValid: boolean;
  searchedId: string | null;
  profileId: string | null;
  workspaceId: string | null;
  parentInputs: Partial<Record<"A" | "B", string>>;
}
export const newTourPractice = (): TourPractice => ({
  actions: {},
  analysisParents: null,
  rankingCount: 0,
  saved: {},
  searchQuery: "",
  searchValid: false,
  searchedId: null,
  profileId: null,
  workspaceId: null,
  parentInputs: {},
});
const normalizeId = (id: string) => id.trim().toUpperCase();
const pairKey = (parents: string[]) =>
  [...parents]
    .map((id) => id.trim().toUpperCase())
    .sort()
    .join("|");

export function updateTourPractice(
  previous: TourPractice,
  signal: TourSignal,
  requirement?: TourRequirement,
): TourPractice {
  const next = { ...previous, actions: { ...previous.actions } };
  const complete = (task: TourRequirement, valid = true) => {
    if (requirement === task) next.actions[task] = valid;
  };
  switch (signal.type) {
    case "line-search":
      complete("search", signal.detail.valid);
      if (requirement === "search")
        next.searchedId = signal.detail.valid
          ? normalizeId(signal.detail.query)
          : null;
      next.searchQuery = normalizeId(signal.detail.query);
      next.searchValid = signal.detail.valid;
      if (!signal.detail.valid || next.searchQuery !== previous.searchQuery)
        next.profileId = null;
      break;
    case "line-search-state":
      next.searchQuery = normalizeId(signal.detail.query);
      next.searchValid = signal.detail.valid;
      if (!signal.detail.valid || next.searchQuery !== previous.searchQuery)
        next.profileId = null;
      break;
    case "line-profile-opened":
      complete("profile");
      next.profileId = normalizeId(signal.detail.id);
      break;
    case "pedigree-node-selected":
      complete("pedigree");
      break;
    case "parent-edited":
      complete(signal.detail.slot === "A" ? "parent-a" : "parent-b");
      if (
        requirement === (signal.detail.slot === "A" ? "parent-a" : "parent-b")
      ) {
        next.parentInputs = {
          ...previous.parentInputs,
          [signal.detail.slot]: normalizeId(signal.detail.value),
        };
      }
      next.analysisParents = null;
      break;
    case "cross-analysis-state":
      if (!signal.detail.ready) next.analysisParents = null;
      break;
    case "cross-analysis-complete":
      if (requirement === "analysis")
        next.analysisParents = pairKey(signal.detail.parents);
      break;
    case "breed-config-edited":
      complete(signal.detail.field);
      next.rankingCount = 0;
      break;
    case "breed-ranking-state":
      if (!signal.detail.ready) next.rankingCount = 0;
      break;
    case "breed-ranking-complete":
      if (requirement === "ranking") next.rankingCount = signal.detail.count;
      break;
    case "candidate-saved":
      if (requirement === "save")
        next.saved = {
          ...next.saved,
          [pairKey(signal.detail.parents)]: signal.detail.id,
        };
      break;
    case "workspace-candidate-opened":
      complete(
        "workspace",
        signal.detail.id === Object.values(previous.saved)[0],
      );
      next.workspaceId = signal.detail.id;
      break;
    case "candidate-comparison-reviewed":
      complete("compare", new Set(signal.detail.ids).size >= 2);
      break;
  }
  return next;
}

interface Drafts {
  parentA: string;
  parentB: string;
  weights: Record<Trait, number>;
  dtf: string;
  filters: {
    search: string;
    genotype: string;
    phenotype: string;
    pedigree: string;
  };
  maxCandidates: number;
}
export function tourRequirementMet(
  requirement: TourRequirement | undefined,
  practice: TourPractice,
  drafts: Drafts,
  example: TourExample | null,
): boolean {
  if (!requirement) return true;
  const { parentA, parentB, weights, dtf, filters } = drafts;
  const a = parentA.trim().toUpperCase();
  const b = parentB.trim().toUpperCase();
  switch (requirement) {
    case "search":
      return (
        !!example &&
        !!practice.actions.search &&
        practice.searchValid &&
        practice.searchQuery === example.parents[0] &&
        practice.searchedId === example.parents[0]
      );
    case "profile":
      return (
        !!example &&
        !!practice.actions.profile &&
        practice.profileId === example.parents[0] &&
        practice.searchValid &&
        practice.searchQuery === example.parents[0]
      );
    case "parent-a":
      return (
        !!practice.actions[requirement] &&
        !!example &&
        a === example.parents[0] &&
        practice.parentInputs.A === a &&
        example.eligibleIds.includes(a)
      );
    case "parent-b":
      return (
        !!practice.actions[requirement] &&
        !!example &&
        a === example.parents[0] &&
        b === example.parents[1] &&
        practice.parentInputs.A === a &&
        practice.parentInputs.B === b &&
        a !== b &&
        !!example?.eligibleIds.includes(a) &&
        example.eligibleIds.includes(b)
      );
    case "analysis":
      return (
        !!example &&
        a === example.parents[0] &&
        b === example.parents[1] &&
        practice.parentInputs.A === a &&
        practice.parentInputs.B === b &&
        a !== b &&
        example.eligibleIds.includes(a) &&
        example.eligibleIds.includes(b) &&
        practice.analysisParents === pairKey([a, b])
      );
    case "objectives":
      return (
        !!practice.actions[requirement] &&
        weights.GY === 1 &&
        weights.DTF === 1 &&
        weights.NO === 0 &&
        weights.LB === 0 &&
        (dtf === "minimize" || dtf === "maximize")
      );
    case "weights":
      return (
        !!practice.actions[requirement] && weights.GY === 2 && weights.DTF === 1
      );
    case "filters":
      return (
        !!practice.actions[requirement] &&
        !!example &&
        normalizeId(filters.search) === normalizeId(example.poolSearch) &&
        filters.genotype === "yes" &&
        filters.phenotype === "any" &&
        filters.pedigree === "any" &&
        drafts.maxCandidates >= 2
      );
    case "ranking":
      return practice.rankingCount >= 2;
    case "save":
      return Object.keys(practice.saved).length >= 2;
    default:
      return !!practice.actions[requirement];
  }
}
