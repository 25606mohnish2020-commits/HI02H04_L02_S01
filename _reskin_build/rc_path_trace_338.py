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
# [L02-RC2-FIG-2] (2026-10-10) leg2 for RC2 from frame 338-2198 (the same room): the rear-view car at rest, its 63.0 px picture at
# frame (483,485) -> centre (514.5,516.5) = box (361.5,344.5) (template-matched, see build.py), to checkpoint 2's centre
START2 = (361.5, 344.5); END2 = (TOKENS[1][0] + 52.0, TOKENS[1][1] + 51.0)
# [L02-RC3-FIG-2] (2026-10-10) leg3 for RC3 from frame 338-2995: the front three-quarter car at rest, its 56 px picture at frame
# (700,427) -> centre (728,455) = box (575,283), unrotated — i.e. at heading 34 (the front render's deg on this page) while the carpet
# there runs steeper: the leg starts tangent to the car's own heading and steers onto the ridge over its first 30 % (START_HEADING)
START3 = (575.0, 283.0); END3 = (TOKENS[2][0] + 52.0, TOKENS[2][1] + 51.0)
LEGS = [("leg1", START, END, None), ("leg2", START2, END2, None), ("leg3", START3, END3, 34.0)]   # (name, start, end, start heading or None)
DISC_R = 54                                            # the discs filled in as carpet (their radius is 52)
RING_R = 52.0                                          # from the ring's rim the path curves straight into its centre (see trace)
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

# chamfer (3,4) distance transform inside the carpet, over the region legs 1-3 live in
Y0, Y1, X0, X1 = 350, 640, 150, 900
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

# the ridge per column over the region (the band is a horizontal snake: one crossing per column)
ridge = {}
for x in range(X0 + 2, X1 - 2):
    col = D[:, x - X0]
    if col.max() > 4: ridge[x] = Y0 + int(col.argmax())
xs = np.array(sorted(ridge)); ys = np.array([ridge[x] for x in xs], dtype=float)
k = np.exp(-0.5 * (np.arange(-18, 19) / SIGMA) ** 2); k /= k.sum()
ys_s = np.convolve(np.concatenate((np.full(18, ys[0]), ys, np.full(18, ys[-1]))), k, mode="valid")
def ridge_at(x): return float(np.interp(x, xs, ys_s))
def smooth(a_, b_, u):
    t = min(1.0, max(0.0, (u - a_) / (b_ - a_))); return t * t * (3 - 2 * t)

