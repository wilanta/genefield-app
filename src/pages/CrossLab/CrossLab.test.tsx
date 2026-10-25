// @vitest-environment jsdom
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import {
  Link,
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { LanguageProvider } from "@/components/language-provider";
import type { PredictionResult } from "@/lib/genefield/types";
import type { RiceLine } from "@/types/research";
import { useCrossLabDraft } from "@/stores/cross-lab-draft";
import LineExplorer from "@/pages/LineExplorer/LineExplorer";
import CrossLab from "./CrossLab";

const mocks = vi.hoisted(() => ({
  allLines: vi.fn(),
  start: vi.fn(),
  historical: vi.fn(),
  predict: vi.fn(),
}));
vi.mock("@/services/reference-service", () => ({
  referenceService: { allLines: mocks.allLines },
}));
vi.mock("@/services/inference-service", () => ({ inference: mocks }));
vi.mock("@/services", () => ({ candidateStore: { create: vi.fn() } }));

const lines: RiceLine[] = ["GID_100", "GID_1", "GID_2"].map((id) => ({
  id,
  name: id,
  hasGenotype: true,
  hasPhenotype: true,
  hasPedigree: false,
}));
const prediction: PredictionResult = {
  bundle_version: "final-v1",
  parent_ids: ["GID_100", "GID_1"],
  target: "test",
  is_historical_pair: false,
  predictions: {
    GY: {
      value: 4321,
      units: "kg/ha",
      model_version: "test",
      parents_seen_in_training: [false, false],
      parent_training_pair_counts: [0, 0],
    },
  },
};

function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <nav>
      <Link to="/">Overview</Link>
      <Link to="/lines">Line Explorer</Link>
      <Link to="/cross-lab">Cross Lab</Link>
      <Link to="/cross-lab?b=GID_2">Incoming B</Link>
      <Link to="/cross-lab?a=GID_1&b=GID_2">Incoming pair</Link>
      <button onClick={() => navigate(-1)}>Back</button>
      <button onClick={() => navigate(1)}>Forward</button>
      <output aria-label="Location">
        {location.pathname + location.search}
      </output>
    </nav>
  );
}

function renderApp(entry = "/cross-lab") {
  return render(
    <StrictMode>
      <LanguageProvider>
        <MemoryRouter initialEntries={[entry]}>
          <Navigation />
          <Routes>
            <Route path="/" element={<p>Overview page</p>} />
            <Route path="/lines" element={<LineExplorer />} />
            <Route path="/cross-lab" element={<CrossLab />} />
          </Routes>
        </MemoryRouter>
      </LanguageProvider>
    </StrictMode>,
  );
}

const input = (slot: "A" | "B") =>
  screen.getByRole("textbox", { name: `Parent ${slot}` }) as HTMLInputElement;
const button = (name: string) => screen.getByRole("button", { name });
const go = (name: string) =>
  fireEvent.click(screen.getByRole("link", { name }));
const edit = (slot: "A" | "B", value: string) =>
  fireEvent.change(input(slot), { target: { value } });
function expectParents(a: string, b: string) {
  expect(input("A").value).toBe(a);
  expect(input("B").value).toBe(b);
}

beforeEach(() => {
  localStorage.clear();
  useCrossLabDraft.getState().setParents({ parentA: "", parentB: "" });
  vi.resetAllMocks();
  mocks.allLines.mockResolvedValue(lines);
  mocks.start.mockResolvedValue(undefined);
  mocks.historical.mockResolvedValue({ is_historical_pair: false });
  mocks.predict.mockResolvedValue(prediction);
});
afterEach(cleanup);

