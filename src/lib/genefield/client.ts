// Integration example for Tauri 2 + @tauri-apps/plugin-shell; protocol is unchanged.
import { Command, type Child } from "@tauri-apps/plugin-shell";

export type Trait = "GY" | "DTF" | "NO" | "LB";
export type Pair = [string, string];
export type Objectives = {
  GY?: "maximize";
  DTF?: "minimize" | "maximize";
  NO?: "minimize";
  LB?: "minimize";
};
export type Prediction = {
  value: number;
  units: string;
  model_version: string;
  parents_seen_in_training: [boolean, boolean];
  parent_training_pair_counts: [number, number];
};
export type PredictionResult = {
  bundle_version: "final-v1";
  parent_ids: Pair;
  target: string;
  is_historical_pair: boolean;
  predictions: Partial<Record<Trait, Prediction>>;
};
export type RankingResult = {
  bundle_version: "final-v1";
  objectives: Objectives;
  weights: Partial<Record<Trait, number>>;
  score_interpretation: string;
  normalization: Partial<
    Record<
      Trait,
      { minimum: number; maximum: number; constant_utility: number }
    >
  >;
  eligible_candidate_count: number;
  exclusions: {
    self_cross_rows: number;
    reverse_or_duplicate_rows: number;
    historical_unique_pairs: number;
  };
  candidates: {
    parent_ids: Pair;
    application_prioritization_score: number;
    predictions: Partial<Record<Trait, { value: number; units: string }>>;
  }[];
};
export type Metadata = {
  bundle_version: "final-v1";
  artifact_version: "2.0.0";
  source_dataset: string;
  target_interpretation: string;
  intended_use: string;
  review_status: string;
  genotyped_parent_count: number;
  input_markers: number;
  historical_pair_registry: { pair_count: number; definition: string };
  traits: Record<
    Trait,
    {
      training_parent_ids: string[];
      units: string;
      ranking_directions: string[];
      prediction_enabled: boolean;
      ranking_enabled: boolean;
      training_pair_count: number;
      training_parent_count: number;
      model_configuration: { family: string; [key: string]: unknown };
      known_limitations: string[];
    }
  >;
};
type Payload =
  | { operation: "metadata" }
  | {
      operation: "predict";
      parent_a: string;
      parent_b: string;
      traits?: Trait[];
    }
  | { operation: "historical_pair"; parent_a: string; parent_b: string }
  | {
      operation: "rank";
      candidates: Pair[];
      objectives: Objectives;
      weights?: Partial<Record<Trait, number>>;
      limit?: number;
    };
type Response = { protocol_version: "1.0.0"; request_id: string | null } & (
  | { ok: true; result: unknown }
  | { ok: false; error: { code: string; message: string } }
);

