"""[L02-FIND-PIC-2] (2026-10-12) Trace the three tappable figures of the NEW find-Madhav picture — the mother, the boy and the
TEDDY BEAR (the football of the first picture is gone) — and write find_madhav_shapes_2.json, which build.py turns into the page's
SVG outlines. The method is trace_find_shapes.py's (a rough hand prior, colour classification in a band round it, morphology,
hole fill, the blob round a seed, 1 px outward, boundary trace, smoothing, resampling, Douglas-Peucker), with the figure /
background colours SAMPLED from the picture at hand-picked points instead of typed in.

    python trace_find_shapes_2.py [preview_dir]

Rev 2 (2026-10-12, user request: "make the white stroke more perfectly smooth and more accurately around the characters and the teddy
bear"): the colour mask is blurred and re-thresholded (rounded corners, no pixel steps), every boundary point is then SNAPPED to the
picture's own contour — the strongest colour edge within +-4 px along the outline's normal, the snap offsets smoothed along the chain
so the line never jitters — and the result is smoothed again and kept dense (a point every 4 px, Douglas-Peucker 0.35 px) so the
page's Catmull-Rom curve follows the figures closely. Coordinates are pixels of the page's 1671x941 canvas (find_madhav_2 canvas = the user's 1774x887 picture scaled to 1671x836 and
placed at y -2, edge rows replicated — see canvas_2() below, also used by build.py)."""
import math, json, sys, os
from PIL import Image, ImageDraw, ImageFilter
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "find_madhav_source_2.png"); OUT = os.path.join(HERE, "find_madhav_shapes_2.json")
PREVIEW = sys.argv[1] if len(sys.argv) > 1 else None
W, H = 1671, 941
def canvas_2(src=SRC):
    """The page's 1671x941 canvas from the user's picture: scaled to the canvas width (1671x836), centred on the box's visible
    window (canvas rows 28..804), the rows above / below replicated from the picture's edge rows (they are never shown)."""
    im = Image.open(src).convert("RGB"); assert im.size == (1774, 887), im.size
    sc = im.resize((W, round(im.height * W / im.width)), Image.LANCZOS)   # 1671x836
    top = round((28.1 + 804.1) / 2 - sc.height / 2)                        # -2
    c = Image.new("RGB", (W, H)); c.paste(sc, (0, top))
    for y in range(0, max(top, 0)): c.paste(sc.crop((0, 0, W, 1)), (0, y))
    for y in range(top + sc.height, H): c.paste(sc.crop((0, sc.height - 1, W, sc.height)), (0, y))
    return c
im = canvas_2(); PX = im.load()
# rough priors (hand-read from gridded crops), seeds, and the POINTS whose colours stand for figure / background
FIGS = {
  "mother": dict(box=(570, 140, 900, 420), band=14, seed=(790, 260),
    prior=[(730,168),(760,158),(800,156),(835,165),(860,185),(873,215),(876,250),(870,285),(855,305),(838,322),(845,345),(848,372),
           (835,385),(805,388),(780,380),(760,365),(735,350),(705,342),(670,330),(640,318),(615,300),(603,275),(603,250),(612,228),
           (628,212),(655,205),(680,208),(700,200),(712,185)],
    fig_pts=[(800,175),(640,235),(860,250),(790,250),(830,300),(810,365),(660,290),(700,330),(745,335)],
    bg_pts=[(600,190),(920,220),(900,270),(650,420),(780,430),(560,360),(570,165),(690,172),(600,330)],
    force_bg=[(852, 330, 900, 420)]),                                       # the boy's hand / hair next to her fist
  "boy": dict(box=(830, 260, 1080, 470), band=9, seed=(940, 350),
    prior=[(883,297),(905,284),(940,280),(970,282),(990,292),(1008,308),(1014,330),(1013,352),(1008,368),(1003,385),(1010,398),
           (1012,412),(1010,426),(995,431),(960,432),(925,432),(898,431),(870,428),(852,420),(851,410),(862,402),(880,397),(868,385),
           (866,360),(868,335),(872,315)],
    fig_pts=[(960,300),(995,320),(930,360),(880,370),(885,415),(960,410),(1000,405),(905,330),(940,395)],
    bg_pts=[(1050,300),(1060,400),(1100,350),(900,470),(1000,480),(870,300),(1040,440),(860,450),(1070,320)],
    force_bg=[(830, 300, 852, 400)]),                                       # the mother's fist next to his hand
  "bear": dict(box=(1370, 505, 1550, 720), seed=(1465, 650), ridge=(6, 10, 95), seeds=[(1470, 585), (1455, 660)],   # rev 2: no
    part_max=5000, part_box=(1375, 515, 1548, 712), prior=[], fig_pts=[], bg_pts=[], force_bg=[]),                   # prior — see segment()
}
def nearest_is_fig(c, fig, bg):
    best, isfig = 1e9, False
    for p in fig:
        d = (c[0]-p[0])**2 + (c[1]-p[1])**2 + (c[2]-p[2])**2
        if d < best: best, isfig = d, True
    for p in bg:
        d = (c[0]-p[0])**2 + (c[1]-p[1])**2 + (c[2]-p[2])**2
        if d < best: best, isfig = d, False
    return isfig
