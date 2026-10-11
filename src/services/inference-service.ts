import {
  GeneFieldSidecar,
  type Trait,
  type Pair,
  type Objectives,
} from "@/lib/genefield/client";
// Vite hot updates can re-evaluate modules. Keep one owner in the window realm.
const host = globalThis as typeof globalThis & {
  __genefieldClient?: GeneFieldSidecar;
};
export const inference = (host.__genefieldClient ??= new GeneFieldSidecar());
if (typeof window !== "undefined")
  window.addEventListener(
    "beforeunload",
    () => {
      void inference.stop();
    },
    { once: true },
  );
export async function rankPool(
  ids: string[],
  objectives: Objectives,
  weights?: Partial<Record<Trait, number>>,
  limit = 20,
) {
  await inference.start();
  const pairs: Pair[] = ids.flatMap((a, i) =>
    ids.slice(i + 1).map((b) => [a, b] as Pair),
  );
  return inference.rank(pairs, objectives, weights, limit);
}
