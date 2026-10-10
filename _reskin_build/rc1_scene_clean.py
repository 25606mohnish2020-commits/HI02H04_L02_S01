"""[L02-RC1-FIG-2] (2026-10-10) Lift the page's live elements out of the Figma 338-3 export so it can serve as RC1's scene picture.

The user could only export the frame flattened (rc1_frame_338-3_export.png, 1280x720 at 1x), so the car at the path's start and the boy
with his remote are baked into the room picture. The page draws both itself (the car drives off, the boy is the animated GIF), so the
baked copies must go — the car would be left behind as a ghost the moment the live car moves, and the GIF would not cover the static boy
exactly. The four "?" tokens are baked too, but the live tokens are the same 104x102 discs at the same spots, so they cover them.

Both holes are cut with the page's OWN renders, placed where template matching found them in the export (match_rc1_templates.py in the
session's scratchpad; the boy scored 11.7, i.e. the export's boy IS the GIF's first frame, mirrored, at scale 0.2170; the car IS
rc_car.webp at 70.6 px, turned 3 degrees):
 - the CAR: its render's silhouette + 4 px (its soft shadow) is refilled in three zones — the floor copied row for row from the nearest
   clean column whose carpet edge sits lower (floor for certain, planks level), the bead chain copied from the run just to the right,
   each column moved (fractionally, blended between rows) to the edge's height here, and the striped interior copied ALONG the stripes
   (the colour is constant along a stripe, so each pixel takes the nearest carpet pixel outside the hole in the stripe direction; the
   direction is measured beside the hole) — which reproduces the diagonals exactly.
 - the BOY: the GIF's silhouette + 3 px, and the soft shadow under his feet, refilled row by row by linear interpolation between the
   pixels just outside the hole on either side — the wall is a flat gradient and the floor planks and the skirting are horizontal.
The rims are feathered 1 px. clean(export_path) -> (cleaned 1280x720 RGB image, info). Pillow + numpy only.
`python rc1_scene_clean.py` writes rc1_scene_338-3_clean_preview.png beside the export."""
import os, math
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
EXPORT = os.path.join(HERE, "rc1_frame_338-3_export.png")
CAR_PNG = os.path.join(HERE, "rc_car_source.png")            # the side-view render (what rc_car.webp is made from)
BOY_GIF = os.path.join(HERE, "rc_boy_source.gif")            # the boy, 416x772, 36 frames

# the placements measured on the export (frame px), see the module docstring
BOY_CANVAS = (405.0, 236.0, 90.3, 167.5)                     # the mirrored GIF canvas: left, top, width, height
CAR_PIC = (205.2, 383.2, 70.6, 3.0)                          # the car picture: left, top, size, counter-clockwise tilt (deg)
CHAIN_D = 76                                                 # the bead chain is copied from this far to the right (the run just before the first "?")


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


def _transitions(pink, lav, x, ya, yb):
    col = pink[ya:yb, x].astype(int) - lav[ya:yb, x].astype(int); ts = []
    for y in range(1, len(col)):
        if col[y] != 0 and col[y - 1] != 0 and col[y] != col[y - 1]: ts.append(ya + y)
    return ts


