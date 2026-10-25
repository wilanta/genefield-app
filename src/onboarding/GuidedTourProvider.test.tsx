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
function renderTour(entry = "/") {
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
                  <Route path="*" element={<div>Actual page area</div>} />
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
async function completeFrom(start: number) {
  for (let i = start; i < tourSteps.length; i++) {
    await screen.findByRole("heading", { name: tourSteps[i].title });
    expect(screen.getByLabelText("route").textContent).toBe(tourSteps[i].route);
    await next();
  }
  await screen.findByRole("heading", {
    name: "You're ready to explore GeneField",
  });
}

describe("guided tour lifecycle", () => {
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
    for (let i = 0; i < 11; i++) await next();
    act(() => {
      tourEvents.emit("cross-analysis-complete");
      tourEvents.emit("cross-analysis-complete");
    });
    await screen.findByRole("heading", { name: tourSteps[12].title });
    for (let i = 12; i < 18; i++) await next();
    act(() => tourEvents.emit("breed-ranking-complete"));
    await screen.findByRole("heading", { name: tourSteps[19].title });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(readTourProgress().lastTourStep).toBe(19);
    act(() => tourEvents.emit("breed-ranking-complete"));
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
      for (const message of [step.title, step.body, step.hint, step.category]) {
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
