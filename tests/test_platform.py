"""Filesystem and encoding regressions using only the Python standard library."""
import ast
import json
from pathlib import Path
import runpy
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
CHECK = runpy.run_path(str(ROOT / "scripts/check-platform.py"))
BUILD_INPUTS = (
    "src/timer-core.js", "src/companion-core.js",
    "src/native-raster.js", "hooks/integration.js",
)


class PlatformTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="focus-cat-files-")
        self.addCleanup(self.temporary.cleanup)
        self.foreign_cwd = Path(self.temporary.name)
        self.project = self.foreign_cwd / CHECK["SPECIAL_DIRECTORY"]
        CHECK["copy_release"](ROOT, self.project)
        self.expected_module = (self.project / "hooks/register.js").read_bytes()

    def script(self, name):
        return subprocess.run(
            [sys.executable, str(self.project / "scripts" / name)],
            cwd=self.foreign_cwd, env=CHECK["child_environment"](),
            capture_output=True, text=True, encoding="utf-8", errors="replace",
        )

    def test_build_is_byte_stable_from_foreign_directory(self):
        result = self.script("build-module.py")
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        rebuilt = (self.project / "hooks/register.js").read_bytes()
        self.assertEqual(rebuilt, self.expected_module)
        self.assertNotIn(b"\r\n", rebuilt)
        self.assertFalse(rebuilt.startswith(b"\xef\xbb\xbf"))
        rebuilt.decode("utf-8", errors="strict")

    def test_crlf_sources_rebuild_to_identical_utf8_lf_module(self):
        for name in BUILD_INPUTS:
            path = self.project / name
            original = path.read_bytes().replace(b"\r\n", b"\n")
            path.write_bytes(original.replace(b"\n", b"\r\n"))
        result = self.script("build-module.py")
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertEqual((self.project / "hooks/register.js").read_bytes(), self.expected_module)

    def test_release_verifies_from_space_unicode_and_hash_path(self):
        result = self.script("verify-release.py")
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_release_rejects_same_length_runtime_corruption(self):
        module = self.project / "hooks/register.js"
        original = module.read_bytes()
        module.write_bytes(bytes([original[0] ^ 1]) + original[1:])
        result = self.script("verify-release.py")
        self.assertNotEqual(result.returncode, 0, "Corrupted runtime unexpectedly verified")
        self.assertIn("Changed bytes: hooks/register.js", result.stderr)

    def test_frame_metadata_writer_uses_lf_and_preserves_unicode_values(self):
        # Exercise the production writer without importing Pillow or regenerating art.
        source = (self.project / "scripts/build-native-four-row-frames.py").read_text(encoding="utf-8")
        tree = ast.parse(source)
        writer = next(node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == "write_json")
        namespace = {"json": json}
        exec(compile(ast.Module(body=[writer], type_ignores=[]), "metadata-writer", "exec"), namespace)
        target = self.project / "한글 # metadata.json"
        payload = {"name": "고양이", "rows": 4, "palette": ["#FFFFFF", None]}
        namespace["write_json"](target, payload)
        content = target.read_bytes()
        self.assertNotIn(b"\r\n", content)
        self.assertTrue(content.endswith(b"\n"))
        self.assertFalse(content.startswith(b"\xef\xbb\xbf"))
        self.assertEqual(json.loads(content.decode("utf-8", errors="strict")), payload)


if __name__ == "__main__":
    unittest.main(verbosity=2)
