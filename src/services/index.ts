import type { DataService } from "./data-service";
import { mockDataService } from "./adapters/mock-data-service";

export const dataService: DataService = mockDataService;
