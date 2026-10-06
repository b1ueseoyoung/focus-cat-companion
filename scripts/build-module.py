"""Rebuild the standalone hooks module using only the Python standard library."""
from pathlib import Path
import hashlib
import re

root = Path(__file__).resolve().parents[1]
core = (root / 'src/timer-core.js').read_text(encoding='utf-8')
# Source exports let tests exercise the actual timer, rather than a legacy copy.
core = re.sub(r'^export (?=const |function )', '', core, flags=re.MULTILINE)
companion = (root / 'src/companion-core.js').read_text(encoding='utf-8')
native = (root / 'src/native-raster.js').read_text(encoding='utf-8')
integration = (root / 'hooks/integration.js').read_text(encoding='utf-8')
module = '// Self-contained original pixel companion: approved four rows; preserved independent local timer.\n' + core + companion + '\n' + native + '\n' + integration
target = root / 'hooks/register.js'
with target.open('w', encoding='utf-8', newline='\n') as output:
    output.write(module)
print('hooks/register.js SHA256 ' + hashlib.sha256(target.read_bytes()).hexdigest())
