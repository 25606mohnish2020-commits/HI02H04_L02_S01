"""[L02-FIND-HOTS] Trace the three tappable figures of the find-Madhav picture (find_madhav_source.png, 1671x941) from the
picture's own colours and write find_madhav_shapes.json, which build.py turns into the SVG outlines of the page.

    python trace_find_shapes.py [preview_dir]

The mother and the boy: inside a 12 px band round a rough hand-drawn prior, every pixel is labelled figure / background by
the nearest of a few sampled colours (hair, skin, the pink pyjamas, the blue shirt vs pillow, blanket, bed wood, the boy's
blue pillow); the labelled mask is closed, de-speckled, hole-filled, reduced to the blob round a seed pixel on the figure and
grown by 1 px so the stroke sits just outside the figure; its boundary is traced, smoothed (9 px running mean), resampled
every 4 px and simplified (Douglas-Peucker, 0.7 px). The football: the low-saturation (white / black) blob round the ball's
centre, fitted with a circle (median radius + 1.5 px). Coordinates are picture pixels. With a preview dir the crops of the
three figures are saved there with the outline drawn in white (and the prior in magenta)."""
import math, json, sys, os
from PIL import Image, ImageDraw, ImageFilter
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "find_madhav_source.png"); OUT = os.path.join(HERE, "find_madhav_shapes.json")
PREVIEW = sys.argv[1] if len(sys.argv) > 1 else None
im = Image.open(SRC).convert("RGB"); PX = im.load()
assert im.size == (1671, 941), im.size
# the rough priors (the earlier hand trace) — only the band round them is classified
BOY = [(967, 310), (995, 314), (1015, 335), (1022, 355), (1023, 375), (1021, 395), (1017, 408), (1013, 420), (1016, 440), (1025, 462),
       (990, 457), (953, 447), (923, 442), (897, 442), (873, 437), (871, 427), (880, 417), (902, 414), (900, 403), (897, 390),
       (890, 377), (883, 360), (885, 343), (893, 328), (917, 317), (940, 310)]
MOTHER = [(790, 180), (837, 187), (863, 203), (887, 230), (897, 250), (898, 273), (890, 297), (880, 307), (863, 327), (837, 340),
          (817, 343), (803, 353), (823, 363), (847, 370), (870, 380), (873, 393), (857, 403), (833, 403), (787, 390), (750, 373),
          (710, 357), (670, 337), (640, 320), (630, 297), (633, 280), (630, 267), (637, 240), (653, 223), (677, 217), (703, 220),
          (727, 212), (745, 197), (765, 186)]
# sampled colours (RGB) of the picture
HAIR = [(59,41,42),(45,35,43),(31,22,27),(11,8,12),(95,61,57),(43,34,42)]
SKIN = [(254,169,111),(255,176,122),(254,158,104),(253,151,92),(255,139,94),(245,135,75),(255,174,116)]
PILLOW = [(253,226,212),(238,207,221),(253,224,216),(252,204,198),(237,206,220),(222,178,204),(229,180,210),(245,214,217),(250,218,206),(239,205,217)]
BLANKET = [(156,175,234),(170,188,236),(202,204,226),(186,196,236),(242,220,220),(201,206,232),(152,173,233),(187,199,235)]
WOOD = [(188,90,27),(228,129,49),(182,86,27)]
BLUEPILLOW = [(60,120,211),(39,98,188),(28,87,176),(50,110,201),(44,101,187)]
FIGS = {
  "mother": dict(box=(600,150,920,430), prior=MOTHER, seed=(820,290),
                 fig=HAIR+SKIN+[(253,122,130),(253,162,162),(253,151,130),(249,119,123),(204,35,35),(228,222,221),(218,217,216)],
                 bg=PILLOW+BLANKET+WOOD, force_bg=[(882,350,920,430)]),          # force_bg: the boy's hair next to her hand
  "boy": dict(box=(850,280,1060,490), prior=BOY, seed=(940,390),
              fig=HAIR+SKIN+[(62,144,232),(66,150,237),(54,143,231)],
              bg=PILLOW+BLANKET+WOOD+BLUEPILLOW, force_bg=[(850,280,878,410)]),  # force_bg: the mother's hand next to his hair
}
BAND = 12
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
    w, h = m.size; reach = Image.eval(m, lambda v: 0 if v else 255)   # background = 255
    ImageDraw.floodfill(reach, (0, 0), 128)                          # background reachable from the corner = 128
    rp, mp = reach.load(), m.load()
    for y in range(h):
        for x in range(w):
            if rp[x, y] == 255: mp[x, y] = 255                      # unreachable background = a hole -> figure
    return m
