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

wr(os.path.join(CUR, "style.css"), style_css)
wr(os.path.join(CUR, "app.js"), app_js)
wr(os.path.join(CUR, "index.html"), index_html)
print("wrote", len(style_css), len(app_js), len(index_html))
