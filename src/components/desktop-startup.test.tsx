// @vitest-environment jsdom
import * as React from "react";
import { afterEach, expect, test, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  act,
  fireEvent,
} from "@testing-library/react";
const services = vi.hoisted(() => ({
  start: vi.fn(),
  restart: vi.fn(),
  reference: vi.fn(),
  workspace: vi.fn(),
}));
vi.mock("@/lib/tauri-runtime", () => ({ isTauriRuntime: () => true }));
vi.mock("@/services/inference-service", () => ({
  inference: { start: services.start, restart: services.restart },
}));
vi.mock("@/services/reference-service", () => ({
  referenceService: { getDatasetSummary: services.reference },
}));
vi.mock("@/services", () => ({ candidateStore: { list: services.workspace } }));
vi.mock("@/components/language-provider", () => ({
  useTranslation: () => ({ t: (s: string) => s }),
}));
import { DesktopStartup } from "./desktop-startup";
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

test("shows startup progress and reveals real content automatically even in StrictMode", async () => {
  let resolveAnalysis!: (value: unknown) => void;
  const analysis = new Promise((resolve) => {
    resolveAnalysis = resolve;
  });
  services.start.mockReturnValue(analysis);
  services.reference.mockResolvedValue({ line_count: 20628 });
  services.workspace.mockResolvedValue([]);
  render(
    <React.StrictMode>
      <DesktopStartup>
        <p>Real overview</p>
      </DesktopStartup>
    </React.StrictMode>,
  );
  expect(screen.getByText("Getting GeneField ready")).toBeDefined();
  expect(screen.queryByText("Real overview")).toBeNull();
  await act(async () => {
    resolveAnalysis({ bundle_version: "final-v1" });
  });
  expect(screen.getByText("Real overview")).toBeDefined();
  expect(screen.queryByRole("alert")).toBeNull();
  expect(services.restart).not.toHaveBeenCalled();
});

test("a real startup failure stays actionable and retry reveals the page after recovery", async () => {
  services.start.mockRejectedValue(new Error("Unavailable"));
  services.reference.mockResolvedValue({ line_count: 20628 });
  services.workspace.mockResolvedValue([]);
  services.restart.mockResolvedValue({ bundle_version: "final-v1" });
  render(
    <DesktopStartup>
      <p>Real overview</p>
    </DesktopStartup>,
  );
  expect(await screen.findByRole("alert")).toBeDefined();
  expect(screen.queryByText("Real overview")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByText("Real overview")).toBeDefined();
  expect(services.restart).toHaveBeenCalledOnce();
});
