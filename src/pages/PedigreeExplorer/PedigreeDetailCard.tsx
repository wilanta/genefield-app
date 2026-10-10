import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { PedigreeDetail, PedigreeNode } from "@/types/research";

interface PedigreeDetailCardProps {
  selectedNode: PedigreeNode;
  detail: PedigreeDetail;
}

function DetailRow({
  label,
  value,
  available,
}: {
  label: string;
  value?: string;
  available?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      {available !== undefined ? (
        <span
          className={
            available
              ? "font-medium text-primary"
              : "font-medium text-muted-foreground"
          }
        >
          {available ? "Available" : "Not available"}
        </span>
      ) : (
        <span className="text-right font-medium text-foreground">
          {value ?? "—"}
        </span>
      )}
    </div>
  );
}

export function PedigreeDetailCard({
  selectedNode,
  detail,
}: PedigreeDetailCardProps) {
  return (
    <Card className="shadow-[var(--gf-card-shadow)]">
      <CardHeader>
        <CardDescription>Selected</CardDescription>
        <CardTitle className="font-mono text-lg">
          {selectedNode.label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Recorded parents
          </p>
          {detail.recordedParents.length > 0 ? (
            <ul className="space-y-0.5">
              {detail.recordedParents.map((parent) => (
                <li key={parent} className="font-mono text-sm">
                  {parent}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">None recorded</p>
          )}
        </div>

        <Separator />

        <DetailRow
          label="Recorded descendants"
          value={String(detail.recordedDescendants)}
        />

        <Separator />

        <DetailRow
          label="Genotype availability"
          available={selectedNode.hasGenotype}
        />

        <Separator />

        <DetailRow
          label="Phenotype availability"
          available={selectedNode.hasPhenotype}
        />

        <Separator />

        <p className="text-xs text-muted-foreground">
          Example data. Edges show recorded parent–offspring relationships only.
        </p>
      </CardContent>
    </Card>
  );
}
