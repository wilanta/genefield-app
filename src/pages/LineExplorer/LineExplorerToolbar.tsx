import { Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AvailabilityFilter,
  LineExplorerFilters,
} from "@/types/research";

interface Props {
  filters: LineExplorerFilters;
  onChange: (filters: LineExplorerFilters) => void;
  /** Number of mock rows matching the current search + filters. */
  matchCount: number;
  /** Simulated dataset total (independent of the local mock rows). */
  totalCount: number;
}

const AVAILABILITY_OPTIONS: AvailabilityFilter[] = ["any", "yes", "no"];

function AvailabilitySelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: AvailabilityFilter;
  onChange: (v: AvailabilityFilter) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <Select value={value} onValueChange={(v) => onChange(v as AvailabilityFilter)}>
        <SelectTrigger className="w-[74px]">
          <SelectValue>{value.charAt(0).toUpperCase() + value.slice(1)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {AVAILABILITY_OPTIONS.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt.charAt(0).toUpperCase() + opt.slice(1)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function LineExplorerToolbar({
  filters,
  onChange,
  matchCount,
  totalCount,
}: Props) {
  const isClearable =
    filters.search !== "" ||
    filters.genotype !== "any" ||
    filters.phenotype !== "any" ||
    filters.pedigree !== "any";

  const clear = () =>
    onChange({ search: "", genotype: "any", phenotype: "any", pedigree: "any" });

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          placeholder="Search LINE_ID"
          aria-label="Search LINE_ID"
          className="w-[197px] pl-9"
        />
      </div>

      <AvailabilitySelect
        label="Genotype"
        value={filters.genotype}
        onChange={(genotype) => onChange({ ...filters, genotype })}
      />
      <AvailabilitySelect
        label="Phenotype"
        value={filters.phenotype}
        onChange={(phenotype) => onChange({ ...filters, phenotype })}
      />
      <AvailabilitySelect
        label="Pedigree"
        value={filters.pedigree}
        onChange={(pedigree) => onChange({ ...filters, pedigree })}
      />

      <Button variant="outline" size="sm" onClick={clear} disabled={!isClearable}>
        Clear
      </Button>

      <span className="ml-auto text-sm tabular-nums text-muted-foreground">
        {matchCount.toLocaleString()} of{" "}
        {totalCount.toLocaleString()} lines
      </span>
    </div>
  );
}
