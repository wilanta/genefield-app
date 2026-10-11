# GeneField Windows release readiness — Phase H.1 / I

Decision: **READY_FOR_COMPETITION_RELEASE** for an engineering demonstration on the tested Windows laptop, under the represented historical INIA scope and decision-support limitations. This is not field validation, external validation, F1 prediction or external expert approval. External expert review remains pending. Models, protocol, ranking, reference semantics and scientific evidence were not changed.

## Already completed work skipped

- Existing real-data/Tauri integration, DataService and SQLite CandidateStore implementation.
- Re-importing the frozen final-v1 package from the ML repository or rebuilding PyInstaller.
- Rebuilding reference SQLite or reprocessing source data.
- Reimplementing prediction, historical lookup, eligibility, ranking or the IPC protocol.
- Recreating Line Explorer, profiles, pedigree, Overview and Model Insights integration.
- Repeating historical/scientific validation or modifying its evidence.

The requested H.1 checks, native smoke, production build and installed QA were executed; those were not skipped. Existing code was extended only for wording, saved comparison, notices, build inventory and QA tooling.

## Required A–AI report

| ID | Item | Actual result |
| --- | --- | --- |
| A | Scientific wording | Cross Lab, shell, Overview, Model Insights, About and saved-estimate labels now distinguish historical validation passed from external expert review pending. Represented-INIA historical descendant estimates, decision-support use, field-trial limitation, external-germplasm restriction and absent calibrated uncertainty are explicit. Frozen claim matrix supports the local historical scope; no frozen metadata was edited. |
| B | Prioritization score | Breed Designer, Workspace and Compare use Prioritization Score. Relative application prioritization, not breeding-success probability, is explained. Different objectives/weights/pools are not directly comparable. Backend values/order/math unchanged. |
| C | Candidate Compare | Select/unselect 2–3 saved candidates in list or grid, fourth unchecked option disabled at three, clear selection, disabled insufficient-selection action, dialog close/Escape/back. Side-by-side names, parents, all four estimates/units, objectives, weights, score, bundle and historical status. Missing values say Not saved; no inference or fabricated default is used. English and Indonesian copy included. |
| D | Compare smoke | PASS: three meaningful component/workflow tests; real native H.1 comparison; installed comparison of actual Cross Lab and weighted-ranking snapshots. Screenshot: installed/compare.png. |
| E | H.1 checks | PASS typecheck, build, 48 frontend tests, 4 reference tests, cargo check, cargo test --lib (1), cargo fmt --check. Native affected workflows PASS. |
| F | Installer commands | `npm run tauri build -- --bundles nsis`; `npm run tauri -- bundle --bundles nsis` refreshed notices without recompiling/retraining ML. |
| G | Installer | NSIS Windows x64, `src-tauri/target/release/bundle/nsis/GeneField_0.1.0_x64-setup.exe`; 58,642,627 bytes / 55.93 MiB. SHA256: 9f5498049a994a4bfb444b7e013414995718743cece5c07fb1394f2a981c2d3f. Installed package 236,516,102 bytes / 225.56 MiB; main EXE 8,453,632 bytes. |
| H | Installation | Installer /S /D installation returned 0. Actual app: `C:\Users\sheil\AppData\Local\Programs\GeneField\GeneField.exe`. |
| I | Resource layout | EXE and `genefield-final-v1.exe` adjacent to `_internal/`; exactly one `_internal/bundles/final-v1`; `data/genefield-reference.sqlite`; `notices/`. All 645 runtime hashes, reference hash and notice hashes PASS. |
| J | Repository independence | Installed EXE launched from a temporary working directory outside both repositories with system-only PATH and Python/venv environment paths removed. Native reference, metadata, inference and ranking used installed resources successfully. No Vite server/source imports were used by installed QA. |
| K | Offline startup | PASS five installed starts. WebView2 deny proxy permits only local Tauri resource origin; browser offline state denies an actual external HTTPS fetch. Existing frozen sidecar socket-denial hook enabled. OS adapters were left unchanged; this is not an OS-wide packet-capture/firewall claim. |
| L | Lines/profile | PASS real GID_10039 search, one match, stored historical profile/counts/units. Dataset 20,628 lines remains unchanged. |
| M | Pedigree | PASS GID_1 and real GID_2980/GID_2052 parents, native graph nodes/edges. |
| N | Four traits | PASS stored actual GID_10039 × GID_10125: GY 7891.223511267753 kg/ha; DTF 98.63343564424765 days; NO 4.591383457183838 modified SES IRRI rating points; LB 0.8833725118415202 SES IRRI rating points. No field/F1 claim. |
| O | Historical pair | PASS recorded GID_10039 × GID_8938; unrecorded representative pair remains false in saved snapshot. |
| P | Single objectives | PASS GY maximize, NO minimize, LB minimize; genuine sidecar ranking and displayed Prioritization Scores. |
| Q | DTF | PASS required-direction error, earlier/minimize and later/maximize. Numeric DTF estimate also displayed in Cross Lab/Compare. |
| R | Multi-trait | PASS GY 2 / DTF 1 / NO 1 / LB 1; actual weighted snapshot saved and compared. Backend exclusion/order unchanged and real-client safety/determinism tests PASS. |
| S | Workspace persistence | PASS SQLite save, reopen, and exact row/snapshot equality on four whole-process restarts. Only this task's test-created rows removed, including three precisely identified failed-smoke fixtures. |
| T | Installed Compare | PASS side-by-side real persisted snapshots, four traits, objectives/weights, score, bundle and historical status; close/back and reopen verified. |
| U | Model Insights | PASS runtime final-v1 metadata, actual model families/training populations and 209-pair registry; historical status distinct from pending external review. |
| V | Lifecycle | Exactly one sidecar per installed launch; controlled Settings restart replaces its PID with one new child; every normal app close leaves no corresponding app/sidecar process. Five installed startups plus ordinary launch verified. |
| W | Console/user errors | PASS ordinary launch without CDP/proxy/test hook: visible GeneField window and zero visible console windows. Main PE subsystem Windows GUI (2). Ineligible genotyped GID_10021 input produced application UI error without predictions/fallback or Python traceback. |
| X | Performance | Full installed UI measurements below, raw samples retained. Five startups; ten measurements each for Cross Lab, GY and weighted rank. No discarded samples or Python-only timing substituted. |
| Y | Memory | Point sample after workflows/controlled restart: process-tree working-set sum 973.27 MiB; sidecar working set 147.77 MiB. Private commit sum 1184.42 MiB, sidecar private commit 572.55 MiB. Includes WebView2/hidden conhost; shared pages may be counted twice. Not peak/unique resident memory. |
| Z | Distribution notices | 444 package entries and 743 upstream notice texts, copied unchanged or fetched from publisher/official sources with SHA256 provenance. Dataset attribution/CC0, Python/bootloader, NumPy/SciPy native notices, sklearn, joblib, threadpoolctl, cloudpickle, narwhals, fonts, actual frontend and Windows Rust closure included. Versioned source URLs for MPL components provided. Notices actually installed and verified. |
| AA | npm audit | Seven high advisories in shadcn CLI/registry/glob/ts-morph tooling; zero production audit advisories. shadcn CSS is compiled into styles, its CLI JavaScript is not shipped. Moved shadcn to devDependencies; package versions/resolved URLs/integrities unchanged. npm proposes a breaking root replacement; no force fix/major upgrade used. Tooling advisories remain documented. |
| AB | Final automated checks | PASS all seven requested checks again; 48 frontend, 4 reference, 1 Rust test. Additional frontend run PASS after moving test evidence output to the new release folder, preserving previous desktop evidence. |
| AC | Installed smoke | PASS all required installed workflows, restart/persistence, error path, controlled restart and shutdown; zero page exceptions. Expected offline-probe failures and explicit ineligible-parent diagnostic appear in developer console, not user UI. |
| AD | Remaining issues | External expert review pending; unsigned installer (NotSigned); installed WebView2 prerequisite; seven tooling advisories; frontend chunk warning and existing development-only next-themes React CSR warning. Startup-to-observed-ML-ready median 4.90 s. Backup/restore/log utilities remain existing notices outside this task. No blocker found for the tested competition demonstration. |
| AE | Readiness | READY_FOR_COMPETITION_RELEASE within the scope above. Installed QA complete; stop here for review. No commit or push. |
| AF | Commands | Exact relevant commands and failed harness retry/cleanup notes: evidence/release/commands.json. Build/check logs are locally available and ignored by Git. |
| AG | Git status | All source/evidence/notices changes unstaged. Runtime/installer/target/node_modules/log/cache artifacts and temporary QA/Git snapshots are ignored. Final QA evidence, the verification baseline and distribution notices remain eligible for version control. |
| AH | Diff check | PASS `git diff --check`; normal LF/CRLF notices may appear on Windows. |
| AI | Diff stat | Original release-check diff shown below; the local evidence/release/git-diff-stat.txt snapshot is ignored. Run `git diff --stat` and `git status --short --untracked-files=all` for the current inventory. |