def trace(start, end, h0=None):
    sx, sy = start[0] + BOX[0], start[1] + BOX[1]; ex, ey = end[0] + BOX[0], end[1] + BOX[1]
    off0 = sy - ridge_at(sx); off1 = ey - ridge_at(ex); n = int(abs(ex - sx) * 2)
    k0 = (math.tan(math.radians(h0)) - (ridge_at(sx + 1) - ridge_at(sx - 1)) / 2.0) if h0 is not None else 0.0   # the start tangent = the car's own heading
    pts = []
    for i in range(n + 1):
        u = i / n; x = sx + (ex - sx) * u
        pts.append((x - BOX[0], ridge_at(x) + off0 * (1 - smooth(EASE_ON[0], EASE_ON[1], u)) + off1 * smooth(0.7, 1.0, u) + k0 * (x - sx) * (1 - smooth(0.0, 0.3, u)) - BOX[1]))
    # [L02-RC3-FIG-2] inside the ring the ridge of the filled-in disc bends about (the disc widens the band), which made the parked heading
    # wobble: from where the path crosses the ring's rim it is replaced by a cubic Hermite curve into the centre — leaving the rim along
    # the path's own tangent, arriving along the chord — so the heading eases from the carpet's to the chord's and stays there
    e = next((i for i, p in enumerate(pts) if math.hypot(p[0] - end[0], p[1] - end[1]) <= RING_R), None)
    if e is not None and e >= 4 and e < len(pts) - 2:
        P = pts[e]; T = (pts[e][0] - pts[e - 4][0], pts[e][1] - pts[e - 4][1]); C = (end[0] - P[0], end[1] - P[1]); cl = math.hypot(*C); tl = math.hypot(*T) or 1.0
        T = (T[0] / tl * cl, T[1] / tl * cl); m_ = len(pts) - 1 - e
        for j in range(1, m_ + 1):
            t = j / m_; h00 = 2 * t ** 3 - 3 * t ** 2 + 1; h10 = t ** 3 - 2 * t ** 2 + t; h01 = -2 * t ** 3 + 3 * t ** 2; h11 = t ** 3 - t ** 2
            pts[e + j] = (h00 * P[0] + h10 * T[0] + h01 * end[0] + h11 * C[0], h00 * P[1] + h10 * T[1] + h01 * end[1] + h11 * C[1])
    cum = [0.0]
    for p, q in zip(pts, pts[1:]): cum.append(cum[-1] + math.hypot(q[0] - p[0], q[1] - p[1]))
    L = cum[-1]; m = max(2, int(round(L / 2.0))); leg = []
    for j in range(m + 1):
        d = L * j / m; i = 1
        while i < len(cum) - 1 and cum[i] < d: i += 1
        p, q = pts[i - 1], pts[i]; seg = cum[i] - cum[i - 1]; t = (d - cum[i - 1]) / seg if seg else 0.0
        leg.append([round(p[0] + (q[0] - p[0]) * t, 2), round(p[1] + (q[1] - p[1]) * t, 2)])
    leg[0] = [round(start[0], 2), round(start[1], 2)]; leg[-1] = [round(end[0], 2), round(end[1], 2)]
    headings = [round(math.degrees(math.atan2(leg[i + 1][1] - leg[i - 1][1], leg[i + 1][0] - leg[i - 1][0])), 1) for i in range(1, len(leg) - 1, max(1, len(leg) // 12))]
    halfw = [round(float(D[int(round(y + BOX[1])) - Y0, int(round(x + BOX[0])) - X0]), 1) for x, y in leg[::max(1, len(leg) // 12)]]
    seconds = min(MAX_S, round(L / SPEED, 2))
    return {"start": [round(start[0], 3), round(start[1], 3)], "end": list(end), "ridge_off_at_start": round(off0, 2), "ridge_off_at_end": round(off1, 2), "start_heading": h0,
            "length": round(L, 1), "seconds": seconds, "pts": leg, "headings_deg": headings, "band_halfwidth_box": halfw}

out = {"src": os.path.basename(src), "scale": 1.0, "origin": list(BOX), "legs": {}}
for name, start, end, h0 in LEGS:
    leg = trace(start, end, h0); out["legs"][name] = leg
    print("%s: %d points, %.1f box px -> %.2f s (%.1f px/s); start off the ridge %.1f px, end off %.1f px" % (name, len(leg["pts"]), leg["length"], leg["seconds"], leg["length"] / leg["seconds"], leg["ridge_off_at_start"], leg["ridge_off_at_end"]))
    print("   headings (deg):", leg["headings_deg"])
    print("   band half-width along the leg (px):", leg["band_halfwidth_box"])
json.dump(out, open(OUT, "w"), indent=0)
if os.environ.get("RC_TRACE_PREVIEW"):
    from PIL import ImageDraw
    pv = im.copy(); dr = ImageDraw.Draw(pv)
    for x in xs: dr.point((int(x), int(round(ridge_at(x)))), fill=(0, 255, 0))
    for name, start, end, _h0 in LEGS:
        dr.line([(p[0] + BOX[0], p[1] + BOX[1]) for p in out["legs"][name]["pts"]], fill=(255, 0, 0), width=2)
        for cx, cy in ((start[0] + BOX[0], start[1] + BOX[1]), (end[0] + BOX[0], end[1] + BOX[1])): dr.ellipse((cx - 5, cy - 5, cx + 5, cy + 5), outline=(255, 255, 0), width=2)
    pv.crop((150, 330, 900, 600)).resize((1500, 540), Image.NEAREST).save(os.environ["RC_TRACE_PREVIEW"]); print("preview", os.environ["RC_TRACE_PREVIEW"])
