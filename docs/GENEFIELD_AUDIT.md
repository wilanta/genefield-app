# Desktop integration audit and migration map

The initial checkout is React 19 + Vite + TypeScript, React Router, Tailwind/shadcn, React Flow, Tauri 2. There is no existing inference client. `DataService` has line list/profile and cross analysis contracts. Candidate Workspace uses `CandidateStore`: Tauri SQL in desktop, explicitly labeled session memory in browser. Rust registers SQL twice (to be corrected), candidate migrations v1/v2, and a template greet command. No shell plugin exists. No AGENTS.md was found in the repository or its ancestors. Initial git status was clean.

| Initial source | Object / consumer | Real source / replacement |
| --- | --- | --- |
| mocks/lines.ts | mockLines / Line Explorer, Cross Lab autocomplete, mock DataService | read-only reference SQLite / referenceService |
| mocks/pedigree.ts | mockPedigree / Pedigree Explorer | Lines.txt direct parent relationships / referenceService |
| CrossLab.tsx | timer, random error, averaged parent estimates | persistent final-v1 client predict + historical_pair |
| mocks/breed-designer.ts | generateCandidates, selectParentPool / Breed Designer | reference lines + metadata eligibility; sidecar rank |
| mocks/candidates.ts | demoCandidates / Candidate Workspace first-run seed | empty writable workspace; real prediction/ranking snapshots |
| mocks/modelInsights.ts | mockModelInsights / Model Insights, About | sidecar metadata and frozen limitations |
| mocks/settings.ts | mockSettings / Settings | actual app paths, version, sidecar readiness |
| Overview.tsx | fixed counts, workspace counts, fabricated activity | reference dataset_summary, CandidateStore, metadata |
| AppShell.tsx | research-v1 / ranking disabled labels | final-v1 runtime status |

Preserve the existing cards, tables, graph, routes, theme/density and candidate CRUD. Production errors must remain errors; no mock fallback. Unit labels are kg/ha, days, modified SES IRRI rating points (NO), SES IRRI rating points (LB). No confidence or breeding guarantees.

Processed discovery: line_phenotypes.parquet has 19,447 rows, LINE_ID and four line means; genotype_ids.csv contains actual genotyped IDs. historical_crosses.parquet (2,332 rows) contains pair-level descendant counts and summary means; genotyped_crosses.parquet (196 rows) is an ML population, not the whole source dataset. Pair registries contain parent pairs, not child-parent edges. Therefore actual line metadata, direct parent relationships and observation counts must be read from authoritative data/raw/Lines.txt and selected columns of Phenotypes.txt, using prepare_data.py semantics. Raw SNPs, genomic matrices, experiments and OOF evidence are not frontend reference data. Trial/location browsing is absent, so no such tables are needed.
