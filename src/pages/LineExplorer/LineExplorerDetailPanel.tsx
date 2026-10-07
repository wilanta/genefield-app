import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { RiceLine, TraitEstimate } from "@/types/research";

interface Props {
  line: RiceLine | null;
  onUseAsParent: (id: string, slot: "A" | "B") => void;
}

/** "Historical phenotype summary" trait rows. */
function phenotypeRows(line: RiceLine) {
  const format = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return "—";
    return value.toFixed(1);
  };
  return [
    { trait: "GY", label: "Grain Yield (kg/ha)" },
    { trait: "DTF", label: "Days to Flowering (days)" },
    { trait: "NO", label: "Stem Rot" },
    { trait: "LB", label: "Leaf Blast" },
  ].map((row) => {
    const found: TraitEstimate | undefined = line.estimates?.find(
      (e) => e.trait === row.trait,
    );
    const value = found ? found.value : null;
    const display =
      row.trait === "GY"
        ? value === null || value === undefined
          ? "—"
          : value.toLocaleString()
        : row.trait === "DTF"
          ? value === null || value === undefined
            ? "—"
            : String(value)
          : format(value);
    return { ...row, value: display };
  });
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium text-foreground">
        {children}
      </span>
    </div>
  );
}

function AvailabilityBadge({ value }: { value: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={
          value
            ? "size-[7px] rounded-full bg-primary"
            : "size-[7px] rounded-full border border-foreground/40 bg-transparent"
        }
      />
      {value ? "Available" : "Not available"}
    </span>
  );
}

export function LineExplorerDetailPanel({ line, onUseAsParent }: Props) {
  const navigate = useNavigate();

  if (!line) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center rounded-xl border border-border bg-card px-6 shadow-[var(--gf-card-shadow)]">
        <p className="text-sm text-muted-foreground">
          Select a line to see its profile.
        </p>
      </div>
    );
  }

  const knownParents = line.knownParents?.join(" × ");

  return (
    <div className="flex flex-col gap-4">
      {/* Card 1 — Profile */}
      <Card className="shadow-[var(--gf-card-shadow)]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="font-mono text-lg">{line.id}</CardTitle>
            <Badge className="border-amber-200 bg-amber-50 text-amber-800">
              Illustrative
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Row label="Genotype availability">
              <AvailabilityBadge value={line.hasGenotype} />
            </Row>
            <Separator />
            <Row label="Pedigree availability">
              <AvailabilityBadge value={line.hasPedigree} />
            </Row>
            <Separator />
            <Row label="Phenotype observations">
              {line.phenotypeObservations ?? "—"}
            </Row>
            <Separator />
            <Row label="Known parents">
              {knownParents && knownParents.length > 0 ? (
                <span className="font-mono">{knownParents}</span>
              ) : (
                "—"
              )}
            </Row>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Historical phenotype summary
            </p>
            <div className="space-y-2">
              {phenotypeRows(line).map((row) => (
                <div key={row.trait}>
                  <Row label={row.label}>{row.value}</Row>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Data provenance
            </p>
            <p className="text-xs text-muted-foreground">
              INIA Uruguay dataset - imported locally. Values above are
              illustrative placeholders.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Card 2 — Actions */}
      <Card className="shadow-[var(--gf-card-shadow)]">
        <CardContent className="flex flex-col gap-2">
          <Button
            className="h-9 w-full justify-center bg-[#256B50] text-white hover:bg-[#1e5540]"
            onClick={() => onUseAsParent(line.id, "A")}
          >
            Use as Parent A
          </Button>
          <Button
            variant="outline"
            className="h-9 w-full justify-center"
            onClick={() => onUseAsParent(line.id, "B")}
          >
            Use as Parent B
          </Button>
          <Button
            variant="outline"
            className="h-9 w-full justify-center"
            onClick={() => navigate(`/pedigree?line=${line.id}`)}
          >
            View Pedigree
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
