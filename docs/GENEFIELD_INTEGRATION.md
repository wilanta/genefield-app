# GeneField final-v1 desktop integration

The Windows x64 development integration uses the existing UI, real reference data, and the frozen final-v1 sidecar. Models are not retrained. Results are historical-descendant cross-level modeled estimates for represented INIA germplasm; scientific/breeder approval remains subject to the manifest status. Full A–AT report: [GENEFIELD_INTEGRATION_REPORT.md](GENEFIELD_INTEGRATION_REPORT.md).

## Data responsibilities

| Source | Responsibility | Runtime location |
| --- | --- | --- |
| final-v1 sidecar | Predictions, ranking, historical_pair, metadata | EXE alongside `_internal/` |
| Reference SQLite | Line browsing, historical profiles, pedigree, source statistics | `data/genefield-reference.sqlite`, opened read-only by Rust |
| Workspace SQLite | Saved candidates, prediction snapshots, objectives, weights, application scores, notes | Application configuration directory, `genefield.db` |

Reference SQL is confined to `src-tauri/src/reference.rs`; React components use `referenceService`. A small browsing snapshot is loaded once and cached. Workspace SQL continues to use the existing `CandidateStore` adapter. Migration v3 adds `analysis_json` without deleting user data. Browser mode uses labeled session storage, but reference/ML services report a clear failure outside Tauri. There is no mock fallback or production mock mode. The legacy seeding helper is used only in tests; new workspaces start empty.

## Reference sources and build

| ML file | Transformation | Tables |
| --- | --- | --- |
| `data/processed/line_phenotypes.parquet` | GY/DTF/NO/LB means per LINE_ID; nulls remain null | `line_trait_summary` |
| `data/processed/genotype_ids.csv` | ID membership without the SNP matrix | `lines.has_genotype` |
| `data/raw/Lines.txt` | Token parser follows prepare_data.py; IDs and metadata are preserved | `lines`, `pedigree` |
| `data/raw/Phenotypes.txt` | LINE_ID and four trait columns; count observations and reproduce processed means | `lines.observation_count`, `line_trait_summary.observation_count`, `dataset_summary` |

Processed pair summaries/registries do not store child-parent edges or observation counts per line, so Lines.txt and selected phenotype columns are required. Raw tables are not copied to the frontend. No trial/location UI is needed, so no additional tables are created. Raw SNPs, genomic matrices, experiments, and OOF data are not copied. Evidence/model cards already present in the frozen bundle remain included without changes.

The builder uses pandas/pyarrow only at build time. SQLite does not require Python at runtime. Use the existing ML virtual environment without running prepare_data.py or training:

```powershell
$mlRoot = 'C:\Users\sheil\OneDrive\Dokumen\Wildhan\projects\genefield-ml'
& "$mlRoot\.venv\Scripts\python.exe" -B scripts/build-reference.py --ml-root $mlRoot
python -B scripts/test-reference.py
```

If reference data changes, run the builder and tests, then check provenance/hashes and row counts. Reference data changes do not authorize changes to the final-v1 bundle. The builder verifies means, unique IDs, joins, parent references, the pedigree DAG, nulls, units, and integrity. Insert order is fixed, timestamps are omitted, and VACUUM is applied; rebuilding produces an identical SHA256.

Schema: `lines(line_id,generation,germplasm_type,bank_id,flar_id,has_genotype,observation_count)`; `line_trait_summary(line_id,trait,mean_value,observation_count,units)`; `pedigree(line_id,parent_1,parent_2)`; `dataset_summary(key,value)`.

## Frozen runtime and setup

Import automatically from the trusted distribution without rebuilding PyInstaller:

```powershell
python -B scripts/import-sidecar.py --ml-root $mlRoot
npm ci
npm run tauri dev
```

The import compares all 645 files against the source, Phase G checksums, and bundle checksums. The imported runtime is intentionally ignored by Git (216,683,310 bytes); provenance/hashes and scripts are retained. The 7,577,600-byte reference database is a versionable application resource. Application runtime code contains no ML source paths.

```text
src-tauri/binaries/
  genefield-final-v1-x86_64-pc-windows-msvc.exe
  _internal/
    bundles/final-v1/           # one bundle in the package
    schemas/final-v1.schema.json
    ... complete Python runtime/native libraries
src-tauri/resources/data/genefield-reference.sqlite
```

`externalBin` selects the executable. The resource mapping `binaries/_internal/ -> _internal/` places runtime resources alongside the executable in the Windows package; the database is mapped to `data/`. The `stage-runtime.mjs` helper arranges the debug output for `tauri dev`. The build cache is not a separate product bundle. Packaging follows the [sidecar guide](https://v2.tauri.app/develop/sidecar/) and [Tauri resource mapping](https://v2.tauri.app/develop/resources/); installer placement still requires testing.

## Inference and lifecycle

The client is based on the ML TypeScript handoff and uses protocol `1.0.0`, bundle `final-v1`, artifact `2.0.0`, stdin/stdout JSON-lines, and request_id. The window has one process owner, a shared startup promise, and health metadata that verifies the four traits, directions, and units. Model/genomic preprocessing runs entirely in the sidecar.

Timeouts: metadata 45 s, predict 10 s, historical_pair 5 s, rank 30 s. Process exit/error rejects pending requests; the process does not respawn automatically. Settings provides a controlled restart. Closing the window waits for the process to stop before destroying the window; the shell plugin also cleans up the child process on exit. beforeunload stops the client on reload; development hot updates reuse the same owner. Input changes invalidate previous displayed results, and a lock prevents duplicate clicks.

The shell ACL permits only spawning `binaries/genefield-final-v1` without arguments, writing to stdin, and killing the process. Arbitrary shell execution/opening is not allowed. `core:window:allow-destroy` is required for cleanup on close. Runtime detection uses core `isTauri()` rather than the optional global __TAURI__.

Breed Designer selects the intersection of training-parent IDs for active traits, then sends pairs and weights to the sidecar. Backend ranking order is preserved. The backend excludes self-crosses, reverse/duplicate pairs, and all historical pairs. DTF requires an earlier/minimize or later/maximize choice; numeric DTF predictions do not use an objective. Scores express application prioritization. NO/LB are numeric severity ratings, not resistance categories. All ML failures produce English messages and console diagnostics.

## Verification

```powershell
npm run typecheck
npm run build
npm test
python -B scripts/test-reference.py
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml --lib
cargo fmt --manifest-path src-tauri/Cargo.toml --check
```

For an automated smoke test in the **real Tauri window**, enable the debug port only during development:

```powershell
$env:WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS='--remote-debugging-port=9223'
npm run tauri dev
# Second terminal:
node scripts/smoke-desktop.mjs
```

The smoke test uses WebView2/CDP, native invoke, real SQL, and the real EXE, rather than a Vite browser impersonating Tauri. Node client tests replace only the Tauri transport with pipes to the real EXE; the ACL is tested separately in the native window. Lifecycle tests also use synthetic transport for timeouts, out-of-order responses, and cleanup. No frontend test trains models.

## Remaining limitations

Development integration passed; the installer has not been built/installed. Installed offline validation, installer resource placement, distribution notices/licenses, and scientific/breeder approval are the next steps. There are seven high-severity advisories in the existing shadcn dependency chain, a frontend chunk-size warning, and a React CSR message from the built-in next-themes inline script. The smoke test reported no page exceptions. Settings utilities for backup/restore/logs are not implemented in the template; they now display a notice instead of reporting false success. There is no separate comparison UI to migrate. The unused release cache remains ignored because automatic approval review rejected its deletion as blocked by policy.
