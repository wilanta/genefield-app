import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface StatCard {
  label: string;
  value: string;
  hint?: string;
}

const STATS: StatCard[] = [
  { label: "Recorded lines", value: "20,628", hint: "Current project dataset" },
  { label: "Phenotype observations", value: "91,636" },
  { label: "Genotyped lines", value: "965" },
  { label: "SNP markers", value: "61,260" },
];

const CATEGORIES = ["Pedigree", "SNP genotypes", "Phenotypes: GY · DTF · NO · LB"];

const COVERAGE = [
  { label: "Genotype coverage", value: "965 of 20,628 lines", note: "4.7%" },
  { label: "Phenotype coverage", value: "Per-line coverage not computed", note: "placeholder" },
  { label: "Pedigree availability", value: "Not computed", note: "placeholder" },
];

function StatTile({ stat }: { stat: StatCard }) {
  return (
    <Card className="shadow-[var(--gf-card-shadow)]">
      <CardHeader>
        <CardDescription>{stat.label}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums text-foreground">
          {stat.value}
        </CardTitle>
      </CardHeader>
      {stat.hint ? (
        <CardContent>
          <p className="text-sm text-muted-foreground">{stat.hint}</p>
        </CardContent>
      ) : null}
    </Card>
  );
}

export default function Overview() {
  return (
    <div className="mx-auto max-w-[1208px] space-y-6 p-6">
      {/* Stat cards */}
      <section aria-labelledby="overview-stats">
        <h2 id="overview-stats" className="mb-3 text-sm font-medium text-muted-foreground">
          Dataset Overview
        </h2>
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {STATS.map((stat) => (
            <StatTile key={stat.label} stat={stat} />
          ))}
        </div>
      </section>

      {/* Current project dataset */}
      <section aria-labelledby="overview-dataset" className="grid gap-4 lg:grid-cols-2">
        <Card className="bg-gf-panel-bg shadow-[var(--gf-card-shadow)]">
          <CardHeader>
            <CardTitle className="text-base">Current project dataset</CardTitle>
            <CardDescription>Dataset source</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Dataset source</p>
              <p className="text-sm font-medium text-foreground">INIA Uruguay</p>
            </div>
            <div>
              <p className="mb-1.5 text-sm text-muted-foreground">Data categories</p>
              <ul className="space-y-1">
                {CATEGORIES.map((cat) => (
                  <li key={cat} className="text-sm text-foreground">
                    {cat}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gf-panel-bg shadow-[var(--gf-card-shadow)]">
          <CardHeader>
            <CardTitle className="text-base">Coverage &amp; availability</CardTitle>
            <CardDescription>
              Placeholder values — not yet computed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {COVERAGE.map((row) => (
              <div key={row.label}>
                <p className="text-sm font-medium text-foreground">{row.label}</p>
                <p className="text-sm text-muted-foreground">
                  {row.value}
                  {row.note ? (
                    <span className="ml-2 inline-block rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {row.note}
                    </span>
                  ) : null}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* Research workspace note */}
      <Card className="shadow-[var(--gf-card-shadow)]">
        <CardHeader>
          <CardTitle className="text-base">Research Workspace</CardTitle>
          <CardDescription>
            12 placeholder values · 0 saved candidates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Analyze a cross in Cross Lab or generate pairs in Breed Designer,
            then choose Save Candidate. Everything is saved locally on this
            device.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