## Installed measurements

Target: Windows 11 Home Single Language build 26300, ASUS X421EAY/K413EA, i5-1135G7 (4 cores/8 logical processors), 8,268,062,720 bytes physical RAM. Interactive laptop workload was not controlled. CDP automation and offline-denial settings add observation overhead.

| Measurement | n | Mean | Median | Empirical p95 |
| --- | ---: | ---: | ---: | ---: |
| Launch → navigation UI visible | 5 | 1234.42 ms | 1295.76 ms | Not reported |
| Launch → Overview loaded with ML metadata/reference/workspace | 5 | 4769.24 ms | 4897.61 ms | Not reported |
| Cross Lab click → four-trait completion | 10 | 145.90 ms | 149.70 ms | 174.57 ms |
| GY click → completed ranking | 10 | 295.14 ms | 294.28 ms | 312.30 ms |
| Weighted click → completed ranking | 10 | 289.96 ms | 292.62 ms | 304.42 ms |

ML readiness is observed through the complete Overview response; this includes reference/SQL readiness and is an upper bound on when the sidecar alone became ready. Five startup observations are insufficient for a useful p95 estimate. Ten-sample empirical p95 uses nearest-rank and is a descriptive small-sample statistic, not a stable SLA. Memory is one working-set/commit snapshot, not a percentile or peak. Raw samples/process IDs are preserved in installed/qa.json.

