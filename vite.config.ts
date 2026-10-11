import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import process from "node:process";
const host = process.env.TAURI_DEV_HOST;

import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import fs from "node:fs";

// https://vite.dev/config/
export default defineConfig(() => ({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "genefield-distribution-inventory",
      apply: "build",
      generateBundle() {
        const packages = new Map<
          string,
          { name: string; version: string; license: unknown }
        >();
        for (const id of this.getModuleIds()) {
          const normalized = id.replaceAll("\\", "/").split("?")[0];
          const matches = [
            ...normalized.matchAll(/node_modules\/((?:@[^/]+\/)?[^/]+)/g),
          ];
          const match = matches.at(-1);
          if (!match || match.index === undefined) continue;
          const root = normalized.slice(0, match.index + match[0].length);
          const manifest = path.join(root, "package.json");
          if (!fs.existsSync(manifest)) continue;
          const info = JSON.parse(fs.readFileSync(manifest, "utf8"));
          packages.set(info.name, {
            name: info.name,
            version: info.version,
            license: info.license,
          });
        }
        const font = JSON.parse(
          fs.readFileSync(
            "node_modules/@fontsource-variable/geist/package.json",
            "utf8",
          ),
        );
        packages.set(font.name, {
          name: font.name,
          version: font.version,
          license: font.license,
        });
        const styles = JSON.parse(
          fs.readFileSync("node_modules/shadcn/package.json", "utf8"),
        );
        packages.set(styles.name, {
          name: styles.name,
          version: styles.version,
          license: styles.license,
        });
        fs.mkdirSync("docs/evidence/release", { recursive: true });
        fs.writeFileSync(
          "docs/evidence/release/frontend-package-inventory.json",
          JSON.stringify(
            [...packages.values()].sort((a, b) => a.name.localeCompare(b.name)),
            null,
            2,
          ) + "\n",
        );
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host: "127.0.0.1",
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
