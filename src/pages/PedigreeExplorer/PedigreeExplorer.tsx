import { useTranslation } from "@/components/language-provider";
import { useNavigate, useSearchParams } from "react-router-dom";
import { referenceService } from "@/services/reference-service";
import { useAsync } from "@/lib/use-async";
import PedigreeGraph from "./PedigreeGraph";
import { PedigreeDetailCard } from "./PedigreeDetailCard";
import { PedigreeActionsCard } from "./PedigreeActionsCard";

export default function PedigreeExplorer() {
  const { t: tr } = useTranslation();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const id = params.get("line") ?? params.get("select") ?? "GID_1233";
  const { data, error } = useAsync(
    () => referenceService.getPedigreeNeighborhood(id),
    [id],
  );
  if (!data)
    return (
      <p className="p-6" role={error ? "alert" : "status"}>
        {tr(error ?? "Loading local pedigree…")}
      </p>
    );
  const selectedNode =
    data.nodes.find((n) => n.id === data.selectedId) ?? data.nodes[0];

  const ancestorCount = data.nodes.filter(
    (n) => n.column === "ancestor",
  ).length;
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
        <section className="min-h-0" aria-label={tr("Pedigree graph")}>
          <PedigreeGraph data={data} onSelect={(line) => setParams({ line })} />
        </section>

        {/* Detail panel */}
        <aside
          className="flex flex-col gap-4"
          aria-label={tr("Selected line details")}
        >
          <PedigreeDetailCard
            selectedNode={selectedNode}
            detail={data.detail}
          />
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
        {tr("Ancestors:")} {ancestorCount}
        {tr(". Descendants:")} {descendantCount}.
      </span>
    </div>
  );
}
