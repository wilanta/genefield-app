import { useTranslation } from "@/components/language-provider";
import { useCallback, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  type NodeTypes,
  Handle,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { cn } from "@/lib/utils";
import type { PedigreeGraphData, PedigreeNode } from "@/types/research";
import { PedigreeLegend } from "./PedigreeLegend";
import { PedigreeToolbar } from "./PedigreeToolbar";

/** Column → x position (px) for the four-generation pedigree layout. */
const COLUMN_X: Record<PedigreeNode["column"], number> = {
  ancestor: 0,
  parent: 204,
  selected: 408,
  descendant: 612,
};

const ROW_Y = 150;
const ROW_GAP = 120;

/** Per-kind node styling matching the verified Figma colors. */
const KIND_STYLE: Record<
  PedigreeNode["kind"],
  { bg: string; border: string; text: string }
> = {
  normal: {
    bg: "var(--card)",
    border: "var(--gf-graph-border)",
    text: "var(--foreground)",
  },
  selected: {
    bg: "var(--accent)",
    border: "var(--primary)",
    text: "var(--accent-foreground)",
  },
  missing: {
    bg: "var(--gf-graph-missing-bg)",
    border: "var(--gf-graph-missing-border)",
    text: "var(--muted-foreground)",
  },
};

function GidNode({ data, selected }: NodeProps) {
  const { t: tr } = useTranslation();
  const node = data.node as PedigreeNode;
  const s = KIND_STYLE[node.kind];
  return (
    <div
      className={cn(
        "flex w-[128px] items-center gap-2 rounded-lg border px-3 py-2 text-sm shadow-sm",
        selected && "ring-2 ring-primary ring-offset-1",
      )}
      style={{ background: s.bg, borderColor: s.border, color: s.text }}
    >
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      <span className="flex-1 truncate font-mono text-xs font-medium">
        {node.label}
      </span>
      {node.hasGenotype ? (
        <span
          className="size-[7px] shrink-0 rounded-full bg-primary"
          aria-label={tr("Genotype available")}
          title={tr("Genotype available")}
        />
      ) : (
        <span
          className="size-[7px] shrink-0 rounded-full border border-foreground/40 bg-transparent"
          aria-label={tr("No genotype")}
          title={tr("No genotype")}
        />
      )}
    </div>
  );
}

const nodeTypes: NodeTypes = { gid: GidNode };

function PedigreeGraphInner({
  data,
  onSelect,
}: {
  data: PedigreeGraphData;
  onSelect?: (id: string) => void;
}) {
  const { t: tr } = useTranslation();
  const { resolvedTheme } = useTheme();
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const [resetSignal, setResetSignal] = useState(0);

  const nodes: Node[] = useMemo(() => {
    const rows: Record<string, number> = {
      ancestor: 0,
      parent: 0,
      selected: 0,
      descendant: 0,
    };
    return data.nodes.map((n) => {
      const row = rows[n.column]++;
      const y = ROW_Y + row * ROW_GAP;
      return {
        id: n.id,
        type: "gid",
        position: { x: COLUMN_X[n.column], y },
        data: { node: n },
        selected: n.id === data.selectedId,
      } satisfies Node;
    });
  }, [data]);

  const edges: Edge[] = useMemo(
    () =>
      data.edges.map((e, i) => ({
        id: `e-${i}`,
        source: e.source,
        target: e.target,
        type: "smoothstep",
        style: { stroke: "var(--gf-graph-border)", strokeWidth: 1.5 },
      })),
    [data],
  );

  const ancestors = data.nodes.filter((n) => n.column === "ancestor").length;
  const descendants = data.nodes.filter(
    (n) => n.column === "descendant",
  ).length;

  const handleReset = useCallback(() => {
    // Re-mount the flow (via key) to re-seed layout, then fit to view.
    setResetSignal((s) => s + 1);
    fitView({ padding: 0.12, duration: 200 });
  }, [fitView]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3.5">
      {/* Toolbar (Figma 1:2909, 800 × 34) */}
      <PedigreeToolbar
        ancestors={ancestors}
        descendants={descendants}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onFit={() => fitView({ padding: 0.12 })}
        onReset={handleReset}
        onSearch={onSelect}
      />

      {/* Graph canvas (Figma 1:2941 background + 1:2944 graph area) */}
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-gf-panel-bg">
        <ReactFlow
          colorMode={resolvedTheme === "dark" ? "dark" : "light"}
          style={{ background: "var(--gf-panel-bg)" }}
          key={resetSignal}
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.12 }}
          nodesConnectable={false}
          nodesDraggable={false}
          elementsSelectable
          onNodeClick={(_, node) => onSelect?.(node.id)}
          proOptions={{ hideAttribution: true }}
          defaultEdgeOptions={{ type: "smoothstep" }}
        >
          <Background color="var(--border)" gap={[20, 20]} size={1} />
        </ReactFlow>
        {/* Generation column labels overlaid, not inside the panning viewport. */}
        <div className="pointer-events-none absolute inset-x-0 top-2 flex">
          {(["ancestor", "parent", "selected", "descendant"] as const).map(
            (col) => (
              <div
                key={col}
                className="flex-1 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
              >
                {tr(COLUMN_LABELS[col])}
              </div>
            ),
          )}
        </div>
      </div>

      {/* Legend footer (Figma 1:2997, 798 × 54) */}
      <PedigreeLegend />
    </div>
  );
}

const COLUMN_LABELS: Record<PedigreeNode["column"], string> = {
  ancestor: "ANCESTORS · −2",
  parent: "PARENTS · −1",
  selected: "SELECTED",
  descendant: "DESCENDANTS · +1",
};

/** Public wrapper that provides the React Flow context. */
export default function PedigreeGraph({
  data,
  onSelect,
}: {
  data: PedigreeGraphData;
  onSelect?: (id: string) => void;
}) {
  return (
    <ReactFlowProvider>
      <PedigreeGraphInner data={data} onSelect={onSelect} />
    </ReactFlowProvider>
  );
}