def fill_holes(m):
    w, h = m.size; reach = Image.eval(m, lambda v: 0 if v else 255)
    ImageDraw.floodfill(reach, (0, 0), 128)
    rp, mp = reach.load(), m.load()
    for y in range(h):
        for x in range(w):
            if rp[x, y] == 255: mp[x, y] = 255
    return m
def blob_from_seed(m, seed):
    k = m.copy(); assert k.load()[seed] == 255, "seed is not on the figure"
    ImageDraw.floodfill(k, seed, 128)
    return Image.eval(k, lambda v: 255 if v == 128 else 0)
NB = [(-1,0),(-1,-1),(0,-1),(1,-1),(1,0),(1,1),(0,1),(-1,1)]
def trace(m):
    w, h = m.size; p = m.load()
    def inside(q): return 0 <= q[0] < w and 0 <= q[1] < h and p[q[0], q[1]] > 0
    start = None
    for y in range(h):
        for x in range(w):
            if p[x, y] > 0: start = (x, y); break
        if start: break
    cur, back = start, (start[0] - 1, start[1]); out = [start]
    for _ in range(200000):
        idx = NB.index((back[0] - cur[0], back[1] - cur[1])); nxt = None
        for k in range(1, 9):
            d = NB[(idx + k) % 8]; q = (cur[0] + d[0], cur[1] + d[1])
            if inside(q):
                pd = NB[(idx + k - 1) % 8]; back = (cur[0] + pd[0], cur[1] + pd[1]); nxt = q; break
        if nxt is None: break
        cur = nxt
        if cur == start: break
        out.append(cur)
    return out
def smooth_closed(pts, win):
    n = len(pts); half = win // 2
    return [(sum(pts[(i + j) % n][0] for j in range(-half, half + 1)) / win,
             sum(pts[(i + j) % n][1] for j in range(-half, half + 1)) / win) for i in range(n)]
def resample(pts, step):
    out = [pts[0]]; acc = 0.0; n = len(pts)
    for i in range(1, n + 1):
        a, b = pts[i - 1], pts[i % n]; seg = math.hypot(b[0] - a[0], b[1] - a[1])
        while acc + seg >= step and seg > 0:
            t = (step - acc) / seg; a = (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t); out.append(a)
            seg = math.hypot(b[0] - a[0], b[1] - a[1]); acc = 0.0
        acc += seg
    if len(out) > 1 and math.hypot(out[-1][0] - out[0][0], out[-1][1] - out[0][1]) < step * 0.5: out.pop()
    return out
def dp(pts, eps):
    if len(pts) < 3: return pts
    a, b = pts[0], pts[-1]; dmax, idx = 0, 0; L = math.hypot(b[0] - a[0], b[1] - a[1])
    for i in range(1, len(pts) - 1):
        p = pts[i]
        d = abs((b[0] - a[0]) * (a[1] - p[1]) - (a[0] - p[0]) * (b[1] - a[1])) / L if L else math.hypot(p[0] - a[0], p[1] - a[1])
        if d > dmax: dmax, idx = d, i
    if dmax > eps: return dp(pts[:idx + 1], eps)[:-1] + dp(pts[idx:], eps)
    return [a, b]
