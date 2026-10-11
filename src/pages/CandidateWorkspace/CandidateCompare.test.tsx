// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LanguageProvider } from "@/components/language-provider";
import { CandidateCompare } from "./CandidateCompare";
import CandidateWorkspace from "./CandidateWorkspace";
import type { SavedCandidate } from "@/types/research";

const mocks = vi.hoisted(() => ({ list: vi.fn() }));
vi.mock("@/services", () => ({
  candidateStore: { backend: "sqlite-tauri", list: mocks.list },
}));
const candidates: SavedCandidate[] = [0, 1, 2, 3].map((i) => ({
  id: `candidate-${i}`,
  name: `Saved ${i}`,
  parentA: `P${i}`,
  parentB: `Q${i}`,
  source: "cross-lab",
  reviewStatus: "draft",
  notes: "",
  tags: [],
  createdAt: "2026-10-11T01:00:00Z",
  updatedAt: "2026-10-11T01:00:00Z",
  ...(i === 0
    ? {
        analysis: {
          bundleVersion: "final-v1",
          predictions: { DTF: { value: 98.63, units: "days" } },
          objectives: { DTF: "minimize" },
          weights: { DTF: 1 },
          applicationScore: 0,
          isHistoricalPair: false,
        } as const,
      }
    : {}),
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  localStorage.clear();
});

describe("saved candidate comparison", () => {
  it("renders actual stored values including zero score and false history; missing fields remain absent", () => {
    render(
      <LanguageProvider>
        <CandidateCompare
          candidates={candidates.slice(0, 2)}
          open
          onOpenChange={() => {}}
        />
      </LanguageProvider>,
    );
    expect(screen.getByText("98.6300 days")).toBeDefined();
    expect(screen.getByText("0.0000")).toBeDefined();
    expect(screen.getByText("Not recorded")).toBeDefined();
    expect(screen.getByText("DTF: Minimize")).toBeDefined();
    expect(screen.getAllByText("Not saved").length).toBeGreaterThan(4);
  });
  it("caps selection at three, supports unselect and clear, and returns to unchanged workspace", async () => {
    mocks.list.mockResolvedValue(candidates);
    render(
      <LanguageProvider>
        <MemoryRouter>
          <CandidateWorkspace />
        </MemoryRouter>
      </LanguageProvider>,
    );
    await waitFor(() =>
      expect(
        screen.getByRole("checkbox", { name: "Compare Saved 0" }),
      ).toBeDefined(),
    );
    const action = () =>
      screen.getByRole("button", {
        name: /Compare candidates/,
      }) as HTMLButtonElement;
    expect(action().disabled).toBe(true);
    fireEvent.click(screen.getByRole("checkbox", { name: "Compare Saved 0" }));
    expect(action().disabled).toBe(true);
    fireEvent.click(screen.getByRole("checkbox", { name: "Compare Saved 1" }));
    expect(action().disabled).toBe(false);
    fireEvent.click(screen.getByRole("checkbox", { name: "Compare Saved 2" }));
    expect(
      (
        screen.getByRole("checkbox", {
          name: "Compare Saved 3",
        }) as HTMLInputElement
      ).disabled,
    ).toBe(true);
    fireEvent.click(action());
    expect(screen.getByRole("dialog")).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Back to Workspace" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("checkbox", { name: "Compare Saved 2" }));
    expect(
      (
        screen.getByRole("checkbox", {
          name: "Compare Saved 3",
        }) as HTMLInputElement
      ).disabled,
    ).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Clear selection" }));
    expect(action().disabled).toBe(true);
  });
  it("explains insufficient selection instead of rendering an empty comparison", () => {
    render(
      <LanguageProvider>
        <CandidateCompare candidates={[]} open onOpenChange={() => {}} />
      </LanguageProvider>,
    );
    expect(screen.getByRole("status").textContent).toContain("Select 2–3");
  });
});
