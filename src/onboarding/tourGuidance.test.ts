import { describe, expect, it } from "vitest";
import { tourChecks, tourDock, tourTargetSelectors } from "./tourGuidance";
import { newTourPractice } from "./tourPractice";
import { tourSteps } from "./tourSteps";
import indonesian from "@/locales/id.json";

const draft = {
  weights: { GY: 1, DTF: 0, NO: 0, LB: 0 },
  dtf: "",
  filters: {
    search: "gid_11",
    genotype: "yes",
    phenotype: "any",
    pedigree: "any",
  },
  rules: { maxCandidates: 5 },
};
const example = {
  parents: ["GID_10039", "GID_10125"] as [string, string],
  poolSearch: "GID_11",
  eligibleIds: [],
};

describe("directed tutorial guidance", () => {
  it("includes parent suggestions and targets only the analysis action", () => {
    expect(
      tourTargetSelectors(tourSteps[9], newTourPractice(), example, [], false),
    ).toEqual([
      '[data-tour="cross-parent-a"]',
      '[data-tour="cross-suggestions-a"]',
    ]);
    expect(
      tourTargetSelectors(tourSteps[11], newTourPractice(), example, [], false),
    ).toEqual(['[data-tour="cross-analyze-action"]']);
  });
  it("keeps the clicked profile and candidate on a reading phase before the next route", () => {
    const profile = tourSteps[5];
    expect(
      tourTargetSelectors(profile, newTourPractice(), example, [], false),
    ).toEqual([
      '[data-tour="line-profile-action"][data-tour-line-id="GID_10039"]',
    ]);
    expect(
      tourTargetSelectors(profile, newTourPractice(), example, [], true),
    ).toEqual(['[data-tour="line-profile"]']);
    const practice = {
      ...newTourPractice(),
      saved: { "A|B": "created-a", "A|C": "created-b" },
    };
    expect(
      tourTargetSelectors(tourSteps[20], practice, example, [], false),
    ).toEqual([
      '[data-tour="candidate-row"][data-tour-candidate-id="created-a"]',
    ]);
    expect(
      tourTargetSelectors(tourSteps[20], practice, example, [], true),
    ).toEqual(['[data-tour="candidate-detail"]']);
    expect(
      tourTargetSelectors(tourSteps[21], practice, example, [], false),
    ).toHaveLength(3);
  });
  it("provides translated checklists with exact values and includes the candidate count outside the pool card", () => {
    const checks = ["objectives", "weights", "filters"].flatMap((step) =>
      tourChecks(step, draft, example),
    );
    for (const check of checks)
      expect((indonesian as Record<string, string>)[check.text]).toBeTruthy();
    const objectives = tourChecks("objectives", draft, example);
    expect(objectives.map((check) => check.done)).toEqual([
      true,
      false,
      true,
      true,
      false,
    ]);
    const filters = tourChecks("filters", draft, example);
    expect(filters.every((check) => check.done)).toBe(true);
    expect(filters[filters.length - 1]?.selector).toBe("#max-candidates");
  });
  it.each([
    [1920, 1080],
    [1440, 900],
    [1366, 768],
    [1024, 640],
    [640, 480],
  ])("reserves a separate dock at %i × %i", (width, height) => {
    const dock = tourDock(width, height);
    if (dock.side === "bottom") {
      expect(dock.size).toBeLessThanOrEqual(height * 0.44);
      expect(height - dock.size).toBeGreaterThan(height / 2);
    } else {
      expect(width - dock.size).toBeGreaterThan(1000);
      expect(tourDock(width, height, true).side).toBe("left");
    }
  });
});
