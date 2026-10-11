import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  mockModelInsights,
  methodologyNotes,
} from "@/mocks/modelInsights";
import type {
  ModelInsightsData,
  TraitModelSelection,
  ValidationMetricRow,
} from "@/types/modelInsights";

/** Render a nullable metric value — `null` becomes an em-dash placeholder. */
function metric(v: number | null): string {
  return v === null ? "—" : String(v);
}

/* ── Model Overview ─────────────────────────────────────────────────────── */

const REVIEW_LABEL: Record<ModelInsightsData["scientificReview"], string> = {
  reviewed: "Reviewed",
  unreviewed: "Unreviewed",
};

const USAGE_LABEL: Record<ModelInsightsData["usage"], string> = {
  "research-only": "Research-only",
  production: "Production",
};

const TRAINING_LABEL: Record<ModelInsightsData["trainingStatus"], string> = {
  "in-progress": "In progress",
  completed: "Completed",
};

function ModelOverview({ data }: { data: ModelInsightsData }) {
  const fields: Array<{ label: string; value: string }> = [
    { label: "Model bundle", value: data.modelBundle },
    { label: "Scientific review", value: REVIEW_LABEL[data.scientificReview] },
    { label: "Usage", value: USAGE_LABEL[data.usage] },
    { label: "Training", value: TRAINING_LABEL[data.trainingStatus] },
    {
      label: "Predictive ranking",
      value: data.rankingEnabled ? "Enabled" : "Disabled",
    },
  ];

  return (
    <Card className="shadow-[var(--gf-card-shadow)]">
      <CardHeader className="px-4 pt-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Model Overview
        </h3>
      </CardHeader>
      <CardContent className="px-0 pb-4">
        <div className="grid grid-cols-5">
          {fields.map((f, i) => (
            <div
              key={f.label}
              className={
                "px-4 py-2.5" +
                (i < fields.length - 1 ? " border-r border-border" : "")
              }
            >
              <p className="text-[11px] text-muted-foreground">{f.label}</p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {f.value}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Trait Model Summary ────────────────────────────────────────────────── */

function TraitModelTable({ rows }: { rows: TraitModelSelection[] }) {
  return (
    <Card className="shadow-[var(--gf-card-shadow)]">
      <CardHeader className="px-4 pt-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Trait Model Summary
        </h3>
      </CardHeader>
      <CardContent className="px-0 pb-2">
        <Table>
          <TableHeader>
            <TableRow className="border-b hover:bg-transparent">
              <TableHead className="px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Trait
              </TableHead>
              <TableHead className="px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Selected model family
              </TableHead>
              <TableHead className="px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Hyperparameters
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.trait} className="h-[42px] hover:bg-transparent">
                <TableCell className="px-3 text-sm font-medium text-foreground">
                  {row.trait}
                </TableCell>
                <TableCell className="px-3 font-mono text-sm text-foreground">
                  {row.modelFamily}
                </TableCell>
                <TableCell className="px-3 font-mono text-sm text-muted-foreground">
                  {row.hyperparameters ?? "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/* ── Validation Results ─────────────────────────────────────────────────── */

function ValidationTable({
  rows,
  eligibleCrosses,
}: {
  rows: ValidationMetricRow[];
  eligibleCrosses: number | null;
}) {
  return (
    <Card className="shadow-[var(--gf-card-shadow)]">
      <CardHeader className="px-4 pt-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Validation Results
          </h3>
          <span className="rounded-full bg-amber-50 dark:bg-amber-950/30 px-3 py-1 text-xs font-medium text-amber-800 dark:text-amber-200 ring-1 ring-inset ring-amber-200/70">
            Placeholders · no verified metrics shown
          </span>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-2">
        <Table>
          <TableHeader>
            <TableRow className="border-b hover:bg-transparent">
              <TableHead className="px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Trait
              </TableHead>
              <TableHead className="px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Nested CV MAE
              </TableHead>
              <TableHead className="px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Parent-disjoint MAE
              </TableHead>
              <TableHead className="px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Spearman (nested CV)
              </TableHead>
              <TableHead className="px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Spearman (parent-disjoint)
              </TableHead>
              <TableHead className="px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Baseline MAE
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.trait} className="h-[42px] hover:bg-transparent">
                <TableCell className="px-3 text-sm font-medium text-foreground">
                  {row.trait}
                </TableCell>
                <TableCell className="px-3 font-mono text-sm text-muted-foreground">
                  {metric(row.nestedCvMae)}
                </TableCell>
                <TableCell className="px-3 font-mono text-sm text-muted-foreground">
                  {metric(row.parentDisjointMae)}
                </TableCell>
                <TableCell className="px-3 font-mono text-sm text-muted-foreground">
                  {metric(row.spearmanNested)}
                </TableCell>
                <TableCell className="px-3 font-mono text-sm text-muted-foreground">
                  {metric(row.spearmanParentDisjoint)}
                </TableCell>
                <TableCell className="px-3 font-mono text-sm text-muted-foreground">
                  {metric(row.baselineMae)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
          <span className="text-sm text-muted-foreground">
            Eligible historical crosses
          </span>
          <span className="text-sm text-muted-foreground">
            {metric(eligibleCrosses)} · placeholder
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Scientific Limitations ────────────────────────────────────────────── */

function LimitationsPanel({ items }: { items: string[] }) {
  return (
    <Card className="border-amber-500/30 bg-amber-50/40 dark:bg-amber-950/30 shadow-[var(--gf-card-shadow)]">
      <CardHeader className="px-4 pt-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-200">
          Scientific Limitations
        </h3>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span
                className="mt-[7px] size-1.5 shrink-0 rounded-full bg-amber-500/60"
                aria-hidden
              />
              <p className="text-sm leading-[19px] text-amber-900/90 dark:text-amber-200">{item}</p>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

/* ── Methodology notes ─────────────────────────────────────────────────── */

function MethodologyCards() {
  return (
    <div className="grid grid-cols-2 gap-3.5">
      {methodologyNotes.map((note) => (
        <Card key={note.title} className="shadow-[var(--gf-card-shadow)]">
          <CardHeader className="px-4 pt-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {note.title}
            </h3>
          </CardHeader>
          <CardContent className="px-4 pb-3.5">
            <p className="text-sm leading-[19px] text-muted-foreground">
              {note.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────────────────── */

export default function ModelInsights() {
  const data = mockModelInsights;

  return (
    <div className="mx-auto max-w-[1208px] p-6">
      <div className="grid gap-3.5 xl:grid-cols-[1fr_340px]">
        {/* Left column */}
        <div className="flex flex-col gap-3.5">
          <ModelOverview data={data} />
          <TraitModelTable rows={data.traitModels} />
          <ValidationTable
            rows={data.validationMetrics}
            eligibleCrosses={data.eligibleHistoricalCrosses}
          />
          <MethodologyCards />
        </div>

        {/* Right column */}
        <LimitationsPanel items={data.limitations} />
      </div>
    </div>
  );
}
