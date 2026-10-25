import { describe, expect, it } from "vitest";
import {
  newTourPractice,
  tourRequirementMet,
  updateTourPractice,
} from "./tourPractice";
import { tourEvents } from "./tourEvents";
import type { TourExample } from "./tourExample";

const example: TourExample = {
  parents: ["GID_10039", "GID_10125"],
  eligibleIds: ["GID_10039", "GID_10125"],
  poolSearch: "GID_11",
};
const drafts = {
  parentA: example.parents[0],
  parentB: example.parents[1],
  weights: { GY: 2, DTF: 1, NO: 0, LB: 0 },
  dtf: "minimize",
  filters: {
    search: "GID_11",
    genotype: "yes",
    phenotype: "any",
    pedigree: "any",
  },
  maxCandidates: 5,
};

function enteredParents() {
  let practice = updateTourPractice(
    newTourPractice(),
    { type: "parent-edited", detail: { slot: "A", value: example.parents[0] } },
    "parent-a",
  );
  return updateTourPractice(
    practice,
    { type: "parent-edited", detail: { slot: "B", value: example.parents[1] } },
    "parent-b",
  );
}

describe("required tutorial actions", () => {
  it("requires the instructed ID for search and Profile and invalidates a cleared search", () => {
    let practice = updateTourPractice(
      newTourPractice(),
      {
        type: "line-search",
        detail: { query: example.parents[1], valid: true },
      },
      "search",
    );
    expect(tourRequirementMet("search", practice, drafts, example)).toBe(false);
    practice = updateTourPractice(
      practice,
      {
        type: "line-search",
        detail: { query: example.parents[0], valid: true },
      },
      "search",
    );
    expect(tourRequirementMet("search", practice, drafts, example)).toBe(true);
    practice = updateTourPractice(
      practice,
      { type: "line-profile-opened", detail: { id: example.parents[1] } },
      "profile",
    );
    expect(tourRequirementMet("profile", practice, drafts, example)).toBe(
      false,
    );
    practice = updateTourPractice(
      practice,
      { type: "line-profile-opened", detail: { id: example.parents[0] } },
      "profile",
    );
    expect(tourRequirementMet("profile", practice, drafts, example)).toBe(true);
    practice = updateTourPractice(
      practice,
      { type: "line-search-state", detail: { query: "", valid: false } },
      "profile",
    );
    expect(tourRequirementMet("search", practice, drafts, example)).toBe(false);
    expect(tourRequirementMet("profile", practice, drafts, example)).toBe(
      false,
    );
  });

  it("rejects a different eligible parent and an edit event for a value no longer in the field", () => {
    const eligibleExample = {
      ...example,
      eligibleIds: [...example.eligibleIds, "GID_10159"],
    };
    let practice = updateTourPractice(
      newTourPractice(),
      { type: "parent-edited", detail: { slot: "A", value: "GID_10159" } },
      "parent-a",
    );
    expect(
      tourRequirementMet(
        "parent-a",
        practice,
        { ...drafts, parentA: "GID_10159" },
        eligibleExample,
      ),
    ).toBe(false);
    expect(
      tourRequirementMet("parent-a", practice, drafts, eligibleExample),
    ).toBe(false);
    practice = updateTourPractice(
      practice,
      {
        type: "parent-edited",
        detail: { slot: "A", value: example.parents[0] },
      },
      "parent-a",
    );
    expect(
      tourRequirementMet("parent-a", practice, drafts, eligibleExample),
    ).toBe(true);
  });
  it("requires an action during the relevant step, even when saved input is already valid", () => {
    let practice = newTourPractice();
    expect(tourRequirementMet("parent-a", practice, drafts, example)).toBe(
      false,
    );
    practice = updateTourPractice(
      practice,
      { type: "parent-edited", detail: { slot: "A", value: "GID_10039" } },
      "search",
    );
    expect(tourRequirementMet("parent-a", practice, drafts, example)).toBe(
      false,
    );
    practice = updateTourPractice(
      practice,
      { type: "parent-edited", detail: { slot: "A", value: "GID_10039" } },
      "parent-a",
    );
    expect(tourRequirementMet("parent-a", practice, drafts, example)).toBe(
      true,
    );
    expect(
      tourRequirementMet(
        "parent-a",
        practice,
        { ...drafts, parentA: "GID_UNKNOWN" },
        example,
      ),
    ).toBe(false);
    expect(tourRequirementMet("parent-a", practice, drafts, null)).toBe(false);
  });

  it("rejects identical and ineligible tutorial parents and accepts normalized IDs", () => {
    const practice = updateTourPractice(
      enteredParents(),
      { type: "parent-edited", detail: { slot: "B", value: "GID_10125" } },
      "parent-b",
    );
    expect(
      tourRequirementMet(
        "parent-b",
        practice,
        { ...drafts, parentB: drafts.parentA },
        example,
      ),
    ).toBe(false);
    expect(
      tourRequirementMet(
        "parent-b",
        practice,
        { ...drafts, parentB: "GID_UNKNOWN" },
        example,
      ),
    ).toBe(false);
    expect(
      tourRequirementMet(
        "parent-b",
        practice,
        { ...drafts, parentB: " gid_10125 " },
        example,
      ),
    ).toBe(true);
  });

  it("only accepts successful analysis for the current pair and invalidates it after an edit or reset", () => {
    let practice = updateTourPractice(
      enteredParents(),
      { type: "cross-analysis-complete", detail: { parents: example.parents } },
      "analysis",
    );
    expect(tourRequirementMet("analysis", practice, drafts, example)).toBe(
      true,
    );
    const reverseOutput = updateTourPractice(
      enteredParents(),
      {
        type: "cross-analysis-complete",
        detail: { parents: [example.parents[1], example.parents[0]] },
      },
      "analysis",
    );
    expect(tourRequirementMet("analysis", reverseOutput, drafts, example)).toBe(
      true,
    );
    expect(
      tourRequirementMet(
        "analysis",
        practice,
        { ...drafts, parentA: drafts.parentB, parentB: drafts.parentA },
        example,
      ),
    ).toBe(false);
    expect(
      tourRequirementMet(
        "analysis",
        practice,
        { ...drafts, parentB: "GID_UNKNOWN" },
        example,
      ),
    ).toBe(false);
    practice = updateTourPractice(
      practice,
      { type: "parent-edited", detail: { slot: "B", value: "GID_10125" } },
      "analysis",
    );
    expect(tourRequirementMet("analysis", practice, drafts, example)).toBe(
      false,
    );
    practice = updateTourPractice(
      practice,
      { type: "cross-analysis-complete", detail: { parents: example.parents } },
      "analysis",
    );
    practice = updateTourPractice(
      practice,
      { type: "cross-analysis-state", detail: { ready: false } },
      "analysis",
    );
    expect(tourRequirementMet("analysis", practice, drafts, example)).toBe(
      false,
    );
  });

  it("requires explicit DTF direction and valid practice weights and pool settings", () => {
    const practice = {
      ...newTourPractice(),
      actions: { objectives: true, weights: true, filters: true },
    };
    expect(
      tourRequirementMet(
        "objectives",
        practice,
        { ...drafts, weights: { ...drafts.weights, GY: 1 } },
        example,
      ),
    ).toBe(true);
    expect(
      tourRequirementMet(
        "objectives",
        practice,
        { ...drafts, dtf: "" },
        example,
      ),
    ).toBe(false);
    expect(
      tourRequirementMet(
        "weights",
        practice,
        { ...drafts, weights: { ...drafts.weights, GY: Number.NaN } },
        example,
      ),
    ).toBe(false);
    expect(tourRequirementMet("weights", practice, drafts, example)).toBe(true);
    expect(
      tourRequirementMet(
        "filters",
        practice,
        { ...drafts, maxCandidates: 1 },
        example,
      ),
    ).toBe(false);
    expect(
      tourRequirementMet(
        "filters",
        practice,
        { ...drafts, filters: { ...drafts.filters, search: "GID_UNKNOWN" } },
        example,
      ),
    ).toBe(false);
    expect(tourRequirementMet("filters", practice, drafts, example)).toBe(true);
  });

  it("accepts either case for the pool search while rejecting incorrect searches and availability settings", () => {
    const practice = { ...newTourPractice(), actions: { filters: true } };
    for (const search of ["GID_11", "gid_11", " GiD_11 "]) {
      expect(
        tourRequirementMet(
          "filters",
          practice,
          { ...drafts, filters: { ...drafts.filters, search } },
          example,
        ),
      ).toBe(true);
    }
    for (const filters of [
      { ...drafts.filters, search: "gid_12" },
      { ...drafts.filters, genotype: "no" },
      { ...drafts.filters, phenotype: "yes" },
      { ...drafts.filters, pedigree: "yes" },
    ])
      expect(
        tourRequirementMet(
          "filters",
          practice,
          { ...drafts, filters },
          example,
        ),
      ).toBe(false);
  });

  it("requires clicking the single instructed saved candidate instead of an unrelated row", () => {
    const practice = {
      ...newTourPractice(),
      saved: { "A|B": "tour-a", "A|C": "tour-b" },
    };
    const wrong = updateTourPractice(
      practice,
      {
        type: "workspace-candidate-opened",
        detail: { id: "existing-candidate" },
      },
      "workspace",
    );
    expect(tourRequirementMet("workspace", wrong, drafts, example)).toBe(false);
    const correct = updateTourPractice(
      wrong,
      { type: "workspace-candidate-opened", detail: { id: "tour-a" } },
      "workspace",
    );
    expect(correct.workspaceId).toBe("tour-a");
    expect(tourRequirementMet("workspace", correct, drafts, example)).toBe(
      true,
    );
  });

  it("keeps empty and single-result rankings locked and requires two different saved pairs", () => {
    let practice = updateTourPractice(
      newTourPractice(),
      { type: "breed-ranking-complete", detail: { count: 1 } },
      "ranking",
    );
    expect(tourRequirementMet("ranking", practice, drafts, example)).toBe(
      false,
    );
    practice = updateTourPractice(
      practice,
      { type: "breed-ranking-complete", detail: { count: 2 } },
      "ranking",
    );
    expect(tourRequirementMet("ranking", practice, drafts, example)).toBe(true);
    practice = updateTourPractice(
      practice,
      {
        type: "candidate-saved",
        detail: { id: "saved-a", parents: example.parents },
      },
      "save",
    );
    practice = updateTourPractice(
      practice,
      {
        type: "candidate-saved",
        detail: {
          id: "saved-b",
          parents: [example.parents[1], example.parents[0]],
        },
      },
      "save",
    );
    expect(tourRequirementMet("save", practice, drafts, example)).toBe(false);
    practice = updateTourPractice(
      practice,
      {
        type: "candidate-saved",
        detail: { id: "saved-c", parents: [example.parents[0], "GID_11055"] },
      },
      "save",
    );
    expect(tourRequirementMet("save", practice, drafts, example)).toBe(true);
    expect(tourRequirementMet("save", newTourPractice(), drafts, example)).toBe(
      false,
    );
  });

  it("requires two actual comparison IDs and explicit acknowledgement", () => {
    let practice = updateTourPractice(
      newTourPractice(),
      {
        type: "candidate-comparison-reviewed",
        detail: { ids: ["same", "same"] },
      },
      "compare",
    );
    expect(tourRequirementMet("compare", practice, drafts, example)).toBe(
      false,
    );
    practice = updateTourPractice(
      practice,
      {
        type: "candidate-comparison-reviewed",
        detail: { ids: ["one", "two"] },
      },
      "compare",
    );
    expect(tourRequirementMet("compare", practice, drafts, example)).toBe(true);
    expect(tourRequirementMet("limitations", practice, drafts, example)).toBe(
      false,
    );
  });

  it("uses session names only during an explicit tutorial Save step", () => {
    tourEvents.setSession(null);
    expect(tourEvents.candidateName("Pair", "Tour")).toBe("Pair");
    tourEvents.setSession({ id: "session", step: "ranking" });
    expect(tourEvents.candidateName("Pair", "Tour")).toBe(
      "Pair (Tour session)",
    );
    tourEvents.setSession({ id: "another", step: "ranking" });
    expect(tourEvents.candidateName("Pair", "Tour")).toBe(
      "Pair (Tour another)",
    );
    tourEvents.setSession(null);
  });
});
