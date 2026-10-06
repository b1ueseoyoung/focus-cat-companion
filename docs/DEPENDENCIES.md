# Dependencies

| Component | Use | Bundled? |
| --- | --- | --- |
| Claude Code 2.1.289 / 2.1.290 | Verified Mod host, official mock tests and terminal Raster | No |
| Bun 1.4.2 | Pure core, reload and selection tests | No |
| Python 3.9.6 / 3.12.14 | Original standard-library module and integrity scripts | No |
| Python 3.10+ (CI 3.12; local 3.14.8) | Portable check runner and filesystem/encoding regressions | No |
| Pillow 12.3.0 | Optional offline frame/raster generation | No |

hooks/register.js is self-contained and has no runtime imports. It uses only host command, session, store, state, clock and UI APIs. It observes lifecycle events and forwards normal results. It does not call a model, launch a process, select model/effort, read an account file or send network traffic. The host's own service behavior is separate.

Official tests import the host-provided virtual claude-code/testing API. Bun tests use built-in modules and in-memory stubs. The package contains no binaries, generated host SDK, vendor tree, font, account data, real records or package-manager lockfile. Pillow is needed only to rebuild pixels; runtime uses embedded Raster cells. Separately installed tools retain their provider's terms.