def blob_from_seed(m, seed):
    k = m.copy(); assert k.load()[seed] == 255, "seed is not on the figure"
    ImageDraw.floodfill(k, seed, 128)
    return Image.eval(k, lambda v: 255 if v == 128 else 0)
NB = [(-1,0),(-1,-1),(0,-1),(1,-1),(1,0),(1,1),(0,1),(-1,1)]   # Moore neighbourhood, clockwise from west
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
    x0, y0, x1, y1 = F["box"]; w, h = x1 - x0, y1 - y0
    prior = Image.new("L", (w, h), 0); ImageDraw.Draw(prior).polygon([(x - x0, y - y0) for x, y in F["prior"]], fill=255)
    core = prior.filter(ImageFilter.MinFilter(2 * BAND + 1)); outer = prior.filter(ImageFilter.MaxFilter(2 * BAND + 1))
    cp, op = core.load(), outer.load()
    m = Image.new("L", (w, h), 0); mp = m.load()
    for y in range(h):
        for x in range(w):
            if cp[x, y]: mp[x, y] = 255
            elif op[x, y] and nearest_is_fig(PX[x + x0, y + y0], F["fig"], F["bg"]): mp[x, y] = 255
    for bx0, by0, bx1, by1 in F.get("force_bg", []):
        ImageDraw.Draw(m).rectangle((bx0 - x0, by0 - y0, bx1 - x0 - 1, by1 - y0 - 1), fill=0)
    m = m.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5))      # close small gaps
    m = m.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))      # drop specks
    m = blob_from_seed(fill_holes(m), (F["seed"][0] - x0, F["seed"][1] - y0))
    m = m.filter(ImageFilter.MaxFilter(3))                                       # 1 px outward
    chain = trace(m)
    pts = resample(smooth_closed([(x + 0.5, y + 0.5) for x, y in chain], 9), 4.0)
    simp = dp(pts + [pts[0]], 0.7)[:-1]
    print(name, "boundary", len(chain), "px, resampled", len(pts), ", simplified", len(simp), "points")
    if PREVIEW:
        z = 3; c = im.crop(F["box"]).resize((w * z, h * z), Image.LANCZOS); d = ImageDraw.Draw(c)
        d.line([((x - x0) * z, (y - y0) * z) for x, y in F["prior"]] + [((F["prior"][0][0] - x0) * z, (F["prior"][0][1] - y0) * z)], fill=(255, 0, 255), width=1)
        d.line([(x * z, y * z) for x, y in simp] + [(simp[0][0] * z, simp[0][1] * z)], fill=(255, 255, 255), width=2)
        c.save(os.path.join(PREVIEW, "trace_%s.png" % name))
    return [(round(x + x0, 1), round(y + y0, 1)) for x, y in simp]
def ball():
    x0, y0, x1, y1 = 1360, 590, 1520, 740; w, h = x1 - x0, y1 - y0
    m = Image.new("L", (w, h), 0); mp = m.load()
    for y in range(h):
        for x in range(w):
            r, g, b = PX[x + x0, y + y0]; mx, mn = max(r, g, b), min(r, g, b)
            if mx - mn < 60 and (mx < 110 or mn > 140): mp[x, y] = 255           # the ball's white and black, not the orange floor
    m = m.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5))
    m = blob_from_seed(fill_holes(m), (1437 - x0, 663 - y0))
    chain = trace(m); n = len(chain)
    cx = sum(x for x, y in chain) / n + 0.5; cy = sum(y for x, y in chain) / n + 0.5
    rs = sorted(math.hypot(x + 0.5 - cx, y + 0.5 - cy) for x, y in chain); R = rs[n // 2] + 1.5
    print("ball centre (%.1f, %.1f) radius %.1f (boundary radii %.1f..%.1f)" % (cx + x0, cy + y0, R, rs[0], rs[-1]))
    if PREVIEW:
        z = 4; c = im.crop((x0, y0, x1, y1)).resize((w * z, h * z), Image.LANCZOS); d = ImageDraw.Draw(c)
        d.ellipse(((cx - R) * z, (cy - R) * z, (cx + R) * z, (cy + R) * z), outline=(255, 255, 255), width=2)
        c.save(os.path.join(PREVIEW, "trace_ball.png"))
    return [round(cx + x0, 1), round(cy + y0, 1), round(R, 1)]
out = {"view": [1671, 941], "boy": segment("boy", FIGS["boy"]), "mother": segment("mother", FIGS["mother"]), "ball": ball()}
with open(OUT, "w", encoding="utf-8") as f: json.dump(out, f, separators=(",", ":"))
print("wrote", OUT)
