"""[L02-RC-FULL] (2026-10-16) The full-screen room picture for RC1-RC5 from the user's Figma 344 frames.

The user exported the nine frames of "FLN by MJ" 344-3137 .. 344-3625 flattened at 1x (1280x720), kept as
_reskin_build/rc_344_frames/rc_344_frame_1.png .. _9.png in the order they were given: 1 = the finale (every checkpoint filled, the boy
cheering), 2 / 3 = RC4 (the car in checkpoint 4's ring / driving towards it), 4 / 5 = RC3, 6 / 7 = RC2, 8 / 9 = RC1 (the car in
checkpoint 1's ring / at rest at the carpet's head, every checkpoint a "?"). Frames 7, 8 and 9 are ONE room pixel for pixel (they differ
only where the car is and in checkpoint 1); frames 1, 3 and 6 are the same room re-exported (within a pixel, ~3/255); frames 2, 4 and 5
have the room drawn about 2.7 % larger.

Frame 9 is the base. The page draws the car and the boy itself (the car drives off, the boy is the animated GIF), so the baked copies go:
 - the CAR at the carpet's head (and its soft shadow): every pixel that differs from frame 7 in that corner is replaced by frame 7's —
   the carpet is bare there in frame 7, so the patch is exact, no reconstruction;
 - the BOY with his remote (the GIF's first frame, mirrored, 117.3x217.7 at (331,135) — template matched on the frame, score 29.8) and the
   soft shadow under his feet (an ellipse about (393,355)): the silhouette grown 3 px plus the shadow's ellipse, refilled row by row by
   linear interpolation between the pixels just outside the hole on either side — the wall is a flat gradient and the skirting and the
   floor planks run level (the method of rc1_scene_clean.py's boy hole); the rim feathered 1 px.
The four "?" discs stay baked: the page's live tokens are the same 141x137 ellipses at the same spots and cover them (as the 338 room's).
clean() -> (1280x720 RGB image, info); ensure_clean() writes / refreshes rc_scene_344_clean.png (build.py and rc_path_trace_344.py both
go through it). Pillow + numpy only. `python rc_scene_344_clean.py` writes rc_scene_344_clean_preview.png beside it."""
import os
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
FRAMES = os.path.join(HERE, "rc_344_frames")
BASE = os.path.join(FRAMES, "rc_344_frame_9.png")          # RC1 at rest: the car at the carpet's head, the boy with his remote, four "?"
CAR_FREE = os.path.join(FRAMES, "rc_344_frame_7.png")      # RC2 driving: the same room, bare carpet where frame 9's car stands
CLEAN = os.path.join(HERE, "rc_scene_344_clean.png")
BOY_GIF = os.path.join(HERE, "rc_boy_source.gif")          # the boy, 416x772, 36 frames
BOY_CANVAS = (331.0, 135.0, 117.312, 217.704)              # the mirrored GIF canvas in the frame: left, top, width, height
BOY_SHADOW = (393.0, 355.0, 50.0, 15.0)                    # the soft shadow under his feet: centre x, y and the hole's x / y radii
CAR_WIN = (30, 320, 220, 430)                              # where frame 9's car and its shadow are (frame px)


def _dilate(m, r):
    out = m.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if dx * dx + dy * dy <= r * r: out |= np.roll(np.roll(m, dy, 0), dx, 1)
    return out


def _paste_alpha(shape, rgba, left, top, size_wh, thr=60):
    t = rgba.resize((int(round(size_wh[0])), int(round(size_wh[1]))), Image.LANCZOS)
    al = np.array(t)[:, :, 3] > thr; m = np.zeros(shape, bool)
    x0, y0 = int(round(left)), int(round(top)); m[y0:y0 + al.shape[0], x0:x0 + al.shape[1]] = al
    return m


