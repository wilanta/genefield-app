# GeneField desktop integration report

Development integration completed on 2026-10-11 (Asia/Jakarta). Frozen final-v1 was not retrained or modified. This report covers executed engineering checks, not scientific approval or installed application QA.

| ID | Requested item | Actual result |
| --- | --- | --- |
| A | Existing architecture | React/Vite/TypeScript, Router, Tailwind/shadcn, React Flow, Tauri 2; DataService and SQLite CandidateStore reused. |
| B | Initial mocks | Line/pedigree/model/settings/candidate fixtures, fixed Breed Designer pairs, random-delay averaged Cross Lab outputs, fabricated Overview activity. See GENEFIELD_AUDIT.md. |
| C | Copied from ML | Full dist/genefield-final-v1: 645 files / 216,683,310 bytes; tested TypeScript client adapted. Reference data transformed into SQLite, not copied as raw tables. |
| D | Not copied | Raw SNP/GenomicInformation, genotype_matrix.npy, experiments, OOF, external validation reports and unused processed pair summaries. No extra independent model bundle. |
| E | Destination | src-tauri/binaries/genefield-final-v1-x86_64-pc-windows-msvc.exe with complete adjacent _internal/bundles/final-v1 and runtime/schema. |
| F | Integrity | PASS: all 645 Phase G release hashes and exact file set; all 34 bundle files match source; 33 bundle artifact checksums. EXE SHA256 93ab1f91b071d255153d6b0620d6ab895c73368885b9bab67de54eea534555f6. |
| G | Tauri configuration | externalBin plus _internal -> _internal and resources/data -> data resource maps; dev adjacency staged automatically; duplicate SQL plugin registration corrected. |
| H | Capabilities | Only named sidecar spawn without arguments, stdin-write and kill; no arbitrary shell execute. Added core window destroy for awaited shutdown. |
| I | Persistent client | Shared startup promise, metadata capability validation, protocol 1.0.0 JSON-lines request IDs, bounded timeouts, pending cleanup, no automatic respawn, controlled restart and window shutdown. |
| J | Metadata/health | PASS via app TypeScript with real executable, then native Tauri IPC. final-v1 / artifact 2.0.0; four enabled traits and every declared direction/unit verified. |
| K | Reference inputs | Processed line_phenotypes.parquet and genotype_ids.csv; source Lines.txt for exact pedigree/metadata, selected Phenotypes.txt columns for observation counts and mean reproduction. |
| L | Reference builder | scripts/build-reference.py; deterministic sort/insert/VACUUM; pandas/pyarrow build-only. Source preparation/ML are never run. |
| M | SQLite schema | lines, line_trait_summary, pedigree, dataset_summary; primary/foreign keys and parent indexes; actual metadata only. Separate writable genefield.db. |
| N | Database validation | PASS: 20,628 unique lines; 19,447 phenotype-summary lines; 77,788 trait rows; 91,636 observations; 965 genotyped lines; 18,039 pedigree rows. No missing parent refs/cycles; nulls preserved. Second-build SHA256 identical: 35f35c8fd98eb8196f7b39fb5b8fdd551474b35bc345ec4a3102fd12494bf030. |
| O | Migration map | GENEFIELD_AUDIT.md maps every source object, consumer, real source and replacement service; all six mock modules plus mock adapter removed after migration. |
| P | Line Explorer | PASS real loading, search, filters, existing pagination and native profile navigation. Example GID_10039 returns one actual match. |
| Q | Line Profile | PASS actual historical line means, observation counts, parents, native units and null missing values; no prediction or resistance-category labels. |
| R | Pedigree | PASS actual GID_1 parents GID_2980 / GID_2052, graph edges, direct descendants, two-level ancestry, search and node navigation; visited/cycle guards. |
| S | Cross Lab | PASS actual four-trait inference, user-facing errors and loading guards; error messages are now in English. Historical lookup runs independently before predict so factual history can remain visible when prediction is ineligible. |
| T | Representative prediction | GID_10039 x GID_10125: GY 7891.223511267753 kg/ha; DTF 98.63343564424765 days; NO 4.591383457183838 modified SES IRRI points; LB 0.8833725118415202 SES IRRI points. Historical-descendant cross-level modeled estimates. |
| U | Historical lookup | PASS recorded GID_10039 x GID_8938 and unrecorded GID_10039 x GID_10125. No frontend registry; Cross Lab allows recorded pair analysis. |
| V | Breed Designer | PASS authoritative GY maximize (3,913 eligible candidates), NO minimize (2,323), LB minimize (881); finite native predictions/scores, backend order preserved. |
| W | DTF minimize | PASS native UI and real IPC; 4,186 eligible unrecorded candidates; explicit earlier flowering selection. |
| X | DTF maximize | PASS native UI and real IPC; 4,186 eligible unrecorded candidates; explicit later flowering selection. Missing direction blocks UI request. |
| Y | Multi-trait | PASS weights GY 2 / DTF 1 / NO 1 / LB 1, both applicable DTF directions exercised; 881 eligible unrecorded pairs and exact repeated-response determinism. |
| Z | Candidate safety | PASS: no self pairs, no reverse/duplicate recommendations, every returned recommendation checked by sidecar historical lookup and found unrecorded. Full eligible universe counts verified; backend remains filtering authority. |
| AA | Workspace | PASS existing SQLite CRUD adapted; canonical parents, predictions, bundle, objectives, weights, application score and timestamps persisted. Saved/open after WebView reload and whole desktop restart; test-created rows cleaned up. No separate compare UI existed. |
| AB | Model Insights | PASS runtime manifest: actual families (GY/DTF/LB ExtraTrees, NO Ridge), parameters, trait units, training-pair/parent counts, registry 209, provenance and limitations. No fabricated metric values. |
| AC | Overview/dataset | PASS source counts and coverage from reference SQLite, marker count from manifest; workspace counts/recent saves from actual store. ML training-pair counts remain separate. |
| AD | Error mapping | English mappings for actual PARENT_UNKNOWN/PARENT_INELIGIBLE and requested aliases, genotype unavailable, self cross, DTF required, invalid traits/objectives/weights and service/corruption failure. Technical diagnostics remain in logs. |
| AE | Remaining mocks | A: all production reference/ML fixtures removed. B: synthetic unit-test transport/store fixtures and legacy seedDemo helper tested but never called by production. C: no blocking mocks or production fallback. |
| AF | TypeScript | PASS npm run typecheck and TypeScript stage of npm run build. Configuration compiles in actual Vite/Tauri startup. |
| AG | Frontend tests | PASS 37 tests across six files, including real copied-EXE client tests and synthetic lifecycle/error/timeout tests. No configured lint script; targeted formatting checked separately. |
| AH | Rust | PASS cargo check; cargo test --lib (1 real read-only database test); cargo fmt --check. Native startup validates capability/config schema. |
| AI | Tauri dev | PASS npm run tauri dev, actual GeneField window/WebView2, native IPC, SQLite, adjacent sidecar runtime; no browser mocks. Real runtime detector fixed to core isTauri. |
| AJ | End-to-end smoke | PASS every required existing application flow; native UI + services; zero page exceptions. desktop-smoke.json and screenshots preserve actual output. Full process restart persistence and one-child/zero-after-close verified separately. |
| AK | Performance | Native sanity sample: controlled startup/metadata 1626.3 ms; metadata warm 14.1 ms; predict 58.6 ms; weighted rank 132.3 ms. UI click-to-result Cross Lab 184.1 ms, GY 286.6 ms. Single samples, development machine, no installed performance claim. |
| AL | Modified files | Complete path inventory captured below in source-inventory.json; changes cover configuration, existing pages/services/types, runtime detection and candidate migration. |
| AM | Added files | Reference Rust command/database, typed inference/reference services, lifecycle/real-client/reference tests, reproducible import/build/stage/smoke tooling, audit/integration/report docs and JSON/image evidence. Complete inventory attached. |
| AN | Remaining blockers | No blocker to development integration. Seven existing high shadcn-chain npm advisories, frontend chunk-size warning, original next-themes CSR script console warning. Settings backup/restore/log utilities remain template notices; database size not measured. Scientific approval and distribution notices remain pending. |
| AO | Installer readiness | Ready for the dedicated installer build/install/offline QA stage; no installer built, installed, or certified here. Windows resource placement is configured, not installer-validated. |
| AP | Executed commands | Exact relevant build/validation commands are recorded in evidence/commands.json; source reads and native CDP/OS-close operations are described there. No commit/push. |
| AQ | Git status | Source modifications/additions/deletions remain unstaged; runtime binaries, target, node_modules, frontend dist and logs ignored. Baseline desktop status was clean. Full final inventory retained. |
| AR | Diff check | PASS git diff --check; only normal Windows LF/CRLF notices, no whitespace errors. |
| AS | Diff stat | Actual tracked diff --stat saved in evidence/git-diff-stat.txt; untracked additions are separately enumerated because ordinary git diff --stat omits them. |
| AT | Next stage | Build a Windows installer, install outside both repositories, verify EXE/_internal adjacency and reference resource, disable networking, rerun workflows/persistence/shutdown and desktop-inclusive measurements; review attribution/notices and scientific sign-off before release. |

