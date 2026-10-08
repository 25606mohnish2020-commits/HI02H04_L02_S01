"""Rebuild HI02H04_L02_S01 on the HI02H04_L01_S01 reference chrome + engine.

index.html  = reference body markup (title/caption swapped) + this lesson's card + <script src=app.js>
style.css   = every reference <style> block, in cascade order, minus the reference-lesson-only blocks, + L02-ADAPT
app.js      = kit core + engine (+ STORY_READ_PAGE module, landing caption) + patch scripts in order, + L02 adapt JS
"""
import re, json, os, sys

# The reference is FROZEN (2026-10-03): the snapshot this dist was built from on 2026-09-30 (Suresh's HI02H04_L01_S01.html.bak110,
# 14:24 that day — it rebuilds the committed index.html / app.js / style.css byte for byte), copied here. The live file keeps
# changing (read-aloud, standard SFX, background music, the station pages, chips 10% larger…), and the user asked for the
# read-aloud beat ONLY with everything else exactly as it was — so that beat is ported by hand (story_read_page.js, adapt.css,
# [L02-READ-ALOUD] below) and the base never moves on its own. To take a later reference change on purpose, point REF at a
# newer snapshot (REF_LIVE) deliberately and review the diff.
REF_LIVE = r"C:\Users\25606\OneDrive\FLN @ CG\Suresh's File\HI02H04_L01_S01-20260916T080241Z-1-001\HI02H04_L01_S01\HI02H04_L01_S01.html"
REF = os.path.join(os.path.dirname(os.path.abspath(__file__)), "reference_HI02H04_L01_S01_2026-09-30_bak110.html")
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
eng = eng.replace(needle, 'tutorial:"चलिए, शुरू करें!"', 1)   # [L02-VO-BATCH] 2026-10-06: the recorded line is "ध्यान से देखिए और मेरे साथ जानिए। चलिए, शुरू करें!" — the headline is its last words = the reference's own; the earlier "आइए कहानी पढ़ें।" went with the earlier recording
# 3d. [L02-FIND-FIG] TAP_IN_SCENE's delayed completion (900 ms after the "correct" line) fires only if its slide is still the
#     one on the stage: on the Figma find page the lit आगे बढ़ें pill may already have moved the lesson on (adapt.js), and the
#     stray call would otherwise complete the NEXT page as well.
needle = '()=> setTimeout(()=>completeSlide(true), 900)); }'
assert eng.count(needle) == 1, "TAP_IN_SCENE completion anchor not unique"
eng = eng.replace(needle, '()=> setTimeout(()=>{ if(CARD.slides[state.idx] === slide) completeSlide(true); }, 900)); }   // [L02-FIND-FIG] only its own slide', 1)
# 3f. [L02-FIND-HINTS] TAP_IN_SCENE's wrong-tap line escalates when the page's data carries hint_seq (clip ids): the n-th miss speaks the
#     n-th line, the last line repeats on every later miss, and when the last line is reached the kit's nudge hand (the tapping hand with
#     its ripple, #nudgeHand, placed by the engine's own pointNudgeAt) points at the answer — its drawn outline (adapt.js data-hot) if the
#     page has one, else the hotspot itself — until the answer is tapped (stopNudge). A page without hint_seq runs exactly as before.
needle = '''      const miss = ()=>{ if(done) return; sfxWrongSoft(); setSwMood("tryagain"); play(audioFor(slide,"try_again")||null,()=>{}); };'''
assert eng.count(needle) == 1, "TAP_IN_SCENE miss anchor not unique"
eng = eng.replace(needle, '''      // [L02-FIND-HINTS] data.hint_seq (clip ids): the n-th miss speaks the n-th line, the last line repeats; when the last line is
      // reached the kit's nudge hand points at the answer (its outline from adapt.js if drawn, else the hotspot) until it is tapped.
      let misses = 0, pointed = false;
      const seq = Array.isArray(d.hint_seq) ? d.hint_seq : [];
      const pointAtAnswer = ()=>{ const hot = frame.querySelector(".tis-hot.correct-hot"); if(!hot) return;
        const i = [...frame.querySelectorAll(".tis-hot")].indexOf(hot), el = frame.querySelector('.l02-shape[data-hot="' + i + '"]') || hot;
        pointed = true; pointNudgeAt(el); state.nudgeUsed = true; SwiftPAL.emit("nudge_invoked", { slide_id: slide.id, phase: slide.phase }); };
      const miss = ()=>{ if(done) return; sfxWrongSoft();
        if(!seq.length){ setSwMood("tryagain"); play(audioFor(slide,"try_again")||null,()=>{}); return; }
        const k = Math.min(++misses, seq.length) - 1, last = k === seq.length - 1;
        state.attempts = misses; state.scaffoldLevel = Math.max(state.scaffoldLevel, last ? 3 : (k ? 2 : 1));
        setSwMood(k ? "hint" : "tryagain"); if(last) pointAtAnswer();
        play("assets/Audio/" + seq[k] + "." + AUDIO_EXT, ()=>{}); };''', 1)
needle = '''if(h.correct){ done=true; hs.classList.add("hit"); sfxCorrect(); confettiCannon(); setSwMood("happy");'''
assert eng.count(needle) == 1, "TAP_IN_SCENE correct anchor not unique"
eng = eng.replace(needle, '''if(h.correct){ done=true; if(pointed) stopNudge(); hs.classList.add("hit"); sfxCorrect(); confettiCannon(); setSwMood("happy");''', 1)   # [L02-FIND-HINTS] the hand goes with the find
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
# 3g. [L02-M1-SENTQ] STORY_QUESTION hides its recall picture on every mastery-phase page ("so the answer isn't leaked by thumb-reading").
#     M1 must show its picture (the user wants page 16 to look exactly like page 14), so a card that says `hide_recall: false` OUTRIGHT
#     keeps the picture at mastery too; a mastery card that says nothing (M2) hides it as before, and `hide_recall: true` still hides.
needle = 'const hideRecall = slide.phase === "mastery" || d.hide_recall === true;'
assert eng.count(needle) == 1, "STORY_QUESTION hideRecall anchor not unique"
eng = eng.replace(needle, 'const hideRecall = (slide.phase === "mastery" && d.hide_recall !== false) || d.hide_recall === true;   /* [L02-M1-SENTQ] an explicit false shows it at mastery */', 1)
# 3h. [L02-STD-SFX] (2026-10-05, user request: "apply all these sound effects wherever they can be applied and replace the existing sound
#     effect with these where one already exists") the engine's two procedural answer tones become the user's standard clips: every
#     correct answer (sfxCorrect — the find pages' hit, the question pages' right pill after its scene sound, the drag / other branches)
#     plays sfx_correct_feedback, every wrong one (sfxWrongSoft — a decoy, a wrong pill, a wrong drop) sfx_incorrect_feedback; the
#     celebration page's sound (playSfx at 0.7) goes through the same full-volume player as the rest of the set (its clip is set on the
#     card below: sfx_confetti). stdSfx is adapt.js's player ([L02-STD-SFX-JS], where the confetti and the buttons are wired too);
#     playSfx stays as the fallback. sfxTap (the counting games' tick) is not used by this lesson and stays.
for needle, fixed in [
    ('const sfxCorrect   = ()=> _tone([660, 880, 1180], "sine", 0.42, 0.13);   // rising major arpeggio',
     'const sfxCorrect   = ()=> (window.stdSfx || playSfx)("sfx_correct_feedback");   // [L02-STD-SFX] the standard correct clip (was a synthesized rising arpeggio)'),
    ('const sfxWrongSoft = ()=> _tone([300, 235], "triangle", 0.20, 0.08);      // gentle, never harsh',
     'const sfxWrongSoft = ()=> (window.stdSfx || playSfx)("sfx_incorrect_feedback");   // [L02-STD-SFX] the standard incorrect clip (was a soft two-note buzz)'),
    ('      playSfx(slide.audio && slide.audio.sfx ? slide.audio.sfx : "sfx_celebrate");',
     '      (window.stdSfx || playSfx)(slide.audio && slide.audio.sfx ? slide.audio.sfx : "sfx_celebrate");   // [L02-STD-SFX] the card says sfx_confetti; the standard player'),
]:
    assert eng.count(needle) == 1, "[L02-STD-SFX] engine anchor not unique: " + needle
    eng = eng.replace(needle, fixed, 1)
# 3i. [L02-NO-BIRD-CUE] (2026-10-05, user request: "Remove the फिर से सुनने के लिए मुझ पर टैप करें VO and the synced animation of the bird on
#     the title page; just play the VO of the title page and then enable the play button, without the bird animation and its VO.")
#     The reference's Page 1 order was welcome VO → 1.5 s → the bird pulses with its replay line (vo_tap_swiftee_replay) → the bird
#     settles → शुरू करें pops in ([LANDING-BTN-AFTER-BIRD]). scheduleFollowUp — the one place the cue is armed (after the first welcome,
#     and after a bird-tap replay if the button were still owed) — now reveals the button at once instead: welcome VO → शुरू करें pops in
#     and breathes. runBirdCue / setBirdCue / stopBirdPulse stay in the engine unreferenced by any flow (the start tap's
#     stopBirdPulse(true) is a harmless no-op), the bird-tap replay of the welcome stays, the speaker button stays, the 10 s watchdog
#     is moot. The replay line's clip is deleted from the dist and unregistered below ([L02-NO-BIRD-CUE] after the std SFX).
needle = '''  const scheduleFollowUp = ()=>{
    clearTimeout(landingVO.followUpTimer);
    landingVO.cue = "pending";
    landingVO.followUpTimer = setTimeout(runBirdCue, 1500);
    if(!$("sgBtn").classList.contains("ready")){ clearTimeout(landingVO.revealWatch); landingVO.revealWatch = setTimeout(revealStart, 10000); }   // [LANDING-BTN-AFTER-BIRD] safety net
  };'''
assert eng.count(needle) == 1, "[L02-NO-BIRD-CUE] scheduleFollowUp anchor not unique"
eng = eng.replace(needle, '''  const scheduleFollowUp = ()=>{                       // [L02-NO-BIRD-CUE] no bird cue any more: the welcome's end reveals शुरू करें at once
    clearTimeout(landingVO.followUpTimer); clearTimeout(landingVO.revealWatch);
    landingVO.cue = "idle";
    revealStart();
  };''', 1)
# 3j. [L02-STD-GATE] (2026-10-05, user request: "In the transition screens in which the background is black and the text is written in
#     pink Hindi replace the bird animation with this animation; the bird should only start moving its beak when the pink text appears —
#     adjust this bird gif in such a way that when the bird starts moving its beak only then the pink text should appear, for all
#     transition screens; also the whole transition screen should last for only 4 seconds.") The reference gate (phaseBlurTransition):
#     scrim + blur, the headline at once, peeking_pal.webp looping under it (restarted by a cache-busting src), the VO at once, closed once
#     the VO had ended and ≥ 2 s had passed. Now: the gate opens with the headline hidden (adapt.css hides .pg-title until the gate carries
#     .pg-talk); adapt.js [L02-STD-GATE-JS] restarts the standard transition animation (assets/UI/gate_swiftee.webp, made below) from its
#     first frame; CARD.gate.talk_ms into it — the animation's first open-beak frame — the gate gets .pg-talk (the headline appears) and
#     the VO speaks; the gate closes CARD.gate.total_ms (4000) after it opened, or CARD.gate.tail_ms (300) after a longer line has ended
#     (the guided line is 5.6 s; a hard cut at 4 s would stop it mid-sentence), never before its line has ended. Same signature, same
#     callers (the start tap, completeSlide), same token guard, same classes on the stage and body.
_i0 = eng.index('function phaseBlurTransition(cb, toPhase){'); _i1 = eng.index('\n}\n', _i0) + 3
_old = eng[_i0:_i1]
assert eng.count('function phaseBlurTransition(cb, toPhase){') == 1 and 'peeking_pal.webp?r=' in _old and '2000 - (Date.now() - openedAt)' in _old \
    and _old.count('\n}\n') == 1 and 'SwiftPAL.emit("phase_transition", { to: toPhase });' in _old, "[L02-STD-GATE] phaseBlurTransition anchor"
eng = eng[:_i0] + '''function phaseBlurTransition(cb, toPhase){                          // [L02-STD-GATE] the standard transition: the bird rises, its beak opens → the line appears and speaks → closed at 4 s
  const tok = ++_gateToken;
  stopNudge(); stopAudio();
  const gate = $("phaseGate"), img = $("phaseGateImg");
  const G = CARD.gate || {}, TALK = (G.talk_ms != null) ? G.talk_ms : 1250, TOTAL = (G.total_ms != null) ? G.total_ms : 4000, TAIL = (G.tail_ms != null) ? G.tail_ms : 300;
  const title = $("phaseGateTitle"); if(title) title.textContent = PHASE_GATE_TITLE[toPhase] || "";
  gate.classList.remove("pg-talk");                                  // the headline stays hidden until the bird starts talking (adapt.css)
  $("stage").classList.add("blurred", "gating");
  document.body.classList.add("gating");
  gate.classList.add("show");
  SwiftPAL.emit("phase_transition", { to: toPhase });
  const closeGate = ()=>{ gate.classList.remove("show", "pg-talk"); $("stage").classList.remove("blurred", "gating"); document.body.classList.remove("gating"); };
  // VO only if the card actually ships it; else a silent beat.
  const voId = PHASE_GATE_VO[toPhase];
  const voSrc = (voId && CARD.assets && CARD.assets.audio && CARD.assets.audio[voId]) || null;
  const openedAt = Date.now();
  // the animation restarts from its first frame: adapt.js preloads the file once and hands the <img> a fresh object URL each gate (its
  // load is the animation's first frame); without it, the file with a cache-buster, as the reference restarted its loop
  const started = (window.l02GateBird && window.l02GateBird.start) ? window.l02GateBird.start(img) : new Promise(res=>{
    if(!img){ res(); return; } img.onload = img.onerror = ()=> res(); img.src = (G.anim || "assets/UI/gate_swiftee.webp") + "?r=" + Date.now(); setTimeout(res, 1500); });
  started.then(()=>{
    if(tok !== _gateToken) return;                                   // a newer gate superseded us
    setTimeout(()=>{
      if(tok !== _gateToken) return;
      gate.classList.add("pg-talk");                                 // the beak opens: the line appears and speaks
      play(voSrc, ()=>{
        if(tok !== _gateToken){ closeGate(); return; }
        const hold = Math.max(TAIL, TOTAL - (Date.now() - openedAt));   // the screen lasts TOTAL from its opening; a longer line gets TAIL after its end
        setTimeout(()=>{
          if(tok !== _gateToken){ closeGate(); return; }
          gate.classList.remove("show", "pg-talk");
          $("stage").classList.remove("blurred");
          if(cb) cb();                              // mounts the next slide
          $("stage").classList.remove("gating");    // header returns once the slide is in
          document.body.classList.remove("gating");
        }, hold);
      });
    }, TALK);
  });
}
''' + eng[_i1:]
engine[0]["inner"] = eng

js_parts = []
for b in scripts:
    if b["id"] in SKIP_SCRIPT: continue
    if "application/json" in (b["attrs"] or ""): continue
    label = b["id"] or "ENGINE (2026.07.16i-r4-unified + STORY_READ_PAGE)"
    js_parts.append("/* ===== <script id=\"%s\"> ===== */\n%s\n;" % (label, b["inner"].strip("\n")))
js_parts.append(rd(os.path.join(SCR, "adapt.js")).strip("\n") + "\n;")
js_parts.append(rd(os.path.join(SCR, "sent_q_page.js")).strip("\n") + "\n;")   # [L02-G3-REF] the reference page-5 behaviours, card-driven (slide.sent_ref)
js_parts.append(rd(os.path.join(SCR, "bgm_duck.js")).strip("\n") + "\n;")      # [L02-BGM-DUCK] the background-music bed — LAST, so its mountSlide wrapper is outermost (card bgm)
app_js = ("/* HI02H04_L02_S01 — engine + FLN animation kit + layout patches, ported from HI02H04_L01_S01 in the same script order\n"
          "   (the reference-lesson-only scripts are left out; STORY_READ_PAGE is this lesson's own tutorial module). */\n\n"
          + "\n\n".join(js_parts) + "\n")

# ---- 4. card (this lesson's, from the pre-reskin index.html) + the fields the reference chrome reads ----
cur = rd(BACKUP_INDEX)
m = re.search(r'<script type="application/json" id="cardData">(.*?)</script>', cur, re.S)
card = json.loads(m.group(1))
# page 1 shows no hero picture and no sentence pill any more (Figma "FLN by MJ" node 98-2): the card itself is the
# picture frame (see index.html [L02-LANDING-FRAME] and adapt.css), so landing_hero / landing_caption_hi are not set
# ---- [L02-LANDING-PIC-2] (2026-10-07, user request) "At the title page replace the image with this image as shown in this Figma frame;
# rest keep everything exactly the same, just replace the image inside." Figma "FLN by MJ" node 316-200 (start_activity_html_layout,
# 1280x720): the same card (Frame 1410086448, 1114x456 @ 76,125) now holds the sleeping-pair bedroom scene ("ChatGPT Image Sep 26,
# 2026, 04_40_09 PM 1", 1114x627 @ (-10,-86) of the card — the picture's middle band, centred) with the title sticker "सोना नहीं,
# खेलना है !" ("Object", 416x113 @ frame (432,155) = card (356,30)) over it. Both are the Figma file's own source images (the MCP's
# raw fills: the scene 1672x941 = 1.5x the layer, the sticker 725x197), composed here at the scene's 1.5x into ONE picture — as the
# user's export of the layer shows it — and encoded to assets/Images/landing_title_2.webp. The frame's CSS places it at the Figma
# offsets inside the 9px stroke ([L02-LANDING-PIC-2] in adapt.css: -18/-95; the design's -19 would leave the last column of the
# stroke's box bare, so a 1px nudge). The old scene (landing_title.webp, the Figma 98-2 picture) leaves the dist; its source stays in
# _reskin_build/landing_title_source.png. Nothing else on the page moves: the card box, the bird, the play button, the reveal.
LANDING_PIC = "assets/Images/landing_title_2.webp"
_L2_SCENE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "landing2_scene_source.png")
_L2_TITLE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "landing2_title_source.png")
_L2_DST = os.path.join(CUR, LANDING_PIC)
assert os.path.exists(_L2_SCENE) and os.path.exists(_L2_TITLE), "[L02-LANDING-PIC-2] missing sources"
if not os.path.exists(_L2_DST) or os.path.getmtime(_L2_DST) < max(os.path.getmtime(_L2_SCENE), os.path.getmtime(_L2_TITLE)):
    from PIL import Image as _Img
    _scene = _Img.open(_L2_SCENE).convert("RGB"); _sticker = _Img.open(_L2_TITLE).convert("RGBA")
    _S = _scene.size[0] / 1114.0                                     # the scene's pixels per layer px (1.5)
    assert abs(_scene.size[1] / 627.0 - _S) < 0.01, _scene.size
    _st = _sticker.resize((round(416 * _S), round(113 * _S)), _Img.LANCZOS)
    _scene.paste(_st, (round(366 * _S), round(116 * _S)), _st)     # the sticker at card (356,30) = picture (366,116), 416x113
    _scene.save(_L2_DST, "WEBP", quality=88, method=6)
    print("wrote", _L2_DST, _scene.size)
assert os.path.exists(_L2_DST), "missing " + LANDING_PIC
for s in card["slides"]:
    if s["type"] == "STORY_READ_PAGE": s["caption_chip"] = True
    if s["type"] == "STORY_QUESTION": s["bare_recall"] = True
    if s["type"] == "CELEBRATION": s.setdefault("audio", {})["sfx"] = "sfx_celebrate"
# ---- [L02-SENT-RATE] (2026-10-07, user request) "From page 1 T1 to page 9 T9 reduce the speed of the VO of the Hindi sentence when it is
# played, and the in-synced highlight along with it, by 20%" — then "by 10%", then "by 20% more" (three requests in a row). Every story
# page gets data.sentence_rate 0.72 (= 0.9 x 0.8: the 10% slower speed slowed by a further 20%; 0.8, then 0.9 before): story_read_page.js plays the
# sentence clip (data.whole_audio) at that playbackRate with the pitch kept (the browser's time-stretch — the voice as a slowed take),
# and the word highlight follows the clip's own clock (currentTime against data.word_times), so it slows with it by itself; the pop and
# आगे बढ़ें follow the clip's (later) end as before. The clips, their measured timings and the cue line are untouched (the cue plays at 1.0).
for _s in card["slides"]:
    if _s["type"] == "STORY_READ_PAGE": _s["data"]["sentence_rate"] = 0.72
