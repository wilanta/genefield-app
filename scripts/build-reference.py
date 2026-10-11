"""Deterministic browsing-only SQLite; does not run ML preparation or training.

Requires pandas/pyarrow at BUILD time, e.g. authoritative ML venv. Runtime
uses bundled SQLite, never Python or the source checkout.
"""
import argparse
import hashlib
import json
import math
import sqlite3
from collections import deque
from pathlib import Path
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
UNITS = {'GY': 'kg/ha', 'DTF': 'days', 'NO': 'modified SES IRRI rating points', 'LB': 'SES IRRI rating points'}

def build(ml_root, output):
    processed = ml_root / 'data/processed'
    means = pd.read_parquet(processed / 'line_phenotypes.parquet').sort_values('LINE_ID')
    genotype_ids = set(pd.read_csv(processed / 'genotype_ids.csv', dtype=str).LINE_ID)
    # Exactly the token parser used by prepare_data.py (germplasm may have spaces).
    rows = []
    source_lines = ml_root / 'data/raw/Lines.txt'
    with source_lines.open(encoding='utf-8-sig') as handle:
        assert handle.readline().split() == ['LINE_ID','P1','P2','GENERATION','GERMPLASM_TYPE','BANK_ID','FLAR_ID']
        for text in handle:
            t = text.split()
            if not t: continue
            assert len(t) >= 7
            nullable = lambda s: None if s == 'NA' else s
            rows.append((t[0], nullable(t[1]), nullable(t[2]), nullable(t[3]), nullable(' '.join(t[4:-2])), nullable(t[-2]), nullable(t[-1])))
    rows.sort()
    ids = {r[0] for r in rows}
    assert len(ids) == len(rows), 'duplicate LINE_ID'
    assert means.LINE_ID.is_unique and set(means.LINE_ID) <= ids
    assert genotype_ids <= ids
    observations = pd.read_csv(ml_root / 'data/raw/Phenotypes.txt', sep=r'\s+', na_values=['NA'], usecols=['LINE_ID', *UNITS])
    assert set(observations.LINE_ID) <= ids
    grouped = observations.groupby('LINE_ID')
    counts = grouped[list(UNITS)].count()
    reproduced = grouped[list(UNITS)].mean().reset_index().sort_values('LINE_ID').reset_index(drop=True)
    pd.testing.assert_frame_equal(means.reset_index(drop=True), reproduced, check_exact=False, rtol=1e-12, atol=1e-12)
    parents = {p for r in rows for p in r[1:3] if p}
    unknown = sorted(parents - ids)
    assert not unknown, f'Unknown parent references: {unknown[:10]}'
    # Independent whole-source DAG audit; duplicate parent slots are one edge.
    children = {id: [] for id in ids}; indegree = {id: 0 for id in ids}
    for row in rows:
        for parent in set(row[1:3]) - {None}:
            children[parent].append(row[0]); indegree[row[0]] += 1
    queue = deque(id for id in ids if indegree[id] == 0); visited = 0
    while queue:
        parent = queue.popleft(); visited += 1
        for child in children[parent]:
            indegree[child] -= 1
            if indegree[child] == 0: queue.append(child)
    assert visited == len(ids), 'Pedigree cycle in source data'
    output.parent.mkdir(parents=True, exist_ok=True)
    # New database, fixed insert order, no volatile timestamps, deterministic VACUUM.
    if output.exists(): output.unlink()
    db = sqlite3.connect(output)
    db.executescript('''
    PRAGMA foreign_keys=ON;
    CREATE TABLE lines(line_id TEXT PRIMARY KEY, generation TEXT, germplasm_type TEXT, bank_id TEXT, flar_id TEXT, has_genotype INTEGER NOT NULL, observation_count INTEGER NOT NULL);
    CREATE TABLE line_trait_summary(line_id TEXT REFERENCES lines(line_id), trait TEXT CHECK(trait IN ('GY','DTF','NO','LB')), mean_value REAL, observation_count INTEGER NOT NULL, units TEXT NOT NULL, PRIMARY KEY(line_id,trait));
    CREATE TABLE pedigree(line_id TEXT PRIMARY KEY REFERENCES lines(line_id), parent_1 TEXT REFERENCES lines(line_id), parent_2 TEXT REFERENCES lines(line_id));
    CREATE INDEX pedigree_parent_1 ON pedigree(parent_1);
    CREATE INDEX pedigree_parent_2 ON pedigree(parent_2);
    CREATE TABLE dataset_summary(key TEXT PRIMARY KEY, value TEXT NOT NULL);
    ''')
    nobs = grouped.size().to_dict()
    db.executemany('INSERT INTO lines VALUES (?,?,?,?,?,?,?)', [(r[0], *r[3:], int(r[0] in genotype_ids), int(nobs.get(r[0],0))) for r in rows])
    db.executemany('INSERT INTO pedigree VALUES (?,?,?)', [(r[0],r[1],r[2]) for r in rows if r[1] or r[2]])
    traits = []
    for row in means.itertuples(index=False):
        for trait in UNITS:
            value = getattr(row,trait)
            assert math.isfinite(value) or pd.isna(value)
            traits.append((row.LINE_ID,trait,None if pd.isna(value) else float(value),int(counts.loc[row.LINE_ID,trait]),UNITS[trait]))
    db.executemany('INSERT INTO line_trait_summary VALUES (?,?,?,?,?)',traits)
    source_files = [source_lines, ml_root/'data/raw/Phenotypes.txt', processed/'line_phenotypes.parquet',processed/'genotype_ids.csv']
    summary = {'line_count':len(rows),'phenotype_observation_count':len(observations),'phenotyped_line_count':len(means),'genotyped_line_count':len(genotype_ids),'pedigree_line_count':db.execute('SELECT COUNT(*) FROM pedigree').fetchone()[0], 'source':'INIA historical rice breeding dataset', 'source_sha256':{str(p.relative_to(ml_root)).replace('\\','/'):hashlib.sha256(p.read_bytes()).hexdigest() for p in source_files}}
    db.executemany('INSERT INTO dataset_summary VALUES (?,?)',[(k,json.dumps(v,sort_keys=True)) for k,v in sorted(summary.items())])
    assert not db.execute('PRAGMA foreign_key_check').fetchall()
    assert db.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
    db.commit(); db.execute('VACUUM'); db.close()
    report = {'counts':summary,'trait_rows':len(traits),'duplicate_ids':0,'unknown_parent_references':unknown,'pedigree_cycle_audit':'PASS','missing_trait_values':{t:int(means[t].isna().sum()) for t in UNITS},'observed_mean_ranges':{t:{'minimum':float(means[t].min()),'maximum':float(means[t].max()),'observation_count':int(counts[t].sum())} for t in UNITS},'units':UNITS,'mean_reproduction':'PASS','integrity':'PASS','database_sha256':hashlib.sha256(output.read_bytes()).hexdigest()}
    return report

if __name__ == '__main__':
    parser=argparse.ArgumentParser(); parser.add_argument('--ml-root',type=Path,required=True); parser.add_argument('--output',type=Path,default=ROOT/'src-tauri/resources/data/genefield-reference.sqlite'); parser.add_argument('--report',type=Path,default=ROOT/'docs/evidence/reference-validation.json'); args=parser.parse_args()
    report=build(args.ml_root,args.output); args.report.write_text(json.dumps(report,indent=2)+'\n'); print(json.dumps(report,indent=2))
