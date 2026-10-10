"""[L02-RC1-FIG-2] (2026-10-10) Lift the page's live elements out of the Figma 338-3 export so it can serve as RC1's scene picture.

The user could only export the frame flattened (rc1_frame_338-3_export.png, 1280x720 at 1x), so the car at the path's start and the boy
with his remote are baked into the room picture. The page draws both itself (the car drives off, the boy is the animated GIF), so the
baked copies must go — the car would be left behind as a ghost the moment the live car moves, and the GIF would not cover the static boy
exactly. The four "?" tokens are baked too, but the live tokens are the same 104x102 discs at the same spots, so they cover them.

Both holes are cut with the page's OWN renders, placed where template matching found them in the export (match_rc1_templates.py in the
session's scratchpad; the boy scored 11.7, i.e. the export's boy IS the GIF's first frame, mirrored, at scale 0.2170; the car IS
rc_car.webp at 70.6 px, turned 3 degrees):
 - the CAR [L02-RC1-SMOOTH] (2026-10-10, "the carpet should not be blurrish from where the car is starting"): its silhouette + 5 px and
   the soft shadow below it (8 px) are refilled with EXACT COPIES of the carpet beside the hole — no blending, no interpolation, so the
   patch is as crisp as the rest of the picture. Three zones, by the band's top edge (a quadratic fitted through the clean edge on both
   sides of the hole; the car hides the edge itself):
     floor  — rows copied from the nearest clean column whose carpet edge sits lower (floor for certain, the plank lines stay level);
     chain  — the bead chain along the edge copied as a ribbon from the flat run right of the hole (two source offsets, one for each
              part of the hole, and the seam between them, chosen by searching for the best match of the 7-px bead pattern at the hole's
              two ends and at the seam), each column moved by a whole number of rows to the fitted edge;
     stripes — the carpet's diagonal stripes are one hatch pattern over the whole straight stretch (measured: -44.6 deg, period 41.4 px,
              99% pure), so every pixel samples the nearest clean carpet at exactly its own stripe phase — along its stripe, or a whole
              period across the stripes and then along — read bilinearly at that spot: the diagonals and their soft edges continue exactly.
 - the BOY: the GIF's silhouette + 3 px, and the soft shadow under his feet, refilled row by row by linear interpolation between the
   pixels just outside the hole on either side — the wall is a flat gradient and the floor planks and the skirting are horizontal.
The floor rim is feathered 1 px; the chain and the stripes are left crisp. clean(export_path) -> (cleaned 1280x720 RGB image, info).
ensure_clean() writes / refreshes rc1_scene_338-3_clean.png (build.py and rc_path_trace_338.py both go through it). Pillow + numpy only.
`python rc1_scene_clean.py` writes rc1_scene_338-3_clean_preview.png beside the export."""
import os, math
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
EXPORT = os.path.join(HERE, "rc1_frame_338-3_export.png")
CLEAN = os.path.join(HERE, "rc1_scene_338-3_clean.png")
CAR_PNG = os.path.join(HERE, "rc_car_source.png")            # the side-view render (what rc_car.webp is made from)
BOY_GIF = os.path.join(HERE, "rc_boy_source.gif")            # the boy, 416x772, 36 frames

# the placements measured on the export (frame px), see the module docstring
BOY_CANVAS = (405.0, 236.0, 90.3, 167.5)                     # the mirrored GIF canvas: left, top, width, height
CAR_PIC = (205.2, 383.2, 70.6, 3.0)                          # the car picture: left, top, size, counter-clockwise tilt (deg)
CAR_PAD, SHADOW_DOWN = 5, 8                                  # the hole: the silhouette grown 5 px, plus 8 px below it for the soft shadow
DISCS = ((352, 463), (584, 695), (769, 880), (979, 1090))    # frame columns the four baked "?" discs cover (they hide the carpet's edges)
CHAIN_H = 6                                                  # the bead chain: the edge row and 6 rows below it (beads are 4-6 px deep)
STRIPE_DEG, STRIPE_P = -44.6, 41.4                           # the hatch: stripe normal angle and period (frame px), refined on the picture
FLAT_RIGHT = 345                                             # the top chain is flat / gently sloped up to this column (the bend begins)