import numpy as np
ARR = np.asarray(im, dtype=np.float32)                               # H x W x 3
_gx = np.zeros(ARR.shape[:2], np.float32); _gy = np.zeros(ARR.shape[:2], np.float32)
_gx[:, 1:-1] = np.sqrt(((ARR[:, 2:] - ARR[:, :-2]) ** 2).sum(axis=2)); _gy[1:-1, :] = np.sqrt(((ARR[2:, :] - ARR[:-2, :]) ** 2).sum(axis=2))
GRAD = np.sqrt(_gx ** 2 + _gy ** 2)                                  # colour edge strength (central differences)
def grad_at(x, y):
    """bilinear GRAD at a canvas point"""
    x = min(max(x, 0.0), W - 1.001); y = min(max(y, 0.0), H - 1.001); x0, y0 = int(x), int(y); fx, fy = x - x0, y - y0
    g = GRAD; return float((g[y0, x0] * (1 - fx) + g[y0, x0 + 1] * fx) * (1 - fy) + (g[y0 + 1, x0] * (1 - fx) + g[y0 + 1, x0 + 1] * fx) * fy)
def snap_to_edges(pts, mask, ox, oy, reach=4.0, step=0.5, out=0.5):
    """pts: closed chain (canvas px) on the mask's boundary; mask: PIL 'L' of the figure's box at (ox, oy). Each point moves along its
    outward normal to the strongest colour edge within +-reach px (plus `out` px outward); offsets are smoothed along the chain (window
    9) and points with no clear edge (peak under a third of the chain's median peak) take their neighbours' offset."""
    n = len(pts); mp = mask.load(); mw, mh = mask.size
    def inside(x, y):
        xi, yi = int(round(x - ox)), int(round(y - oy)); return 0 <= xi < mw and 0 <= yi < mh and mp[xi, yi] > 0
    normals, best, peak = [], [], []
    for i in range(n):
        a, b, c = pts[i - 1], pts[i], pts[(i + 1) % n]
        tx, ty = c[0] - a[0], c[1] - a[1]; L = math.hypot(tx, ty) or 1.0; nx, ny = ty / L, -tx / L
        if inside(b[0] + 3 * nx, b[1] + 3 * ny): nx, ny = -nx, -ny        # outward
        normals.append((nx, ny))
        offs = [k * step for k in range(int(-reach / step), int(reach / step) + 1)]
        vals = [grad_at(b[0] + o * nx, b[1] + o * ny) for o in offs]
        k = max(range(len(offs)), key=lambda j: vals[j] - 0.5 * abs(offs[j]))   # a mild pull toward the mask's own boundary
        best.append(offs[k]); peak.append(vals[k])
    med = sorted(peak)[n // 2]; ok = [p >= med / 3 for p in peak]
    filled = list(best)
    for i in range(n):
        if ok[i]: continue
        for d in range(1, n):
            if ok[(i - d) % n]: filled[i] = best[(i - d) % n]; break
            if ok[(i + d) % n]: filled[i] = best[(i + d) % n]; break
    sm = [sum(filled[(i + j) % n] for j in range(-4, 5)) / 9 for i in range(n)]
    return [(pts[i][0] + (sm[i] + out) * normals[i][0], pts[i][1] + (sm[i] + out) * normals[i][1]) for i in range(n)]
def catmull_rom_points(pts, per=8):
    """the closed Catmull-Rom curve build.py draws through the points, sampled `per` times per segment"""
    n = len(pts); out = []
    for i in range(n):
        p0, p1, p2, p3 = pts[i - 1], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6); c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        for k in range(per):
            t = k / per; u = 1 - t
            out.append((u*u*u*p1[0] + 3*u*u*t*c1[0] + 3*u*t*t*c2[0] + t*t*t*p2[0], u*u*u*p1[1] + 3*u*u*t*c1[1] + 3*u*t*t*c2[1] + t*t*t*p2[1]))
    return out
