"""Verify frozen resources in the startup-fix installer without replacing old evidence."""
import argparse
import hashlib
import json
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("--root", type=Path, required=True)
parser.add_argument("--installer", type=Path, required=True)
args = parser.parse_args()
repo = Path(__file__).resolve().parents[1]
root = args.root.resolve()
assert not root.is_relative_to(repo)
baseline = json.loads((repo / "docs/evidence/release/frozen-baseline.json").read_text())

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

for name, expected in baseline["runtime"].items():
    installed = "genefield-final-v1.exe" if name.endswith("-x86_64-pc-windows-msvc.exe") else name
    assert digest(root / installed) == expected, name
assert digest(root / "data/genefield-reference.sqlite") == baseline["reference"]
notices = root / "notices"
inventory = json.loads((notices / "inventory.json").read_text())
assert not inventory["missing_license_files"]
for package in inventory["packages"]:
    for entry in package["files"]:
        assert digest(notices / entry["path"]) == entry["sha256"], entry["path"]
result = {
    "result": "PASS", "version": "0.1.1", "root": str(root),
    "installer": str(args.installer.resolve()), "installer_sha256": digest(args.installer),
    "installer_bytes": args.installer.stat().st_size,
    "runtime_hashes_verified": len(baseline["runtime"]),
    "reference_unchanged": True, "notice_packages_verified": len(inventory["packages"]),
}
out = repo / "docs/evidence/startup-0.1.1"
out.mkdir(parents=True, exist_ok=True)
(out / "package-verification.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps(result, indent=2))