def _fill_rows(a, out, mask):
    for y in np.where(mask.any(axis=1))[0]:
        xs = np.where(mask[y])[0]; xl, xr = int(xs.min()), int(xs.max())
        left = a[y, xl - 4:xl].mean(axis=0); right = a[y, xr + 1:xr + 5].mean(axis=0)
        t = (np.arange(xl, xr + 1) - (xl - 0.5)) / float(xr + 1 - xl); out[y, xl:xr + 1] = left[None, :] * (1 - t)[:, None] + right[None, :] * t[:, None]


def clean():
    a = np.array(Image.open(BASE).convert("RGB")).astype(float); out = a.copy(); H, W = a.shape[:2]
    assert (W, H) == (1280, 720), (W, H)
    b = np.array(Image.open(CAR_FREE).convert("RGB")).astype(float); assert b.shape == a.shape
    same = np.abs(a - b).sum(axis=2) <= 12
    # the two frames are one room: identical in the arch, the window, the plant and the bottom floor (they differ at the two cars, in the
    # boy - the designer dropped the GIF at another frame - and in the "?" glyphs, which the live tokens cover)
    for (x0, y0, x1, y1) in ((30, 20, 260, 330), (730, 60, 980, 220), (1110, 160, 1270, 330), (0, 620, 1280, 720)):
        assert same[y0:y1, x0:x1].all(), "frames 7 and 9 differ in the room at %r" % ((x0, y0, x1, y1),)
    # the car: everything that differs from frame 7 in its corner, grown 3 px, read from frame 7 - which must match all round the hole
    x0, y0, x1, y1 = CAR_WIN
    cm = np.zeros((H, W), bool); cm[y0:y1, x0:x1] = np.abs(a[y0:y1, x0:x1] - b[y0:y1, x0:x1]).sum(axis=2) > 24
    cm = _dilate(cm, 3); ring = _dilate(cm, 8) & ~cm
    assert same[ring].mean() > 0.98, "frame 7 is not the same carpet around the car: %.3f" % same[ring].mean()
    out[cm] = b[cm]
    cols = np.where(cm.any(0))[0]; rows = np.where(cm.any(1))[0]
    info = {"car_hole": (int(cols.min()), int(rows.min()), int(cols.max()), int(rows.max())), "car_hole_from": os.path.basename(CAR_FREE)}
    # the boy and his shadow
    gif = Image.open(BOY_GIF); gif.seek(0); boy = gif.convert("RGBA").transpose(Image.FLIP_LEFT_RIGHT)
    bm = _dilate(_paste_alpha((H, W), boy, BOY_CANVAS[0], BOY_CANVAS[1], (BOY_CANVAS[2], BOY_CANVAS[3])), 3)
    cx, cy, rx, ry = BOY_SHADOW; yy, xx = np.mgrid[0:H, 0:W]; bm |= ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2 <= 1.0
    _fill_rows(a, out, bm)
    ring = _dilate(bm, 1) & ~bm
    for y, x in zip(*np.where(ring)): out[y, x] = 0.5 * a[y, x] + 0.5 * out[y - 1:y + 2, x - 1:x + 2].reshape(-1, 3).mean(axis=0)
    cols = np.where(bm.any(0))[0]; rows = np.where(bm.any(1))[0]
    info["boy_hole"] = (int(cols.min()), int(rows.min()), int(cols.max()), int(rows.max()))
    return Image.fromarray(np.clip(out, 0, 255).astype("uint8")), info


def ensure_clean(clean_path=CLEAN):
    """Write the cleaned picture unless it is newer than the frames, the GIF and this module; returns (path, info or None)."""
    newest = max(os.path.getmtime(p) for p in (BASE, CAR_FREE, BOY_GIF, os.path.abspath(__file__)))
    if os.path.exists(clean_path) and os.path.getmtime(clean_path) >= newest:
        return clean_path, None
    img, info = clean(); img.save(clean_path); return clean_path, info


if __name__ == "__main__":
    res, info = clean(); p = os.path.join(HERE, "rc_scene_344_clean_preview.png"); res.save(p); print("wrote", p, info)
