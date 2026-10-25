import { referenceService } from "@/services/reference-service";
import { inference } from "@/services/inference-service";
import type { Metadata, Pair, Trait } from "@/lib/genefield/types";
import type { RiceLine } from "@/types/research";

export interface TourExample {
  parents: Pair;
  eligibleIds: string[];
  poolSearch: string;
}
const traits: Trait[] = ["GY", "DTF", "NO", "LB"];

export function eligibleTourParents(
  lines: RiceLine[],
  metadata: Metadata,
  selected: Trait[] = traits,
) {
  return lines
    .filter(
      (line) =>
        line.hasGenotype &&
        selected.every((trait) => {
          const model = metadata.traits[trait];
          return (
            model.prediction_enabled &&
            model.ranking_enabled &&
            model.training_parent_ids.includes(line.id)
          );
        }),
    )
    .map((line) => line.id)
    .sort();
}

/** Read actual reference data and model eligibility. Never run prediction or
 * ranking while preparing instructions, and never substitute made-up IDs. */
export async function loadTourExample(): Promise<TourExample> {
  const [lines, metadata] = await Promise.all([
    referenceService.allLines(),
    inference.start(),
  ]);
  const eligibleIds = eligibleTourParents(lines, metadata);
  if (eligibleIds.length < 2)
    throw new Error(
      "Two parents eligible for all four traits are required for this exercise.",
    );
  // This pair is also used by the repository's real-data native smoke test.
  const verified: Pair = ["GID_10039", "GID_10125"];
  const parents: Pair = verified.every((id) => eligibleIds.includes(id))
    ? verified
    : [eligibleIds[0], eligibleIds[1]];
  const rankingIds = eligibleTourParents(lines, metadata, ["GY", "DTF"]);
  const prefixes = new Map<string, string[]>();
  for (const id of rankingIds) {
    for (let length = 5; length < id.length; length++) {
      const prefix = id.slice(0, length);
      const group = prefixes.get(prefix) ?? [];
      group.push(id);
      prefixes.set(prefix, group);
    }
  }
  const groups = [...prefixes]
    .filter(([, ids]) => ids.length >= 3 && ids.length <= 12)
    .sort(([a, idsA], [b, idsB]) =>
      a === "GID_100"
        ? -1
        : b === "GID_100"
          ? 1
          : idsA.length - idsB.length || a.localeCompare(b),
    );
  for (const [prefix, ids] of groups.slice(0, 8)) {
    let unrecorded = 0;
    for (let i = 0; i < ids.length && unrecorded < 2; i++) {
      for (let j = i + 1; j < ids.length && unrecorded < 2; j++) {
        const history = await inference.historical(ids[i], ids[j]);
        if (!history.is_historical_pair) unrecorded++;
      }
    }
    if (unrecorded >= 2) return { parents, eligibleIds, poolSearch: prefix };
  }
  throw new Error(
    "A small parent pool with two unrecorded pairs could not be prepared. You can retry or exit the tour.",
  );
}
