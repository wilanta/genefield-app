import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Metadata } from "@/lib/genefield/types";
import type { RiceLine } from "@/types/research";
import { eligibleTourParents, loadTourExample } from "./tourExample";

const services = vi.hoisted(() => ({
  allLines: vi.fn(),
  start: vi.fn(),
  historical: vi.fn(),
  predict: vi.fn(),
  rank: vi.fn(),
}));
vi.mock("@/services/reference-service", () => ({ referenceService: services }));
vi.mock("@/services/inference-service", () => ({ inference: services }));
const ids = ["GID_1101", "GID_1102", "GID_1103"];
const lines: RiceLine[] = ids.map((id) => ({
  id,
  name: id,
  hasGenotype: true,
  hasPhenotype: true,
  hasPedigree: true,
}));
const metadata = {
  traits: Object.fromEntries(
    ["GY", "DTF", "NO", "LB"].map((trait) => [
      trait,
      {
        training_parent_ids: ids,
        prediction_enabled: true,
        ranking_enabled: true,
      },
    ]),
  ),
} as Metadata;
beforeEach(() => {
  vi.resetAllMocks();
  services.allLines.mockResolvedValue(lines);
  services.start.mockResolvedValue(metadata);
  services.historical.mockResolvedValue({ is_historical_pair: false });
});

describe("verified local tutorial examples", () => {
  it("derives an eligible pair and a small nonempty ranking pool without running models", async () => {
    const example = await loadTourExample();
    expect(example.parents).toEqual(ids.slice(0, 2));
    expect(example.eligibleIds).toEqual(ids);
    expect(ids.every((id) => id.startsWith(example.poolSearch))).toBe(true);
    expect(services.historical).toHaveBeenCalledTimes(2);
    expect(services.predict).not.toHaveBeenCalled();
    expect(services.rank).not.toHaveBeenCalled();
  });
  it("requires genotype and eligibility across all four traits", () => {
    const restricted = structuredClone(metadata);
    restricted.traits.LB.training_parent_ids = ids.slice(1);
    expect(eligibleTourParents(lines, restricted)).toEqual(ids.slice(1));
    expect(
      eligibleTourParents(
        [{ ...lines[0], hasGenotype: false }, ...lines.slice(1)],
        metadata,
      ),
    ).toEqual(ids.slice(1));
  });
  it("reports unavailable examples instead of inventing IDs or assuming unrecorded pairs", async () => {
    services.allLines.mockResolvedValueOnce([]);
    await expect(loadTourExample()).rejects.toThrow("Two parents");
    services.historical.mockResolvedValue({ is_historical_pair: true });
    await expect(loadTourExample()).rejects.toThrow("two unrecorded pairs");
  });
});
