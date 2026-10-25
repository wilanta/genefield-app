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
} from "@testing-library/react";
import {
  Link,
  MemoryRouter,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "@/components/language-provider";
import { InterfaceDensityProvider } from "@/components/interface-density-provider";
import Settings from "@/pages/Settings/Settings";
import { GuidedTourProvider, useGuidedTour } from "./GuidedTourProvider";
import {
  INITIAL_PROGRESS,
  readTourProgress,
  TOUR_STORAGE_KEY,
  writeTourProgress,
} from "./tourStorage";
import { tourSteps } from "./tourSteps";
import { tourEvents } from "./tourEvents";
import { placeTourPopover } from "./tourLayout";
import indonesian from "@/locales/id.json";
import { useCrossLabDraft } from "@/stores/cross-lab-draft";
import { useBreedDesignerDraft } from "@/stores/breed-designer-draft";

vi.mock("./tourExample", () => ({
  loadTourExample: async () => ({
    parents: ["GID_10039", "GID_10125"],
    eligibleIds: ["GID_10039", "GID_10125"],
    poolSearch: "GID_100",
  }),
}));

vi.mock("@/services/inference-service", () => ({
  inference: { start: vi.fn().mockRejectedValue(new Error("Offline test")) },
}));

function Location() {
  return <output aria-label="route">{useLocation().pathname}</output>;
}
function ManualEntry() {
  const { startTour } = useGuidedTour();
  return <button onClick={startTour}>Manual replay</button>;
}
function renderTour(entry = "/", page = <div>Actual page area</div>) {
  return render(
    <StrictMode>
      <ThemeProvider>
        <InterfaceDensityProvider>
          <LanguageProvider>
            <MemoryRouter initialEntries={[entry]}>
              <GuidedTourProvider>
                <Location />
                <ManualEntry />
                <Link to="/settings">Settings</Link>
                <Link to="/about">About</Link>
                <Routes>
                  <Route path="/settings" element={<Settings />} />
                  <Route path="*" element={page} />
                </Routes>
              </GuidedTourProvider>
            </MemoryRouter>
          </LanguageProvider>
        </InterfaceDensityProvider>
      </ThemeProvider>
    </StrictMode>,
  );
}

beforeEach(() => {
  useCrossLabDraft.setState({ parentA: "", parentB: "" });
  useBreedDesignerDraft.setState({
    weights: { GY: 1, DTF: 0, NO: 0, LB: 0 },
    dtf: "",
    filters: { search: "", genotype: "yes", phenotype: "any", pedigree: "any" },
  });
  localStorage.clear();
  localStorage.setItem("genefield-language", "english");
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
    setTimeout(() => callback(0), 0),
  );
  vi.stubGlobal("cancelAnimationFrame", clearTimeout);
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
  }));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function begin() {
  fireEvent.click(screen.getByRole("button", { name: "Start Guided Tour" }));
  await screen.findByRole("heading", { name: tourSteps[0].title });
}
async function next() {
  fireEvent.click(
    screen.getByRole("button", { name: /^(Next|Continue Tour|Finish Tour)$/ }),
  );
}
async function performTask(index: number) {
  act(() => {
    switch (tourSteps[index].requirement) {
      case "search":
        tourEvents.emit("line-search", { query: "GID_10039", valid: true });
        break;
      case "profile":
        tourEvents.emit("line-profile-opened", { id: "GID_10039" });
        break;
      case "pedigree":
        tourEvents.emit("pedigree-node-selected", { id: "GID_10039" });
        break;
      case "parent-a":
        useCrossLabDraft.setState({ parentA: "GID_10039" });
        tourEvents.emit("parent-edited", { slot: "A", value: "GID_10039" });
        break;
      case "parent-b":
        useCrossLabDraft.setState({ parentB: "GID_10125" });
        tourEvents.emit("parent-edited", { slot: "B", value: "GID_10125" });
        break;
      case "analysis":
        tourEvents.emit("cross-analysis-complete", {
          parents: ["GID_10039", "GID_10125"],
        });
        break;
      case "objectives":
        useBreedDesignerDraft.setState({
          weights: { GY: 1, DTF: 1, NO: 0, LB: 0 },
          dtf: "minimize",
        });
        tourEvents.emit("breed-config-edited", { field: "objectives" });
        break;
      case "weights":
        useBreedDesignerDraft.setState({
          weights: { GY: 2, DTF: 1, NO: 0, LB: 0 },
        });
        tourEvents.emit("breed-config-edited", { field: "weights" });
        break;
      case "filters":
        useBreedDesignerDraft.getState().setPool({ search: "GID_100" });
        tourEvents.emit("breed-config-edited", { field: "filters" });
        break;
      case "ranking":
        tourEvents.emit("breed-ranking-complete", { count: 2 });
        break;
      case "save":
        tourEvents.emit("candidate-saved", {
          id: "saved-a",
          parents: ["GID_10039", "GID_10125"],
        });
        tourEvents.emit("candidate-saved", {
          id: "saved-b",
          parents: ["GID_10039", "GID_10040"],
        });
        break;
      case "workspace":
        tourEvents.emit("workspace-candidate-opened", { id: "saved-a" });
        break;
      case "compare":
        tourEvents.emit("candidate-comparison-reviewed", {
          ids: ["saved-a", "saved-b"],
        });
        break;
    }
  });
  if (tourSteps[index].requirement === "limitations")
    fireEvent.click(screen.getByRole("checkbox"));
}
async function walkTo(start: number, end: number) {
  for (let i = start; i < end; i++) {
    await screen.findByRole("heading", { name: tourSteps[i].title });
    await performTask(i);
    if (!tourSteps[i].event) await next();
  }
  await screen.findByRole("heading", { name: tourSteps[end].title });
}
async function completeFrom(start: number) {
  for (let i = start; i < tourSteps.length; i++) {
    await screen.findByRole("heading", { name: tourSteps[i].title });
    expect(screen.getByLabelText("route").textContent).toBe(tourSteps[i].route);
    await performTask(i);
    if (!tourSteps[i].event) await next();
  }
  await screen.findByRole("heading", {
    name: "You're ready to explore GeneField",
  });
}

