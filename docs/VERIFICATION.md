# Verification scope — 0.6.0

Before packaging, the unchanged runtime passed 85 isolated tests on Claude Code 2.1.289 and Bun 1.4.2: 28 official SDK tests and 57 Bun tests, zero failures. Strict validation passed with zero errors/warnings. The installed runtime's official 28 tests and strict check also passed. Public packaging does not repeat the entire suite. It checks the allowlist, privacy exclusions, archive contents and minimum source/asset regeneration instead. Raw local test logs and internal receipts are excluded.

| Existing test group | Passed | Scope |
| --- | --- | --- |
| integration | 9 | Timer transitions, four-focus long break, manual next, deduplication and suspension/recovery |
| four-row Raster | 6 | Cell packing, bounds, approval freeze and independent timer |
| dance integration | 13 | A/B one-shot completion, errors/abort/refusal, approval, motion, stale UI and interrupted playback |
| reload | 13 | Ownership fences, no replay and delayed old callback rejection |
| character selection | 13 | A/B persistence, preference merging and timer isolation |
| pixel core | 15 | PNG oracle, transparency, clipping, walking and boundary turns |
| dance core | 16 | Fixed face/anchor, eight timing slots, offsets, freeze and 960ms finish |

Runtime entry SHA256: ee54062702352ce24215e94ffa42acd30aacda6f1e9d76a6d43e635bc195f6bd. Timer core SHA256: b964907742df9c9ee1fb04272675e044355058fe2618fe3f6a84c748d54560a0. Public runtime sources remain identical to the validated 0.6.0 sources; only packaging documents and portable asset-builder paths change.

preview/simulated-events-native-raster.png and .gif are actual native Terminal crops, at half Retina backing size, driven by simulated local lifecycle events. They show walking, edge turns, approval hold, resume, a completion dance and static rest. The GIF band is 499×128 and replays a 15.2s demonstration; production dance runs once. Capture sampling is 200ms and does not represent every 120ms dance frame. Asset regeneration and existing core tests cover all eight frames.

Not verified: real model-turn event timing, native tool approval/reload sequence, OS sleep/wake, force termination or Windows/Linux rendering. No real model prompt or real user timer command was submitted for previews. The Mod does not control host model/effort. Visual size depends on terminal font. Timer pauses after a host clock gap over 10 seconds; shorter gaps count as elapsed time. Force termination can lose time since the last snapshot. An already-issued persistent store write is not a multi-key atomic transaction.

The public-review archive and GitHub source share the same 0.6.0 runtime and pixel assets. The GitHub copy adds clone instructions and permits local root Git metadata during file verification. The source-file allowlist and byte checks remain enforced.
