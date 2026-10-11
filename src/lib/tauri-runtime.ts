import { isTauri } from "@tauri-apps/api/core";
/**
 * Runtime detection for Tauri v2. When the app runs inside the desktop shell,
 * Tauri injects `__TAURI_INTERNALS__`. The optional global `__TAURI__`
 * requires withGlobalTauri and is not a reliable runtime detector.
 *
 * We read through `window` at call time (not at module import) so the check
 * also works under SSR-free Vite dev without triggering a global at load.
 */
declare global {
  interface Window {
    __TAURI__?: { invoke: (...args: unknown[]) => Promise<unknown> };
  }
}

/** True only when running inside the Tauri desktop shell. */
export function isTauriRuntime(): boolean {
  return isTauri();
}

export type TauriInvokeFn = <T>(
  cmd: string,
  args?: Record<string, unknown>,
) => Promise<T>;

/**
 * Dynamically import @tauri-apps/api only in the Tauri runtime, so the pure
 * browser build never references Tauri-only APIs. Returns a bound `invoke`
 * or null when not in Tauri.
 */
export async function tauriInvoke(): Promise<TauriInvokeFn | null> {
  if (!isTauriRuntime()) return null;
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke as unknown as TauriInvokeFn;
  } catch {
    return null;
  }
}
