"""[L02-RC-FIG] (2026-10-05) Trace the striped carpet's centre line in the RC-car scene picture (rc_scene_image239_source.png, the Figma
"image 239" export, 1672x941) and write the car's first leg — from its rest centre to the first checkpoint's centre — as
rc_leg_source.json, which build.py embeds in the card (data.rc.leg.pts, Figma box coords). Run once after the picture or the Figma
positions change: `python _reskin_build/rc_path_trace.py`. Needs Pillow + numpy only.

How: carpet pixels (the pink and lilac stripes and the blue bead borders) are masked, small holes closed, a chamfer distance transform
taken, and the ridge of that transform (the row of greatest distance to the carpet's edge, per column) is the band's centre line — right
on a straight stretch at any slope, and within a pixel or two through the bends. The ridge is smoothed along x, cut between the car's
start column and the checkpoint's column, nudged by a linear ramp so it begins exactly at the car's rest centre and ends exactly at the
checkpoint's centre (both a few px off the ridge), converted to Figma box coords and resampled every 2 px of arc length."""
import os, json, math
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "rc_scene_image239_source.png")
OUT = os.path.join(HERE, "rc_leg_source.json")

# the Figma geometry (box OUTER coords; see build.py [L02-RC-FIG])
FIG_IMG = (-1.0, -35.0, 976.0, 550.0)          # image 239 in the box
CAR_BOX, CAR_SIZE = (64.0, 230.6), 54.404      # the car at rest
CP1 = (179.0 + 52.0, 290.0 + 51.0)             # the first checkpoint's centre
START = (CAR_BOX[0] + CAR_SIZE / 2, CAR_BOX[1] + CAR_SIZE / 2)

im = Image.open(SRC).convert("RGB"); W, H = im.size
S = max(FIG_IMG[2] / W, FIG_IMG[3] / H)        # object-fit: cover scale (the 550 height rules: 0.58448)
OX = FIG_IMG[0] - (W * S - FIG_IMG[2]) / 2     # the picture's left edge in box coords (0.65 px cropped each side)
OY = FIG_IMG[1]
def to_box(x, y): return (x * S + OX, y * S + OY)
def to_src(bx, by): return ((bx - OX) / S, (by - OY) / S)

a = np.asarray(im).astype(int); r, g, b = a[..., 0], a[..., 1], a[..., 2]
pink = (r > 225) & (g > 165) & (g < 215) & (b > 165) & (b < 225)
lilac = (b > 220) & (r > 170) & (r < 235) & (g > 150) & (g < 200)
blue = (b > 140) & (b > r + 60) & (b > g + 60)
mask = Image.fromarray(((pink | lilac | blue) * 255).astype(np.uint8))
mask = mask.filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.MinFilter(7))      # close the beads' dark outlines / highlights
M = np.asarray(mask) > 0

# chamfer (3,4) distance transform inside the carpet
INF = 10 ** 6
D = np.where(M, INF, 0).astype(np.int64)
for y in range(1, H):
    row = D[y]
    up = D[y - 1]
    cand = np.minimum(up + 3, np.concatenate(([INF], up[:-1])) + 4)
    cand = np.minimum(cand, np.concatenate((up[1:], [INF])) + 4)
    row[:] = np.minimum(row, cand)
    for x in range(1, W): row[x] = min(row[x], row[x - 1] + 3)      # the within-row pass is sequential (a few seconds in all)
for y in range(H - 2, -1, -1):
    row = D[y]
    dn = D[y + 1]
    cand = np.minimum(dn + 3, np.concatenate(([INF], dn[:-1])) + 4)
    cand = np.minimum(cand, np.concatenate((dn[1:], [INF])) + 4)
    row[:] = np.minimum(row, cand)
    for x in range(W - 2, -1, -1): row[x] = min(row[x], row[x + 1] + 3)
D = D / 3.0

# the ridge, per column, over the first leg's span (with margins for the smoothing)
x0, _ = to_src(*START); x1, _ = to_src(*CP1)
cols = range(int(x0) - 30, int(x1) + 31)
ridge = {}
for x in cols:
    col = D[:, x]
    if col.max() <= 0: continue
    ridge[x] = int(col.argmax())
