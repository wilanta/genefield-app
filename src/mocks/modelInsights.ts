import type {
  ModelInsightsData,
  MethodologyNote,
} from "@/types/modelInsights";

/**
 * Mock Model Insights data. All validation metric values are `null` — they are
 * placeholders and MUST be rendered as `—`. Do not treat these as verified
 * scientific results.
 */
export const mockModelInsights: ModelInsightsData = {
  modelBundle: "research-v1",
  scientificReview: "unreviewed",
  usage: "research-only",
  trainingStatus: "completed",
  rankingEnabled: false,

  traitModels: [
    { trait: "GY", modelFamily: "ExtraTrees", hyperparameters: null },
    { trait: "DTF", modelFamily: "RandomForest", hyperparameters: null },
    { trait: "NO", modelFamily: "Ridge", hyperparameters: "alpha = 100" },
    { trait: "LB", modelFamily: "Ridge", hyperparameters: "alpha = 100" },
  ],

  // Every metric is null: placeholders only, no verified numbers.
  validationMetrics: [
    {
      trait: "GY",
      nestedCvMae: null,
      parentDisjointMae: null,
      spearmanNested: null,
      spearmanParentDisjoint: null,
      baselineMae: null,
    },
    {
      trait: "DTF",
      nestedCvMae: null,
      parentDisjointMae: null,
      spearmanNested: null,
      spearmanParentDisjoint: null,
      baselineMae: null,
    },
    {
      trait: "NO",
      nestedCvMae: null,
      parentDisjointMae: null,
      spearmanNested: null,
      spearmanParentDisjoint: null,
      baselineMae: null,
    },
    {
      trait: "LB",
      nestedCvMae: null,
      parentDisjointMae: null,
      spearmanNested: null,
      spearmanParentDisjoint: null,
      baselineMae: null,
    },
  ],

  eligibleHistoricalCrosses: null,

  limitations: [
    "Estimates represent historical descendant phenotype summaries.",
    "Generalization to unseen parents remains uncertain.",
    "Parent-disjoint performance is limited.",
    "No calibrated uncertainty intervals are provided.",
    "Results are not validated F1 predictions.",
    "Predictive ranking remains disabled.",
  ],
};

/** Explanatory cards for the two validation methodologies. */
export const methodologyNotes: MethodologyNote[] = [
  {
    title: "Nested cross-validation",
    description:
      "Outer folds estimate performance; inner folds select hyperparameters, keeping tuning separate from evaluation.",
  },
  {
    title: "Parent-disjoint evaluation",
    description:
      "Held-out crosses share no parent with the training crosses, testing generalization to unseen parents.",
  },
];
