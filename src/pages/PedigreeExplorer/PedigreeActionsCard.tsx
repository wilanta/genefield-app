import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { PedigreeNode } from "@/types/research";

interface PedigreeActionsCardProps {
  selectedNode: PedigreeNode;
  onOpenLineProfile?: (lineId: string) => void;
  onUseAsParentA?: (lineId: string) => void;
  onUseAsParentB?: (lineId: string) => void;
}

export function PedigreeActionsCard({
  selectedNode,
  onOpenLineProfile,
  onUseAsParentA,
  onUseAsParentB,
}: PedigreeActionsCardProps) {
  // No-op by default; parent page may pass real navigation handlers.
  const openLineProfile =
    onOpenLineProfile ??
    (() => {
      /* no-op */
    });
  const useAsParentA = onUseAsParentA ?? (() => {
    /* no-op */
  });
  const useAsParentB = onUseAsParentB ?? (() => {
    /* no-op */
  });

  return (
    <Card className="shadow-[var(--gf-card-shadow)]">
      <CardContent className="space-y-3">
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            className="h-10 w-full bg-white"
            onClick={() => openLineProfile(selectedNode.id)}
          >
            Open Line Profile
          </Button>
          <Button
            variant="default"
            className="h-10 w-full bg-primary"
            onClick={() => useAsParentA(selectedNode.id)}
          >
            Use as Parent A
          </Button>
          <Button
            variant="outline"
            className="h-10 w-full bg-white"
            onClick={() => useAsParentB(selectedNode.id)}
          >
            Use as Parent B
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