def _fill_car(a, out, mask):
    """The hole over the car: the floor copied row for row from the nearest clean column whose carpet edge sits lower (floor for certain,
    planks level); the striped interior copied ALONG the stripes — the colour is constant along a stripe, so a pixel takes the nearest
    carpet pixel outside the hole in the stripe direction (up-right or down-left), which reproduces the diagonals; the direction is
    measured next to the hole (the one along which the carpet's colours change least over 24 px); the bead chain copied from the run to the
    right, each column moved to the edge's height here (the smoothed edge profiles make the move vary gently)."""
    H, W = mask.shape; pink, lav, bob = _carpet_masks(a); carpet = pink | lav | bob; interior = pink | lav
    hole_cols = np.where(mask.any(axis=0))[0]; hx0, hx1 = int(hole_cols.min()), int(hole_cols.max())
    rim_rows = np.where(mask.any(axis=1))[0]; hy0, hy1 = int(rim_rows.min()), int(rim_rows.max())
    top = {}
    for x in range(160, 1120):                                                # the carpet's top edge per column, the whole box wide
        if any(lo <= x <= hi for lo, hi in ((352, 463), (584, 695), (769, 880), (979, 1090))): continue   # the "?" discs hide the carpet
        rows = np.where(carpet[385:647, x])[0]
        if len(rows) > 10: top[x] = 385 + int(rows.min())
    # smooth the edge profile along x (median over 9 columns): the chain's bead highlights make the raw first-carpet-row jump about
    tops = {}
    for x in top:
        win = [top[k] for k in range(x - 4, x + 5) if k in top]
        tops[x] = float(np.median(win)) if len(win) >= 5 else float(top[x])
    top = tops
    lx = max(k for k in top if k < hx0 - 2); rx = min(k for k in top if k > hx1 + 2)
    def top_at(x):
        xi = int(round(x))
        if xi in top and not (hx0 - 2 <= xi <= hx1 + 2): return float(top[xi])
        if not (hx0 - 2 <= xi <= hx1 + 2):                                   # a clean column the mask skipped: the nearest measured one
            k = min(top, key=lambda q: abs(q - xi)); return float(top[k])
        t = (x - lx) / float(rx - lx); return top[lx] * (1 - t) + top[rx] * t
    # the stripe direction: among slopes dy/dx in -0.7..-1.4, the one along which the clean carpet beside the hole changes least
    zone = np.zeros(mask.shape, bool); zone[int(min(top.values())) + 10:472, hx0 - 50:hx1 + 50] = True; zone &= interior & ~_dilate(mask, 8)
    zy, zx = np.where(zone); best = None
    for sl in [-0.7 - 0.05 * i for i in range(15)]:                       # -0.7 .. -1.4 (rising to the right)
        tot = 0.0; n = 0
        for t in (8, 16, 24):
            dx = t / math.sqrt(1 + sl * sl); dy = sl * dx; x2 = np.round(zx + dx).astype(int); y2 = np.round(zy + dy).astype(int)
            okm = (x2 >= 0) & (x2 < W) & (y2 >= 0) & (y2 < H); okm &= zone[np.clip(y2, 0, H - 1), np.clip(x2, 0, W - 1)]
            if okm.sum() < 50: continue
            tot += np.abs(a[zy[okm], zx[okm]] - a[y2[okm], x2[okm]]).sum(axis=1).mean(); n += 1
        if n and (best is None or tot / n < best[0]): best = (tot / n, sl)
    m_slope = best[1] if best else -1.0
    ux = 1.0 / math.sqrt(1 + m_slope * m_slope); uy = m_slope * ux          # the unit step along a stripe (up-right for a negative slope)
    def along(x, y, sign):
        for k in range(1, 90):
            xs_ = int(round(x + sign * k * ux)); ys_ = int(round(y + sign * k * uy))
            if not (0 <= xs_ < W and 0 <= ys_ < H): return None
            if mask[ys_, xs_]: continue
            if ys_ < top_at(xs_) + 9: return None                          # left the carpet's interior through its edge
            if interior[ys_, xs_]: return (k, a[ys_, xs_])
            return None
        return None
    pk = a[zone & pink]; lv = a[zone & lav]
    c_pink = np.median(pk, axis=0) if len(pk) else np.array([253.0, 187, 186]); c_lav = np.median(lv, axis=0) if len(lv) else np.array([200.0, 166, 253])
    clean_cols = [k for k in top if (k < hx0 - 6 or k > hx1 + 6) and abs(k - (hx0 + hx1) / 2) < 150]
    _fc = {}
    def floor_col(x):
        """The nearest clean column whose carpet edge sits lower than the edge interpolated at x: its rows above this edge are floor for
        certain, and copying them row for row keeps the plank lines level."""
        if x not in _fc:
            te = top_at(x); cands = [k for k in clean_cols if top[k] >= te + 1]
            _fc[x] = min(cands, key=lambda k: abs(k - x)) if cands else min(clean_cols, key=lambda k: abs(k - x))
        return _fc[x]
    ys, xs = np.where(mask); n_dir = 0; n_fallback = 0
    for y, x in zip(ys, xs):
        te = top_at(x)
        if y < te - 2:                                                       # floor: the same row of the nearest clean column whose carpet edge is LOWER than here (floor for sure; planks stay level)
            out[y, x] = a[y, floor_col(x)]
        elif y <= te + 6:                                                    # the bead chain: the run CHAIN_D px to the right, each column moved to the edge's height here (fractional, blended between rows)
            sy = y - (te - top_at(x + CHAIN_D)); y0 = int(math.floor(sy)); f = sy - y0
            out[y, x] = a[min(max(y0, 0), H - 1), x + CHAIN_D] * (1 - f) + a[min(max(y0 + 1, 0), H - 1), x + CHAIN_D] * f
        else:
            r1 = along(x, y, +1); r2 = along(x, y, -1)
            cands = [r for r in (r1, r2) if r is not None]
            if cands:
                if len(cands) == 2:
                    (k1, c1), (k2, c2) = cands; w1 = k2 / float(k1 + k2); out[y, x] = c1 * w1 + c2 * (1 - w1)   # blend by distance, so a slightly off slope shows no seam
                else: out[y, x] = cands[0][1]
                n_dir += 1
            else:
                out[y, x] = c_pink if pink[min(y + 12, H - 1), x] else c_lav; n_fallback += 1
    return {"slope": round(m_slope, 2), "hole": (hx0, hy0, hx1, hy1), "filled_along_stripes": n_dir, "fallback": n_fallback, "pink": c_pink.round().tolist(), "lav": c_lav.round().tolist(),
            "chain": {"source_offset": CHAIN_D, "shifts": [round(top_at(x) - top_at(x + CHAIN_D), 1) for x in range(hx0, hx1 + 1, 11)]},
            "edge_at_hole": [round(top_at(x), 1) for x in range(hx0, hx1 + 1, 11)], "floor_source_cols": [floor_col(x) for x in range(hx0, hx1 + 1, 11)]}


