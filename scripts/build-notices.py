"""Copy upstream notice text unchanged; never edit the frozen sidecar."""
import argparse
from email import message_from_string
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
from urllib.request import urlopen

root = Path(__file__).resolve().parents[1]
p = argparse.ArgumentParser()
p.add_argument('--python-license', type=Path, required=True)
p.add_argument('--pyinstaller-license', type=Path, required=True)
args = p.parse_args()
out = root / 'src-tauri/resources/notices'
out.mkdir(parents=True, exist_ok=True)
entries = []
missing = []

def collect(name, version, license_id, source_root, files, ecosystem):
    copied = []
    for file in sorted(set(files)):
        if not file.is_file():
            continue
        relative = file.relative_to(source_root)
        destination = out / ecosystem / f'{name.replace("/", "__")}@{version}' / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(file, destination)
        copied.append({'path': destination.relative_to(out).as_posix(), 'sha256': hashlib.sha256(file.read_bytes()).hexdigest()})
    entries.append({'name': name, 'version': version, 'license': license_id, 'ecosystem': ecosystem, 'files': copied})
    if not copied:
        missing.append(f'{ecosystem}:{name}@{version}')

def license_files(directory):
    return [file for file in directory.iterdir() if file.is_file() and file.name.lower().startswith(('license', 'licence', 'copying', 'notice', 'copyright', 'ofl'))]

runtime = root / 'src-tauri/binaries/_internal'
for dist in sorted(runtime.glob('*.dist-info')):
    metadata = message_from_string((dist / 'METADATA').read_text(encoding='utf-8'))
    files = license_files(dist)
    if (dist / 'licenses').exists():
        files += list((dist / 'licenses').rglob('*'))
    collect(metadata['Name'], metadata['Version'], metadata['License-Expression'] or metadata['License'] or 'See upstream text', dist, files, 'python')
collect('Python', '3.11.9', 'PSF-2.0 and bundled third-party notices', args.python_license.parent, [args.python_license], 'python')
collect('PyInstaller-bootloader', '6.22.3', 'GPL-2.0-or-later with bootloader exception', args.pyinstaller_license.parent, [args.pyinstaller_license], 'python')

for package in json.loads((root / 'docs/evidence/release/frontend-package-inventory.json').read_text(encoding='utf-8')):
    directory = root / 'node_modules' / package['name']
    files = license_files(directory)
    if (directory / 'LICENSES').exists():
        files += list((directory / 'LICENSES').rglob('*'))
    collect(package['name'], package['version'], package.get('license'), directory, files, 'frontend')

metadata = json.loads(subprocess.check_output(['cargo', 'metadata', '--locked', '--manifest-path', str(root / 'src-tauri/Cargo.toml'), '--format-version', '1', '--filter-platform', 'x86_64-pc-windows-msvc'], cwd=root))
nodes = {node['id']: node for node in metadata['resolve']['nodes']}
reachable = set()
def visit(package_id):
    if package_id in reachable:
        return
    reachable.add(package_id)
    for dep in nodes[package_id]['deps']:
        if any(kind['kind'] is None for kind in dep['dep_kinds']):
            visit(dep['pkg'])
