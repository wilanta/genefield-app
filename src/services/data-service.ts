import type {
  RiceLine,
  LineQuery,
  PaginatedResult,
  CrossAnalysis,
} from "@/types/research";

export interface DataService {
  getLines(query: LineQuery): Promise<PaginatedResult<RiceLine>>;

  getLineById(id: string): Promise<RiceLine | null>;

  analyzeCross(parentA: string, parentB: string): Promise<CrossAnalysis>;
}
