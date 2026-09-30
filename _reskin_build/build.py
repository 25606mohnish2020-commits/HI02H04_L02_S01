"""Rebuild HI02H04_L02_S01 on the HI02H04_L01_S01 reference chrome + engine.

index.html  = reference body markup (title/caption swapped) + this lesson's card + <script src=app.js>
style.css   = every reference <style> block, in cascade order, minus the reference-lesson-only blocks, + L02-ADAPT
app.js      = kit core + engine (+ STORY_READ_PAGE module, landing caption) + patch scripts in order, + L02 adapt JS
"""
import re, json, os, sys

REF = r"C:\Users\25606\OneDrive\FLN @ CG\Suresh's File\HI02H04_L01_S01-20260916T080241Z-1-001\HI02H04_L01_S01\HI02H04_L01_S01.html"
ROOT = r"C:\Users\25606\OneDrive\FLN @ CG\Bindu's File\HI02H04_L02_S01_dist-20260926T152741Z-1-001"
CUR = os.path.join(ROOT, "HI02H04_L02_S01_dist")
BACKUP_INDEX = os.path.join(ROOT, "_backup_before_reskin", "index.html")
SCR = os.path.dirname(os.path.abspath(__file__))

def rd(p): return open(p, encoding="utf-8").read()
def wr(p, s):
    with open(p, "w", encoding="utf-8", newline="\n") as f: f.write(s)

html = rd(REF)

# ---- 1. every <style>/<script> block, in document order ----
blocks = []
for m in re.finditer(r'^<(style|script)([^>]*)>(.*?)</\1>', html, re.S | re.M):   # real blocks start a line; a tag quoted in a comment does not
    kind, attrs, inner = m.group(1), m.group(2), m.group(3)
    idm = re.search(r'\bid="([^"]*)"', attrs)
    blocks.append(dict(kind=kind, id=(idm.group(1) if idm else None), attrs=attrs, inner=inner))

SKIP_STYLE  = {"P2-BIRD-POP-CSS", "YLW-IMG-STROKE", "SPK-STILL-BG-CSS", "SPK-ONLY-CUE-CSS", "P5-SPK-CUE-CSS"}
SKIP_SCRIPT = {"P2-BIRD-POP-JS", "P5-CORRECT-SFX-JS", "SPK-STILL-BG-JS", "P2-QUIET-AFTER-NAV-JS", "cardData"}

styles  = [b for b in blocks if b["kind"] == "style"]
scripts = [b for b in blocks if b["kind"] == "script"]
print("style blocks:", [b["id"] for b in styles])
print("script blocks:", [b["id"] for b in scripts])

# ---- 2. style.css ----
css_parts = []
for b in styles:
    if b["id"] in SKIP_STYLE: continue
    css_parts.append("/* ===== <style id=\"%s\"> ===== */\n%s" % (b["id"], b["inner"].strip("\n")))
css_parts.append(rd(os.path.join(SCR, "adapt.css")).strip("\n"))
style_css = ("/* HI02H04_L02_S01 — layout ported value-for-value from HI02H04_L01_S01 (its base stylesheet + every appended\n"
             "   layout patch, in the same cascade order); this lesson's own adaptations are the L02-ADAPT block at the end. */\n\n"
             + "\n\n".join(css_parts) + "\n")

# ---- 3. app.js ----
engine = [b for b in scripts if b["id"] is None]
assert len(engine) == 1, "expected exactly one unnamed engine <script>"
eng = engine[0]["inner"]

# 3a. STORY_READ_PAGE module (this lesson's tutorial beat, drawn in the reference teaching frame)
mod = rd(os.path.join(SCR, "story_read_page.js"))
needle = "\n  STORY_QUESTION: {"
assert eng.count(needle) == 1, "STORY_QUESTION anchor not unique"
eng = eng.replace(needle, "\n" + mod.rstrip("\n") + "\n" + needle.lstrip("\n"), 1)
# 3b. landing caption from the card (the reference hard-coded its sentence in the markup)
needle = '$("sgTitle").textContent = (CARD.title.hi || "").split(/[:：(]/)[0].trim();'
assert eng.count(needle) == 1, "sgTitle anchor not unique"
eng = eng.replace(needle, needle + '\n  if(CARD.landing_caption_hi && $("sgCaption")) $("sgCaption").textContent = CARD.landing_caption_hi;   // landing sentence pill (card-driven)', 1)
# 3c. [L02-GATE-LINE] the first transition screen (Page 1 → tutorial) reads "आइए कहानी पढ़ें।" — the same words as its VO
#     (assets/Audio/vo_pt_tutorial.ogg), so the headline and the line are in sync; the other two gates are as in the reference
needle = 'tutorial:"चलिए, शुरू करें!"'
assert eng.count(needle) == 1, "PHASE_GATE_TITLE anchor not unique"
eng = eng.replace(needle, 'tutorial:"आइए कहानी पढ़ें।"', 1)
# 3d. [L02-FIND-FIG] TAP_IN_SCENE's delayed completion (900 ms after the "correct" line) fires only if its slide is still the
#     one on the stage: on the Figma find page the lit आगे बढ़ें pill may already have moved the lesson on (adapt.js), and the
#     stray call would otherwise complete the NEXT page as well.
needle = '()=> setTimeout(()=>completeSlide(true), 900)); }'
assert eng.count(needle) == 1, "TAP_IN_SCENE completion anchor not unique"
eng = eng.replace(needle, '()=> setTimeout(()=>{ if(CARD.slides[state.idx] === slide) completeSlide(true); }, 900)); }   // [L02-FIND-FIG] only its own slide', 1)
# 3e. [L02-Q10-FIG] the same fence on the tap-to-answer questions' two delayed completions (700 ms after the "correct" line: the
#     correct tap, and the tap on the revealed answer) — on "page 10" the lit आगे बढ़ें pill may already have moved the lesson on.
for needle, fixed in [
    ('_adv = ()=> setTimeout(()=> completeSlide(true), 700);',
     '_adv = ()=> setTimeout(()=>{ if(CARD.slides[state.idx] === slide) completeSlide(true); }, 700);   /* [L02-Q10-FIG] only its own slide */'),
    ('const _go = ()=> setTimeout(()=> completeSlide(false), 700);',
     'const _go = ()=> setTimeout(()=>{ if(CARD.slides[state.idx] === slide) completeSlide(false); }, 700);   /* [L02-Q10-FIG] only its own slide */'),
]:
    assert eng.count(needle) == 1, "mountTapOptions completion anchor not unique: " + needle
    eng = eng.replace(needle, fixed, 1)
engine[0]["inner"] = eng

js_parts = []
for b in scripts:
    if b["id"] in SKIP_SCRIPT: continue
    if "application/json" in (b["attrs"] or ""): continue
    label = b["id"] or "ENGINE (2026.07.16i-r4-unified + STORY_READ_PAGE)"
    js_parts.append("/* ===== <script id=\"%s\"> ===== */\n%s\n;" % (label, b["inner"].strip("\n")))
js_parts.append(rd(os.path.join(SCR, "adapt.js")).strip("\n") + "\n;")
app_js = ("/* HI02H04_L02_S01 — engine + FLN animation kit + layout patches, ported from HI02H04_L01_S01 in the same script order\n"
          "   (the reference-lesson-only scripts are left out; STORY_READ_PAGE is this lesson's own tutorial module). */\n\n"
          + "\n\n".join(js_parts) + "\n")

# ---- 4. card (this lesson's, from the pre-reskin index.html) + the fields the reference chrome reads ----
cur = rd(BACKUP_INDEX)
m = re.search(r'<script type="application/json" id="cardData">(.*?)</script>', cur, re.S)
card = json.loads(m.group(1))
# page 1 shows no hero picture and no sentence pill any more (Figma "FLN by MJ" node 98-2): the card itself is the
# picture frame (see index.html [L02-LANDING-FRAME] and adapt.css), so landing_hero / landing_caption_hi are not set
LANDING_PIC = "assets/Images/landing_title.webp"
assert os.path.exists(os.path.join(CUR, LANDING_PIC)), "missing " + LANDING_PIC
for s in card["slides"]:
    if s["type"] == "STORY_READ_PAGE": s["caption_chip"] = True
    if s["type"] == "STORY_QUESTION": s["bare_recall"] = True
    if s["type"] == "CELEBRATION": s.setdefault("audio", {})["sfx"] = "sfx_celebrate"
aud, txt = card["assets"]["audio"], card["assets"]["audio_text"]
for k, v in {
    "vo_pt_tutorial": "आइए कहानी पढ़ें।",   # [L02-GATE-LINE] first transition screen: headline and VO say the same words
    "vo_pt_guided": "बहुत बढ़िया! अब हम साथ मिलकर शुरू करते हैं। चलिए, साथ में करें!",
    "vo_pt_practice": "वाह! अब आपकी बारी।",
    "vo_tap_swiftee_replay": "फिर से सुनने के लिए मुझ पर टैप करिए।",
    "vo_tap_speaker_sentence": "वाक्य सुनने के लिए यहाँ टैप करिए।",
}.items():
    aud[k] = "assets/Audio/" + k + ".ogg"; txt[k] = v
