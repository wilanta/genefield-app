import type { DataService } from "../data-service";
import type { RiceLine } from "@/types/research";
import { mockLines } from "@/mocks/lines";

export const mockDataService: DataService = {
  async getLines(query) {
    const search = query.search?.toLowerCase() ?? "";

    const filtered = mockLines.filter((line) =>
      `${line.id} ${line.name}`.toLowerCase().includes(search),
    );

    const start = (query.page - 1) * query.pageSize;

    return {
      items: filtered.slice(start, start + query.pageSize),
      total: filtered.length,
      page: query.page,
      pageSize: query.pageSize,
    };
  },

  async getLineById(id): Promise<RiceLine | null> {
    return mockLines.find((line) => line.id === id) ?? null;
  },

  async analyzeCross() {
    throw new Error("ML inference is not connected yet.");
  },
};