xs = np.array(sorted(ridge)); ys = np.array([ridge[x] for x in xs], dtype=float)
# smooth along x (Gaussian, sigma 8 px)
k = np.exp(-0.5 * (np.arange(-24, 25) / 8.0) ** 2); k /= k.sum()
pad = np.concatenate((np.full(24, ys[0]), ys, np.full(24, ys[-1])))
ys_s = np.convolve(pad, k, mode="valid")

def ridge_at(x):
    return float(np.interp(x, xs, ys_s))

# the leg in source px, one sample per 0.5 column, nudged to the exact endpoints: the car leaves its rest spot onto the centre line over
# the first 40% of the leg, rides the centre line, and veers into the checkpoint's centre (13 px off the line) over the last half
sx0, sy0 = to_src(*START); sx1, sy1 = to_src(*CP1)
off0 = sy0 - ridge_at(sx0); off1 = sy1 - ridge_at(sx1)
def smooth(a, b, u):
    t = min(1.0, max(0.0, (u - a) / (b - a))); return t * t * (3 - 2 * t)
n = int((sx1 - sx0) * 2)
pts_src = []
for i in range(n + 1):
    u = i / n; x = sx0 + (sx1 - sx0) * u
    pts_src.append((x, ridge_at(x) + off0 * (1 - smooth(0.0, 0.4, u)) + off1 * smooth(0.5, 1.0, u)))
pts_box = [to_box(x, y) for x, y in pts_src]
# resample every 2 px of arc length (box coords)
cum = [0.0]
for p, q in zip(pts_box, pts_box[1:]): cum.append(cum[-1] + math.hypot(q[0] - p[0], q[1] - p[1]))
L = cum[-1]; step = 2.0; m = max(2, int(round(L / step)))
leg = []
for j in range(m + 1):
    d = L * j / m; i = 1
    while i < len(cum) - 1 and cum[i] < d: i += 1
    p, q = pts_box[i - 1], pts_box[i]; seg = cum[i] - cum[i - 1]; t = (d - cum[i - 1]) / seg if seg else 0.0
    leg.append([round(p[0] + (q[0] - p[0]) * t, 2), round(p[1] + (q[1] - p[1]) * t, 2)])
leg[0] = [round(START[0], 2), round(START[1], 2)]; leg[-1] = [round(CP1[0], 2), round(CP1[1], 2)]

# the band's half-width along the leg (how far the car may stray and still be on the carpet) — for the verify script
halfw = [round(float(D[int(round(y)), int(round(x))]), 1) for x, y in pts_src[::max(1, n // 12)]]
headings = [round(math.degrees(math.atan2(leg[i + 1][1] - leg[i - 1][1], leg[i + 1][0] - leg[i - 1][0])), 1) for i in range(1, len(leg) - 1, max(1, len(leg) // 12))]
out = {"src": os.path.basename(SRC), "scale": round(S, 6), "origin": [round(OX, 3), round(OY, 3)], "start": list(START), "cp1": list(CP1),
       "ridge_off_at_start": round(off0 * S, 2), "ridge_off_at_cp1": round(off1 * S, 2), "length": round(L, 1), "pts": leg,
       "band_halfwidth_box": [round(h * S, 1) for h in halfw], "headings_deg": headings}
json.dump(out, open(OUT, "w"), indent=0)
print("wrote", OUT, "| %d points, %.1f box px, start off ridge %.1f px, cp1 off ridge %.1f px" % (len(leg), L, off0 * S, off1 * S))
print("headings along the leg (deg):", headings)
print("band half-width along the leg (box px):", out["band_halfwidth_box"])
if os.environ.get("RC_TRACE_PREVIEW"):
    # a preview crop with the ridge and the leg drawn on it
    from PIL import ImageDraw
    pv = im.copy(); dr = ImageDraw.Draw(pv)
    for x in xs[::2]: dr.point((int(x), int(ridge_at(x))), fill=(0, 255, 0))
    dr.line([tuple(p) for p in pts_src], fill=(255, 0, 0), width=3)
    for cx, cy in (to_src(*START), to_src(*CP1)): dr.ellipse((cx - 6, cy - 6, cx + 6, cy + 6), outline=(255, 255, 0), width=3)
    pv.crop((0, 380, 760, 800)).save(os.environ["RC_TRACE_PREVIEW"]); print("preview", os.environ["RC_TRACE_PREVIEW"])
