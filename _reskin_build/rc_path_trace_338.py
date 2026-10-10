"""[L02-RC1-FIG-2] (2026-10-10) Trace the car's first leg on the NEW carpet of the Figma 338-3 export (rc1_frame_338-3_export.png,
1280x720, 1x — frame px == Figma px) and write rc_leg_338_source.json for build.py, in the shape of rc_leg_source.json's legs.

The carpet moved a little in this frame and the first checkpoint moved by (+24, +16), so RC1's leg1 from rc_leg_source.json (traced
on the old picture) would run beside the new carpet and stop short of the new "?". Only RC1 shows this picture; RC2-RC4 keep the old one
and their legs. Run once: `python _reskin_build/rc_path_trace_338.py`. Pillow + numpy only.

How: the carpet's pixels (pink / lilac stripes, the blue bobbled edges) are masked; per column its vertical midpoint is the centre line
(for a band of even thickness that IS the centre line, whatever its slope); across the baked car's columns the line is interpolated,
and under the first "?" (which hides the carpet) it is blended into the disc's centre; the line is smoothed along x. The leg starts at
the car's own centre (the car sits a little above the carpet's middle, like the Figma's) and eases onto the line over its first 40%,
then veers off onto the checkpoint's centre over its last half — the same shaping as rc_path_trace.py — and is resampled every 2 px."""
import os, json, math
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "rc1_frame_338-3_export.png")
OUT = os.path.join(HERE, "rc_leg_338_source.json")
BOX = (153.0, 172.0)                                   # the picture box's outer corner in the frame (box coords = frame - BOX)
CAR_BOX, CAR_SIZE = (49.09, 208.09), 76.82             # RC1's car at rest in this frame (box coords), see build.py [L02-RC1-FIG-2]
START = (CAR_BOX[0] + CAR_SIZE / 2, CAR_BOX[1] + CAR_SIZE / 2)
TOKEN1 = (203.0, 306.0)                                # the first checkpoint's box (104x102) in this frame
END = (TOKEN1[0] + 52.0, TOKEN1[1] + 51.0)
CAR_COLS = (196, 290)                                  # frame columns the baked car covers (interpolated across)
SPEED = 66.0                                           # px/s, as the other legs

a = np.array(Image.open(SRC).convert("RGB")).astype(int); r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
pink = (r > 215) & (g > 150) & (g < 210) & (b > 150) & (b < 220) & (r - g > 25)
lav = (b > 200) & (r > 150) & (r < 220) & (g > 135) & (g < 205) & (b - r > 30)
bob = (b > 150) & (b < 240) & (r > 40) & (r < 160) & (g > 40) & (g < 160) & (b - r > 60)
carpet = pink | lav | bob
disc_cx, disc_cy = END[0] + BOX[0], END[1] + BOX[1]
mid = {}
for x in range(160, int(disc_cx) + 1):
    if CAR_COLS[0] <= x <= CAR_COLS[1] or x > disc_cx - 54: continue
    rows = np.where(carpet[385:647, x])[0]
    if len(rows) >= 10: mid[x] = (770 + rows.min() + rows.max()) / 2.0
xs = np.array(sorted(mid)); ys = np.array([mid[x] for x in xs]); k = 11
ys_s = np.convolve(np.pad(ys, (k // 2, k // 2), mode="edge"), np.ones(k) / k, mode="valid")
def line_at(x):
    if x > disc_cx - 54:
        t = min(1.0, (x - (disc_cx - 54)) / 54.0); return float(np.interp(disc_cx - 54, xs, ys_s)) * (1 - t) + disc_cy * t
    return float(np.interp(x, xs, ys_s))
def smooth(a_, b_, u):
    t = min(1.0, max(0.0, (u - a_) / (b_ - a_))); return t * t * (3 - 2 * t)
sx, sy = START[0] + BOX[0], START[1] + BOX[1]; ex, ey = END[0] + BOX[0], END[1] + BOX[1]
off0 = sy - line_at(sx); off1 = ey - line_at(ex); n = int(abs(ex - sx) * 2)
pts = []
for i in range(n + 1):
    u = i / n; x = sx + (ex - sx) * u
    pts.append((x - BOX[0], line_at(x) + off0 * (1 - smooth(0.0, 0.4, u)) + off1 * smooth(0.5, 1.0, u) - BOX[1]))
cum = [0.0]
for p, q in zip(pts, pts[1:]): cum.append(cum[-1] + math.hypot(q[0] - p[0], q[1] - p[1]))
L = cum[-1]; m = max(2, int(round(L / 2.0))); leg = []
for j in range(m + 1):
    d = L * j / m; i = 1
    while i < len(cum) - 1 and cum[i] < d: i += 1
    p, q = pts[i - 1], pts[i]; seg = cum[i] - cum[i - 1]; t = (d - cum[i - 1]) / seg if seg else 0.0
    leg.append([round(p[0] + (q[0] - p[0]) * t, 2), round(p[1] + (q[1] - p[1]) * t, 2)])
leg[0] = [round(START[0], 2), round(START[1], 2)]; leg[-1] = [round(END[0], 2), round(END[1], 2)]
headings = [round(math.degrees(math.atan2(leg[i + 1][1] - leg[i - 1][1], leg[i + 1][0] - leg[i - 1][0])), 1) for i in range(1, len(leg) - 1, max(1, len(leg) // 12))]
out = {"src": os.path.basename(SRC), "scale": 1.0, "origin": list(BOX), "legs": {"leg1": {
    "start": [round(START[0], 3), round(START[1], 3)], "end": list(END), "ridge_off_at_start": round(off0, 2), "ridge_off_at_end": round(off1, 2),
    "length": round(L, 1), "seconds": round(L / SPEED, 2), "pts": leg, "headings_deg": headings}}}
json.dump(out, open(OUT, "w"), indent=0)
print("leg1: %d points, %.1f box px -> %.2f s; start off the line %.1f px, end off %.1f px; headings %s" % (len(leg), L, L / SPEED, off0, off1, headings))