# ---- [L02-STORY-FIG] pages 2-10 from Figma "FLN by MJ" section 19-13: every story page shows the band line "आइए कहानी पढ़ें।"
# and the designer's landscape picture (assets/Images/story_N.webp = the Figma picture cut to its 468x244 frame). The designer
# drew the last sentence over TWO pages (page 9: the boy yawning among his toys, page 10: asleep with his mother looking on),
# so T8 is split: T8 keeps "खेलते-खेलते उसे नींद आ गई", the new T9 gets "और वह सो गया।"; the clip vo_story_8 is cut at its
# 2.16-2.29 s pause into vo_story_8a / vo_story_8b (same recording, same voice).
import copy
STORY_PROMPT = "आइए कहानी पढ़ें।"
story = [s for s in card["slides"] if s["type"] == "STORY_READ_PAGE"]
assert len(story) == 8 and story[-1]["id"] == "T8", "expected the eight story pages T1..T8"
for n, s in enumerate(story, 1):
    s["prompt_hi"] = STORY_PROMPT
    s["data"]["image_id"] = "story_%d" % n
# [L02-SPK-CUE] the narration's "यह बटन दबाकर सुन सकते हैं" beat: the speaker chip pulses (the cue's own pulse) from the moment
# the clip reaches those words to the end of the clip (story_read_page.js reads data.chip_pulse_at off the audio clock).
# Measured on the clip with ffmpeg silencedetect: vo_help = "आप खुद कहानी पढ़ने की कोशिश करिए।" (0.44-2.34 s) · pause ·
# "जहाँ मदद चाहिए," (2.73-3.72 s) · the comma pause · "यह बटन दबाकर सुन सकते हैं।" from 3.9 s. Only the clips listed here
# pulse; vo_read_instr has no such line.
CHIP_PULSE_AT = {"vo_help": 3.9}
for s in story:
    clip = (s.get("audio") or {}).get("prompt")
    if clip in CHIP_PULSE_AT: s["data"]["chip_pulse_at"] = CHIP_PULSE_AT[clip]
# [L02-NO-READ-INSTR] pages 3-10 (T2..T9) all narrated the same "इस वाक्य को पढ़िए।" (vo_read_instr) on every landing; the
# user asked for it to go. Those pages now open silently and run straight into their beats (picture pop → "tap here" cue);
# page 2 keeps vo_help. The clip stays registered in assets (unused) so nothing else about the card changes.
for s in story:
    if (s.get("audio") or {}).get("prompt") == "vo_read_instr":
        del s["audio"]["prompt"]
        if not s["audio"]: del s["audio"]
t8 = story[-1]; t9 = copy.deepcopy(t8)
t8["data"]["words"] = [{"text": w} for w in ["खेलते-खेलते", "उसे", "नींद", "आ", "गई"]]
t8["data"]["whole_audio"] = "vo_story_8a"
t8["data"]["alt_hi"] = "माधव खेलते-खेलते जम्हाई ले रहा है।"
t9["id"] = "T9"
t9["data"]["image_id"] = "story_9"
t9["data"]["words"] = [{"text": w} for w in ["और", "वह", "सो", "गया।"]]
t9["data"]["whole_audio"] = "vo_story_8b"
t9["data"]["alt_hi"] = "माधव खिलौनों के बीच सो गया, माँ हैरान खड़ी है।"
card["slides"].insert(card["slides"].index(t8) + 1, t9)
aud["vo_story_8a"] = "assets/Audio/vo_story_8a.ogg"; txt["vo_story_8a"] = "खेलते-खेलते उसे नींद आ गई"
aud["vo_story_8b"] = "assets/Audio/vo_story_8b.ogg"; txt["vo_story_8b"] = "और वह सो गया।"
# ---- [L02-POP-SFX] the picture's pop has a sound. The user's assets/SFX/"Page N.mp3" are raw library tracks (1.8 s to 3 min,
# several opening in silence), so each is cut to the pop's 2 s, levelled and encoded like every other clip (Opus, mono, 48 k)
# into assets/Audio/sfx_pop_<n>.ogg (n = story page index, page N = n + 1); story_read_page.js starts that clip with the pop
# and stops it with the pop. Cut point: the track's start when its first 2 s are audible (RMS >= -35 dB), else its loudest 2 s
# (pages 4 and 5 share a track that is silent for its first 2 s; pages 2 and "10 b" open near-silent). Two tracks on one page
# ("Page 10 a" + "Page 10 b") are mixed. Level: mean -26 dB RMS with peaks kept under -1 dBFS; a 20 ms fade-in at the cut and
# a 200 ms fade-out so the sound ends exactly with the pop. Regenerated only when a source (or this script) is newer.
import subprocess, math, tempfile
SFX_DIR = os.path.join(CUR, "assets", "SFX")
SFX_SOURCES = {1: ["Page 2"], 2: ["Page 3"], 3: ["Page 4"], 4: ["Page 5"], 5: ["Page 6"], 6: ["Page 7"], 7: ["Page 8"],
               8: ["Page 9"], 9: ["Page 10 a", "Page 10 b"]}
POP_S, SFX_MEAN_DB, SFX_PEAK_DB, SFX_AUDIBLE_DB, SFX_WIN = 2.0, -26.0, -1.0, -35.0, 0.25
# pages whose sound is NOT the pop's 2 s: (start, length s) of the track to play — the sound still starts with the pop, the
# pop itself stays 2 s, the sound runs on for its length (the card carries it as data.pop_sfx_s) and then stops. A start of
# "onset" means the point where the track's sound begins (its first 50 ms window at or above -40 dB RMS), so the sound is
# heard from the pop's first frame.
# [L02-POP-5S] pages whose picture pop is longer than the fleet's 2 s: pages 2, 4, 5 and 10 hold 3 s longer (5 s; CSS
# .p2-pop-5s, card data.pop_ms = 5000) — their sound is the pop's 5 s of their track and stops with the pop; the length is
# the pop's, so no data.pop_sfx_s is written. Cut start: "onset" for pages 4 and 5 (their track opens with ~2.5 s of silence,
# which would have left the pop itself mute); None = the automatic rule above (the track's start when its first 5 s are
# audible, else its loudest 5 s) for pages 2 and 10.
POP_LEN = {1: 5.0, 3: 5.0, 4: 5.0, 9: 5.0}
SFX_CUT = {1: (None, POP_LEN[1]), 3: ("onset", POP_LEN[3]), 4: ("onset", POP_LEN[4]), 9: (None, POP_LEN[9])}
def sfx_onset(src):
    out = ff("-i", src, "-af", "aresample=24000,asetnsamples=n=1200,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-", "-f", "null", "-")
    vals = [(-120.0 if x == "-inf" else float(x)) for x in re.findall(r"RMS_level=(-?[\d.]+|-inf)", out)]
    for i, v in enumerate(vals):
        if v >= -40.0: return round(i * 0.05, 2)
    return 0.0
def ff(*args):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-y", *args], capture_output=True, text=True, encoding="utf-8", errors="replace")
    return r.stdout + r.stderr
def sfx_cut_start(src, length=POP_S):
    out = ff("-i", src, "-af", "aresample=24000,asetnsamples=n=%d,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-" % int(24000 * SFX_WIN), "-f", "null", "-")
    vals = [(-120.0 if x == "-inf" else float(x)) for x in re.findall(r"RMS_level=(-?[\d.]+|-inf)", out)]
    lin = [10 ** (v / 10) for v in vals]; k = int(length / SFX_WIN)
    win = lambda i: 10 * math.log10(sum(lin[i:i + k]) / k + 1e-12)
    if win(0) >= SFX_AUDIBLE_DB: return 0.0
    return max(range(0, max(1, len(lin) - k)), key=win) * SFX_WIN
def sfx_levels(path):
    out = ff("-i", path, "-af", "volumedetect", "-f", "null", "-")
    return float(re.search(r"mean_volume: (-?[\d.]+)", out).group(1)), float(re.search(r"max_volume: (-?[\d.]+)", out).group(1))
def build_pop_sfx(n, names):
    dst = os.path.join(CUR, "assets", "Audio", "sfx_pop_%d.ogg" % n)
    srcs = [os.path.join(SFX_DIR, nm + ".mp3") for nm in names]
    for s in srcs: assert os.path.exists(s), "missing SFX " + s
    if os.path.exists(dst) and all(os.path.getmtime(dst) >= os.path.getmtime(s) for s in srcs + [os.path.abspath(__file__)]):
        return None
    fixed_start, length = SFX_CUT.get(n, (None, POP_S))
    with tempfile.TemporaryDirectory() as td:
        cuts = []
        for i, s in enumerate(srcs):
            st = sfx_onset(s) if fixed_start == "onset" else (fixed_start if fixed_start is not None else sfx_cut_start(s, length))
            c = os.path.join(td, "cut%d.wav" % i)
            ff("-ss", "%.2f" % st, "-t", "%.2f" % length, "-i", s, "-ac", "1", "-ar", "48000", c); cuts.append((c, st))
        mix = cuts[0][0]
        if len(cuts) > 1:
            mix = os.path.join(td, "mix.wav")
            ff(*sum([["-i", c] for c, _ in cuts], []), "-filter_complex", "amix=inputs=%d:normalize=0" % len(cuts), mix)
        mean, peak = sfx_levels(mix)
        gain = min(SFX_MEAN_DB - mean, SFX_PEAK_DB - peak)
        ff("-i", mix, "-af", "volume=%.2fdB,afade=t=in:st=0:d=0.02,afade=t=out:st=%.2f:d=0.2" % (gain, length - 0.2),
           "-t", "%.2f" % length, "-c:a", "libopus", "-b:a", "64k", dst)
        assert os.path.exists(dst), "ffmpeg did not write " + dst
        return [(nm, st, length) for (c, st), nm in zip(cuts, names)] + [("gain dB", round(gain, 1))]
