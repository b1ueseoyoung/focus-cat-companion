#!/usr/bin/env python3
"""Preserve the approved A 8x8 raster; make minimal direct pixel frames.

Offline Pillow build only. No generator, sprite-gen, model call, timer state,
terminal integration, source-image stretch, or changes to 32px originals.
"""
import hashlib
import json
import shutil
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "characters" / "native-four-rows"
SOURCE_PIXELS = ROOT / "assets" / "characters" / "source-eight-pixels"
ASSET_PREVIEW = ROOT / "preview" / "assets"
TRANSPARENT = (0, 0, 0, 0)


def color(value):
    return tuple(bytes.fromhex(value[1:])) + (255,)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def pixels(image):
    return [["#%02X%02X%02X" % image.getpixel((x, y))[:3]
             if image.getpixel((x, y))[3] else None
             for x in range(8)] for y in range(8)]


def walk(original, character, palette, phase):
    frame = original.copy()
    if phase == 0:
        return frame
    outline = color(palette["outline"] if character == "a" else palette["ginger"])
    for x in range(8):
        frame.putpixel((x, 7), TRANSPARENT)
    positions = ((3, 5), (2, 5), (3, 6), (3, 5))[phase]
    for x in positions:
        frame.putpixel((x, 7), outline)
    if character == "a":
        if phase == 1:
            # Tip moves down one pixel, remaining next to the ginger tail root.
            frame.putpixel((7, 5), TRANSPARENT)
            frame.putpixel((7, 6), outline)
        elif phase == 3:
            frame.putpixel((7, 5), TRANSPARENT)
            frame.putpixel((6, 5), outline)
    else:
        if phase == 1:
            frame.putpixel((7, 6), color(palette["cream"]))
        elif phase == 3:
            # One-pixel inward flex of the low cream tail end.
            frame.putpixel((6, 6), TRANSPARENT)
    return frame


def dance(original, character, palette, phase):
    """In-place lower-body bob and one-pixel paw waves; face rows 0..4 fixed."""
    frame = original.copy()
    if phase in (0, 7):
        return frame
    outline = color(palette["outline"] if character == "a" else palette["ginger"])
    if phase in (2, 3, 5):
        # Shift only two lower-torso columns upward by one integer pixel.
        # The ground feet on y=7 stay planted; the face never translates.
        for x in (3, 4):
            frame.putpixel((x, 5), original.getpixel((x, 6)))
            frame.putpixel((x, 6), original.getpixel((x, 7)))
    if phase in (1, 2, 4, 5):
        frame.putpixel((1, 5), outline)
    if phase in (3, 4, 5, 6):
        frame.putpixel((6, 5), outline)
    return frame


def export(image, name, palette, state, index):
    path = OUT / f"{name}.png"
    image.save(path)
    grid = {
        "width": 8, "height": 8, "pixelFormat": "RGBA", "anchor": [4, 7],
        "terminalRows": 4, "terminalColumns": 8,
        "palette": palette, "pixels": pixels(image), "state": state,
        "frameIndex": index, "origin": "Direct integer-pixel edits of the approved 8x8 raster",
        "externalAssetsUsed": False, "imageGenerationUsed": False,
        "spriteGenUsed": False, "antialiasing": False,
    }
    (OUT / f"{name}.grid.json").write_text(json.dumps(grid, indent=2) + "\n", encoding="utf-8")
    return {"png": path.name, "grid": f"{name}.grid.json"}


