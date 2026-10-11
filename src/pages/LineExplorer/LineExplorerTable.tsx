import { useEffect, useMemo, useState } from "react";
import {
  useTable,
  createColumnHelper,
  createPaginatedRowModel,
  tableFeatures,
  rowPaginationFeature,
  FlexRender,
} from "@tanstack/react-table";
import type { ColumnDef } from "@tanstack/table-core";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import type { RiceLine } from "@/types/research";
import { cn } from "@/lib/utils";

interface Props {
  lines: RiceLine[];
  pageSize: number;
  selectedId: string | null;
  onProfile: (line: RiceLine) => void;
  onUseAsParent: (id: string, slot: "A" | "B") => void;
}

const TRAIT_LABELS: Record<string, [string, string]> = {
  GY: ["Grain Yield", "(GY)"],
  DTF: ["Days to Flowering", "(DTF)"],
  NO: ["Stem Rot", "(NO)"],
  LB: ["Leaf Blast", "(LB)"],
};

/** Features: core + row pagination (drives the previous/next paging). */
const features = tableFeatures({
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
});

/** Dot + label used for Genotype/Phenotype/Pedigree availability cells. */
function AvailabilityCell({ value }: { value: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={cn(
          "size-[7px] shrink-0 rounded-full",
          value ? "bg-primary" : "border border-foreground/40 bg-transparent",
        )}
      />
      <span className="text-sm">{value ? "Yes" : "No"}</span>
    </span>
  );
}

/** Looks up a trait estimate for a line, formatted for display. */
function traitValue(line: RiceLine, trait: string): string {
  const found = line.estimates?.find((e) => e.trait === trait);
  if (!found || found.value === null || found.value === undefined) return "—";
  if (trait === "GY") return found.value.toLocaleString();
  if (trait === "NO" || trait === "LB") return found.value.toFixed(1);
  return String(found.value);
}

export function LineExplorerTable({
  lines,
  pageSize,
  selectedId,
  onProfile,
  onUseAsParent,
}: Props) {
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize,
  });

  // Reset to page 0 whenever the filtered dataset changes.
  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [lines]);

  const columns = useMemo(() => {
    const base = createColumnHelper<typeof features, RiceLine>();

    const traitColumns = (["GY", "DTF", "NO", "LB"] as const).map(
      (trait) => {
        const [full, code] = TRAIT_LABELS[trait];
        return base.display({
          id: trait,
          header: () => (
            <div className="leading-tight">
              <div>{full}</div>
              <div className="text-muted-foreground">{code}</div>
            </div>
          ),
          cell: ({ row }) => (
            <span className="tabular-nums">{traitValue(row.original, trait)}</span>
          ),
        });
      },
    );

    return [
      base.accessor("id", {
        id: "lineId",
        header: "LINE_ID",
        cell: ({ getValue }) => (
          <span className="font-mono text-sm">{getValue()}</span>
        ),
      }),
      base.accessor("hasGenotype", {
        id: "genotype",
        header: "Genotype",
        cell: ({ getValue }) => <AvailabilityCell value={getValue()} />,
      }),
      base.accessor("hasPhenotype", {
        id: "phenotype",
        header: "Phenotype",
        cell: ({ getValue }) => <AvailabilityCell value={getValue()} />,
      }),
      base.accessor("hasPedigree", {
        id: "pedigree",
        header: "Pedigree",
        cell: ({ getValue }) => <AvailabilityCell value={getValue()} />,
      }),
      ...traitColumns,
      base.display({
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-primary hover:bg-transparent hover:text-primary hover:underline"
              onClick={() => onProfile(row.original)}
            >
              Profile
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-6 w-6 rounded-full p-0 text-xs"
              aria-label={`Use as Parent A for ${row.original.id}`}
              onClick={() => onUseAsParent(row.original.id, "A")}
            >
              A
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-6 w-6 rounded-full p-0 text-xs"
              aria-label={`Use as Parent B for ${row.original.id}`}
              onClick={() => onUseAsParent(row.original.id, "B")}
            >
              B
            </Button>
          </div>
        ),
      }),
    ] as ReadonlyArray<ColumnDef<typeof features, RiceLine>>;
  }, [onProfile, onUseAsParent]);

  const table = useTable({
    features,
    columns,
    data: lines,
    state: { pagination },
    onPaginationChange: setPagination,
  });

  const pageRows = table.getRowModel().rows;
  const from =
    pageRows.length === 0
      ? 0
      : pagination.pageIndex * pagination.pageSize + 1;
  const to = from + pageRows.length - 1;

  return (
    <div className="mt-1 flex h-full flex-col">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-[var(--gf-card-shadow)]">
        <div className="flex-1 overflow-y-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className="border-b hover:bg-transparent"
                >
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
                    >
                      {header.isPlaceholder ? null : (
                        <FlexRender header={header} />
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {pageRows.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn(
                    "h-[34px] border-b",
                    row.original.id === selectedId && "bg-accent/40",
                  )}
                >
                  {row.getAllCells().map((cell) => (
                    <TableCell key={cell.id} className="px-3 text-sm">
                      <FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
              {pageRows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={columns.length}
                    className="px-3 py-8 text-center text-sm text-muted-foreground"
                  >
                    No lines match the current filters.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>

        {/* Pagination — inside the card at the bottom */}
        <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-sm">
          <span className="tabular-nums text-muted-foreground">
            Rows {from}–{to}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