def _dilate(m, r):
    out = m.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if dx * dx + dy * dy <= r * r: out |= np.roll(np.roll(m, dy, 0), dx, 1)
    return out


def _paste_alpha(shape, rgba, left, top, size_wh, rot=0.0, thr=60):
    t = rgba.rotate(rot, resample=Image.BICUBIC, expand=False) if rot else rgba
    t = t.resize((int(round(size_wh[0])), int(round(size_wh[1]))), Image.LANCZOS)
    al = np.array(t)[:, :, 3] > thr; m = np.zeros(shape, bool)
    x0, y0 = int(round(left)), int(round(top)); m[y0:y0 + al.shape[0], x0:x0 + al.shape[1]] = al
    return m


def _carpet_masks(a):
    r, g, b = a[:, :, 0], a[:, :, 1], a[:, :, 2]
    pink = (r > 215) & (g > 150) & (g < 210) & (b > 150) & (b < 220) & (r - g > 25)
    lav = (b > 200) & (r > 150) & (r < 220) & (g > 135) & (g < 205) & (b - r > 30)
    bob = (b > 150) & (r > 30) & (r < 175) & (g > 30) & (g < 160) & (b - r > 60)       # the bead chain: dark violet tops, lighter violet bodies
    return pink, lav, bob


def _edges(carpet, hx0, hx1):
    """The band's top and bottom edge per column (frame rows), the discs skipped, median-smoothed over 9 columns; across the hole's columns
    the top edge is a quadratic through the clean edge 40 px left and 50 px right of it (the car hides the edge there)."""
    top, bot = {}, {}
    for x in range(156, 1120):
        if any(lo <= x <= hi for lo, hi in DISCS): continue
        rows = np.where(carpet[385:647, x])[0]
        if len(rows) > 10: top[x] = 385 + int(rows.min()); bot[x] = 385 + int(rows.max())
    def med(d):
        o = {}
        for x in d:
            w = [d[k] for k in range(x - 4, x + 5) if k in d]; o[x] = float(np.median(w)) if len(w) >= 5 else float(d[x])
        return o
    top, bot = med(top), med(bot)
    fx = [x for x in top if (hx0 - 40 <= x < hx0) or (hx1 < x <= hx1 + 50)]
    co = np.polyfit(fx, [top[x] for x in fx], 2)
    def T(x):
        xi = int(round(x))
        if hx0 - 2 <= xi <= hx1 + 2: return float(np.polyval(co, x))
        if xi in top: return top[xi]
        return top[min(top, key=lambda q: abs(q - xi))]
    def B(x):
        xi = int(round(x))
        if xi in bot: return bot[xi]
        return bot[min(bot, key=lambda q: abs(q - xi))]
    return T, B, top, bot, co


def _refine_hatch(a, interior, zone):
    """The stripe hatch (normal angle, period) refined around the measured values on the clean carpet beside the hole; returns
    (deg, period, purity) — purity = the share of carpet pixels whose colour the one-dimensional model predicts."""
    ys, xs = np.where(zone & interior); pinkness = a[ys, xs, 0] - a[ys, xs, 1] > 25
    best = None
    for deg in np.arange(STRIPE_DEG - 1.5, STRIPE_DEG + 1.5, 0.1):
        t = math.radians(deg); phi = xs * math.cos(t) + ys * math.sin(t)
        for P in np.arange(STRIPE_P - 0.6, STRIPE_P + 0.6, 0.02):
            idx = ((phi % P) / P * 64).astype(int) % 64; h = np.zeros(64); n = np.zeros(64)
            np.add.at(h, idx, pinkness); np.add.at(n, idx, 1); pur = np.sum(np.maximum(h, n - h)) / max(1, n.sum())
            if best is None or pur > best[2]: best = (float(deg), float(P), float(pur))
    return best


