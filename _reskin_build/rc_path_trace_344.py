"""[L02-RC-FULL] (2026-10-16) Trace the car's four legs on the FULL-SCREEN room of the Figma 344 frames and write rc_leg_344_source.json
for build.py, in the shape of rc_leg_338_source.json's legs but in FRAME coordinates (origin (0,0): the picture is the whole 1280x720
stage, no box). Run once: `python _reskin_build/rc_path_trace_344.py` (it refreshes rc_scene_344_clean.png through
rc_scene_344_clean.ensure_clean first). Pillow + numpy only.

The method is rc_path_trace_338.py's ([L02-RC1-SMOOTH]): the carpet's pixels (pink / lilac stripes, the blue bead chains) are masked on
the CLEANED picture, the four "?" discs — which hide the carpet — are filled in as carpet, the mask is closed, a chamfer distance
transform is taken and its ridge per column (the band's medial axis) is smoothed along x; each leg runs from the car's own centre to the
checkpoint's centre, easing onto the ridge over 30-75 % of the way, and from the ring's rim curves straight into the centre (a Hermite
curve along the path's own tangent). Legs 3 and 4 start tangent to the car's rest heading (the front render's 35 on this frame, the rear
render's -14) as before. The discs, car spots and headings are the 344 frames' (measured in build.py [L02-RC-FULL]).

What is NOT scaled: each leg keeps the duration it has today (SECONDS: 3.15 / 2.5 / 2.02 / 1.9 s) — the user asked for the animations and
the flow exactly as they are, so the drive, the motor's swell along it and every timer after it are unchanged; the car simply covers
the bigger screen (about 1.31x the distance in the same time)."""
import os, json, math
import numpy as np
from PIL import Image, ImageFilter
import rc_scene_344_clean as rc344
import rc1_scene_clean as rc1c                         # _carpet_masks: the carpet's colours (the same picture, scaled)

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "rc_leg_344_source.json")
TOKENS = [(264.0, 450.0), (568.0, 311.0), (811.0, 463.0), (1086.0, 375.0)]   # the checkpoints' boxes, 141x137, frame px
TOKEN_WH = (141.0, 137.0)
def centre(i): return (TOKENS[i][0] + TOKEN_WH[0] / 2, TOKENS[i][1] + TOKEN_WH[1] / 2)
# the cars at rest (their renders' centres, frame px; build.py RCF_CARS): RC1 the side render 94 px at (67,326); RC2 the rear render 84 px
# at (430,461); RC3 the front render 80.8 px centred (754.14,422.76) (frame 5's spot mapped through that frame's 2.7 % scale); RC4 the rear
# render 82 px at (968,469)
START1 = (67.0 + 47.0, 326.0 + 47.0); START2 = (430.0 + 42.0, 461.0 + 42.0); START3 = (754.14, 422.76); START4 = (968.0 + 41.0, 469.0 + 41.0)
LEGS = [("leg1", START1, centre(0), None), ("leg2", START2, centre(1), None), ("leg3", START3, centre(2), 35.0), ("leg4", START4, centre(3), -14.0)]
SECONDS = {"leg1": 3.15, "leg2": 2.5, "leg3": 2.02, "leg4": 1.9}   # today's durations (rc_leg_338_source.json), kept
DISC_R = 72                                            # the discs filled in as carpet (their half-size is 70.5 x 68.5)
RING_R = 69.0                                          # from the ring's rim the path curves straight into its centre
EASE_ON = (0.30, 0.75)                                 # the car's centre settles from its rest offset onto the ridge over this stretch
SIGMA = 8.0                                            # the ridge smoothing along x (px; 6 on the 976-wide picture)

src, _ = rc344.ensure_clean()
im = Image.open(src).convert("RGB"); W, H = im.size
a = np.array(im).astype(int)
pink, lav, bob = rc1c._carpet_masks(a); M = pink | lav | bob
yy, xx = np.mgrid[0:H, 0:W]
for i in range(4):
    cx, cy = centre(i); M |= (xx - cx) ** 2 + (yy - cy) ** 2 <= DISC_R ** 2
mimg = Image.fromarray((M * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5))   # close the beads' outlines
M = np.asarray(mimg) > 0

# chamfer (3,4) distance transform inside the carpet, over the band's region
Y0, Y1, X0, X1 = 320, 650, 0, 1280
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

# the ridge per column (the band is a horizontal snake: one crossing per column)
ridge = {}
for x in range(X0 + 2, X1 - 2):
    col = D[:, x - X0]
    if col.max() > 4: ridge[x] = Y0 + int(col.argmax())
xs = np.array(sorted(ridge)); ys = np.array([ridge[x] for x in xs], dtype=float)
K = int(3 * SIGMA); k = np.exp(-0.5 * (np.arange(-K, K + 1) / SIGMA) ** 2); k /= k.sum()
ys_s = np.convolve(np.concatenate((np.full(K, ys[0]), ys, np.full(K, ys[-1]))), k, mode="valid")
def ridge_at(x): return float(np.interp(x, xs, ys_s))
def smooth(a_, b_, u):
    t = min(1.0, max(0.0, (u - a_) / (b_ - a_))); return t * t * (3 - 2 * t)

