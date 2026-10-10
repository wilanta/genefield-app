import type { RiceLine } from "@/types/research";
import { mockLines } from "@/mocks/lines";
import type {
  BreedDesignerCandidate,
  BreedDesignerFilters,
  GenerationInput,
} from "@/pages/BreedDesigner/types";

/**
 * The local "historically recorded crosses" set. There is no real pedigree
 * cross-record dataset in the mocks, so this is a small illustrative set used
 * to make the "Exclude historically recorded crosses" switch meaningful.
 * Pairs are canonicalised (unordered, sorted) for matching.
 */
export const recordedCrosses: ReadonlySet<string> = new Set([
  canonicalPair("GID_1233", "GID_3494"),
  canonicalPair("GID_2214", "GID_1862"),
]);

/** Canonical unordered-pair key: the two ids sorted, joined with "×". */
export function canonicalPair(a: string, b: string): string {
  const x = a.trim().toUpperCase();
  const y = b.trim().toUpperCase();
  return x <= y ? `${x}×${y}` : `${y}×${x}`;
}

/**
 * Illustrative seed pairs, built only from ids that actually exist in the
 * mock dataset. The Figma design referenced GID_123, which does not exist;
 * we substitute real ids so every pair maps to genuine mock data.
 */
const SEED_PAIRS: [string, string][] = [
  ["GID_3494", "GID_0455"],
  ["GID_2214", "GID_1862"],
  ["GID_1233", "GID_3494"],
  ["GID_0871", "GID_0455"],
  ["GID_1230", "GID_1862"],
];

/** Resolve a mock line by id (case-insensitive). */
function lineById(id: string): RiceLine | undefined {
  const q = id.trim().toUpperCase();
  return mockLines.find((l) => l.id.toUpperCase() === q);
}

/** Lines matching the pool search + availability filters (mock order). */
export function selectParentPool(filters: BreedDesignerFilters): RiceLine[] {
  const q = filters.search.trim().toLowerCase();
  return mockLines.filter((line) => {
    if (q && !line.id.toLowerCase().includes(q)) return false;
    if (filters.genotype !== "any" && line.hasGenotype !== (filters.genotype === "yes"))
      return false;
    if (filters.phenotype !== "any" && line.hasPhenotype !== (filters.phenotype === "yes"))
      return false;
    if (filters.pedigree !== "any" && line.hasPedigree !== (filters.pedigree === "yes"))
      return false;
    return true;
  });
}

/**
 * Deterministic candidate generation. No ranking, no random values, no
 * network — a pure function of the pool, the generation rules, and the cap.
 *
 * The seed pairs are emitted first (in seed order) so the always-present
 * illustrative rows stay stable; when a rule excludes a seed pair it is simply
 * dropped. Additional pool-derived pairs are appended up to `maxCandidates`,
 * so the list grows honestly with the pool.
 */
export function generateCandidates(input: GenerationInput): BreedDesignerCandidate[] {
  const { filters, rules } = input;
  const pool = selectParentPool(filters);
  const poolIds = new Set(pool.map((l) => l.id));
  const poolGenotype = (id: string) => lineById(id)?.hasGenotype ?? false;

  const out: BreedDesignerCandidate[] = [];
  const used = new Set<string>();
  let counter = 0;

  const emit = (a: string, b: string, onlyFromPool: boolean) => {
    // Self-cross rule applies to every pair, seeded or generated.
    if (rules.excludeSelfCrosses && a === b) return;
    const key = canonicalPair(a, b);
    if (rules.excludeDuplicatePairs && used.has(key)) return;
    if (rules.excludeHistorical && recordedCrosses.has(key)) return;
    // Generated (pool-derived) pairs must both come from the current pool.
    if (onlyFromPool && !(poolIds.has(a) && poolIds.has(b))) return;

    used.add(key);
    counter += 1;
    out.push(makeCandidate(key, a, b, counter, poolGenotype));
  };

  for (const [a, b] of SEED_PAIRS) emit(a, b, false);

  // Pool-derived pairs, deterministic in pool order.
  for (let i = 0; i < pool.length && out.length < rules.maxCandidates; i++) {
    for (let j = i + 1; j < pool.length && out.length < rules.maxCandidates; j++) {
      emit(pool[i].id, pool[j].id, true);
    }
  }

  return out.slice(0, rules.maxCandidates);
}

function makeCandidate(
  key: string,
  a: string,
  b: string,
  n: number,
  poolGenotype: (id: string) => boolean,
): BreedDesignerCandidate {
  const aHas = poolGenotype(a);
  const bHas = poolGenotype(b);
  const historicalRecorded = recordedCrosses.has(key);

  // "Both" only when both parents carry genotype data; otherwise "A only"
  // (Parent A is the left-hand / primary parent for display).
  const genotype: BreedDesignerCandidate["genotype"] = aHas && bHas ? "Both" : "A only";

  return {
    candidateId: `C-${String(n).padStart(3, "0")}`,
    parentA: a,
    parentB: b,
    genotype,
    historical: historicalRecorded ? "Recorded" : "Not recorded",
    historicalRecorded,
    researchStatus: "Unreviewed",
  };
}