def _fill_car(a, out, mask):
    """See the module docstring (the CAR). Returns an info dict."""
    H, W = mask.shape; pink, lav, bob = _carpet_masks(a); carpet = pink | lav | bob; interior = pink | lav
    cols = np.where(mask.any(axis=0))[0]; hx0, hx1 = int(cols.min()), int(cols.max())
    rows = np.where(mask.any(axis=1))[0]; hy0, hy1 = int(rows.min()), int(rows.max())
    T, B, top, bot, co = _edges(carpet, hx0, hx1)
    Ti = {x: int(round(T(x))) for x in range(hx0 - 130, hx1 + 130)}
    # ---- zones of the hole's pixels
    ys, xs = np.where(mask)
    zone = np.full(len(ys), 2, int)                                           # 0 floor, 1 chain, 2 stripes
    for i, (y, x) in enumerate(zip(ys, xs)):
        te = Ti[x]
        if y < te - 1: zone[i] = 0
        elif y <= te + CHAIN_H: zone[i] = 1
    # ---- the floor: each pixel takes the same row of the nearest clean column where that row is floor (its edge at least 2 rows lower);
    # a plank line that shows on one side of the hole only ends at a joint hidden under the car, so columns where the row is PLAIN floor
    # are preferred — the line stops at the hole's edge instead of being dragged across it
    clean_cols = [k for k in top if (k < hx0 - 6 or k > hx1 + 6) and abs(k - (hx0 + hx1) / 2) < 150]
    _fs = {}
    def floor_src(r, x):
        if (r, x) not in _fs:
            cands = [k for k in clean_cols if top[k] >= r + 2] or clean_cols
            plain = [k for k in cands if np.abs(a[r - 3:r + 4, k] - a[r, k]).sum(axis=1).max() < 40]
            _fs[(r, x)] = min(plain or cands, key=lambda k: abs(k - x))
        return _fs[(r, x)]
    for y, x in zip(ys[zone == 0], xs[zone == 0]): out[y, x] = a[y, floor_src(y, x)]
    # ---- the chain: the band's two bead chains are the same beads along two parallel edges, and the bottom chain of these very columns
    # is in the clear — so the top chain across the hole is copied from the bottom chain (bead cores only), each column moved up by a
    # whole number of rows from the bottom chain's (smoothed) bead-top row to the fitted top edge: the two edges run parallel here, so
    # no bead is sheared. The hole is split at a seam into a left part (horizontal offset D1) and a right part (D2); (seam, D1, D2) are
    # chosen by the best match of the bead pattern over 4 columns at the hole's left end, at the seam and at its right end (the beads
    # repeat every ~7 px, so a good match = the same bead phase). A bead's 1-px anti-aliased rim meets carpet above / floor below at the
    # bottom chain but floor above / carpet below up here, so every rim pixel is re-mixed: + half the difference of the two grounds.
    bead = _dilate(bob, 1)
    raw, ybt = {}, {}                                                        # the bottom chain's first bead row per column, median-9 smoothed
    for u in range(hx0 - 40, hx1 + 41):
        b0 = int(round(B(u))); rows = np.where(bob[b0 - 12:b0 + 3, u])[0]
        if len(rows): raw[u] = b0 - 12 + int(rows.min())
    for u in raw:
        w = [raw[k] for k in range(u - 4, u + 5) if k in raw]; ybt[u] = int(round(np.median(w))) if len(w) >= 5 else raw[u]
    def ribbon(x, D):
        """Column x's chain rows (Ti[x]-1 .. Ti[x]+CHAIN_H) as copied from the bottom chain of column x + D: (8, 3) array."""
        u = x + D; s = Ti[x] - ybt[u]; y0 = Ti[x] - 1
        return a[y0 - s:y0 - s + CHAIN_H + 2, u]
    def ribbon_here(x):
        return a[Ti[x] - 1:Ti[x] + CHAIN_H + 1, x]
    Ds = [D for D in range(-12, 13) if all(x + D in ybt for x in range(hx0 - 4, hx1 + 5))]
    best = None
    c_left = {D: sum(np.abs(ribbon(x, D) - ribbon_here(x)).sum() for x in range(hx0 - 4, hx0)) for D in Ds}
    c_right = {D: sum(np.abs(ribbon(x, D) - ribbon_here(x)).sum() for x in range(hx1 + 1, hx1 + 5)) for D in Ds}
    for seam in range(hx0 + 12, hx1 - 12):
        rib = {D: np.stack([ribbon(x, D) for x in range(seam - 1, seam + 3)]) for D in Ds}
        for D1 in Ds:
            for D2 in Ds:
                c = c_left[D1] + c_right[D2] + np.abs(rib[D1] - rib[D2]).sum()
                if best is None or c < best[0]: best = (c, seam, D1, D2)
    _, seam, D1, D2 = best
    # the vertical move is held constant over each bead and steps only in the gaps between beads (the columns with the fewest bead
    # pixels), so no bead is broken by a one-row step inside it
    def bead_rows(u):
        rows = np.where(bob[ybt[u] - 1:ybt[u] + CHAIN_H + 1, u])[0]
        return (ybt[u] - 1 + int(rows.min()), ybt[u] - 1 + int(rows.max())) if len(rows) else (ybt[u], ybt[u])
    shift = {}
    for x0, x1, D in ((hx0, seam, D1), (seam + 1, hx1, D2)):
        cols = list(range(x0, x1 + 1)); cnt = [int(bob[ybt[x + D] - 1:ybt[x + D] + CHAIN_H + 1, x + D].sum()) for x in cols]
        gaps = [i for i in range(1, len(cols) - 1) if cnt[i] <= cnt[i - 1] and cnt[i] <= cnt[i + 1] and cnt[i] <= min(cnt) + 2]
        cuts = [0]
        for i in gaps:
            if i - cuts[-1] >= 4: cuts.append(i)
        cuts.append(len(cols)); prev = None
        for i0, i1 in zip(cuts, cuts[1:]):
            s = int(round(np.mean([T(x) - ybt[x + D] for x in cols[i0:i1]])))
            if prev is not None: s = max(prev - 1, min(prev + 1, s))        # one row per step at most
            for x in cols[i0:i1]: shift[x] = s
            prev = s
    n_chain = 0; n_chain_other = []; rim_fix = []
    for y, x in zip(ys[zone == 1], xs[zone == 1]):
        D = D1 if x <= seam else D2; u = x + D; ysrc = y - shift[x]
        if bob[ysrc, u]: out[y, x] = a[ysrc, u]; n_chain += 1; continue
        up, dn, lf, rt = bob[ysrc - 1, u], bob[ysrc + 1, u], bob[ysrc, u - 1], bob[ysrc, u + 1]; n4 = int(up) + int(dn) + int(lf) + int(rt)
        if n4 >= 3: out[y, x] = a[ysrc, u]; n_chain += 1; continue         # a highlight inside a bead
        if n4 >= 1:                                                          # a rim pixel: its bead share is estimated against the ground it mixes with at the source and re-composited over the ground it meets up here
            nb = a[ysrc - 1:ysrc + 2, u - 1:u + 2].reshape(-1, 3); nbm = bob[ysrc - 1:ysrc + 2, u - 1:u + 2].reshape(-1); c_bead = nb[nbm].mean(axis=0)
            top_rim = (dn and not up) or (not dn and not up and ysrc <= ybt[u] + 2)
            bg_src = a[ybt[u] - 3, u] if top_rim else a[int(round(B(u))) + 2, u]   # carpet above the bottom chain's beads, floor below them
            d = c_bead - bg_src; al = float(np.clip(np.dot(a[ysrc, u] - bg_src, d) / max(1.0, np.dot(d, d)), 0.0, 1.0))
            if top_rim: out[y, x] = al * c_bead + (1 - al) * a[y, floor_src(y, x)]; n_chain += 1   # the top rim meets floor here
            else: rim_fix.append((y, x, al, c_bead)); n_chain_other.append((y, x))                 # lower / side rims meet the stripes here (filled below)
            continue
        if ysrc < bead_rows(u)[0]: out[y, x] = a[y, floor_src(y, x)]        # above the bead: floor
        else: n_chain_other.append((y, x))                                   # below the bead: stripes
    # ---- the stripes: every pixel samples the clean carpet at EXACTLY its own stripe phase — the nearest point along its stripe (either
    # way), or a whole period across the stripes and then along — read bilinearly at that (fractional) spot, so the stripes' soft 1-px
    # edges come out as the same soft edges (integer shifts with a little phase error made the edges hard and ragged)
    zone_m = np.zeros(mask.shape, bool); zone_m[385:480, max(0, hx0 - 45):min(hx1 + 70, FLAT_RIGHT)] = True; zone_m &= ~_dilate(mask, 4)   # the straight stretch
    deg, P, purity = _refine_hatch(a, interior, zone_m)
    c, s_ = math.cos(math.radians(deg)), math.sin(math.radians(deg))         # the stripe normal (phase = x*c + y*s); along a stripe: (-s, c)
    good = interior & ~_dilate(~interior, 2) & ~_dilate(mask, 3)             # clean carpet, 2 px away from any edge / bead, 3 px from the hole
    cands = []
    for m in (0, 1, -1, 2, -2):
        for t2 in range(0, 241):
            for sg in ((1,) if t2 == 0 else (1, -1)):
                t = sg * t2 / 2.0; dx = -s_ * t + c * m * P; dy = c * t + s_ * m * P
                if t2 or m: cands.append((dx * dx + dy * dy, dx, dy))
    cands.sort()
    todo_y = np.concatenate([ys[zone == 2], np.array([p[0] for p in n_chain_other], int)]); todo_x = np.concatenate([xs[zone == 2], np.array([p[1] for p in n_chain_other], int)])
    left = np.ones(len(todo_y), bool); n_far = 0
    for _, dx, dy in cands:
        if not left.any(): break
        ty = todo_y[left] + dy; tx = todo_x[left] + dx
        y0 = np.floor(ty).astype(int); x0 = np.floor(tx).astype(int); fy = ty - y0; fx = tx - x0
        okm = (y0 >= 0) & (y0 + 1 < H) & (x0 >= 0) & (x0 + 1 < W)
        okm[okm] = good[y0[okm], x0[okm]] & good[y0[okm] + 1, x0[okm]] & good[y0[okm], x0[okm] + 1] & good[y0[okm] + 1, x0[okm] + 1]
        idx = np.where(left)[0][okm]; y0, x0 = y0[okm], x0[okm]; fy = fy[okm][:, None]; fx = fx[okm][:, None]
        out[todo_y[idx], todo_x[idx]] = a[y0, x0] * (1 - fy) * (1 - fx) + a[y0 + 1, x0] * fy * (1 - fx) + a[y0, x0 + 1] * (1 - fy) * fx + a[y0 + 1, x0 + 1] * fy * fx
        left[idx] = False
        if dx * dx + dy * dy > 90 * 90: n_far += int(okm.sum())
    n_unfilled = int(left.sum())
    for y, x in zip(todo_y[left], todo_x[left]): out[y, x] = out[y - 1, x]   # (never expected) the row above
    for y, x, al, c_bead in rim_fix: out[y, x] = al * c_bead + (1 - al) * out[y, x]   # the beads' lower / side rims over the stripes just filled
    # ---- feather the floor rim only (the chain and the stripes are exact copies, left crisp)
    ring = _dilate(mask, 1) & ~mask
    for y, x in zip(*np.where(ring)):
        if y < Ti[x] - 1: out[y, x] = 0.5 * a[y, x] + 0.5 * out[y - 1:y + 2, x - 1:x + 2].reshape(-1, 3).mean(axis=0)
    return {"hole": (hx0, hy0, hx1, hy1), "zones": {"floor": int((zone == 0).sum()), "chain": int((zone == 1).sum()), "stripes": int((zone == 2).sum())},
            "edge_fit": [round(float(np.polyval(co, x)), 1) for x in range(hx0, hx1 + 1, 10)], "chain_seam": seam, "chain_offsets": (D1, D2), "chain_match_cost": round(float(best[0])),
            "chain_move_rows": sorted(set(shift.values())), "chain_steps": sum(1 for x in range(hx0, hx1) if shift[x] != shift[x + 1]), "chain_rims_remixed": len(rim_fix),
            "chain_copied": n_chain, "hatch": {"deg": round(deg, 2), "period": round(P, 2), "purity": round(purity, 4)}, "stripe_pixels_from_beyond_90px": n_far, "unfilled": n_unfilled,
            "floor_source_cols": sorted(set(_fs.values()))}


