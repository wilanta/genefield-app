import { useTranslation } from "@/components/language-provider";
import { useAsync } from "@/lib/use-async";
import { referenceService } from "@/services/reference-service";
import { inference } from "@/services/inference-service";
import { candidateStore } from "@/services";
import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowUpRight } from "lucide-react";
import OverviewLoading from "./OverviewLoading";

interface StatCard {
  label: string;
  value: string;
  hint?: string;
}

// Data categories
const tags = ["Pedigree", "SNP genotypes", "Phenotypes: GY · DTF · NO · LB"];

// Quick actions
const actions = [
  { label: "Explore Lines", href: "/lines", primary: false },
  { label: "Open Pedigree Explorer", href: "/pedigree", primary: false },
  { label: "Analyze Cross", href: "/cross-lab", primary: true },
  { label: "Open Breed Designer", href: "/breed-designer", primary: false },
];

function StatTile({ stat }: { stat: StatCard }) {
  const { t: tr } = useTranslation();
  return (
    <Card className="shadow-[var(--gf-card-shadow)]">
      <CardHeader>
        <CardDescription>{tr(stat.label)}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums text-foreground">
          {stat.value}
        </CardTitle>
      </CardHeader>
      {stat.hint ? (
        <CardContent>
          <p className="text-sm text-muted-foreground">{tr(stat.hint)}</p>
        </CardContent>
      ) : null}
    </Card>
  );
}