for n, s in enumerate(story + [t9], 1):
    made = build_pop_sfx(n, SFX_SOURCES[n])
    s["data"]["pop_sfx"] = "sfx_pop_%d" % n
    pop_s = POP_LEN.get(n, POP_S)
    assert pop_s in (2.0, 5.0), "the module knows the 2 s and the 5 s pop only"
    if n in POP_LEN: s["data"]["pop_ms"] = int(pop_s * 1000)
    else: s["data"].pop("pop_ms", None)
    if n in SFX_CUT and SFX_CUT[n][1] != pop_s: s["data"]["pop_sfx_s"] = SFX_CUT[n][1]
    else: s["data"].pop("pop_sfx_s", None)
    print("sfx_pop_%d.ogg" % n, "<-", " + ".join(SFX_SOURCES[n]), "| regenerated:" if made else "| up to date", made or "")
# ---- [L02-FIND-FIG] "page 11" (the user's count) = the first "find Madhav in the picture" page, G2 (TAP_IN_SCENE), laid out
# from Figma "FLN by MJ" node 110-2 ("Formative html area", 1280x720): the header band + mascot circle, the picture box
# 935x442 @ (175,174) with a 4px #386AF6 stroke and r20 holding the designer's picture ("image 221", a bedroom scene with
# both asleep) at 951x536 @ (-16,-12) of the box, and the आगे बढ़ें pill 186.18x64 @ (547,630). The picture is the Figma
# export kept in _reskin_build/find_madhav_source.png (1671x941), encoded here to assets/Images/find_madhav.webp; the
# hotspot is re-drawn on it (Madhav and his pillow, in % of the box). CSS [L02-FIND-FIG] (stage class .l02-find), JS in
# adapt.js (card slide.find_fig). Only G2 carries the flag: the other find pages (I2, P2) are as they were.
FIND_SRC = os.path.join(SCR, "find_madhav_source.png"); FIND_DST = os.path.join(CUR, "assets", "Images", "find_madhav.webp")
assert os.path.exists(FIND_SRC), "missing " + FIND_SRC
if not os.path.exists(FIND_DST) or os.path.getmtime(FIND_DST) < os.path.getmtime(FIND_SRC):
    from PIL import Image
    Image.open(FIND_SRC).convert("RGB").save(FIND_DST, "WEBP", quality=88, method=6)
    print("wrote", FIND_DST)
g2 = next(s for s in card["slides"] if s["id"] == "G2")
assert g2["type"] == "TAP_IN_SCENE", "G2 is not the find-in-the-picture page any more"
g2["find_fig"] = True
g2["data"]["image_id"] = "find_madhav"
# [L02-FIND-BAND] the band shows the Figma page's own line "इस चित्र में माधव कहाँ है ?" (user, 2026-09-28) instead of the
# question VO's words; the question VO itself (vo_tap_madhav, "तस्वीर में माधव को ढूँढिए, उसे छूइए।") is unchanged.
g2["prompt_hi"] = "इस चित्र में माधव कहाँ है ?"
# [L02-FIND-TRY] the wrong-tap line on this page is its own (user, 2026-09-28): "ध्यान से देखिए और माधव को पहचानिए।" — an
# edge-tts hi-IN-SwaraNeural placeholder made like vo_pt_tutorial (source mp3 in _reskin_build/, edge silence trimmed,
# levelled to this page's own clips at -15.5 LUFS, Opus 48 k mono, 3.2 s) until the VO team records it. I2 and P2 keep
# the shared vo_tap_try ("फिर से देखिए, तस्वीर में ढूँढिए।").
g2["audio"]["try_again"] = "vo_tap_try_madhav"
aud["vo_tap_try_madhav"] = "assets/Audio/vo_tap_try_madhav.ogg"; txt["vo_tap_try_madhav"] = "ध्यान से देखिए और माधव को पहचानिए।"
# [L02-FIND-HOTS] three tappable regions drawn on the picture: the boy (the answer), the mother and the football (decoys).
# The engine's hotspots are rectangles (% of the box) and carry its tap logic (confetti / shake + try-again line, the "any
# clip playing = no taps" lock); on this page they are invisible and inert, and a SHAPED outline is drawn for each instead
# (data.shapes: SVG paths in the picture's own 1671x941 pixel space — the mother's and the boy's silhouettes and the
# football's circle traced from the picture's colours by trace_find_shapes.py -> find_madhav_shapes.json, so they follow
# the figures to the pixel) which is the thing the child taps: adapt.js forwards the tap to the matching rectangle and
# mirrors its state onto the outline (white at rest, green on the boy, red + a wiggle on a decoy).
g2["data"]["hotspots"] = [
    {"x": 51.5, "y": 35, "w": 14.5, "h": 24, "correct": True},   # Madhav: head, hand and the blue shirt
    {"x": 35, "y": 19, "w": 16.5, "h": 29},                       # the mother: hair, face, shoulders and her hand
    {"x": 82, "y": 75, "w": 8, "h": 15},                          # the football on the floor
]
def smooth_closed_path(pts):
    """A closed Catmull-Rom curve through the points, as cubic Béziers (SVG path data, 1 decimal)."""
    n = len(pts); out = ["M %.1f %.1f" % pts[0]]
    for i in range(n):
        p0, p1, p2, p3 = pts[i - 1], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        out.append("C %.1f %.1f %.1f %.1f %.1f %.1f" % (c1 + c2 + p2))
    return " ".join(out) + " Z"
SHAPES_SRC = os.path.join(SCR, "find_madhav_shapes.json")
assert os.path.exists(SHAPES_SRC), "missing find_madhav_shapes.json (run trace_find_shapes.py)"
with open(SHAPES_SRC, encoding="utf-8") as f: SHAPES = json.load(f)
BOY = [tuple(p) for p in SHAPES["boy"]]; MOTHER = [tuple(p) for p in SHAPES["mother"]]; BALL = tuple(SHAPES["ball"])   # centre x, y, radius
assert len(BOY) >= 30 and len(MOTHER) >= 40 and 40 < BALL[2] < 60 and SHAPES["view"] == [1671, 941], "find_madhav_shapes.json looks wrong"
g2["data"]["shape_view"] = SHAPES["view"]
g2["data"]["shapes"] = [
    {"hot": 0, "d": smooth_closed_path(BOY)},
    {"hot": 1, "d": smooth_closed_path(MOTHER)},
    {"hot": 2, "d": "M %.1f %.1f a %.1f %.1f 0 1 0 %.1f 0 a %.1f %.1f 0 1 0 -%.1f 0 Z" % (BALL[0] - BALL[2], BALL[1], BALL[2], BALL[2], 2 * BALL[2], BALL[2], BALL[2], 2 * BALL[2])},
]
# ---- [L02-Q3-FIG] G3 (the guided story question) laid out from Figma "FLN by MJ" node 113-198 ("G3 guided story question",
# 1280x720; user, 2026-09-28: "exact same layout, image, placement and size"). The Figma page asks "कहानी में माधव ने सबसे पहले
# क्या किया ?" over three picture+sentence cards (खाना खाया / किताब पढ़ी / खिलौनों से खेला) — the question of the removed G1, so
# G3 now carries that question with the lesson's OWN recorded clips for it (vo_q_khana "माधव और माँ ने सबसे पहले क्या किया?"
# and the option words vo_opt_khana / _book / _toys; the try / hint / correct / reveal lines are G3's, unchanged). No recall
# picture (the Figma has none). Each card's picture is the Figma picture at the Figma crop: the designer placed the full
# 1671x941 pictures (kept in _reskin_build/q3_*_source.png) in the card's clipped 243.679x194.84 picture window at these
# offsets/scales (Figma px, relative to the inner card's padding box) — the window is cut out here at 3x into
# assets/Images/q3_*.webp, so the CSS just fills the window (the option order is shuffled by the engine, so the crop must
# travel with the option, not with the card position). CSS [L02-Q3-FIG] (stage class .l02-q3), JS in adapt.js (card slide.fig_q3).
Q3_WIN = (243.679, 194.84)          # the inner card's padding box width x the picture's bottom edge (307.014 - 2x2.386 wide; 194.84 tall)
Q3_CUTS = {   # image node box (w, h) @ (left, top) in the padding box, then how the picture fills that box
    "q3_khana":   dict(box=(567.0, 274.0), at=(-305.16, -79.16), fill=("crop", 1.0949, 1.2754, 0.0, -0.0007)),   # Figma crop: img 109.49% x 127.54% of the box @ (0, -0.07%)
    "q3_kitab":   dict(box=(370.0, 208.0), at=(-96.16, -13.16),  fill=("cover",)),
    "q3_khilone": dict(box=(349.0, 197.0), at=(-47.16, -2.16),   fill=("cover",)),
}
Q3_SCALE = 3
def cut_q3_option(key, spec):
    src = os.path.join(SCR, key + "_source.png"); dst = os.path.join(CUR, "assets", "Images", key + ".webp")
    assert os.path.exists(src), "missing " + src
    if os.path.exists(dst) and os.path.getmtime(dst) >= max(os.path.getmtime(src), os.path.getmtime(os.path.abspath(__file__))): return False
    from PIL import Image
    im = Image.open(src).convert("RGB"); iw, ih = im.size
    bw, bh = spec["box"]; bx, by = spec["at"]
    if spec["fill"][0] == "crop":
        _, fw, fh, fx, fy = spec["fill"]; dw, dh = bw * fw, bh * fh; dx, dy = bx + bw * fx, by + bh * fy
    else:
        s = max(bw / iw, bh / ih); dw, dh = iw * s, ih * s; dx, dy = bx + (bw - dw) / 2, by + (bh - dh) / 2
    sx, sy = iw / dw, ih / dh          # image px per Figma px
    crop = ((0 - dx) * sx, (0 - dy) * sy, (Q3_WIN[0] - dx) * sx, (Q3_WIN[1] - dy) * sy)
    assert crop[0] >= -1 and crop[1] >= -1 and crop[2] <= iw + 1 and crop[3] <= ih + 1, "%s: the window leaves the picture: %r" % (key, crop)
    crop = tuple(max(0, min(v, m)) for v, m in zip(crop, (iw, ih, iw, ih)))
    out = im.crop(tuple(int(round(v)) for v in crop)).resize((int(round(Q3_WIN[0] * Q3_SCALE)), int(round(Q3_WIN[1] * Q3_SCALE))), Image.LANCZOS)
    out.save(dst, "WEBP", quality=88, method=6)
    print("wrote", dst, "crop", tuple(round(v, 1) for v in crop))
    return True