def _fill_rows(a, out, mask):
    for y in np.where(mask.any(axis=1))[0]:
        xs = np.where(mask[y])[0]; xl, xr = int(xs.min()), int(xs.max())
        left = a[y, xl - 4:xl].mean(axis=0); right = a[y, xr + 1:xr + 5].mean(axis=0)
        t = (np.arange(xl, xr + 1) - (xl - 0.5)) / float(xr + 1 - xl); out[y, xl:xr + 1] = left[None, :] * (1 - t)[:, None] + right[None, :] * t[:, None]


def car_hole(shape):
    """The car's hole in the export: its render's silhouette grown CAR_PAD px, plus SHADOW_DOWN rows below it for the baked soft shadow."""
    car = Image.open(CAR_PNG).convert("RGBA")
    al = _paste_alpha(shape, car, CAR_PIC[0], CAR_PIC[1], (CAR_PIC[2], CAR_PIC[2]), rot=CAR_PIC[3])
    m = _dilate(al, CAR_PAD); core = _dilate(al, 2)
    for k in range(1, SHADOW_DOWN + 1):
        sh = np.roll(core, k, 0); sh[:k] = False; m |= sh
    return m


EXPORT_RC2 = os.path.join(HERE, "rc2_frame_338-2198_export.png")   # [L02-RC2-FIG-2] the 338-2198 frame: the same room, the car elsewhere


