"""[L02-FIND-PIC-2] (2026-10-12) Trace the three tappable figures of the NEW find-Madhav picture — the mother, the boy and the
TEDDY BEAR (the football of the first picture is gone) — and write find_madhav_shapes_2.json, which build.py turns into the page's
SVG outlines. The method is trace_find_shapes.py's (a rough hand prior, colour classification in a band round it, morphology,
hole fill, the blob round a seed, 1 px outward, boundary trace, smoothing, resampling, Douglas-Peucker), with the figure /
background colours SAMPLED from the picture at hand-picked points instead of typed in.

    python trace_find_shapes_2.py [preview_dir]

Coordinates are pixels of the page's 1671x941 canvas (find_madhav_2 canvas = the user's 1774x887 picture scaled to 1671x836 and
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
  "bear": dict(box=(1380, 510, 1550, 730), band=6, seed=(1465, 650),
    prior=[(1445,530),(1460,538),(1480,538),(1497,542),(1513,543),(1527,560),(1523,577),(1520,593),(1513,610),(1523,620),(1530,643),
           (1527,663),(1513,670),(1507,677),(1503,690),(1482,693),(1477,684),(1470,693),(1447,693),(1437,682),(1433,670),(1410,660),
           (1400,643),(1413,627),(1420,620),(1427,610),(1422,587),(1425,563),(1430,550),(1430,542)],
    fig_pts=[(1470,585),(1440,560),(1455,660),(1440,540),(1510,560),(1415,655),(1510,650),(1430,695),(1485,695),(1448,622),(1455,605),(1490,600)],
    bg_pts=[(1370,620),(1380,700),(1450,735),(1530,690),(1540,730),(1545,560),(1548,620),(1478,538),(1400,560),(1395,600)],
    force_bg=[]),
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
def segment(name, F):
    x0, y0, x1, y1 = F["box"]; w, h = x1 - x0, y1 - y0; BAND = F["band"]
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
    m = m.filter(ImageFilter.MaxFilter(3))
    chain = trace(m)
    pts = resample(smooth_closed([(x + 0.5, y + 0.5) for x, y in chain], 9), 4.0)
    simp = dp(pts + [pts[0]], 0.7)[:-1]
    print(name, "boundary", len(chain), "px, resampled", len(pts), ", simplified", len(simp), "points")
    if PREVIEW:
        z = 3; c = im.crop(F["box"]).resize((w * z, h * z), Image.LANCZOS); d = ImageDraw.Draw(c)
        d.line([((x - x0) * z, (y - y0) * z) for x, y in F["prior"]] + [((F["prior"][0][0] - x0) * z, (F["prior"][0][1] - y0) * z)], fill=(255, 0, 255), width=1)
        d.line([(x * z, y * z) for x, y in simp] + [(simp[0][0] * z, simp[0][1] * z)], fill=(255, 255, 255), width=3)
        c.save(os.path.join(PREVIEW, "trace2_%s.png" % name))
    return [(round(x + x0, 1), round(y + y0, 1)) for x, y in simp]
if __name__ == "__main__":
    out = {"view": [W, H], "boy": segment("boy", FIGS["boy"]), "mother": segment("mother", FIGS["mother"]), "bear": segment("bear", FIGS["bear"])}
    with open(OUT, "w", encoding="utf-8") as f: json.dump(out, f, separators=(",", ":"))
    print("wrote", OUT)