for k, spec in Q3_CUTS.items(): cut_q3_option(k, spec)
g3 = next(s for s in card["slides"] if s["id"] == "G3")
assert g3["type"] == "STORY_QUESTION", "G3 is not the guided story question any more"
g3["fig_q3"] = True
g3["prompt_hi"] = "कहानी में माधव ने सबसे पहले क्या किया ?"
g3["audio"]["prompt"] = "vo_q_khana"
g3["data"]["hide_recall"] = True
g3["data"].pop("recall_image_id", None)
# label_w = the Figma text box width (px), only where the sentence wraps in the design (the third card breaks after खिलौनों);
# the others stay on one line whatever the font's exact advance widths. The Figma spells खिलोनों; the story (T7) and the
# recorded word say खिलौनों, so the sentence uses the story's spelling.
g3["data"]["options"] = [
    {"img": "q3_khana",   "emoji": "🍛", "label_hi": "माधव ने खाना खाया ।",        "audio": "vo_opt_khana", "correct": True},
    {"img": "q3_kitab",   "emoji": "📖", "label_hi": "माधव ने किताब पढ़ी ।",        "audio": "vo_opt_book"},
    {"img": "q3_khilone", "emoji": "🧸", "label_hi": "माधव ने खिलौनों से खेला ।",  "audio": "vo_opt_toys", "label_w": 175},
]
for k in Q3_CUTS: card["assets"]["image"][k] = "assets/Images/" + k + ".webp"
# ---- [L02-I1-REF] I1 (the independent story question, the user's "page 12") laid out like the reference lesson's G2
# (https://hi-02-h04-l01-s01-dun.vercel.app/?slide=4, byte-identical to the local reference this lesson was built on; user,
# 2026-09-28): the bare recall picture 374.125x315 at the top, three white sentence pills 344x78 with the 3px #386AF6 stroke
# in a 1104px row (the engine's sentence_options + bare_recall + hide_header_chip page — CSS .sent-page / .sent-opts, all
# already in this lesson's stylesheet), the आगे pill below. Band "चित्र में मम्मी क्या कर रही है ?" (user). Content, from this
# lesson's own recorded clips: the question clip is vo_q_sulaya ("माँ ने माधव को क्या कराने की कोशिश की?", the old G3 question
# that this band re-words), the picture is the designer's story picture 2 (the mother putting Madhav to sleep, story_2 —
# cropped by CSS to the reference's picture box), and the pills are STORY SENTENCES with their own recorded clips: the answer
# "माधव की माँ उसे सुलाने लगी।" (vo_story_2) against two sentences about Madhav (vo_story_5, vo_story_7) — the reference's
# "choose the sentence for the picture" mechanic, shown == spoken. Try / hint / correct / reveal lines are I1's, unchanged.
# The old I1 question ("माधव ने दीवार पर क्या बनाया?", vo_q_chitra, scene_5, opt_drawing) is dropped; its clips stay on disk.
i1 = next(s for s in card["slides"] if s["id"] == "I1")
assert i1["type"] == "STORY_QUESTION" and i1["phase"] == "independent", "I1 is not the independent story question any more"
i1["prompt_hi"] = "चित्र में मम्मी क्या कर रही है ?"
i1["sentence_options"] = True
i1["hide_header_chip"] = True
i1["bare_recall"] = True
i1["mascot_replay"] = True      # the header chip is off (as on the reference page): the mascot tap replays the question instead (adapt.js)
# [L02-I1-CONFETTI] the animation kit fires its confetti on guided / practice / mastery slides only, so an independent-phase
# question gets none; the user wants the same confetti here on the correct tap (2026-09-28). This flag lifts the kit's phase
# gate for THIS slide alone (adapt.js); I2 and I3 stay as they are.
i1["confetti"] = True
i1["audio"]["prompt"] = "vo_q_sulaya"
i1["data"]["recall_image_id"] = "story_2"
i1["data"]["hide_recall"] = False
i1["data"]["options"] = [
    {"label_hi": "माधव की माँ उसे सुलाने लगी।", "audio": "vo_story_2", "correct": True},
    {"label_hi": "उसने दीवार पर चित्र बनाए।",   "audio": "vo_story_5"},
    {"label_hi": "वह खिलौनों से खेलने लगा।",    "audio": "vo_story_7"},
]
for o in i1["data"]["options"]:
    assert o["audio"] in aud and txt[o["audio"]] == o["label_hi"], "I1 pill and clip differ: " + o["label_hi"]
