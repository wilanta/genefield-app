import { useTranslation } from "@/components/language-provider";
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
import { AvailabilityFilter, LineExplorerFilters } from "@/types/research";

interface Props {
  filters: LineExplorerFilters;
  onChange: (filters: LineExplorerFilters) => void;
  /** Number of reference rows matching current search and filters. */
  matchCount: number;
  /** Actual reference dataset total. */
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
  const { t: tr } = useTranslation();
  const availabilityLabel = (option: AvailabilityFilter) =>
    tr(option === "any" ? "Any" : option === "yes" ? "Yes" : "No");
  const display = `${label} ${availabilityLabel(value)}`;
  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(v as AvailabilityFilter)}
    >
      <SelectTrigger
        aria-label={display}
        className="h-9 w-36 gap-1.5 bg-card text-muted-foreground"
      >
        <SelectValue>{display}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {AVAILABILITY_OPTIONS.map((opt) => (
          <SelectItem key={opt} value={opt}>
            {availabilityLabel(opt)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function LineExplorerToolbar({
  filters,
  onChange,
  matchCount,
  totalCount,
}: Props) {
  const { t: tr } = useTranslation();
  const isClearable =
    filters.search !== "" ||
    filters.genotype !== "any" ||
    filters.phenotype !== "any" ||
    filters.pedigree !== "any";

  const clear = () =>
    onChange({
      search: "",
      genotype: "any",
      phenotype: "any",
      pedigree: "any",
    });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          data-tour="line-search"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          placeholder={tr("Search LINE_ID")}
          aria-label={tr("Search LINE_ID")}
          className="w-48 bg-card pl-9 text-foreground"
        />
      </div>

      <AvailabilitySelect
        label={tr("Genotype")}
        value={filters.genotype}
        onChange={(genotype) => onChange({ ...filters, genotype })}
      />
      <AvailabilitySelect
        label={tr("Phenotype")}
        value={filters.phenotype}
        onChange={(phenotype) => onChange({ ...filters, phenotype })}
      />
      <AvailabilitySelect
        label={tr("Pedigree")}
        value={filters.pedigree}
        onChange={(pedigree) => onChange({ ...filters, pedigree })}
      />

      <Button
        variant="ghost"
        size="sm"
        onClick={clear}
        disabled={!isClearable}
        className="bg-card font-semibold text-foreground hover:bg-transparent"
      >
        {tr("Clear")}
      </Button>

      <span className="ml-auto text-sm tabular-nums text-muted-foreground">
        {matchCount.toLocaleString()} {tr("of")} {totalCount.toLocaleString()}{" "}
        {tr("lines")}
      </span>
    </div>
  );
}