The NSIS package uses existing Tauri WebView2 installation settings. This laptop already has WebView2. Fresh offline installation on a machine without that runtime was not tested; default bootstrapper installation may require internet. See [Tauri Windows installer options](https://v2.tauri.app/distribute/windows-installer/#webview2-installation-options).

Dataset licensing/attribution was checked against the [Dryad dataset](https://datadryad.org/dataset/doi:10.5061/dryad.x69p8czn8) and [Dryad terms](https://datadryad.org/terms). Original notice text is in the installed notices folder; this engineering inventory does not invent a GeneField source license or imply institution endorsement.

## Evidence

- [H.1 checks](evidence/release/h1-checks.json) / [native smoke](evidence/release/h1-native/desktop-smoke.json)
- [Installer/install receipt](evidence/release/installation.json) / [actual installed layout](evidence/release/installed-layout.json)
- [Installed QA with raw measurements](evidence/release/installed/qa.json) / [comparison screenshot](evidence/release/installed/compare.png)
- [Normal console/window/shutdown check](evidence/release/normal-console.json)
- [Final checks](evidence/release/final-checks.json) / [frozen preservation](evidence/release/frozen-preservation.json)
- [Notices verification](evidence/release/notices-verification.json) / [distribution notice](../src-tauri/resources/notices/DISTRIBUTION_NOTICES.txt)
- [npm audit assessment](evidence/release/npm-audit-assessment.json) / [exact commands](evidence/release/commands.json)

Initial smoke harness failures were resolved: stale development SharedWorker CDP target, selection before workspace load, duplicate already-saved ranking pair, and attachment before the release page navigated from about:blank. These were not accepted as passes. Final native and installed executions passed; retries and exact fixture cleanup are recorded.

## Final source-control inventory

At release-check completion, 19 tracked files were modified and 784 files were added/untracked, including 743 upstream notice texts. The diff below records that checkpoint. Subsequent ignore rules exclude temporary QA output, raw audit reports, repeated real-client snapshots, generated frontend build inventory and local Git/source inventories. These files remain available locally; final QA evidence and the frozen verification baseline remain eligible for version control. Nothing staged, committed or pushed.

```text
 docs/GENEFIELD_INTEGRATION.md                      |  18 +-
 package-lock.json                                  | 367 ++++++++++++++++++++-
 package.json                                       |   4 +-
 scripts/smoke-desktop.mjs                          | 129 +++++++-
 src-tauri/tauri.conf.json                          |  11 +-
 src/components/layout/AppShell.tsx                 |   3 +-
 src/lib/genefield/limitations.ts                   |   8 +-
 src/lib/genefield/real-client.test.ts              |  10 +-
 src/locales/id.json                                |  35 +-
 src/pages/About/About.tsx                          |   4 +-
 src/pages/BreedDesigner/BreedDesigner.tsx          |   2 +-
 src/pages/BreedDesigner/CandidateTable.tsx         |  10 +-
 src/pages/BreedDesigner/types.ts                   |   2 +-
 .../CandidateWorkspace/CandidateWorkspace.tsx      |  49 +++
 .../CandidateWorkspacePanels.tsx                   |  48 ++-
 src/pages/CrossLab/CrossLab.tsx                    |  23 +-
 src/pages/ModelInsights/ModelInsights.tsx          |  21 +-
 src/pages/Overview/Overview.tsx                    |   6 +-
 vite.config.ts                                     |  61 +++-
 19 files changed, 741 insertions(+), 70 deletions(-)
```