# ---- [L02-BED-FIG] the bed-path board ("the carpet map") from Figma "FLN by MJ" section 189-1302 (frames "13 I2 INDEPENDENT Tap In
# Scene", "14 I3 INDEPENDENT Story Question", "15 P1 Practice Story Question", "16 P2 Practice Tap In Scene", 1280x720 each; page 13 first
# came from node 145-439, the same frame). The board: the band "माधव को नींद आ रही है , उसे उसके पलंग तक पहुंचाइए ।", a blurred copy of the
# room behind the whole artboard, the picture box 935x442 @ (173,172) (4px #386AF6 stroke, r20, shadow 0 4px 4px 45%) holding the designer's
# room picture ("image 245", 934x467 @ (0,-2) of the box: Madhav's room with a striped S-shaped path from the bottom left up to his bed at
# the top right), the dashed centre guide with its arrow ("Vector 7", an SVG — a shorter one on each Figma page: the part still ahead of
# Madhav), four "?" tokens = the CHECKPOINTS on the path, the yawning Madhav (an animated GIF, 36 frames at 70 ms) and the आगे बढ़ें pill
# 186.18x64 @ (545,628). The Figma pages show three states of the board — page 13: Madhav at the start; page 14: just before the first
# checkpoint (bottom right); page 16: on the middle row just before the second checkpoint, turned to face left, the first checkpoint now
# showing a small Madhav ("image 247") in place of its "?".
# [L02-BED-JOURNEY] (user, 2026-09-29): the checkpoints' "?" PULSE; Madhav walks to the next checkpoint; when he reaches it the NEXT PAGE
# is an MCQ in the Figma's card style (the "15 P1" frame), and after it he walks on to the next checkpoint. So the board is ONE journey
# of five legs, interleaved with the lesson's four questions: I2 (start → checkpoint 1) · I3 · WALK2 (→ checkpoint 2) · P1 · P2
# (→ checkpoint 3) · M1 · WALK4 (→ checkpoint 4) · M2 · WALK5 (→ the bed) · CEL. WALK2/4/5 are new slides (copies of I2 with their own
# leg); I3 stays the story question it was and, like M1 and M2, is shown in the Figma card style (fig_q3 + fig_q3_yellow + room_bg —
# P1's look) with its own content and clips unchanged. On a board page the child taps a pulsing "?" (any remaining checkpoint — forgiving)
# or the bed: Madhav walks the guide to his spot before the next checkpoint (data.bed.walk, constant speed, mirrored while he moves left;
# the checkpoint he passes on the way takes the small Madhav and stops pulsing), and only then is the tap handed to the engine's
# TAP_IN_SCENE (its "correct" line, the lit pill, the advance to the question); any other tap is its gentle try-again. Every board page
# fires the kit's confetti on arrival (card slide.confetti lifts the independent-phase gate on I2 and WALK2, so the five legs behave
# alike). The band's line has no recorded clip, so its VO is an edge-tts hi-IN-SwaraNeural placeholder (tts_clip) until the VO team
# records it; the pages' correct / try-again lines (vo_tap_ok, vo_tap_try) are unchanged. CSS [L02-BED-FIG] (stage class .l02-bed, the
# backdrop .l02-roombg), JS in adapt.js (card slide.bed_fig / room_bg). The old I2 and P2 assets (vo_tap_chitra, vo_tap_toys, scene_5/7)
# stay on disk, unused.
# [L02-BED-STEPS] (user, 2026-09-29, fifth request — page 13 only): on I2 Madhav walks to the FIRST checkpoint to a footsteps sound effect
# (the user's freesound "woodwalking" clip, _reskin_build/sfx_walk_source_freesound-woodwalking-40470.mp3 -> assets/Audio/sfx_walk.ogg via
# sfx_clip; it starts with the walk, loops if the walk outlasts it and fades out in 0.2 s as he arrives — data.bed.sfx, only leg 1 has it)
# and stands ON the checkpoint: his feet at the disc's centre (on_token — the same "feet 5 px under the centre line" as every other spot);
# its "?" stops pulsing under him (data.bed.reach; the small Madhav under his feet looked like a second boy, so the checkpoint takes it only
# once he has left it — the Figma shows a passed checkpoint that way); then the page's correct flow runs as before and the question (I3)
# comes. WALK2 therefore starts from that very spot — the "?" still resting under him (data.bed.rest: no pulse, no tap target) and taking
# the small Madhav as he steps off it (that leg's flip) — instead of the page-14 spot before the checkpoint, so the boy carries on exactly
# where page 13 left him. Legs 3-5 are unchanged (no footsteps; the spots before their checkpoints).
# [L02-BED-AUTO] (user, 2026-09-29, sixth request — page 13 only): "the boy should walk towards the first checkpoint and when he reaches it
# the आगे बढ़ें button should become enabled, and when the user taps it the next page should come with the MCQ". So on I2 nobody taps the
# picture: Madhav sets off BY HIMSELF once the band's line has been heard (data.bed.auto / auto_ms — the line's length and a beat; the
# picture takes no taps at all on this page — no try-again for an idle tap, no early start), the checkpoint reached brings the chime, the
# confetti and the mascot's smile (not the
# "शाबाश! सही जगह।" line — nothing was tapped) and lights the pill; the page then WAITS, and the pill's tap (completeSlide, success) brings
# the question (I3). The engine's TAP_IN_SCENE still mounts the page (its hotspots stay in the card data, inert); pages 15-21 keep the
# tap-to-walk flow and their auto-advance after the correct line.
import shutil, subprocess
from PIL import Image
BED_IMG = os.path.join(CUR, "assets", "Images")
def bed_fresh(dst, *srcs):
    return os.path.exists(dst) and all(os.path.getmtime(dst) >= os.path.getmtime(s) for s in list(srcs) + [os.path.abspath(__file__)])
def bed_webp(name, src, size=None, quality=88, lossless=False, mode="RGB"):
    s = os.path.join(SCR, src); d = os.path.join(BED_IMG, name)
    assert os.path.exists(s), "missing " + s
    if bed_fresh(d, s): return
    im = Image.open(s).convert(mode)
    if size: im = im.resize(size, Image.LANCZOS)
    im.save(d, "WEBP", quality=quality, method=6, lossless=lossless)
    print("wrote", d, im.size)
bed_webp("bed_room.webp", "bed_room_source.png")                                        # the Figma "image 245" source, 1774x887, shown at 934x467
bed_webp("bed_bg.webp", "bed_bg_source.png", quality=80)                                # the artboard's backdrop source, 1677x938, shown blurred at 1326.6x742
bed_webp("bed_q.webp", "bed_q_source.png", size=(172, 260), quality=92, mode="RGBA")    # the "?" ("image 238"), 1024x1536 -> 4x its 43x65 slot
bed_webp("bed_done.webp", "bed_done_source.png", size=(200, 296), quality=92, mode="RGBA")   # the small Madhav of a passed checkpoint ("image 247"), 1024x1536 -> 4x its 50x74 slot
bed_webp("bed_plant.webp", "bed_plant_source.png", lossless=True, mode="RGBA")          # the plant on its table ("Object"), 119x172, shown at 90x130
def bed_boy():
    """The Figma sprite layer is an animated GIF (36 frames, 70 ms each, transparent): the same frames as an animated WebP at
    211x418 (the slot is 58x114 Figma px = 60x119 CSS px, so 2x is enough at any device pixel ratio the lesson runs at)."""
    s = os.path.join(SCR, "bed_boy_source.gif"); d = os.path.join(BED_IMG, "bed_boy.webp")
    if bed_fresh(d, s): return
    g = Image.open(s); frames = []; durs = []
    for i in range(g.n_frames):
        g.seek(i); frames.append(g.convert("RGBA").resize((211, 418), Image.LANCZOS)); durs.append(int(g.info.get("duration", 70)))
    frames[0].save(d, "WEBP", save_all=True, append_images=frames[1:], duration=durs, loop=0, quality=80, method=4)
    print("wrote", d, len(frames), "frames")
bed_boy()
# the guides: page 13's SVG is the whole centre line (627.97x260 incl. the stroke's bleed), page 14's has the bottom row taken out and is
# cut at 243 px, page 16's keeps only the middle row's left part and the top (cut at 120.612 px) — the designer's own three exports. The
# five legs use them as "the part still ahead": legs 1 / 2 / 3 as on the Figma pages 13 / 14 / 16, legs 4 and 5 (no Figma page) page 16's.
BED_GUIDES = {13: (627.97, 260.0), 14: (627.97, 243.0), 16: (627.97, 120.612)}
for n in BED_GUIDES:
    gs = os.path.join(SCR, "bed_guide_%d_source.svg" % n); gd = os.path.join(BED_IMG, "bed_guide_%d.svg" % n)
    assert os.path.exists(gs), "missing " + gs
    if not bed_fresh(gd, gs): shutil.copyfile(gs, gd); print("wrote", gd)
_old_guide = os.path.join(BED_IMG, "bed_guide.svg")
if os.path.exists(_old_guide): os.remove(_old_guide); print("removed", _old_guide)
def tts_clip(name, text, target_i=-15.9):
    """A placeholder VO line: edge-tts hi-IN-SwaraNeural (the voice used for every placeholder in this lesson) -> _reskin_build/<name>_source
    ...mp3 (made once; kept), then assets/Audio/<name>.ogg: edge's leading / trailing silence found with silencedetect (-45 dB, 0.15 s) and
    cut to 0.10 s before the speech and 0.33 s after it; two-pass loudnorm (linear) to target_i LUFS / -1.1 dBTP; a 20 ms fade-in and a
    100 ms fade-out; Opus 64 k mono 48 k like every other clip. Registered in the card's audio / audio_text."""
    src = os.path.join(SCR, name + "_source_edge-tts_hi-IN-SwaraNeural.mp3"); dst = os.path.join(CUR, "assets", "Audio", name + ".ogg")
    if not os.path.exists(src):
        subprocess.run([sys.executable, "-m", "edge_tts", "-v", "hi-IN-SwaraNeural", "-t", text, "--write-media", src], check=True)
        print("edge-tts wrote", src)
    aud[name] = "assets/Audio/" + name + ".ogg"; txt[name] = text
    if bed_fresh(dst, src): return
    out = ff("-i", src, "-af", "silencedetect=n=-45dB:d=0.15", "-f", "null", "-")
    h, mnt, sec = re.search(r"Duration: (\d+):(\d+):([\d.]+)", out).groups(); dur = int(h) * 3600 + int(mnt) * 60 + float(sec)
    sil = re.findall(r"silence_start: ([\d.]+)(?:.*?silence_end: ([\d.]+))?", out, re.S)
    starts = [float(a) for a, b in sil]; ends = [float(b) if b else dur for a, b in sil]
    speech0 = ends[0] if starts and starts[0] < 0.05 else 0.0
    speech1 = starts[-1] if starts and ends[-1] >= dur - 0.05 and starts[-1] > speech0 else dur
    t0 = max(0.0, speech0 - 0.10); t1 = min(dur, speech1 + 0.33)
    cut = ["-ss", "%.3f" % t0, "-t", "%.3f" % (t1 - t0), "-i", src]
    m = json.loads((lambda o: o[o.rindex("{"):o.rindex("}") + 1])(ff(*cut, "-af", "loudnorm=I=%s:TP=-1.1:LRA=11:print_format=json" % target_i, "-f", "null", "-")))
    ff(*cut, "-af", "loudnorm=I=%s:TP=-1.1:LRA=11:measured_I=%s:measured_TP=%s:measured_LRA=%s:measured_thresh=%s:offset=%s:linear=true,"
       "aresample=48000,afade=t=in:st=0:d=0.02,afade=t=out:st=%.3f:d=0.1" % (target_i, m["input_i"], m["input_tp"], m["input_lra"], m["input_thresh"], m["target_offset"], t1 - t0 - 0.1),
       "-ac", "1", "-ar", "48000", "-c:a", "libopus", "-b:a", "64k", dst)
    assert os.path.exists(dst), "ffmpeg did not write " + dst
    print("wrote", dst, "speech %.2f-%.2f of %.2f s" % (speech0, speech1, dur))