def preview(all_frames):
    labels = ["walk 0", "walk 1", "walk 2", "walk 3", "rest 0", "rest 1", "hold"]
    font = ImageFont.load_default(size=14)
    sheet = Image.new("RGB", (1120, 400), "#F2EEE6")
    d = ImageDraw.Draw(sheet)
    for row, character in enumerate("ab"):
        state_frames = all_frames[character]["walk"] + all_frames[character]["rest"] + all_frames[character]["hold"]
        for col, frame in enumerate(state_frames):
            large = frame.resize((128, 128), Image.Resampling.NEAREST)
            xy = (col * 160 + 16, row * 184 + 36)
            sheet.paste(large, xy, large)
            d.text((xy[0], row * 184 + 12), f"{character.upper()} · {labels[col]}", font=font, fill="#725A4C")
    d.text((16, 376), "8x8 asset preview only; rest stays still. Eye closure is not represented at this resolution.", font=font, fill="#725A4C")
    sheet.save(ASSET_PREVIEW / "native-four-row-frames-contact-sheet.png")

    sequence = [("walk", i, 240) for _ in range(3) for i in range(4)]
    sequence += [("rest", 0, 2400), ("rest", 1, 180), ("hold", 0, 1400)]
    frames, durations = [], []
    for state, index, duration in sequence:
        canvas = Image.new("RGB", (480, 272), "#F2EEE6")
        d = ImageDraw.Draw(canvas)
        d.text((24, 12), "8x8 assets · terminal integration unverified", font=font, fill="#725A4C")
        for col, character in enumerate("ab"):
            frame = all_frames[character][state][index].resize((192, 192), Image.Resampling.NEAREST)
            canvas.paste(frame, (24 + col * 240, 44), frame)
            d.text((24 + col * 240, 244), f"{character.upper()} · {state}", font=font, fill="#725A4C")
        frames.append(canvas)
        durations.append(duration)
    frames[0].save(ASSET_PREVIEW / "native-four-row-frames-preview.gif", save_all=True,
                   append_images=frames[1:], duration=durations, loop=0,
                   disposal=2, optimize=False)


