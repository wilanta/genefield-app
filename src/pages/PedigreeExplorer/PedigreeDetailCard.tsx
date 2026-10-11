import { Card, CardContent } from "@/components/ui/card";
import type { PedigreeDetail, PedigreeNode } from "@/types/research";

interface PedigreeDetailCardProps {
  selectedNode: PedigreeNode;
  detail: PedigreeDetail;
}

function AvailabilityRow({
  label,
  available,
}: {
  label: string;
  available: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1.5 font-medium">
        <span
          className={`h-1.5 w-1.5 rounded-full ${available ? "bg-primary" : "bg-muted"
            }`}
        />
        {available ? "Available" : "Not available"}
      </span>
    </div>
  );
}

export function PedigreeDetailCard({
  selectedNode,
  detail,
}: PedigreeDetailCardProps) {
  const parents =
    detail.recordedParents.length > 0
      ? detail.recordedParents.join(", ")
      : null;

  return (
    <Card className="shadow-[var(--gf-card-shadow)]">
      <CardContent className="space-y-0 ">
        <h3 className="font-mono text-xl font-bold tracking-tight">
          {selectedNode.label}
        </h3>

        <div className="mt-4 divide-y divide-gray-200">
          <div className="flex items-center justify-between py-2.5 text-sm">
            <span className="text-muted-foreground">Recorded parents</span>
            {parents ? (
              <span className="text-right font-mono font-medium">
                {parents}
              </span>
            ) : (
              <span className="text-muted-foreground">None recorded</span>
            )}
          </div>

          <div className="flex items-center justify-between py-2.5 text-sm">
            <span className="text-muted-foreground">
              Recorded descendants
            </span>
            <span className="font-medium">
              {detail.recordedDescendants}
            </span>
          </div>

          <div className="py-2.5">
            <AvailabilityRow
              label="Genotype availability"
              available={selectedNode.hasGenotype}
            />
          </div>

          <div className="py-2.5">
            <AvailabilityRow
              label="Phenotype availability"
              available={selectedNode.hasPhenotype}
            />
          </div>
        </div>

        <p className="pt-3 text-xs leading-relaxed text-muted-foreground">
          Example data. Edges show recorded parent–offspring relationships only.
        </p>
      </CardContent>
    </Card>
  );
}