def sfx_clip(name, src, start, length):
    """A sound effect from a clip the user gave: _reskin_build/<src> cut from `start` for `length` s, levelled the way the picture pops are
    (mean to SFX_MEAN_DB, peak no higher than SFX_PEAK_DB — the smaller of the two gains), a 20 ms fade-in and a 60 ms fade-out, Opus 64 k
    mono 48 k -> assets/Audio/<name>.ogg. Not a spoken line: no audio_text; the JS builds the path from the id as the engine does for the pops."""
    s = os.path.join(SCR, src); dst = os.path.join(CUR, "assets", "Audio", name + ".ogg")
    assert os.path.exists(s), "missing " + s
    if bed_fresh(dst, s): return
    with tempfile.TemporaryDirectory() as td:
        cut = os.path.join(td, "cut.wav")
        ff("-ss", "%.2f" % start, "-t", "%.2f" % length, "-i", s, "-ac", "1", "-ar", "48000", cut)
        mean, peak = sfx_levels(cut); gain = min(SFX_MEAN_DB - mean, SFX_PEAK_DB - peak)
        ff("-i", cut, "-af", "volume=%.2fdB,afade=t=in:st=0:d=0.02,afade=t=out:st=%.2f:d=0.06" % (gain, length - 0.06), "-c:a", "libopus", "-b:a", "64k", dst)
    assert os.path.exists(dst), "ffmpeg did not write " + dst
    print("wrote", dst, "gain %.1f dB (mean %.1f, peak %.1f)" % (gain, mean, peak))
# the footsteps (freesound "woodwalking", 6.19 s: twelve steps ~0.45 s apart from 0.15 s, tailing off after 5.1 s): cut 0.10-5.45 s, so the
# first step falls with the first stride and a loop, if ever needed, keeps the cadence
sfx_clip("sfx_walk", "sfx_walk_source_freesound-woodwalking-40470.mp3", 0.10, 5.35)
tts_clip("vo_tap_bed", "माधव को नींद आ रही है, उसे उसके पलंग तक पहुंचाइए।")
BED_LINE = "माधव को नींद आ रही है , उसे उसके पलंग तक पहुंचाइए ।"      # the Figma band line, spaced as the designer wrote it
BED_ALT = "माधव का कमरा: माधव जम्हाई ले रहा है, एक घुमावदार रास्ता ऊपर दाएँ उसके पलंग तक जाता है।"
# the bed = the room picture's top right (picture px 1420-1745 x 15-300 at 934/1774 from (-4,-6) of the box's padding box = 743.6-914.7 x
# 1.9-152 of 927x434), as % of the box — a tap target on every leg ("take him to his bed")
BED_HOT = {"x": 80, "y": 0, "w": 19, "h": 35.5, "correct": True}
# the guide's centre line, read off page 13's SVG: the start dot, the dash centres of the bottom row, the right U-turn, the middle row,
# the left U-turn, the top row (a solid centre line there, y 1.5 from x 66 to 500) and the tail to the arrow's tip — in the SVG's own
# coordinates (627.97 wide @ (151.53,124) of the box's padding box: Figma places the 626.47x250.5 vector box @ (153.03,125.5) and the
# SVG bleeds 0.24% left / 0.6% top). A Catmull-Rom curve through them, sampled 8x, is the route every leg is cut from.
BED_GUIDE_AT = (151.53, 124.0)
BED_ROUTE = [(43.5, 252.0), (73.8, 246.6), (132.2, 240.5), (188.4, 240.1), (236.2, 240.3), (287.0, 240.5), (334.8, 240.7), (385.6, 240.8),
             (433.4, 241.0), (484.2, 241.2), (532.1, 241.4),
             (578.0, 230.5), (611.2, 200.9), (613.2, 157.4), (578.8, 129.7),
             (526.4, 119.9), (467.3, 119.7), (405.2, 119.5), (346.0, 119.3), (283.9, 119.2), (224.8, 119.0), (162.7, 118.8), (103.5, 118.6),
             (48.8, 110.6), (9.4, 84.1), (10.6, 30.6), (66.2, 3.9),
             (130.0, 1.5), (200.0, 1.5), (280.0, 1.5), (360.0, 1.5), (440.0, 1.5), (500.0, 3.0),
             (522.8, 12.1), (567.6, 29.0), (601.9, 28.9), (619.5, 24.8), (627.97, 20.0)]
def open_catmull_rom(pts, steps=8):
    out = []; n = len(pts)
    for i in range(n - 1):
        p0, p1, p2, p3 = pts[max(i - 1, 0)], pts[i], pts[i + 1], pts[min(i + 2, n - 1)]
        for k in range(steps):
            t = k / steps; t2 = t * t; t3 = t2 * t
            out.append(tuple(0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2
                                    + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3) for j in (0, 1)))
    out.append(pts[-1]); return out