def segment(name, F):
    x0, y0, x1, y1 = F["box"]; w, h = x1 - x0, y1 - y0
    if F.get("ridge"):
        # rev 2, the bear: its fur is the colour of the floor's shadow beside it and its contour line is faint, so neither colour nor
        # darkness bounds it; but the drawn line is a dark RIDGE — a pixel darker than its local mean by `d` (a shadow's edge is a soft
        # step, never a ridge). The ridge (+ anything darker than `dark`), thickened 1 px, is the barrier; the passable pixels fall into
        # parts (the line also divides the bear into head, ears, arms, paws, feet, body…): the parts holding the two safe seeds start the
        # figure and every small part (< part_max px, inside part_box, not touching the box border — the floor does) within 4 px of it
        # is added, over and over, until nothing joins; eyes, nose, muzzle, bow and the lines between the parts are then filled as holes
        # and the figure grown 3 px so the boundary sits on the line's outer edge, where the snap settles it.
        r, d, dark = F["ridge"]
        Y = 0.3 * ARR[:, :, 0] + 0.59 * ARR[:, :, 1] + 0.11 * ARR[:, :, 2]
        k = 2 * r + 1; pad = np.pad(Y, r, mode="edge"); cs = np.pad(np.cumsum(np.cumsum(pad, axis=0), axis=1), ((1, 0), (1, 0)))
        M = (cs[k:, k:] - cs[:-k, k:] - cs[k:, :-k] + cs[:-k, :-k]) / (k * k)
        ridge = ((M - Y) >= d) | (Y < dark)
        bar = Image.fromarray((ridge[y0:y1, x0:x1] * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3))
        passable = ~np.asarray(bar).astype(bool)
        label = np.zeros((h, w), np.int32); parts = []                           # 8-connected parts of the passable pixels
        for sy in range(h):
            for sx in range(w):
                if not passable[sy, sx] or label[sy, sx]: continue
                idx = len(parts) + 1; stack = [(sx, sy)]; label[sy, sx] = idx; px_list = []
                while stack:
                    cx, cy = stack.pop(); px_list.append((cx, cy))
                    for dx in (-1, 0, 1):
                        for dy in (-1, 0, 1):
                            nx, ny = cx + dx, cy + dy
                            if 0 <= nx < w and 0 <= ny < h and passable[ny, nx] and not label[ny, nx]: label[ny, nx] = idx; stack.append((nx, ny))
                xs = [q[0] for q in px_list]; ys = [q[1] for q in px_list]
                parts.append(dict(idx=idx, n=len(px_list), border=(min(xs) == 0 or min(ys) == 0 or max(xs) == w - 1 or max(ys) == h - 1),
                                  bbox=(min(xs) + x0, min(ys) + y0, max(xs) + x0, max(ys) + y0)))
        taken = set()
        for sx, sy in F["seeds"]:
            li = 0
            for rad in range(0, 9):                                               # the seed, or the nearest passable pixel within 8 px
                cands = [(sx + dx, sy + dy) for dx in range(-rad, rad + 1) for dy in range(-rad, rad + 1) if max(abs(dx), abs(dy)) == rad]
                hits = [int(label[cy - y0, cx - x0]) for cx, cy in cands if 0 <= cx - x0 < w and 0 <= cy - y0 < h and label[cy - y0, cx - x0]]
                if hits: li = max(set(hits), key=hits.count); break
            assert li, "seed %r has no passable pixel near it" % ((sx, sy),); assert not parts[li - 1]["border"], "seed part %r touches the border" % ((sx, sy),); taken.add(li)
        bx0, by0, bx1, by1 = F["part_box"]
        while True:
            cur = np.isin(label, list(taken)); near = np.asarray(Image.fromarray((cur * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(9))).astype(bool)
            added = 0
            for P in parts:
                if P["idx"] in taken or P["border"] or P["n"] > F["part_max"]: continue
                if P["bbox"][0] < bx0 or P["bbox"][1] < by0 or P["bbox"][2] > bx1 or P["bbox"][3] > by1: continue
                if (near & (label == P["idx"])).any(): taken.add(P["idx"]); added += 1
            if not added: break
        cur = np.isin(label, list(taken)); print(name, "ridge parts", len(parts), "taken", len(taken), "area", int(cur.sum()), "of", w * h)
        m = Image.fromarray((cur * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(7))
    else:
        BAND = F["band"]
        fig = [PX[p] for p in F["fig_pts"]]; bg = [PX[p] for p in F["bg_pts"]]
        print(name, "fig colours", fig); print(name, "bg colours", bg)
        prior = Image.new("L", (w, h), 0); ImageDraw.Draw(prior).polygon([(x - x0, y - y0) for x, y in F["prior"]], fill=255)
        core = prior.filter(ImageFilter.MinFilter(2 * BAND + 1)); outer = prior.filter(ImageFilter.MaxFilter(2 * BAND + 1))
        cp, op = core.load(), outer.load()
        m = Image.new("L", (w, h), 0); mp = m.load()
        for y in range(h):
            for x in range(w):
                if cp[x, y]: mp[x, y] = 255
                elif op[x, y] and nearest_is_fig(PX[x + x0, y + y0], fig, bg): mp[x, y] = 255
        for bx0, by0, bx1, by1 in F.get("force_bg", []):
            ImageDraw.Draw(m).rectangle((bx0 - x0, by0 - y0, bx1 - x0 - 1, by1 - y0 - 1), fill=0)
        m = m.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5))
        m = m.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))
    m = blob_from_seed(fill_holes(m), (F["seed"][0] - x0, F["seed"][1] - y0))
    m = m.filter(ImageFilter.GaussianBlur(2.5)).point(lambda v: 255 if v >= 128 else 0)   # rev 2: rounded, step-free boundary
    m = blob_from_seed(fill_holes(m), (F["seed"][0] - x0, F["seed"][1] - y0))
    chain = trace(m)
    pts = resample(smooth_closed([(x + x0 + 0.5, y + y0 + 0.5) for x, y in chain], 7), 3.0)   # canvas px
    raw = list(pts)
    pts = snap_to_edges(pts, m, x0, y0)                                                # rev 2: onto the picture's contour line
    pts = resample(smooth_closed(pts, 7), 4.0)
    simp = [(x - x0, y - y0) for x, y in dp(pts + [pts[0]], 0.35)[:-1]]                  # box px (the preview + the return below)
    print(name, "boundary", len(chain), "px, snapped", len(pts), ", kept", len(simp), "points")
    if PREVIEW:
        z = 4; c = im.crop(F["box"]).resize((w * z, h * z), Image.LANCZOS); d = ImageDraw.Draw(c)
        curve = catmull_rom_points(simp, 8)   # the stroke at its real relative width: 3 CSS px at 951/1671 = 5.3 canvas px
        d.line([(x * z, y * z) for x, y in curve] + [(curve[0][0] * z, curve[0][1] * z)], fill=(255, 255, 255), width=round(5.3 * z), joint="curve")
        if os.environ.get("TRACE_DEBUG"):   # the prior (magenta) and the mask boundary before the snap (cyan)
            if F["prior"]: d.line([((x - x0) * z, (y - y0) * z) for x, y in F["prior"]] + [((F["prior"][0][0] - x0) * z, (F["prior"][0][1] - y0) * z)], fill=(255, 0, 255), width=2)
            d.line([((x - x0) * z, (y - y0) * z) for x, y in raw] + [((raw[0][0] - x0) * z, (raw[0][1] - y0) * z)], fill=(0, 255, 255), width=2)
        c.save(os.path.join(PREVIEW, "trace2_%s.png" % name))
    return [(round(x + x0, 1), round(y + y0, 1)) for x, y in simp]
if __name__ == "__main__":
    out = {"view": [W, H], "boy": segment("boy", FIGS["boy"]), "mother": segment("mother", FIGS["mother"]), "bear": segment("bear", FIGS["bear"])}
    with open(OUT, "w", encoding="utf-8") as f: json.dump(out, f, separators=(",", ":"))
    print("wrote", OUT)