describe("Cross Lab parent navigation", () => {
  it("keeps both dropdown selections after leaving and returning via navigation", async () => {
    renderApp();
    for (const [slot, id] of [
      ["A", "GID_100"],
      ["B", "GID_1"],
    ] as const) {
      fireEvent.focus(input(slot));
      const list = screen.getByRole("listbox", {
        name: `Parent ${slot} suggestions`,
      });
      fireEvent.click(await within(list).findByText(id));
    }
    go("Overview");
    expect(screen.queryByRole("textbox", { name: "Parent A" })).toBeNull();
    go("Cross Lab");
    expectParents("GID_100", "GID_1");
  });

  it.each(["A", "B"] as const)(
    "keeps the first parent when selecting %s first, then the other slot in Line Explorer",
    async (first) => {
      const second = first === "A" ? "B" : "A";
      renderApp("/lines");
      fireEvent.click(
        await screen.findByRole("button", {
          name: `Use as Parent ${first} for GID_100`,
        }),
      );
      expect(input(first).value).toBe("GID_100");
      go("Line Explorer");
      fireEvent.click(
        await screen.findByRole("button", {
          name: `Use as Parent ${second} for GID_1`,
        }),
      );
      expect(input(first).value).toBe("GID_100");
      expect(input(second).value).toBe("GID_1");
    },
  );

  it("merges a parent selected from the line profile with the existing opposite slot", async () => {
    renderApp("/cross-lab?b=GID_1");
    go("Line Explorer");
    const profiles = await screen.findAllByRole("button", { name: "Profile" });
    fireEvent.click(profiles[0]);
    fireEvent.click(button("Use as Parent A"));
    expectParents("GID_100", "GID_1");
  });

  it("merges a single incoming slot and replaces both for an incoming pair on the open page", () => {
    renderApp("/cross-lab?a=GID_100&b=GID_1");
    go("Incoming B");
    expectParents("GID_100", "GID_2");
    go("Incoming pair");
    expectParents("GID_1", "GID_2");
  });

  it("does not replay an old prefill over manual edits on browser Back/Forward", () => {
    renderApp("/cross-lab?a=GID_100&b=GID_1&source=review");
    edit("A", "GID_2");
    go("Overview");
    fireEvent.click(button("Back"));
    expectParents("GID_2", "GID_1");
    expect(screen.getByLabelText("Location").textContent).toBe(
      "/cross-lab?source=review",
    );
    fireEvent.click(button("Forward"));
    go("Cross Lab");
    expectParents("GID_2", "GID_1");
  });

  it("keeps Reset empty after returning to a previously prefilled route", () => {
    renderApp("/cross-lab?a=GID_100&b=GID_1");
    fireEvent.click(button("Reset"));
    expectParents("", "");
    go("Overview");
    fireEvent.click(button("Back"));
    expectParents("", "");
    go("Line Explorer");
    go("Cross Lab");
    expectParents("", "");
  });

  it("keeps swapped parents after navigation", () => {
    renderApp("/cross-lab?a=GID_100&b=GID_1");
    fireEvent.click(button("Swap Parent A and Parent B"));
    go("Overview");
    go("Cross Lab");
    expectParents("GID_1", "GID_100");
  });

  it("keeps a cleared slot empty without clearing the other parent", () => {
    renderApp("/cross-lab?a=GID_100&b=GID_1");
    edit("A", "");
    go("Overview");
    go("Cross Lab");
    expectParents("", "GID_1");
  });

  it("invalidates completed analysis when parents change, and requires analysis again on return", async () => {
    renderApp("/cross-lab?a=GID_100&b=GID_1");
    await waitFor(() =>
      expect((button("Analyze Cross") as HTMLButtonElement).disabled).toBe(
        false,
      ),
    );
    fireEvent.click(button("Analyze Cross"));
    await waitFor(() =>
      expect((button("Save Candidate") as HTMLButtonElement).disabled).toBe(
        false,
      ),
    );
    expect(mocks.predict).toHaveBeenCalledWith("GID_100", "GID_1");
    go("Incoming B");
    expectParents("GID_100", "GID_2");
    expect((button("Save Candidate") as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByText("4,321")).toBeNull();
    go("Overview");
    go("Cross Lab");
    expectParents("GID_100", "GID_2");
    expect((button("Save Candidate") as HTMLButtonElement).disabled).toBe(true);
    expect(mocks.predict).toHaveBeenCalledTimes(1);
  });

  it("ignores a late prediction for a replaced parent pair", async () => {
    let finish!: (result: PredictionResult) => void;
    mocks.predict.mockReturnValue(
      new Promise<PredictionResult>((resolve) => {
        finish = resolve;
      }),
    );
    renderApp("/cross-lab?a=GID_100&b=GID_1");
    await waitFor(() =>
      expect((button("Analyze Cross") as HTMLButtonElement).disabled).toBe(
        false,
      ),
    );
    fireEvent.click(button("Analyze Cross"));
    await waitFor(() => expect(mocks.predict).toHaveBeenCalledTimes(1));
    go("Incoming B");
    await act(async () => {
      finish(prediction);
    });
    expectParents("GID_100", "GID_2");
    expect((button("Save Candidate") as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByText("4,321")).toBeNull();
  });
});
