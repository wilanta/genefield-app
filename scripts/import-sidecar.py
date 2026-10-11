"""Copy and byte-verify the trusted complete Windows onedir runtime; no builds."""
import argparse
import hashlib
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--ml-root', type=Path, required=True)
    args = parser.parse_args()
    source = args.ml_root / 'dist/genefield-final-v1'
    target = ROOT / 'src-tauri/binaries'
    target.mkdir(parents=True, exist_ok=True)
    files = sorted(p for p in source.rglob('*') if p.is_file())
    hashes = {}
    for file in files:
        rel = file.relative_to(source)
        dest = target / ('genefield-final-v1-x86_64-pc-windows-msvc.exe' if str(rel) == 'genefield-final-v1.exe' else rel)
        dest.parent.mkdir(parents=True, exist_ok=True)
        if not dest.exists() or sha(dest) != sha(file): shutil.copy2(file, dest)
        assert sha(file) == sha(dest), str(rel)
        hashes[rel.as_posix()] = sha(dest)
    expected = {'genefield-final-v1-x86_64-pc-windows-msvc.exe' if name == 'genefield-final-v1.exe' else name for name in hashes}
    assert expected == {p.relative_to(target).as_posix() for p in target.rglob('*') if p.is_file()}, 'Unexpected runtime files'
    release_hashes = json.loads((args.ml_root/'reports/windows-sidecar/package_checksums.json').read_text())['files']
    assert hashes == release_hashes, 'Runtime differs from the Phase G release checksum manifest'
    original = args.ml_root / 'bundles/final-v1'
    bundle = target / '_internal/bundles/final-v1'
    for file in original.rglob('*'):
        if file.is_file(): assert sha(file) == sha(bundle / file.relative_to(original))
    checksums = json.loads((bundle/'checksums.json').read_text())
    for name,digest in checksums.items(): assert sha(bundle/name) == digest, name
    assert {p.relative_to(original).as_posix() for p in original.rglob('*') if p.is_file()} == {p.relative_to(bundle).as_posix() for p in bundle.rglob('*') if p.is_file()}
    report = {'source': str(source), 'destination': str(target), 'file_count': len(files), 'bytes': sum(p.stat().st_size for p in files), 'package_integrity': 'PASS', 'phase_g_release_hashes': 'PASS', 'final_v1_integrity': 'PASS', 'bundle_checksums': 'PASS', 'sha256': hashes}
    (ROOT / 'docs/evidence/sidecar-integrity.json').write_text(json.dumps(report, indent=2)+'\n')
    print(json.dumps({k:v for k,v in report.items() if k != 'sha256'},indent=2))
if __name__ == '__main__': main()
