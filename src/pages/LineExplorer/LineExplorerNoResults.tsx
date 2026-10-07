import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  /** The current search query echoed in the headline, or "any of your filters". */
  queryLabel: string;
  onClearFilters: () => void;
}

export function LineExplorerNoResults({ queryLabel, onClearFilters }: Props) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-border bg-card px-6 py-12 text-center shadow-[var(--gf-card-shadow)]">
      <div className="mb-4 flex size-10 items-center justify-center rounded-full bg-muted">
        <SearchX className="size-5 text-muted-foreground" />
      </div>
      <h2 className="text-base font-medium text-foreground">
        No lines match “{queryLabel}”
      </h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Check the LINE_ID or try a partial ID. Filters are narrowing the
        results; clearing them may help.
      </p>
      <Button variant="outline" size="sm" className="mt-5" onClick={onClearFilters}>
        Clear filters
      </Button>
    </div>
  );
}
