"""[L02-RC-FIG] / [L02-RC-MOTION] / [L02-RC2] (2026-10-05) Trace the striped carpet's centre line in the RC-car scene picture
(rc_scene_image239_source.png, the Figma "image 239" export, 1672x941) and write the car's legs — each from a start centre to a
checkpoint's centre — as rc_leg_source.json, which build.py embeds in the card (data.rc.leg.pts of each RC slide, Figma box coords).
Run once after the picture or the Figma positions change: `python _reskin_build/rc_path_trace.py`. Needs Pillow + numpy only.

How: carpet pixels (the pink and lilac stripes and the blue bead borders) are masked, small holes closed, a chamfer distance transform
taken, and the ridge of that transform (the row of greatest distance to the carpet's edge, per column) is the band's centre line — right
on a straight stretch at any slope, and within a pixel or two through the bends. The ridge is smoothed along x; each leg is cut between
its start column and its checkpoint's column, nudged so it begins exactly at the start centre (easing onto the line over the leg's first
40%) and ends exactly at the checkpoint's centre (veering off the line over the last half — the Figma checkpoints sit a few px off the
line), converted to Figma box coords and resampled every 2 px of arc length.

Legs: leg1 = the car at rest (RC1, Figma 264-664: a 54.404 box @ (64,230.6), centre (91.2,257.8)) → checkpoint 1 (231,341);
      leg2 = the car as RC2 opens (Figma 267-1053: the 50x50 rear-view render @ (319,334), centre (344,359)) → checkpoint 2 (487,251);
      leg3 = the car as RC3 opens (Figma 278-1882: the 42x42 front-view render @ (554,269), centre (575,290)) → checkpoint 3 (672,367);
      leg4 = the car as RC4 opens (Figma 290-197: the 50x50 rear-view render @ (733,334), centre (758,359)) → checkpoint 4 (882,300)."""
import os, json, math
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "rc_scene_image239_source.png")
OUT = os.path.join(HERE, "rc_leg_source.json")

# the Figma geometry (box OUTER coords; see build.py [L02-RC-FIG])
FIG_IMG = (-1.0, -35.0, 976.0, 550.0)          # image 239 in the box
TOKENS = [(179.0, 290.0), (435.0, 200.0), (620.0, 316.0), (830.0, 249.0)]
def cp(i): return (TOKENS[i][0] + 52.0, TOKENS[i][1] + 51.0)      # a checkpoint's centre (104x102 token)
CAR_BOX, CAR_SIZE = (64.0, 230.6), 54.404      # the car at rest in RC1
START1 = (CAR_BOX[0] + CAR_SIZE / 2, CAR_BOX[1] + CAR_SIZE / 2)
START2 = (319.0 + 25.0, 334.0 + 25.0)          # RC2 opens with the car here (Figma 267-1053)
START3 = (554.0 + 21.0, 269.0 + 21.0)          # RC3 opens with the car here (Figma 278-1882: the 42x42 front-view render @ (554,269))
START4 = (733.0 + 25.0, 334.0 + 25.0)          # RC4 opens with the car here (Figma 290-197: the 50x50 rear-view render @ (733,334))
LEGS = [("leg1", START1, cp(0)), ("leg2", START2, cp(1)), ("leg3", START3, cp(2)), ("leg4", START4, cp(3))]

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
    row = D[y]; up = D[y - 1]
    cand = np.minimum(up + 3, np.concatenate(([INF], up[:-1])) + 4)
    cand = np.minimum(cand, np.concatenate((up[1:], [INF])) + 4)
    row[:] = np.minimum(row, cand)
    for x in range(1, W): row[x] = min(row[x], row[x - 1] + 3)      # the within-row pass is sequential (a few seconds in all)
for y in range(H - 2, -1, -1):
    row = D[y]; dn = D[y + 1]
    cand = np.minimum(dn + 3, np.concatenate(([INF], dn[:-1])) + 4)
    cand = np.minimum(cand, np.concatenate((dn[1:], [INF])) + 4)
    row[:] = np.minimum(row, cand)
    for x in range(W - 2, -1, -1): row[x] = min(row[x], row[x + 1] + 3)
D = D / 3.0

# the ridge, per column, over the whole picture (the band is single-valued in x: a horizontal snake)
ridge = {}
for x in range(W):
    col = D[:, x]
    if col.max() <= 0: continue
    ridge[x] = int(col.argmax())
