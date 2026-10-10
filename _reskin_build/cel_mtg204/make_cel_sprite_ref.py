# -*- coding: utf-8 -*-
"""Celebration Swiftie — the team's three sprite sheets (assets/UI/gif/, 6x6 x 504x896 each) turned into
three matched sheets the page drives frame-by-frame from the VO (round 2m, user 2026-09-30).

UNIVERSAL: nothing here is lesson-specific. Any lesson reuses the three output sheets as they are; only
the lip-sync track (made by the builder from that lesson's own celebration VO) differs.

  swiftie_shabaash  «शाबाश!» jump — played over the first word of the VO
  swiftie_talk      talking loop — frames picked per syllable (open / closed mouth)
  swiftie_happy_idle after the VO — only its mouth-closed frames are used, so she never "talks" in silence

The generator drew the three at DIFFERENT scales (standing height 558 / 641 / 611 px), so switching
sheets would make her jump in size. Each sheet is scaled so its standing first frame matches the talk
sheet's (height), aligned at the feet and centred, on one shared canvas with head-room for the jump.

Outputs  assets/UI/cel_shabaash.webp, cel_talk.webp, cel_idle.webp   (6x6, identical frame size)
         scripts/_cel_sprite.json   (frame size + measured open-mouth frames per sheet)
Run: python scripts/make_cel_sprite.py
"""
import os, json
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..", "assets", "UI", "gif")
UI = os.path.join(HERE, "..", "assets", "UI")
CW, CH = 504, 896
SHEETS = [("shabaash", "swiftie_shabaash.png"), ("talk", "swiftie_talk.png"), ("idle", "swiftie_happy_idle.png")]
# canvas in talk-sheet pixels: 30 px to spare on each side of the cell, jump head-room on top
CX0, CX1, CY0, CY1 = -40, 544, 0, 780
OUT_H = 440                                           # sheet frame height (shown ~400 px tall)

def cells(path):
    im = Image.open(path).convert("RGBA")
    return [im.crop(((i % 6) * CW, (i // 6) * CH, (i % 6 + 1) * CW, (i // 6 + 1) * CH)) for i in range(36)]

def solid_bbox(f):
    return f.getchannel("A").point(lambda v: 255 if v > 100 else 0).getbbox()

def mouth_px(f):
    """dark/pink pixels inside the beak box — open ~2800-4000, closed ~500-1500 on these sheets"""
    px = f.load(); x0, y0, x1, y1 = f.getchannel("A").getbbox()
    xs, ys = [], []
    for y in range(y0, y0 + int((y1 - y0) * .45)):
        for x in range(x0, x1):
            r, g, b, a = px[x, y]
            if a > 200 and r > 215 and 140 < g < 210 and b < 100: xs.append(x); ys.append(y)
    m = 0
    for y in range(min(ys), max(ys) + 1):
        for x in range(min(xs), max(xs) + 1):
            r, g, b, a = px[x, y]
            if a > 200 and ((r < 150 and g < 80 and b < 80) or (r > 160 and 70 < g < 160 and 70 < b < 160 and r - g > 45)):
                m += 1
    return m

data = {name: cells(os.path.join(SRC, fn)) for name, fn in SHEETS}
ref = solid_bbox(data["talk"][0])                     # the talk sheet's standing first frame
ref_h, ref_bottom, ref_cx = ref[3] - ref[1], ref[3], (ref[0] + ref[2]) / 2
k_out = OUT_H / (CY1 - CY0)
FW, FH = round((CX1 - CX0) * k_out), OUT_H
meta = {"cols": 6, "frames": 36, "fw": FW, "fh": FH, "canvas": [CX1 - CX0, CY1 - CY0],
        "stand_h": ref_h, "sheets": {}}
# measured (and checked by eye on a zoomed face sheet): mouth open above this many pixels
OPEN_AT = {"shabaash": 1500, "talk": 2000, "idle": 1500}
for name, _ in SHEETS:
    fr = data[name]
    b = solid_bbox(fr[0])
    s = ref_h / (b[3] - b[1])                          # scale to the talk sheet's standing height
    cx, bottom = (b[0] + b[2]) / 2, b[3]
    sheet = Image.new("RGBA", (FW * 6, FH * 6), (0, 0, 0, 0))
    for i, f in enumerate(fr):
        g = f.resize((round(CW * s), round(CH * s)), Image.LANCZOS)
        # place so this sheet's standing feet/centre land on the talk sheet's, then into the canvas
        ox = ref_cx - cx * s - CX0
        oy = ref_bottom - bottom * s - CY0
        canvas = Image.new("RGBA", (CX1 - CX0, CY1 - CY0), (0, 0, 0, 0))
        canvas.alpha_composite(g, (round(ox), round(oy))) if ox >= 0 and oy >= 0 else canvas.paste(g, (round(ox), round(oy)), g)
        sheet.alpha_composite(canvas.resize((FW, FH), Image.LANCZOS), ((i % 6) * FW, (i // 6) * FH))
    out = os.path.join(UI, "cel_%s.webp" % name)
    sheet.save(out, "WEBP", quality=80, method=4)
    mouth = [mouth_px(f) for f in fr]
    meta["sheets"][name] = {"src": "assets/UI/cel_%s.webp" % name, "scale": round(s, 4),
                            "open": [i for i, m in enumerate(mouth) if m > OPEN_AT[name]], "mouth_px": mouth}
    print("%-9s scale %.3f  %4d KB  open %s" % (name, s, os.path.getsize(out) // 1024, meta["sheets"][name]["open"]))
json.dump(meta, open(os.path.join(HERE, "_cel_sprite.json"), "w"), indent=1)
print("frame %dx%d" % (FW, FH))