Evidence: [desktop smoke](evidence/desktop-smoke.json), [prediction](evidence/prediction.json), [ranking](evidence/ranking.json), [metadata](evidence/metadata.json), [integrity](evidence/sidecar-integrity.json), [reference validation](evidence/reference-validation.json), [determinism](evidence/reference-determinism.json), [shutdown](evidence/desktop-shutdown.json), [desktop restart persistence](evidence/desktop-restart-persistence.json), [commands](evidence/commands.json).

Automatic approval review rejected removal of the unused release staging cache with the reason blocked by policy. It remains ignored under src-tauri/target; future dev staging only targets debug. This does not affect the single shipped sidecar package.

## Source control inventory

Modified: 35; deleted migrated mocks/adapters: 7; added/untracked: 43. No commit, push or staging was performed. Copied runtime binaries are ignored; the reference SQLite resource is an intentional addition.

- `.gitignore`
- `package-lock.json`
- `package.json`
- `src-tauri/Cargo.lock`
- `src-tauri/Cargo.toml`
- `src-tauri/capabilities/default.json`
- `src-tauri/src/lib.rs`
- `src-tauri/tauri.conf.json`
- `src/components/layout/AppShell.tsx`
- `src/lib/tauri-runtime.ts`
- `src/main.tsx`
- `src/pages/About/About.tsx`
- `src/pages/BreedDesigner/BreedDesigner.tsx`
- `src/pages/BreedDesigner/BreedDesignerSidebar.tsx`
- `src/pages/BreedDesigner/CandidateTable.tsx`
- `src/pages/BreedDesigner/types.ts`
- `src/pages/CandidateWorkspace/CandidateWorkspace.tsx`
- `src/pages/CandidateWorkspace/CandidateWorkspacePanels.tsx`
- `src/pages/CrossLab/CrossLab.tsx`
- `src/pages/LineExplorer/LineExplorer.tsx`
- `src/pages/LineExplorer/LineExplorerDetailPanel.tsx`
- `src/pages/LineExplorer/LineExplorerToolbar.tsx`
- `src/pages/ModelInsights/ModelInsights.tsx`
- `src/pages/Overview/Overview.tsx`
- `src/pages/PedigreeExplorer/PedigreeExplorer.tsx`
- `src/pages/PedigreeExplorer/PedigreeGraph.tsx`
- `src/pages/PedigreeExplorer/PedigreeToolbar.tsx`
- `src/pages/Settings/Settings.tsx`
- `src/services/adapters/memory-candidate-store.ts`
- `src/services/adapters/tauri-sqlite-candidate-store.test.ts`
- `src/services/adapters/tauri-sqlite-candidate-store.ts`
- `src/services/index.ts`
- `src/types/research.ts`
- `src/types/settings.ts`
- `vite.config.ts`