def trace(name, start, end, h0=None):
    sx, sy = start; ex, ey = end
    off0 = sy - ridge_at(sx); off1 = ey - ridge_at(ex); n = int(abs(ex - sx) * 2)
    k0 = (math.tan(math.radians(h0)) - (ridge_at(sx + 1) - ridge_at(sx - 1)) / 2.0) if h0 is not None else 0.0   # the start tangent = the car's own heading
    pts = []
    for i in range(n + 1):
        u = i / n; x = sx + (ex - sx) * u
        pts.append((x, ridge_at(x) + off0 * (1 - smooth(EASE_ON[0], EASE_ON[1], u)) + off1 * smooth(0.7, 1.0, u) + k0 * (x - sx) * (1 - smooth(0.0, 0.3, u))))
    e = next((i for i, p in enumerate(pts) if math.hypot(p[0] - ex, p[1] - ey) <= RING_R), None)
    if e is not None and e >= 4 and e < len(pts) - 2:
        P = pts[e]; T = (pts[e][0] - pts[e - 4][0], pts[e][1] - pts[e - 4][1]); C = (ex - P[0], ey - P[1]); cl = math.hypot(*C); tl = math.hypot(*T) or 1.0
        T = (T[0] / tl * cl, T[1] / tl * cl); m_ = len(pts) - 1 - e
        for j in range(1, m_ + 1):
            t = j / m_; h00 = 2 * t ** 3 - 3 * t ** 2 + 1; h10 = t ** 3 - 2 * t ** 2 + t; h01 = -2 * t ** 3 + 3 * t ** 2; h11 = t ** 3 - t ** 2
            pts[e + j] = (h00 * P[0] + h10 * T[0] + h01 * ex + h11 * C[0], h00 * P[1] + h10 * T[1] + h01 * ey + h11 * C[1])
    cum = [0.0]
    for p, q in zip(pts, pts[1:]): cum.append(cum[-1] + math.hypot(q[0] - p[0], q[1] - p[1]))
    L = cum[-1]; m = max(2, int(round(L / 2.0))); leg = []
    for j in range(m + 1):
        d = L * j / m; i = 1
        while i < len(cum) - 1 and cum[i] < d: i += 1
        p, q = pts[i - 1], pts[i]; seg = cum[i] - cum[i - 1]; t = (d - cum[i - 1]) / seg if seg else 0.0
        leg.append([round(p[0] + (q[0] - p[0]) * t, 2), round(p[1] + (q[1] - p[1]) * t, 2)])
    leg[0] = [round(sx, 2), round(sy, 2)]; leg[-1] = [round(ex, 2), round(ey, 2)]
    headings = [round(math.degrees(math.atan2(leg[i + 1][1] - leg[i - 1][1], leg[i + 1][0] - leg[i - 1][0])), 1) for i in range(1, len(leg) - 1, max(1, len(leg) // 12))]
    halfw = [round(float(D[int(round(y)) - Y0, int(round(x)) - X0]), 1) for x, y in leg[::max(1, len(leg) // 12)]]
    return {"start": [round(sx, 3), round(sy, 3)], "end": [round(ex, 3), round(ey, 3)], "ridge_off_at_start": round(off0, 2), "ridge_off_at_end": round(off1, 2), "start_heading": h0,
            "length": round(L, 1), "seconds": SECONDS[name], "pts": leg, "headings_deg": headings, "band_halfwidth_px": halfw}

out = {"src": os.path.basename(src), "scale": 1.0, "origin": [0, 0], "legs": {}}
for name, start, end, h0 in LEGS:
    leg = trace(name, start, end, h0); out["legs"][name] = leg
    print("%s: %d points, %.1f px in %.2f s (%.1f px/s); start off the ridge %.1f px, end off %.1f px" % (name, len(leg["pts"]), leg["length"], leg["seconds"], leg["length"] / leg["seconds"], leg["ridge_off_at_start"], leg["ridge_off_at_end"]))
    print("   headings (deg):", leg["headings_deg"])
    print("   band half-width along the leg (px):", leg["band_halfwidth_px"])
json.dump(out, open(OUT, "w"), indent=0)
print("wrote", OUT)
if os.environ.get("RC_TRACE_PREVIEW"):
    from PIL import ImageDraw
    pv = im.copy(); dr = ImageDraw.Draw(pv)
    for x in xs: dr.point((int(x), int(round(ridge_at(x)))), fill=(0, 255, 0))
    for name, start, end, _h0 in LEGS:
        dr.line([(p[0], p[1]) for p in out["legs"][name]["pts"]], fill=(255, 0, 0), width=2)
        for cx, cy in (start, end): dr.ellipse((cx - 5, cy - 5, cx + 5, cy + 5), outline=(255, 255, 0), width=2)
    pv.crop((0, 300, 1280, 660)).save(os.environ["RC_TRACE_PREVIEW"]); print("preview", os.environ["RC_TRACE_PREVIEW"])
