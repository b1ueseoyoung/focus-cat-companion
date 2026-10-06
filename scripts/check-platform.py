"""Run portable regressions in an isolated copy; no credentials or model calls."""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import platform
import shutil
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
SPECIAL_DIRECTORY = "Focus cat 한글 # paths"


def copy_release(source: Path, destination: Path) -> None:
    """Copy only the release inventory, never Git metadata or user storage."""
    source = source.resolve()
    manifest = json.loads((source / "RELEASE_MANIFEST.json").read_text(encoding="utf-8"))
    paths = [item["path"] for item in manifest["files"]] + ["RELEASE_MANIFEST.json"]
    for name in paths:
        relative = Path(name)
        original = source / relative
        if relative.is_absolute() or ".." in relative.parts or not original.resolve().is_relative_to(source):
            raise ValueError(f"Release path leaves the project: {name!r}")
        target = destination / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(original, target)


def child_environment() -> dict[str, str]:
    env = os.environ.copy()
    env.update(PYTHONUTF8="1", PYTHONIOENCODING="utf-8")
    # A developer override must not make the isolated tests import another checkout.
    env.pop("REVIEW_REPO", None)
    return env


def run(arguments: list[str], cwd: Path) -> None:
    # Argument vectors preserve spaces, Unicode and # without shell interpolation.
    print("Running: " + repr(arguments), flush=True)
    subprocess.run(arguments, cwd=cwd, env=child_environment(), check=True)


def executable(name: str) -> str:
    found = shutil.which(name)
    if not found:
        raise RuntimeError(f"{name} is required but was not found on PATH")
    if Path(found).suffix.lower() in {".bat", ".cmd"}:
        raise RuntimeError(f"Use the native {name} executable, not a batch wrapper: {found}")
    return str(Path(found).resolve())


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--with-claude", action="store_true",
        help="also run native Claude plugin validation and the official mocked SDK tests",
    )
    options = parser.parse_args()
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8", errors="backslashreplace")

    try:
        bun = executable("bun")
        claude = executable("claude") if options.with_claude else None
        print(f"Platform checks: {platform.system()} {platform.machine()}, Python {platform.python_version()}", flush=True)
        run([bun, "--version"], ROOT)
        run([sys.executable, str(ROOT / "scripts/verify-release.py")], ROOT)
        run([sys.executable, str(ROOT / "tests/test_platform.py")], ROOT)

        with tempfile.TemporaryDirectory(prefix="focus-cat-platform-") as temporary:
            project = Path(temporary) / SPECIAL_DIRECTORY
            copy_release(ROOT, project)
            expected_module = (project / "hooks/register.js").read_bytes()
            # The script must find its own project even when the caller's cwd differs.
            run([sys.executable, str(project / "scripts/build-module.py")], Path(temporary))
            if (project / "hooks/register.js").read_bytes() != expected_module:
                raise RuntimeError("Rebuilding hooks/register.js changed its committed bytes")
            run([sys.executable, str(project / "scripts/verify-release.py")], Path(temporary))
            tests = sorted("./" + path.relative_to(project).as_posix() for path in (project / "tests").glob("*.test.js"))
            if not tests:
                raise RuntimeError("No Bun regression suites found")
            # Explicit JS file arguments exclude the Claude-specific .test.ts SDK suites.
            run([bun, "test", *tests], project)
            if claude:
                run([claude, "--version"], project)
                run([claude, "plugin", "validate", str(project), "--strict", "--json"], project)
                run([claude, "plugin", "test", str(project)], project)
            else:
                print("Claude SDK tests not run (use --with-claude with a compatible native CLI).", flush=True)

        print("Portable checks passed. Interactive Claude UI and Windows Terminal appearance are not tested here.", flush=True)
        return 0
    except (OSError, RuntimeError, ValueError, subprocess.CalledProcessError) as error:
        print(f"Platform checks failed: {error}", file=sys.stderr, flush=True)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
