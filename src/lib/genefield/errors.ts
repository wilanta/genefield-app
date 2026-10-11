import { GeneFieldError } from "./client";
const messages: Record<string, string> = {
  PARENT_UNKNOWN: "Parent not found in GeneField data.",
  UNKNOWN_PARENT: "Parent not found in GeneField data.",
  PARENT_INELIGIBLE:
    "Parent is not eligible for analysis of the selected traits.",
  INELIGIBLE_PARENT:
    "Parent is not eligible for analysis of the selected traits.",
  GENOTYPE_UNAVAILABLE:
    "Parent genotype data is unavailable for model analysis.",
  SELF_CROSS: "Select two different parents.",
  DTF_OBJECTIVE_REQUIRED:
    "Select a flowering time priority: earlier or later flowering.",
  PARENT_MALFORMED: "Use a valid GeneField parent ID.",
  TRAIT_INVALID: "Select GY, DTF, NO, or LB.",
  OBJECTIVE_INVALID: "Select a supported priority direction for this trait.",
  WEIGHTS_INVALID:
    "Each selected trait must have a positive numeric weight.",
  IPC_TIMEOUT:
    "Local analysis timed out. Check the service or use the restart control.",
};
export function analysisError(error: unknown): string {
  console.error("GeneField diagnostic", error);
  return error instanceof GeneFieldError && messages[error.code]
    ? messages[error.code]
    : "The local GeneField analysis service could not be loaded.";
}
