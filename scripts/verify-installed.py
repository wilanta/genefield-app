"""Read-only verification of the actually installed package."""
import argparse
import hashlib
import json
from pathlib import Path
import struct

p = argparse.ArgumentParser()
p.add_argument('--root', type=Path, required=True)
args = p.parse_args()
root = args.root.resolve()
repo = Path(__file__).resolve().parents[1]
assert not root.is_relative_to(repo)
baseline = json.loads((repo / 'docs/evidence/release/frozen-baseline.json').read_text())
for name, expected in baseline['runtime'].items():
    installed_name = 'genefield-final-v1.exe' if name.endswith('-x86_64-pc-windows-msvc.exe') else name
    assert hashlib.sha256((root / installed_name).read_bytes()).hexdigest() == expected, name
reference = root / 'data/genefield-reference.sqlite'
assert hashlib.sha256(reference.read_bytes()).hexdigest() == baseline['reference']
bundles = [f for f in root.rglob('manifest.json') if f.parent.name == 'final-v1']
assert len(bundles) == 1, bundles
notices = root / 'notices'
inventory = json.loads((notices / 'inventory.json').read_text())
assert not inventory['missing_license_files']
for package in inventory['packages']:
    for file in package['files']:
        assert hashlib.sha256((notices / file['path']).read_bytes()).hexdigest() == file['sha256'], file['path']
exe = root / 'GeneField.exe'
raw = exe.read_bytes()
pe = struct.unpack_from('<I', raw, 60)[0]
subsystem = struct.unpack_from('<H', raw, pe+4+20+68)[0]
assert subsystem == 2, subsystem
files = [f for f in root.rglob('*') if f.is_file()]
result = {'result': 'PASS', 'root': str(root), 'sidecar': str(root/'genefield-final-v1.exe'), 'internal': str(root/'_internal'), 'bundle': str(bundles[0].parent), 'bundle_count': len(bundles), 'reference': str(reference), 'reference_sha256': baseline['reference'], 'runtime_hashes_verified': len(baseline['runtime']), 'notice_packages_verified': len(inventory['packages']), 'package_bytes': sum(f.stat().st_size for f in files), 'installed_file_count': len(files), 'application_exe_bytes': exe.stat().st_size, 'windows_pe_subsystem': subsystem}
(repo / 'docs/evidence/release/installed-layout.json').write_text(json.dumps(result, indent=2)+'\n')
print(json.dumps(result, indent=2))
