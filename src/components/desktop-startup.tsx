import { useEffect, useState, type ReactNode } from "react";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import { useTranslation } from "@/components/language-provider";
import { Button } from "@/components/ui/button";
import { isTauriRuntime } from "@/lib/tauri-runtime";
import { analysisError } from "@/lib/genefield/errors";
import { inference } from "@/services/inference-service";
import { referenceService } from "@/services/reference-service";
import { candidateStore } from "@/services";

type Step = "data" | "analysis" | "workspace";
const labels: Record<Step, string> = {
  data: "Loading rice breeding data",
  analysis: "Preparing local analysis",
  workspace: "Opening your workspace",
};

/** Prepare shared local services before mounting pages that depend on them. */
export function DesktopStartup({ children }: { children: ReactNode }) {
  const { t: tr } = useTranslation();
  const desktop = isTauriRuntime();
  const [ready, setReady] = useState(!desktop);
  const [completed, setCompleted] = useState<Step[]>([]);
  const [error, setError] = useState<string>();
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!desktop) return;
    let live = true;
    setError(undefined);
    setCompleted([]);
    const track = async (step: Step, task: Promise<unknown>) => {
      await task;
      if (live) setCompleted((steps) => [...steps, step]);
    };
    // Run independent reads together, and share the same analysis startup
    // promise even under StrictMode. A retry never duplicates a ready process.
    void (async () => {
      const analysis = async () => {
        try {
          return await inference.start();
        } catch (e) {
          if (!live || attempt === 0) throw e;
          return inference.restart();
        }
      };
      const results = await Promise.allSettled([
        track("data", referenceService.getDatasetSummary()),
        track("analysis", analysis()),
        track("workspace", candidateStore.list()),
      ]);
      if (!live) return;
      const failed = results.find((r) => r.status === "rejected");
      if (failed?.status === "rejected") {
        console.error("GeneField desktop startup", failed.reason);
        setError(analysisError(failed.reason));
      } else setReady(true);
    })();
    return () => {
      live = false;
    };
  }, [desktop, attempt]);

  if (ready) return children;
  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-[var(--gf-card-shadow)]">
        <h2 className="text-lg font-semibold">
          {tr("Getting GeneField ready")}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {tr(
            "Your data and analysis are loading locally. The first launch may take a little longer.",
          )}
        </p>
        <div className="mt-6 space-y-4" role="status" aria-live="polite">
          {(Object.keys(labels) as Step[]).map((step) => {
            const done = completed.includes(step);
            return (
              <div key={step} className="flex items-center gap-3 text-sm">
                {done ? (
                  <CheckCircle2 className="size-4 text-primary" aria-hidden />
                ) : (
                  <LoaderCircle
                    className={`size-4 text-muted-foreground ${error ? "" : "animate-spin"}`}
                    aria-hidden
                  />
                )}
                <span>{tr(labels[step])}</span>
                {done && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {tr("Ready")}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        {error && (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-destructive" role="alert">
              {tr(error)}
            </p>
            <Button variant="outline" onClick={() => setAttempt((n) => n + 1)}>
              {tr("Try again")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
