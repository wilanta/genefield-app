// Complete onedir resources must be siblings of the development executable.
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
const source = resolve("src-tauri/binaries/_internal");
if (!existsSync(source))
  throw new Error("Copy the complete frozen GeneField runtime first.");
const targetRoot = process.env.CARGO_TARGET_DIR || "src-tauri/target";
for (const profile of ["debug"]) {
  const destination = resolve(targetRoot, profile, "_internal");
  mkdirSync(destination, { recursive: true });
  cpSync(source, destination, { recursive: true, force: true });
  if (existsSync("src-tauri/resources/data"))
    cpSync("src-tauri/resources/data", resolve(targetRoot, profile, "data"), {
      recursive: true,
      force: true,
    });
}
