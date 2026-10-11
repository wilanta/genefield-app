"""Record actual development/final checks without changing model evidence."""
import argparse
import json
from pathlib import Path
import subprocess
import sys
import time

p = argparse.ArgumentParser()
p.add_argument('--stage', choices=['h1', 'final'], required=True)
args = p.parse_args()
root = Path(__file__).resolve().parents[1]
out = root / 'docs/evidence/release'
out.mkdir(parents=True, exist_ok=True)
commands = [
    ['npm.cmd', 'run', 'typecheck'], ['npm.cmd', 'run', 'build'],
    ['npm.cmd', 'test'], ['npm.cmd', 'run', 'test:reference'],
    ['cargo', 'check', '--manifest-path', 'src-tauri/Cargo.toml'],
    ['cargo', 'test', '--manifest-path', 'src-tauri/Cargo.toml', '--lib'],
    ['cargo', 'fmt', '--manifest-path', 'src-tauri/Cargo.toml', '--check'],
]
results = []
for i, cmd in enumerate(commands):
    log = out / f'{args.stage}-check-{i}.log'
    start = time.monotonic()
    with log.open('w', encoding='utf-8') as stream:
        proc = subprocess.run(cmd, cwd=root, stdout=stream, stderr=subprocess.STDOUT)
    result = {'command': subprocess.list2cmdline(cmd), 'exit_code': proc.returncode, 'seconds': time.monotonic()-start, 'log': log.name}
    results.append(result)
    print(result, flush=True)
    (out / f'{args.stage}-checks.json').write_text(json.dumps(results, indent=2)+'\n', encoding='utf-8')
    if proc.returncode:
        print(log.read_text(encoding='utf-8')[-5000:])
        sys.exit(proc.returncode)
