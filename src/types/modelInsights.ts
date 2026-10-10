import type { TraitCode } from "@/types/research";

/**
 * Model Insights page data.
 *
 * This describes the model bundle currently loaded into the research workspace
 * — its metadata, per-trait model selection, and (currently placeholder)
 * validation metrics. All metric fields are nullable: `null` means "not yet
 * computed / not verified", which the UI renders as `—`. No value in this
 * shape implies a verified scientific result.
 */

export interface ModelInsightsData {
  /** Identifier / bundle name of the model. */
  modelBundle: string;
  /** Scientific review state of the model. */
  scientificReview: "reviewed" | "unreviewed";
  /** Declared usage category. */
  usage: "research-only" | "production";
  /** Training state of the model. */
  trainingStatus: "in-progress" | "completed";
  /** Whether predictive ranking is enabled. */
  rankingEnabled: boolean;

  /** Per-trait model selection (which family + hyperparameters were chosen). */
  traitModels: TraitModelSelection[];

  /** Per-trait validation metrics. All nullable — placeholders until verified. */
  validationMetrics: ValidationMetricRow[];

  /** Count of eligible historical crosses used for validation. `null` = unknown. */
  eligibleHistoricalCrosses: number | null;

  /** Human-readable scientific limitations, shown in the amber panel. */
  limitations: string[];
}

/** One row of the "Trait Model Summary" table. */
export interface TraitModelSelection {
  trait: TraitCode;
  /** Selected model family, e.g. "ExtraTrees". */
  modelFamily: string;
  /** Human-readable hyperparameter summary, e.g. "alpha = 100". `null` = not set. */
  hyperparameters: string | null;
}

/** One row of the "Validation Results" table. All metrics nullable. */
export interface ValidationMetricRow {
  trait: TraitCode;
  /** Mean absolute error from nested cross-validation. `null` = not computed. */
  nestedCvMae: number | null;
  /** MAE on parent-disjoint (held-out) crosses. `null` = not computed. */
  parentDisjointMae: number | null;
  /** Spearman correlation from nested CV. `null` = not computed. */
  spearmanNested: number | null;
  /** Spearman correlation on parent-disjoint crosses. `null` = not computed. */
  spearmanParentDisjoint: number | null;
  /** MAE against a baseline model. `null` = not computed. */
  baselineMae: number | null;
}

/** Static metadata shown in the two explanatory cards at the bottom. */
export interface MethodologyNote {
  title: string;
  description: string;
}
