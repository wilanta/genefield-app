import { useNavigate } from "react-router-dom";
import { mockPedigree } from "@/mocks/pedigree";
import type { PedigreeGraphData } from "@/types/research";
import PedigreeGraph from "./PedigreeGraph";
import { PedigreeDetailCard } from "./PedigreeDetailCard";
import { PedigreeActionsCard } from "./PedigreeActionsCard";

export default function PedigreeExplorer() {
  const navigate = useNavigate();
  const data: PedigreeGraphData = mockPedigree;
  const selectedNode =
    data.nodes.find((n) => n.id === data.selectedId) ?? data.nodes[0];

  const ancestorCount = data.nodes.filter((n) => n.column === "ancestor").length;
  const descendantCount = data.nodes.filter(
    (n) => n.column === "descendant",
  ).length;

  const openLineProfile = (id: string) =>
    navigate(`/lines?select=${encodeURIComponent(id)}`);
  const useAsParentA = (id: string) =>
    navigate(`/cross-lab?a=${encodeURIComponent(id)}`);
  const useAsParentB = (id: string) =>
    navigate(`/cross-lab?b=${encodeURIComponent(id)}`);

  return (
    <div className="mx-auto flex h-full w-full max-w-[1208px] flex-col gap-5 p-6">
      {/* Content row: graph (800) + detail (340) */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 lg:grid-cols-[800px_340px]">
        {/* Graph panel */}
        <section className="min-h-0" aria-label="Pedigree graph">
          <PedigreeGraph data={data} />
        </section>

        {/* Detail panel */}
        <aside
          className="flex flex-col gap-4"
          aria-label="Selected line details"
        >
          <PedigreeDetailCard selectedNode={selectedNode} detail={data.detail} />
          <PedigreeActionsCard
            selectedNode={selectedNode}
            onOpenLineProfile={openLineProfile}
            onUseAsParentA={useAsParentA}
            onUseAsParentB={useAsParentB}
          />
        </aside>
      </div>

      {/* Toolbar callbacks surface (counts already reflected in the graph). */}
      <span className="sr-only">
        Ancestors: {ancestorCount}. Descendants: {descendantCount}.
      </span>
    </div>
  );
}
