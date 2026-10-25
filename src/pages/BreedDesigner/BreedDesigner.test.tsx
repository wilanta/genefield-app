// @vitest-environment jsdom
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
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
  useNavigate,
} from "react-router-dom";
import { LanguageProvider } from "@/components/language-provider";
import { useBreedDesignerDraft } from "@/stores/breed-designer-draft";
import type { RiceLine } from "@/types/research";
import BreedDesigner from "./BreedDesigner";

const mocks = vi.hoisted(() => ({
  allLines: vi.fn(),
  start: vi.fn(),
  rankPool: vi.fn(),
}));
vi.mock("@/services/reference-service", () => ({
  referenceService: { allLines: mocks.allLines },
}));
vi.mock("@/services/inference-service", () => ({
  inference: { start: mocks.start },
  rankPool: mocks.rankPool,
}));
vi.mock("@/services", () => ({ candidateStore: { create: vi.fn() } }));
const lines: RiceLine[] = ["GID_100", "GID_101", "GID_200"].map((id, i) => ({
  id,
  name: id,
  hasGenotype: true,
  hasPhenotype: i < 2,
  hasPedigree: i < 2,
}));

function Navigation() {
  const navigate = useNavigate();
  return (
    <nav>
      <Link to="/">Overview</Link>
      <Link to="/cross-lab">Cross Lab</Link>
      <Link to="/breed-designer">Breed Designer</Link>
      <button onClick={() => navigate(-1)}>Back</button>
      <button onClick={() => navigate(1)}>Forward</button>
    </nav>
  );
}
function renderApp() {
  return render(
    <StrictMode>
      <LanguageProvider>
        <MemoryRouter initialEntries={["/breed-designer"]}>
          <Navigation />
          <Routes>
            <Route path="/" element={<p>Overview page</p>} />
            <Route path="/cross-lab" element={<p>Cross Lab page</p>} />
            <Route path="/breed-designer" element={<BreedDesigner />} />
          </Routes>
        </MemoryRouter>
      </LanguageProvider>
    </StrictMode>,
  );
}
const input = (name: string) =>
  screen.getByRole("spinbutton", { name }) as HTMLInputElement;
const search = () =>
  screen.getByRole("textbox", {
    name: "Search parent lines",
  }) as HTMLInputElement;
const combo = (name: string) => screen.getByRole("combobox", { name });
const go = (name: string) =>
  fireEvent.click(screen.getByRole("link", { name }));
const change = (name: string, value: number) =>
  fireEvent.change(input(name), { target: { value: String(value) } });