export class GeneFieldError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export class GeneFieldSidecar {
  private child?: Child;
  private startup?: Promise<Metadata>;
  private metadata?: Metadata;
  private attempted = false;
  private generation = 0;
  private sequence = 0;
  private pending = new Map<
    string,
    {
      resolve: (value: unknown) => void;
      reject: (reason: unknown) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();

  private failAll(error: Error) {
    this.metadata = undefined;
    for (const p of this.pending.values()) {
      clearTimeout(p.timer);
      p.reject(error);
    }
    this.pending.clear();
  }

  start(): Promise<Metadata> {
    if (this.startup) return this.startup;
    if (this.child && this.metadata) return Promise.resolve(this.metadata);
    if (this.attempted)
      return Promise.reject(
        new GeneFieldError("PROCESS_UNAVAILABLE", "Explicit restart required"),
      );
    this.attempted = true;
    this.startup = this.spawn().finally(() => {
      this.startup = undefined;
    });
    return this.startup;
  }

  private async spawn(): Promise<Metadata> {
    const generation = ++this.generation;
    const command = Command.sidecar("binaries/genefield-final-v1");
    // Tauri shell's UTF8 stdout data events are complete lines, without newline.
    command.stdout.on("data", (line) => {
      if (generation !== this.generation) return;
      let response: Response;
      try {
        response = JSON.parse(line) as Response;
      } catch {
        this.failAll(new GeneFieldError("IPC_INVALID", "Invalid sidecar JSON"));
        return;
      }
      if (
        !response ||
        response.protocol_version !== "1.0.0" ||
        typeof response.ok !== "boolean" ||
        (response.request_id !== null &&
          typeof response.request_id !== "string") ||
        (!response.ok &&
          (!response.error ||
            typeof response.error.code !== "string" ||
            typeof response.error.message !== "string"))
      ) {
        this.failAll(
          new GeneFieldError("IPC_INVALID", "Unsupported response version"),
        );
        return;
      }
      if (response.request_id === null && !response.ok) {
        this.failAll(
          new GeneFieldError(response.error.code, response.error.message),
        );
        return;
      }
      const pending = response.request_id
        ? this.pending.get(response.request_id)
        : undefined;
      if (!pending) return; // A response arriving after its caller's timeout.
      clearTimeout(pending.timer);
      this.pending.delete(response.request_id!);
      if (response.ok) pending.resolve(response.result);
      else
        pending.reject(
          new GeneFieldError(response.error.code, response.error.message),
        );
    });
    command.stderr.on("data", (line) =>
      console.warn("GeneField sidecar:", line),
    );
    command.on("error", (error) => {
      if (generation === this.generation)
        this.failAll(new GeneFieldError("PROCESS_ERROR", String(error)));
    });
    command.on("close", (data) => {
      if (generation !== this.generation) return;
      this.child = undefined;
      this.metadata = undefined;
      this.failAll(
        new GeneFieldError("PROCESS_CLOSED", `Sidecar closed (${data.code})`),
      );
    });
    const child = await command.spawn();
    if (generation !== this.generation) {
      await child.kill();
      throw new GeneFieldError("PROCESS_CLOSED", "Startup interrupted");
    }
    this.child = child;
    try {
      const metadata = await this.health();
      validateMetadata(metadata);
      this.metadata = metadata;
      return metadata;
    } catch (error) {
      await this.stop();
      throw error;
    }
  }

  private async request<T>(payload: Payload, timeoutMs = 30_000): Promise<T> {
    const child = this.child;
    if (!child)
      throw new GeneFieldError(
        "PROCESS_NOT_STARTED",
        "Start the sidecar first",
      );
    const request_id = `genefield-${++this.sequence}`;
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(request_id);
        reject(
          new GeneFieldError(
            "IPC_TIMEOUT",
            "Sidecar response timeout; inspect process before retry",
          ),
        );
      }, timeoutMs);
      this.pending.set(request_id, {
        resolve: (value) => resolve(value as T),
        reject,
        timer,
      });
      void child
        .write(
          JSON.stringify({
            protocol_version: "1.0.0",
            request_id,
            ...payload,
          }) + "\n",
        )
        .catch((error) => {
          const pending = this.pending.get(request_id);
          if (pending) {
            clearTimeout(pending.timer);
            this.pending.delete(request_id);
            pending.reject(error);
          }
        });
    });
  }

  async health(): Promise<Metadata> {
    const result = await this.request<Metadata>(
      { operation: "metadata" },
      45_000,
    );
    validateMetadata(result);
    return result;
  }
  async predict(
    parent_a: string,
    parent_b: string,
    traits?: Trait[],
  ): Promise<PredictionResult> {
    const result = await this.request<PredictionResult>(
      {
        operation: "predict",
        parent_a,
        parent_b,
        ...(traits ? { traits } : {}),
      },
      10_000,
    );
    if (
      result.bundle_version !== "final-v1" ||
      !Array.isArray(result.parent_ids) ||
      (traits ?? ["GY", "DTF", "NO", "LB"]).some(
        (t) => !Number.isFinite(result.predictions[t as Trait]?.value),
      )
    )
      throw new GeneFieldError("IPC_INVALID", "Invalid prediction response");
    return result;
  }
  historical(
    parent_a: string,
    parent_b: string,
  ): Promise<{
    bundle_version: "final-v1";
    parent_ids: Pair;
    is_historical_pair: boolean;
  }> {
    return this.request(
      { operation: "historical_pair", parent_a, parent_b },
      5_000,
    );
  }
  rank(
    candidates: Pair[],
    objectives: Objectives,
    weights?: Partial<Record<Trait, number>>,
    limit = 20,
  ): Promise<RankingResult> {
    return this.request({
      operation: "rank",
      candidates,
      objectives,
      ...(weights ? { weights } : {}),
      limit,
    });
  }
  async restart(): Promise<Metadata> {
    await this.stop();
    await this.startup?.catch(() => {});
    this.attempted = false;
    return this.start();
  }
  async stop(): Promise<void> {
    ++this.generation;
    this.metadata = undefined;
    const child = this.child;
    this.child = undefined;
    this.failAll(new GeneFieldError("PROCESS_CLOSED", "Sidecar stopped"));
    if (child) await child.kill();
  }
}

export function validateMetadata(metadata: Metadata): void {
  const directions = {
    GY: ["maximize"],
    DTF: ["minimize", "maximize"],
    NO: ["minimize"],
    LB: ["minimize"],
  };
  const units = {
    GY: "kg/ha",
    DTF: "days",
    NO: "modified SES IRRI rating points",
    LB: "SES IRRI rating points",
  };
  if (
    metadata.bundle_version !== "final-v1" ||
    metadata.artifact_version !== "2.0.0"
  )
    throw new GeneFieldError("BUNDLE_INCOMPATIBLE", "Unsupported metadata");
  for (const trait of ["GY", "DTF", "NO", "LB"] as Trait[]) {
    const info = metadata.traits?.[trait];
    if (
      !info?.prediction_enabled ||
      !info.ranking_enabled ||
      info.units !== units[trait] ||
      directions[trait].some((d) => !info.ranking_directions.includes(d))
    )
      throw new GeneFieldError(
        "BUNDLE_INCOMPATIBLE",
        `Invalid ${trait} capabilities`,
      );
  }
}

// Copy into an async event handler after installing/configuring the shell plugin.
export async function examples() {
  const sidecar = new GeneFieldSidecar();
  try {
    const metadata = await sidecar.start(); // Load/health check is metadata, no invented health operation.
    const common = metadata.traits.LB.training_parent_ids.filter((id) =>
      (["GY", "DTF", "NO"] as Trait[]).every((trait) =>
        metadata.traits[trait].training_parent_ids.includes(id),
      ),
    );
    const [a, b] = common;
    if (!a || !b) throw new Error("Two eligible parents required");
    const prediction = await sidecar.predict(a, b);
    const history = await sidecar.historical(a, b);
    const pairs: Pair[] = common.flatMap((parent, i) =>
      common.slice(i + 1).map((other) => [parent, other] as Pair),
    );
    const early = await sidecar.rank(pairs, { DTF: "minimize" });
    const late = await sidecar.rank(pairs, { DTF: "maximize" });
    const weighted = await sidecar.rank(
      pairs,
      { GY: "maximize", DTF: "minimize", NO: "minimize", LB: "minimize" },
      { GY: 2, DTF: 1, NO: 1, LB: 1 },
    );
    return { prediction, history, early, late, weighted };
  } catch (error) {
    if (error instanceof GeneFieldError)
      console.error(error.code, error.message);
    throw error;
  } finally {
    await sidecar.stop();
  }
}