Added files:

- `docs/GENEFIELD_AUDIT.md`
- `docs/GENEFIELD_INTEGRATION.md`
- `docs/GENEFIELD_INTEGRATION_REPORT.md`
- `docs/evidence/checks.json`
- `docs/evidence/commands.json`
- `docs/evidence/desktop-cross-lab.png`
- `docs/evidence/desktop-model-insights.png`
- `docs/evidence/desktop-restart-fixture.json`
- `docs/evidence/desktop-restart-persistence.json`
- `docs/evidence/desktop-shutdown.json`
- `docs/evidence/desktop-smoke.json`
- `docs/evidence/desktop-workspace.png`
- `docs/evidence/git-diff-check.json`
- `docs/evidence/git-diff-stat.txt`
- `docs/evidence/git-status.txt`
- `docs/evidence/metadata.json`
- `docs/evidence/npm-audit.json`
- `docs/evidence/prediction.json`
- `docs/evidence/ranking.json`
- `docs/evidence/reference-determinism.json`
- `docs/evidence/reference-validation.json`
- `docs/evidence/sidecar-integrity.json`
- `docs/evidence/source-inventory.json`
- `docs/evidence/temporary-workspace-cleanup.json`
- `scripts/build-reference.py`
- `scripts/import-sidecar.py`
- `scripts/smoke-desktop.mjs`
- `scripts/stage-runtime.mjs`
- `scripts/test-reference.py`
- `src-tauri/resources/data/genefield-reference.sqlite`
- `src-tauri/src/reference.rs`
- `src/lib/genefield/client.test.ts`
- `src/lib/genefield/client.ts`
- `src/lib/genefield/errors.ts`
- `src/lib/genefield/limitations.ts`
- `src/lib/genefield/real-client.test.ts`
- `src/lib/genefield/types.ts`
- `src/lib/tauri-runtime.test.ts`
- `src/lib/use-async.ts`
- `src/services/inference-service.ts`
- `src/services/reference-service.test.ts`
- `src/services/reference-service.ts`
- `vitest.config.ts`

