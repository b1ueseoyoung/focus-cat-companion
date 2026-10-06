"""Verify a pristine unpacked public-review archive with the standard library."""
from pathlib import Path
import hashlib,json

root=Path(__file__).resolve().parents[1]
manifest=json.loads((root/'RELEASE_MANIFEST.json').read_text(encoding='utf-8'))
assert manifest['project']=='focus-cat-companion'
assert manifest['version']=='0.6.0' and manifest['license']=='MIT'
files=manifest['files']
expected={item['path'] for item in files}|{'RELEASE_MANIFEST.json'}
assert len(expected)==len(files)+1, 'Duplicate inventory path'
actual=set()
for path in root.rglob('*'):
    assert not path.is_symlink(), 'Symlinks are outside the release allowlist'
    # A cloned repository adds local Git metadata, outside the project files.
    if path.relative_to(root).parts[0]=='.git':continue
    if path.is_file():actual.add(path.relative_to(root).as_posix())
assert actual==expected, 'Files do not match the public allowlist'
for item in files:
    relative=Path(item['path'])
    assert not relative.is_absolute() and '..' not in relative.parts
    path=root/relative
    assert path.stat().st_size==item['bytes'], 'Changed file length: '+item['path']
    assert hashlib.sha256(path.read_bytes()).hexdigest()==item['sha256'], 'Changed bytes: '+item['path']
assert hashlib.sha256((root/'hooks/register.js').read_bytes()).hexdigest()==manifest['runtimeSha256']
print('Public release 0.6.0 verified: '+str(len(expected))+' allowlisted files; all hashes match.')
