# Pixel sources and frame provenance

Original art is directly authored integer pixel data. The complete 32×32 RGBA PNGs and editable palette/grid JSONs for A and B are in assets/characters/. Their provenance flags record no external assets or image generation. The grid data is included as the editable source; historical authoring-script labels in its provenance are descriptive and are not runtime dependencies.

assets/characters/source-eight-pixels/ contains the original nearest-neighbor 8×8 samples used for the four-row renderer. The canonical A hold PNG is byte-identical to size-a-8.png: SHA256 029cb6efe136e2b314e0f98f46e1b0133a44820783ec3c664a6429f862e38c6d. The 32×32 originals are provenance inputs, not the runtime display. B modifies four sample pixels: two dark eyes and two feet at floor y=7.

scripts/build-native-four-row-frames.py makes integer-pixel edits of the included 8×8 samples. Each cat has four 240ms walk frames, one hold frame, two identical static rest frames, and eight 120ms dance frames. Dance lasts 960ms and runs once on normal reply completion. First and last dance frames match hold; face rows 0–4 are fixed. Only the lower torso/paws bob, and the runtime adds clamped offsets of at most one terminal column. All frames use the original palette, binary alpha, 8×8 canvas and anchor [4,7], with no antialiasing. No eye-blink animation is represented at this resolution.

assets/characters/native-four-rows/playback.json lists every PNG/grid path, source hash, B edits, timing, anchor and one-shot constraint. Rebuilding also writes explicitly labeled asset-only contact sheets/GIFs under preview/assets/. scripts/build-native-raster.py embeds the PNG pixels in src/native-raster.js. scripts/build-module.py produces the standalone runtime entry.

The official terminal Raster packs two vertical pixels into each of four rows, eight character columns per cat. Transparent pixels use the host default color token to preserve the terminal background. This does not create a transparent desktop window. Runtime performs no image decoding, file loading or network request.

No sprite-gen, image-generation provider, external character asset, third-party sprite, or external generation commit is used or claimed. Included code and project-authored pixel data are under MIT, Copyright (c) 2026 이서영.

The cropped PNG/GIF in preview/ shows an actual Terminal Raster driven by simulated local events and an in-memory demo timer. It is labeled SIMULATED; no real model turn is represented. Full-screen captures, user references/handoff material, accounts, preferences, usage records and raw test logs are excluded.
