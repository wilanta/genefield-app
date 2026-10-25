// @vitest-environment jsdom
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import {
  Link,
  MemoryRouter,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import { LanguageProvider } from "@/components/language-provider";
import { useLineExplorerFilters } from "@/stores/line-explorer-filters";
import type { LineExplorerFilters, RiceLine } from "@/types/research";
import LineExplorer from "./LineExplorer";

const lines: RiceLine[] = [
  {
    id: "GID_1",
    name: "GID_1",
    hasGenotype: true,
    hasPhenotype: false,
    hasPedigree: true,
  },
  {
    id: "GID_100",
    name: "GID_100",
    hasGenotype: true,
    hasPhenotype: true,
    hasPedigree: false,
  },
  {
    id: "GID_2",
    name: "GID_2",
    hasGenotype: false,
    hasPhenotype: false,
    hasPedigree: false,
  },
];
vi.mock("@/services/reference-service", () => ({
  referenceService: { allLines: vi.fn(async () => lines) },
}));

function Navigation() {
  const navigate = useNavigate();
  return (
    <nav>
      <Link to="/">Overview</Link>
      <Link to="/lines">Line Explorer</Link>
      <button onClick={() => navigate(-1)}>Back</button>
      <button onClick={() => navigate(1)}>Forward</button>
    </nav>
  );
}
function renderApp(filters?: LineExplorerFilters) {
  return render(
    <StrictMode>
      <LanguageProvider>
        <MemoryRouter initialEntries={["/lines"]}>
          <Navigation />
          <Routes>
            <Route path="/" element={<p>Overview page</p>} />
            <Route path="/lines" element={<LineExplorer filters={filters} />} />
          </Routes>
        </MemoryRouter>
      </LanguageProvider>
    </StrictMode>,
  );
}
const search = () =>
  screen.getByRole("textbox", { name: "Search LINE_ID" }) as HTMLInputElement;
const go = (name: string) =>
  fireEvent.click(screen.getByRole("link", { name }));
async function select(label: string, value: string) {
  fireEvent.keyDown(screen.getByRole("combobox", { name: new RegExp(label) }), {
    key: "ArrowDown",
  });
  fireEvent.click(await screen.findByRole("option", { name: value }));
}
function expectDefaults() {
  expect(search().value).toBe("");
  for (const label of ["Genotype", "Phenotype", "Pedigree"]) {
    expect(
      screen.getByRole("combobox", { name: `${label} Any` }),
    ).toBeDefined();
  }
}
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("genefield-language", "english");
  useLineExplorerFilters.getState().resetFilters();
  // Radix scrolls the highlighted option; jsdom does not implement scrolling.
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  HTMLElement.prototype.scrollIntoView = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Line Explorer filter session", () => {
  it("restores search, all availability filters, and filtered results after navigation and Back/Forward", async () => {
    renderApp();
    fireEvent.change(search(), { target: { value: "GID_1" } });
    await select("Genotype", "Yes");
    await select("Phenotype", "No");
    await select("Pedigree", "Yes");
    const table = () =>
      within(screen.getByRole("region", { name: "Lines table" }));
    expect(await table().findByText("GID_1")).toBeDefined();
    expect(table().queryByText("GID_100")).toBeNull();
    go("Overview");
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(search().value).toBe("GID_1");
    for (const name of ["Genotype Yes", "Phenotype No", "Pedigree Yes"]) {
      expect(screen.getByRole("combobox", { name })).toBeDefined();
    }
    expect(await table().findByText("GID_1")).toBeDefined();
    expect(table().queryByText("GID_100")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Forward" }));
    go("Line Explorer");
    expect(search().value).toBe("GID_1");
    expect(
      screen.getByRole("combobox", { name: "Phenotype No" }),
    ).toBeDefined();
  });

  it.each(["Clear", "Clear filters"])(
    "keeps defaults after %s and returning to the page",
    async (name) => {
      renderApp();
      await select("Genotype", "Yes");
      await select("Phenotype", "No");
      await select("Pedigree", "Yes");
      fireEvent.change(search(), { target: { value: "missing-line" } });
      fireEvent.click(screen.getByRole("button", { name }));
      expectDefaults();
      go("Overview");
      go("Line Explorer");
      expectDefaults();
      expect(
        await screen.findByRole("button", {
          name: "Use as Parent A for GID_100",
        }),
      ).toBeDefined();
    },
  );

  it("keeps an unsuccessful search instead of silently clearing filters on return", () => {
    renderApp();
    fireEvent.change(search(), { target: { value: "missing-line" } });
    go("Overview");
    go("Line Explorer");
    expect(search().value).toBe("missing-line");
    expect(screen.getByRole("button", { name: "Clear filters" })).toBeDefined();
  });

  it("still honors explicitly supplied initial filters", async () => {
    renderApp({
      search: "GID_2",
      genotype: "no",
      phenotype: "no",
      pedigree: "no",
    });
    expect(search().value).toBe("GID_2");
    expect(screen.getByRole("combobox", { name: "Genotype No" })).toBeDefined();
    expect(
      await screen.findByRole("button", { name: "Use as Parent A for GID_2" }),
    ).toBeDefined();
    expect(
      screen.queryByRole("button", { name: "Use as Parent A for GID_1" }),
    ).toBeNull();
  });
});