describe("guided tour lifecycle", () => {
  it("allows the highlighted task, blocks outside mouse and keyboard actions, and releases the screen when hidden or exited", async () => {
    const outside = vi.fn();
    const inside = vi.fn();
    renderTour(
      "/",
      <div>
        <button onClick={outside} onKeyDown={outside}>
          Outside action
        </button>
        <input
          data-tour="line-search"
          aria-label="Practice search"
          onClick={inside}
        />
      </div>,
    );
    await begin();
    await walkTo(0, 4);
    const input = screen.getByRole("textbox", { name: "Practice search" });
    fireEvent.click(input);
    expect(inside).toHaveBeenCalledTimes(1);
    const outsideButton = screen.getByRole("button", {
      name: "Outside action",
    });
    fireEvent.click(outsideButton);
    fireEvent.keyDown(outsideButton, { key: "Enter" });
    expect(outside).not.toHaveBeenCalled();
    outsideButton.focus();
    expect(document.activeElement).toBe(
      screen.getByRole("heading", { name: tourSteps[4].title }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Hide tip to explore this screen" }),
    );
    expect(document.documentElement.dataset.guidedTourDock).toBeUndefined();
    fireEvent.click(outsideButton);
    expect(outside).toHaveBeenCalledTimes(1);
    fireEvent.click(
      screen.getByRole("button", { name: /Continue Guided Tour/ }),
    );
    fireEvent.click(outsideButton);
    expect(outside).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(document.documentElement.dataset.guidedTourDock).toBeUndefined();
    fireEvent.click(outsideButton);
    expect(outside).toHaveBeenCalledTimes(2);
  });

  it("shows a profile reading phase on the same route after the requested Profile click", async () => {
    renderTour();
    await begin();
    await walkTo(0, 5);
    await performTask(5);
    expect(screen.getByLabelText("route").textContent).toBe("/lines");
    expect(
      document.querySelector(".tour-popover")?.getAttribute("data-tour-phase"),
    ).toBe("explanation");
    expect(
      screen.getByText("Read the line profile before continuing"),
    ).toBeDefined();
    await next();
    expect(screen.getByLabelText("route").textContent).toBe("/pedigree");
  });
  it("locks required steps until valid actions, rejects stale analysis, and allows Back or exit", async () => {
    renderTour();
    await begin();
    await walkTo(0, 4);
    const forward = () =>
      screen.getByRole("button", {
        name: /^(Next|Continue Tour)$/,
      }) as HTMLButtonElement;
    expect(forward().disabled).toBe(true);
    act(() =>
      tourEvents.emit("line-search", { query: "GID_10125", valid: true }),
    );
    expect(forward().disabled).toBe(true);
    await next();
    expect(
      screen.getByRole("heading", { name: tourSteps[4].title }),
    ).toBeDefined();
    act(() =>
      tourEvents.emit("line-search", { query: "GID_UNKNOWN", valid: false }),
    );
    expect(forward().disabled).toBe(true);
    await performTask(4);
    await next();
    await walkTo(5, 9);
    act(() => useCrossLabDraft.setState({ parentA: "GID_10039" }));
    expect(forward().disabled).toBe(true);
    act(() => {
      useCrossLabDraft.setState({ parentA: "GID_10125" });
      tourEvents.emit("parent-edited", { slot: "A", value: "GID_10125" });
    });
    expect(forward().disabled).toBe(true);
    act(() => useCrossLabDraft.setState({ parentA: "GID_10039" }));
    expect(forward().disabled).toBe(true);
    act(() =>
      tourEvents.emit("parent-edited", { slot: "A", value: "GID_10039" }),
    );
    expect(forward().disabled).toBe(false);
    await next();
    act(() => {
      useCrossLabDraft.setState({ parentB: "GID_10039" });
      tourEvents.emit("parent-edited", { slot: "B", value: "GID_10039" });
    });
    expect(forward().disabled).toBe(true);
    await performTask(10);
    await next();
    expect(forward().disabled).toBe(true);
    act(() =>
      tourEvents.emit("cross-analysis-complete", {
        parents: ["GID_UNKNOWN", "GID_10125"],
      }),
    );
    expect(forward().disabled).toBe(true);
    await performTask(11);
    await screen.findByRole("heading", { name: tourSteps[12].title });
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    await screen.findByRole("heading", { name: tourSteps[11].title });
    expect(forward().disabled).toBe(false);
    act(() => tourEvents.emit("cross-analysis-state", { ready: false }));
    expect(forward().disabled).toBe(true);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("offers a dismissible welcome once and keeps the application accessible", async () => {
    const first = renderTour();
    expect(
      screen.getByRole("heading", { name: "Welcome to GeneField" }),
    ).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Maybe Later" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(readTourProgress().hasSeenWelcome).toBe(true);
    first.unmount();
    renderTour();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("completes twice through Settings, persists after restart, and preserves unrelated data", async () => {
    localStorage.setItem("genefield-theme", "light");
    localStorage.setItem("candidate-sentinel", '[{"id":"existing-candidate"}]');
    const first = renderTour();
    await begin();
    await completeFrom(0);
    expect(readTourProgress().hasCompletedTour).toBe(true);
    expect(
      screen.getByText(
        "You can replay this Guided Tour anytime from Settings.",
      ),
    ).toBeDefined();
    first.unmount();
    renderTour("/settings");
    expect(
      screen.queryByRole("heading", { name: "Welcome to GeneField" }),
    ).toBeNull();
    expect(screen.getByText("Guided Tour", { exact: true })).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Replay Guided Tour" }));
    await screen.findByRole("heading", { name: tourSteps[0].title });
    expect(screen.getByLabelText("route").textContent).toBe("/");
    expect(
      screen.queryByRole("button", { name: "Replay Guided Tour" }),
    ).toBeNull();
    await completeFrom(0);
    expect(readTourProgress().hasCompletedTour).toBe(true);
    expect(localStorage.getItem("candidate-sentinel")).toBe(
      '[{"id":"existing-candidate"}]',
    );
    expect(localStorage.getItem("genefield-theme")).toBe("light");
  });

  it("goes back across routes and survives a missing target and manual navigation", async () => {
    renderTour();
    await begin();
    for (let i = 0; i < 3; i++) await next();
    expect(screen.getByLabelText("route").textContent).toBe("/lines");
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByLabelText("route").textContent).toBe("/");
    fireEvent.click(screen.getByRole("link", { name: "About" }));
    expect(screen.getByLabelText("route").textContent).toBe("/");
    fireEvent.click(
      screen.getByRole("button", { name: "Hide tip to explore this screen" }),
    );
    expect(document.documentElement.dataset.guidedTourDock).toBeUndefined();
    fireEvent.click(screen.getByRole("link", { name: "About" }));
    fireEvent.click(
      screen.getByRole("button", { name: /Continue Guided Tour/ }),
    );
    expect(
      screen.getByText(
        "You opened another module. Return to this step or continue the tour.",
      ),
    ).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Return to step" }));
    expect(screen.getByLabelText("route").textContent).toBe("/");
    await waitFor(
      () =>
        expect(
          screen.getByText(
            "This area is not available yet. You can continue the tour and explore it later.",
          ),
        ).toBeDefined(),
      { timeout: 5000 },
    );
    await next();
    expect(screen.getByLabelText("route").textContent).toBe("/lines");
  });

  it("advances once after a successful analysis or ranking, ignores late events, exits with Escape", async () => {
    renderTour();
    await begin();
    await walkTo(0, 11);
    act(() => {
      tourEvents.emit("cross-analysis-complete", {
        parents: ["GID_10039", "GID_10125"],
      });
      tourEvents.emit("cross-analysis-complete", {
        parents: ["GID_10039", "GID_10125"],
      });
    });
    await screen.findByRole("heading", { name: tourSteps[12].title });
    await walkTo(12, 18);
    act(() => tourEvents.emit("breed-ranking-complete", { count: 2 }));
    await screen.findByRole("heading", { name: tourSteps[19].title });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(readTourProgress().lastTourStep).toBe(19);
    act(() => tourEvents.emit("breed-ranking-complete", { count: 2 }));
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Manual replay" }));
    await screen.findByRole("heading", { name: tourSteps[0].title });
    fireEvent.click(screen.getByRole("button", { name: "Manual replay" }));
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
  });

  it("starts fresh after an interrupted reload instead of automatically resuming", async () => {
    writeTourProgress({
      hasSeenWelcome: true,
      hasCompletedTour: false,
      lastTourStep: 12,
    });
    renderTour("/settings");
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Start Guided Tour" }));
    await screen.findByRole("heading", { name: tourSteps[0].title });
  });
});

describe("local persistence and positioning", () => {
  it("provides Indonesian text for every tour step and its scientific boundaries", () => {
    const dictionary: Record<string, string> = indonesian;
    for (const step of tourSteps) {
      for (const message of [
        step.title,
        step.body,
        step.hint,
        step.category,
        step.task,
      ]) {
        if (message) expect(dictionary[message]).toBeTruthy();
      }
    }
    expect(
      dictionary[
        "The resulting Prioritization Score is a ranking score—not a probability of breeding success."
      ],
    ).toContain("bukan probabilitas");
    expect(
      dictionary[
        "This guided tour takes about 5–8 minutes and walks through the complete workflow."
      ],
    ).toBeTruthy();
    expect(
      dictionary["Explore → Analyze → Rank → Compare → Review"],
    ).toBeTruthy();
  });
  it.each([
    "not json",
    "null",
    "[]",
    '{"lastTourStep":999,"hasCompletedTour":"yes"}',
  ])("handles invalid storage: %s", (raw) => {
    localStorage.setItem(TOUR_STORAGE_KEY, raw);
    const progress = readTourProgress();
    expect(progress.hasCompletedTour).toBe(false);
    expect(progress.lastTourStep).toBeLessThan(24);
  });
  it("remains usable when storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(readTourProgress()).toEqual(INITIAL_PROGRESS);
    expect(() =>
      writeTourProgress({ ...INITIAL_PROGRESS, hasSeenWelcome: true }),
    ).not.toThrow();
  });
  it.each([
    [1920, 1080],
    [1440, 900],
    [1366, 768],
    [1024, 640],
    [640, 480],
  ])("keeps the popover visible at %i x %i", (width, height) => {
    for (const target of [
      null,
      { left: width - 100, top: height - 80, width: 100, height: 80 },
      { left: 0, top: 0, width, height },
    ]) {
      const panel = {
        width: Math.min(390, width - 32),
        height: Math.min(420, height - 32),
      };
      const position = placeTourPopover(target, panel, { width, height });
      expect(position.left).toBeGreaterThanOrEqual(16);
      expect(position.top).toBeGreaterThanOrEqual(16);
      expect(position.left + panel.width).toBeLessThanOrEqual(width - 16);
      expect(position.top + panel.height).toBeLessThanOrEqual(height - 16);
    }
  });
});