export default function Overview() {
  const { t: tr, locale } = useTranslation();
  const formatNumber = (n: number) => n.toLocaleString(locale);
  const getCoverage = (covered: number, total: number) => {
    const pct = total === 0 ? 0 : (covered / total) * 100;
    return {
      pct,
      label: tr("{covered} of {total} lines · {percent}%", {
        covered: formatNumber(covered),
        total: formatNumber(total),
        percent: pct.toLocaleString(locale, {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        }),
      }),
    };
  };
  const { data, error } = useAsync(async () => ({
    summary: await referenceService.getDatasetSummary(),
    metadata: await inference.start(),
    saved: await candidateStore.list(),
  }));
  if (!data) {
    if (error)
      return (
        <p className="p-6" role="alert">
          {tr(error)}
        </p>
      );
    return <OverviewLoading />;
  }
  const { summary, metadata, saved } = data;
  const STATS: StatCard[] = [
    { label: tr("Recorded lines"), value: formatNumber(summary.line_count) },
    {
      label: tr("Phenotype observations"),
      value: formatNumber(summary.phenotype_observation_count),
    },
    {
      label: tr("Genotyped lines"),
      value: formatNumber(summary.genotyped_line_count),
    },
    { label: tr("SNP markers"), value: formatNumber(metadata.input_markers) },
  ];
  const { pct, label } = getCoverage(
    summary.genotyped_line_count,
    summary.line_count,
  );
  const stats = [
    { value: saved.length, label: tr("Saved candidates") },
    {
      value: saved.filter((c) => c.reviewStatus === "draft").length,
      label: tr("Draft candidates"),
    },
    {
      value: saved.filter((c) => c.reviewStatus === "review").length,
      label: tr("Awaiting review"),
    },
  ];
  const activities = saved.slice(0, 4).map((c) => ({
    text: tr("Saved candidate · {name}", { name: c.name }),
    time: new Date(c.updatedAt).toLocaleDateString(locale),
  }));
  const systemStatus = [
    { label: tr("Offline"), value: tr("Local"), dot: true, mono: false },
    { label: tr("Model bundle"), value: metadata.bundle_version, mono: true },
    { label: tr("Scientific review"), value: tr("Sign-off pending") },
    {
      label: tr("Predictive ranking"),
      value: tr("Enabled for eligible parents"),
    },
  ];
  return (
    <div className="mx-auto max-w-[1208px] space-y-6 p-6">
      {/* Section 1 - Stat cards */}
      <section aria-labelledby="overview-stats">
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {STATS.map((stat) => (
            <StatTile key={stat.label} stat={stat} />
          ))}
        </div>
      </section>

      {/* Section 2 */}
      <section
        aria-labelledby="overview-dataset"
        className="grid gap-4 lg:grid-cols-3"
      >
        {/* Dataset Overview */}
        <Card className="col-span-2 bg-gf-panel-bg shadow-[var(--gf-card-shadow)]">
          <CardHeader className="flex flex-row items-start justify-between">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {tr("DATASET OVERVIEW")}
            </CardTitle>
          </CardHeader>
          <div className="mx-3 h-px bg-border"></div>
          <CardContent className="space-y-3">
            {/* Dataset Source */}
            <div className="flex w-full justify-between">
              <p className="text-sm text-muted-foreground">
                {tr("Dataset source")}
              </p>
              <p className="text-sm text-foreground font-normal">
                INIA Uruguay
              </p>
            </div>

            <div className=" h-px bg-border"></div>

            {/* Data Categories */}
            <div className="flex w-full items-center justify-between gap-4">
              <p className="shrink-0 text-sm text-muted-foreground">
                {tr("Data categories")}
              </p>
              <div className="flex flex-wrap justify-end gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="whitespace-nowrap rounded-full bg-muted px-4 py-1.5 text-xs text-muted-foreground font-medium dark:bg-stone-800 dark:text-stone-200"
                  >
                    {tr(tag)}
                  </span>
                ))}
              </div>
            </div>

            {/* Genotype Coverage */}
            <div className="w-full">
              <div className="mb-2 flex items-baseline justify-between">
                <p className="text-sm text-foreground">
                  {tr("Genotype coverage")}
                </p>
                <p className="text-sm text-muted-foreground">{tr(label)}</p>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted dark:bg-stone-800">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${pct}%`, minWidth: "6px" }}
                />
              </div>
            </div>

            {/* Phenotype coverage */}
            <div className="w-full">
              <div className="mb-2 flex items-baseline justify-between">
                <p className="text-sm text-foreground">
                  {tr("Phenotype coverage")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {
                    getCoverage(
                      summary.phenotyped_line_count,
                      summary.line_count,
                    ).label
                  }
                </p>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted dark:bg-stone-800">
                <div
                  className="h-full bg-primary"
                  style={{
                    width: `${getCoverage(summary.phenotyped_line_count, summary.line_count).pct}%`,
                  }}
                />
              </div>
            </div>

            {/* Pedigree availability */}
            <div className="w-full">
              <div className="mb-2 flex items-baseline justify-between">
                <p className="text-sm text-foreground">
                  {tr("Pedigree availability")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {
                    getCoverage(summary.pedigree_line_count, summary.line_count)
                      .label
                  }
                </p>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted dark:bg-stone-800">
                <div
                  className="h-full bg-primary"
                  style={{
                    width: `${getCoverage(summary.pedigree_line_count, summary.line_count).pct}%`,
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="bg-gf-panel-bg shadow-[var(--gf-card-shadow)]">
          <CardHeader className="flex flex-row items-start justify-between">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {tr("QUICK ACTIONS")}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2.5">
            {actions.map((action) => (
              <Link
                key={action.label}
                to={action.href}
                className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
                  action.primary
                    ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
                    : "border-border bg-card text-foreground hover:bg-muted"
                }`}
              >
                {tr(action.label)}
                <ArrowUpRight className="size-3.5" />
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* Section 3 */}
      <section
        aria-labelledby="overview-dataset"
        className="grid gap-4 lg:grid-cols-3"
      >
        {/* Research Workspace */}
        <Card className="col-span-2 bg-gf-panel-bg shadow-[var(--gf-card-shadow)]">
          <CardHeader className="flex flex-row items-start justify-between">
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {tr("Research Workspace")}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Stat boxes */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border bg-muted/40 px-4 py-4"
                >
                  <p className="text-2xl font-semibold text-foreground">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {tr(stat.label)}
                  </p>
                </div>
              ))}
            </div>

            {/* Recent local activity */}
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {tr("Recent local activity")}
              </p>
              <ul className="divide-y border-y">
                {activities.map((item) => (
                  <li
                    key={item.text}
                    className="flex items-center justify-between py-3 text-sm"
                  >
                    <span className="text-muted-foreground">{item.text}</span>
                    <span className="font-medium text-foreground">
                      {item.time}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* System Status */}
        <Card className="self-start bg-gf-panel-bg shadow-[var(--gf-card-shadow)]">
          <CardHeader>
            <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {tr("System Status")}
            </CardTitle>
          </CardHeader>

          <CardContent>
            <ul className="divide-y border-y">
              {systemStatus.map((item) => (
                <li
                  key={item.label}
                  className="flex items-center justify-between py-3 text-sm"
                >
                  <span className="text-muted-foreground">
                    {tr(item.label)}
                  </span>
                  <span
                    className={`flex items-center gap-2 font-medium text-foreground ${
                      item.mono ? "font-mono" : ""
                    }`}
                  >
                    {item.dot && (
                      <span className="size-2 rounded-full bg-primary" />
                    )}
                    {tr(item.value)}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
