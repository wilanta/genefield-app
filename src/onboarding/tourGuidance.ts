import type { TourExample } from "./tourExample";
import type { TourPractice } from "./tourPractice";
import type { TourStep } from "./tourTypes";

export interface TourCheck {
  selector: string;
  text: string;
  done: boolean;
}
interface Configuration {
  weights: Record<"GY" | "DTF" | "NO" | "LB", number>;
  dtf: string;
  filters: {
    search: string;
    genotype: string;
    phenotype: string;
    pedigree: string;
  };
  rules: { maxCandidates: number };
}

export function tourChecks(
  step: string | undefined,
  draft: Configuration,
  example: TourExample | null,
): TourCheck[] {
  const weight = (
    trait: keyof Configuration["weights"],
    value: number,
    text: string,
  ): TourCheck => ({
    selector: `#weight-${trait}`,
    text,
    done: draft.weights[trait] === value,
  });
  if (step === "objectives")
    return [
      weight(
        "GY",
        1,
        "Set Grain Yield (GY) weight to 1 to include grain yield.",
      ),
      weight(
        "DTF",
        1,
        "Set Days to Flowering (DTF) weight to 1 to include flowering time.",
      ),
      weight(
        "NO",
        0,
        "Set Stem Rot (NO) weight to 0 to leave this disease trait out of this exercise.",
      ),
      weight(
        "LB",
        0,
        "Set Leaf Blast (LB) weight to 0 to leave this disease trait out of this exercise.",
      ),
      {
        selector: "#dtf-priority",
        text: "Open DTF priority and choose Earlier flowering or Later flowering.",
        done: draft.dtf === "minimize" || draft.dtf === "maximize",
      },
    ];
  if (step === "weights")
    return [
      weight("GY", 2, "Change Grain Yield (GY) weight to 2."),
      weight("DTF", 1, "Keep Days to Flowering (DTF) weight at 1."),
    ];
  if (step === "filters")
    return [
      {
        selector: '[data-tour="pool-search"]',
        text: "Type {poolSearch} in Search parent lines. Uppercase and lowercase both work.",
        done:
          !!example &&
          draft.filters.search.trim().toUpperCase() ===
            example.poolSearch.toUpperCase(),
      },
      {
        selector: '[data-tour="pool-genotype"]',
        text: "Set Genotype to Available: use lines with genetic marker data.",
        done: draft.filters.genotype === "yes",
      },
      {
        selector: '[data-tour="pool-phenotype"]',
        text: "Set Phenotype to Any: do not filter by recorded field observations.",
        done: draft.filters.phenotype === "any",
      },
      {
        selector: '[data-tour="pool-pedigree"]',
        text: "Set Pedigree to Any: do not filter by recorded family relationships.",
        done: draft.filters.pedigree === "any",
      },
      {
        selector: "#max-candidates",
        text: "Set Maximum candidate count to at least 2 (for example, 5).",
        done: draft.rules.maxCandidates >= 2,
      },
    ];
  return [];
}

export function tourTargetSelectors(
  step: TourStep,
  practice: TourPractice,
  example: TourExample | null,
  checks: TourCheck[],
  complete: boolean,
): string[] {
  if (step.id === "parent-a" || step.id === "parent-b") {
    const slot = step.id === "parent-a" ? "a" : "b";
    return [
      `[data-tour="cross-parent-${slot}"]`,
      `[data-tour="cross-suggestions-${slot}"]`,
    ];
  }
  if (step.id === "analyze") return ['[data-tour="cross-analyze-action"]'];
  if (checks.length) return checks.map((check) => check.selector);
  if (step.id === "observations")
    return complete
      ? ['[data-tour="line-profile"]']
      : [
          `[data-tour="line-profile-action"][data-tour-line-id="${example?.parents[0] ?? ""}"]`,
        ];
  if (step.id === "save")
    return complete
      ? ['[data-tour="candidate-detail"]']
      : [
          `[data-tour="candidate-row"][data-tour-candidate-id="${Object.values(practice.saved)[0] ?? ""}"]`,
        ];
  if (step.id === "compare")
    return [
      ...Object.values(practice.saved).map(
        (id) =>
          `[data-tour="candidate-row"][data-tour-candidate-id="${id}"] [data-tour="compare-checkbox"]`,
      ),
      '[data-tour="candidate-compare"]',
    ];
  // Include availability controls so an existing filter cannot block the search task.
  if (step.id === "search")
    return ['[data-tour="line-search"]', '[data-tour="line-filter"]'];
  return [`[data-tour="${step.target}"]`];
}

/** Reserve real screen space for the tip instead of drawing it over evidence. */
export function tourDock(width: number, height: number, preferLeft = false) {
  return width >= 1450 && height >= 600
    ? { side: preferLeft ? ("left" as const) : ("right" as const), size: 422 }
    : {
        side: "bottom" as const,
        size: Math.min(316, Math.floor(height * 0.44)),
      };
}