xs = np.array(sorted(ridge)); ys = np.array([ridge[x] for x in xs], dtype=float)
k = np.exp(-0.5 * (np.arange(-24, 25) / 8.0) ** 2); k /= k.sum()                  # smooth along x (Gaussian, sigma 8 px)
pad = np.concatenate((np.full(24, ys[0]), ys, np.full(24, ys[-1])))
ys_s = np.convolve(pad, k, mode="valid")
def ridge_at(x): return float(np.interp(x, xs, ys_s))
def smooth(a, b, u):
    t = min(1.0, max(0.0, (u - a) / (b - a))); return t * t * (3 - 2 * t)

def trace(start, end):
    sx0, sy0 = to_src(*start); sx1, sy1 = to_src(*end)
    off0 = sy0 - ridge_at(sx0); off1 = sy1 - ridge_at(sx1)
    n = int(abs(sx1 - sx0) * 2)
    pts_src = []
    for i in range(n + 1):
        u = i / n; x = sx0 + (sx1 - sx0) * u
        pts_src.append((x, ridge_at(x) + off0 * (1 - smooth(0.0, 0.4, u)) + off1 * smooth(0.5, 1.0, u)))
    pts_box = [to_box(x, y) for x, y in pts_src]
    cum = [0.0]
    for p, q in zip(pts_box, pts_box[1:]): cum.append(cum[-1] + math.hypot(q[0] - p[0], q[1] - p[1]))
    L = cum[-1]; step = 2.0; m = max(2, int(round(L / step)))
    leg = []
    for j in range(m + 1):
        d = L * j / m; i = 1
        while i < len(cum) - 1 and cum[i] < d: i += 1
        p, q = pts_box[i - 1], pts_box[i]; seg = cum[i] - cum[i - 1]; t = (d - cum[i - 1]) / seg if seg else 0.0
        leg.append([round(p[0] + (q[0] - p[0]) * t, 2), round(p[1] + (q[1] - p[1]) * t, 2)])
    leg[0] = [round(start[0], 2), round(start[1], 2)]; leg[-1] = [round(end[0], 2), round(end[1], 2)]
    halfw = [round(float(D[int(round(y)), int(round(x))]) * S, 1) for x, y in pts_src[::max(1, n // 12)]]
    headings = [round(math.degrees(math.atan2(leg[i + 1][1] - leg[i - 1][1], leg[i + 1][0] - leg[i - 1][0])), 1) for i in range(1, len(leg) - 1, max(1, len(leg) // 12))]
    return {"start": list(start), "end": list(end), "ridge_off_at_start": round(off0 * S, 2), "ridge_off_at_end": round(off1 * S, 2),
            "length": round(L, 1), "pts": leg, "band_halfwidth_box": halfw, "headings_deg": headings}, pts_src

out = {"src": os.path.basename(SRC), "scale": round(S, 6), "origin": [round(OX, 3), round(OY, 3)], "legs": {}}
drawn = []
for name, start, end in LEGS:
    leg, pts_src = trace(start, end); out["legs"][name] = leg; drawn.append((pts_src, start, end))
    print("%s: %d points, %.1f box px, start off ridge %.1f px, end off ridge %.1f px" % (name, len(leg["pts"]), leg["length"], leg["ridge_off_at_start"], leg["ridge_off_at_end"]))
    print("   headings (deg):", leg["headings_deg"])
    print("   band half-width (box px):", leg["band_halfwidth_box"])
json.dump(out, open(OUT, "w"), indent=0)
print("wrote", OUT)
if os.environ.get("RC_TRACE_PREVIEW"):
    # a preview crop with the ridge and the legs drawn on it
    from PIL import ImageDraw
    pv = im.copy(); dr = ImageDraw.Draw(pv)
    for x in xs[::2]: dr.point((int(x), int(ridge_at(x))), fill=(0, 255, 0))
    for pts_src, start, end in drawn:
        dr.line([tuple(p) for p in pts_src], fill=(255, 0, 0), width=3)
        for cx, cy in (to_src(*start), to_src(*end)): dr.ellipse((cx - 6, cy - 6, cx + 6, cy + 6), outline=(255, 255, 0), width=3)
    pv.crop((0, 380, 1000, 800)).save(os.environ["RC_TRACE_PREVIEW"]); print("preview", os.environ["RC_TRACE_PREVIEW"])