ROUTE = [(BED_GUIDE_AT[0] + x, BED_GUIDE_AT[1] + y) for x, y in open_catmull_rom(BED_ROUTE)]
CUM = [0.0]
for a, b in zip(ROUTE, ROUTE[1:]): CUM.append(CUM[-1] + ((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2) ** 0.5)
def nearest_i(pt): return min(range(len(ROUTE)), key=lambda i: (ROUTE[i][0] - pt[0]) ** 2 + (ROUTE[i][1] - pt[1]) ** 2)
def at_d(d):
    """The route point at distance d (linear between the samples)."""
    i = 1
    while i < len(CUM) - 1 and CUM[i] < d: i += 1
    a, b = ROUTE[i - 1], ROUTE[i]; seg = CUM[i] - CUM[i - 1]; t = min(1.0, max(0.0, (d - CUM[i - 1]) / seg)) if seg else 0.0
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
# Madhav's 58x114 box on each Figma page (of the box's padding box); the designer stands him with his feet ~5 px under the centre line
# and ~80 px of path before the checkpoint he is about to reach (page 14: 84 px before the first, page 16: 77 px before the second)
BOY_W, BOY_H = 58, 114
BOY_AT = {13: (182, 268), 14: (603, 256), 16: (471, 134)}
def feet(box): return (box[0] + BOY_W / 2, box[1] + BOY_H)
BOY_BED = (ROUTE[-1][0] - BOY_W / 2, ROUTE[-1][1] + 5 - BOY_H)           # the journey's end: at the arrow's tip, by the bed
# the four "?" tokens (CSS .t1..t4 = Figma "image 236", "image 235", "image 237", "image 234"), 104x102 @ these spots inside the stroke;
# each token's place along the route is the route point nearest its centre; the checkpoints in walking order are the tokens by that distance
BED_TOKENS = [(133, 67), (370, 185), (580, 54), (657, 302)]
TOKEN_D = [CUM[nearest_i((x + 52, y + 51))] for x, y in BED_TOKENS]
CHECKPOINTS = sorted(range(4), key=lambda k: TOKEN_D[k])          # [3, 1, 0, 2]: bottom right, middle, top left, top right
assert CHECKPOINTS == [3, 1, 0, 2], CHECKPOINTS
def before_token(k, tol=4.0):
    """Madhav's box standing just before checkpoint k, the designer's way: feet 5 px under the centre line, his 58x114 box not over the
    token's 104x102 disc beyond a touch (the Figma spots before checkpoints 1 and 2 overlap it by 4 and 3 px) — the nearest such spot
    on the route before the token (checkpoint 3 sits in the path's corner, so he waits on the middle row just before the bend)."""
    tx, ty = BED_TOKENS[k]; d = TOKEN_D[k] - 30.0
    while d > TOKEN_D[k] - 400.0:
        p = at_d(d); box = (p[0] - BOY_W / 2, p[1] + 5 - BOY_H)
        ox = min(box[0] + BOY_W, tx + 104) - max(box[0], tx); oy = min(box[1] + BOY_H, ty + 102) - max(box[1], ty)
        if ox <= tol or oy <= tol: return (round(box[0], 1), round(box[1], 1))
        d -= 1.0
    raise AssertionError("no spot before checkpoint token %d" % k)
def on_token(k):
    """Madhav's box standing ON checkpoint k: his feet (5 px under the centre line, as at every spot) at the disc's centre, which the route
    runs through — he stands in the middle of the checkpoint, its small Madhav under him."""
    x, y = BED_TOKENS[k]; return (x + 52 - BOY_W / 2, y + 51 + 5 - BOY_H)
def face_at(box):
    """Which way Madhav faces when he stands at `box`: the direction the route arrives with (the last 20 px)."""
    d = CUM[nearest_i(feet(box))]; a = at_d(max(0.0, d - 20.0)); b = at_d(d)
    return -1 if b[0] < a[0] - 0.5 else 1
def token_hot(k):
    x, y = BED_TOKENS[k]
    return {"x": round(x / 927 * 100, 2), "y": round(y / 434 * 100, 2), "w": round(104 / 927 * 100, 2), "h": round(102 / 434 * 100, 2), "correct": True}
BED_SPEED = 260.0            # Figma px per second, every leg alike (the whole route is ~1800 px)
def bed_leg(box_from, box_to, guide, done, face=None, sfx=None, reach=None, rest=(), auto=False):
    i0, i1 = nearest_i(feet(box_from)), nearest_i(feet(box_to))
    assert i1 > i0, "a leg must run forward along the route"
    pts = ROUTE[i0:i1 + 1]; d0 = CUM[i0]; L = CUM[i1] - d0
    # the checkpoints this leg passes (their route point within the leg, a few px of slack at its end; the JS flips whatever is left as he
    # arrives) — not the one the leg ends ON (reach, [L02-BED-STEPS]): that keeps its "?" under him and takes the small Madhav from the next
    # board page on
    flips = sorted([{"token": k, "at": round(TOKEN_D[k] - d0, 1)} for k in range(4) if d0 < TOKEN_D[k] <= CUM[i1] + 6.0 and k not in done and k != reach], key=lambda f: f["at"])
    gw, gh = BED_GUIDES[guide]
    leg = {"walk": [[round(x, 1), round(y, 1)] for x, y in pts], "walk_s": round(max(1.6, L / BED_SPEED), 2),
           "boy": [round(v, 1) for v in box_from], "boy_to": [round(v, 1) for v in box_to], "face": face if face is not None else face_at(box_from),
           "done": list(done), "flips": flips,
           "guide": {"src": "assets/Images/bed_guide_%d.svg" % guide, "x": BED_GUIDE_AT[0], "y": BED_GUIDE_AT[1], "w": gw, "h": gh}}
    if sfx: leg["sfx"] = sfx                        # [L02-BED-STEPS] the footsteps heard while he walks this leg
    if reach is not None: leg["reach"] = reach      # [L02-BED-STEPS] the checkpoint he stands on at the end (its "?" stops pulsing)
    if rest: leg["rest"] = list(rest)               # [L02-BED-STEPS] the checkpoint he starts ON: its "?" resting (no pulse, no tap target) until he walks off it
    if auto: leg["auto"] = True; leg["auto_ms"] = int(auto)   # [L02-BED-AUTO] he sets off by himself auto_ms after the page opens (the band's line + a beat)
    return leg
def clip_s(name):
    """The length of a lesson clip (assets/Audio/<name>.ogg) in seconds, read with ffmpeg."""
    h, m, sec = re.search(r"Duration: (\d+):(\d+):([\d.]+)", ff("-i", os.path.join(CUR, "assets", "Audio", name + ".ogg"))).groups()
    return int(h) * 3600 + int(m) * 60 + float(sec)
# [L02-BED-AUTO] when Madhav sets off on page 13: the band's line (vo_tap_bed, ~4.2 s) and a 0.4 s beat after the page opens. A fixed
# time from the clip's length, not the engine's isPlaying flag: the engine plays the prompt twice at mount (pre-existing), the first,
# aborted play() clears the flag 1.2 s later while the line still sounds. (The JS still holds the walk while a replay is sounding.)
BED_AUTO_MS = int(round(clip_s("vo_tap_bed") * 1000)) + 400
assert 3000 <= BED_AUTO_MS <= 8000, BED_AUTO_MS
CP1, CP2, CP3, CP4 = CHECKPOINTS
ON_CP1 = on_token(CP1)                                                # [L02-BED-STEPS] (680, 244): feet at the first checkpoint's centre
BEFORE_CP3, BEFORE_CP4 = before_token(CP3), before_token(CP4)
BED_LEGS = [   # (slide id, phase, the leg)
    ("I2",    "independent", bed_leg(BOY_AT[13], ON_CP1, 13, [], face=1, sfx="sfx_walk", reach=CP1, auto=BED_AUTO_MS)),   # page 13 -> ON checkpoint 1, by himself after the line, to the footsteps
    ("WALK2", "independent", bed_leg(ON_CP1, BOY_AT[16], 14, [], face=1, rest=[CP1])),         # from ON checkpoint 1 (its "?" resting under him; the small Madhav as he steps off) -> before checkpoint 2 (the page-16 state)
    ("P2",    "practice",    bed_leg(BOY_AT[16], BEFORE_CP3, 16, [CP1], face=-1)),               # -> before checkpoint 3; passes checkpoint 2
    ("WALK4", "mastery",     bed_leg(BEFORE_CP3, BEFORE_CP4, 16, [CP1, CP2])),                   # -> before checkpoint 4; passes checkpoint 3
    ("WALK5", "mastery",     bed_leg(BEFORE_CP4, BOY_BED, 16, [CP1, CP2, CP3])),                 # -> the bed; passes checkpoint 4
]
assert [(leg.get("reach"), [f["token"] for f in leg["flips"]]) for _, _, leg in BED_LEGS] == [(CP1, []), (None, [CP1]), (None, [CP2]), (None, [CP3]), (None, [CP4])], \
    "the legs do not take the checkpoints one by one: %r" % [(leg.get("reach"), leg["flips"]) for _, _, leg in BED_LEGS]
assert BED_LEGS[0][2]["boy_to"] == [680.0, 244.0] and BED_LEGS[1][2]["boy"] == [680.0, 244.0], (BED_LEGS[0][2]["boy_to"], BED_LEGS[1][2]["boy"])
i2 = next(s for s in card["slides"] if s["id"] == "I2"); p2 = next(s for s in card["slides"] if s["id"] == "P2")
assert i2["type"] == "TAP_IN_SCENE" and i2["phase"] == "independent" and p2["type"] == "TAP_IN_SCENE" and p2["phase"] == "practice"
def board_page(s, leg):
    s["bed_fig"] = True; s["room_bg"] = True; s["confetti"] = True
    s["prompt_hi"] = BED_LINE
    s["audio"]["prompt"] = "vo_tap_bed"
    s["data"]["image_id"] = "bed_room"; s["data"]["alt_hi"] = BED_ALT; s["data"]["bed"] = leg
    s["data"]["hotspots"] = [dict(BED_HOT)] + [token_hot(k) for k in range(4) if k not in leg["done"] and k not in leg.get("rest", [])]   # the bed and every "?" ahead
    s["data"].pop("walk", None); s["data"].pop("walk_s", None)
board_page(i2, BED_LEGS[0][2]); board_page(p2, BED_LEGS[2][2])
def insert_after(after_id, new_slide):
    idx = card["slides"].index(next(s for s in card["slides"] if s["id"] == after_id)); card["slides"].insert(idx + 1, new_slide)
for sid, phase, leg, after in (("WALK2", "independent", BED_LEGS[1][2], "I3"), ("WALK4", "mastery", BED_LEGS[3][2], "M1"), ("WALK5", "mastery", BED_LEGS[4][2], "M2")):
    w = copy.deepcopy(i2); w["id"] = sid; w["phase"] = phase; board_page(w, leg); insert_after(after, w)
for k in ("bed_room", "bed_bg", "bed_q", "bed_done", "bed_plant", "bed_boy"): card["assets"]["image"][k] = "assets/Images/" + k + ".webp"
# the questions between the legs — I3, M1 and M2 keep their content and clips, shown in the Figma card style like P1 ([L02-P1-FIG] below);
# no recall picture (the Figma page has none). Their option pictures are the lesson's cut-out icons on a transparent ground (a book, the
# toys, a plate…, 313-466 px portrait), not scene pictures, so the card window shows each one WHOLE on the white card (fig_q3_contain →
# CSS object-fit contain with a small inset) instead of cropping it to the window as the P1 / G3 scene pictures are.
for sid in ("I3", "M1", "M2"):
    q = next(s for s in card["slides"] if s["id"] == sid)
    assert q["type"] == "STORY_QUESTION", sid + " is not a story question any more"
    q["fig_q3"] = True; q["fig_q3_yellow"] = True; q["fig_q3_contain"] = True; q["room_bg"] = True
    q["data"]["hide_recall"] = True; q["data"].pop("recall_image_id", None)
# ---- [L02-P1-FIG] P1 ("page 15" of the Figma section, the practice story question) from "15 P1 Practice Story Question": G3's card layout
# ([L02-Q3-FIG]: header 36,26 / band 39.9,44 with the text 135.55 in, three 252x314.113 cards @ x 232/514/796, y 247, no pill) with the
# blurred room behind the artboard and the cards in YELLOW — the outer box #FCB717 (G3: #D9D9D9) with a 0 4px 2px 25% shadow, the white
# card's 2.386px stroke #FCB717 (G3: #D5D8DF). Band "माँ के सोते ही माधव ने क्या किया ?" over "माधव ने खाना खाया ।" (the very picture and
# crop of G3's खाना card — the Figma source is byte-identical to q3_khana_source.png), "माधव रोने लगा ।" ("image 240", 266x199 @
# (-8.16,-4.16) of the picture window, cover) and "माधव उठ गया ।" (353x263 @ (-107.16,-68.16), cover; the answer — story sentence T4
# "मम्मी के सोते ही वह उठ गया।"). The question and the three sentences have no recorded clips, so all four are edge-tts placeholders
# (tts_clip) — shown == spoken on every card; P1's try / hint / correct / reveal lines are unchanged. Card slide.fig_q3 + fig_q3_yellow +
# room_bg (CSS .l02-q3.l02-q3-yellow, .l02-roombg). The old P1 question ("माधव किससे खेलने लगा?", vo_q_khilaune, scene_7) stays on disk.
P1_CUTS = {
    "p1_rona": dict(box=(266.0, 199.0), at=(-8.16, -4.16),    fill=("cover",)),
    "p1_utha": dict(box=(353.0, 263.0), at=(-107.16, -68.16), fill=("cover",)),
}
for k, spec in P1_CUTS.items(): cut_q3_option(k, spec)
p1 = next(s for s in card["slides"] if s["id"] == "P1")
assert p1["type"] == "STORY_QUESTION" and p1["phase"] == "practice", "P1 is not the practice story question any more"
p1["fig_q3"] = True; p1["fig_q3_yellow"] = True; p1["room_bg"] = True
p1["prompt_hi"] = "माँ के सोते ही माधव ने क्या किया ?"
tts_clip("vo_q_maa_sote", "माँ के सोते ही माधव ने क्या किया?")
tts_clip("vo_p1_khana", "माधव ने खाना खाया।"); tts_clip("vo_p1_rona", "माधव रोने लगा।"); tts_clip("vo_p1_utha", "माधव उठ गया।")
p1["audio"]["prompt"] = "vo_q_maa_sote"
p1["data"]["hide_recall"] = True; p1["data"].pop("recall_image_id", None)
p1["data"]["options"] = [
    {"img": "q3_khana", "emoji": "🍛", "label_hi": "माधव ने खाना खाया ।", "audio": "vo_p1_khana"},
    {"img": "p1_rona",  "emoji": "😢", "label_hi": "माधव रोने लगा ।",     "audio": "vo_p1_rona"},
    {"img": "p1_utha",  "emoji": "🧒", "label_hi": "माधव उठ गया ।",       "audio": "vo_p1_utha", "correct": True},
]
for k in P1_CUTS: card["assets"]["image"][k] = "assets/Images/" + k + ".webp"
_ids = [s["id"] for s in card["slides"]]          # (G1 is still in the list here; [L02-NO-G1] below removes it)
assert _ids[_ids.index("I1"):] == ["I1", "I2", "I3", "WALK2", "P1", "P2", "M1", "WALK4", "M2", "WALK5", "CEL"], _ids
# ---- [L02-NO-G1] the guided question G1 ("माधव और माँ ने सबसे पहले क्या किया?", the review deck's "page 10") is REMOVED from
# the lesson (user, 2026-09-27). The guided phase now opens with the find-Madhav page G2 straight after the last story page:
# the engine shows the guided transition screen on the phase change T9 → G2 exactly as it did before G1. G1's own assets
# (scene_1.webp, vo_q_khana.ogg) stay on disk, unused; every other asset it used is shared with later pages.
g1 = next(s for s in card["slides"] if s["id"] == "G1")
assert g1["type"] == "STORY_QUESTION", "G1 is not the guided picture question any more"
card["slides"].remove(g1)
assert [s["id"] for s in card["slides"][8:11]] == ["T9", "G2", "G3"], "after the removal the guided phase must open with G2"
for n in range(1, 10):
    assert os.path.exists(os.path.join(CUR, "assets/Images/story_%d.webp" % n)), "missing story_%d.webp" % n
for k in aud:
    assert os.path.exists(os.path.join(CUR, aud[k])), "missing audio " + aud[k]
card_json = json.dumps(card, ensure_ascii=False)

# ---- 5. index.html ----
b0 = html.index('<body class="is-start">')
b1 = html.index('<!-- ============ CARD DATA')
body = html[b0:b1].rstrip()
# [L02-LANDING-FRAME] the reference's .sg-content (title, hero row, sentence pill) becomes the picture frame; #sgTitle
# stays as a hidden stub because boot() writes the skill name into it unconditionally
m = re.search(r'\n([ \t]*)<div class="sg-content">.*?id="sgCaption">[^<]*</div>\s*</div>', body, re.S)
assert m and body.count('<div class="sg-content">') == 1, "sg-content block not found"
ind = m.group(1)
frame = "\n".join(ind + l for l in [
    '<!-- [L02-LANDING-FRAME] Page 1 layout from Figma "FLN by MJ" node 98-2 (start_activity_html_layout): the card IS the',
    '     picture frame - the title scene full-bleed under a 9px white stroke with 44px corners; no title, no hero picture and',
    '     no sentence pill. The engine writes the skill name into #sgTitle at boot, so that element stays as a hidden stub. -->',
    '<div class="sg-frame" id="sgFrame"><img src="%s" alt="" draggable="false"></div>' % LANDING_PIC,
    '<div class="sg-title" id="sgTitle" hidden></div>',
])
body = body[:m.start()] + "\n" + frame + body[m.end():]
gate = re.search(r'<div class="phase-gate" id="phaseGate">.*?</div><img[^>]*></div>', html, re.S).group(0)

index_html = f"""<!doctype html>
<html lang="hi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>SwiftPAL · HI02H04_L02_S01 · {card["title"]["hi"]}</title>
<!-- inline favicon: stops the browser asking for /favicon.ico and logging a 404 -->
<link rel="icon" href="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7">
<!-- LAYOUT: ported value-for-value from HI02H04_L01_S01 (चित्र-वाक्य मिलान) — its chrome markup, stylesheet cascade,
     UI assets, engine and animation kit. This lesson's card (story pages, questions, find-in-picture) is unchanged;
     STORY_READ_PAGE is rendered inside the reference teaching frame (see app.js / style.css L02-ADAPT). -->
<link rel="stylesheet" href="style.css">
</head>
{body}

<!-- PHASE-TRANSITION GATE: body-level full-viewport (a fixed element inside the scaled stage would not cover the viewport) -->
{gate}

<!-- ============ CARD DATA (embedded; in prod the compiler does this) ============ -->
<script type="application/json" id="cardData">{card_json}</script>

<!-- ============ ENGINE + ANIMATION KIT + LAYOUT PATCHES ============ -->
<script src="app.js"></script>
</body>
</html>
"""

# ---- [L02-MIC-CHIP] every speaker chip (header #audioChip, landing #sgVo, story-page SPK_SVG) carries the microphone
#      glyph of the supplied icon instead of the reference's speaker + two wave arcs; the chip itself (circle, ring, shadow,
#      size, position) is untouched. The glyph is scaled to the disc each chip actually shows: the header/landing SVG's own
#      44px-tall rect, and the story page's CSS disc (.stage.tut.l02-story .tut-audio: 44px chip - 2x4px ring = 36px; that
#      rule also hides every <rect> inside the SVG, so the glyph is <path>s only).
def _mic_glyph(s, cx=31, cy=26):
    """Microphone glyph of the supplied icon, in the chip SVG's 62x60 space, centred on the disc centre (cx,cy).
    Icon units (77px icon, 61px disc, origin = disc centre): capsule 11.5 wide x 22.2 tall (top at -15.2), U-arc r 8.25
    centred 1.75 below centre with a 2px stroke, stem down to +15, base 8 wide (+round caps) at +15. s = chip disc height / 61."""
    f = lambda v: ("%.2f" % v).rstrip("0").rstrip(".")
    X = lambda x: f(cx + s * x); Y = lambda y: f(cy + s * y); L = lambda v: f(s * v)
    return ('<path d="M%s %sa%s %s 0 0 1 %s %sv%sa%s %s 0 0 1-%s 0v-%sA%s %s 0 0 1 %s %sZ" fill="white"/>'
            % (X(0), Y(-15.2), L(5.75), L(5.75), L(5.75), L(5.75), L(10.7), L(5.75), L(5.75), L(11.5), L(10.7), L(5.75), L(5.75), X(0), Y(-15.2))
            + '<path d="M%s %sa%s %s 0 0 0 %s 0" stroke="white" stroke-width="%s" stroke-linecap="round" fill="none"/>'
            % (X(-8.25), Y(1.75), L(8.25), L(8.25), L(16.5), L(2))
            + '<path d="M%s %sV%sM%s %sH%s" stroke="white" stroke-width="%s" stroke-linecap="round" fill="none"/>'
            % (X(0), Y(10), Y(15), X(-4), Y(15), X(4), L(2)))
_SPK_GLYPH = re.compile(r'<path d="M29\.8466 .*?33\.3868 21\.5044Z" fill="white"/>')
assert len(_SPK_GLYPH.findall(index_html)) == 2 and len(_SPK_GLYPH.findall(app_js)) == 1, "speaker glyph anchors changed"
index_html = _SPK_GLYPH.sub(lambda m: _mic_glyph(44 / 61), index_html)   # header + landing chips
app_js     = _SPK_GLYPH.sub(lambda m: _mic_glyph(36 / 61), app_js)       # story-page chip

wr(os.path.join(CUR, "style.css"), style_css)
wr(os.path.join(CUR, "app.js"), app_js)
wr(os.path.join(CUR, "index.html"), index_html)
print("wrote", len(style_css), len(app_js), len(index_html))