def clean(export_path=EXPORT):
    im = Image.open(export_path).convert("RGB"); a = np.array(im).astype(float); out = a.copy(); shape = a.shape[:2]
    cm = car_hole(shape)
    if os.path.exists(EXPORT_RC2):
        # [L02-RC2-FIG-2] (2026-10-10) the RC2 frame (338-2198) is the same room pixel for pixel with the car parked elsewhere, so the
        # carpet under RC1's car is simply READ from it — exact, no reconstruction (which stays below as the fallback)
        a2 = np.array(Image.open(EXPORT_RC2).convert("RGB")).astype(float)
        same = (np.abs(a2 - a).sum(axis=2) <= 30); ring = _dilate(cm, 6) & ~cm
        assert a2.shape == a.shape and same[ring].mean() > 0.97, "the RC2 export is not the same room around the car: %.3f" % same[ring].mean()
        out[cm] = a2[cm]; info = {"hole": tuple(int(v) for v in (np.where(cm.any(0))[0].min(), np.where(cm.any(1))[0].min(), np.where(cm.any(0))[0].max(), np.where(cm.any(1))[0].max())), "car_hole_from": os.path.basename(EXPORT_RC2)}
    else: info = _fill_car(a, out, cm)
    gif = Image.open(BOY_GIF); gif.seek(0); boy = gif.convert("RGBA").transpose(Image.FLIP_LEFT_RIGHT)
    bm = _dilate(_paste_alpha(shape, boy, BOY_CANVAS[0], BOY_CANVAS[1], (BOY_CANVAS[2], BOY_CANVAS[3])), 3)
    rows = np.where(bm.any(axis=1))[0]; fb = int(rows.max()); cols = np.where(bm[fb - 14:fb + 1].any(axis=0))[0]
    bm[fb - 2:fb + 15, int(cols.min()) - 10:int(cols.max()) + 11] = True                           # the soft shadow under the feet
    _fill_rows(a, out, bm)
    ring = _dilate(bm, 1) & ~bm                                                                     # feather the boy hole's rim
    for y, x in zip(*np.where(ring)): out[y, x] = 0.5 * a[y, x] + 0.5 * out[y - 1:y + 2, x - 1:x + 2].reshape(-1, 3).mean(axis=0)
    rows = np.where(bm.any(axis=1))[0]; cols = np.where(bm.any(axis=0))[0]
    info["boy_hole"] = (int(cols.min()), int(rows.min()), int(cols.max()), int(rows.max()))
    return Image.fromarray(np.clip(out, 0, 255).astype("uint8")), info


def ensure_clean(export_path=EXPORT, clean_path=CLEAN):
    """Write the cleaned picture unless it is newer than both the export and this module; returns (path, info or None)."""
    newest = max([os.path.getmtime(export_path), os.path.getmtime(os.path.abspath(__file__))] + ([os.path.getmtime(EXPORT_RC2)] if os.path.exists(EXPORT_RC2) else []))
    if os.path.exists(clean_path) and os.path.getmtime(clean_path) >= newest:
        return clean_path, None
    img, info = clean(export_path); img.save(clean_path); return clean_path, info


if __name__ == "__main__":
    res, info = clean(); p = os.path.join(HERE, "rc1_scene_338-3_clean_preview.png"); res.save(p); print("wrote", p, info)
