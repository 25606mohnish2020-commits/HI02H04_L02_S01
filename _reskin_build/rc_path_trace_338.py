"""[L02-RC1-FIG-2] / [L02-RC1-SMOOTH] (2026-10-10) Trace the car's first leg on the NEW carpet of the Figma 338-3 frame and write
rc_leg_338_source.json for build.py, in the shape of rc_leg_source.json's legs. Run once: `python _reskin_build/rc_path_trace_338.py`
(it refreshes rc1_scene_338-3_clean.png through rc1_scene_clean.ensure_clean first). Pillow + numpy only.

The carpet moved a little in this frame and the first checkpoint moved by (+24, +16), so RC1's leg1 from rc_leg_source.json (traced on
the old picture) would run beside the new carpet and stop short of the new "?". Only RC1 shows this picture; RC2-RC4 keep the old one.

How ([L02-RC1-SMOOTH], "the car should follow the exact centre line of the carpet path"): the first trace of this frame took each
column's vertical midpoint of the carpet as its centre, which is right on a straight run but NOT in the bend — where the top edge is still
flat while the bottom edge already dives, the midpoint rides up along the top edge, and the car cut the corner over the bead chain. This
trace does what rc_path_trace.py does for the old picture: the carpet's pixels (the pink / lilac stripes, the blue bead chains) are
masked on the CLEANED picture (the baked car lifted out, so its columns show the carpet), the four "?" discs — which hide the carpet — are
filled in as carpet, the mask is closed, a chamfer distance transform is taken, and the ridge of that transform (the row of greatest
distance to the carpet's edge, per column) is the band's medial axis: on the centre line at any slope, through the bend and into the
disc. The ridge is smoothed along x (Gaussian, sigma 6 px). The leg runs from the car's own centre (the Figma puts the car a little
above the band's middle) to the checkpoint's centre: it eases onto the ridge over the stretch 30-75 % of the way (through the start of
the bend, where a vertical drift of a few px is invisible, instead of dipping the car's nose on the flat run) and holds the ridge from
there to the "?" (the ridge ends on the disc's centre to within a pixel, so the final veer is nil); resampled every 2 px of arc length.
The speed is the other legs' 66 px/s, capped so the drive fits the 3.2 s motor clip (MAX_S)."""
import os, json, math
import numpy as np
from PIL import Image, ImageFilter
import rc1_scene_clean as rc1c

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "rc_leg_338_source.json")
BOX = (153.0, 172.0)                                   # the picture box's outer corner in the frame (box coords = frame - BOX)
CAR_BOX, CAR_SIZE = (49.09, 208.09), 76.82             # RC1's car at rest in this frame (box coords), see build.py [L02-RC1-FIG-2]
START = (CAR_BOX[0] + CAR_SIZE / 2, CAR_BOX[1] + CAR_SIZE / 2)
TOKENS = [(203.0, 306.0), (435.0, 200.0), (620.0, 316.0), (830.0, 249.0)]   # the checkpoints' boxes (104x102) in this frame
END = (TOKENS[0][0] + 52.0, TOKENS[0][1] + 51.0)
DISC_R = 54                                            # the discs filled in as carpet (their radius is 52)
SPEED, MAX_S = 66.0, 3.15                              # px/s as the other legs; the drive must fit the 3.2 s motor clip (sfx_rc)
EASE_ON = (0.30, 0.75)                                 # the car's centre settles from its rest offset onto the ridge over this stretch
SIGMA = 6.0                                            # the ridge smoothing along x (px)

src, _ = rc1c.ensure_clean()
im = Image.open(src).convert("RGB"); W, H = im.size
a = np.array(im).astype(int)
pink, lav, bob = rc1c._carpet_masks(a); M = pink | lav | bob
yy, xx = np.mgrid[0:H, 0:W]
for tx, ty in TOKENS:
    cx, cy = tx + 52.0 + BOX[0], ty + 51.0 + BOX[1]; M |= (xx - cx) ** 2 + (yy - cy) ** 2 <= DISC_R ** 2
M[:, :int(BOX[0]) + 2] = False; M[:int(BOX[1]) + 2, :] = False            # nothing outside the box
mimg = Image.fromarray((M * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5))   # close the beads' outlines
M = np.asarray(mimg) > 0