def _fill_rows(a, out, mask):
    for y in np.where(mask.any(axis=1))[0]:
        xs = np.where(mask[y])[0]; xl, xr = int(xs.min()), int(xs.max())
        left = a[y, xl - 4:xl].mean(axis=0); right = a[y, xr + 1:xr + 5].mean(axis=0)
        t = (np.arange(xl, xr + 1) - (xl - 0.5)) / float(xr + 1 - xl); out[y, xl:xr + 1] = left[None, :] * (1 - t)[:, None] + right[None, :] * t[:, None]


def clean(export_path=EXPORT):
    im = Image.open(export_path).convert("RGB"); a = np.array(im).astype(float); out = a.copy(); shape = a.shape[:2]
    car = Image.open(CAR_PNG).convert("RGBA")
    cm = _dilate(_paste_alpha(shape, car, CAR_PIC[0], CAR_PIC[1], (CAR_PIC[2], CAR_PIC[2]), rot=CAR_PIC[3]), 4)
    info = _fill_car(a, out, cm)
    gif = Image.open(BOY_GIF); gif.seek(0); boy = gif.convert("RGBA").transpose(Image.FLIP_LEFT_RIGHT)
    bm = _dilate(_paste_alpha(shape, boy, BOY_CANVAS[0], BOY_CANVAS[1], (BOY_CANVAS[2], BOY_CANVAS[3])), 3)
    rows = np.where(bm.any(axis=1))[0]; fb = int(rows.max()); cols = np.where(bm[fb - 14:fb + 1].any(axis=0))[0]
    bm[fb - 2:fb + 15, int(cols.min()) - 10:int(cols.max()) + 11] = True                           # the soft shadow under the feet
    _fill_rows(a, out, bm)
    for m in (cm, bm):                                                                              # feather the rims
        ring = _dilate(m, 1) & ~m
        for y, x in zip(*np.where(ring)): out[y, x] = 0.5 * a[y, x] + 0.5 * out[y - 1:y + 2, x - 1:x + 2].reshape(-1, 3).mean(axis=0)
    rows = np.where(bm.any(axis=1))[0]; cols = np.where(bm.any(axis=0))[0]
    info["boy_hole"] = (int(cols.min()), int(rows.min()), int(cols.max()), int(rows.max()))
    return Image.fromarray(np.clip(out, 0, 255).astype("uint8")), info


if __name__ == "__main__":
    res, info = clean(); p = os.path.join(HERE, "rc1_scene_338-3_clean_preview.png"); res.save(p); print("wrote", p, info)