Tracked diff statistics:

```text
 .gitignore                                         |   8 +
 package-lock.json                                  |  40 +++
 package.json                                       |   8 +-
 src-tauri/Cargo.lock                               | 211 +++++++++++-
 src-tauri/Cargo.toml                               |   2 +
 src-tauri/capabilities/default.json                |  19 +-
 src-tauri/src/lib.rs                               |  42 +--
 src-tauri/tauri.conf.json                          |  15 +-
 src/components/layout/AppShell.tsx                 |  49 ++-
 src/lib/tauri-runtime.ts                           |   7 +-
 src/main.tsx                                       |  17 +
 src/mocks/breed-designer.ts                        | 130 -------
 src/mocks/candidates.ts                            |  73 ----
 src/mocks/lines.ts                                 | 378 ---------------------
 src/mocks/modelInsights.ts                         |  85 -----
 src/mocks/pedigree.ts                              | 110 ------
 src/mocks/settings.ts                              |  28 --
 src/pages/About/About.tsx                          |  22 +-
 src/pages/BreedDesigner/BreedDesigner.tsx          | 209 +++++++++++-
 src/pages/BreedDesigner/BreedDesignerSidebar.tsx   |  13 +-
 src/pages/BreedDesigner/CandidateTable.tsx         |  14 +
 src/pages/BreedDesigner/types.ts                   |   7 +-
 .../CandidateWorkspace/CandidateWorkspace.tsx      |   6 +-
 .../CandidateWorkspacePanels.tsx                   |  45 ++-
 src/pages/CrossLab/CrossLab.tsx                    | 294 +++++++++-------
 src/pages/LineExplorer/LineExplorer.tsx            |  69 ++--
 src/pages/LineExplorer/LineExplorerDetailPanel.tsx |  17 +-
 src/pages/LineExplorer/LineExplorerToolbar.tsx     |  24 +-
 src/pages/ModelInsights/ModelInsights.tsx          |  85 ++++-
 src/pages/Overview/Overview.tsx                    | 189 +++++++----
 src/pages/PedigreeExplorer/PedigreeExplorer.tsx    |  30 +-
 src/pages/PedigreeExplorer/PedigreeGraph.tsx       |  42 ++-
 src/pages/PedigreeExplorer/PedigreeToolbar.tsx     |  15 +-
 src/pages/Settings/Settings.tsx                    | 210 +++++++++---
 src/services/adapters/memory-candidate-store.ts    |  10 +-
 src/services/adapters/mock-data-service.ts         |  30 --
 .../adapters/tauri-sqlite-candidate-store.test.ts  |   5 +-
 .../adapters/tauri-sqlite-candidate-store.ts       |  33 +-
 src/services/index.ts                              |  24 +-
 src/types/research.ts                              |  29 +-
 src/types/settings.ts                              |  11 +-
 vite.config.ts                                     |   3 +-
 42 files changed, 1397 insertions(+), 1261 deletions(-)
```
