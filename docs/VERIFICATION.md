# Verification scope — 0.6.0

The original public 0.6.0 archive passed 85 isolated tests. The current source includes the timer-storage concurrency fix and passes 101 isolated tests on Claude Code 2.1.289 and Bun 1.4.2: 32 official SDK tests and 69 Bun tests, zero failures. Strict validation passed with zero errors/warnings. Test stores, sessions and tool calls use synthetic data; no installed user Mod or user timer records were changed.

| Existing test group | Passed | Scope |
| --- | --- | --- |
| integration | 9 | Timer transitions, four-focus long break, manual next, deduplication and suspension/recovery |
| four-row Raster | 6 | Cell packing, bounds, approval freeze and independent timer |
| dance integration | 13 | A/B one-shot completion, errors/abort/refusal, approval, motion, stale UI and interrupted playback |
| reload | 13 | Ownership fences, no replay and delayed old callback rejection |
| character selection | 13 | A/B persistence, preference merging and timer isolation |
| pixel core | 15 | PNG oracle, transparency, clipping, walking and boundary turns |
| dance core | 16 | Fixed face/anchor, eight timing slots, offsets, freeze and 960ms finish |
| timer concurrency | 12 | Overlapping tick/pause/reset/hide, reload, CAS retry, rejected-command isolation and partial-commit recovery |
| timer storage SDK | 4 | Rejected writes, safe next retry and ownership loss after a timer commit |

Runtime entry SHA256: c5f6238d907a3f2153ba65110a0d05b0af9c25c76d5626696515e0ef0852ba03. Timer core SHA256: b964907742df9c9ee1fb04272675e044355058fe2618fe3f6a84c748d54560a0. The timer core and pixel assets are unchanged; the integration serializes timer mutations and storage, checks conditional-write results, and discards obsolete queued work at session boundaries. Timer commands stage changes until the host accepts them; rejected writes leave the local timer unchanged. If the host committed a change but later persistence fails, the command preserves that change and asks the user to check status before retrying.

preview/simulated-events-native-raster.png and .gif are actual native Terminal crops, at half Retina backing size, driven by simulated local lifecycle events. They show walking, edge turns, approval hold, resume, a completion dance and static rest. The GIF band is 499×128 and replays a 15.2s demonstration; production dance runs once. Capture sampling is 200ms and does not represent every 120ms dance frame. Asset regeneration and existing core tests cover all eight frames.

User-verified on macOS, 2026-10-06: the user directly confirmed cat motion during actual model replies. This is a user report, not an agent-observed real model turn. It does not establish exact completion-dance timing or deduplication, native approval-wait behavior, sleep/wake behavior, or other operating systems. The included preview images remain simulated-event captures.

Not independently verified: precise real model-turn event timing, completion-dance timing/deduplication during a real turn, native tool approval/reload sequence, OS sleep/wake, force termination or Windows/Linux rendering. No real model prompt or real user timer command was submitted by the agent for previews. The Mod does not control host model/effort. Visual size depends on terminal font. Timer pauses after a host clock gap over 10 seconds; shorter gaps count as elapsed time. Force termination can lose time since the last snapshot. An already-issued persistent store write is not a multi-key atomic transaction.

The GitHub source includes fixes after the original public-review archive; pixel assets remain unchanged. The GitHub copy adds clone instructions and permits local root Git metadata during file verification. The source-file allowlist and byte checks remain enforced.