visit(metadata['resolve']['root'])
for package in metadata['packages']:
    if package['id'] not in reachable or package['source'] is None:
        continue
    directory = Path(package['manifest_path']).parent
    files = license_files(directory)
    if package.get('license_file'):
        files.append(directory / package['license_file'])
    # libsqlite3-sys includes SQLite's public-domain dedication in its sources.
    if package['name'] == 'libsqlite3-sys':
        files += list(directory.glob('sqlite3/LICENSE*'))
    collect(package['name'], package['version'], package['license'], directory, files, 'rust')
    entries[-1]['source_url'] = f"https://crates.io/api/v1/crates/{package['name']}/{package['version']}/download"
    if not files and package.get('repository', '').startswith('https://github.com/'):
        vcs = directory / '.cargo_vcs_info.json'
        if vcs.exists():
            revision = json.loads(vcs.read_text())['git']['sha1']
            repository = package['repository'].removesuffix('.git').removeprefix('https://github.com/')
            fetched = []
            for filename in ['LICENSE', 'LICENSE.txt', 'LICENSE-MIT', 'LICENSE-APACHE', 'LICENSES/MIT.txt', 'LICENSES/Apache-2.0.txt']:
                url = f'https://raw.githubusercontent.com/{repository}/{revision}/{filename}'
                try:
                    data = urlopen(url, timeout=15).read()
                except Exception:
                    continue
                destination = out / 'rust' / f"{package['name']}@{package['version']}" / filename
                destination.parent.mkdir(parents=True, exist_ok=True)
                destination.write_bytes(data)
                fetched.append({'path': destination.relative_to(out).as_posix(), 'sha256': hashlib.sha256(data).hexdigest(), 'source_url': url})
            if fetched:
                entries[-1]['files'] = fetched
                missing.remove(f"rust:{package['name']}@{package['version']}")
            elif package['name'] == 'selectors' and package['license'] == 'MPL-2.0':
                url = 'https://www.mozilla.org/media/MPL/2.0/index.txt'
                data = urlopen(url, timeout=20).read()
                destination = out / 'rust' / f"selectors@{package['version']}" / 'MPL-2.0.txt'
                destination.parent.mkdir(parents=True, exist_ok=True)
                destination.write_bytes(data)
                entries[-1]['files'] = [{'path': destination.relative_to(out).as_posix(), 'sha256': hashlib.sha256(data).hexdigest(), 'source_url': url}]
                missing.remove(f"rust:selectors@{package['version']}")

# This npm release omits the license file. Retain the publisher's upstream text.
for entry in entries:
    if entry['name'] == 'react-remove-scroll-bar' and not entry['files']:
        url = 'https://raw.githubusercontent.com/theKashey/react-remove-scroll-bar/master/LICENSE'
        data = urlopen(url, timeout=20).read()
        destination = out / 'frontend' / 'react-remove-scroll-bar@2.3.8' / 'LICENSE'
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(data)
        entry['files'] = [{'path': destination.relative_to(out).as_posix(), 'sha256': hashlib.sha256(data).hexdigest(), 'source_url': url}]
        missing.remove('frontend:react-remove-scroll-bar@2.3.8')

(out / 'inventory.json').write_text(json.dumps({'scope': 'frozen Python runtime; Vite-bundled frontend and font; normal Windows Rust dependency closure', 'packages': sorted(entries, key=lambda e: (e['ecosystem'], e['name'])), 'missing_license_files': missing}, indent=2)+'\n', encoding='utf-8')
summary = '''GeneField third-party distribution notices

Dataset: Rebollo, Ines; Scheffel, Sheila; Blanco, Pedro et al. (2023).
Instituto Nacional de Investigacion Agropecuaria (INIA) Rice Breeding Program
Historical Dataset [Dataset]. Dryad. https://doi.org/10.5061/dryad.x69p8czn8
Dryad data are made available under CC0 1.0 Universal:
https://datadryad.org/terms and https://creativecommons.org/publicdomain/zero/1.0/
GeneField ships transformed reference tables and frozen model artifacts.
Dataset availability does not imply author/institution endorsement of GeneField.

Python: PSF license and bundled notices in python/Python@3.11.9/LICENSE.txt.
NumPy, SciPy, scikit-learn: upstream BSD notices, including bundled native
components, are retained unchanged in python/. joblib/threadpoolctl use their
BSD notices; cloudpickle its BSD notice; narwhals its MIT notice. Actual
identifiers, versions, file paths and SHA256 values are in inventory.json.
PyInstaller bootloader license and distribution exception are retained.

Frontend: actual Vite-bundled packages plus Geist font, with unchanged
upstream license texts in frontend/. The shadcn tailwind.css styles are included;
its CLI JavaScript is not bundled.
Tauri/Rust: normal Windows dependency closure, with upstream notices in rust/.
Some build-time/proc-macro notices may be included conservatively.
For MPL-2.0 components, corresponding unmodified source is available through
the version-specific source_url recorded for each package in inventory.json.
Microsoft WebView2 is managed by Windows/Microsoft; its own installer and
runtime terms apply. GeneField does not replace or modify those terms.

No upstream license wording has been edited. GeneField's own source licensing
is not declared by this third-party notice artifact.
'''
(out / 'DISTRIBUTION_NOTICES.txt').write_text(summary, encoding='utf-8')
print(json.dumps({'packages': len(entries), 'missing': missing}, indent=2))