aud, txt = card["assets"]["audio"], card["assets"]["audio_text"]
for k, v in {
    "vo_pt_tutorial": "ध्यान से देखिए और मेरे साथ जानिए। चलिए, शुरू करें!",   # [L02-GATE-LINE] → [L02-VO-BATCH] the recorded line; the headline is its last words, चलिए, शुरू करें!
    "vo_pt_guided": "बहुत बढ़िया! अब हम साथ मिलकर शुरू करते हैं। चलिए, साथ में करें!",
    "vo_pt_practice": "वाह! अब आपकी बारी।",
    # "vo_tap_swiftee_replay": "फिर से सुनने के लिए मुझ पर टैप करिए।" — the title page's bird-cue line: gone since [L02-NO-BIRD-CUE] (2026-10-05)
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
# [L02-NO-READ-INSTR] pages 3-10 (T2..T9) all narrated the same "इस वाक्य को पढ़िए।" (vo_read_instr) on every landing; the
# user asked for it to go. Those pages now open silently and run straight into their beats (picture pop → "tap here" cue).
# [L02-NO-HELP-VO] (2026-10-03, user request) page 2 (T1) loses its narration as well — "आप खुद कहानी पढ़ने की कोशिश करिए। जहाँ
# मदद चाहिए, यह बटन दबाकर सुन सकते हैं।" (vo_help) — and with it the chip pulse that was timed to its "यह बटन…" words
# ([L02-SPK-CUE]: CHIP_PULSE_AT is applied AFTER this removal, so no page carries data.chip_pulse_at any more; the module's
# pulse code stays for a card that has a narration). Every story page now opens silently into the same beat (the "tap the
# mic" cue 4 s in) and the header mascot takes no tap there (nothing to repeat). Both clips stay registered in assets (unused).
for s in story:
    if (s.get("audio") or {}).get("prompt") in ("vo_read_instr", "vo_help"):
        del s["audio"]["prompt"]
        if not s["audio"]: del s["audio"]
for s in story:
    clip = (s.get("audio") or {}).get("prompt")
    if clip in CHIP_PULSE_AT: s["data"]["chip_pulse_at"] = CHIP_PULSE_AT[clip]
t8 = story[-1]; t9 = copy.deepcopy(t8)
t8["data"]["words"] = [{"text": w} for w in ["खेलते-खेलते", "उसे", "नींद", "आने", "लगी।"]]   # [L02-VO-BATCH] the deck's / recording's words
t8["data"]["whole_audio"] = "vo_story_8a"
t8["data"]["alt_hi"] = "माधव खेलते-खेलते जम्हाई ले रहा है।"
t9["id"] = "T9"
t9["data"]["image_id"] = "story_9"
t9["data"]["words"] = [{"text": w} for w in ["वह", "थककर", "सो", "गया।"]]   # [L02-VO-BATCH]
t9["data"]["whole_audio"] = "vo_story_8b"
t9["data"]["alt_hi"] = "माधव खिलौनों के बीच सो गया, माँ हैरान खड़ी है।"
card["slides"].insert(card["slides"].index(t8) + 1, t9)
aud["vo_story_8a"] = "assets/Audio/vo_story_8a.ogg"; txt["vo_story_8a"] = "खेलते-खेलते उसे नींद आने लगी।"   # [L02-VO-BATCH] the recordings' words (the clips are made below)
aud["vo_story_8b"] = "assets/Audio/vo_story_8b.ogg"; txt["vo_story_8b"] = "वह थककर सो गया।"
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
# [L02-POP-5S] (OFF since [L02-POP-2S] 2026-10-07, below — kept for the record) pages whose picture pop is longer than the fleet's 2 s:
# pages 2, 4, 5 and 10 hold 3 s longer (5 s; CSS
# .p2-pop-5s, card data.pop_ms = 5000) — their sound is the pop's 5 s of their track and stops with the pop; the length is
# the pop's, so no data.pop_sfx_s is written. Cut start: "onset" for pages 4 and 5 (their track opens with ~2.5 s of silence,
# which would have left the pop itself mute); None = the automatic rule above (the track's start when its first 5 s are
# audible, else its loudest 5 s) for pages 2 and 10.
# ---- [L02-POP-2S] (2026-10-07, user request) "From page 1 T1 to page 9 T9 the duration of the image animation and the sound effect in
# sync with it should be equal to that of page 2 T2, and then the next button should be enabled." T2's pop is the fleet's 2 s one with a
# 2 s sound — so the 5 s pops of pages 1, 3, 4 and 9 (the user's old pages 2, 4, 5 and 10) go: POP_LEN is empty (no page writes
# data.pop_ms; the module's 5 s path and the CSS stay for a card that sets it) and their sounds are cut to the pop's 2 s like the others'
# (pages 3 and 4 keep their "onset" start — their track opens in ~2.5 s of silence); आगे बढ़ें lights 2 s after the sentence on every page,
# as on T2. T8's sound stays its whole 1.66 s track (shorter than 2 s), as before.
POP_LEN = {}                                                   # was {1: 5.0, 3: 5.0, 4: 5.0, 9: 5.0} ([L02-POP-5S])
SFX_CUT = {3: ("onset", POP_S), 4: ("onset", POP_S)}           # was 1 / 9 at (None, 5.0) and 3 / 4 at ("onset", 5.0)
def sfx_onset(src):
    out = ff("-i", src, "-af", "aresample=24000,asetnsamples=n=1200,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level:file=-", "-f", "null", "-")
    vals = [(-120.0 if x == "-inf" else float(x)) for x in re.findall(r"RMS_level=(-?[\d.]+|-inf)", out)]
    for i, v in enumerate(vals):
        if v >= -40.0: return round(i * 0.05, 2)
    return 0.0
def ff(*args):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-y", *args], capture_output=True, text=True, encoding="utf-8", errors="replace")
    return r.stdout + r.stderr

# ---- [L02-VO-BATCH] (2026-10-06, user request) "I have added the folder (voiceovers_batch (25)) which contains all the new VOs — implement
# all these VOs to their respective places, replace the older VOs with these VOs and they must be in sync." The folder (kept where the user
# put it, HI02H04_L02_S01_dist/assets/voiceovers_batch (25)/voiceovers/, like the car and SFX folders) holds one WAV per manifest line
# (61; 24 kHz mono 16-bit, 0.2-0.3 s of silence before the voice, -21..-15 LUFS), named by Audio ID — the VO_Manifest.xlsx of the same
# day ([L02-VO-MANIFEST]). Each is made into assets/Audio/<id>.ogg exactly as the placeholder lines were (tts_clip): cut to 0.10 s before
# the voice and 0.33 s after it (silencedetect -45 dB / 0.15 s), two-pass linear loudnorm to -16.5 LUFS / -1.1 dBTP (the lesson's
# recordings sat at -16.4..-17.2, its placeholders at -15.9: one level for every line now), 20 ms fade-in / 100 ms fade-out, Opus 64 k
# mono 48 k; remade only when the WAV is newer. Every line is registered with the deck's words (VO_LINES): the placeholder tts_clip calls
# below return at once for these ids (the recording rules), the Vorbis cue clip is no longer made, the gate / fleet lines of the registry
# above are overridden. In sync: the story pages' words are the recordings' words (T3 / T4 here, T8 / T9 at their split), and every
# word-timing table (story word_times, the sentence pages' word_times_by_audio) is re-measured from the new clips by word_times_for (the
# md5 in word_times.json goes stale → envelope measurement). The pages are wired further down ([L02-VO-BATCH] wiring): I1 / I2 option
# ids, the seven page reveal lines, RC1's opener, I3's one-word praise. Not spoken any more, still registered (as every removed clip is):
# vo_q_reveal, vo_opt_khana / book / toys / bed / chair, vo_tap_speaker_sentence.
VO_BATCH_DIR = os.path.join(CUR, "assets", "voiceovers_batch (25)", "voiceovers")
VO_TARGET_I = -16.5
VO_LINES = [   # (audio id, the line) — the 2026-10-04 deck's words, in the lesson's play order; one recording each in the batch
    # the title page (deck slide 3)
    ("vo_landing", "नमस्ते दोस्त! मैं हूँ स्विफ़्टी, आज हम एक कहानी पढ़ेंगे - सोना नहीं, खेलना है।"),
    # the first transition screen (deck slide 4)
    ("vo_pt_tutorial", "ध्यान से देखिए और मेरे साथ जानिए। चलिए, शुरू करें!"),
    # the story pages T1-T9 (deck slides 5-13): the mic cue, then each sentence
    ("vo_tap_speaker_sentence_story", "इस बटन पर टैप करिए और वाक्य पढ़िए।"),
    ("vo_story_1", "दोपहर का खाना हो चुका था।"),
    ("vo_story_2", "माधव की माँ उसे सुलाने लगी।"),
    ("vo_story_3", "पर, माधव को तो नींद ही नहीं आ रही थी।"),
    ("vo_story_4", "माँ के सोते ही वह उठ गया।"),
    ("vo_story_5", "उसने दीवार पर चित्र बनाए।"),
    ("vo_story_6", "उसने किताब पढ़ी।"),
    ("vo_story_7", "वह खिलौनों से खेलने लगा।"),
    ("vo_story_8a", "खेलते-खेलते उसे नींद आने लगी।"),
    ("vo_story_8b", "वह थककर सो गया।"),
    # the guided transition (the fleet's line; the deck has no line for it)
    ("vo_pt_guided", "बहुत बढ़िया! अब हम साथ मिलकर शुरू करते हैं। चलिए, साथ में करें!"),
    # G2 — find Madhav in the picture (deck slide 14): prompt, the three hints, the correct line (the lesson's; the deck has none)
    ("vo_tap_madhav", "इस चित्र में माधव कहाँ है? माधव को पहचानिए और उसपर टैप कीजिए।"),
    ("vo_tap_try_madhav", "ध्यान से देखिए और माधव को पहचानिए।"),
    ("vo_hint2_madhav", "माधव एक लड़का है, चित्र में लड़के को पहचानिए।"),
    ("vo_hint3_madhav", "यह माधव है, इसपर टैप कीजिए।"),
    ("vo_tap_ok", "शाबाश! सही जगह।"),
    # G3 — माधव किससे खेल रहा है? (deck slide 15): prompt, hint 1, the options, the reveal (hint 3), the correct line (the lesson's)
    ("vo_q_khel", "चित्र में माधव किससे खेल रहा है?"),
    ("vo_q_hint", "चित्र को ध्यान से देखिए।"),
    ("vo_opt_khilono_se", "खिलौनों से"),
    ("vo_opt_bartano_se", "बर्तनों से"),
    ("vo_opt_kitabo_se", "किताबों से"),
    ("vo_reveal_khel", "चित्र में माधव खिलौनों से खेल रहा है। यह सही उत्तर है, इसपर टैप कीजिए।"),
    ("vo_ok_khel", "शाबाश! माधव खिलौनों से खेल रहा है।"),
    # I1 — कहानी में माधव ने सबसे पहले क्या किया? (deck slide 16): prompt, hint 1, the sentence options, the reveal, the correct line
    ("vo_q_khana", "कहानी में माधव ने सबसे पहले क्या किया?"),
    ("vo_q_try", "फिर से कोशिश कीजिए, कहानी याद करिए।"),
    ("vo_p1_khana", "माधव ने खाना खाया।"),
    ("vo_opt_kitab_padhi", "माधव ने किताब पढ़ी।"),
    ("vo_opt_khilono_se_khela", "माधव ने खिलौनों से खेला।"),
    ("vo_reveal_khana", "माधव ने सबसे पहले खाना खाया। यह सही उत्तर है, इसपर टैप कीजिए।"),
    ("vo_q_correct", "शाबाश! यही सही जवाब है।"),
    # I2 — आख़िर में माधव कहाँ सोया? (deck slide 17): prompt, the place options, the reveal (hint 1 is a wiggle, no line)
    ("vo_q_kahan", "आख़िर में माधव कहाँ सोया?"),
    ("vo_opt_khilono_ke_beech", "खिलौनों के बीच"),
    ("vo_opt_palang_par", "पलंग पर"),
    ("vo_opt_kursi_par", "कुर्सी पर"),
    ("vo_reveal_khilone_beech", "माधव खिलौनों के बीच सो गया था। यह सही उत्तर है, इसपर टैप कीजिए।"),
    # the practice transition (the fleet's line), then the RC-car screen's opener (deck slide 18)
    ("vo_pt_practice", "वाह! अब आपकी बारी।"),
    ("vo_rc_intro", "अब आप बताइए कि माधव की कहानी में क्या-क्या हुआ?"),
    # I3 — चित्र में माँ क्या कर रही हैं? (deck slide 19): prompt, options, the reveal, the correct line the deck gives ("शाबाश।")
    ("vo_q_maa_kya", "चित्र में माँ क्या कर रही हैं?"),
    ("vo_opt_khana_bana", "खाना बना रही हैं।"),
    ("vo_opt_sula_rahi", "माधव को सुला रही हैं।"),
    ("vo_opt_padha_rahi", "माधव को पढ़ा रही हैं।"),
    ("vo_reveal_sula", "माँ माधव को सुला रही हैं। यह सही उत्तर है, इसपर टैप कीजिए।"),
    ("vo_ok_sula", "शाबाश।"),
    # P1 — माँ के सोते ही माधव ने क्या किया? (deck slide 20): prompt, options (माधव ने खाना खाया। is listed under I1), the reveal
    ("vo_q_maa_sote", "माँ के सोते ही माधव ने क्या किया?"),
    ("vo_p1_utha", "माधव उठ गया।"),
    ("vo_p1_rona", "माधव रोने लगा।"),
    ("vo_reveal_utha", "माँ के सोते ही माधव उठ गया। यह सही उत्तर है, इसपर टैप कीजिए।"),
    # M1 — माधव ने क्या पढ़ा? (deck slide 21): prompt, options (माधव ने किताब पढ़ी। is listed under I1), the reveal, the correct line
    ("vo_q_kitab", "माधव ने क्या पढ़ा?"),
    ("vo_opt_akhbar_padha", "माधव ने अखबार पढ़ा।"),
    ("vo_opt_patra_padha", "माधव ने पत्र पढ़ा।"),
    ("vo_reveal_kitab", "माधव ने किताब पढ़ी। यह सही उत्तर है, इसपर टैप कीजिए।"),
    ("vo_ok_kitab_padhi", "शाबाश! माधव ने किताब पढ़ी।"),
    # M2 — कहानी के अंत में माधव क्यों सो गया? (deck slide 22): prompt, options, the reveal, the correct line
    ("vo_q_kyon_soya", "कहानी के अंत में माधव क्यों सो गया?"),
    ("vo_opt_thak_gaya", "वह थक गया था।"),
    ("vo_opt_bhookha_tha", "वह भूखा था।"),
    ("vo_opt_dar_gaya", "वह डर गया था।"),
    ("vo_reveal_thak", "माधव थक गया था। यह सही उत्तर है, इसपर टैप कीजिए।"),
    ("vo_ok_thak_gaya", "शाबाश! वह थक गया था।"),
    # the celebration (deck slide 23)
    ("vo_celebrate", "शाबाश! आपने पूरी कहानी ध्यान से पढ़ी और सभी प्रश्नों के उत्तर दे दिए।"),
]
VO_BATCH_IDS = {k for k, _ in VO_LINES}
assert len(VO_BATCH_IDS) == len(VO_LINES) == 61, len(VO_LINES)
# [L02-CUE-VO-2] (2026-10-07, user request) "Replace this VO on the mic button (pages T1-T9)": the user's new recording
# (Downloads/audio_1.wav, 3.28 s, 24 kHz mono — kept as _reskin_build/vo_tap_speaker_sentence_story_2026-10-07.wav) takes the place of
# the batch's vo_tap_speaker_sentence_story.wav as the SOURCE of that clip; the batch folder is left as delivered. Same trim / level /
# encode as every other line. The manifest words stay "इस बटन पर टैप करिए और वाक्य पढ़िए।" (the new take was not checked by ear).
# [L02-GATE-VO-2] (2026-10-08, user request) "After page 9 T9, in the transition screen where the pink Hindi text comes, replace the VO
# of that screen with this VO" (Downloads/"audio_2 .wav", 5.6 s, 24 kHz mono — kept as _reskin_build/vo_pt_guided_2026-10-08.wav): the
# guided gate's line vo_pt_guided takes it as its source the same way. The headline ("चलिए, साथ में करें!"), the bird, the 1250 ms talk
# point and the close 300 ms after the line are as they were ([L02-STD-GATE]); the screen is as long as the new line needs. The manifest
# words stay "बहुत बढ़िया! अब हम साथ मिलकर शुरू करते हैं। चलिए, साथ में करें!" (the new take was not checked by ear).
VO_OVERRIDE = {"vo_tap_speaker_sentence_story": os.path.join(SCR, "vo_tap_speaker_sentence_story_2026-10-07.wav"),
               "vo_pt_guided": os.path.join(SCR, "vo_pt_guided_2026-10-08.wav")}
def vo_clip(name, text):
    """A recorded line of the batch: <VO_BATCH_DIR>/<name>.wav -> assets/Audio/<name>.ogg, trimmed / levelled / encoded like tts_clip."""
    src = VO_OVERRIDE.get(name) or os.path.join(VO_BATCH_DIR, name + ".wav"); dst = os.path.join(CUR, "assets", "Audio", name + ".ogg")   # [L02-CUE-VO-2] a later take may stand in for a batch WAV
    assert os.path.exists(src), "[L02-VO-BATCH] missing recording " + src
    aud[name] = "assets/Audio/" + name + ".ogg"; txt[name] = text
    if os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(src): return   # remade only for a newer WAV (not, like bed_fresh — defined further down — for a newer build.py: 61 encodes take ~2 min; delete the .ogg to force one)
    out = ff("-i", src, "-af", "silencedetect=n=-45dB:d=0.15", "-f", "null", "-")
    h, mnt, sec = re.search(r"Duration: (\d+):(\d+):([\d.]+)", out).groups(); dur = int(h) * 3600 + int(mnt) * 60 + float(sec)
    sil = re.findall(r"silence_start: ([\d.]+)(?:.*?silence_end: ([\d.]+))?", out, re.S)
    starts = [float(x) for x, y in sil]; ends = [float(y) if y else dur for x, y in sil]
    speech0 = ends[0] if starts and starts[0] < 0.05 else 0.0
    speech1 = starts[-1] if starts and ends[-1] >= dur - 0.05 and starts[-1] > speech0 else dur
    t0 = max(0.0, speech0 - 0.10); t1 = min(dur, speech1 + 0.33)
    cut = ["-ss", "%.3f" % t0, "-t", "%.3f" % (t1 - t0), "-i", src]
    m = json.loads((lambda o: o[o.rindex("{"):o.rindex("}") + 1])(ff(*cut, "-af", "loudnorm=I=%s:TP=-1.1:LRA=11:print_format=json" % VO_TARGET_I, "-f", "null", "-")))
    ff(*cut, "-af", "loudnorm=I=%s:TP=-1.1:LRA=11:measured_I=%s:measured_TP=%s:measured_LRA=%s:measured_thresh=%s:offset=%s:linear=true,"
       "aresample=48000,afade=t=in:st=0:d=0.02,afade=t=out:st=%.3f:d=0.1" % (VO_TARGET_I, m["input_i"], m["input_tp"], m["input_lra"], m["input_thresh"], m["target_offset"], t1 - t0 - 0.1),
       "-ac", "1", "-ar", "48000", "-c:a", "libopus", "-b:a", "64k", dst)
    assert os.path.exists(dst), "ffmpeg did not write " + dst
    print("wrote", dst, "speech %.2f-%.2f of %.2f s" % (speech0, speech1, dur))
for _k, _t in VO_LINES: vo_clip(_k, _t)
# the story pages' words are the recordings' words (the deck's sentences; T8 / T9 are set where T8 is split, above)
for _s in story:
    if _s["id"] == "T3": _s["data"]["words"] = [{"text": w} for w in ["पर,", "माधव", "को", "तो", "नींद", "ही", "नहीं", "आ", "रही", "थी।"]]
    if _s["id"] == "T4": _s["data"]["words"] = [{"text": w} for w in ["माँ", "के", "सोते", "ही", "वह", "उठ", "गया।"]]
assert [w["text"] for w in next(s for s in story if s["id"] == "T3")["data"]["words"]] == "पर, माधव को तो नींद ही नहीं आ रही थी।".split()
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
# ---- [L02-READ-ALOUD] word times (2026-10-03): after the read-aloud beat the sentence speaks with the word being said lit in time
# with the recording — the reference's rule (its WORD_TIMES tables: each word's start in the recording, then the end of the last word;
# word k is lit while times[k] <= currentTime < times[k+1]; story_read_page.js). The reference measured its tables by hand on the
# recordings' energy envelopes. Here the times come from _reskin_build/word_times.json; a clip or sentence with no up-to-date entry there
# is measured on the spot by the envelope-only method below (the words' syllable shares of the speech span, each gap pulled to the
# nearest clear energy dip) — checked against the reference's own hand tables on its seven timed recordings: 0.13 s mean error on the
# word starts, worst 0.5 s where a slowly spoken first word has a word-internal closure (बच्चे) or two vowel-final/-initial words meet
# without any dip. On 2026-10-03 every entry is from this method. _reskin_build/measure_word_times.py (speech-recognition alignment,
# faster-whisper) is meant to refine them but could not be run yet (the model download stalled on this network) — once it has been
# validated with --validate, run it and rebuild. An entry carries the clip's md5 and its words; a hand-corrected entry survives as
# long as those are unchanged (set "measured": "hand" to say so).
import hashlib, struct
WT_PATH = os.path.join(SCR, "word_times.json")
def _syllables(word):
    """Devanagari syllable count: base letters (consonants, independent vowels) not killed by a following virama."""
    n = 0
    for i, c in enumerate(word):
        o = ord(c); base = (0x0904 <= o <= 0x0914) or (0x0915 <= o <= 0x0939) or (0x0958 <= o <= 0x095F)
        if base and not (i + 1 < len(word) and ord(word[i + 1]) == 0x094D): n += 1
    return max(1, n)
def _envelope_db(path, sr=16000, hop=0.005, win=0.020):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"], capture_output=True)
    x = struct.unpack("<%df" % (len(r.stdout) // 4), r.stdout); h, w = int(sr * hop), int(sr * win)
    e = [10 * math.log10(sum(v * v for v in x[i:i + w]) / w + 1e-12) for i in range(0, max(1, len(x) - w), h)]
    return [sum(e[max(0, i - 2):min(len(e), i + 3)]) / (min(len(e), i + 3) - max(0, i - 2)) for i in range(len(e))], hop
def measure_word_times_envelope(path, words):
    """Word starts + the end of the last word (s) from the energy envelope alone: the speech span (first / last 20 ms window within
    38 dB of the peak and 12 dB over the floor), then one boundary per gap — the expected place is word k's syllable share of what is
    left of the span, the deepest dip within ±45% of the shorter neighbour's share wins when it is ≥ 3 dB deep (the boundary sits where
    the energy comes back, 6 dB over the dip), else the expected place; each word keeps at least 80 ms."""
    env, hop = _envelope_db(path); n = len(env); T = lambda i: round(i * hop, 2)
    peak = max(env); floor = sorted(env)[max(0, int(0.05 * n))]; thr = max(floor + 12, peak - 38)
    on = next(i for i in range(n) if env[i] > thr); off = next(i for i in range(n - 1, -1, -1) if env[i] > thr)
    w = [_syllables(x) + 0.5 for x in words]; bounds = [on]; last = on
    for k in range(len(words) - 1):
        rest = sum(w[k:]); p = last + (off - last) * w[k] / rest; half = 0.45 * (off - last) * min(w[k], w[k + 1]) / rest
        minw = int(max(0.08, 0.05 * _syllables(words[k])) / hop)
        lo, hi = max(last + minw, int(p - half)), min(off - int(0.08 / hop), int(p + half))
        ch = max(last + minw, int(p))
        if hi > lo:
            best = min(range(lo, hi + 1), key=lambda i: env[i] + 4.0 * abs(i - p) / max(1, half))
            before = max(env[max(0, best - int(0.12 / hop)):best] or [env[best]]); after = max(env[best:min(n, best + int(0.12 / hop))] or [env[best]])
            if min(before, after) - env[best] >= 3:
                rise = best
                for i in range(best, min(n, best + int(0.12 / hop))):
                    if env[i] >= env[best] + 6: rise = i; break
                ch = max(rise, last + minw)
        bounds.append(ch); last = ch
    bounds.append(off + int(0.02 / hop))
    return [T(i) for i in bounds]
def word_times_for(clip, words):
    cache = json.load(open(WT_PATH, encoding="utf-8")) if os.path.exists(WT_PATH) else {}
    p = os.path.join(CUR, aud[clip]); md5 = hashlib.md5(open(p, "rb").read()).hexdigest()
    e = cache.get(clip)
    if isinstance(e, dict) and e.get("words") == words and e.get("md5") == md5 and len(e.get("times") or []) == len(words) + 1:
        return e["times"]
    times = measure_word_times_envelope(p, words)
    cache[clip] = {"words": words, "md5": md5, "times": times, "measured": "envelope (build.py fallback; run measure_word_times.py for the aligned times)"}
    cache["_about"] = ("[L02-READ-ALOUD] word start times (s) in each story clip, then the end of the last word (the reference's WORD_TIMES rule). "
                       "Keyed by clip id; md5 + words say which recording / sentence an entry belongs to (a stale entry is re-measured by build.py). "
                       "measure_word_times.py writes the aligned times; 'measured': 'hand' marks a hand-corrected entry.")
    with open(WT_PATH, "w", encoding="utf-8", newline="\n") as f: json.dump(cache, f, ensure_ascii=False, indent=1)
    print("word_times.json:", clip, "measured by the envelope fallback:", times)
    return times
for s in story + [t9]:
    s["data"]["word_times"] = word_times_for(s["data"]["whole_audio"], [w["text"] for w in s["data"]["words"]])
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
# [L02-FIND-HINTS] (user, 2026-10-03) the wrong taps on this page get three escalating lines instead of the same try-again line every
# time: 1st miss "ध्यान से देखिए और माधव को पहचानिए।" (= vo_tap_try_madhav above), 2nd "माधव एक लड़का है, चित्र में लड़के को पहचानिए।", 3rd and
# every later one "यह माधव है, इसपर टैप कीजिए।" with the kit's nudge hand (the tapping hand with its ripple) on Madhav until he is tapped.
# Engine patch 3f (TAP_IN_SCENE reads data.hint_seq); the two new lines are edge-tts hi-IN-SwaraNeural placeholders made by tts_clip
# below (levelled like vo_tap_try_madhav, -15.5 LUFS). Only G2 carries hint_seq: I2/P2 and the board pages keep their one try line.
g2["data"]["hint_seq"] = ["vo_tap_try_madhav", "vo_hint2_madhav", "vo_hint3_madhav"]
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
# NOTE 2026-10-03: G3 has since moved to the reference's page-5 layout ([L02-G3-REF] right below); the Q3 cuts above stay for P1 (q3_khana).
# ---- [L02-G3-REF] (2026-10-03, user request) G3 ("page 11" in the user's count, ?slide=10) is now laid out — and behaves — like page 5
# (G2, ?slide=4) of the DEPLOYED reference lesson https://hi-02-h04-l01-s01-dun.vercel.app/ (byte-identical to Suresh's live
# HI02H04_L01_S01.html of 2026-10-02, 892806 bytes — NOT the frozen bak110 this build reads: the page-5 behaviours live in its
# P2-BIRD-POP-JS / P5-CORRECT-SFX-JS / P6-PROMPT-IDLE-CSS blocks, which this build skips because they also script the reference's
# story and train pages, so they are ported by hand for this one page in _reskin_build/sent_q_page.js + adapt.css [L02-G3-REF],
# card-driven by slide.sent_ref). The reference page = the engine's own sentence_options + bare_recall + hide_header_chip + hide_nav
# STORY_QUESTION (the layout I1 already has, [L02-I1-REF] below): the bare 374.125x315 picture over three 344x78 white pills.
# Content (user): the picture = the user's PNG of the boy on the rug building with blocks (_reskin_build/q3_khel_source.png,
# 1671x941) cut to the reference picture's 1411:1188 shape — the full height, the window at columns KHEL_X0 .. KHEL_X0 + 1118 (the
# teddy, the car, the blocks and the boy; the stacking rings and the toy bin at the right fall outside) -> assets/Images/q3_khel.webp
# 1411x1188 (the CSS yellow inset frame of this lesson's recall pictures stands in for the frame the reference bakes into its PNG);
# band "माधव किससे खेल रहा है?"; options खिलौनों से (the answer) / बर्तनों से / किताबों से. Lines — all edge-tts hi-IN-SwaraNeural
# placeholders via tts_clip (further down, where it is defined), like the lesson's other placeholders: the question vo_q_khel, the
# option words vo_opt_khilono_se / _bartano_se / _kitabo_se, and the praise line vo_ok_khel "शाबाश! माधव खिलौनों से खेल रहा है।" (the
# reference's शाबाश line carries the answer sentence and the correct pill's words light with it). try_again = the lesson's RECORDED
# vo_q_hint ("चित्र को ध्यान से देखिए, फिर सही उत्तर चुनिए।"; the reference's try line also asks to look at the picture) and reveal = the
# recorded vo_q_reveal ("यह रहा सही जवाब।"; the reference's reveal clip is not even shipped — a silent beat there). No audio.hint, as on
# the reference card (the 2nd wrong tap's line is replaced by the read-out anyway). The correct tap's scene sound = sfx_pop_7 (the
# toys sound of story page 8, cut from the user's own track; 2 s, like the reference's scene sounds). G3's Figma card layout
# ([L02-Q3-FIG] above: fig_q3, three picture+sentence cards, vo_q_khana + vo_opt_*) is gone from G3; q3_kitab / q3_khilone are now
# unused (on disk), vo_q_khana / vo_opt_* stay registered.
g3 = next(s for s in card["slides"] if s["id"] == "G3")
assert g3["type"] == "STORY_QUESTION", "G3 is not the guided story question any more"
g3.pop("fig_q3", None)
g3["sent_ref"] = True; g3["hide_header_chip"] = True; g3["hide_nav"] = True; g3["bare_recall"] = True; g3["sentence_options"] = True
g3["prompt_hi"] = "माधव किससे खेल रहा है?"
g3["audio"] = {"prompt": "vo_q_khel", "try_again": "vo_q_hint", "reveal": "vo_q_reveal", "correct": "vo_ok_khel"}
g3["data"]["recall_image_id"] = "q3_khel"; g3["data"]["hide_recall"] = False
g3["data"]["options"] = [
    {"label_hi": "खिलौनों से", "audio": "vo_opt_khilono_se", "correct": True},
    {"label_hi": "बर्तनों से", "audio": "vo_opt_bartano_se"},
    {"label_hi": "किताबों से", "audio": "vo_opt_kitabo_se"},
]
g3["data"]["correct_sfx"] = {"src": "sfx_pop_7", "hold_ms": 2000, "vol": 1.0}
g3["data"]["prompt_idle_ms"] = 5000
KHEL_SRC = os.path.join(SCR, "q3_khel_source.png"); KHEL_DST = os.path.join(CUR, "assets", "Images", "q3_khel.webp"); KHEL_X0 = 201
assert os.path.exists(KHEL_SRC), "missing " + KHEL_SRC
if not os.path.exists(KHEL_DST) or os.path.getmtime(KHEL_DST) < os.path.getmtime(KHEL_SRC):
    from PIL import Image
    im = Image.open(KHEL_SRC).convert("RGB"); W, H = im.size; w = int(round(H * 1411 / 1188)); x0 = max(0, min(KHEL_X0, W - w))
    im.crop((x0, 0, x0 + w, H)).resize((1411, 1188), Image.LANCZOS).save(KHEL_DST, "WEBP", quality=88, method=6)
    print("wrote", KHEL_DST, "columns %d-%d of %d" % (x0, x0 + w, W))
card["assets"]["image"]["q3_khel"] = "assets/Images/q3_khel.webp"
card.setdefault("_emoji_fallback", {})["q3_khel"] = "🧸"
for k in Q3_CUTS: card["assets"]["image"][k] = "assets/Images/" + k + ".webp"
# ---- [L02-I1-FIG] (2026-10-03, user request) I1 (the independent story question, the user's "page 12", ?slide=11) is laid out from
# Figma "FLN by MJ" node 113-198 ("G3 guided story question", 1280x720) — the card layout G3 carried from 2026-09-28 until earlier
# today ([L02-Q3-FIG] above: card slide.fig_q3, stage class .l02-q3, CSS block in adapt.css, applyQ3 in adapt.js — the band, no
# header chip (the mascot tap replays the question), NO आगे pill (the Figma page has none; .l02-q3 #navBtn{display:none}, and the
# card's hide_nav keeps it off through sent_q_page.js's .no-nav as well), three picture+sentence cards 252x314.113 @ x 232/514/796,
# y 247, grey #D9D9D9 box -> white card with the #D5D8DF inside stroke, picture window 243.679x194.84, sentence Baloo 700 24.845px).
# The frame's content comes with it: band "कहानी में माधव ने सबसे पहले क्या किया ?", cards खाना खाया / किताब पढ़ी / खिलौनों से खेला (the
# Figma pictures cut at the Figma crop: q3_khana / q3_kitab / q3_khilone, Q3_CUTS above; the Figma spells खिलोनों, the story's खिलौनों
# is used), the engine's shuffle kept. VOs "accordingly" = the lesson's own RECORDED clips for this question, as G3 used them:
# prompt vo_q_khana ("माधव और माँ ने सबसे पहले क्या किया?" — the recording re-words the band; told the user, a TTS of the exact band
# words was offered, not made), the option words vo_opt_khana / vo_opt_book / vo_opt_toys (खाना / किताब / खिलौने), and I1's own
# try / hint / correct / reveal lines, unchanged. Interactions = the engine's tap-to-answer as on every card question (kit wrong beat
# + try line, hint rung, reveal with the pointing hand after three, confetti + praise + advance on the answer; [L02-I1-CONFETTI]
# below keeps the confetti on this independent page). The reference-G2 look I1 had since 2026-09-28 ([L02-I1-REF]: the bare story_2
# picture over three sentence pills vo_story_2 / _5 / _7, band "चित्र में मम्मी क्या कर रही है ?", prompt vo_q_sulaya) is gone from I1;
# those clips and story_2 stay on disk / registered.
i1 = next(s for s in card["slides"] if s["id"] == "I1")
assert i1["type"] == "STORY_QUESTION" and i1["phase"] == "independent", "I1 is not the independent story question any more"
i1["prompt_hi"] = "कहानी में माधव ने सबसे पहले क्या किया ?"
i1["fig_q3"] = True
i1.pop("sentence_options", None)
i1["hide_header_chip"] = True
i1["hide_nav"] = True           # no आगे on this page, disabled or lit (the Figma page has none)
i1["bare_recall"] = True
i1["mascot_replay"] = True      # the header chip is off: the mascot tap replays the question (adapt.js applyQ3 wires it for fig_q3 pages anyway)
# [L02-I1-CONFETTI] the animation kit fires its confetti on guided / practice / mastery slides only, so an independent-phase
# question gets none; the user wants the same confetti here on the correct tap (2026-09-28). This flag lifts the kit's phase
# gate for THIS slide alone (adapt.js); I2 and I3 stay as they are.
i1["confetti"] = True
i1["audio"]["prompt"] = "vo_q_khana"
i1["data"]["hide_recall"] = True
i1["data"].pop("recall_image_id", None)
# label_w = the Figma text box width (px), only where the sentence wraps in the design (the third card breaks after खिलौनों)
i1["data"]["options"] = [
    {"img": "q3_khana",   "emoji": "🍛", "label_hi": "माधव ने खाना खाया ।",        "audio": "vo_opt_khana", "correct": True},
    {"img": "q3_kitab",   "emoji": "📖", "label_hi": "माधव ने किताब पढ़ी ।",        "audio": "vo_opt_book"},
    {"img": "q3_khilone", "emoji": "🧸", "label_hi": "माधव ने खिलौनों से खेला ।",  "audio": "vo_opt_toys", "label_w": 175},
]
for o in i1["data"]["options"]:
    assert o["audio"] in aud and o["img"] in Q3_CUTS, "I1 option asset missing: " + o["label_hi"]
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
# [L02-NO-WALK2] (user, 2026-10-04): "Remove Page 15 WALK 2 along with the VOs and the sound effects permanently; rest keep everything
# exactly the same." The WALK2 board page (the user's page 15: Madhav ON checkpoint 1 -> before checkpoint 2) is no longer inserted into
# the card, so the lesson runs … I2 · I3 · P1 · P2 · M1 · WALK4 · M2 · WALK5 · CEL (21 slides). Its leg is still computed below (the
# continuity assertions on the legs hold as before) but no slide carries it. WALK2 had no clip of its own: its line (vo_tap_bed), correct
# and try-again lines (vo_tap_ok / vo_tap_try) are the other board pages' (P2 / WALK4 / WALK5; the find page G2 shares the last two) and
# its only sounds were the engine's chime + confetti on arrival — so no asset leaves the dist. P2, WALK4 and WALK5 are untouched: the board
# now first appears on P2 exactly as it did (Madhav before checkpoint 2, checkpoint 1 already showing the small Madhav).
# [L02-NO-BOARD] (user, 2026-10-04, later the same day): P2, WALK4 and WALK5 were then removed as well — see the block after the legs. No
# board page is left; vo_tap_bed and sfx_walk leave the dist with them.
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
    if name in VO_BATCH_IDS: return                       # [L02-VO-BATCH] the recorded line (vo_clip above) replaces the placeholder: nothing to make, nothing to register
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
# the footsteps (freesound "woodwalking", 6.19 s: twelve steps ~0.45 s apart from 0.15 s, tailing off after 5.1 s) were cut 0.10-5.45 s
# by sfx_clip("sfx_walk", "sfx_walk_source_freesound-woodwalking-40470.mp3", 0.10, 5.35), and the board's band line was
# tts_clip("vo_tap_bed", "माधव को नींद आ रही है, उसे उसके पलंग तक पहुंचाइए।").
# [L02-NO-BOARD] (user, 2026-10-04): with the last board pages removed (see the block after the legs), neither clip is made, registered
# or shipped any more — a copy still in the dist is deleted here; the sources stay in _reskin_build/ like every other source.
for _gone in ("vo_tap_bed", "sfx_walk"):
    _p = os.path.join(CUR, "assets", "Audio", _gone + ".ogg")
    if os.path.exists(_p): os.remove(_p); print("removed", _p)
    aud.pop(_gone, None); txt.pop(_gone, None)
# ---- [L02-STD-SFX] (2026-10-05, user request) the user's "Standard SFX" folder (HI02H04_L02_S01_dist/assets/Standard SFX-20261005T114216Z-1-001/
# Standard SFX/, left in the dist as the source folder like assets/SFX; copies in _reskin_build/std_sfx_*_source.*): five fleet-standard
# sounds — confetti (1.09 s), correct_feedback (0.86 s, already Opus), incorrect_feedback (0.72 s), next_button (0.10 s), play_button
# (0.42 s); 48 kHz mono, peaks at 0 dBFS, means -8.5 .. -24 dB. Each is shipped whole (no cut, no fades: the files are clean) at the
# lesson's SFX level — the same levelling as the pops and the car's clips (mean to SFX_MEAN_DB -26, peak no higher than SFX_PEAK_DB; the
# supplied peaks would otherwise sit 17 dB above every other effect of the lesson) — as Opus 64 k assets/Audio/sfx_<name>.ogg, addressed
# by id like the pops (no audio_text). Where they sound: adapt.js [L02-STD-SFX-JS] + engine patch 3h above.
def std_sfx(name, src):
    s = os.path.join(SCR, src); dst = os.path.join(CUR, "assets", "Audio", name + ".ogg")
    assert os.path.exists(s), "missing " + s
    if bed_fresh(dst, s): return
    with tempfile.TemporaryDirectory() as td:
        wav = os.path.join(td, "whole.wav")
        ff("-i", s, "-ac", "1", "-ar", "48000", wav)
        mean, peak = sfx_levels(wav); gain = min(SFX_MEAN_DB - mean, SFX_PEAK_DB - peak)
        ff("-i", wav, "-af", "volume=%.2fdB" % gain, "-c:a", "libopus", "-b:a", "64k", dst)
    assert os.path.exists(dst), "ffmpeg did not write " + dst
    print("wrote", dst, "gain %.1f dB (mean %.1f, peak %.1f)" % (gain, mean, peak))
std_sfx("sfx_confetti", "std_sfx_confetti_source.wav")
std_sfx("sfx_correct_feedback", "std_sfx_correct_feedback_source.ogg")
std_sfx("sfx_incorrect_feedback", "std_sfx_incorrect_feedback_source.wav")
std_sfx("sfx_next_button", "std_sfx_next_button_source.wav")
std_sfx("sfx_play_button", "std_sfx_play_button_source.wav")
# ---- [L02-NO-BIRD-CUE] (2026-10-05, user request; engine patch 3i above) the title page's replay line "फिर से सुनने के लिए मुझ पर टैप करिए।"
# (vo_tap_swiftee_replay, a reference recording that reached the dist with the reference's audio set, not made here) is not played by
# any flow any more: its clip is deleted from the dist and it is no longer registered (its line in the registry above is commented
# out). A copy of the recording stays in _reskin_build/vo_tap_swiftee_replay_removed_source.ogg, like every other removed clip's source.
_p = os.path.join(CUR, "assets", "Audio", "vo_tap_swiftee_replay.ogg")
if os.path.exists(_p): os.remove(_p); print("removed", _p)
aud.pop("vo_tap_swiftee_replay", None); txt.pop("vo_tap_swiftee_replay", None)
# ---- [L02-STD-PLAY-BTN] (2026-10-05, user request) "Replace the Play button on the title page with this play button, on the exact same
# position, placement and size." The user's two SVGs ("Standard play button (1).svg" = the gold disc with the navy play glyph,
# "Standard play button disabled (1).svg" = the grey waiting disc; 116x116 canvases: an 86 px disc — the white rim circle r 43 — inside
# a 14 px shadow margin, the glyph nudged right of centre, a 3 px darker crescent for depth) go to assets/UI/btn-play-std.svg and
# btn-play-std-waiting.svg; the earlier pill art (btn-play.svg / btn-play-waiting.svg) stays beside them unused, as the NAV-NEXT-BTN
# originals do. The button keeps its box, spot, states and behaviour exactly ([LANDING-PLAY-BTN]: 214x92 at bottom 26, centred, the
# waiting art before .ready with no tap, the gold art's pop-in / breathing / hold / onclick after); the new art was first drawn centred
# in that box at the box's height — the 116 canvas at 92 px, as the old 92-high canvas was — so the disc showed 68 px across where the
# pill was 64 high, its centre where the pill's centre was. Same day, "increase the size of the play button by 20%": the canvas is drawn
# at 110.4 px (the disc 81.6) and the box grows with it (height 110.4, bottom 16.8 — a background is clipped to its box), the disc's
# centre unmoved, the width 214 unchanged. CSS: adapt.css [L02-STD-PLAY-BTN].
for _src, _dst in (("std_play_btn_source.svg", "btn-play-std.svg"), ("std_play_btn_waiting_source.svg", "btn-play-std-waiting.svg")):
    _s = os.path.join(SCR, _src); _d = os.path.join(CUR, "assets", "UI", _dst)
    assert os.path.exists(_s), "missing " + _s
    if not bed_fresh(_d, _s): shutil.copyfile(_s, _d); print("wrote", _d)
# ---- [L02-STD-GATE] (2026-10-05, user request; engine patch 3j above) "In the transition screens (black background, pink Hindi text)
# replace the bird animation with this animation; the bird should only start moving its beak when the pink text appears — adjust this bird
# gif in such a way that when the bird starts moving its beak only then the pink text should appear, for all transition screens; the whole
# transition screen should last for only 4 seconds." The user's "Standard Swiftee Transition Animation.gif" is really an animated WebP
# (RIFF/WEBP VP8X+ANIM, 1500x1500, 115 frames, 2.8 MB, loop 0, 16.1 s a loop; kept verbatim as _reskin_build/std_gate_swiftee_source.webp):
# frames 0-19 the bird rises from below its ledge (40 ms steps, frame 19 held 350 ms), 20-35 it waits at half height and blinks (1.4 s),
# 36-53 it rises to its full pose (53 held 490 ms), 54-56 it blinks, 57 eyes open with the beak shut, and from frame 58 (t = 4140 ms) it
# talks — the beak open on 58, 60, 67, 69, 71, 74 ... with blinks between — until frame 114 holds 1.2 s and the loop restarts. Frame 58 is
# the first open beak (measured: the beak box's yellow drops from 31 k to 28 k px and the dark mouth interior appears, 7 k px, on 58;
# shut again on 59, open on 60 ...; the changes of 54-56 are the eyes only). Made here as assets/UI/gate_swiftee.webp: the canvas cropped
# to the bird (x 218-1214, y 561-1485: 10 px over its highest tuft, 44 px of foot under its ledge line) and scaled to 431x400 (the bird
# shows ≤ 200 CSS px tall: ×2 for dense screens; lossy q80 — the bird bobs a little on every talking frame, so each frame is nearly the
# whole bird and the file is 1.5 MB, in line with the landing bird's 1.8 MB new_landing_swiftee_anim.webp; 520 px / q85 was 2.2 MB),
# the intro retimed so the beak opens 1250 ms in — a 4 s screen cannot wait 4.1 s for it:
# rise 1 on every other frame at the native 40 ms cadence (0,2,..,18 → 400 ms, frame 19 held 120), the half-height wait and its blink
# dropped (frames 20-35 hold frame 19's pose), rise 2 on every other frame (36,38,..,52 → 360 ms, 53 held 80), the full-pose blink and the
# eyes-open frame as drawn (54-57: 290 ms) — then every talking frame at its own native duration (58-114, 12 s), loop 0 as supplied.
# CARD.gate = {anim, talk_ms (asserted from the written frame durations), total_ms 4000, tail_ms 300}: the engine hides the headline
# until talk_ms and then shows it with the VO (patch 3j); adapt.js [L02-STD-GATE-JS] preloads the file and restarts it per gate; CSS
# adapt.css [L02-STD-GATE] (the bird drawn as tall as the old peeking bird's full pose). peeking_pal.webp stays in assets/UI unused, like
# the pill play-button art; the gate's <img> ships without a src (below, where index.html is assembled) — adapt.js hands it the animation.
GATE_CROP = (218, 561, 1214, 1485); GATE_H = 400; GATE_TALK_FRAME = 58
GATE_PLAN = [(k, 40) for k in range(0, 19, 2)] + [(19, 120)] + [(k, 40) for k in range(36, 53, 2)] + [(53, 80), (54, 50), (55, 90), (56, 50), (57, 100)]
def webp_durations(path):
    """The ANMF frame durations (ms) of an animated WebP, in order."""
    b = open(path, "rb").read(); i = 12; out = []
    while i + 8 <= len(b):
        typ = b[i:i+4]; ln = struct.unpack("<I", b[i+4:i+8])[0]
        if typ == b"ANMF": out.append(int.from_bytes(b[i+20:i+23], "little"))
        i += 8 + ln + (ln & 1)
    return out
def gate_anim(name, src):
    from PIL import ImageSequence
    s = os.path.join(SCR, src); dst = os.path.join(CUR, "assets", "UI", name)
    assert os.path.exists(s), "missing " + s
    if not bed_fresh(dst, s):
        src_durs = webp_durations(s); assert len(src_durs) == 115 and sum(src_durs) == 16100, "unexpected source animation " + str((len(src_durs), sum(src_durs)))
        frames = [f.convert("RGBA").copy() for f in ImageSequence.Iterator(Image.open(s))]
        plan = GATE_PLAN + [(k, src_durs[k]) for k in range(GATE_TALK_FRAME, len(frames))]
        W = round((GATE_CROP[2] - GATE_CROP[0]) * GATE_H / (GATE_CROP[3] - GATE_CROP[1]))
        out = [frames[k].crop(GATE_CROP).resize((W, GATE_H), Image.LANCZOS) for k, _ in plan]
        out[0].save(dst, "WEBP", save_all=True, append_images=out[1:], duration=[d for _, d in plan], loop=0, quality=80, method=4, minimize_size=True, allow_mixed=True)
        print("wrote", dst, os.path.getsize(dst), "bytes,", len(out), "frames")
    durs = webp_durations(dst); assert len(durs) == len(GATE_PLAN) + 115 - GATE_TALK_FRAME, "gate animation frame count " + str(len(durs))
    return sum(durs[:len(GATE_PLAN)])
GATE_TALK_MS = gate_anim("gate_swiftee.webp", "std_gate_swiftee_source.webp")
assert GATE_TALK_MS == 1250, GATE_TALK_MS
card["gate"] = {"anim": "assets/UI/gate_swiftee.webp", "talk_ms": GATE_TALK_MS, "total_ms": 4000, "tail_ms": 300}
# ---- [L02-READ-ALOUD] (2026-10-03, user request: the reference's mic-button animation, duration animation, highlight and VO sync on
# every page with the mic button — i.e. the story pages 2-10, the only pages of this lesson whose chip is shown). The story pages'
# cue line becomes the reference lesson's re-recorded "tap the mic and read the sentence" (its vo_tap_speaker_sentence_story.ogg,
# made from the user's vo_1.wav; the same 3.4 s recording handed over again as "vo_1 (1).wav", kept as
# _reskin_build/vo_tap_speaker_sentence_story_source_vo_1.wav) encoded exactly as the reference encoded it: ffmpeg libvorbis -q:a 5
# = Vorbis 24 kHz mono, nominal 50 kb/s, the same 28565-byte file (the fleet's generic lines are Vorbis; the lesson's own
# recordings Opus). No level change (the recording is -17.7 LUFS; the fleet's old cue line -18.4). The words of the recording were
# not supplied in writing at first (the reference lists this clip by path only); the user gave them later the same day — see the
# audio_text line below. story_read_page.js prefers this id for the cue; the FIRST chip tap then starts the read-aloud beat (a second per word, [L02-READ-WORD-1S] 2026-10-07; 12 s before)
# (the mic glyph dissolves into the chip art's sound wave, the words pace evenly, nothing speaks), after which the chip is greyed
# out for good and the sentence speaks with its words lit in time with the recording (data.word_times below). CSS: adapt.css
# [L02-READ-ALOUD]; the chip art gets the .mic classes and the .mic-wave bars in _mic_glyph. The old cue vo_tap_speaker_sentence
# stays registered, unused.
def vorbis_clip(name, src, q=5):
    """A fleet-style generic line from a recording the user gave: _reskin_build/<src> -> assets/Audio/<name>.ogg as the reference
    makes them (libvorbis -q:a q, no trim, no level change). Remade only when the source is newer."""
    s = os.path.join(SCR, src); dst = os.path.join(CUR, "assets", "Audio", name + ".ogg")
    assert os.path.exists(s), "missing " + s
    aud[name] = "assets/Audio/" + name + ".ogg"
    if os.path.exists(dst) and os.path.getmtime(dst) >= os.path.getmtime(s): return
    ff("-i", s, "-c:a", "libvorbis", "-q:a", str(q), dst)
    assert os.path.exists(dst), "ffmpeg did not write " + dst
    print("wrote", dst, os.path.getsize(dst), "bytes")
# vorbis_clip("vo_tap_speaker_sentence_story", "vo_tap_speaker_sentence_story_source_vo_1.wav")   # [L02-VO-BATCH] the batch's recording of the line is the clip now (vo_clip above)
# the recording's words, as the user gave them on 2026-10-03 ("इस बटन पर टैप करिए और वाक्य पढिए"; the lesson's spelling पढ़िए, as in
# vo_read_instr) — so the clip has its audio_text entry like every other line of the card after all
assert txt["vo_tap_speaker_sentence_story"] == "इस बटन पर टैप करिए और वाक्य पढ़िए।"   # [L02-VO-BATCH] registered with the batch
# ---- [L02-T1-CUE-2S] (2026-10-03, user request) page 2 (T1) speaks that cue shortly after it opens — "once the page opens and after
# N seconds the VO should be played along with the same button animation in sync with the VO": first 2 s, then (later the same day)
# 1 s — instead of the 4 s every story page waits (the reference spacing, kept on pages 3-10). The chip pulse is the cue's own
# (.p2-cue for exactly as long as the line plays, settling at the end of a breath), so it is in sync by construction. Card
# data.cue_delay_ms, read by story_read_page.js (default 4000). "Opens" = the module's mount: the phase gate before page 2 closes
# BEFORE it mounts the slide (phaseBlurTransition), so the second runs from the moment the child sees the page. The idle repeat
# (5 s of silence) is unchanged.
story[0]["data"]["cue_delay_ms"] = 1000
# [L02-FIND-HINTS] the find page's 2nd and 3rd wrong-tap lines (see the G2 block above); made like the other placeholders here
tts_clip("vo_hint2_madhav", "माधव एक लड़का है, चित्र में लड़के को पहचानिए।", target_i=-15.5)
tts_clip("vo_hint3_madhav", "यह माधव है, इसपर टैप कीजिए।", target_i=-15.5)
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
# ---- [L02-CUE-SILENT] (2026-10-07, user request) "From T2 to T9 the mic button should only pulsate without any VO, but the mic button's
# VO comes along with the pulsating animation after 7 seconds of inactivity from the user's end, and repeats." (7 s → 4 s by the
# third request of the day.) Pages 2-9 get
# data.cue_silent_first (the first cue is the chip's pulse ALONE — 1 s after the page opens: data.cue_delay_ms 1000, the user's
# second request of the day, 4 s at first), data.cue_pulse_ms (that pulse lasts as long as the line
# would — the clip's length, so it looks the same with or without the voice) and data.cue_repeat_ms 4000 (the line + pulse once the
# child has done nothing for 4 s after a cue, and again after every further 4 s; a tap anywhere on the page restarts the count). Page 1
# is untouched: its cue speaks at once, 1 s in, and repeats 5 s after its end as before. story_read_page.js reads the three fields.
_cue_pulse_ms = int(round(clip_s("vo_tap_speaker_sentence_story") * 1000))
for _s in card["slides"]:
    if _s["type"] == "STORY_READ_PAGE" and _s["id"] != "T1":
        _s["data"]["cue_silent_first"] = True; _s["data"]["cue_repeat_ms"] = 4000; _s["data"]["cue_pulse_ms"] = _cue_pulse_ms; _s["data"]["cue_delay_ms"] = 1000
assert [s["id"] for s in card["slides"] if s["data"].get("cue_silent_first")] == ["T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9"]
# ---- [L02-G3-REF] G3's lines and the word timings its pills light up with (see the G3 block above; tts_clip and clip_s exist by now)
tts_clip("vo_q_khel", "माधव किससे खेल रहा है?")
tts_clip("vo_opt_khilono_se", "खिलौनों से")
tts_clip("vo_opt_bartano_se", "बर्तनों से")
tts_clip("vo_opt_kitabo_se", "किताबों से")
tts_clip("vo_ok_khel", "शाबाश! माधव खिलौनों से खेल रहा है।")
# word start times (+ the end of the last word) per clip, measured like the story pages' (word_times_for: the envelope method, cached in
# word_times.json): each option's two words; for the praise line only its sentence part — the correct pill's two words follow
# "खिलौनों से" inside "शाबाश! माधव खिलौनों से खेल रहा है।" (the reference's table for its शाबाश line covers the sentence part alone)
G3_WT = {}
for _o in g3["data"]["options"]: G3_WT[_o["audio"]] = word_times_for(_o["audio"], _o["label_hi"].split())
_ok_words = "शाबाश! माधव खिलौनों से खेल रहा है।".split(); _ok_t = word_times_for("vo_ok_khel", _ok_words)
G3_WT["vo_ok_khel"] = _ok_t[2:5]     # खिलौनों starts, से starts, से ends (= खेल starts)
g3["data"]["word_times_by_audio"] = G3_WT
g3["data"]["prompt_pop_ms"] = int(round(clip_s("vo_q_khel") * 1000))   # the picture's pop-and-hold lasts the repeated question (the reference: its line's length)
# [L02-BED-AUTO] when Madhav set off on page 13: the band's line (vo_tap_bed, ~4.2 s) and a 0.4 s beat after the page opened — a fixed
# time from the clip's length (BED_AUTO_MS = clip_s("vo_tap_bed") * 1000 + 400 ≈ 4600), not the engine's isPlaying flag: the engine plays
# the prompt twice at mount (pre-existing), the first, aborted play() clears the flag 1.2 s later while the line still sounds. (The JS
# still holds the walk while a replay is sounding.) [L02-NO-BOARD]: the clip is no longer shipped, so the (unshown) leg 1 below carries no
# auto timing any more.
CP1, CP2, CP3, CP4 = CHECKPOINTS
ON_CP1 = on_token(CP1)                                                # [L02-BED-STEPS] (680, 244): feet at the first checkpoint's centre
BEFORE_CP3, BEFORE_CP4 = before_token(CP3), before_token(CP4)
# NOTE 2026-10-03 [L02-I2-FIG]: the I2 leg below is no longer shown — page 13 is a card question now (block further down).
# NOTE 2026-10-04 [L02-NO-WALK2] + [L02-NO-BOARD]: NO leg is shown any more — the WALK2 page was removed in the morning, P2 / WALK4 / WALK5
# later the same day. The five legs stay computed as the record of the board's geometry (the assertions below still check that they take
# the checkpoints one by one); no slide carries any of them.
BED_LEGS = [   # (slide id, phase, the leg) — all unshown since [L02-NO-BOARD]
    ("I2",    "independent", bed_leg(BOY_AT[13], ON_CP1, 13, [], face=1, sfx="sfx_walk", reach=CP1)),   # page 13 -> ON checkpoint 1, by himself after the line, to the footsteps
    ("WALK2", "independent", bed_leg(ON_CP1, BOY_AT[16], 14, [], face=1, rest=[CP1])),         # from ON checkpoint 1 -> before checkpoint 2 (the page-16 state)
    ("P2",    "practice",    bed_leg(BOY_AT[16], BEFORE_CP3, 16, [CP1], face=-1)),               # -> before checkpoint 3; passes checkpoint 2
    ("WALK4", "mastery",     bed_leg(BEFORE_CP3, BEFORE_CP4, 16, [CP1, CP2])),                   # -> before checkpoint 4; passes checkpoint 3
    ("WALK5", "mastery",     bed_leg(BEFORE_CP4, BOY_BED, 16, [CP1, CP2, CP3])),                 # -> the bed; passes checkpoint 4
]
assert [(leg.get("reach"), [f["token"] for f in leg["flips"]]) for _, _, leg in BED_LEGS] == [(CP1, []), (None, [CP1]), (None, [CP2]), (None, [CP3]), (None, [CP4])], \
    "the legs do not take the checkpoints one by one: %r" % [(leg.get("reach"), leg["flips"]) for _, _, leg in BED_LEGS]
assert BED_LEGS[0][2]["boy_to"] == [680.0, 244.0] and BED_LEGS[1][2]["boy"] == [680.0, 244.0], (BED_LEGS[0][2]["boy_to"], BED_LEGS[1][2]["boy"])
i2 = next(s for s in card["slides"] if s["id"] == "I2"); p2 = next(s for s in card["slides"] if s["id"] == "P2")
assert i2["type"] == "TAP_IN_SCENE" and i2["phase"] == "independent" and p2["type"] == "TAP_IN_SCENE" and p2["phase"] == "practice"
# [L02-NO-BOARD] (user, 2026-10-04, after [L02-NO-WALK2] the same day): "Remove Pages 16 P2, 18 WALK4 and 20 WALK5 along with the VOs and
# the sound effects permanently; rest keep everything exactly the same." So NO board page is built any more: P2 (the lesson's own practice
# tap-in-scene, which had become board leg 3) is removed from the card, and WALK4 / WALK5 (legs 4 and 5 — deep copies of the old I2 that
# were inserted after M1 / M2) are not made. The lesson now runs … I1 · I2 · I3 · P1 · M1 · M2 · CEL (18 slides); the phase gates fall on
# I3 → P1 and P1 → M1. Until today a board page was dressed by board_page(s, leg): bed_fig / room_bg / confetti flags, prompt_hi BED_LINE,
# audio.prompt vo_tap_bed, image bed_room + alt BED_ALT, data.bed = the leg, hotspots = BED_HOT (the bed) + token_hot(k) for every "?"
# ahead. Their line vo_tap_bed and the footsteps sfx_walk are no longer made, registered or shipped (removed above); their correct /
# try-again lines vo_tap_ok / vo_tap_try stay — the find page G2 speaks them. The board's pictures (bed_room, bed_q, bed_done, bed_plant,
# bed_boy and the three guide SVGs) stay on disk and registered like every other retired asset of this lesson, and bed_bg is still the
# blurred-room backdrop (room_bg) of the card questions I3, P1, M1 and M2. The board's JS (adapt.js applyBed, card slide.bed_fig) and CSS
# [L02-BED-FIG] stay, dormant — no slide sets bed_fig.
card["slides"].remove(p2)
for k in ("bed_room", "bed_bg", "bed_q", "bed_done", "bed_plant", "bed_boy"): card["assets"]["image"][k] = "assets/Images/" + k + ".webp"
# ---- [L02-RC-FIG] (2026-10-05, user request) "After the अब आपकी बारी screen and before page 14 I3 this screen should be shown, in which
# the RC toy car is shown moving towards the first checkpoint and reaches it, and then page 14 should come; the boy is shown in a GIF on an
# exact position; I have added a folder for the items." Figma "FLN by MJ" nodes 264-664 (the car at the path's start) and 267-858 (the
# car on the first checkpoint): a 1280x720 artboard — the blurred room behind everything (the Figma layer is the lesson's bed_bg at
# (-23.29,-11) blur 4 95%; the user's folder "Background.png" is BYTE-IDENTICAL to i3_floor_source.png, the flattened render of that very
# layer that page 14 already stands on → page_bg i3_floor: the same ground as the page that follows), the title picture "मनमोजी माधव"
# ("Object", 493x95 @ (393,42); the folder's Object.png), the box 974x480 @ (153,172) with a 4px #386AF6 stroke, r20, shadow 0 6px 6px 45%,
# the room-and-path picture "image 239" 976x550 @ (-1,-35) of the box (the Figma export, 1672x941 — not in the folder), four "?"
# checkpoints 104x102 @ (179,290) (435,200) (620,316) (830,249) (#35A7A0, a 2px #F6E28B ring, an inner 94 ring "Ellipse 5", the "?"
# "image 225" 35x53 @ (34,24) — the Figma export at 1024x1536 — with a 0 4px 4px 25% shadow, inset shadow), the boy's soft shadow "Ellipse
# 2802" (58x12 @ (870.5,232), its blurred SVG), the boy = the folder's GIF (36 frames @ 70 ms, 416x772) 76x142 @ (928.5,102) MIRRORED (the
# Figma flips the layer), and the car = the folder's side-view render "ChatGPT Image Oct 4, 2026, 07_48_41 PM" in a 54.404 box @ (64,230.6)
# (the picture 50x50 turned -5.3°, shadow 0 2px 2px 50%). In 267-858 the car sits in the first checkpoint's ring and its "?" is gone.
# BEHAVIOUR (adapt.js applyRC, CSS [L02-RC-FIG]): a TAP_IN_SCENE slide "RC1" (a copy of the untouched find card, no lines, no hotspots —
# nothing is tapped; the engine's own play(null) is a silent beat) inserted between I2 and I3 in the PRACTICE phase, so the practice gate
# (अब आपकी बारी) now falls on I2 → RC1 and RC1 → I3 advances straight on, exactly as asked. 0.6 s after the page opens the car drives
# along the striped carpet's centre line to the first checkpoint (RC_LEG, from the car's start centre to the checkpoint's centre) with the
# folder's "RC Toy car Sound effect" (sfx_rc: 3.2 s cut from 0.3 s, pop-style levelling, looped while it drives, faded in and out with
# the drive; it ducks the music bed like every sound); on arrival the checkpoint's "?" fades out (the 267-858 state: the car in the ring)
# and hold_ms later completeSlide(true) → page 14. The user's folder stays in the dist as the source folder (like assets/SFX); build.py
# reads copies in _reskin_build/.
# [L02-RC-MOTION] (2026-10-05, user request) "the car should change the angle and the view smoothly as per the path shown in the page
# and should smoothly make turns on the carpet as per the carpet shown; the question marks should show a very little bouncy animation at
# all the checkpoints; once the car lands on the checkpoint the whole RC page should stay for 0.5 more seconds and then the question
# should come." So: (1) the leg is the carpet's TRACED centre line — rc_path_trace.py masks the carpet in image 239, takes a distance
# transform and follows its ridge from the car's start column to the checkpoint's column (the car's rest spot is 3.6 px above the line,
# the Figma's checkpoint centre 13 px above it: the leg eases onto the line over its first 40% and veers into the ring over its last
# half), resampled every 2 px → rc_leg_source.json, read here; the car pulls away and brakes smoothly (ease-in-out over leg.s) and its
# body turns into the heading of the line with a short damping (adapt.js); (2) the VIEW follows the heading too: car.views lists the
# folder's renders by the screen heading each shows — the side view ("…07_48_41 PM", the Figma's) at 0° and the front three-quarter view
# ("…07_48_15 PM", the car coming towards the viewer and to the right, its wheel line ~41° / body axis ~37° on screen → 42°) — and
# adapt.js cross-fades the two renders bracketing the heading (over headings 12.6° → 29.4°, the gentle descent, so the view has settled
# before the bend), each turned by (heading − its deg), so the car looks round the bend as it comes down the carpet (the leg's headings
# run 0° → ~57° → ~31° at the ring: the car parks in the front view, turned a few degrees); (3) each "?" bobs 3 px, 1.4 s, the four a little out of step
# (CSS [L02-RC-MOTION]); (4) hold_ms 1000 → 1500: half a second more on the page after the car lands, then page 14 — and the same day
# "the page should stay for 1 more second and then the question should come" → 1500 → 2500 (2.5 s on the parked car before page 14).
RC_TOKENS = [[179, 290], [435, 200], [620, 316], [830, 249]]
RC_CAR_BOX, RC_CAR_SIZE = (64.0, 230.6), 54.404
RC_START = (RC_CAR_BOX[0] + RC_CAR_SIZE / 2, RC_CAR_BOX[1] + RC_CAR_SIZE / 2)                 # (91.2, 257.8): the car's centre at rest
RC_CP1 = (RC_TOKENS[0][0] + 52.0, RC_TOKENS[0][1] + 51.0)                                      # (231, 341): the first checkpoint's centre
with open(os.path.join(SCR, "rc_leg_source.json"), encoding="utf-8") as _f: _rc_legs = json.load(_f)["legs"]   # rc_path_trace.py: the carpet's centre line, box coords
def rc_leg(name, start, end):
    leg = _rc_legs[name]
    assert leg["start"] == [start[0], start[1]] and leg["end"] == [end[0], end[1]], name + " in rc_leg_source.json was traced for other end points: rerun rc_path_trace.py"
    pts = leg["pts"]
    assert pts[0] == [round(start[0], 2), round(start[1], 2)] and pts[-1] == [round(end[0], 2), round(end[1], 2)] and len(pts) > 40, (name, pts[0], pts[-1], len(pts))
    return pts
RC_LEG = rc_leg("leg1", RC_START, RC_CP1)
RC_VIEWS = [{"src": "rc_car", "deg": 0}, {"src": "rc_car_fr", "deg": 42}]                       # [L02-RC-MOTION] the renders by the screen heading they show
bed_webp("rc_scene.webp", "rc_scene_image239_source.png")                                      # 1672x941, the Figma export of image 239
bed_webp("rc_q.webp", "rc_q_image225_figma_source.png", size=(140, 210), quality=90, mode="RGBA")   # the "?" (shown 35x53: 4x)
bed_webp("rc_car.webp", "rc_car_source.png", size=(200, 200), quality=90, mode="RGBA")         # the car, side view (shown 50x50: 4x)
bed_webp("rc_car_fr.webp", "rc_car_fr_source.png", size=(200, 200), quality=90, mode="RGBA")   # [L02-RC-MOTION] the car, front three-quarter view (the folder's "…07_48_15 PM")
bed_webp("rc_car_bk.webp", "rc_car_bk_source.png", size=(200, 200), quality=90, mode="RGBA")   # [L02-RC2] the car, rear three-quarter view (the folder's "…07_48_23 PM")
bed_webp("rc_title.webp", "rc_title_source.png", lossless=True, mode="RGBA")                  # "मनमोजी माधव" 493x95 as supplied
def rc_boy():
    """The user's GIF (36 frames, 70 ms, transparent) as an animated WebP at 152x284 — twice the 76x142 slot."""
    s = os.path.join(SCR, "rc_boy_source.gif"); d = os.path.join(BED_IMG, "rc_boy.webp")
    if bed_fresh(d, s): return
    g = Image.open(s); frames = []; durs = []
    for i in range(g.n_frames):
        g.seek(i); frames.append(g.convert("RGBA").resize((152, 284), Image.LANCZOS)); durs.append(int(g.info.get("duration", 70)))
    frames[0].save(d, "WEBP", save_all=True, append_images=frames[1:], duration=durs, loop=0, quality=80, method=4)
    print("wrote", d, len(frames), "frames")
rc_boy()
_sh_s = os.path.join(SCR, "rc_boy_shadow_ellipse2802_source.svg"); _sh_d = os.path.join(BED_IMG, "rc_shadow.svg")
assert os.path.exists(_sh_s), "missing " + _sh_s
if not bed_fresh(_sh_d, _sh_s): shutil.copyfile(_sh_s, _sh_d); print("wrote", _sh_d)
sfx_clip("sfx_rc", "sfx_rc_source.mp3", 0.30, 3.20)                                            # the motor, looped by the JS while the car drives
def rc_done(name, src, win):
    """[L02-RC2] A won question's picture as it fills a checkpoint's circle (Figma 267-1053 "image 242": the 213x118 picture at (-64,-8) of
    the token's 100x98 inner box, i.e. the window x 64..164 / y 8..106 of it) — that window cut from the full-size source, 400x392 (4x)."""
    s = os.path.join(SCR, src); d = os.path.join(BED_IMG, name)
    assert os.path.exists(s), "missing " + s
    if bed_fresh(d, s): return
    im = Image.open(s).convert("RGB"); W, H = im.size
    x0, x1 = W * win[0] / win[4], W * win[2] / win[4]; y0, y1 = H * win[1] / win[5], H * win[3] / win[5]
    im.crop((int(round(x0)), int(round(y0)), int(round(x1)), int(round(y1)))).resize((400, 392), Image.LANCZOS).save(d, "WEBP", quality=88, method=6)
    print("wrote", d, "window", (round(x0), round(y0), round(x1), round(y1)), "of", (W, H))
rc_done("rc_done_1.webp", "i3_sula_source.png", (64, 8, 164, 106, 213, 118))               # the Figma's "ChatGPT Image Sep 26, 2026, 04_20_36 PM" export is BYTE-IDENTICAL to i3_sula_source.png (md5 f91cd074…)
for k in ("rc_scene", "rc_q", "rc_car", "rc_car_fr", "rc_car_bk", "rc_boy", "rc_title", "rc_done_1"): card["assets"]["image"][k] = "assets/Images/" + k + ".webp"
rc = copy.deepcopy(i2)                                                                          # the untouched TAP_IN_SCENE card (I2 becomes a card question further down)
assert rc["type"] == "TAP_IN_SCENE" and "bed" not in rc["data"], "RC1 must start from the plain find card"
for _k in ("bed_fig", "room_bg", "find_fig", "fig_q3", "confetti", "mascot_replay"): rc.pop(_k, None)
rc["id"] = "RC1"; rc["phase"] = "practice"; rc["eis"] = "iconic"
rc["rc_fig"] = True; rc["page_bg"] = "i3_floor"; rc["hide_header_chip"] = True; rc["hide_nav"] = True
rc["prompt_hi"] = ""; rc["audio"] = {}; rc["signals"] = {"on_complete": []}
rc["data"] = {"image_id": "rc_scene", "alt_hi": "माधव का कमरा: एक घुमावदार रास्ता, उस पर चार प्रश्नचिह्न; माधव रिमोट से अपनी खिलौना कार पहले प्रश्नचिह्न तक चलाता है।",
              "hotspots": [], "signal_name": "scene_tap_first_try",
              "rc": {"tokens": RC_TOKENS, "reach": 0, "boy": [852.5, 102, 76, 142], "shadow": [870.5, 232, 58, 12],   # the boy's layer is FLIPPED in the Figma, so its reported x (928.5) is its right edge: the box starts at 928.5 - 76
                     "car": {"box": list(RC_CAR_BOX), "size": RC_CAR_SIZE, "rot": -5.3, "views": RC_VIEWS}, "leg": {"pts": RC_LEG, "s": 2.6},
                     "start_ms": 600, "hold_ms": 2500, "sfx": "sfx_rc"}}   # [L02-RC-MOTION] views + hold 2.5 s
card["slides"].insert(card["slides"].index(i2) + 1, rc)
assert [s["id"] for s in card["slides"]][card["slides"].index(i2):card["slides"].index(i2) + 3] == ["I2", "RC1", "I3"], "RC1 must sit between I2 and I3"
# ---- [L02-RC2] (2026-10-05, user request) "After page 15 I3 the RC toy scene should come again: the picture of Madhav and his mother
# gets placed in the first checkpoint with a little glowing animation, then the RC car moves towards the next checkpoint smoothly with
# its other angle view as shown, and once it reaches it, after 1.5 seconds the next question arrives." Figma 267-1053 (the scene as it
# opens: checkpoint 1 = "image 242" now holds the picture "ChatGPT Image Sep 26, 2026, 04_20_36 PM" — the very I3 picture, byte-identical
# to i3_sula_source.png — 213x118 at (-64,-8) of the token's inner box, no inner ring, the inset shadow kept; the car = the folder's REAR
# three-quarter render "…07_48_23 PM" 50x50 at (319,334) of the box, unrotated, on the carpet's trough past checkpoint 1) and 278-1471
# (the car in checkpoint 2's ring, its "?" gone). Slide RC2: a copy of RC1 inserted after I3 (practice, like I3 and P1: no gate either
# side), data.rc.placed = [checkpoint 0 ← rc_done_1, animated: 0.5 s after the page opens the picture pops into the circle under a glow
# (CSS .placing)], the car opens where the Figma puts it (box = the 50 picture's spot minus the 2.202 inset; its opening heading -14 =
# the rear render's own angle, so that render stands unrotated as drawn), its views = the rear
# render (deg -14: its roof / side lines on screen; the sole view below a -3° heading) and the side render (from +3°) — leg2 climbs the
# hump (headings -16° → -61° → -5° at the ring: the rear view all the way, turned with the carpet, parked nearly in its natural pose as
# in 278-1471), traced by rc_path_trace.py like leg1 (188 px, 2.8 s); start_ms 1800 (after the glow), reach 1, hold_ms 1500 → P1.
# [L02-RC2-SFX] (2026-10-05, user request) "the images in the checkpoints should get placed in sync with this sound effect" — the user's
# "universfield-level-up-03-199576.mp3" (2.14 s: a bright rising chime that attacks at 0.05 s, peaks at 0.10 s and has died away by
# 1.25 s, silence after). sfx_place = the clip cut from 0.04 s for 1.30 s (the attack 10 ms in, right under the 20 ms fade-in), pop-style
# levelling; data.rc.place_sfx — adapt.js starts it in the very same tick that adds .placing, so the chime's attack lands on the
# picture's pop and its ring-out runs under the glow (which peaks at 0.42 s and is gone at 1.2 s, as the sound is). Any later leg that
# places a picture gets the same chime.
sfx_clip("sfx_place", "sfx_place_source.mp3", 0.04, 1.30)
RC2_CAR_IMG = (319.0, 334.0)                                                                   # the 50x50 render in the Figma; the 54.404 box sits 2.202 around it
RC2_CAR_BOX = (RC2_CAR_IMG[0] - 2.202, RC2_CAR_IMG[1] - 2.202)
RC2_START = (RC2_CAR_IMG[0] + 25.0, RC2_CAR_IMG[1] + 25.0)                                      # (344, 359)
RC_CP2 = (RC_TOKENS[1][0] + 52.0, RC_TOKENS[1][1] + 51.0)                                      # (487, 251): the second checkpoint's centre
RC_LEG2 = rc_leg("leg2", RC2_START, RC_CP2)
RC2_VIEWS = [{"src": "rc_car_bk", "deg": -14, "to": -3}, {"src": "rc_car", "deg": 0, "from": 3}]
rc2 = copy.deepcopy(rc); rc2["id"] = "RC2"
rc2["data"]["alt_hi"] = "माधव का कमरा: पहले प्रश्नचिह्न पर माँ और माधव की तस्वीर लग गई; माधव रिमोट से अपनी खिलौना कार दूसरे प्रश्नचिह्न तक चलाता है।"
rc2["data"]["rc"] = {"tokens": RC_TOKENS, "reach": 1, "boy": rc["data"]["rc"]["boy"], "shadow": rc["data"]["rc"]["shadow"],
                     "placed": [{"token": 0, "image": "rc_done_1", "animate": True}], "place_ms": 500, "place_sfx": "sfx_place",
                     "car": {"box": [round(RC2_CAR_BOX[0], 3), round(RC2_CAR_BOX[1], 3)], "size": RC_CAR_SIZE, "rot": -14, "views": RC2_VIEWS},   # rot = the opening HEADING: -14 shows the rear render unrotated, as the Figma has it
                     "leg": {"pts": RC_LEG2, "s": 2.8}, "start_ms": 1800, "hold_ms": 1500, "sfx": "sfx_rc"}
_i3_now = next(s for s in card["slides"] if s["id"] == "I3")
card["slides"].insert(card["slides"].index(_i3_now) + 1, rc2)
assert [s["id"] for s in card["slides"]][card["slides"].index(_i3_now):card["slides"].index(_i3_now) + 3] == ["I3", "RC2", "P1"], "RC2 must sit between I3 and P1"
# ---- [L02-RC3] (2026-10-05, user request) "After page 17 P1 the RC toy scene again: the picture of Madhav moving away from the bed
# gets placed in the second checkpoint with the same glowing animation and the synced sound effect, then the car moves towards the next
# checkpoint smoothly with its other angle view as shown, and 1.5 seconds after it reaches it the next question arrives." Figma 278-1882
# (open: checkpoint 2 = "image 241" holds "5a6edbfb-10dd-4e23-b509-13d73d6b536a" — BYTE-IDENTICAL to p1_utha_source.png, P1's "माधव उठ
# गया" picture — 279x208 at (-139,-61) of the token's inner box; checkpoint 1 keeps the I3 picture; the car = the FRONT three-quarter
# render "…07_48_15 PM", drawn 42x42 at (554,269) on the hump's far slope past checkpoint 2) and 278-2075 (the car in checkpoint 3's ring,
# its "?" gone). Slide RC3: a copy of RC2 inserted after P1 (practice like P1, so the one phase change of this stretch, into mastery,
# stays where it was: right before M1), placed = [checkpoint 0 ← rc_done_1 (already there, no animation), checkpoint 1 ← rc_done_2
# (animated + chime)], the car opens at the Figma spot's CENTRE (575,290) at the lesson's 50 px size (the Figma's 42 px there is the
# one odd size out of five frames; the car stays one size on every page), views = the side render (deg 0, the sole view below 3°) and
# the front render — its deg set to 34 on THIS slope (42 on leg1): leg3 runs down the far side of the hump into the trough with headings
# 54° → 58° → 14° at the ring, so with 34 the render is turned +20° as it opens and -20° as it parks, half-way between the two unrotated
# Figma poses either side, while its body follows the carpet all the way (with 42 it would park turned -28°); leg3 traced by
# rc_path_trace.py (129 px, 2.0 s, the same ~66 px/s as the other legs); start_ms 1800, reach 2, hold_ms 1500 → M1.
RC3_CAR_IMG, RC3_CAR_SZ = (554.0, 269.0), 42.0                                                 # the Figma's 42x42 render; only its centre is used
RC3_START = (RC3_CAR_IMG[0] + RC3_CAR_SZ / 2, RC3_CAR_IMG[1] + RC3_CAR_SZ / 2)                  # (575, 290)
RC3_CAR_BOX = (RC3_START[0] - RC_CAR_SIZE / 2, RC3_START[1] - RC_CAR_SIZE / 2)
RC_CP3 = (RC_TOKENS[2][0] + 52.0, RC_TOKENS[2][1] + 51.0)                                      # (672, 367): the third checkpoint's centre
RC_LEG3 = rc_leg("leg3", RC3_START, RC_CP3)
RC3_VIEWS = [{"src": "rc_car", "deg": 0, "to": 3}, {"src": "rc_car_fr", "deg": 34, "from": 8}]
rc_done("rc_done_2.webp", "p1_utha_source.png", (139, 61, 239, 159, 279, 208))              # the Figma's asset is byte-identical to p1_utha_source.png (md5 ed3a99f2…)
card["assets"]["image"]["rc_done_2"] = "assets/Images/rc_done_2.webp"
rc3 = copy.deepcopy(rc2); rc3["id"] = "RC3"
rc3["data"]["alt_hi"] = "माधव का कमरा: दूसरे प्रश्नचिह्न पर पलंग से उठते माधव की तस्वीर लग गई; माधव रिमोट से अपनी खिलौना कार तीसरे प्रश्नचिह्न तक चलाता है।"
rc3["data"]["rc"].update({"reach": 2, "placed": [{"token": 0, "image": "rc_done_1", "animate": False}, {"token": 1, "image": "rc_done_2", "animate": True}],
                          "car": {"box": [round(RC3_CAR_BOX[0], 3), round(RC3_CAR_BOX[1], 3)], "size": RC_CAR_SIZE, "rot": 54, "views": RC3_VIEWS},   # rot = the opening heading = the carpet's there
                          "leg": {"pts": RC_LEG3, "s": 2.0}})
_p1_now = next(s for s in card["slides"] if s["id"] == "P1")
card["slides"].insert(card["slides"].index(_p1_now) + 1, rc3)
assert [s["id"] for s in card["slides"]][card["slides"].index(_p1_now):card["slides"].index(_p1_now) + 3] == ["P1", "RC3", "M1"], "RC3 must sit between P1 and M1"
# ---- [L02-RC4] (2026-10-05, user request) "After page 19 M1 the RC toy scene again: the picture of Madhav reading a book gets placed
# in the third checkpoint with the same glowing animation and the synced sound effect, then the car moves towards the next checkpoint
# smoothly with its other angle view as shown, and 1.5 seconds after it reaches it the next question arrives." Figma 290-197 (open:
# checkpoint 3 = "image 240" holds "ChatGPT Image Oct 3, 2026, 03_17_51 PM" — BYTE-IDENTICAL to story_6_source.png = m1_padha_source.png,
# the boy reading among his toys, i.e. the designer's picture for the M1 question IS the one the lesson already shows there — 194x109
# at (-56,-4) of the token's inner box; checkpoints 1 and 2 keep theirs; the car = the REAR render "…07_48_23 PM" 50x50 at (733,334),
# unrotated, on the trough's far side past checkpoint 3, bound up the right hump) and 278-2484 (the car in checkpoint 4's ring, its "?"
# gone). Slide RC4: a copy of RC3 inserted after M1, in the MASTERY phase like M1 and M2 either side (the practice gate has long played,
# mastery has none: no gate anywhere here), placed = [checkpoints 0, 1 as they are, checkpoint 2 ← rc_done_3 (animated + chime)], the car
# opens at the Figma spot (box = the render's spot minus the 2.202 inset; opening heading -14 = the rear render's angle, so it stands
# unrotated as drawn — the carpet there heads -23°, a 9° turn as it pulls away), views = RC2's rear / side pair (leg4 climbs the right
# hump with headings -23° → -37° → -9° at the ring: the rear view all the way, parked turned +5°, close to the Figma's unrotated pose),
# leg4 traced by rc_path_trace.py (139 px, 2.1 s, the same ~66 px/s); start_ms 1800, reach 3, hold_ms 1500 → M2. With it the car has
# visited every checkpoint; M2's picture is never placed (no page follows M2 but the celebration).
RC4_CAR_IMG = (733.0, 334.0)
RC4_START = (RC4_CAR_IMG[0] + 25.0, RC4_CAR_IMG[1] + 25.0)                                      # (758, 359)
RC4_CAR_BOX = (RC4_CAR_IMG[0] - 2.202, RC4_CAR_IMG[1] - 2.202)
RC_CP4 = (RC_TOKENS[3][0] + 52.0, RC_TOKENS[3][1] + 51.0)                                      # (882, 300): the fourth checkpoint's centre
RC_LEG4 = rc_leg("leg4", RC4_START, RC_CP4)
rc_done("rc_done_3.webp", "m1_padha_source.png", (56, 4, 156, 102, 194, 109))               # the Figma's asset is byte-identical to m1_padha_source.png (= story_6_source.png, md5 35ec8e4f…)
card["assets"]["image"]["rc_done_3"] = "assets/Images/rc_done_3.webp"
rc4 = copy.deepcopy(rc3); rc4["id"] = "RC4"; rc4["phase"] = "mastery"
rc4["data"]["alt_hi"] = "माधव का कमरा: तीसरे प्रश्नचिह्न पर किताब पढ़ते माधव की तस्वीर लग गई; माधव रिमोट से अपनी खिलौना कार चौथे प्रश्नचिह्न तक चलाता है।"
rc4["data"]["rc"].update({"reach": 3, "placed": [{"token": 0, "image": "rc_done_1", "animate": False}, {"token": 1, "image": "rc_done_2", "animate": False}, {"token": 2, "image": "rc_done_3", "animate": True}],
                          "car": {"box": [round(RC4_CAR_BOX[0], 3), round(RC4_CAR_BOX[1], 3)], "size": RC_CAR_SIZE, "rot": -14, "views": RC2_VIEWS},
                          "leg": {"pts": RC_LEG4, "s": 2.1}})
_m1_now = next(s for s in card["slides"] if s["id"] == "M1")
card["slides"].insert(card["slides"].index(_m1_now) + 1, rc4)
assert [s["id"] for s in card["slides"]][card["slides"].index(_m1_now):card["slides"].index(_m1_now) + 3] == ["M1", "RC4", "M2"], "RC4 must sit between M1 and M2"
# ---- [L02-STD-SFX] the celebration page's sound: the card's sfx_celebrate (the engine's jingle under the star burst) is replaced by the
# standard confetti clip — the one place of the lesson that already had a sound where a standard one applies. sfx_celebrate.ogg stays in
# the dist as the engine's fallback asset, unused.
_cel = next(s for s in card["slides"] if s["id"] == "CEL")
assert _cel.get("audio", {}).get("sfx") == "sfx_celebrate", _cel.get("audio")
_cel["audio"]["sfx"] = "sfx_confetti"
# the questions between the legs — I3, M1 and M2 keep their content and clips, shown in the Figma card style like P1 ([L02-P1-FIG] below);
# no recall picture (the Figma page has none). Their option pictures are the lesson's cut-out icons on a transparent ground (a book, the
# toys, a plate…, 313-466 px portrait), not scene pictures, so the card window shows each one WHOLE on the white card (fig_q3_contain →
# CSS object-fit contain with a small inset) instead of cropping it to the window as the P1 / G3 scene pictures are.
# (The card-style dressing that used to run here — fig_q3 + fig_q3_yellow + fig_q3_contain + room_bg, hide_recall, no recall picture — for
#  I3, M1 and M2 is gone: I3 left it on 2026-10-05 ([L02-I3-SENTQ] below), M1 and M2 the same day ([L02-M1-SENTQ] / [L02-M2-SENTQ] after it).
#  P1 keeps that look through its own block ([L02-P1-FIG]); the CSS for it stays.)
# ---- [L02-I3-SENTQ] (2026-10-05, user request) I3 ("page 14 I3 INDEPENDENT" in the user's count, ?slide=13): "use the exact same layout
# and the design of the page as of the Page 11 G3 Guided; just change the image with this image, the text in the three options with
# खाना बना रही हैं। / माधव को सुला रही हैं। / माधव को पढ़ा रही हैं। and the title text with चित्र में माँ क्या कर रही हैं ?; rest keep the design,
# placement, size and the elements just like that of Page 11 G3." So I3 is now a second [L02-G3-REF] page: the same card flags (sent_ref +
# hide_header_chip + hide_nav + bare_recall + sentence_options → the bare 374.125x315 picture over three 344x78 white pills, stage class
# .l02-sentq, every behaviour of sent_q_page.js: the 5 s idle repeat with the picture's pop-and-hold, the pill words lit in sync, wiggle +
# try line / the read-out of all pills / the reveal on the 1st / 2nd / 3rd wrong tap, the correct tap's mark + scene sound + pop hold,
# then the praise line with the pill's words lit, ding + confetti, advance) and the same kinds of assets: the picture = the user's PNG of
# the mother stroking the sleeping boy's hair in his bed (_reskin_build/i3_sula_source.png, 1681x936) cut like q3_khel to the reference
# picture's 1411:1188 shape — the full height, the window at columns SULA_X0 .. SULA_X0 + 1112 (the bedside lamp and plant, the bed with
# the two, the flower picture; the window at the left and the toys / wardrobe at the right fall outside) -> assets/Images/i3_sula.webp
# 1411x1188; the answer is माधव को सुला रही हैं। (story T2 "माधव की माँ उसे सुलाने लगी।"). Lines — edge-tts hi-IN-SwaraNeural placeholders via
# tts_clip, as G3's are: the question vo_q_maa_kya, the three sentences vo_opt_khana_bana / _sula_rahi / _padha_rahi, the praise line
# vo_ok_sula "शाबाश! माँ माधव को सुला रही हैं।" (its sentence part = the correct pill's five words, lit with it); try_again = the recorded vo_q_hint
# and reveal = the recorded vo_q_reveal, exactly as on G3; no audio.hint (the 2nd wrong tap reads the pills out). The correct tap's scene
# sound = sfx_pop_2 (the sound of story page 3, "माधव की माँ उसे सुलाने लगी।" — G3 takes the toys page's sound the same way; 2 s). The one
# flag G3 does not carry: slide.confetti — I3 is an independent-phase page and the kit's gate would otherwise mute the confetti that G3
# (guided) shows on the correct tap; with it the two pages look the same ([L02-I1-CONFETTI] mechanism). I3's Figma card look (fig_q3 +
# yellow + contain + room_bg) and its "माधव ने क्या पढ़ा?" content (vo_q_kitab, vo_opt_book / _toys / _khana, opt_* icons) are gone from I3;
# the clips and icons stay registered, unused (opt_* icons still serve M1). M1 and M2 keep the card look (loop above).
i3 = next(s for s in card["slides"] if s["id"] == "I3")
assert i3["type"] == "STORY_QUESTION" and i3["phase"] == "independent", "I3 is not the independent story question any more"
for _k in ("fig_q3", "fig_q3_yellow", "fig_q3_contain", "room_bg"): i3.pop(_k, None)
i3["sent_ref"] = True; i3["hide_header_chip"] = True; i3["hide_nav"] = True; i3["bare_recall"] = True; i3["sentence_options"] = True
i3["confetti"] = True
i3["prompt_hi"] = "चित्र में माँ क्या कर रही हैं ?"
tts_clip("vo_q_maa_kya", "चित्र में माँ क्या कर रही हैं?")
tts_clip("vo_opt_khana_bana", "खाना बना रही हैं।")
tts_clip("vo_opt_sula_rahi", "माधव को सुला रही हैं।")
tts_clip("vo_opt_padha_rahi", "माधव को पढ़ा रही हैं।")
tts_clip("vo_ok_sula", "शाबाश! माँ माधव को सुला रही हैं।")
i3["audio"] = {"prompt": "vo_q_maa_kya", "try_again": "vo_q_hint", "reveal": "vo_q_reveal", "correct": "vo_ok_sula"}
i3["data"]["recall_image_id"] = "i3_sula"; i3["data"]["hide_recall"] = False
i3["data"]["options"] = [
    {"label_hi": "खाना बना रही हैं।", "audio": "vo_opt_khana_bana"},
    {"label_hi": "माधव को सुला रही हैं।", "audio": "vo_opt_sula_rahi", "correct": True},
    {"label_hi": "माधव को पढ़ा रही हैं।", "audio": "vo_opt_padha_rahi"},
]
i3["data"]["correct_sfx"] = {"src": "sfx_pop_2", "hold_ms": 2000, "vol": 1.0}
i3["data"]["prompt_idle_ms"] = 5000
I3_WT = {}
for _o in i3["data"]["options"]: I3_WT[_o["audio"]] = word_times_for(_o["audio"], _o["label_hi"].split())
# [L02-VO-BATCH] the praise line is the deck's one word "शाबाश।" now (no sentence part), so the correct pill's words are not lit during it
assert txt["vo_ok_sula"] == "शाबाश।", txt["vo_ok_sula"]
i3["data"]["word_times_by_audio"] = I3_WT
i3["data"]["prompt_pop_ms"] = int(round(clip_s("vo_q_maa_kya") * 1000))
SULA_SRC = os.path.join(SCR, "i3_sula_source.png"); SULA_DST = os.path.join(CUR, "assets", "Images", "i3_sula.webp"); SULA_X0 = 285
assert os.path.exists(SULA_SRC), "missing " + SULA_SRC
if not os.path.exists(SULA_DST) or os.path.getmtime(SULA_DST) < os.path.getmtime(SULA_SRC):
    from PIL import Image
    im = Image.open(SULA_SRC).convert("RGB"); W, H = im.size; w = int(round(H * 1411 / 1188)); x0 = max(0, min(SULA_X0, W - w))
    im.crop((x0, 0, x0 + w, H)).resize((1411, 1188), Image.LANCZOS).save(SULA_DST, "WEBP", quality=88, method=6)
    print("wrote", SULA_DST, "columns %d-%d of %d" % (x0, x0 + w, W))
card["assets"]["image"]["i3_sula"] = "assets/Images/i3_sula.webp"
card.setdefault("_emoji_fallback", {})["i3_sula"] = "🛏️"
# [L02-I3-BG] (2026-10-05, user request) "At page 14 I3 use this background on the white coloured space, such that everything on the page
# lies on this background; the whole layout remains the same." The user's 1280x720 PNG (a blurred wooden floor meeting a pale wall — the
# artboard's own size and shape) → _reskin_build/i3_floor_source.png → assets/Images/i3_floor.webp (1280x720, q88; any alpha flattened on
# white). Card slide.page_bg = "i3_floor" → adapt.js applyPageBg draws it as the stage's first child (.l02-page-bg; CSS [L02-I3-BG] in
# adapt.css: the whole 1333x750 stage, object-fit cover, no blur of its own) under the header row, the picture and the pills, the same
# layer as the lesson's blurred-room backdrop (room_bg) — nothing moves. Only I3 carries the flag; G3 keeps its plain ground.
FLOOR_SRC = os.path.join(SCR, "i3_floor_source.png"); FLOOR_DST = os.path.join(CUR, "assets", "Images", "i3_floor.webp")
assert os.path.exists(FLOOR_SRC), "missing " + FLOOR_SRC
if not os.path.exists(FLOOR_DST) or os.path.getmtime(FLOOR_DST) < os.path.getmtime(FLOOR_SRC):
    from PIL import Image
    _im = Image.open(FLOOR_SRC)
    if _im.mode in ("RGBA", "LA", "P"):
        _im = _im.convert("RGBA"); _flat = Image.new("RGB", _im.size, (255, 255, 255)); _flat.paste(_im, mask=_im.split()[-1]); _im = _flat
    _im.convert("RGB").save(FLOOR_DST, "WEBP", quality=88, method=6); print("wrote", FLOOR_DST, _im.size)
card["assets"]["image"]["i3_floor"] = "assets/Images/i3_floor.webp"
i3["page_bg"] = "i3_floor"
# [L02-I3-PRACTICE] (2026-10-05, user request) "Remove the अब आपकी बारी screen after page 14 I3 and place this screen and the VO before
# page 14." That screen is the engine's PRACTICE phase gate (PHASE_GATE_TITLE.practice "अब आपकी बारी!", VO vo_pt_practice "वाह! अब आपकी
# बारी।"), shown once, on the first advance INTO a practice-phase slide (completeSlide: next.phase !== slide.phase && PHASE_GATE_TITLE
# [next.phase] && not gated yet) — until now at I3 → P1. Moving I3 into the practice phase puts that advance at I2 → I3, so the gate (and
# its line) comes before page 14 and I3 → P1 (practice → practice) advances straight on. Nothing else keys on independent-vs-practice for a
# STORY_QUESTION (mastery flag / hide_recall look at "mastery" only; nudge timeouts are 8 s for both; the kit's confetti gate allows
# practice, so I3's confetti flag is now merely redundant). There is no independent-phase gate (G3 → I1 stays gate-less) and no mastery
# gate (P1 → M1 stays gate-less), as before. Signals from I3 now carry phase "practice".
i3["phase"] = "practice"
# ---- [L02-M1-SENTQ] (2026-10-05, user request) M1 ("page 16 M1 MASTERY" in the user's count, ?slide=15): "use the exact same layout and
# design as page 14 I3; just change the image with this image, the title with माधव ने क्या पढ़ा? and the three options with माधव ने किताब पढ़ी । /
# माधव ने अखबार पढ़ा । / माधव ने पत्र पढ़ा ।; rest exactly like page 14." So M1 is the third [L02-G3-REF] page, dressed like I3: the same card
# flags (sent_ref + hide_header_chip + hide_nav + bare_recall + sentence_options; confetti for parity — the kit allows mastery anyway) and
# I3's floor backdrop (page_bg i3_floor). The question is the lesson's OWN recorded line vo_q_kitab ("माधव ने क्या पढ़ा?" — the words the user
# gave, so no placeholder is needed for it; it was the old I3's question). The answer माधव ने किताब पढ़ी। (story T6 "उसने किताब पढ़ी।"). The
# three sentences and the praise line "शाबाश! माधव ने किताब पढ़ी।" are edge-tts hi-IN-SwaraNeural placeholders via tts_clip, like I3's; try_again =
# recorded vo_q_hint, reveal = recorded vo_q_reveal; no audio.hint. The danda is set CLOSE to the word ("पढ़ी।", not the typed "पढ़ी ।"), as on
# I3's pills — the pill splits its words on spaces for the word-by-word lighting, and a lone "।" would be a word of its own. The correct
# tap's scene sound = sfx_pop_6 (the sound of story page 7, "उसने किताब पढ़ी।"; 2 s), the matching-page rule of G3 / I3.
# PICTURE: the user's message named "this image" but NO picture arrived with it (the session's image folder holds only the two earlier
# ones), so the page shows a STAND-IN until it comes: _reskin_build/m1_padha_source.png = a copy of the user's own story_6_source.png (the
# boy on the rug reading the rocket book — the very event of the answer, 1672x941), cut like q3_khel / i3_sula (full height, the 1411:1188
# window at columns PADHA_X0 .. PADHA_X0 + 1118) -> assets/Images/m1_padha.webp 1411x1188. To place the intended picture: overwrite
# m1_padha_source.png, set PADHA_X0 for its framing, rebuild. Told the user. M1's phase stays "mastery": the engine's mastery flag only
# counts telemetry (masteryAttempts / masteryHits) and would HIDE the recall picture — engine patch 3g above lets this card's explicit
# `hide_recall: false` keep it. M1's Figma card look (fig_q3 + yellow + contain + room_bg) and its old content ("आख़िर में माधव कहाँ सोया?",
# vo_q_kahan + vo_opt_toys/bed/chair — the question I2 asks today) are gone from M1; the clips stay registered (I2 uses them). M2 is as it was.
m1 = next(s for s in card["slides"] if s["id"] == "M1")
assert m1["type"] == "STORY_QUESTION" and m1["phase"] == "mastery", "M1 is not the mastery story question any more"
for _k in ("fig_q3", "fig_q3_yellow", "fig_q3_contain", "room_bg"): m1.pop(_k, None)
m1["sent_ref"] = True; m1["hide_header_chip"] = True; m1["hide_nav"] = True; m1["bare_recall"] = True; m1["sentence_options"] = True
m1["confetti"] = True; m1["page_bg"] = "i3_floor"
m1["prompt_hi"] = "माधव ने क्या पढ़ा?"
assert txt.get("vo_q_kitab") == "माधव ने क्या पढ़ा?" and os.path.exists(os.path.join(CUR, aud["vo_q_kitab"])), "vo_q_kitab is not the recorded question line"
tts_clip("vo_opt_kitab_padhi", "माधव ने किताब पढ़ी।")
tts_clip("vo_opt_akhbar_padha", "माधव ने अखबार पढ़ा।")
tts_clip("vo_opt_patra_padha", "माधव ने पत्र पढ़ा।")
tts_clip("vo_ok_kitab_padhi", "शाबाश! माधव ने किताब पढ़ी।")
m1["audio"] = {"prompt": "vo_q_kitab", "try_again": "vo_q_hint", "reveal": "vo_q_reveal", "correct": "vo_ok_kitab_padhi"}
m1["data"]["recall_image_id"] = "m1_padha"; m1["data"]["hide_recall"] = False
m1["data"]["options"] = [
    {"label_hi": "माधव ने किताब पढ़ी।", "audio": "vo_opt_kitab_padhi", "correct": True},
    {"label_hi": "माधव ने अखबार पढ़ा।", "audio": "vo_opt_akhbar_padha"},
    {"label_hi": "माधव ने पत्र पढ़ा।", "audio": "vo_opt_patra_padha"},
]
m1["data"]["correct_sfx"] = {"src": "sfx_pop_6", "hold_ms": 2000, "vol": 1.0}
m1["data"]["prompt_idle_ms"] = 5000
M1_WT = {}
for _o in m1["data"]["options"]: M1_WT[_o["audio"]] = word_times_for(_o["audio"], _o["label_hi"].split())
_ok4_words = "शाबाश! माधव ने किताब पढ़ी।".split(); _ok4_t = word_times_for("vo_ok_kitab_padhi", _ok4_words)
M1_WT["vo_ok_kitab_padhi"] = _ok4_t[1:6]     # माधव, ने, किताब, पढ़ी। starts … पढ़ी। end — the correct pill's four words inside the praise line
assert _ok4_words[1:] == "माधव ने किताब पढ़ी।".split() and len(M1_WT["vo_ok_kitab_padhi"]) == 5, (_ok4_words, M1_WT["vo_ok_kitab_padhi"])
m1["data"]["word_times_by_audio"] = M1_WT
m1["data"]["prompt_pop_ms"] = int(round(clip_s("vo_q_kitab") * 1000))
PADHA_SRC = os.path.join(SCR, "m1_padha_source.png"); PADHA_DST = os.path.join(CUR, "assets", "Images", "m1_padha.webp"); PADHA_X0 = 277
assert os.path.exists(PADHA_SRC), "missing " + PADHA_SRC
if not os.path.exists(PADHA_DST) or os.path.getmtime(PADHA_DST) < os.path.getmtime(PADHA_SRC):
    from PIL import Image
    im = Image.open(PADHA_SRC).convert("RGB"); W, H = im.size; w = int(round(H * 1411 / 1188)); x0 = max(0, min(PADHA_X0, W - w))
    im.crop((x0, 0, x0 + w, H)).resize((1411, 1188), Image.LANCZOS).save(PADHA_DST, "WEBP", quality=88, method=6)
    print("wrote", PADHA_DST, "columns %d-%d of %d" % (x0, x0 + w, W))
card["assets"]["image"]["m1_padha"] = "assets/Images/m1_padha.webp"
card.setdefault("_emoji_fallback", {})["m1_padha"] = "📖"
assert os.path.exists(os.path.join(CUR, "assets", "Audio", "sfx_pop_6.ogg")), "M1 scene sound missing: sfx_pop_6.ogg"
# ---- [L02-M2-SENTQ] (2026-10-05, user request) M2 ("page 17 M2 MASTERY" in the user's count, ?slide=16): "use the exact same layout and
# design as page 14 I3; just change the image with this image, the title with कहानी के अंत में माधव क्यों सो गया? and the three options with
# वह थक गया था। / वह भूखा था। / वह डर गया था।; rest exactly like page 14." The fourth [L02-G3-REF] page, dressed like I3 / M1: the same card flags
# (sent_ref + hide_header_chip + hide_nav + bare_recall + sentence_options + confetti) and I3's floor backdrop (page_bg i3_floor); phase
# stays "mastery" (engine patch 3g keeps the picture through the card's explicit hide_recall: false). The answer वह थक गया था। (story T8
# "खेलते-खेलते उसे नींद आ गई" — he had played himself tired). No recorded clip says the new question or the sentences, so all five lines are edge-tts
# hi-IN-SwaraNeural placeholders via tts_clip: the question vo_q_kyon_soya, the sentences vo_opt_thak_gaya / _bhookha_tha / _dar_gaya and
# the praise line vo_ok_thak_gaya "शाबाश! वह थक गया था।" (its sentence part = the correct pill's four words, lit with it); try_again = recorded
# vo_q_hint, reveal = recorded vo_q_reveal; no audio.hint. The correct tap's scene sound = sfx_pop_8 (the sound of story page 9, "खेलते-खेलते
# उसे नींद आ गई"; 2 s), the matching-page rule of the other three pages. PICTURE: the user's PNG of the boy asleep on the rug among his toys
# (_reskin_build/m2_soya_source.png, 1448x1086 — nearly the window's shape, 158 px of slack) cut like the others: full height, the 1411:1188
# window at columns SOYA_X0 .. SOYA_X0 + 1290 (the centred window: the teddy whole at the left, the stacking rings whole at the right)
# -> assets/Images/m2_soya.webp 1411x1188. M2's Figma card look (fig_q3 + yellow + contain + room_bg, two cards centred by the
# .opt-grid.cols-2 rule — that CSS stays, unused) and its old content ("माधव को क्या करना था — सोना या खेलना?", vo_q_kya_karna +
# vo_opt_play / vo_opt_sleep, opt_play / opt_sleep) are gone from M2; the clips and icons stay registered, unused. M2 is the last question:
# the correct beat's completeSlide leads to the celebration as before.
m2 = next(s for s in card["slides"] if s["id"] == "M2")
assert m2["type"] == "STORY_QUESTION" and m2["phase"] == "mastery", "M2 is not the mastery story question any more"
for _k in ("fig_q3", "fig_q3_yellow", "fig_q3_contain", "room_bg"): m2.pop(_k, None)
m2["sent_ref"] = True; m2["hide_header_chip"] = True; m2["hide_nav"] = True; m2["bare_recall"] = True; m2["sentence_options"] = True
m2["confetti"] = True; m2["page_bg"] = "i3_floor"
m2["prompt_hi"] = "कहानी के अंत में माधव क्यों सो गया?"
tts_clip("vo_q_kyon_soya", "कहानी के अंत में माधव क्यों सो गया?")
tts_clip("vo_opt_thak_gaya", "वह थक गया था।")
tts_clip("vo_opt_bhookha_tha", "वह भूखा था।")
tts_clip("vo_opt_dar_gaya", "वह डर गया था।")
tts_clip("vo_ok_thak_gaya", "शाबाश! वह थक गया था।")
m2["audio"] = {"prompt": "vo_q_kyon_soya", "try_again": "vo_q_hint", "reveal": "vo_q_reveal", "correct": "vo_ok_thak_gaya"}
m2["data"]["recall_image_id"] = "m2_soya"; m2["data"]["hide_recall"] = False
m2["data"]["options"] = [
    {"label_hi": "वह थक गया था।", "audio": "vo_opt_thak_gaya", "correct": True},
    {"label_hi": "वह भूखा था।", "audio": "vo_opt_bhookha_tha"},
    {"label_hi": "वह डर गया था।", "audio": "vo_opt_dar_gaya"},
]
m2["data"]["correct_sfx"] = {"src": "sfx_pop_8", "hold_ms": 2000, "vol": 1.0}
m2["data"]["prompt_idle_ms"] = 5000
M2_WT = {}
for _o in m2["data"]["options"]: M2_WT[_o["audio"]] = word_times_for(_o["audio"], _o["label_hi"].split())
_ok5_words = "शाबाश! वह थक गया था।".split(); _ok5_t = word_times_for("vo_ok_thak_gaya", _ok5_words)
M2_WT["vo_ok_thak_gaya"] = _ok5_t[1:6]     # वह, थक, गया, था। starts … था। end — the correct pill's four words inside the praise line
assert _ok5_words[1:] == "वह थक गया था।".split() and len(M2_WT["vo_ok_thak_gaya"]) == 5, (_ok5_words, M2_WT["vo_ok_thak_gaya"])
m2["data"]["word_times_by_audio"] = M2_WT
m2["data"]["prompt_pop_ms"] = int(round(clip_s("vo_q_kyon_soya") * 1000))
SOYA_SRC = os.path.join(SCR, "m2_soya_source.png"); SOYA_DST = os.path.join(CUR, "assets", "Images", "m2_soya.webp"); SOYA_X0 = 79
assert os.path.exists(SOYA_SRC), "missing " + SOYA_SRC
if not os.path.exists(SOYA_DST) or os.path.getmtime(SOYA_DST) < os.path.getmtime(SOYA_SRC):
    from PIL import Image
    im = Image.open(SOYA_SRC).convert("RGB"); W, H = im.size; w = int(round(H * 1411 / 1188)); x0 = max(0, min(SOYA_X0, W - w))
    im.crop((x0, 0, x0 + w, H)).resize((1411, 1188), Image.LANCZOS).save(SOYA_DST, "WEBP", quality=88, method=6)
    print("wrote", SOYA_DST, "columns %d-%d of %d" % (x0, x0 + w, W))
card["assets"]["image"]["m2_soya"] = "assets/Images/m2_soya.webp"
card.setdefault("_emoji_fallback", {})["m2_soya"] = "😴"
assert os.path.exists(os.path.join(CUR, "assets", "Audio", "sfx_pop_8.ogg")), "M2 scene sound missing: sfx_pop_8.ogg"
# ---- [L02-SENTQ-SHADOW] (2026-10-05, user request) "Apply a little shadow on the images and the options shown on pages 14 I3, 16 M1 and
# 17 M2, just like the shadow on the options of page 15 P1." P1's cards carry the Figma drop shadow 0 4px 2px rgba(0,0,0,.25) (adapt.css
# [L02-P1-FIG] / .l02-q3-yellow); the same shadow goes on the bare picture and the three pills of these three sentence pages: card
# slide.sentq_shadow → sent_q_page.js wire() sets stage class .l02-sentq-shadow → adapt.css [L02-SENTQ-SHADOW]. G3 (page 11), the fourth
# sentence page, is NOT named by the user and stays without. Nothing moves: a box-shadow takes no layout space. Same day, second request:
# "a little shadow on the title bar" of the same three pages "just like the title bar of page 15 P1" — the same flag/class also gives the
# band (.prompt-band) P1's band shadow (the engine's faint 0 3px box-shadow off, P1's 0 4px 2px 25% as a filter drop-shadow); the band's
# colours, stroke and size stay the engine's (only the shadow was asked for).
for _s in (i3, m1, m2): _s["sentq_shadow"] = True
assert "sentq_shadow" not in g3, "G3 must stay without the shadow"
# ---- [L02-Q3-BAND] (2026-10-05, user request) "Apply the exact same title bar as of page 15 P1 on pages 14 I3, 16 M1 and 17 M2, but keep
# the text on them as it is." P1's title bar is the Figma 113-198 header of [L02-Q3-FIG] (adapt.css .stage.l02-q3: the mascot circle
# 116.513x120 @ (36,26) in #61D0FE with a 5px #FDF9E9 ring, the band 1214.103x84 @ (39.9,44) in #CBE8FF with a 4px white ring, the text
# starting 135.55 in, ink #012F76 32px Baloo 700, letter-spacing 0, the 0 4px 2px 25% drop shadow on both — all through the engine's header
# variables). Card slide.q3_band → sent_q_page.js wire() sets stage class .l02-q3-band → the same five header rules apply (selector lists in
# adapt.css [L02-Q3-BAND]); the card-grid rules of .l02-q3 are NOT included, so the sentence layout (picture + three pills) is untouched.
# Each page keeps its own words (prompt_hi unchanged). G3 (page 11) is not named and keeps the engine's band.
for _s in (i3, m1, m2): _s["q3_band"] = True
assert "q3_band" not in g3, "G3 must keep the engine's band"
for _k in ("vo_q_hint", "vo_q_reveal"):
    assert _k in aud and os.path.exists(os.path.join(CUR, aud[_k])), "I3 clip missing: " + _k
assert os.path.exists(os.path.join(CUR, "assets", "Audio", "sfx_pop_2.ogg")), "I3 scene sound missing: sfx_pop_2.ogg"   # the pops are addressed by id, like G3's sfx_pop_7
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
# ---- [L02-P1-WORDS] (2026-10-06, user request) "At page 17 P1 once the user taps the correct option then each word in the correct option
# will highlight along with the animation in sync with the VO as on the other pages in this file." The sentence pages (G3 / I3 / M1 / M2,
# sent_q_page.js) light their pills word by word from data.word_times_by_audio; the same module now does it for a Figma-card page that
# sets slide.opt_words (CSS [L02-P1-WORDS]: the same orange + pop on the card's sentence). Only the ANSWER's line gets timings here —
# the engine speaks the tapped card's own line on every tap, so the words of "माधव उठ गया ।" light up exactly when the correct card is
# tapped (first try, second try, or the guided tap after the reveal) while vo_p1_utha speaks; a wrong card's line lights nothing. The
# card's sentence ends in a standalone danda ("गया ।", the Figma text) — the JS joins it to the word before, so three word boxes follow
# the recording's three words (measured like every other line: word_times_for, the envelope method, cached by md5 in word_times.json).
p1["opt_words"] = True
_p1_ok = next(o for o in p1["data"]["options"] if o.get("correct") is True)
_p1_words = txt[_p1_ok["audio"]].split()
assert _p1_words == ["माधव", "उठ", "गया।"] and [w for w in _p1_ok["label_hi"].split() if w != "।"] == ["माधव", "उठ", "गया"], (_p1_words, _p1_ok["label_hi"])
p1["data"]["word_times_by_audio"] = {_p1_ok["audio"]: word_times_for(_p1_ok["audio"], _p1_words)}
assert len(p1["data"]["word_times_by_audio"][_p1_ok["audio"]]) == 4
# ---- [L02-I2-FIG] (2026-10-03, user request) I2 (the independent find page until now, the user's "page 13", ?slide=12) is laid out from
# Figma "FLN by MJ" node 233-25 — the 113-198 card design ([L02-Q3-FIG]: fig_q3 / .l02-q3 / applyQ3; band, no header chip, NO आगे pill,
# three 252x314.113 cards @ x 232/514/796, y 247) with this frame's content: band "आखिर में माधव कहाँ सोया ?" over the cards खिलोनों के
# बीच / पलंग पर / कुर्सी पर (the boy asleep among his toys / in his bed / in the green armchair). The user supplied the frame as a 1x PNG
# export (1280x720, _reskin_build/i2_frame_233-25_source.png; the Figma server was not reachable), so the three pictures are cut from it
# at the card windows measured on the export (244x195 each; they will look a little softer than the 3x cards of the other pages until
# the designer's pictures are exported at full size — told the user). The question is the lesson's OWN: the original card's M1 asked
# exactly this ("आख़िर में माधव कहाँ सोया?", vo_q_kahan, answer खिलौनों के बीच — he fell asleep playing, T8/T9), so the VOs are its RECORDED
# clips: vo_q_kahan + the option words vo_opt_toys / vo_opt_bed / vo_opt_chair ("खिलौने" / "बिस्तर" / "कुर्सी" — बिस्तर for the card's पलंग
# पर, told the user) and the question pages' try / hint / correct / reveal lines. The Figma spells खिलोनों; the story's खिलौनों is used.
# I2's bed-board layout, its line (vo_tap_bed), footsteps (sfx_walk) and find lines (vo_tap_ok / vo_tap_try) are gone from this page
# (vo_tap_ok / vo_tap_try stay registered — the find page G2 speaks them; vo_tap_bed and sfx_walk left the dist with the last board
# pages, [L02-NO-BOARD] 2026-10-04).
# Interactions = the engine's card question as on I1 (kit wrong beat + try line, hint rung, reveal with the pointing hand, confetti +
# praise + advance; slide.confetti keeps the confetti on this independent page). M1 still asks the same question with the icon cards.
I2_SRC = os.path.join(SCR, "i2_frame_233-25_source.png")
I2_WINS = {"i2_toys": (236, 251, 480, 446), "i2_bed": (518, 251, 762, 446), "i2_chair": (800, 251, 1044, 446)}   # the picture windows on the export
assert os.path.exists(I2_SRC), "missing " + I2_SRC
for _k, _box in I2_WINS.items():
    _dst = os.path.join(CUR, "assets", "Images", _k + ".webp")
    if not os.path.exists(_dst) or os.path.getmtime(_dst) < os.path.getmtime(I2_SRC):
        from PIL import Image
        Image.open(I2_SRC).convert("RGB").crop(_box).save(_dst, "WEBP", quality=92, method=6); print("wrote", _dst, _box)
    card["assets"]["image"][_k] = "assets/Images/" + _k + ".webp"
card.setdefault("_emoji_fallback", {}).update({"i2_toys": "🧸", "i2_bed": "🛏️", "i2_chair": "🪑"})
assert i2["type"] == "TAP_IN_SCENE" and "bed" not in i2["data"], "I2 should still be the untouched find card here"
i2["type"] = "STORY_QUESTION"; i2["eis"] = "iconic"
for _k in ("bed_fig", "room_bg", "find_fig"): i2.pop(_k, None)
i2["fig_q3"] = True; i2["hide_header_chip"] = True; i2["hide_nav"] = True; i2["bare_recall"] = True; i2["mascot_replay"] = True; i2["confetti"] = True
i2["prompt_hi"] = "आखिर में माधव कहाँ सोया ?"
i2["audio"] = {"prompt": "vo_q_kahan", "try_again": "vo_q_try", "hint": "vo_q_hint", "correct": "vo_q_correct", "reveal": "vo_q_reveal"}
i2["data"] = {"stim_hi": "प्रश्न सुनिए", "options": [
    {"img": "i2_toys",  "emoji": "🧸", "label_hi": "खिलौनों के बीच ।", "audio": "vo_opt_toys", "correct": True},
    {"img": "i2_bed",   "emoji": "🛏️", "label_hi": "पलंग पर ।",        "audio": "vo_opt_bed"},
    {"img": "i2_chair", "emoji": "🪑", "label_hi": "कुर्सी पर ।",       "audio": "vo_opt_chair"},
], "signal_name": "story_question_first_try", "mastery": False, "hide_recall": True}
i2["signals"] = {"on_complete": ["story_question_first_try"]}
for _k in ("vo_q_kahan", "vo_opt_toys", "vo_opt_bed", "vo_opt_chair", "vo_q_try", "vo_q_hint", "vo_q_correct", "vo_q_reveal"):
    assert _k in aud and os.path.exists(os.path.join(CUR, aud[_k])), "I2 clip missing: " + _k
_ids = [s["id"] for s in card["slides"]]          # (G1 is still in the list here; [L02-NO-G1] below removes it)
assert _ids[_ids.index("I1"):] == ["I1", "I2", "RC1", "I3", "RC2", "P1", "RC3", "M1", "RC4", "M2", "CEL"], _ids   # [L02-NO-WALK2] + [L02-NO-BOARD]: no board page left; [L02-RC-FIG] the car screen before I3; [L02-RC2] / [L02-RC3] / [L02-RC4] the next legs after I3, P1 and M1
# ---- [L02-NO-G1] the guided question G1 ("माधव और माँ ने सबसे पहले क्या किया?", the review deck's "page 10") is REMOVED from
# the lesson (user, 2026-09-27). The guided phase now opens with the find-Madhav page G2 straight after the last story page:
# the engine shows the guided transition screen on the phase change T9 → G2 exactly as it did before G1. G1's own assets
# (scene_1.webp, vo_q_khana.ogg) stay on disk, unused; every other asset it used is shared with later pages.
g1 = next(s for s in card["slides"] if s["id"] == "G1")
assert g1["type"] == "STORY_QUESTION", "G1 is not the guided picture question any more"
card["slides"].remove(g1)
assert [s["id"] for s in card["slides"][8:11]] == ["T9", "G2", "G3"], "after the removal the guided phase must open with G2"
# ---- [L02-T5-PIC] (2026-10-03, user request) page 6 (T5, "उसने दीवार पर चित्र बनाए।") shows the user's new picture — the boy drawing a
# car, a sun, flowers and stars on the wall with a green crayon, the crayon box by his feet (_reskin_build/story_5_source.png,
# 1447x1087) — in place of the designer's story_5. Cut like the other story pictures: the picture's full width at the 1380:708 aspect
# of story_1..9.webp (the 468x244 bar fills it with object-fit cover), the window placed so the boy is whole — his hair and his feet
# with a small margin (rows STORY5_TOP .. STORY5_TOP + 742 of 1087; the picture frames at the top and the crayons on the floor are
# trimmed, nothing of the boy is) — resized to 1380x708 and encoded like every other picture here (WEBP q88). The alt text
# "माधव क्रेयॉन से दीवार पर चित्र बना रहा है।" describes this picture as well, so the card is unchanged. Remade when the source is newer.
STORY5_TOP = 171
def story_cut(n, src, top):
    s = os.path.join(SCR, src); d = os.path.join(CUR, "assets", "Images", "story_%d.webp" % n)
    assert os.path.exists(s), "missing " + s
    if os.path.exists(d) and os.path.getmtime(d) >= os.path.getmtime(s): return
    from PIL import Image
    im = Image.open(s).convert("RGB"); W, H = im.size; h = int(round(W * 708 / 1380))
    top = max(0, min(top, H - h))
    im.crop((0, top, W, top + h)).resize((1380, 708), Image.LANCZOS).save(d, "WEBP", quality=88, method=6)
    print("wrote", d, "rows %d-%d of %d" % (top, top + h, H))
story_cut(5, "story_5_source.png", STORY5_TOP)
# ---- [L02-T6-PIC] (2026-10-03, user request) page 7 (T6, "उसने किताब पढ़ी।") shows the user's new picture — the boy sitting cross-legged
# on the rug reading a rocket picture book, other books and toys scattered around him (_reskin_build/story_6_source.png, 1672x941) —
# in place of the designer's story_6. Same cut as T5: full width at 1380:708 = 858 of the 941 rows; the 83 rows dropped are taken from
# the top (blurred wall and ceiling) so every scattered book on the floor stays in frame (rows 83-941). The alt text
# "माधव एक किताब पढ़ रहा है, बाकी किताबें बिखरी हैं।" describes this picture as well, so the card is unchanged.
STORY6_TOP = 83
story_cut(6, "story_6_source.png", STORY6_TOP)
# ---- [L02-T7-PIC] (2026-10-08, user request) page 7 (T7, "वह खिलौनों से खेलने लगा।") shows the user's new picture — the boy sitting
# cross-legged on the striped rug, a toy plane in one raised hand and a red car in the other, teddy, blocks, dump truck, dinosaur, ball and
# train around him (_reskin_build/story_7_source.png, 1454x1082) — in place of the picture it had. Same cut as T5 / T6: the full width at
# 1380:708 = 746 of the 1082 rows, the window placed so the boy is whole — his hair (row 201) with a 21-row margin above, his feet well
# inside — so the rocket poster at the top and the lowest toys (the truck's wheels, the train track) are trimmed (rows 180-926). The
# alt text stays (it describes a boy playing with his toys), so the card is unchanged.
STORY7_TOP = 180
story_cut(7, "story_7_source.png", STORY7_TOP)
# ---- [L02-T8-PIC] (2026-10-08, user request) page 8 (T8, "खेलते-खेलते उसे नींद आने लगी।") shows the user's new picture — the boy
# sitting cross-legged on the striped rug yawning, eyes shut, a hand at his mouth, the red car in the other hand, teddy, blocks, dump
# truck, dinosaur, ball and train around him (_reskin_build/story_8_source.png, 1452x1083) — in place of the picture it had. Same cut as
# T5 / T6 / T7: the full width at 1380:708 = 745 of the 1083 rows, the window placed so the boy is whole — his hair (row 153) with a
# 21-row margin above, his feet (row 838) well inside — so the rocket poster at the top and the lowest toys (the truck's wheels, the
# train, the blocks on the floor) are trimmed (rows 132-877). The alt text "माधव खेलते-खेलते जम्हाई ले रहा है।" describes this
# picture exactly, so the card is unchanged.
STORY8_TOP = 132
story_cut(8, "story_8_source.png", STORY8_TOP)
for n in range(1, 10):
    assert os.path.exists(os.path.join(CUR, "assets/Images/story_%d.webp" % n)), "missing story_%d.webp" % n
for k in aud:
    assert os.path.exists(os.path.join(CUR, aud[k])), "missing audio " + aud[k]
# ---- [L02-BGM-DUCK] (2026-10-04, user request) "From Page 1 T1 to Page 17 M2 apply this music in the background in a low volume and such
# that it doesn't make disturbance, and whenever any VO or any sound effect is played on any page the volume of this background music should
# be reduced to the minimal level; rest keep everything exactly the same." The user's Downloads\Standard Background Music 2.mp3 (4:00, 256 kbps
# stereo 48 k, -16.2 LUFS) — the very track the deployed reference lesson HI02H04_L01_S01 runs under its pages since 2026-10-02 ([BGM-DUCK]) —
# is copied to _reskin_build/bgm_standard_2_source.mp3 and re-encoded like the reference's bed (libmp3lame 128 kbps, 48 k stereo; the
# reference's file: 128 kbps, -16.6 LUFS) to assets/Audio/bgm_standard_2.mp3 (remade only when the source is newer: the mp3 is NOT a
# registered clip — it is the bed's own element, so the ogg churn rule does not apply). The behaviour is _reskin_build/bgm_duck.js, the
# reference's block ported with the range taken from the card: `card.bgm` = {src, first = 0 (T1), last = the index of M2, landing: True (the
# user's "Page 1" is the landing — the bed starts there, or on the first tap where the browser refuses autoplay), base 0.13, duck 0.03}.
# The celebration (the slide after M2) has no bed. The block is appended LAST to app.js (its mountSlide wrapper must be outermost).
# Nothing else changes: no caller, no VO, no sfx, no timing — the ducking wraps HTMLMediaElement.play and the WebAudio source nodes.
BGM_SRC = os.path.join(SCR, "bgm_standard_2_source.mp3"); BGM_DST = os.path.join(CUR, "assets", "Audio", "bgm_standard_2.mp3")
assert os.path.exists(BGM_SRC), "missing " + BGM_SRC
if not os.path.exists(BGM_DST) or os.path.getmtime(BGM_DST) < os.path.getmtime(BGM_SRC):
    ff("-y", "-i", BGM_SRC, "-vn", "-c:a", "libmp3lame", "-b:a", "128k", "-ar", "48000", "-ac", "2", BGM_DST)
    assert os.path.exists(BGM_DST), "ffmpeg did not write " + BGM_DST
    print("wrote", BGM_DST, os.path.getsize(BGM_DST), "bytes")
_ids = [s["id"] for s in card["slides"]]
assert _ids[0] == "T1" and _ids[-2] == "M2" and _ids[-1] == "CEL", "the bed's range T1..M2 does not fit the slide order: %r" % _ids
card["bgm"] = {"src": "assets/Audio/bgm_standard_2.mp3", "first": 0, "last": _ids.index("M2"), "landing": True, "base": 0.13, "duck": 0.03}
# ---- [L02-VO-BATCH] wiring (2026-10-06): the recorded lines in their places (the clips + texts are registered where they are made, above).
# I1's three sentence options speak their sentences (vo_p1_khana, vo_opt_kitab_padhi, vo_opt_khilono_se_khela — the words it shows; the
# one-word clips vo_opt_khana / book / toys spoke "खाना / किताब / खिलौने"), I2's three place options theirs (vo_opt_khilono_ke_beech /
# palang_par / kursi_par for "खिलौनों के बीच / पलंग पर / कुर्सी पर"; vo_opt_toys / bed / chair said "खिलौने / बिस्तर / कुर्सी"). Every
# question page's reveal (the third wrong tap: the engine speaks audio.reveal while the answer pulses — mountTapOptions revealAnswer; the
# sentence pages let that call through) is its own deck line "… यह सही उत्तर है, इसपर टैप कीजिए।" instead of the generic vo_q_reveal.
# RC1 (the first car screen) opens with the deck's "अब आप बताइए कि माधव की कहानी में क्या-क्या हुआ?" (data.rc.intro, RC1 only — the later
# car screens are copies made before this line is set): adapt.js applyRC speaks it through the engine's play() and the car sets off
# start_ms after it ends. This block runs BEFORE the card is serialised into index.html (card_json, next line). Checked at the end: the lines the lesson speaks are exactly the batch's 61 ([L02-VO-MANIFEST]).
_by_id = {s["id"]: s for s in card["slides"]}
for _sid, _ids in (("I1", ["vo_p1_khana", "vo_opt_kitab_padhi", "vo_opt_khilono_se_khela"]), ("I2", ["vo_opt_khilono_ke_beech", "vo_opt_palang_par", "vo_opt_kursi_par"])):
    _opts = _by_id[_sid]["data"]["options"]; assert len(_opts) == 3, _sid
    for _o, _id in zip(_opts, _ids): _o["audio"] = _id
assert [o["label_hi"] for o in _by_id["I1"]["data"]["options"]] == ["माधव ने खाना खाया ।", "माधव ने किताब पढ़ी ।", "माधव ने खिलौनों से खेला ।"]
assert [o["label_hi"] for o in _by_id["I2"]["data"]["options"]] == ["खिलौनों के बीच ।", "पलंग पर ।", "कुर्सी पर ।"]
for _sid, _rid in (("G3", "vo_reveal_khel"), ("I1", "vo_reveal_khana"), ("I2", "vo_reveal_khilone_beech"), ("I3", "vo_reveal_sula"), ("P1", "vo_reveal_utha"), ("M1", "vo_reveal_kitab"), ("M2", "vo_reveal_thak")):
    assert _by_id[_sid]["audio"].get("reveal") == "vo_q_reveal", (_sid, _by_id[_sid]["audio"])
    _by_id[_sid]["audio"]["reveal"] = _rid
assert "intro" not in _by_id["RC1"]["data"]["rc"] and all("intro" not in _by_id[k]["data"]["rc"] for k in ("RC2", "RC3", "RC4"))
_by_id["RC1"]["data"]["rc"]["intro"] = "vo_rc_intro"
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
assert gate.count(' src="assets/UI/peeking_pal.webp"') == 1, "[L02-STD-GATE] gate img anchor"
gate = gate.replace(' src="assets/UI/peeking_pal.webp"', '', 1)   # [L02-STD-GATE] no art at rest: adapt.js hands the <img> the standard transition animation at each gate

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
    centred 1.75 below centre with a 2px stroke, stem down to +15, base 8 wide (+round caps) at +15. s = chip disc height / 61.
    [L02-READ-ALOUD] (2026-10-03) each part carries class="mic" and the glyph is followed by the chip art's sound wave — the
    reference's <g class="mic-wave"> (five white level bars 2.2 wide, 8/14/18/14/8 tall, 3.5 apart, centred on the disc centre;
    invisible until the read-aloud beat, CSS) — scaled by kb = this mic's height / the reference mic's (21.75 units), so the wave
    has the weight of the mic it replaces (kb = 1.00 on the 44-unit header / landing discs, 0.82 on the story page's 36-unit disc)."""
    f = lambda v: ("%.2f" % v).rstrip("0").rstrip(".")
    X = lambda x: f(cx + s * x); Y = lambda y: f(cy + s * y); L = lambda v: f(s * v)
    mic = ('<path class="mic" d="M%s %sa%s %s 0 0 1 %s %sv%sa%s %s 0 0 1-%s 0v-%sA%s %s 0 0 1 %s %sZ" fill="white"/>'
            % (X(0), Y(-15.2), L(5.75), L(5.75), L(5.75), L(5.75), L(10.7), L(5.75), L(5.75), L(11.5), L(10.7), L(5.75), L(5.75), X(0), Y(-15.2))
            + '<path class="mic" d="M%s %sa%s %s 0 0 0 %s 0" stroke="white" stroke-width="%s" stroke-linecap="round" fill="none"/>'
            % (X(-8.25), Y(1.75), L(8.25), L(8.25), L(16.5), L(2))
            + '<path class="mic" d="M%s %sV%sM%s %sH%s" stroke="white" stroke-width="%s" stroke-linecap="round" fill="none"/>'
            % (X(0), Y(10), Y(15), X(-4), Y(15), X(4), L(2)))
    kb = (30.2 * s) / 21.75
    bars = []
    for xc, h in ((24.0, 8.0), (27.5, 14.0), (31.0, 18.0), (34.5, 14.0), (38.0, 8.0)):
        w, hh = 2.2 * kb, h * kb
        bars.append('<rect x="%s" y="%s" width="%s" height="%s" rx="%s"/>' % (f(cx + (xc - 31) * kb - w / 2), f(cy - hh / 2), f(w), f(hh), f(w / 2)))
    return mic + '<g class="mic-wave" fill="white">' + "".join(bars) + '</g>'
_SPK_GLYPH = re.compile(r'<path d="M29\.8466 .*?33\.3868 21\.5044Z" fill="white"/>')
assert len(_SPK_GLYPH.findall(index_html)) == 2 and len(_SPK_GLYPH.findall(app_js)) == 1, "speaker glyph anchors changed"
index_html = _SPK_GLYPH.sub(lambda m: _mic_glyph(44 / 61), index_html)   # header + landing chips
app_js     = _SPK_GLYPH.sub(lambda m: _mic_glyph(36 / 61), app_js)       # story-page chip

wr(os.path.join(CUR, "style.css"), style_css)
wr(os.path.join(CUR, "app.js"), app_js)
wr(os.path.join(CUR, "index.html"), index_html)
print("wrote", len(style_css), len(app_js), len(index_html))

# ---- [L02-VO-MANIFEST] (2026-10-06, user request) "Regenerate and replace the current manifest file; all the dialogues of this file should
# be there." The fleet's VO manifest is the workbook beside a lesson's HTML (the reference's HI02H04_L01_S01/VO_Manifest.xlsx, 2026-09-22;
# the same file sits at the FLN root): one sheet "VO Manifest", two columns Audio ID | Script, the header Calibri 12 bold white on #1F3864,
# the ids in Consolas 11, the scripts in Calibri 12, every cell vertically centred, widths 26 / 118, the header row frozen, an autofilter over
# the table — the recording script handed to the voice team, whose batch comes back as <Audio ID>.wav (voiceovers_batch.zip). This lesson had
# none, so it is written here as HI02H04_L02_S01_dist/VO_Manifest.xlsx. First pass (same day): every line the lesson SPEAKS, from the
# finished card, in play order. Second pass (2026-10-06, user: "based on the new changes I have made in this file, the manifest you are
# generating is containing the old dialogues — update it as per the latest dialogues"): the lines now come from the user's LATEST review
# deck, Bindu's File/HI02H04_L02_S01_review (1).pptx (2026-10-04 14:22; the same text as Downloads/HI02H04_L02_S01_review.pptx of
# 2026-10-03; its on-slide text is dumped to _reskin_build/deck_dialogues_2026-10-04.json for the next diff), read page by page and laid
# out in the lesson's play order (MANIFEST below). Where the deck gives a line it wins over the card's text (CHANGED: the welcome's
# punctuation, the first transition's new line, story sentences 3 / 4 / 8a / 8b, G2's prompt, G3's prompt and its "look at the picture"
# hint, I1's prompt and the "try again" hint, I3's correct line "शाबाश।", the celebration). Lines the deck does not mention keep the
# lesson's current words (the guided / practice transitions, every other "correct" line, G2's "शाबाश! सही जगह।"). Lines the deck adds get
# new ids (NEW: the RC-car screen's opener, the seven page-specific "… यह सही उत्तर है, इसपर टैप कीजिए।" reveal lines that replace the
# generic vo_q_reveal, I1's sentence options — two of them are lines the lesson already has, vo_p1_khana and vo_opt_kitab_padhi — and I2's
# place options). The lines those replace are not listed (DROPPED: vo_q_reveal, vo_opt_khana / book / toys / bed / chair). The deck's
# "Hint 2: सभी options का vo आएगा" is a behaviour (the option lines play), not a line; "wiggle" hints have no VO. The card itself is NOT
# touched: its clips still speak the old words until the new recordings arrive — this manifest is the recording script for them. Still
# left out, as before: the registered leftovers of removed pages and the cue's dead fallback (no page plays them); sound effects and the
# music (no script). Every set is asserted against the card, and the engine's spoken ids against app.js's literals, so drift is loud.
# Rewritten only when its rows change (no churn). Third pass (2026-10-06, [L02-VO-BATCH]): the recordings arrived and are wired in, so
# the CHANGED / NEW / DROPPED sets are gone — the lesson now speaks exactly these 61 lines with exactly these words (asserted below).
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment
ENGINE_LINES = ["vo_landing", "vo_pt_tutorial", "vo_pt_guided", "vo_pt_practice", "vo_tap_speaker_sentence_story"]   # welcome, three gates, story cue
_lits = set(re.findall(r'["\'](vo_[A-Za-z0-9_]+)["\']', app_js)) & set(aud)
assert _lits == set(ENGINE_LINES) | {"vo_tap_speaker_sentence"}, "[L02-VO-MANIFEST] the engine's spoken lines changed: " + str(sorted(_lits))
def _vo_walk(o, out):
    if isinstance(o, str):
        if o in aud and o not in out: out.append(o)
    elif isinstance(o, dict):
        for v in o.values(): _vo_walk(v, out)
    elif isinstance(o, list):
        for v in o: _vo_walk(v, out)
_all_slide = []
for _s in card["slides"]: _vo_walk(_s, _all_slide)
_spoken = set(_all_slide) | set(ENGINE_LINES)                      # what the lesson plays today
assert len(_spoken) == 61 and len(aud) - len(_spoken) == 20, "[L02-VO-MANIFEST] expected 61 spoken lines of 81 registered: " + str((len(_spoken), len(aud)))
MANIFEST = VO_LINES                                                 # the lines are defined with the clips ([L02-VO-BATCH] above)
# [L02-VO-BATCH] (2026-10-06, third pass) the recordings of these 61 lines are in; the lesson speaks exactly them, with these words.
_ids = [k for k, _ in MANIFEST]
assert len(_ids) == len(set(_ids)) == 61, "[L02-VO-MANIFEST] 61 distinct lines expected: " + str(len(_ids))
assert set(_ids) == _spoken, "[L02-VO-MANIFEST] the lines the lesson speaks are not the manifest's: " + str(sorted(set(_ids) ^ _spoken))
for _k, _t in MANIFEST:
    assert _t == _t.strip() and " ।" not in _t and "  " not in _t and _t, "[L02-VO-MANIFEST] line text " + _k
    assert txt[_k] == _t and os.path.exists(os.path.join(CUR, aud[_k])), "[L02-VO-MANIFEST] " + _k
_man = os.path.join(CUR, "VO_Manifest.xlsx"); _new = list(MANIFEST)
_old = None
if os.path.exists(_man):
    try: _old = [(r[0], r[1]) for r in openpyxl.load_workbook(_man, read_only=True).active.iter_rows(min_row=2, values_only=True)]
    except Exception: _old = None
if _old != _new:
    _wb = openpyxl.Workbook(); _ws = _wb.active; _ws.title = "VO Manifest"
    _ws.append(["Audio ID", "Script"])
    for _k, _t in _new: _ws.append([_k, _t])
    _hdr = Font(name="Calibri", size=12, bold=True, color="FFFFFFFF"); _fill = PatternFill("solid", fgColor="FF1F3864"); _mid = Alignment(vertical="center")
    for _c in _ws[1]: _c.font = _hdr; _c.fill = _fill; _c.alignment = _mid
    for _r in _ws.iter_rows(min_row=2):
        _r[0].font = Font(name="Consolas", size=11); _r[0].alignment = _mid; _r[1].font = Font(name="Calibri", size=12); _r[1].alignment = _mid
    _ws.column_dimensions["A"].width = 26; _ws.column_dimensions["B"].width = 118
    _ws.freeze_panes = "A2"; _ws.auto_filter.ref = "A1:B%d" % (len(_new) + 1)
    _wb.save(_man); print("wrote", _man, len(_new), "lines")
else:
    print("VO_Manifest.xlsx unchanged:", len(_new), "lines")
