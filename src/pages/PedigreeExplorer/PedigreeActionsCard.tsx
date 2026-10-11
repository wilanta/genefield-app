import { useTranslation } from "@/components/language-provider";
import { Card, CardContent } from "@/components/ui/card";
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
  const { t: tr } = useTranslation();
  // No-op by default; parent page may pass real navigation handlers.
  const openLineProfile =
    onOpenLineProfile ??
    (() => {
      /* no-op */
    });
  const useAsParentA =
    onUseAsParentA ??
    (() => {
      /* no-op */
    });
  const useAsParentB =
    onUseAsParentB ??
    (() => {
      /* no-op */
    });

  return (
    <Card className="shadow-[var(--gf-card-shadow)]">
      <CardContent className="space-y-3">
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            className="h-10 w-full bg-card"
            onClick={() => openLineProfile(selectedNode.id)}
          >
            {tr("Open Line Profile")}
          </Button>
          <Button
            variant="default"
            className="h-10 w-full bg-primary"
            onClick={() => useAsParentA(selectedNode.id)}
          >
            {tr("Use as Parent A")}
          </Button>
          <Button
            variant="outline"
            className="h-10 w-full bg-card"
            onClick={() => useAsParentB(selectedNode.id)}
          >
            {tr("Use as Parent B")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
