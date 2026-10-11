import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { referenceService } from "@/services/reference-service";
import { useAsync } from "@/lib/use-async";
import type { LineExplorerFilters, RiceLine } from "@/types/research";
import { LineExplorerToolbar } from "./LineExplorerToolbar";
import { LineExplorerTable } from "./LineExplorerTable";
import { LineExplorerDetailPanel } from "./LineExplorerDetailPanel";
import { LineExplorerNoResults } from "./LineExplorerNoResults";

const PAGE_SIZE = 10;

interface LineExplorerProps {
  /** Optional supplied dataset, primarily for component tests. */
  lines?: RiceLine[];
  /** Optional supplied dataset total. */
  totalCount?: number;
  /** Optional selected line ID; navigation also accepts ?select=. */
  selectedId?: string | null;
  /** Called when the user selects a line (e.g. via its Profile link). */
  onSelectLine?: (id: string) => void;
  /** Called by "Use as Parent A/B". */
  onUseAsParent?: (id: string, slot: "A" | "B") => void;
  /** Initial filter state (optional). */
  filters?: LineExplorerFilters;
}

const DEFAULT_FILTERS: LineExplorerFilters = {
  search: "",
  genotype: "any",
  phenotype: "any",
  pedigree: "any",
};

function matchesFilters(line: RiceLine, filters: LineExplorerFilters): boolean {
  const q = filters.search.trim().toLowerCase();
  if (q && !line.id.toLowerCase().includes(q)) return false;
  if (
    filters.genotype !== "any" &&
    line.hasGenotype !== (filters.genotype === "yes")
  )
    return false;
  if (
    filters.phenotype !== "any" &&
    line.hasPhenotype !== (filters.phenotype === "yes")
  )
    return false;
  if (
    filters.pedigree !== "any" &&
    line.hasPedigree !== (filters.pedigree === "yes")
  )
    return false;
  return true;
}

export default function LineExplorer({
  lines: suppliedLines,
  totalCount: suppliedTotal,
  selectedId = null,
  onSelectLine,
  onUseAsParent,
  filters: initialFilters = DEFAULT_FILTERS,
}: LineExplorerProps) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { data: loadedLines, error } = useAsync(() =>
    referenceService.allLines(),
  );
  const lines = suppliedLines ?? loadedLines ?? [];
  const totalCount = suppliedTotal ?? lines.length;
  const [filters, setFilters] = useState<LineExplorerFilters>(initialFilters);
  const [selected, setSelected] = useState<string | null>(selectedId);

  // Default: "Use as Parent A/B" navigates to Cross Lab, prefilling that slot.
  const handleUseAsParent =
    onUseAsParent ??
    ((id: string, slot: "A" | "B") => {
      const target = slot === "A" ? "a" : "b";
      navigate(`/cross-lab?${target}=${encodeURIComponent(id)}`);
    });

  // Keep internal selection in sync when a parent-driven selectedId is provided.
  useEffect(() => {
    setSelected(params.get("select") ?? selectedId);
  }, [selectedId, params]);

  const filtered = useMemo(
    () => lines.filter((line) => matchesFilters(line, filters)),
    [lines, filters],
  );

  const selectedLine =
    filtered.find((l) => l.id === selected) ??
    lines.find((l) => l.id === selected) ??
    null;

  const handleProfile = (line: RiceLine) => {
    setSelected(line.id);
    onSelectLine?.(line.id);
  };

  const clearFilters = () => setFilters(DEFAULT_FILTERS);

  const queryLabel =
    filters.search.trim() ||
    (filters.genotype !== "any" ||
    filters.phenotype !== "any" ||
    filters.pedigree !== "any"
      ? "any of your filters"
      : "any of your filters");

  return (
    <div className="flex h-full min-h-0 flex-col p-6">
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      {!loadedLines && !error && (
        <p role="status">Memuat data referensi lokal…</p>
      )}
      {/* Toolbar */}
      <div className="shrink-0">
        <LineExplorerToolbar
          filters={filters}
          onChange={setFilters}
          matchCount={filtered.length}
          totalCount={totalCount}
        />
      </div>

      {/* Content row: table (800) + detail panel (340) */}
      <div className="mt-5 grid min-h-0 flex-1 grid-cols-1 gap-5 overflow-auto lg:grid-cols-[minmax(0,1fr)_420px]">
        <section aria-label="Lines table" className="min-h-0">
          {filtered.length === 0 ? (
            <LineExplorerNoResults
              queryLabel={queryLabel}
              onClearFilters={clearFilters}
            />
          ) : (
            <LineExplorerTable
              lines={filtered}
              pageSize={PAGE_SIZE}
              selectedId={selected}
              onProfile={handleProfile}
              onUseAsParent={handleUseAsParent}
            />
          )}
        </section>

        <aside aria-label="Line detail" className="min-h-0">
          <LineExplorerDetailPanel
            line={filtered.length === 0 ? null : selectedLine}
            onUseAsParent={handleUseAsParent}
          />
        </aside>
      </div>
    </div>
  );
}