async function select(name: string, value: string) {
  fireEvent.keyDown(combo(name), { key: "ArrowDown" });
  fireEvent.click(await screen.findByRole("option", { name: value }));
}
async function configure() {
  fireEvent.change(search(), { target: { value: "GID_10" } });
  await select("Genotype availability", "Any");
  await select("Phenotype availability", "Available");
  await select("Pedigree availability", "Available");
  change("GY weight", 2.5);
  change("DTF weight", 1);
  change("NO weight", 0.5);
  change("LB weight", 0.25);
  await select("DTF priority", "Earlier flowering");
  change("Maximum candidate count", 12);
}
function expectConfiguration() {
  expect(search().value).toBe("GID_10");
  expect(combo("Genotype availability").textContent).toContain("Any");
  expect(combo("Phenotype availability").textContent).toContain("Available");
  expect(combo("Pedigree availability").textContent).toContain("Available");
  for (const [name, value] of [
    ["GY", "2.5"],
    ["DTF", "1"],
    ["NO", "0.5"],
    ["LB", "0.25"],
  ]) {
    expect(input(`${name} weight`).value).toBe(value);
  }
  expect(combo("DTF priority").textContent).toBe("Earlier flowering");
  expect(input("Maximum candidate count").value).toBe("12");
  for (const name of [
    "Exclude self-crosses",
    "Exclude duplicate parent pairs",
    "Exclude historically recorded crosses",
  ]) {
    const rule = screen.getByRole("switch", { name }) as HTMLButtonElement;
    expect(rule.disabled).toBe(true);
    expect(rule.getAttribute("aria-checked")).toBe("true");
  }
}
async function generate() {
  const button = screen.getByRole("button", {
    name: "Generate Candidate Pairs",
  });
  await waitFor(() =>
    expect((button as HTMLButtonElement).disabled).toBe(false),
  );
  fireEvent.click(button);
}
beforeEach(() => {
  localStorage.clear();
  useBreedDesignerDraft.setState(useBreedDesignerDraft.getInitialState(), true);
  vi.resetAllMocks();
  HTMLElement.prototype.scrollIntoView = vi.fn();
  mocks.allLines.mockResolvedValue(lines);
  mocks.start.mockResolvedValue({
    traits: Object.fromEntries(
      ["GY", "DTF", "NO", "LB"].map((trait) => [
        trait,
        { training_parent_ids: lines.map((line) => line.id) },
      ]),
    ),
  });
  mocks.rankPool.mockResolvedValue({
    bundle_version: "final-v1",
    objectives: { GY: "maximize" },
    weights: { GY: 1 },
    eligible_candidate_count: 1,
    candidates: [
      {
        parent_ids: ["GID_100", "GID_101"],
        application_prioritization_score: 1,
        predictions: { GY: { value: 4000, units: "kg/ha" } },
      },
    ],
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Breed Designer configuration session", () => {
  it.each(["DTF", "NO", "LB"])(
    "lets typing replace the default zero in %s without a leading zero",
    (trait) => {
      renderApp();
      const field = input(`${trait} weight`);
      expect(field.value).toBe("0");
      fireEvent.focus(field);
      expect(field.value).toBe("");
      fireEvent.change(field, { target: { value: "2" } });
      expect(field.value).toBe("2");
      fireEvent.blur(field);
      expect(field.value).toBe("2");
      go("Overview");
      go("Breed Designer");
      expect(input(`${trait} weight`).value).toBe("2");
    },
  );

  it("allows clearing a weight before typing and restores zero when left empty", () => {
    renderApp();
    const field = input("GY weight");
    fireEvent.focus(field);
    fireEvent.change(field, { target: { value: "" } });
    expect(field.value).toBe("");
    fireEvent.change(field, { target: { value: "2" } });
    expect(field.value).toBe("2");
    fireEvent.change(field, { target: { value: "" } });
    fireEvent.blur(field);
    expect(field.value).toBe("0");
    go("Overview");
    go("Breed Designer");
    expect(input("GY weight").value).toBe("0");
  });

  it("normalizes pasted leading zeros while allowing decimal weights", () => {
    renderApp();
    const field = input("NO weight");
    fireEvent.focus(field);
    fireEvent.change(field, { target: { value: "002" } });
    expect(field.value).toBe("2");
    fireEvent.change(field, { target: { value: "00.25" } });
    expect(field.value).toBe("0.25");
    fireEvent.blur(field);
    expect(field.value).toBe("0.25");
    go("Overview");
    go("Breed Designer");
    expect(input("NO weight").value).toBe("0.25");
  });

  it("keeps generated results when focusing and leaving an unchanged zero weight", async () => {
    renderApp();
    await generate();
    await screen.findByText("C-001");
    const field = input("NO weight");
    fireEvent.focus(field);
    expect(field.value).toBe("");
    fireEvent.blur(field);
    expect(field.value).toBe("0");
    expect(screen.getByText("C-001")).toBeDefined();
    expect(mocks.rankPool).toHaveBeenCalledTimes(1);
  });
  it("retains every pool and generation input across routes and Back/Forward", async () => {
    renderApp();
    await configure();
    go("Overview");
    expect(
      screen.queryByRole("textbox", { name: "Search parent lines" }),
    ).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expectConfiguration();
    fireEvent.click(screen.getByRole("button", { name: "Forward" }));
    go("Breed Designer");
    expectConfiguration();
    go("Cross Lab");
    go("Breed Designer");
    expectConfiguration();
    expect(mocks.rankPool).not.toHaveBeenCalled();
  });

  it("generates using the restored eligible pool, objectives, weights, and candidate limit", async () => {
    renderApp();
    await configure();
    go("Overview");
    go("Breed Designer");
    await generate();
    await screen.findByText("C-001");
    expect(mocks.rankPool).toHaveBeenCalledWith(
      ["GID_100", "GID_101"],
      { GY: "maximize", DTF: "minimize", NO: "minimize", LB: "minimize" },
      { GY: 2.5, DTF: 1, NO: 0.5, LB: 0.25 },
      12,
    );
    go("Overview");
    go("Breed Designer");
    expectConfiguration();
    expect(screen.queryByText("C-001")).toBeNull();
    expect(mocks.rankPool).toHaveBeenCalledTimes(1);
  });

  it("clears outdated results when one restored configuration field changes", async () => {
    renderApp();
    await configure();
    await generate();
    await screen.findByText("C-001");
    change("Maximum candidate count", 20);
    expect(screen.queryByText("C-001")).toBeNull();
    go("Overview");
    go("Breed Designer");
    expect(input("Maximum candidate count").value).toBe("20");
    expect(search().value).toBe("GID_10");
    expect(input("GY weight").value).toBe("2.5");
    expect(combo("DTF priority").textContent).toBe("Earlier flowering");
  });

  it("keeps zero weights and the candidate limit normalization across navigation", async () => {
    renderApp();
    change("GY weight", -1);
    change("Maximum candidate count", 0);
    go("Cross Lab");
    go("Breed Designer");
    expect(input("GY weight").value).toBe("0");
    expect(input("Maximum candidate count").value).toBe("1");
    await generate();
    expect(screen.getByRole("alert").textContent).toContain(
      "Select at least one trait with a positive weight.",
    );
    expect(mocks.rankPool).not.toHaveBeenCalled();
  });

  it("retains a missing DTF priority and still requires it before ranking", async () => {
    renderApp();
    change("DTF weight", 1);
    go("Overview");
    go("Breed Designer");
    expect(input("DTF weight").value).toBe("1");
    await generate();
    expect(screen.getByRole("alert").textContent).toContain(
      "Select a flowering time priority",
    );
    expect(mocks.rankPool).not.toHaveBeenCalled();
  });
});