# chamfer (3,4) distance transform inside the carpet, over the region leg1 lives in
Y0, Y1, X0, X1 = 360, 640, 150, 560
INF = 10 ** 6
D = np.where(M[Y0:Y1, X0:X1], INF, 0).astype(np.int64); h, w = D.shape
for y in range(1, h):
    row = D[y]; up = D[y - 1]
    cand = np.minimum(up + 3, np.concatenate(([INF], up[:-1])) + 4); cand = np.minimum(cand, np.concatenate((up[1:], [INF])) + 4)
    row[:] = np.minimum(row, cand)
    for x in range(1, w): row[x] = min(row[x], row[x - 1] + 3)
for y in range(h - 2, -1, -1):
    row = D[y]; dn = D[y + 1]
    cand = np.minimum(dn + 3, np.concatenate(([INF], dn[:-1])) + 4); cand = np.minimum(cand, np.concatenate((dn[1:], [INF])) + 4)
    row[:] = np.minimum(row, cand)
    for x in range(w - 2, -1, -1): row[x] = min(row[x], row[x + 1] + 3)
D = D / 3.0

# the ridge per column, from the car's columns to a little past the first disc's centre
ex_f = END[0] + BOX[0]; ridge = {}
for x in range(int(START[0] + BOX[0]) - 40, int(ex_f) + 30):
    col = D[:, x - X0]
    if col.max() > 4: ridge[x] = Y0 + int(col.argmax())
xs = np.array(sorted(ridge)); ys = np.array([ridge[x] for x in xs], dtype=float)
k = np.exp(-0.5 * (np.arange(-18, 19) / SIGMA) ** 2); k /= k.sum()
ys_s = np.convolve(np.concatenate((np.full(18, ys[0]), ys, np.full(18, ys[-1]))), k, mode="valid")
def ridge_at(x): return float(np.interp(x, xs, ys_s))
def smooth(a_, b_, u):
    t = min(1.0, max(0.0, (u - a_) / (b_ - a_))); return t * t * (3 - 2 * t)

sx, sy = START[0] + BOX[0], START[1] + BOX[1]; ex, ey = END[0] + BOX[0], END[1] + BOX[1]
off0 = sy - ridge_at(sx); off1 = ey - ridge_at(ex); n = int(abs(ex - sx) * 2)
pts = []
for i in range(n + 1):
    u = i / n; x = sx + (ex - sx) * u
    pts.append((x - BOX[0], ridge_at(x) + off0 * (1 - smooth(EASE_ON[0], EASE_ON[1], u)) + off1 * smooth(0.7, 1.0, u) - BOX[1]))
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
halfw = [round(float(D[int(round(y + BOX[1])) - Y0, int(round(x + BOX[0])) - X0]), 1) for x, y in leg[::max(1, len(leg) // 12)]]
seconds = min(MAX_S, round(L / SPEED, 2))
out = {"src": os.path.basename(src), "scale": 1.0, "origin": list(BOX), "legs": {"leg1": {
    "start": [round(START[0], 3), round(START[1], 3)], "end": list(END), "ridge_off_at_start": round(off0, 2), "ridge_off_at_end": round(off1, 2),
    "length": round(L, 1), "seconds": seconds, "pts": leg, "headings_deg": headings, "band_halfwidth_box": halfw}}}
json.dump(out, open(OUT, "w"), indent=0)
print("leg1: %d points, %.1f box px -> %.2f s (%.1f px/s); start off the ridge %.1f px, end off %.1f px" % (len(leg), L, seconds, L / seconds, off0, off1))
print("   headings (deg):", headings)
print("   band half-width along the leg (px):", halfw)
if os.environ.get("RC_TRACE_PREVIEW"):
    from PIL import ImageDraw
    pv = im.copy(); dr = ImageDraw.Draw(pv)
    for x in xs: dr.point((int(x), int(round(ridge_at(x)))), fill=(0, 255, 0))
    dr.line([(p[0] + BOX[0], p[1] + BOX[1]) for p in leg], fill=(255, 0, 0), width=2)
    for cx, cy in ((sx, sy), (ex, ey)): dr.ellipse((cx - 5, cy - 5, cx + 5, cy + 5), outline=(255, 255, 0), width=2)
    pv.crop((150, 330, 520, 600)).resize((1110, 810), Image.NEAREST).save(os.environ["RC_TRACE_PREVIEW"]); print("preview", os.environ["RC_TRACE_PREVIEW"])