def dance_preview(all_frames):
    font = ImageFont.load_default(size=14)
    sheet = Image.new("RGB", (1280, 400), "#F2EEE6")
    d = ImageDraw.Draw(sheet)
    for row, character in enumerate("ab"):
        for index, frame in enumerate(all_frames[character]["dance"]):
            large = frame.resize((128, 128), Image.Resampling.NEAREST)
            xy = (index * 160 + 16, row * 184 + 36)
            sheet.paste(large, xy, large)
            d.text((xy[0], row * 184 + 12), f"{character.upper()} · dance {index}", font=font, fill="#725A4C")
    d.text((16, 376), "Asset preview: face fixed; only lower torso/paws bob. 8x120ms one-shot after normal reply completion.", font=font, fill="#725A4C")
    sheet.save(ASSET_PREVIEW / "native-four-row-dance-contact-sheet.png")
    gif = []
    for index in range(8):
        canvas = Image.new("RGB", (480, 272), "#F2EEE6")
        d = ImageDraw.Draw(canvas)
        d.text((24, 12), "8x8 asset dance only · 960ms one-shot", font=font, fill="#725A4C")
        for col, character in enumerate("ab"):
            frame = all_frames[character]["dance"][index].resize((192, 192), Image.Resampling.NEAREST)
            canvas.paste(frame, (24 + col * 240, 44), frame)
            d.text((24 + col * 240, 244), f"{character.upper()} · dance {index}", font=font, fill="#725A4C")
        gif.append(canvas)
    # No loop extension: this GIF plays the eight-frame celebration once.
    gif[0].save(ASSET_PREVIEW / "native-four-row-dance-preview.gif", save_all=True,
                append_images=gif[1:], duration=[120] * 8, disposal=2,
                optimize=False)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    ASSET_PREVIEW.mkdir(parents=True, exist_ok=True)
    preserved = {path.name: sha(path) for path in OUT.iterdir()
                 if path.is_file() and "-dance-" not in path.name and path.name != "playback.json"}
    source_paths = {c: SOURCE_PIXELS / f"size-{c}-8.png" for c in "ab"}
    source_hashes = {c: sha(path) for c, path in source_paths.items()}
    metadata = {
        "schemaVersion": 1, "width": 8, "height": 8, "pixelFormat": "RGBA",
        "terminalRows": 4, "terminalColumns": 8, "transparent": True,
        "anchor": [4, 7], "sourceAspectChanged": False,
        "generatedBy": "scripts/build-native-four-row-frames.py",
        "externalAssetsUsed": False, "imageGenerationUsed": False, "spriteGenUsed": False,
        "restBlinkRepresented": False,
        "restNote": "Both rest frames preserve the open-eye raster. The one-pixel eyes cannot retain their identity while depicting a closed lid.",
        "pauseBehavior": "Freeze the currently displayed frame; do not advance to the separate static hold pose on pause",
        "previewLimit": "Raster asset previews only; not evidence of native terminal or actual model-turn behavior",
        "characters": {},
    }
    all_frames = {}
    for c in "ab":
        source = Image.open(source_paths[c])
        assert source.mode == "RGBA" and source.size == (8, 8)
        original = source.copy()
        palette = json.loads((ROOT / "assets" / "characters" / f"character-{c}.grid.json").read_text())["palette"]
        changes = []
        if c == "b":
            for point in ((2, 3), (5, 3)):
                original.putpixel(point, color(palette["ink"]))
                changes.append({"x": point[0], "y": point[1], "color": palette["ink"], "purpose": "restore separated dark eye"})
            for point in ((3, 7), (5, 7)):
                original.putpixel(point, color(palette["ginger"]))
                changes.append({"x": point[0], "y": point[1], "color": palette["ginger"], "purpose": "align foot floor to y=7"})
        hold_entry = export(original, f"character-{c}", palette, "hold", 0)
        if c == "a":
            shutil.copyfile(source_paths[c], OUT / "character-a.png")
            assert sha(OUT / "character-a.png") == source_hashes[c]
        frames = {
            "walk": [walk(original, c, palette, i) for i in range(4)],
            "rest": [original.copy(), original.copy()],
            "hold": [original.copy()],
            "dance": [dance(original, c, palette, i) for i in range(8)],
        }
        assert len({frame.tobytes() for frame in frames["walk"]}) == 4
        assert len({frame.tobytes() for frame in frames["dance"][1:7]}) >= 4
        assert frames["dance"][0].tobytes() == frames["dance"][7].tobytes() == original.tobytes()
        assert all(frame.crop((0, 0, 8, 5)).tobytes() == original.crop((0, 0, 8, 5)).tobytes()
                   for state in ("walk", "dance") for frame in frames[state])
        states = {}
        for state, state_frames in frames.items():
            entries = []
            for index, frame in enumerate(state_frames):
                assert frame.getbbox()[3] - 1 == 7
                assert {pixel[3] for pixel in frame.get_flattened_data()} <= {0, 255}
                assert {pixel for row in pixels(frame) for pixel in row if pixel} <= set(palette.values())
                entries.append(export(frame, f"character-{c}-{state}-{index:02d}", palette, state, index))
                if c == "a" and frame.tobytes() == source.tobytes():
                    shutil.copyfile(source_paths[c], OUT / entries[-1]["png"])
            states[state] = {
                "frames": entries, "durationsMs": [240] * 4 if state == "walk" else [120] * 8 if state == "dance" else [0, 0] if state == "rest" else [0],
                "loop": state == "walk", "static": state not in ("walk", "dance"),
                "anchor": [4, 7], "freezeOnPause": True,
            }
            if state == "dance":
                states[state].update({
                    "oneShot": True, "durationMs": 960,
                    "normalReplyCompletionOnly": True,
                    "protectedPixelRows": [0, 4],
                    "limit": "Bob affects lower torso and paws; face stays fixed",
                    "horizontalOffsetIncluded": False,
                })
        metadata["characters"][c] = {
            "canonicalHold": hold_entry, "approvedEightPixelReference": source_paths[c].name,
            "referenceSha256": source_hashes[c], "holdSha256": sha(OUT / f"character-{c}.png"),
            "palette": palette, "anchor": [4, 7], "nativeEdits": changes,
            "approvedAUnchanged": c == "a", "states": states,
        }
        all_frames[c] = frames
    assert source_hashes == {c: sha(path) for c, path in source_paths.items()}
    (OUT / "playback.json").write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    preview(all_frames)
    dance_preview(all_frames)
    assert all(sha(OUT / name) == digest for name, digest in preserved.items())
    print("Approved A and existing hold/walk/rest files unchanged; eight 120ms dance frames each; face rows0..4 fixed; lower torso/paws only; 8x8 anchored [4,7]")


if __name__ == "__main__":
    main()
