/**
 * Runtime detection for Tauri v2. When the app runs inside the desktop shell,
 * Tauri injects the `window.__TAURI__` bridge (and `__TAURI_INTERNALS__`).
 * A plain browser (vite preview) has neither, so `__TAURI__` is undefined.
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
  return typeof window !== "undefined" && window.__TAURI__ != null;
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
