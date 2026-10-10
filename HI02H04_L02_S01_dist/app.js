/* HI02H04_L02_S01 — engine + FLN animation kit + layout patches, ported from HI02H04_L01_S01 in the same script order
   (the reference-lesson-only scripts are left out; STORY_READ_PAGE is this lesson's own tutorial module). */

/* ===== <script id="FLN-ANIMATION-KIT-CORE"> ===== */
/* ===== FLN ANIMATION KIT: core BEGIN ===== */
(function(){ "use strict";
  var M = window.FLNMotion = window.FLNMotion || {};
  M.still = function(){
    try{ return document.documentElement.classList.contains("no-anim") ||
      (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches); }
    catch(_){ return false; }
  };
  M.scale = function(){
    try{ return parseFloat(getComputedStyle(document.documentElement)
      .getPropertyValue("--scale")) || 1; }catch(_){ return 1; }
  };
  M.rect = function(r, sw){                    // screen rect -> stage coords (R1/R2)
    var s = M.scale();
    if(document.documentElement.classList.contains("rotated")){
      return { left:(r.top - sw.top)/s, top:(sw.right - r.right)/s, w:r.height/s, h:r.width/s };
    }
    return { left:(r.left - sw.left)/s, top:(r.top - sw.top)/s, w:r.width/s, h:r.height/s };
  };
  M.guard = function(fn){                      // R4
    try{ fn(); }catch(e){ try{ console.warn("[animation-kit]", e && e.message); }catch(_){} }
  };
  var _actx = null;
  M.audio = function(){
    try{
      var AC = window.AudioContext || window.webkitAudioContext; if(!AC) return null;
      _actx = _actx || new AC();
      if(_actx.state === "suspended") _actx.resume();
      return _actx;
    }catch(_){ return null; }
  };
  M.ready = function(fn){
    if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  };
})();
/* ===== FLN ANIMATION KIT: core END ===== */
/* ===== FLN ANIMATION KIT: still-mode BEGIN ===== */
/* activity adaptation (R5): this engine never set html.no-anim, so the kit's verification switch
   ?still=1 had nothing to key on. Sets the class that the reduced-motion CSS and M.still() read. */
(function(){ "use strict";
  var M = window.FLNMotion;
  M.guard(function(){
    if(/[?&]still=1(&|$)/.test(location.search)) document.documentElement.classList.add("no-anim");
  });
})();
/* ===== FLN ANIMATION KIT: still-mode END ===== */
;

/* ===== <script id="ENGINE (2026.07.16i-r4-unified + STORY_READ_PAGE)"> ===== */
const CARD = JSON.parse(document.getElementById('cardData').textContent);
  const AUDIO_EXT = (CARD.assets && CARD.assets.audio_ext) || "mp3";  // .mp3 (maths) / .ogg (Hindi FLN)
  const IMG_EXT   = (CARD.assets && CARD.assets.img_ext)   || "png";  // .png (working) / .webp (delivered/FLN) — twin of AUDIO_EXT (fixes A3)
  const ENGINE_VERSION = "2026.07.16i-r4-unified";  // ENGINE STAMP — the receipt (verify_bundle.py) asserts a built game carries THIS exact string; a stale/divergent engine → hard FAIL, so the wrong engine can never silently ship. BUMP IN LOCKSTEP with engine_guard.py + swiftpal_build.py + unified_build.py + verify_bundle.py on EVERY engine change (r2: drag/pattern feedback standard + PHASE_TRANSITION; r3c: off-white toybox bg, dual-coded counting options numeral+hand, full-body landing mascot, true-corner square/rect; r3d: Swiftie mouth-stops-when-silent (still frame), Arabic display numerals 1/2/3, landing shows full 1..n hand row, volume-chip aligned in header pill); r4: additive number-sequence path modules MEET_SEQUENCE + SEQUENCE_COMPLETE + SEQUENCE_NEXT (MTKGA01_L02_S04 "completes a number sequence within 20") — purely additive, existing lessons untouched. r4-landing (16c): landing recomposed to match reference — small corner mascot (230px, was 300), content re-centered (dropped padding-left:300 right-shift hack), VO chip moved from top-right to the mascot's shoulder (left:150/bottom:34, 58px). CSS-only; supersedes the 16b right-shift overlap fix.; 16d: TRUNK MERGE — unified the two diverged engine lines at base 12d: the 15e mechanics trunk (CONSERVE_COUNT + COUNT_ACTION + COUNT_DRAG_MATCH + ORDER_BY_WEIGHT + PICK_SET_BY_NUMBER, per_row/dense count-set grouping, bigNumCell numeral-only test options, title_first landing order) + the 16c r4 design trunk (boot loader, peek phase-transition, concept-strip landing, DS header, flat CTAs, sunburst/star-burst celebration, recomposed corner-mascot landing). Nothing dropped from either line. 16e: landing count-hero hand sizing FIXED — the .sg-hero sizing selectors never matched (template uses .sg-art); hands rendered natural-size, overflowing the card (title pushed outside the box, numeral-1 hidden behind the mascot — user-visible on MTKGA01_L02_S01). Retargeted to .sg-art .sg-hand/.sg-hand-cell/.sg-hand-num (112px; image-hero landings untouched). CSS-only. 16f: INTRO strip fit-or-wrap — old sizing assumed 1220px + a -100px breakout and punched wide strips (10 numerals, 7+ letters) through the tut-frame borders; now sized to the frame (960) and wrapping into two balanced rows below the 110px touch floor. Fixes MTKGA01_L02_S01 s00 (user-caught live) AND the HIKGH04_P2 letter-row daylight item.
  try { window.SWIFTPAL_ENGINE = ENGINE_VERSION; } catch(e){}
const $ = id => document.getElementById(id);

/* ---------- 1. SCALE THE 1333x750 STAGE ---------- */
function fit(){
  const vw = (window.visualViewport ? window.visualViewport.width  : document.documentElement.clientWidth)  || window.innerWidth;
  const vh = (window.visualViewport ? window.visualViewport.height : document.documentElement.clientHeight) || window.innerHeight;
  // contain-fit, scaling UP to fill the screen (no 1× cap, no margin) so a 16:9
  // viewport is covered edge-to-edge. Any leftover bars on non-16:9 are blue, not white.
  const s = Math.min(vw/1333, vh/750);
  document.documentElement.style.setProperty("--scale", s);
}
window.addEventListener("resize", fit);
window.addEventListener("load", fit);
if(window.visualViewport) window.visualViewport.addEventListener("resize", fit);
fit();

/* ---------- 2. SIGNAL BUS + OFFLINE TELEMETRY ---------- */
/* TELEMETRY: offline self-capture. Every signal is buffered to localStorage so
   the run survives a reload / works with NO host app. A full results record can
   be pulled via SwiftPAL.downloadResults() (or the ?dev=1 button on the end
   screen). If `endpoint` is set AND the device is online, the final record is
   also POSTed — left null so the lesson is fully offline by default. */
const TELEMETRY = {
  endpoint: null,   // e.g. "https://lrs.example.com/swiftpal" — null = offline only
  storageKey: "swiftpal:run:" + CARD.skill_code + "_" + (CARD.part_label || "P1")
};
const SwiftPAL = window.SwiftPAL = {
  signals: [],
  validatorReport: { missing_signals: [], errors: [], passed: false },
  firedSet: new Set(),
  startedAt: Date.now(),
  emit(name, payload){
    const evt = Object.assign({
      ts: Date.now(),
      skill_code: CARD.skill_code,
      lo_code: CARD.lo_code,
      signal: name
    }, payload || {});
    this.signals.push(evt);
    this.firedSet.add(name);
    try{ console.log("[signal]", name, evt); }catch(e){}
    try{ window.parent?.postMessage({type:"swiftpal:signal", payload: evt}, "*"); }catch(e){}
    this.persist();
  },
  /* full results record (used for download / POST / end-of-lesson dump) */
  exportResults(){
    const ms = (typeof state!=="undefined") ? state.masteryAttempts : 0;
    const mh = (typeof state!=="undefined") ? state.masteryHits : 0;
    return {
      skill_code: CARD.skill_code, lo_code: CARD.lo_code, part: CARD.part_label || null,
      started_at: this.startedAt, exported_at: Date.now(),
      mastery: { hits: mh, attempts: ms, score: ms ? mh/ms : 0 },
      validatorReport: this.validatorReport,
      signals: this.signals
    };
  },
  /* silent: flush the running buffer to localStorage (survives reload / offline) */
  persist(){
    try{ localStorage.setItem(TELEMETRY.storageKey, JSON.stringify(this.exportResults())); }
    catch(e){ /* private mode / quota — non-fatal, postMessage + memory still work */ }
  },
  /* pull the run as a JSON file (teacher/dev; not in the child's flow) */
  downloadResults(){
    try{
      const blob = new Blob([JSON.stringify(this.exportResults(), null, 2)], {type:"application/json"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = CARD.skill_code + "_" + (CARD.part_label||"P1") + "_results.json";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(()=> URL.revokeObjectURL(url), 1000);
    }catch(e){ console.error("[telemetry] download failed", e); }
  }
};

/* ---------- 3. AUDIO ---------- */
let isPlaying=false, currentAudio=null;
function setPlaying(on){
  // the dynamic Swiftie sits header-left; the audio chips pulse to signal playback. r4/F1: share the
  // .playing toggle across the header chip AND the tut-card replay chip (the header is hidden in the
  // tut frame, so the in-card .tut-audio is the only visible affordance and must react to VO too).
  isPlaying=on;
  document.querySelectorAll(".audio-chip, .tut-audio").forEach(c => c.classList.toggle("playing", on));
  const v=$("sgVo"); if(v) v.classList.toggle("playing",on);   // landing speaker waves animate during landing VO
  document.body.classList.toggle("vo-playing", !!on);
  swApplyPose();
}
function stopAudio(){
  if(currentAudio){ try{ currentAudio.pause(); }catch(e){} currentAudio=null; }
  setPlaying(false);
}
/* play(src, onEnd): real MP3 if path exists; silent 1.5s beat if missing/blocked. */
function play(src, onEnd){
  stopAudio(); setPlaying(true);
  let done=false; const fire=()=>{ if(done)return; done=true; setPlaying(false); if(onEnd) onEnd(); };
  if(src){
    const a=new Audio(src); currentAudio=a;
    a.onended=fire;
    a.onerror=()=>{ currentAudio=null; setTimeout(fire, 1200); };
    a.play().catch(()=>{ currentAudio=null; setTimeout(fire, 1200); });
  } else { setTimeout(fire, 800); }
}
/* playSfx(id): fire-and-forget sound effect on its OWN Audio element so it can
   overlap the spoken VO (does NOT touch currentAudio / the play() chain).
   Silently no-ops if the file is missing or playback is blocked. */
function playSfx(id){
  if(!id) return;
  try{
    const a = new Audio("assets/Audio/" + id + "." + AUDIO_EXT);
    a.volume = 0.7;
    a.play().catch(()=>{});
  }catch(e){}
}
/* ---------- game-feel: procedural SFX (no audio files) + success particle burst ----------
   WebAudio resumes on the first user tap (autoplay policy), so taps/answers always sound. */
let _juiceAC = null;
function _ac(){ if(!_juiceAC){ try{ _juiceAC = new (window.AudioContext || window.webkitAudioContext)(); }catch(e){} }
  if(_juiceAC && _juiceAC.state === "suspended"){ try{ _juiceAC.resume(); }catch(e){} } return _juiceAC; }
function _tone(freqs, type, dur, vol){ const c = _ac(); if(!c) return; const t0 = c.currentTime;
  freqs.forEach((f, i)=>{ const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.value = f;
    const t = t0 + i*(dur/freqs.length); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t+0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur/freqs.length); o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur/freqs.length); }); }
const sfxTap       = ()=> _tone([520], "sine", 0.09, 0.09);
const sfxCorrect   = ()=> (window.stdSfx || playSfx)("sfx_correct_feedback");   // [L02-STD-SFX] the standard correct clip (was a synthesized rising arpeggio)
const sfxWrongSoft = ()=> (window.stdSfx || playSfx)("sfx_incorrect_feedback");   // [L02-STD-SFX] the standard incorrect clip (was a soft two-note buzz)
/* a joyful star/confetti pop, centred on the play stage (upper-middle) */
function burstStars(){ const stage = document.querySelector(".slide-stage") || document.body;
  const cx = stage.offsetWidth/2, cy = stage.offsetHeight*0.38, emo = ["⭐","✨","🌟","💫","🎉"];
  for(let i=0;i<14;i++){ const s = document.createElement("span"); s.className = "spark"; s.textContent = emo[i % emo.length];
    const ang = (Math.PI*2)*(i/14) + Math.random()*0.5, dist = 70 + Math.random()*110;
    s.style.left = cx + "px"; s.style.top = cy + "px";
    s.style.setProperty("--dx", (Math.cos(ang)*dist).toFixed(0) + "px");
    s.style.setProperty("--dy", (Math.sin(ang)*dist).toFixed(0) + "px");
    s.style.animationDelay = (i*10) + "ms"; stage.appendChild(s); setTimeout(()=> s.remove(), 950); } }
/* Persistent header mascot (reference parity, HI01H01_L02_S05 setSwMood): the resting face is the
   STATIC talking head; every reaction (celebrate / tryagain / hint) plays its *_anim.webp, with
   celebrate cache-busted so the play-once animation replays on every correct answer. */
const SW_HEAD = { talk:"talking", point:"talking", idle:"talking", happy:"celebrate", celebrate:"celebrate",
                  tryagain:"tryagain", hint:"hint", teach:"hint", idea:"hint" };
let swMood = "point";
function swApplyPose(){ /* the reference head is not driven by the audio state */ }
function setSwMood(m){ swMood = m;
  const img = document.getElementById("mascotImg"); if(!img) return;
  const expression = SW_HEAD[m] || "talking";
  const animated = expression !== "talking";
  const bust = (animated && expression === "celebrate") ? ("?r=" + ((typeof state !== "undefined" && state.slideStart) || 1)) : "";
  img.onerror = () => { img.onerror = null; img.src = "assets/UI/mascot.webp"; };
  img.src = "assets/UI/sw_head_" + expression + (animated ? "_anim" : "") + ".webp" + bust;
}
/* CONFETTI BURST — reference standard (MTKGA02_L01_S02_Sorting_Objects_GOLDEN via कहानी–तोता): 100 modest
   10x10 pieces FALL from the top of the stage for 3s; only position, colour and start delay vary. The wrap
   self-removes and afterConfetti() waits for it, so the next slide arrives once the confetti has landed. */
function confettiCannon(){
  const stage = document.querySelector(".stage-inner") || $("stage");
  if(!stage) return;
  const wrap = document.createElement("div"); wrap.className = "fx-confetti";
  const colors = ["#FCB717","#386AF6","#E55B49","#21A74A","#7048D6","#FF7AC6","#2BC4D8"];
  for(let i=0;i<100;i++){
    const p = document.createElement("i");
    p.style.left = (Math.random()*100) + "%";
    p.style.background = colors[i % colors.length];
    p.style.animationDelay = (Math.random()*0.9) + "s";
    wrap.appendChild(p);
  }
  stage.appendChild(wrap);
  setTimeout(()=>{ wrap.remove(); }, 3600);
}
/* ---------- Block Town helpers (flagship) ---------- */
const BT_COLORS = ["#F9695E","#FDC23C","#4EBE6A","#4EA3F0","#9B7BE8"];
function btBlock(i){ const b = document.createElement("div"); b.className = "blk"; b.style.background = BT_COLORS[i % BT_COLORS.length]; return b; }
function btThunk(n){ _tone([360 + n*46], "sine", 0.12, 0.10); }   // pitch climbs one step per block — HEAR the count
function btDust(plot){ const d = document.createElement("span"); d.className = "bt-dust"; d.textContent = "💨"; plot.appendChild(d); setTimeout(()=> d.remove(), 520); }
function btSkyline(done, total){ const s = document.createElement("div"); s.className = "bt-skyline";
  for(let i=0;i<total;i++){ const b = document.createElement("div"); b.className = "bt-bldg" + (i < done ? " done" : "");
    b.style.height = (26 + ((i*17) % 32)) + "px"; s.appendChild(b); } return s; }
/* the teach scene: the crane drops N blocks ONE AT A TIME (ascending thunk + spoken count) then a
   cardinality "freeze" (vo_total_N). Reached from MEET_NUMBER via data.present==='crane'. */
function btCraneMeet(host, slide){
  const d = slide.data, N = d.count;
  state.ownsAudio = true;   // the crane drops+counts blocks on its own timed VO — skip autoPlayChain
  const stage = document.createElement("div"); stage.className = "bt-stage";
  const board = document.createElement("div"); board.className = "bt-board";
  board.innerHTML = `<span class="bt-numeral">${N}</span>` + (d.word ? `<span class="bt-goallbl">${d.word}</span>` : "");   // Arabic numeral (from the integer, not card Devanagari)
  const track = document.createElement("div"); track.className = "bt-track"; const cells = [];
  for(let i=1;i<=N;i++){ const c = document.createElement("div"); c.className = "bt-nt"; track.appendChild(c); cells.push(c); }
  const yard = document.createElement("div"); yard.className = "bt-yard";
  const crane = document.createElement("div"); crane.className = "bt-crane"; crane.innerHTML = `<img src="assets/Images/obj_crane.png" alt="">`;
  const plotwrap = document.createElement("div"); plotwrap.className = "bt-plotwrap";
  const plot = document.createElement("div"); plot.className = "bt-plot ground";
  plot.style.setProperty("--bh", Math.max(20, Math.min(46, Math.floor(230/N) - 2)) + "px");
  plotwrap.appendChild(plot); yard.appendChild(crane); yard.appendChild(plotwrap);
  stage.appendChild(board); stage.appendChild(track); stage.appendChild(yard);
  host.appendChild(stage);
  state.gateNavUntilAudio = false; setNavActive(false);
  $("navBtn").onclick = ()=> completeSlide(true);
  let i = 0;
  const step = ()=>{
    if(i >= N){ if(d.topper){ const t = document.createElement("div"); t.className = "bt-topper snap"; t.innerHTML = `<img src="assets/Images/${d.topper}.png" alt="">`; plot.appendChild(t); }
      burstStars(); play("assets/Audio/vo_total_" + N + "." + AUDIO_EXT, ()=> setNavActive(true)); return; }
    const b = btBlock(i); b.classList.add("drop"); plot.appendChild(b); i++;
    if(cells[i-1]){ cells[i-1].classList.add("lit"); cells[i-1].textContent = i; }
    btThunk(i); btDust(plot);
    play("assets/Audio/vo_num_" + i + "." + AUDIO_EXT, ()=> setTimeout(step, 340));
  };
  // play the slide prompt FIRST, then start the crane count sequence — so the count VO never cuts the
  // prompt off (we own the audio here; mountSlide's autoPlayChain is skipped via state.ownsAudio).
  play(audioFor(slide, "prompt") || null, ()=> setTimeout(step, 400));
}
/* slide audio path: per slide, we look at slide.audio.prompt / .phoneme / etc.
   In this v0.1 the embedded card holds short ids; the compiler would replace
   them with base64 data URIs. We resolve to assets/Audio/{id}.mp3 with fallback. */
function audioFor(slide, key){
  if(!slide.audio || !slide.audio[key]) return null;
  return "assets/Audio/" + slide.audio[key] + "." + AUDIO_EXT;
}
/* audioText(slide,key): the exact Hindi line the VO for this slot speaks, so a
   popup can SHOW what it SAYS (shown == spoken). Looks up the build-injected
   CARD.assets.audio_text map by the slot's audio_id. null if unknown. */
function audioText(slide, key){
  const id = slide.audio && slide.audio[key];
  if(!id) return null;
  return (CARD.assets && CARD.assets.audio_text && CARD.assets.audio_text[id]) || null;
}
/* Play a SEQUENCE of audio sources back-to-back. Each one finishes (or
   falls back to silent beat if missing) before the next starts. */
function playChain(srcs, i, onDone){
  i = i || 0;
  if(i >= srcs.length){ if(onDone) onDone(); return; }
  play(srcs[i], () => playChain(srcs, i+1, onDone));
}
/* On slide mount, play prompt → phoneme/word_name → instruction in order.
   KG learners can't read prompt_hi — the chain gives them both the
   instruction AND the cue (letter sound or picture name) audibly.
   onDone fires after the whole chain finishes (used to gate the नav button). */
function autoPlayChain(slide, onDone){
  const order = ["prompt","phoneme","shape_name","word_name","instruction"];
  const chain = [];
  for(const k of order){
    const src = audioFor(slide, k);
    if(src) chain.push(src);
  }
  if(chain.length) playChain(chain, 0, onDone);
  else if(onDone) onDone();
}

/* nav button: enable/disable the kit-style pill. When it becomes active (the
   activity is done) but the child doesn't tap आगे, the hand-nudge points at it. */
function setNavActive(on){
  const btn = $("navBtn");
  btn.disabled = !on;
  btn.classList.toggle("active", on);
  clearTimeout(state.navNudgeTimer);
  if(on) state.navNudgeTimer = setTimeout(nudgeNavBtn, 4500);
}
function nudgeNavBtn(){
  const btn = $("navBtn");
  if(!btn.classList.contains("active") || state.hintActive) return;
  const nh = $("nudgeHand");
  const r = btn.getBoundingClientRect();
  const sw = document.querySelector(".slide-stage").getBoundingClientRect();
  const scale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--scale")) || 1;
  nh.style.left = ((r.left - sw.left)/scale + r.width/scale/2 - 48) + "px";
  nh.style.top  = ((r.top  - sw.top )/scale + r.height/scale/2 - 6) + "px";
  nh.classList.add("show");
}

/* ---------- 4. STATE ---------- */
const state = {
  idx: 0,
  slideStart: Date.now(),
  attempts: 0,
  audioReplays: 0,
  hintUsed: false,
  nudgeUsed: false,
  scaffoldLevel: 0,   // 0 none, 1 nudge, 2 hint, 3 reveal
  selectedKey: null,
  locked: false,
  hintActive: false,
  masteryHits: 0,
  masteryAttempts: 0,
  nudgeTimer: null
};

/* ---------- 5. NUDGE ----------
   target may be a CSS selector OR an element. Used ONLY for flow guidance
   (e.g. the "listen" button / prompt) — never to point at the correct answer. */
function startNudge(slide, target){
  clearTimeout(state.nudgeTimer);
  if(!target) return;
  const ms = (CARD.scaffold_rules.nudge_timeout_ms || {})[slide.phase];
  if(!ms) return;
  state.nudgeTimer = setTimeout(()=>{
    if(state.locked || state.hintActive) return;
    const el = (typeof target === "string") ? document.querySelector(target) : target;
    if(!el) return;
    const nh = $("nudgeHand");
    const r = el.getBoundingClientRect();
    // reference the nudge's positioning context (.slide-stage), NOT the whole stage,
    // or the hand lands ~140px (header height) too low.
    const sw = document.querySelector(".slide-stage").getBoundingClientRect();
    const scale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--scale")) || 1;
    nh.style.left = ((r.left - sw.left)/scale + r.width/scale/2 - 48) + "px";
    nh.style.top  = ((r.top  - sw.top )/scale + r.height/scale - 30) + "px";
    nh.classList.add("show");
    state.nudgeUsed = true;
    state.scaffoldLevel = Math.max(state.scaffoldLevel, 1);
    SwiftPAL.emit("nudge_invoked", { slide_id: slide.id, phase: slide.phase });
  }, ms);
}
function stopNudge(){
  clearTimeout(state.nudgeTimer);
  $("nudgeHand").classList.remove("show");
}
/* Show the hand-nudge immediately on a specific element (INTRO uses it to guide
   tapping each letter). Finger points up; fingertip sits just inside the tile's
   lower edge. References .slide-stage (the nudge's positioning context). */
function pointNudgeAt(el){
  if(!el) return;
  const nh = $("nudgeHand");
  const r = el.getBoundingClientRect();
  const sw = document.querySelector(".slide-stage").getBoundingClientRect();
  const scale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--scale")) || 1;
  nh.style.left = ((r.left - sw.left)/scale + r.width/scale/2 - 48) + "px";
  // fingertip overlaps the lower part of the tile (close to it, not far below)
  nh.style.top  = ((r.top  - sw.top )/scale + r.height/scale - 56) + "px";
  nh.classList.add("show");
}

/* ---------- 7. HINT / FEEDBACK BOX ----------
   No button: the popup plays its VO, then auto-dismisses. onEnd runs after it
   closes (callers add a short pause there so the revealed answer shows). */
function showBox(emoji, text, theme, audioSrc, onEnd){
  // CORRECT: no popup (lead review) — confetti cannons from both sides + Swiftie cheer, then onEnd.
  if(theme === "correct"){
    sfxCorrect(); confettiCannon(); setSwMood("celebrate");
    play(audioSrc || null, ()=> setTimeout(()=>{ if(onEnd) onEnd(); }, 300));
    return;
  }
  state.hintActive = true;
  // wrong/hint/reveal keep a light card (mechanics use it for a short cue); Swiftie reacts too.
  // one-Swiftie rule: the popup shows the reacting Swiftie (animated), so HIDE the header buddy
  // while it's open — never two Swifties on screen at once (MoM flag).
  const swMap = { wrong:"sw_lg_tryagain", hint:"sw_lg_hint", reveal:"sw_lg_hint" };
  const sw = $("hintMascot");
  if(sw){ sw.style.display=""; sw.src = "assets/UI/" + (swMap[theme] || "sw_lg_talking") + ".webp"; }
  setSwMood(theme === "wrong" ? "tryagain" : "hint");
  $("hintBox").classList.remove("celebrate");
  sfxWrongSoft();
  const ht = $("hintText"); ht.textContent = text; ht.className = "hint-text " + theme;
  $("stage").classList.add("blurred");
  $("hintOverlay").classList.add("show");
  $("hintBtn").disabled = true;
  const hi = $("hintImg"); if(hi) hi.src = "assets/UI/hint_active.webp";
  const close = ()=>{
    $("hintOverlay").classList.remove("show");
    $("stage").classList.remove("blurred");
    state.hintActive = false;
    if(hi) hi.src = "assets/UI/hint.webp";
    if(!state.locked) $("hintBtn").disabled = false;
    if(onEnd) onEnd();
  };
  // auto-dismiss after the VO finishes (small buffer so it never just flashes)
  play(audioSrc, ()=> setTimeout(close, 300));
}

/* ---------- reveal hand (reference: Bandar port) — parented to .slide-stage, placed under the anchor and pushed
   past any label text sharing its column, clamped into the stage. ---------- */
function _placeRevealHand(el, nh){
  if(!el || !el.getBoundingClientRect) return;
  var r = el.getBoundingClientRect();
  var sw = document.querySelector(".slide-stage").getBoundingClientRect();
  var scale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--scale")) || 1;
  nh.style.left = ((r.left - sw.left)/scale + r.width/scale/2 - 48) + "px";
  var HAND_H = 96, GAP = 4, stageH = sw.height/scale;
  var top = (r.top - sw.top)/scale, hh = r.height/scale;
  var below = top + hh + GAP;
  var _tile = el.closest(".opt-cell, .q-cell") || el.parentElement;
  if(_tile){
    _tile.querySelectorAll(".lbl, .opt-label, .story-q-opt-label, .pic-label, .count-badge")
      .forEach(function(t){
        var tr = t.getBoundingClientRect();
        if(tr.width < 2 || tr.height < 2) return;
        if(tr.right < r.left || tr.left > r.right) return;
        var tb = (tr.bottom - sw.top)/scale;
        if(tb > below - HAND_H && tb + GAP > below) below = tb + GAP;
      });
  }
  if(below + HAND_H > stageH) below = Math.max(0, stageH - HAND_H);
  nh.style.top = below + "px";
}
function showRevealHand(grid, cell){
  if(!cell) return;
  var stage = document.querySelector(".slide-stage");
  if(!stage) return;
  var old = stage.querySelector(".reveal-hand"); if(old) old.remove();
  var hd = document.createElement("img");
  hd.className = "reveal-hand"; hd.src = "assets/UI/nudge_hand_new.svg"; hd.alt = "";
  hd.onerror = function(){ this.style.display = "none"; };
  stage.appendChild(hd);
  _placeRevealHand(cell, hd);
  requestAnimationFrame(function(){ if(hd.parentNode) _placeRevealHand(cell, hd); });
}

/* ---------- 8. TAP-OPTION HELPER (shared by 5 slide types) ---------- */
function mountTapOptions({slide, host, signalName, stimulus, options, isCorrect, optionRenderer, columnsHint, mastery, hintAction, nudgeTarget, shuffle}){
  state.attempts = 0; state.selectedKey = null; state.locked = false;
  state.audioReplays = 0; state.hintUsed = false; state.nudgeUsed = false; state.scaffoldLevel = 0;
  // idle hand-nudge target: defaults to the stimulus (re-listen), but a slide can pass
  // nudgeTarget:null to suppress it entirely (e.g. "how many?" — nothing to re-tap).
  const _nudge = (nudgeTarget !== undefined) ? nudgeTarget : (stimulus || null);
  // optional custom hint (runs on the live slide instead of a text popup), e.g. a
  // count-demonstration. Wrapped to block option taps while it plays.
  const runHint = hintAction ? (after)=>{ state.hintActive = true; hintAction(()=>{ state.hintActive = false; if(after) after(); }); } : null;

  // Shuffle options once so the correct answer isn't pinned to one position (engine-wide anti
  // positional-bias — otherwise "always tap the same spot" can pass mastery). Opt out with
  // shuffle:false for inherently-ordered options (e.g. a number line).
  const _opts = (shuffle === false) ? options.slice()
    : (function(a){ a = a.slice(); for(let i=a.length-1;i>0;i--){ const j=(Math.random()*(i+1))|0; [a[i],a[j]]=[a[j],a[i]]; } return a; })(options);

  const wrap = document.createElement("div"); wrap.className = "q-row";
  if(stimulus){ wrap.appendChild(stimulus); }
  const grid = document.createElement("div");
  const cols = columnsHint || (_opts.length <= 2 ? 2 : _opts.length <= 3 ? 3 : 4);
  grid.className = "opt-grid cols-" + cols;
  _opts.forEach((opt, i) => {
    const cell = optionRenderer(opt, i);
    cell.classList.add("opt-cell");
    cell.dataset.key = String(i);
    cell.onclick = ()=>{
      if(state.locked || state.hintActive || cell.classList.contains("crossed") || cell.classList.contains("correct")) return;
      stopNudge();
      // SME rule: SPEAK THE TAPPED WORD on EVERY tap (right or wrong), then the feedback — never two
      // voices at once (buzz/confetti are sfx, they ride alongside the word). opt.audio = word clip id.
      // Fallback wiring for LETTER options (SME: the tapped item's own sound speaks EVERYWHERE): options
      // authored as {letter:"आ"} carry no audio id, but the slide's data.phonemes map has each letter's
      // clip — derive it here centrally so every TAP_LETTER_* / mastery module inherits speak-on-tap
      // without per-module or per-card changes. Explicit opt.audio always wins.
      const _aid = opt.audio ||
                   (opt.letter && slide.data && slide.data.phonemes && slide.data.phonemes[opt.letter]) || null;
      const _word = _aid ? ("assets/Audio/" + _aid + "." + AUDIO_EXT) : null;
      const _afterWord = (cb)=>{ if(_word) play(_word, cb); else cb(); };
      if(isCorrect(opt, i)){
        state.locked = true; cell.classList.add("correct"); if(window.FLNMotion) FLNMotion.correctSelect.play(cell); /* FLN ANIMATION KIT: correct-select */ sfxCorrect(); confettiCannon(); setSwMood("happy");
        if(mastery){ state.masteryAttempts++; if(state.attempts === 0) state.masteryHits++; }
        SwiftPAL.emit(signalName, { slide_id: slide.id, phase: slide.phase, value: true,
          first_try: state.attempts === 0, attempts: state.attempts + 1,
          scaffold_level: state.scaffoldLevel, latency_ms: Date.now()-state.slideStart });
        // [VO-BATCH] audio.correct (the SME's शाबाश line, where one was recorded) follows the word; then advance (confetti is the reward)
        _afterWord(()=>{ const _ok = audioFor(slide, "correct"), _adv = ()=> setTimeout(()=>{ if(CARD.slides[state.idx] === slide) completeSlide(true); }, 700);   /* [L02-Q10-FIG] only its own slide */
          if(_ok) play(_ok, _adv); else _adv(); });
      } else {
        state.attempts++; cell.classList.add("crossed"); sfxWrongSoft(); setSwMood("tryagain");
        // reference: a ~1s RED GLOW on the tapped wrong card (5px red border + pink pulse), then it reads normal again
        if(window.FLNMotion) FLNMotion.wrongSelect.play(cell);   /* FLN ANIMATION KIT: wrong-select - the kit beat replaces the 1s red glow below */
        else (function(_c){ _c.classList.add("opt-redglow-1s"); setTimeout(function(){ _c.classList.remove("opt-redglow-1s"); }, 1000); })(cell);
        // (do NOT count masteryAttempts here — the correct branch counts one attempt PER ITEM.)
        SwiftPAL.emit("answer_wrong", { slide_id: slide.id, phase: slide.phase, attempts: state.attempts });
        // LAYERED SCAFFOLD (A1): L1 re-listen → L2 hint → L3 REVEAL at max_attempts (never stuck).
        const _maxA = (CARD.scaffold_rules && CARD.scaffold_rules.max_attempts) || 3;
        _afterWord(()=>{   // speak the tapped word FIRST, then the layered feedback VO (no overlap)
          if(state.attempts >= _maxA){ revealAnswer("wrong"); return; }
          // reference parity: after the feedback line the card returns to normal and the child may try again
          const _uncross = ()=>{ if(!state.locked){ cell.classList.remove("crossed"); setSwMood("talk"); } };
          if(state.attempts >= 2){ state.scaffoldLevel = Math.max(state.scaffoldLevel, 2);
            if(runHint) runHint(_uncross); else play(audioFor(slide, "hint") || audioFor(slide, "try_again") || null, _uncross); }
          else { state.scaffoldLevel = Math.max(state.scaffoldLevel, 1); play(audioFor(slide, "try_again") || null, _uncross); }
        });
      }
    };
    grid.appendChild(cell);
  });
  wrap.appendChild(grid);
  host.appendChild(wrap);

  // ---- layered-hint helpers (A1/B2): reveal-on-max + a wired manual hint button ----
  function _correctCell(){ return [...grid.querySelectorAll(".opt-cell")].find(c => isCorrect(_opts[+c.dataset.key], +c.dataset.key)); }
  function revealAnswer(reason){
    if(state.locked) return; state.locked = true; state.scaffoldLevel = 3; setSwMood("hint");
    const el = _correctCell();
    // reference reveal: decoys blur out and go dead, the answer carries the green guide-pulse + the pointing hand
    [...grid.querySelectorAll(".opt-cell")].forEach(c => { c.classList.remove("crossed"); if(c !== el) c.classList.add("opt-dim"); });
    if(el){ el.classList.add("opt-guided"); showRevealHand(grid, el); }
    SwiftPAL.emit("answer_revealed", { slide_id: slide.id, phase: slide.phase, attempts: state.attempts, reason });
    // TAP-GATED REVEAL: after the reveal VO the slide WAITS. The correct option keeps its guide-pulse + the
    // pointing hand and the dimmed decoys stay inert; ONLY the child's tap on the guided option advances
    // (no auto-advance). The tap speaks the option's own clip, then completes the slide as a revealed answer.
    play(audioFor(slide, "reveal") || audioFor(slide, "correct") || audioFor(slide, "try_again") || null, ()=>{});
    if(!el){ setTimeout(()=> completeSlide(false), 800); return; }   // no resolvable answer cell → previous behaviour
    el.addEventListener("click", function onGuidedTap(){
      el.removeEventListener("click", onGuidedTap);
      if(CARD.slides[state.idx] !== slide) return;   // slide already changed — ignore a stale tap
      stopNudge();
      document.querySelectorAll(".reveal-hand").forEach(x => x.remove());
      el.classList.remove("opt-guided"); el.classList.add("correct"); setSwMood("happy");
      if(window.FLNMotion && FLNMotion.correctSelect) FLNMotion.correctSelect.play(el);   /* FLN ANIMATION KIT: correct-select */
      const _o = _opts[+el.dataset.key] || {};
      const _aid = _o.audio || (_o.letter && slide.data && slide.data.phonemes && slide.data.phonemes[_o.letter]) || null;
      const _word = _aid ? ("assets/Audio/" + _aid + "." + AUDIO_EXT) : null;
      const _go = ()=> setTimeout(()=>{ if(CARD.slides[state.idx] === slide) completeSlide(false); }, 700);   /* [L02-Q10-FIG] only its own slide */
      const _ok = audioFor(slide, "correct"), _then = _ok ? ()=> play(_ok, _go) : _go;   // [VO-BATCH] the correct line follows the word here too
      if(_word) play(_word, _then); else _then();
    });
  }
  $("hintBtn").onclick = ()=>{ if(state.locked || state.hintActive) return;
    state.hintUsed = true; if(state.attempts < 1) state.attempts = 1;
    SwiftPAL.emit("hint_shown", { slide_id: slide.id, manual: true });
    if(runHint) runHint(); else play(audioFor(slide, "hint") || audioFor(slide, "try_again") || null, ()=>{}); };

  startNudge(slide, _nudge);
  // Tap-to-answer standard (lead review): a WRONG tap = soft buzz + ✕ + that card LOCKS (can't re-tap);
  // a RIGHT tap = confetti cannons + Swiftie cheer, then auto-advance. No select-then-आगे for pick questions.
  $("navBtn").style.display = "none"; setNavActive(false);
}

/* ---------- 10. RENDER HELPERS ---------- */
/* Render a picture as the real PNG (assets/Images/<key>.png); if the file is
   missing it falls back to the emoji. Pass the image id (e.g. "pic_anaar"). */
function imgOrEmoji(imgKey, emoji, imgClass, emojiClass){
  if(imgKey){
    const fb = String(emoji||"❓").replace(/'/g,"");
    return `<img class="${imgClass}" src="assets/Images/${imgKey}.${IMG_EXT}" alt="" `+
      `onerror="var s=document.createElement('span');s.className='${emojiClass}';s.textContent='${fb}';this.replaceWith(s);">`;
  }
  return `<span class="${emojiClass}">${emoji||"❓"}</span>`;
}
function letterCell(letter){
  const cell = document.createElement("div");
  cell.innerHTML = `<span class="big-glyph ink-glyph">${letter}</span>`;
  return cell;
}
/* ordering/seriation render (MTKGA02_L02_S02): an object at a given magnitude. by="size" scales the
   picture uniformly; by="length" draws a content-true rounded bar of width∝mag; by="weight" shows the
   picture at a uniform size (weight is not visual — the child uses known heaviness / the balance cue). */
function imgOrEmojiSized(img, emoji, px){
  const fb = String(emoji||"❓").replace(/'/g,"");
  if(img) return `<img class="ord-obj-img" style="width:${px}px;height:${px}px" src="assets/Images/${img}.${IMG_EXT}" alt="" `+
    `onerror="var s=document.createElement('span');s.className='ord-obj-emoji';s.style.fontSize='${Math.round(px*0.82)}px';s.textContent='${fb}';this.replaceWith(s);">`;
  return `<span class="ord-obj-emoji" style="font-size:${Math.round(px*0.82)}px">${emoji||"❓"}</span>`;
}
function renderOrdObj(o, by){
  if(by === "length"){ const w = {1:130,2:210,3:300}[o.mag] || 200;
    return `<div class="ord-bar" style="width:${w}px;background:${o.color||"#F5A623"}"></div>`; }
  // size AND weight scale the picture by visual magnitude — so a BIG-but-LIGHT balloon looks big and
  // tempts the child (bigger=heavier misconception), while the small stone is the correct heaviest pick.
  const px = {1:80, 2:116, 3:154}[o.mag] || 116;
  return imgOrEmojiSized(o.img, o.emoji, px);
}
function pictureCell(picture, emoji, imgKey){
  const cell = document.createElement("div");
  cell.innerHTML = imgOrEmoji(imgKey, emoji, "pic-img", "pic-emoji") + `<span class="lbl">${picture||""}</span>`;
  return cell;
}
function stimulusLetter(letter){
  const el = document.createElement("div"); el.className = "stimulus-letter";
  el.innerHTML = `<span class="ink-glyph">${letter}</span>`;
  return el;
}
function stimulusPic(picture, emoji, imgKey){
  const el = document.createElement("div"); el.className = "stimulus-pic";
  el.innerHTML = imgOrEmoji(imgKey, emoji, "img", "emoji") + `<span class="lbl">${picture||""}</span>`;
  return el;
}
/* gender helpers: an option card showing a gender label (पुल्लिंग/स्त्रीलिंग),
   and a stimulus card showing the target gender label. */
function genderLabelCell(label, gender){
  const cell = document.createElement("div");
  cell.innerHTML = `<span class="gender-label${gender==="F"?" fem":""}">${label}</span>`;
  return cell;
}
function stimulusGender(label, gender){
  const el = document.createElement("div");
  el.className = "stimulus-gender" + (gender==="F"?" fem":"");
  el.textContent = label;
  return el;
}

/* shape helpers (maths): render circle/square/triangle/rectangle as inline SVG in
   any colour / size / rotation (LO: recognise regardless of orientation or size).
   No image assets needed — shapes are pure geometry, so the sample renders offline. */
function shapeSVG(shape, opts){
  opts = opts || {};
  const color = opts.color || "#386AF6";
  const size  = opts.size  || 120;
  const rot   = opts.rotate || 0;
  let inner = "";
  if(shape === "circle")         inner = `<circle cx="50" cy="50" r="42" fill="${color}"/>`;
  else if(shape === "square")    inner = `<rect x="12" y="12" width="76" height="76" rx="0" fill="${color}"/>`;   // TRUE corners — teachable geometry is never rounded
  else if(shape === "triangle")  inner = `<polygon points="50,9 91,89 9,89" fill="${color}"/>`;
  else if(shape === "rectangle") inner = `<rect x="6" y="28" width="88" height="44" rx="0" fill="${color}"/>`;    // TRUE corners
  const g = rot ? `<g transform="rotate(${rot} 50 50)">${inner}</g>` : inner;
  return `<svg class="shape-svg" viewBox="0 0 100 100" width="${size}" height="${size}" `+
         `xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${g}</svg>`;
}
function shapeCell(o){
  const cell = document.createElement("div");
  cell.innerHTML = shapeSVG(o.shape, {color:o.color, size:130, rotate:o.rotate});
  return cell;
}
function stimulusShape(o){
  const el = document.createElement("div"); el.className = "stimulus-shape";
  el.innerHTML = shapeSVG(o.shape, {color:o.color, size:150, rotate:o.rotate});
  return el;
}

/* counting helpers (maths): a numeral option card (big numeral + small number word),
   and a stimulus box showing a set of `count` identical objects to be counted. */
function numberCell(numeral, word){
  const cell = document.createElement("div");
  cell.innerHTML = `<span class="num-glyph">${numeral}</span>` + (word ? `<span class="num-word">${word}</span>` : "");
  return cell;
}
/* VISUAL-FIRST quantity: a HAND showing n fingers up (assets/UI/hand_1..5) — pre-reader,
   NO number-word text. Falls back to the numeral only if n is outside 1..5 or the art is missing. */
function fingerCount(n, cls){ cls = cls || "finger-hand";
  if(!(n>=1 && n<=5)) return `<span class="num-glyph">${n}</span>`;
  return `<img class="${cls}" src="assets/UI/hand_${n}.png" alt="" ` +
    `onerror="var s=document.createElement('span');s.className='num-glyph';s.textContent='${n}';this.replaceWith(s);">`;
}
function fingerCell(n){ const c = document.createElement("div"); c.innerHTML = fingerCount(n, "opt-hand"); return c; }
/* DISPLAY numeral: ALWAYS Arabic (1 2 3) on screen — kids learn the universal digit.
   Spoken VO stays Hindi (एक/दो/तीन) via the separate vo_num_/vo_total_ audio files. */
function devNumeral(n){ return String(n); }
/* DUAL-CODED counting option: the Devanagari NUMERAL the child is learning, big and on top,
   with a smaller finger-hand beneath it as a visual anchor. The point of counting is to learn the
   NUMBER SYMBOL, not just read a hand-sign — so the numeral leads and the hand supports. Falls back
   to the numeral alone if the hand art (1..5) is missing. */
function numFingerCell(n){
  // outer div BECOMES the .opt-cell (mountTapOptions adds that class), so the stack lives in an
  // INNER .numfinger wrapper — otherwise ".opt-cell .numfinger x" selectors wouldn't match.
  const c = document.createElement("div");
  // hand art exists only for 1..5; beyond that fingerCount would fall back to a SECOND numeral
  // (numeral shown twice — hit when the counting range grew to 10), so skip the hand entirely.
  c.innerHTML = `<div class="numfinger"><span class="num-glyph">${devNumeral(n)}</span>${(n>=1&&n<=5) ? fingerCount(n, "nf-hand") : ""}</div>`;
  return c;
}
function stimulusCountSet(count, obj, scatter, perRow){
  // counts >10 render DENSE (smaller objects, wrapping); perRow groups the set in rows of exactly
  // N (the curriculum's "rows of 5/10" organisation for sets up to 20 — MTKGA01_L01_S04).
  const dense = count > 10 || !!perRow;
  const el = document.createElement("div"); el.className = "count-set" + (scatter ? " scattered" : "") + (dense ? " dense" : "");
  if(perRow && !scatter){ el.style.display = "grid"; el.style.gridTemplateColumns = `repeat(${perRow}, auto)`; }
  for(let i=0;i<count;i++){
    const c = document.createElement("span"); c.className = "cobj";
    // SCATTERED arrangement (SME/misconception: "total changes when objects are scattered") —
    // deterministic per-index jitter (stable across mounts/captures), never so large items overlap-hide.
    if(scatter) c.style.transform = `translateY(${((i*23)%25)-12}px) rotate(${((i*37)%21)-10}deg)`;
    c.innerHTML = imgOrEmoji(obj.img, obj.emoji, "cobj-img", "cobj-emoji");
    el.appendChild(c);
  }
  return el;
}
/* SME (S01 review deck): outside the tutorial, numeral options show the NUMBER ONLY, larger —
   no finger-hand support (fingers are a TEACHING aid, not a test aid). */
function bigNumCell(n){
  const c = document.createElement("div");
  c.innerHTML = `<span class="bignum-glyph">${devNumeral(n)}</span>`;
  return c;
}
/* COMPARE_SETS helpers (one-to-one matching → ज़्यादा / कम / बराबर).
   Two left-aligned rows (columns line up), a dashed connector drawn top[i]↔bottom[i]
   for each matched pair, and the unmatched leftover item(s) in the longer row glow —
   that glow IS the "which has more" proof. Offsets (not getBoundingClientRect) so it
   works even when the preview tab is throttled. */
function cmpObj(obj){
  const c = document.createElement("span"); c.className = "cobj";
  c.innerHTML = imgOrEmoji(obj.img, obj.emoji, "cobj-img", "cobj-emoji");
  return c;
}
function stimulusCompareSets(data){
  const nA = data.a_count, nB = data.b_count, A = data.a_object, B = data.b_object;
  const NS = "http://www.w3.org/2000/svg";
  const stage = document.createElement("div"); stage.className = "compare-stage";
  const rowA = document.createElement("div"); rowA.className = "cmp-row top";
  const rowB = document.createElement("div"); rowB.className = "cmp-row bot";
  const svg  = document.createElementNS(NS, "svg"); svg.setAttribute("class", "cmp-lines");
  for(let i=0;i<nA;i++) rowA.appendChild(cmpObj(A));
  for(let i=0;i<nB;i++) rowB.appendChild(cmpObj(B));
  stage.appendChild(rowA); stage.appendChild(svg); stage.appendChild(rowB);
  const btn = document.createElement("button"); btn.type = "button"; btn.className = "cmp-match-btn";
  btn.textContent = "🔗 मिलाओ"; stage.appendChild(btn);
  const min = Math.min(nA, nB);
  let drawn = false;
  function draw(){
    while(svg.firstChild) svg.removeChild(svg.firstChild);
    const IA = [...rowA.children], IB = [...rowB.children];
    const y1 = rowA.offsetTop + rowA.offsetHeight - 4;
    const y2 = rowB.offsetTop + 4;
    for(let i=0;i<min;i++){
      const x = IA[i].offsetLeft + IA[i].offsetWidth/2;
      const ln = document.createElementNS(NS, "line");
      ln.setAttribute("x1", x); ln.setAttribute("y1", y1);
      ln.setAttribute("x2", x); ln.setAttribute("y2", y2);
      ln.setAttribute("class", "cmp-line"); svg.appendChild(ln);
      setTimeout(()=> ln.classList.add("show"), 130*i);
    }
    const longer = nA > nB ? IA : nB > nA ? IB : null;   // null when equal (nothing left over)
    if(longer) for(let i=min;i<longer.length;i++)
      setTimeout(()=> longer[i].classList.add("leftover"), 130*min + 160);
  }
  // reveal the matching (child taps मिलाओ, or the hint/tutorial calls this). cb fires after it settles.
  stage._revealMatches = (cb)=>{ if(!drawn){ drawn = true; btn.disabled = true; draw(); }
    if(cb) setTimeout(cb, 130*min + 800); };
  btn.onclick = ()=> stage._revealMatches();
  if(data.show_matches){ btn.style.display = "none"; setTimeout(()=> stage._revealMatches(), 420); }
  return stage;
}
/* HINT for "how many": instead of a text popup, COUNT the set FOR the child —
   highlight each object left→right, say एक/दो/तीन, show the numeral on top of it.
   The child sees + hears the count modelled, then answers from the options. */
function demoCount(items, numerals, onDone){
  numerals = numerals || [];
  const clear = ()=> items.forEach(o=>{ o.classList.remove("counting"); const c=o.querySelector(".count-callout"); if(c) c.remove(); });
  clear();
  let i = 0;
  (function step(){
    if(i >= items.length){                       // last count landed → clear, then continue
      setTimeout(()=>{ clear(); if(onDone) onDone(); }, 1000);
      return;
    }
    const o = items[i];
    o.classList.add("counting");
    let cal = o.querySelector(".count-callout");
    if(!cal){ cal = document.createElement("span"); cal.className = "count-callout"; o.appendChild(cal); }
    cal.textContent = String(i+1);   // Arabic count callout; Hindi number-word is spoken separately
    play("assets/Audio/vo_num_" + (i+1) + "." + AUDIO_EXT, ()=>{ i++; setTimeout(step, 320); });
  })();
}
function demoCountSet(setEl, count, numerals, onDone){   // count the "how many?" stimulus set
  demoCount([...setEl.querySelectorAll(".cobj")].slice(0, count), numerals, onDone);
}

/* ---------- 10b. DEVANAGARI GLYPH INK-CENTERING ----------
   Devanagari glyphs carry matras above (ओ, औ, अं) and below (ऋ) the shirorekha,
   so plain flex `align-items:center` leaves them sitting high with a gap below —
   and the offset differs per glyph. Measure each glyph's real ink box (canvas
   actualBoundingBox) + its baseline in the DOM, then translateY so the INK is
   truly centred in its tile/box. Font-agnostic; recomputed on mount + fonts.ready. */
let _inkCtx = null;
function centerInkGlyph(span){
  if(!span || !span.parentElement) return;
  const glyph = (span.textContent || "").trim();
  if(!glyph) return;
  const box = span.parentElement;
  const cs = getComputedStyle(span);
  const fpx = parseFloat(cs.fontSize);
  if(!fpx) return;
  _inkCtx = _inkCtx || document.createElement("canvas").getContext("2d");
  _inkCtx.font = `${cs.fontWeight} ${fpx}px ${cs.fontFamily}`;
  const m = _inkCtx.measureText(glyph);
  const a = m.actualBoundingBoxAscent, d = m.actualBoundingBoxDescent;
  if(!isFinite(a) || !isFinite(d)) return;
  const scale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--scale")) || 1;
  span.style.transform = "";   // reset before measuring baseline
  const probe = document.createElement("span");
  probe.style.cssText = "display:inline-block;width:0;height:0;vertical-align:baseline;";
  span.appendChild(probe);
  const baseScreen = probe.getBoundingClientRect().top;
  span.removeChild(probe);
  const br = box.getBoundingClientRect();
  if(br.height < 5) return;    // not laid out yet
  const boxCenter = br.top + br.height/2;
  const inkCenter = baseScreen + ((d - a)/2) * scale;   // screen px
  const dy = (boxCenter - inkCenter) / scale;           // css px to move glyph down
  span.style.transform = `translateY(${dy}px)`;
}
function centerAllGlyphs(root){
  (root || document).querySelectorAll(".ink-glyph").forEach(centerInkGlyph);
}

/* ---------- 11. DRAG-DROP PRIMITIVE ---------- */
function makeDraggable(tileEl, onDrop){
  let startX=0, startY=0, dx=0, dy=0, dragging=false;
  let scale = 1;
  const refScale = ()=> scale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--scale")) || 1;
  function onDown(e){
    if(tileEl.classList.contains("snapped") || tileEl.classList.contains("matched")) return;
    refScale();
    dragging = true;
    // bind move/up on the document ONLY while dragging (removed in onUp) — otherwise every tile leaves
    // stale document listeners that pile up across the 11 drag slides.
    document.addEventListener("mousemove", onMove);
    document.addEventListener("touchmove", onMove, {passive:false});
    document.addEventListener("mouseup", onUp);
    document.addEventListener("touchend", onUp);
    const p = e.touches ? e.touches[0] : e;
    startX = p.clientX; startY = p.clientY;
    dx = 0; dy = 0;
    tileEl.classList.add("dragging");
    e.preventDefault();
  }
  function onMove(e){
    if(!dragging) return;
    const p = e.touches ? e.touches[0] : e;
    dx = (p.clientX - startX) / scale; dy = (p.clientY - startY) / scale;
    tileEl.style.transform = `translate(${dx}px,${dy}px) scale(1.08)`;
    // highlight zone under — hide the tile from hit-testing so the dragged tile
    // (z-index 50, now covering the zone) doesn't mask the zone beneath it.
    const cx = p.clientX, cy = p.clientY;
    document.querySelectorAll(".dd-zone").forEach(z => z.classList.remove("hover"));
    tileEl.style.pointerEvents = "none";
    const under = document.elementFromPoint(cx, cy);
    tileEl.style.pointerEvents = "";
    const zone = under?.closest?.(".dd-zone");
    if(zone && !zone.classList.contains("filled")) zone.classList.add("hover");
    e.preventDefault();
  }
  function onUp(e){
    if(!dragging) return;
    dragging = false;
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("touchmove", onMove);
    document.removeEventListener("mouseup", onUp);
    document.removeEventListener("touchend", onUp);
    tileEl.classList.remove("dragging");
    const p = e.changedTouches ? e.changedTouches[0] : e;
    // hide the tile from hit-testing so we detect the zone underneath it
    tileEl.style.pointerEvents = "none";
    const under = document.elementFromPoint(p.clientX, p.clientY);
    tileEl.style.pointerEvents = "";
    const zone = under?.closest?.(".dd-zone");
    document.querySelectorAll(".dd-zone").forEach(z => z.classList.remove("hover"));
    if(zone && !zone.classList.contains("filled")){
      // snap
      tileEl.style.transform = "";
      onDrop(zone, tileEl);
    } else {
      tileEl.style.transform = "";
    }
  }
  tileEl.addEventListener("mousedown", onDown);
  tileEl.addEventListener("touchstart", onDown, {passive:false});
}
/* shared wrong-drop response for drag/sort/sequence modules: soft buzz + Swiftie try-again pose + the
   authored spoken "try_again". Pre-readers need the SPOKEN recovery, not just the visual spring-back. */
function dragWrong(slide){ sfxWrongSoft(); setSwMood("tryagain"); play(audioFor(slide, "try_again") || null, ()=>{}); }

/* shared SUCCESS response — the engine-wide answer-feedback standard (lead-confirmed): side confetti
   cannons + rising sfx + Swiftie celebrates + the authored "correct" VO, then AUTO-ADVANCE. Never a
   celebration popup, never a "press आगे to continue" gate on a solved activity. `revealed` = the child
   got there via the reveal scaffold → quieter settle (no confetti/cheer) + completeSlide(false) so
   mastery telemetry stays honest. */
function celebrateThenAdvance(slide, revealed){
  if(revealed){ play(audioFor(slide, "reveal") || null, ()=>{}); setTimeout(()=> completeSlide(false), 1400); return; }
  sfxCorrect(); confettiCannon(); setSwMood("celebrate");
  play(audioFor(slide, "correct") || null, ()=>{});
  setTimeout(()=> completeSlide(true), 1400);
}

/* ---------- 12. SLIDE MODULES ---------- */
const SlideModules = {
  INTRO: {
    mount(host, slide){
      const wrap = document.createElement("div"); wrap.className = "intro-stage";
      const letters = slide.data.letters;
      const tapped = new Set();
      const tiles = [];
      // [16f] Size tiles to the REAL container: the r4 tut-card frame is ~990px inside (the old
      // math assumed 1220 + a -100px breakout and punched 10-card strips through the frame borders
      // — user-caught live on MTKGA01_L02_S01 s00; same root as the HIKGH04_P2 letter row).
      // Fit one row at MAXW=960; if tiles would drop below the 110px touch floor, WRAP into two
      // balanced rows (numerals 0-9 → fives-structure 0-4 / 5-9) sized to the wider row.
      const GAP = 20, MAXW = 960, n = letters.length;
      let rowsOf;
      let tSize = Math.min(184, Math.floor((MAXW - (n-1)*GAP) / n));
      if (tSize >= 110) { rowsOf = [n]; }
      else {
        const top = Math.ceil(n/2), bot = n - top;
        tSize = Math.min(184, Math.floor((MAXW - (top-1)*GAP) / top));
        rowsOf = [top, bot];
      }
      const tFont = Math.round(tSize * 0.565);
      const rowEls = rowsOf.map(() => {
        const r = document.createElement("div"); r.className = "intro-letters";
        r.style.gap = GAP + "px"; return r;
      });
      const rowFor = i => (rowsOf.length === 1 || i < rowsOf[0]) ? rowEls[0] : rowEls[1];
      // hand-nudge points at the first letter not yet tapped — guides every box
      function nudgeNext(){
        for(let i=0;i<letters.length;i++){
          if(!tapped.has(letters[i])){ pointNudgeAt(tiles[i]); return; }
        }
        stopNudge();
      }
      letters.forEach((L, i) => {
        const tile = document.createElement("div"); tile.className = "intro-letter";
        tile.style.width = tile.style.height = tSize + "px";
        tile.style.fontSize = tFont + "px";
        tile.innerHTML = `<span class="ink-glyph">${L}</span>`;
        tile.onclick = ()=>{
          if(slide.data.auto) return;   // [16h] Phase-1 autonomous mode: the demo plays itself
          tile.classList.add("played");
          const phon = slide.data.phonemes && slide.data.phonemes[L];
          play(phon ? "assets/Audio/" + phon + "." + AUDIO_EXT : null);
          SwiftPAL.emit("intro_letter_tap", { slide_id: slide.id, letter: L });
          tapped.add(L);
          // नav unlocks only after EVERY letter has been heard
          if(tapped.size >= letters.length){ stopNudge(); setNavActive(true); }
          else { nudgeNext(); }
        };
        rowFor(i).appendChild(tile); tiles.push(tile);
      });
      rowEls.forEach(r => wrap.appendChild(r));
      host.appendChild(wrap);

      setNavActive(false);
      $("navBtn").onclick = ()=>{ if(tapped.size >= letters.length) completeSlide(true); };
      nudgeNext();
      // [16h] Phase-1 autonomous mode (lead's 3-phase contract): tiles highlight + speak one by
      // one BY THEMSELVES; the child watches/listens. आगे unlocks after the last one.
      if(slide.data.auto){
        stopNudge(); state.ownsAudio = true;
        let ai = 0;
        const aStep = ()=>{
          if(CARD.slides[state.idx] !== slide) return;
          if(ai >= letters.length){ stopNudge(); $("navBtn").onclick = ()=> completeSlide(true); setNavActive(true); return; }
          const L = letters[ai], tile = tiles[ai];
          tile.classList.add("played"); pointNudgeAt(tile);
          const phon = slide.data.phonemes && slide.data.phonemes[L];
          ai++;
          play(phon ? "assets/Audio/" + phon + "." + AUDIO_EXT : null, ()=> setTimeout(aStep, 380));
        };
        play(audioFor(slide, "prompt") || null, ()=> setTimeout(aStep, 500));
      }   // start by guiding the first letter
    }
  },

  MEET_LETTER: {
    mount(host, slide){
      const wrap = document.createElement("div"); wrap.className = "meet-stage";
      if(slide.data.pair){
        const pair = document.createElement("div"); pair.className = "meet-pair";
        slide.data.pair.forEach(p => {
          const item = document.createElement("div"); item.className = "meet-pair-item";
          item.innerHTML = `
            <div class="meet-letter-box"><span class="glyph ink-glyph">${p.letter}</span></div>
            <div class="meet-arrow">→</div>
            <div class="meet-pic-box">
              ${imgOrEmoji(p.picture_img, p.picture_emoji, "pic-img", "pic-emoji")}
              <span class="pic-label">${p.word_hi}</span>
            </div>`;
          pair.appendChild(item);
        });
        wrap.appendChild(pair);
      } else {
        wrap.innerHTML = `
          <div class="meet-letter-box"><span class="glyph ink-glyph">${slide.data.letter}</span></div>
          <div class="meet-arrow">→</div>
          <div class="meet-pic-box">
            ${imgOrEmoji(slide.data.picture_img, slide.data.picture_emoji, "pic-img", "pic-emoji")}
            <span class="pic-label">${slide.data.word_hi}</span>
          </div>`;
      }
      host.appendChild(wrap);
      // नav unlocks only after the VO has played once (students can't skip the model)
      state.gateNavUntilAudio = true;
      setNavActive(false);
      $("navBtn").onclick = ()=> completeSlide(true);
    }
  },

  /* ===== SHAPES (maths) — reuse the same scaffold/nudge/feedback as letters ===== */
  SHAPE_INTRO: {
    mount(host, slide){
      const wrap = document.createElement("div"); wrap.className = "intro-stage";
      const row  = document.createElement("div"); row.className = "intro-shapes";
      const shapes = slide.data.shapes; const tapped = new Set(); const tiles = [];
      const GAP = 28, MAXW = 1220, n = shapes.length;
      const tSize = Math.max(120, Math.min(184, Math.floor((MAXW - (n-1)*GAP) / n)));
      row.style.gap = GAP + "px";
      function nudgeNext(){
        for(let i=0;i<shapes.length;i++){ if(!tapped.has(i)){ pointNudgeAt(tiles[i]); return; } }
        stopNudge();
      }
      shapes.forEach((sh, i) => {
        const tile = document.createElement("div"); tile.className = "intro-shape";
        tile.style.width = tile.style.height = tSize + "px";
        // name label (revealed on tap — child hears the name AND sees it on top of the shape)
        tile.innerHTML = `<span class="shape-name">${sh.name || ""}</span>` +
                         shapeSVG(sh.shape, {color: sh.color, size: Math.round(tSize*0.62), rotate: sh.rotate});
        tile.onclick = ()=>{
          tile.classList.add("played");
          play(sh.name_audio ? "assets/Audio/" + sh.name_audio + "." + AUDIO_EXT : null);
          SwiftPAL.emit("intro_shape_tap", { slide_id: slide.id, shape: sh.shape });
          tapped.add(i);
          if(tapped.size >= shapes.length){ stopNudge(); setNavActive(true); }
          else { nudgeNext(); }
        };
        row.appendChild(tile); tiles.push(tile);
      });
      wrap.appendChild(row); host.appendChild(wrap);
      setNavActive(false);
      $("navBtn").onclick = ()=>{ if(tapped.size >= shapes.length) completeSlide(true); };
      nudgeNext();
    }
  },

  MEET_SHAPE: {
    mount(host, slide){
      const wrap = document.createElement("div"); wrap.className = "meet-stage";
      wrap.innerHTML = `
        <div class="meet-shape-box">
          ${shapeSVG(slide.data.shape, {color: slide.data.color, size: 190, rotate: slide.data.rotate})}
          <span class="label">${slide.data.name}</span>
        </div>
        <div class="meet-arrow">→</div>
        <div class="meet-pic-box">
          ${imgOrEmoji(slide.data.object_img, slide.data.object_emoji, "pic-img", "pic-emoji")}
          <span class="pic-label">${slide.data.object_hi}</span>
        </div>`;
      host.appendChild(wrap);
      state.gateNavUntilAudio = true; setNavActive(false);
      $("navBtn").onclick = ()=> completeSlide(true);
    }
  },

  TAP_SHAPE_BY_NAME: {
    mount(host, slide){
      mountTapOptions({
        slide, host, signalName: "shape_name_first_try",
        stimulus: (()=> {
          const el = document.createElement("div"); el.className = "stimulus-pic"; el.style.cursor = "pointer";
          el.innerHTML = `<span class="emoji">🔊</span><span class="lbl">${slide.data.name || "नाम सुनो"}</span>`;
          el.onclick = ()=>{ state.audioReplays++; play(audioFor(slide,"shape_name") || null); };
          return el;
        })(),
        options: slide.data.options,
        isCorrect: (opt) => opt.shape === slide.data.target,
        optionRenderer: (opt) => shapeCell(opt)
      });
    }
  },

  TAP_SHAPE_BY_PICTURE: {
    mount(host, slide){
      mountTapOptions({
        slide, host, signalName: "shape_env_first_try",
        stimulus: stimulusPic(slide.data.object_hi, slide.data.object_emoji, slide.data.object_img),
        options: slide.data.options,
        isCorrect: (opt) => opt.shape === slide.data.target,
        optionRenderer: (opt) => shapeCell(opt)
      });
    }
  },

  TAP_PICTURE_BY_SHAPE: {
    mount(host, slide){
      mountTapOptions({
        slide, host, signalName: "shape_object_first_try",
        stimulus: stimulusShape({shape: slide.data.shape, color: slide.data.color, rotate: slide.data.rotate}),
        options: slide.data.options,
        isCorrect: (opt) => opt.correct === true,
        optionRenderer: (opt) => pictureCell(opt.object_hi, opt.object_emoji, opt.object_img)
      });
    }
  },

  SORT_SHAPE: {
    mount(host, slide){
      const wrap = document.createElement("div"); wrap.className = "sort-stage shape-sort";
      const binsRow = document.createElement("div");
      binsRow.className = "sort-bins" + (slide.data.bins.length >= 4 ? " many" : "");
      slide.data.bins.forEach(b => {
        const bin = document.createElement("div");
        bin.className = "sort-bin dd-zone";            // dd-zone → drop detection
        bin.dataset.shape = b.shape;
        // header (faint reference shape + label) INSIDE the box, then a clear drop area
        bin.innerHTML = `<div class="bin-head-row"><span class="bin-ref">${shapeSVG(b.shape, {color:"#AEB9CC", size:34})}</span><span class="bin-title">${b.label}</span></div>`+
          `<div class="bin-items"></div>`;
        binsRow.appendChild(bin);
      });
      const tray = document.createElement("div"); tray.className = "sort-tray";
      const items = slide.data.items.slice().sort(()=> Math.random() - 0.5);
      items.forEach(it => {
        const t = document.createElement("div"); t.className = "sort-item"; t.dataset.shape = it.shape;
        t.innerHTML = shapeSVG(it.shape, {color: it.color, size: 70, rotate: it.rotate});
        tray.appendChild(t);
      });
      wrap.appendChild(binsRow); wrap.appendChild(tray);
      host.appendChild(wrap);

      state.attempts = 0; state.locked = false;
      let placed = 0; const need = slide.data.items.length;
      [...tray.children].forEach(tile => {
        makeDraggable(tile, (zone, t) => {
          const bin = zone.closest(".sort-bin"); if(!bin) return;
          state.attempts++;
          if(bin.dataset.shape === t.dataset.shape){
            t.classList.add("snapped");
            bin.querySelector(".bin-items").appendChild(t);
            placed++;
            SwiftPAL.emit("shape_sort_item", { slide_id: slide.id, shape: t.dataset.shape, attempts: state.attempts });
            if(placed === need){
              state.locked = true;
              SwiftPAL.emit("shape_sort_correct", {
                slide_id: slide.id, phase: slide.phase, value: true,
                attempts: state.attempts, latency_ms: Date.now() - state.slideStart
              });
              setTimeout(()=> celebrateThenAdvance(slide, false), 250);   // standard: confetti + VO + auto-advance, no popup
            }
          } else {
            bin.classList.add("hover"); bin.style.borderColor = "var(--wrong)";
            setTimeout(()=>{ bin.classList.remove("hover"); bin.style.borderColor = ""; }, 500);
            dragWrong(slide);   // buzz + Swiftie + spoken try_again (pre-readers need the spoken recovery)
            SwiftPAL.emit("answer_wrong", { slide_id: slide.id, phase: slide.phase, attempts: state.attempts });
          }
        });
      });
    }
  },

  /* ===== COUNTING (maths) — OTO tap-count, cardinality, meet-number, make-set ===== */
  COUNT_TAP: {
    mount(host, slide){
      const wrap = document.createElement("div"); wrap.className = "count-stage";
      const row  = document.createElement("div"); row.className = "count-row";
      const N = slide.data.count, obj = slide.data.object, nums = slide.data.numerals || [];
      // large sets (S04, up to 20): smaller tiles + optional rows-of-N grouping (curriculum: rows of 5/10)
      if(N > 10 || slide.data.per_row) row.classList.add("dense");
      if(slide.data.per_row){ row.style.display = "grid"; row.style.gridTemplateColumns = `repeat(${slide.data.per_row}, auto)`; }
      const items = []; let c = 0;
      for(let i=0;i<N;i++){
        const it = document.createElement("div"); it.className = "count-item";
        it.innerHTML = imgOrEmoji(obj.img, obj.emoji, "cobj-img", "cobj-emoji") + `<span class="count-badge"></span>`;
        row.appendChild(it); items.push(it);
      }
      wrap.appendChild(row); host.appendChild(wrap);

      function nudgeNext(){ const nx = items.find(x=>!x.classList.contains("counted")); if(nx) pointNudgeAt(nx); else stopNudge(); }
      items.forEach(it => {
        it.onclick = ()=>{
          if(it.classList.contains("counted")) return;   // one-to-one: never double-count
          c++; it.classList.add("counted");
          it.querySelector(".count-badge").textContent = String(c);   // Arabic running count; Hindi word spoken separately
          SwiftPAL.emit("count_tap", { slide_id: slide.id, phase: slide.phase, n: c });
          if(c >= N){
            stopNudge();
            SwiftPAL.emit("count_oto_complete", { slide_id: slide.id, phase: slide.phase,
              total: N, value: true, latency_ms: Date.now()-state.slideStart });
            // say the LAST number, then the total; enable आगे ONLY after "कुल N" finishes
            play("assets/Audio/vo_num_" + c + "." + AUDIO_EXT, ()=> setTimeout(()=>
              play("assets/Audio/vo_total_" + N + "." + AUDIO_EXT, ()=> setNavActive(true)), 300));
          } else {
            play("assets/Audio/vo_num_" + c + "." + AUDIO_EXT);    // one number word per touch
            nudgeNext();
          }
        };
      });
      setNavActive(false);
      $("navBtn").onclick = ()=>{ if(c >= N) completeSlide(true); };
      nudgeNext();
    }
  },

  CONSERVE_COUNT: {
    // MTKGA01_L01_S03 "the LAST counted number IS the total" + its core misconception ("the total
    // changes when objects move"). One slide, two beats: (A) the child tap-counts the set one-to-one
    // (badges + spoken एक/दो/…, ending "कुल N" — the freeze-the-final-number teach), then (B) the SAME
    // objects visibly MOVE to scattered spots (badges clear), the move line asks "अब कितनी हैं?" and
    // numeral options appear — correct is the SAME N; options include N±1 (the moved-so-changed error).
    // data:{count, object, numerals, options:[{value,audio}]} · audio:{prompt, move, try_again, hint, reveal}.
    // GENERALISED count-then-pick engine (S03 conservation + S02's tap-count items). One slide:
    // tap-count the set one-to-one (badges + spoken एक/दो/… → frozen "कुल N"), then numeral options.
    // data: {count, object, options, arrange?("row"|"scatter"|"circle"|"two_groups"), groups?[a,b],
    //        move?(default true = objects drift after counting; false = count-then-pick, no drift)}.
    // move:false emits cardinality_first_try; move:true emits conserve_count_first_try.
    mount(host, slide){
      const d = slide.data, N = d.count, obj = d.object;
      const arrange = d.arrange || "row";
      const doMove  = d.move !== false;
      state.ownsAudio = true; setNavActive(false);
      const wrap = document.createElement("div"); wrap.className = "count-stage conserve";
      const row  = document.createElement("div"); row.className = "count-row arr-" + arrange + (N > 8 ? " dense" : "");
      const items = []; let c = 0;
      const mkItem = ()=>{ const it = document.createElement("div"); it.className = "count-item";
        it.innerHTML = imgOrEmoji(obj.img, obj.emoji, "cobj-img", "cobj-emoji") + `<span class="count-badge"></span>`;
        items.push(it); return it; };
      if(arrange === "two_groups"){
        const g = d.groups || [Math.ceil(N/2), Math.floor(N/2)];
        g.forEach((gn, gi)=>{ const cl = document.createElement("div"); cl.className = "count-cluster";
          for(let i=0;i<gn;i++) cl.appendChild(mkItem()); row.appendChild(cl);
          if(gi === 0){ const plus = document.createElement("div"); plus.className = "count-plus"; plus.textContent = "और"; row.appendChild(plus); } });
      } else if(arrange === "circle"){
        for(let i=0;i<N;i++){ const it = mkItem(); const a = -Math.PI/2 + i*2*Math.PI/N, R = N > 6 ? 176 : 140;
          it.style.position = "absolute";
          it.style.left = `calc(50% + ${Math.round(Math.cos(a)*R)}px)`;
          it.style.top  = `calc(50% + ${Math.round(Math.sin(a)*R)}px)`;
          it.style.marginLeft = "-48px"; it.style.marginTop = "-48px"; row.appendChild(it); }
      } else {
        for(let i=0;i<N;i++){ const it = mkItem();
          if(arrange === "scatter") it.style.transform = `translateY(${((i*23)%25)-12}px) rotate(${((i*37)%21)-10}deg)`;
          row.appendChild(it); }
      }
      wrap.appendChild(row); host.appendChild(wrap);
      const nudgeNext = ()=>{ const nx = items.find(x=>!x.classList.contains("counted")); if(nx) pointNudgeAt(nx); else stopNudge(); };
      const askOptions = ()=>{
        mountTapOptions({
          slide, host, signalName: doMove ? "conserve_count_first_try" : "cardinality_first_try",
          stimulus: null, nudgeTarget: null,
          options: d.options,
          columnsHint: Math.min(d.options.length, 5),
          isCorrect: (opt) => opt.value === N,
          optionRenderer: (opt) => slide.phase === "tutorial" ? numFingerCell(opt.value) : bigNumCell(opt.value),
          mastery: slide.phase === "mastery"
        });
      };
      const afterCount = ()=>{
        if(doMove){
          items.forEach((it,i)=>{ const keep = slide.phase === "tutorial" &&
              it.querySelector(".count-badge").textContent === String(N);
            if(!keep) it.querySelector(".count-badge").textContent = "";
            it.classList.add("moved");
            it.style.transform = `translate(${((i*53)%81)-40}px, ${((i*37)%61)-30}px) rotate(${((i*29)%25)-12}deg)`; });
          sfxTap();
          setTimeout(()=>{ play(audioFor(slide, "move") || null, ()=>{}); askOptions(); }, 950);
        } else {
          play(audioFor(slide, "ask") || null, ()=>{}); askOptions();
        }
      };
      items.forEach(it => {
        it.onclick = ()=>{
          if(it.classList.contains("counted") || it.classList.contains("moved")) return;   // one-to-one; inert once moved
          c++; it.classList.add("counted");
          it.querySelector(".count-badge").textContent = String(c);
          SwiftPAL.emit("count_tap", { slide_id: slide.id, phase: slide.phase, n: c });
          if(c >= N){
            stopNudge();
            play("assets/Audio/vo_num_" + c + "." + AUDIO_EXT, ()=> setTimeout(()=>
              play("assets/Audio/vo_total_" + N + "." + AUDIO_EXT, ()=> setTimeout(afterCount, 450)), 300));
          } else {
            play("assets/Audio/vo_num_" + c + "." + AUDIO_EXT);
            nudgeNext();
          }
        };
      });
      state.replayAudio = ()=> play(audioFor(slide, c >= N ? (doMove ? "move" : "ask") : "prompt") || null, ()=>{});
      play(audioFor(slide, "prompt") || null, ()=>{});
      nudgeNext();
    }
  },

  COUNT_ACTION: {
    // S02 themed tap-count: tap each object and it ENACTS to a target while counting — pop (balloon
    // vanishes), feed (flies to the monster's mouth), or basket (drops into the basket). After the last
    // one the frozen "कुल N" plays and numeral options appear. data:{count, object, options, theme
    // ("pop"|"feed"|"basket")}. audio:{prompt, ask, try_again, hint, reveal}.
    mount(host, slide){
      const d = slide.data, N = d.count, obj = d.object, theme = d.theme || "pop";
      state.ownsAudio = true; setNavActive(false);
      const wrap = document.createElement("div"); wrap.className = "count-stage act act-" + theme;
      let target = null;
      if(theme === "feed"){ target = document.createElement("div"); target.className = "act-target act-monster"; target.textContent = "👹"; wrap.appendChild(target); }
      if(theme === "basket"){ target = document.createElement("div"); target.className = "act-target act-basket";
        target.innerHTML = imgOrEmoji("obj_basket", "🧺", "act-basket-img", "act-basket-emoji"); wrap.appendChild(target); }
      const row = document.createElement("div"); row.className = "count-row act-row" + (N > 8 ? " dense" : "");
      const items = []; let c = 0;
      for(let i=0;i<N;i++){ const it = document.createElement("div"); it.className = "count-item act-item";
        it.innerHTML = imgOrEmoji(obj.img, obj.emoji, "cobj-img", "cobj-emoji") + `<span class="count-badge"></span>`;
        row.appendChild(it); items.push(it); }
      wrap.appendChild(row); host.appendChild(wrap);
      const nudgeNext = ()=>{ const nx = items.find(x=>!x.classList.contains("done")); if(nx) pointNudgeAt(nx); else stopNudge(); };
      const askOptions = ()=>{ mountTapOptions({
        slide, host, signalName: "cardinality_first_try", stimulus: null, nudgeTarget: null,
        options: d.options, columnsHint: Math.min(d.options.length, 5),
        isCorrect: (opt) => opt.value === N,
        optionRenderer: (opt) => slide.phase === "tutorial" ? numFingerCell(opt.value) : bigNumCell(opt.value),
        mastery: slide.phase === "mastery" }); };
      items.forEach(it => {
        it.onclick = ()=>{
          if(it.classList.contains("done")) return;
          c++; it.classList.add("done", "act-go");   // act-go = fly/pop animation (theme-scoped CSS)
          it.querySelector(".count-badge").textContent = String(c);
          if(theme === "feed" && target) target.classList.add("chomp");
          sfxTap();
          SwiftPAL.emit("count_tap", { slide_id: slide.id, phase: slide.phase, n: c });
          if(c >= N){
            stopNudge();
            play("assets/Audio/vo_num_" + c + "." + AUDIO_EXT, ()=> setTimeout(()=>
              play("assets/Audio/vo_total_" + N + "." + AUDIO_EXT, ()=> setTimeout(()=>{
                play(audioFor(slide, "ask") || null, ()=>{}); askOptions(); }, 450)), 300));
          } else { play("assets/Audio/vo_num_" + c + "." + AUDIO_EXT); nudgeNext(); }
        };
      });
      state.replayAudio = ()=> play(audioFor(slide, c >= N ? "ask" : "prompt") || null, ()=>{});
      play(audioFor(slide, "prompt") || null, ()=>{});
      nudgeNext();
    }
  },

  COUNT_DRAG_MATCH: {
    // S02 drag items. mode "num_to_box": count the set, then DRAG the correct NUMBER CARD into the
    // answer box (#2, #9). mode "obj_to_num": count, then DRAG the object onto the correct NUMBER (#11).
    // data:{count, object, options:[{value}], mode}. audio:{prompt, ask, try_again, reveal}.
    mount(host, slide){
      const d = slide.data, N = d.count, obj = d.object, mode = d.mode || "num_to_box";
      state.ownsAudio = true; setNavActive(false);
      const wrap = document.createElement("div"); wrap.className = "count-stage dragmatch";
      const setRow = document.createElement("div"); setRow.className = "count-row show-set" + (N > 8 ? " dense" : "");
      const items = []; let c = 0;
      for(let i=0;i<N;i++){ const it = document.createElement("div"); it.className = "count-item";
        it.innerHTML = imgOrEmoji(obj.img, obj.emoji, "cobj-img", "cobj-emoji") + `<span class="count-badge"></span>`;
        setRow.appendChild(it); items.push(it); }
      wrap.appendChild(setRow);
      const dz = document.createElement("div"); dz.className = "cdm-zone";   // built after counting
      const tray = document.createElement("div"); tray.className = "cdm-tray";
      wrap.appendChild(dz); wrap.appendChild(tray); host.appendChild(wrap);
      const nudgeNext = ()=>{ const nx = items.find(x=>!x.classList.contains("counted")); if(nx) pointNudgeAt(nx); else stopNudge(); };
      const settleWin = (revealed)=>{ state.locked = true;
        SwiftPAL.emit("cardinality_first_try", { slide_id: slide.id, phase: slide.phase, value: !revealed, latency_ms: Date.now()-state.slideStart });
        celebrateThenAdvance(slide, revealed); };
      const buildDrag = ()=>{
        // shuffle the numeral options
        const opts = d.options.slice(); for(let i=opts.length-1;i>0;i--){ const j=(Math.random()*(i+1))|0; [opts[i],opts[j]]=[opts[j],opts[i]]; }
        if(mode === "obj_to_num"){
          // number cards are the DROP ZONES; a single draggable object-chip is the tile
          dz.className = "cdm-numrow";
          opts.forEach(o=>{ const z = document.createElement("div"); z.className = "cdm-numzone dd-zone"; z.dataset.val = String(o.value);
            z.innerHTML = `<span class="bignum-glyph">${devNumeral(o.value)}</span>`; dz.appendChild(z); });
          const tile = document.createElement("div"); tile.className = "cdm-objtile";
          tile.innerHTML = imgOrEmoji(obj.img, obj.emoji, "cobj-img", "cobj-emoji"); tray.appendChild(tile);
          makeDraggable(tile, (zone)=>{ if(state.locked || !zone) return;
            if(parseInt(zone.dataset.val,10) === N){ zone.classList.add("filled","correct"); tile.classList.add("snapped"); settleWin(false); }
            else { zone.classList.add("wrong"); setTimeout(()=>zone.classList.remove("wrong"),500); dragWrong(slide);
              state.attempts=(state.attempts||0)+1; if(state.attempts>=(CARD.scaffold_rules.max_attempts||3)){ const zc=[...dz.children].find(z=>parseInt(z.dataset.val,10)===N); if(zc){zc.classList.add("filled","correct","reveal-glow"); tile.classList.add("snapped"); play(audioFor(slide,"reveal")||null,()=>{}); settleWin(true);} } }
          });
        } else {
          // one BOX is the drop zone; number cards are the draggable tiles
          dz.className = "cdm-box dd-zone"; dz.innerHTML = `<span class="cdm-box-q">?</span>`;
          opts.forEach(o=>{ const tile = document.createElement("div"); tile.className = "cdm-card"; tile.dataset.val = String(o.value);
            tile.innerHTML = `<span class="bignum-glyph">${devNumeral(o.value)}</span>`; tray.appendChild(tile);
            makeDraggable(tile, (zone)=>{ if(state.locked || zone !== dz) return;
              if(o.value === N){ dz.classList.add("filled","correct"); dz.innerHTML = `<span class="bignum-glyph">${devNumeral(N)}</span>`; tile.classList.add("snapped"); settleWin(false); }
              else { dz.classList.add("wrong"); setTimeout(()=>dz.classList.remove("wrong"),500); dragWrong(slide);
                state.attempts=(state.attempts||0)+1; if(state.attempts>=(CARD.scaffold_rules.max_attempts||3)){ dz.classList.add("filled","correct","reveal-glow"); dz.innerHTML=`<span class="bignum-glyph">${devNumeral(N)}</span>`; play(audioFor(slide,"reveal")||null,()=>{}); settleWin(true); } }
            });
          });
        }
        play(audioFor(slide, "ask") || null, ()=>{});
      };
      items.forEach(it => { it.onclick = ()=>{ if(it.classList.contains("counted")) return;
        c++; it.classList.add("counted"); it.querySelector(".count-badge").textContent = String(c);
        SwiftPAL.emit("count_tap", { slide_id: slide.id, phase: slide.phase, n: c });
        if(c >= N){ stopNudge(); play("assets/Audio/vo_num_"+c+"."+AUDIO_EXT, ()=> setTimeout(()=>
          play("assets/Audio/vo_total_"+N+"."+AUDIO_EXT, ()=> setTimeout(buildDrag, 450)), 300)); }
        else { play("assets/Audio/vo_num_"+c+"."+AUDIO_EXT); nudgeNext(); }
      }; });
      state.attempts = 0; state.locked = false;
      state.replayAudio = ()=> play(audioFor(slide, c >= N ? "ask" : "prompt") || null, ()=>{});
      play(audioFor(slide, "prompt") || null, ()=>{});
      nudgeNext();
    }
  },

  DEMO_COUNT: {
    // [16h] PHASE-1 AUTONOMOUS TEACH (the lead's 3-phase contract, 2026-07-17): the game counts
    // BY ITSELF — KG children who cannot count yet WATCH the counting happen. All N objects are
    // visible; the demo hand moves to each in turn; a BIG running count above updates 1..N with
    // vo_num_N per touch; then the conclusion line plays ("ये पाँच सेब हैं!") and आगे unlocks.
    // NO required interaction, NO options — never a test. Zero (N=0): empty tray, straight to the
    // conclusion ("यहाँ कुछ नहीं — शून्य!"). data:{count, object} audio:{prompt?, conclude}
    mount(host, slide){
      const d = slide.data, N = d.count, obj = d.object;
      state.ownsAudio = true; setNavActive(false); setSwMood("teach");
      const wrap = document.createElement("div"); wrap.className = "demo-stage";
      const counter = document.createElement("div"); counter.className = "demo-count";
      counter.textContent = N === 0 ? "0" : "";
      const row = document.createElement("div"); row.className = "count-row demo-row" + (N > 8 && !d.per_row ? " dense" : "");
      if(d.per_row){ row.classList.add("perrow"); row.style.gridTemplateColumns = `repeat(${d.per_row}, auto)`; }
      const items = [];
      for(let k = 0; k < N; k++){
        const it = document.createElement("div"); it.className = "count-item demo-item";
        it.innerHTML = imgOrEmoji(obj.img, obj.emoji, "cobj-img", "cobj-emoji") + `<span class="count-badge"></span>`;
        row.appendChild(it); items.push(it);
      }
      if(N === 0){ row.classList.add("demo-empty"); }
      wrap.appendChild(counter); wrap.appendChild(row); host.appendChild(wrap);
      let i = 0;
      const conclude = ()=>{ stopNudge();
        play(audioFor(slide, "conclude") || null, ()=> setNavActive(true)); };
      const step = ()=>{
        if(state.idx !== undefined && CARD.slides[state.idx] !== slide) return;   // slide changed — stop
        if(i >= N){ setTimeout(conclude, 400); return; }
        const it = items[i];
        it.classList.add("counted", "demo-hit");
        it.querySelector(".count-badge").textContent = String(i + 1);
        counter.textContent = String(i + 1);
        counter.classList.remove("demo-pop"); void counter.offsetWidth; counter.classList.add("demo-pop");
        pointNudgeAt(it);
        i++;
        play("assets/Audio/vo_num_" + i + "." + AUDIO_EXT, ()=> setTimeout(step, 420));
      };
      play(audioFor(slide, "prompt") || null, ()=> setTimeout(step, 500));
      state.replayAudio = ()=> play(audioFor(slide, i >= N ? "conclude" : "prompt") || null, ()=>{});
    }
  },

  MEET_NUMBER: {
    mount(host, slide){
      if(slide.data && slide.data.present === "crane"){ return btCraneMeet(host, slide); }   // Block Town teach
      const wrap = document.createElement("div"); wrap.className = "meet-stage number-meet";
      const n = slide.data.count;
      // [16d] dual-code the numeral: hands for 1..5; for bigger numbers (teens) the Hindi number WORD.
      // Never the numeral twice — fingerCount's out-of-range fallback IS the numeral, which rendered
      // the "12 over 12" teach card the SME flagged on MTKGA01_L01_S04.
      const word = (slide.data.numerals || [])[n-1] || "";
      const second = (n>=1 && n<=5) ? fingerCount(n,'meet-hand') : (word ? `<span class="num-word">${word}</span>` : "");
      wrap.innerHTML = `
        <div class="meet-number-box"><span class="num-glyph">${n}</span>${second}</div>
        <div class="meet-arrow">→</div>`;
      // [16d] the teach set honors data.per_row (rows of 10 → a teen visibly reads as ten-and-ones)
      const setEl = stimulusCountSet(n, slide.data.object, false, slide.data.per_row);
      setEl.classList.add("meet-set");
      wrap.appendChild(setEl);
      host.appendChild(wrap);
      state.gateNavUntilAudio = true; setNavActive(false);
      $("navBtn").onclick = ()=> completeSlide(true);
    }
  },

  COUNT_HOW_MANY: {
    mount(host, slide){
      const setEl = stimulusCountSet(slide.data.count, slide.data.object, slide.data.scatter, slide.data.per_row);
      mountTapOptions({
        slide, host, signalName: "cardinality_first_try",
        stimulus: setEl,
        nudgeTarget: null,   // nothing to re-tap here → no idle hand
        options: slide.data.options,
        columnsHint: Math.min(slide.data.options.length, 5),
        isCorrect: (opt) => opt.value === slide.data.count,
        // SME (S01 review deck): finger-hands are a TUTORIAL teaching aid only — in guided/
        // independent/practice/mastery the options are the NUMBER ALONE, larger.
        optionRenderer: (opt) => slide.phase === "tutorial" ? numFingerCell(opt.value) : bigNumCell(opt.value),
        mastery: slide.phase === "mastery",
        // HINT = count the set FOR the child (highlight + say एक/दो/तीन + numeral on top)
        hintAction: (done) => demoCountSet(setEl, slide.data.count, slide.data.numerals, done)
      });
    }
  },

  PICK_SET_BY_NUMBER: {
    // SME-designed REVERSE how-many (S01 review deck, new pages): a big NUMBER is the stimulus;
    // the options are small OBJECT SETS — tap the set with that many. Speak-on-tap = each set's own
    // count line ("इसमें तीन चीज़ें हैं।"), which doubles as the SME's wrong-tap hint; the ladder then
    // runs try_again → hint → reveal-glow as everywhere. data:{target, options:[{count, object:{img,emoji},
    // audio, correct}]}.
    mount(host, slide){
      const d = slide.data;
      const stim = document.createElement("div"); stim.className = "psn-stimulus";
      stim.innerHTML = `<span class="psn-num">${devNumeral(d.target)}</span>`;
      mountTapOptions({
        slide, host, signalName: "pick_set_first_try",
        stimulus: stim,
        nudgeTarget: null,
        options: d.options,
        columnsHint: Math.min(d.options.length, 3),
        isCorrect: (opt) => opt.correct === true,
        optionRenderer: (opt) => {
          const c = document.createElement("div"); c.className = "psn-cell";
          let inner = "";
          for(let i=0;i<opt.count;i++) inner += `<span class="psn-obj">${imgOrEmoji(opt.object.img, opt.object.emoji, "psn-img", "psn-emoji")}</span>`;
          c.innerHTML = `<div class="psn-set">${inner}</div>`;
          return c;
        },
        mastery: slide.phase === "mastery"
      });
    }
  },

  MAKE_SET: {
    mount(host, slide){
      const N = slide.data.target, obj = slide.data.object;
      const wrap = document.createElement("div"); wrap.className = "makeset-stage";
      wrap.innerHTML = `
        <div class="makeset-target"><span class="ms-label">डालो</span><span class="num-glyph">${devNumeral(slide.data.target)}</span>${imgOrEmoji(obj.img, obj.emoji, "ms-goal-obj", "ms-goal-emoji")}</div>
        <div class="makeset-frame" id="msFrame"></div>
        <button class="makeset-add" id="msAdd"><span class="ms-add-plus">＋</span>${imgOrEmoji(obj.img, obj.emoji, "ms-add-obj", "ms-add-emoji")}</button>`;
      host.appendChild(wrap);
      const frame = wrap.querySelector("#msFrame"), addBtn = wrap.querySelector("#msAdd");
      const numerals = slide.data.numerals || [];
      const MAXITEMS = 5;                          // never allow more than 5
      let c = 0; state.attempts = 0; state.locked = false; state.hintActive = false;
      const refreshNav = ()=> setNavActive(!state.locked && !state.hintActive && c === N);  // आगे activates ONLY at exactly N — no premature/wrong submit; child self-corrects by adding more / removing (×). Nudge on the add-button guides an idle child.
      function makeItem(){
        const it = document.createElement("div"); it.className = "ms-item";
        it.innerHTML = imgOrEmoji(obj.img, obj.emoji, "cobj-img", "cobj-emoji") + `<span class="ms-del" aria-label="हटाओ">×</span>`;
        const remove = (e)=>{ if(e) e.stopPropagation(); if(state.locked || state.hintActive) return; it.remove(); c--; refreshNav(); };
        // remove ONLY via the explicit × badge — tapping the object itself must NOT delete it
        // (the count tutorial teaches "tap the object to count it"; a placed apple that vanishes on tap
        //  would silently destroy the child's work)
        it.querySelector(".ms-del").onclick = remove;
        frame.appendChild(it); return it;
      }
      addBtn.onclick = ()=>{
        if(state.locked || state.hintActive) return;
        if(c >= MAXITEMS){ addBtn.classList.add("shake"); setTimeout(()=> addBtn.classList.remove("shake"), 420); return; }  // cap at 5
        c++; makeItem();
        play("assets/Audio/vo_num_" + c + "." + AUDIO_EXT);   // count up as you add
        SwiftPAL.emit("make_set_add", { slide_id: slide.id, count: c });
        refreshNav();
      };
      // HINT = count what the child actually placed (highlight + say the number)
      const runHint = (after)=>{
        state.hintActive = true; refreshNav();
        demoCount([...frame.querySelectorAll(".ms-item")], numerals, ()=>{ state.hintActive = false; refreshNav(); if(after) after(); });
      };
      $("hintBtn").onclick = ()=>{ if(state.locked || state.hintActive) return;
        SwiftPAL.emit("hint_shown", { slide_id: slide.id, manual: true }); runHint(); };
      // आगे = SUBMIT. correct → celebrate & advance. wrong → graduated scaffold, same as
      // everywhere: 1st = try again, 2nd = count-demo hint, 3rd = REVEAL (auto-fix to N,
      // count 1..N automatically, then move to the next slide).
      $("navBtn").onclick = ()=>{
        if(state.locked || state.hintActive || c !== N) return;   // gated to exactly N → only the correct-set path runs (self-correcting design)
        if(c === N){
          state.locked = true; refreshNav();
          SwiftPAL.emit("make_set_correct", { slide_id: slide.id, phase: slide.phase,
            value: true, target: N, attempts: state.attempts + 1, latency_ms: Date.now()-state.slideStart });
          play("assets/Audio/vo_total_" + N + "." + AUDIO_EXT, ()=>
            celebrateThenAdvance(slide, false));   // standard: confetti + VO + auto-advance, no popup
          return;
        }
        state.attempts++;
        SwiftPAL.emit("answer_wrong", { slide_id: slide.id, phase: slide.phase, attempts: state.attempts, made: c, target: N });
        const maxA = (CARD.scaffold_rules && CARD.scaffold_rules.max_attempts) || 3;
        if(state.attempts >= maxA){
          // 3rd wrong → reveal: correct the set to exactly N, count it 1..N, then advance
          state.locked = true; state.scaffoldLevel = 3; refreshNav();
          while(frame.querySelectorAll(".ms-item").length > N) frame.querySelector(".ms-item:last-child").remove();
          while(frame.querySelectorAll(".ms-item").length < N) makeItem();
          c = N;
          SwiftPAL.emit("answer_revealed", { slide_id: slide.id, phase: slide.phase, attempts: state.attempts });
          state.hintActive = true;
          // count the (now-correct) set 1..N, then say the total "कुल N", then advance
          demoCount([...frame.querySelectorAll(".ms-item")], numerals, ()=>{
            state.hintActive = false;
            play("assets/Audio/vo_total_" + N + "." + AUDIO_EXT, ()=> setTimeout(()=> completeSlide(false), 500));
          });
        } else if(state.attempts === 2){
          runHint();                                                   // 2nd wrong → count what they made
        } else {
          // 1st wrong → try again, WITH the spoken VO (was silent)
          showBox("", audioText(slide,"try_again") || "फिर से कोशिश करो।", "wrong", audioFor(slide,"try_again"), ()=>{});
        }
      };
      setNavActive(false);
      pointNudgeAt(addBtn);
    }
  },

  COMPARE_SETS: {
    // Two visible groups, TWO picture options — the child taps the object that has MORE (or LESS).
    // No बराबर chip (lead review): equality is taught in MEET_COMPARE + produced on the see-saw, so
    // a judge question always has one clear answer between the two objects. Tap-to-answer: a wrong
    // tap buzzes + crosses + locks that card; the right one confetti-cheers + advances.
    mount(host, slide){
      const d = slide.data;
      const stage = stimulusCompareSets(d);
      // JUDGE (test): hide the "मिलाओ" reveal button — its one-to-one reveal + leftover glow gives the
      // answer away (and on a "less" question it glows the MORE set, pointing at the WRONG option).
      // The two rows stay visible so the child still compares by eye. (Reveal stays only on MEET_COMPARE.)
      const mb = stage.querySelector(".cmp-match-btn"); if(mb) mb.style.display = "none";
      const answer = (d.ask === "less") ? (d.a_count < d.b_count ? "a" : "b")
                                        : (d.a_count > d.b_count ? "a" : "b");
      const options = [ {kind:"a", obj:d.a_object}, {kind:"b", obj:d.b_object} ];
      // (option shuffle is now centralized in mountTapOptions — no per-module reverse needed)
      mountTapOptions({
        slide, host, signalName: "compare_first_try",
        stimulus: stage,
        nudgeTarget: null,
        options,
        columnsHint: 2,
        isCorrect: (opt)=> opt.kind === answer,
        optionRenderer: (opt)=>{
          const cell = document.createElement("div");
          cell.innerHTML = imgOrEmoji(opt.obj.img, opt.obj.emoji, "pic-img", "cmp-chip-emoji")
            + `<span class="cmp-chip-lbl">${opt.obj.word_hi || ""}</span>`;
          return cell;
        },
        mastery: slide.phase === "mastery"
      });
    }
  },

  MEET_COMPARE: {
    // TEACH BY DOING (lead review): the child COUNTS each group by tapping its objects one-by-one
    // (running numeral + spoken एक/दो/तीन), the top group then the bottom. Then the one-to-one
    // match reveals, the leftover glows, and Swiftie EXPLAINS the outcome by name — e.g.
    // "एक सेब बच गया, सेब ज़्यादा हैं, केले कम" / "कुछ नहीं बचा, दोनों बराबर". आगे appears after.
    mount(host, slide){
      const d = slide.data;
      const wrap = document.createElement("div"); wrap.className = "meet-compare";
      const stage = stimulusCompareSets({a_object:d.a_object, a_count:d.a_count,
                                          b_object:d.b_object, b_count:d.b_count, show_matches:false});
      const mb = stage.querySelector(".cmp-match-btn"); if(mb) mb.style.display = "none";
      const verdict = document.createElement("div");
      verdict.className = "cmp-verdict " + (d.outcome || "more");
      verdict.textContent = d.label_hi || "";
      wrap.appendChild(stage); wrap.appendChild(verdict);
      host.appendChild(wrap);

      state.gateNavUntilAudio = false; state.locked = false; state.ownsAudio = true; setNavActive(false);
      $("navBtn").onclick = ()=>{ if(state.locked) completeSlide(true); };

      // 🔊 replay: re-hear the teach line (and, once revealed, the explanation). autoPlayChain skips
      // count_intro/explain, so without this the header chip would be silent on teach slides.
      let revealed = false;
      state.replayAudio = ()=>{ const chain = [audioFor(slide, "count_intro")];
        if(revealed) chain.push(audioFor(slide, "explain"));
        playChain(chain.filter(Boolean), 0); };

      const rowA = [...stage.querySelectorAll(".cmp-row.top .cobj")];
      const rowB = [...stage.querySelectorAll(".cmp-row.bot .cobj")];

      // make one row countable-by-tapping; cb fires once every item in it is counted
      function countRow(items, cb){
        const nudgeNext = ()=>{ const nx = items.find(o=>!o.classList.contains("counted"));
          if(nx) pointNudgeAt(nx); else stopNudge(); };
        let n = 0;
        items.forEach(o=>{
          o.classList.add("tappable");
          o.onclick = ()=>{
            if(state.locked || o.classList.contains("counted")) return;
            o.classList.add("counted", "counting"); n++; sfxTap();
            let cal = o.querySelector(".count-callout");
            if(!cal){ cal = document.createElement("span"); cal.className = "count-callout"; o.appendChild(cal); }
            cal.textContent = n;
            play("assets/Audio/vo_num_" + n + "." + AUDIO_EXT, ()=>{});
            if(items.every(x=>x.classList.contains("counted"))){ stopNudge(); setTimeout(cb, 550); }
            else nudgeNext();
          };
        });
        nudgeNext();
        // [16h] Phase-1 autonomous mode (lead's 3-phase contract): the demo hand counts the row
        // BY ITSELF — drives the same handlers a child would, so behavior is identical.
        if(slide.data.auto){
          items.forEach(o=> o.classList.remove("tappable"));
          let ai = 0;
          (function autoTap(){
            if(CARD.slides[state.idx] !== slide || ai >= items.length) return;
            const o = items[ai++]; pointNudgeAt(o); if(o.onclick) o.onclick();
            setTimeout(autoTap, 950);
          })();
        }
      }

      // intro VO → count group A → count group B → reveal match + explain the outcome.
      // NB: uses non-autochain role names (count_intro / explain) so mountSlide's autoPlayChain
      // does NOT also fire the intro — this module owns its own audio sequence.
      play(audioFor(slide, "count_intro") || null, ()=>{
        countRow(rowA, ()=> countRow(rowB, ()=>{
          stage._revealMatches(()=>{
            verdict.classList.add("show"); setSwMood("point");
            state.locked = true; revealed = true; setNavActive(true);
            play(audioFor(slide, "explain") || null, ()=>{});
          });
        }));
      });
    }
  },

  MAKE_EQUAL: {
    // PRODUCE mechanic (see-saw): the left pan holds a fixed group; the child taps + जोड़ो to
    // add to the right pan (tap an added item to take it back). The beam tilts toward the heavier
    // side in real time; at equal it levels, locks, celebrates. Overshoot is enacted (invite to
    // remove), never a red ✗ — the KG "produce, don't pick" model.
    mount(host, slide){
      const d = slide.data, L = d.a_count, fixedObj = d.a_object, addObj = d.b_object;
      const MAXR = d.max || Math.max(L + 2, 6);
      const wrap = document.createElement("div"); wrap.className = "balance-stage";
      wrap.innerHTML = `
        <div class="balance">
          <div class="beam-wrap" id="beamWrap"><div class="beam"></div>
            <div class="pan pan-left"><div class="pan-grid" id="panL"></div></div>
            <div class="pan pan-right"><div class="pan-grid" id="panR"></div></div></div>
          <div class="fulcrum"></div>
        </div>
        <button class="balance-add" id="balAdd" type="button"></button>`;
      host.appendChild(wrap);
      const panL = wrap.querySelector("#panL"), panR = wrap.querySelector("#panR");
      const beam = wrap.querySelector("#beamWrap"), addBtn = wrap.querySelector("#balAdd");
      const balance = wrap.querySelector(".balance");
      addBtn.innerHTML = imgOrEmoji(addObj.img, addObj.emoji, "cobj-img", "cobj-emoji") + `<span>+ जोड़ो</span>`;
      for(let i=0;i<L;i++){ const c=document.createElement("span"); c.className="cobj";
        c.innerHTML = imgOrEmoji(fixedObj.img, fixedObj.emoji, "cobj-img", "cobj-emoji"); panL.appendChild(c); }
      let right = 0; state.locked = false; state.attempts = 0; let tipT = 0;
      const TILT = 6, TMAX = 15;
      const tilt = ()=>{ const diff = right - L; const deg = Math.max(-TMAX, Math.min(TMAX, diff*TILT));
        beam.style.transform = `translateX(-50%) rotate(${deg}deg)`; balance.classList.toggle("level", diff===0 && right>0); };
      const check = ()=>{ if(state.locked) return; const diff = right - L;
        if(diff===0 && right>0){ state.locked = true; setNavActive(true);
          SwiftPAL.emit("make_equal_correct", { slide_id: slide.id, phase: slide.phase, value: true,
            count: right, target: L, attempts: state.attempts + 1, latency_ms: Date.now()-state.slideStart });
          showBox("⚖️", audioText(slide,"balanced") || "बराबर! दोनों बराबर हैं।", "correct", audioFor(slide,"balanced") || null, ()=>{});
        } else if(diff > 0){ state.attempts++;
          SwiftPAL.emit("answer_wrong", { slide_id: slide.id, phase: slide.phase, made: right, target: L });
          if(Date.now()-tipT > 1200){ tipT = Date.now();
            showBox("", audioText(slide,"too_many") || "बहुत ज़्यादा! एक हटाओ।", "hint", audioFor(slide,"too_many"), ()=>{}); } }
      };
      const addItem = ()=>{ const c=document.createElement("span"); c.className="cobj added";
        c.innerHTML = imgOrEmoji(addObj.img, addObj.emoji, "cobj-img", "cobj-emoji");
        c.onclick = ()=>{ if(state.locked) return; c.remove(); right = Math.max(0, right-1); tilt(); check(); };
        panR.appendChild(c); right++; };
      addBtn.onclick = ()=>{ if(state.locked) return;
        if(right >= MAXR){ addBtn.classList.add("shake"); setTimeout(()=> addBtn.classList.remove("shake"), 400); return; }
        addItem(); tilt(); sfxTap();
        // count EVERY added item aloud INCLUDING the final/target one (एक, दो, तीन) — then, on the
        // last count, the "बराबर" VO follows (check runs in the count's onEnd so the number isn't cut).
        if(right <= L) play("assets/Audio/vo_num_" + right + "." + AUDIO_EXT, right === L ? ()=> check() : ()=>{});
        else check();   // overshoot → "एक हटाओ" hint
      };
      setNavActive(false);
      $("navBtn").onclick = ()=>{ if(state.locked) completeSlide(true); };
      tilt();                 // START tilted toward the heavier (left) group — the see-saw is NOT level yet
      pointNudgeAt(addBtn);
    }
  },

  MEET_PATTERN: {
    // TEACH: show a repeating pattern and pulse the repeating UNIT (first data.unit_len cells) a few
    // times so the child sees "this part comes again". Nav gated on the VO, like MEET_NUMBER.
    mount(host, slide){
      const d = slide.data;
      const wrap = document.createElement("div"); wrap.className = "pattern-stage";
      const lbl = document.createElement("div"); lbl.className = "pat-unit-lbl"; lbl.textContent = "यह हिस्सा दोहराता है 🔁";
      const row = document.createElement("div"); row.className = "pattern-row";
      d.items.forEach(o=>{ const c = document.createElement("div"); c.className = "pat-cell";
        c.innerHTML = imgOrEmoji(o.img, o.emoji, "cobj-img", "cobj-emoji"); row.appendChild(c); });
      wrap.appendChild(lbl); wrap.appendChild(row); host.appendChild(wrap);
      state.gateNavUntilAudio = true; setNavActive(false);
      $("navBtn").onclick = ()=> completeSlide(true);
      const cells = [...row.children]; let rep = 0;
      const glow = ()=>{ cells.forEach((c,i)=> { if(i < d.unit_len) c.classList.add("unit-glow"); });
        setTimeout(()=> cells.forEach(c=> c.classList.remove("unit-glow")), 1100); };
      glow(); const t = setInterval(()=>{ if(rep++ >= 2){ clearInterval(t); return; } glow(); }, 1700);
    }
  },

  PATTERN_BUILD: {
    // PRODUCE: a pattern with empty ghost slot(s) — at the END (extend) or in the MIDDLE (fill the
    // gap). Tap a tray item to drop it into the active slot; the correct item = data.items[slot].
    // Wrong taps bounce (enacted, no ✗). Fill every blank → complete. data:{items[],blanks[],tray[]}.
    mount(host, slide){
      const d = slide.data;
      const wrap = document.createElement("div"); wrap.className = "pattern-stage";
      const row = document.createElement("div"); row.className = "pattern-row";
      const cells = d.items.map((o,i)=>{
        const c = document.createElement("div");
        if(d.blanks.includes(i)){ c.className = "pat-ghost"; c.innerHTML = `<span class="qmark">?</span>`; }
        else { c.className = "pat-cell"; c.innerHTML = imgOrEmoji(o.img, o.emoji, "cobj-img", "cobj-emoji"); }
        row.appendChild(c); return c;
      });
      const tray = document.createElement("div"); tray.className = "pattern-tray";
      d.tray.forEach(o=>{ const t = document.createElement("div"); t.className = "pat-tray-item"; t._obj = o;
        t.innerHTML = imgOrEmoji(o.img, o.emoji, "cobj-img", "cobj-emoji"); tray.appendChild(t); });
      wrap.appendChild(row); wrap.appendChild(tray); host.appendChild(wrap);
      const blanks = d.blanks.slice(); let bi = 0, wrongStreak = 0, revealedAny = false;
      state.locked = false; state.attempts = 0;
      const key = (o)=> o.img || o.emoji;
      const activeGhost = ()=> cells[blanks[bi]];
      const markActive = ()=>{ cells.forEach(c=> c.classList.remove("active"));
        // idle nudge points at the ACTIVE BLANK ('?' slot = "put one here"), re-armed per blank —
        // NEVER at a tray answer; startNudge is phase-aware so it's silent in practice/mastery.
        if(bi < blanks.length){ activeGhost().classList.add("active"); startNudge(slide, activeGhost()); } else stopNudge(); };
      const flashHint = ()=>{ const want = d.items[blanks[bi]], g = activeGhost(); const prev = g.innerHTML;
        g.innerHTML = imgOrEmoji(want.img, want.emoji, "cobj-img", "cobj-emoji"); g.style.opacity = ".4";
        setTimeout(()=>{ if(g.classList.contains("pat-ghost")){ g.innerHTML = prev; g.style.opacity = ""; } }, 950); };
      const placeCorrect = ()=>{                      // one placement path (tap AND reveal)
        const want = d.items[blanks[bi]], g = activeGhost();
        g.className = "pat-cell"; g.innerHTML = imgOrEmoji(want.img, want.emoji, "cobj-img", "cobj-emoji");
        g.classList.add("unit-glow"); setTimeout(()=> g.classList.remove("unit-glow"), 700); bi++;
        if(bi >= blanks.length){
          state.locked = true; stopNudge();
          SwiftPAL.emit("pattern_extend_correct", { slide_id: slide.id, phase: slide.phase, value: !revealedAny,
            attempts: state.attempts + 1, latency_ms: Date.now()-state.slideStart });
          // engine standard: confetti + cheer + correct VO + AUTO-advance — no popup, no आगे gate.
          celebrateThenAdvance(slide, revealedAny);
        } else markActive();
      };
      markActive();
      tray.querySelectorAll(".pat-tray-item").forEach(t=>{
        t.onclick = ()=>{
          if(state.locked || bi >= blanks.length) return;
          stopNudge();
          const want = d.items[blanks[bi]];
          if(key(t._obj) === key(want)){
            wrongStreak = 0;
            placeCorrect();
          } else {
            state.attempts++;
            t.classList.add("shake"); setTimeout(()=> t.classList.remove("shake"), 420);
            activeGhost().classList.add("shake"); setTimeout(()=> activeGhost().classList.remove("shake"), 420);
            SwiftPAL.emit("answer_wrong", { slide_id: slide.id, phase: slide.phase, attempts: state.attempts });
            // layered ladder, standard-aligned: L1 spoken try-again (buzz + Swiftie, no popup) →
            // L2 flash the answer ghost + spoken hint → L3 reveal ceiling: DEMONSTRATE the placement.
            if(++wrongStreak >= (CARD.scaffold_rules.max_attempts||3)){
              revealedAny = true; wrongStreak = 0;
              activeGhost().classList.add("reveal-glow");
              play(audioFor(slide,"reveal") || audioFor(slide,"hint") || null, ()=>{});
              setTimeout(()=>{ placeCorrect(); }, 1000);
            }
            else if(state.attempts >= 2){ flashHint(); play(audioFor(slide,"hint") || null, ()=>{}); }
            else dragWrong(slide);
          }
        };
      });
      setNavActive(false);
      $("navBtn").onclick = ()=>{};   // completion is automatic now — आगे never gates a solved pattern
      $("hintBtn").onclick = ()=>{ if(!state.locked && bi < blanks.length) flashHint(); };
      // NB: the idle nudge is armed by markActive() → startNudge(activeGhost) above — it points at the
      // BLANK, phase-aware. (Bug fix: was pointNudgeAt(first tray tile) = an immediate hand on the WRONG
      // answer on most slides, and it showed even in mastery.)
    }
  },

  /* ===== NUMBER-SEQUENCE PATH (MTKGA01_L02_S04 — "completes a number sequence within 20") =====
     Three additive modules that share the .seq-* number-path skin. Numerals are crisp text glyphs
     (Baloo), only the tile chrome is rounded — content-true geometry (never round the number). */

  MEET_SEQUENCE: {
    // TEACH BY DOING: a number path; a token sits on the first cell. The child taps the glowing NEXT
    // cell to hop the token forward, each number spoken (vo_num_N) with an ascending thunk — so the
    // child ENACTS "numbers move forward one step at a time" (curriculum teach spec). Nav gates until
    // the token reaches the end, then Swiftie's explain line plays. data:{path:[n…], token?}.
    mount(host, slide){
      const d = slide.data, nums = d.path;
      state.ownsAudio = true; setNavActive(false); setSwMood("teach");
      const stage = document.createElement("div"); stage.className = "seq-stage";
      const path  = document.createElement("div"); path.className = "seq-path";
      const cw = nums.length > 7 ? 74 : 90;
      const cells = nums.map((n,i)=>{
        if(i){ const con = document.createElement("div"); con.className = "seq-connector"; path.appendChild(con); }
        const cell = document.createElement("div"); cell.className = "seq-cell";
        cell.style.width = cell.style.height = cw+"px"; cell.style.fontSize = Math.round(cw*0.56)+"px";
        cell.textContent = n; path.appendChild(cell); return cell;
      });
      stage.appendChild(path); host.appendChild(stage);
      const token = document.createElement("span"); token.className = "seq-token"; token.textContent = d.token || "🐤";
      let pos = 0;
      const place = ()=>{ cells.forEach((c,i)=> c.classList.toggle("lit", i <= pos));
        if(!cells[pos].contains(token)) cells[pos].appendChild(token); };
      const glowNext = ()=>{ cells.forEach((c,i)=> c.classList.toggle("active", i === pos+1));
        if(pos+1 < cells.length) startNudge(slide, cells[pos+1]); else stopNudge(); };
      place(); btThunk(1); play("assets/Audio/vo_num_" + nums[0] + "." + AUDIO_EXT, ()=>{}); glowNext();
      const advance = ()=>{
        if(pos >= cells.length-1) return;
        pos++; cells[pos].classList.remove("active"); place(); btThunk(pos+1);
        play("assets/Audio/vo_num_" + nums[pos] + "." + AUDIO_EXT, ()=>{});
        if(pos >= cells.length-1){ stopNudge();
          SwiftPAL.emit("meet_sequence_done", { slide_id: slide.id, phase: slide.phase });
          setTimeout(()=> play(audioFor(slide, "explain") || null, ()=> setNavActive(true)), 500);
        } else glowNext();
      };
      cells.forEach((c,i)=>{ c.onclick = ()=>{ if(i === pos+1) advance(); }; });
      // 🔊 replay re-speaks the current number (module owns its audio; autoPlayChain is skipped)
      state.replayAudio = ()=> play("assets/Audio/vo_num_" + nums[pos] + "." + AUDIO_EXT, ()=>{});
      $("navBtn").onclick = ()=> completeSlide(true);
    }
  },

  SEQUENCE_COMPLETE: {
    // PRODUCE test: a number path with blank(s); tap a tray numeral into the active blank. Correct =
    // path[blankIdx]. Wrong = shake + soft buzz + spoken try_again; reveal (demonstrate) after
    // max_attempts. Fills left→right. data:{path:[n… , with the blank positions still holding the true
    // number], blanks:[idx…], tray:[n…] (numerals incl. misconception distractors)}.
    mount(host, slide){
      const d = slide.data;
      const stage = document.createElement("div"); stage.className = "seq-stage";
      const path  = document.createElement("div"); path.className = "seq-path";
      const cw = d.path.length > 7 ? 74 : 90;
      const cells = d.path.map((n,i)=>{
        if(i){ const con = document.createElement("div"); con.className = "seq-connector"; path.appendChild(con); }
        const cell = document.createElement("div");
        cell.style.width = cell.style.height = cw+"px"; cell.style.fontSize = Math.round(cw*0.56)+"px";
        if(d.blanks.includes(i)){ cell.className = "seq-cell seq-ghost"; cell.innerHTML = '<span class="seq-q">?</span>'; }
        else { cell.className = "seq-cell filled"; cell.textContent = n; }
        path.appendChild(cell); return cell;
      });
      const tray = document.createElement("div"); tray.className = "seq-tray";
      d.tray.forEach(n=>{ const t = document.createElement("div"); t.className = "seq-tile"; t._num = n; t.textContent = n; tray.appendChild(t); });
      stage.appendChild(path); stage.appendChild(tray); host.appendChild(stage);

      const blanks = d.blanks.slice(); let bi = 0, wrongStreak = 0, revealedAny = false;
      state.locked = false; state.attempts = 0;
      const activeGhost = ()=> cells[blanks[bi]];
      const markActive = ()=>{ cells.forEach(c=> c.classList.remove("active"));
        if(bi < blanks.length){ activeGhost().classList.add("active"); startNudge(slide, activeGhost()); } else stopNudge(); };
      const placeCorrect = ()=>{
        const want = d.path[blanks[bi]], g = activeGhost();
        g.className = "seq-cell filled unit-glow"; g.textContent = want; setTimeout(()=> g.classList.remove("unit-glow"), 700);
        const tile = [...tray.children].find(x=> x._num === want && !x.classList.contains("used")); if(tile) tile.classList.add("used");
        bi++;
        if(bi >= blanks.length){
          state.locked = true; stopNudge();
          SwiftPAL.emit("sequence_complete_correct", { slide_id: slide.id, phase: slide.phase, value: !revealedAny,
            attempts: state.attempts + 1, latency_ms: Date.now()-state.slideStart });
          celebrateThenAdvance(slide, revealedAny);
        } else markActive();
      };
      markActive();
      tray.querySelectorAll(".seq-tile").forEach(t=>{
        t.onclick = ()=>{
          if(state.locked || bi >= blanks.length || t.classList.contains("used")) return;
          stopNudge();
          if(t._num === d.path[blanks[bi]]){ wrongStreak = 0; placeCorrect(); }
          else {
            state.attempts++;
            t.classList.add("shake"); setTimeout(()=> t.classList.remove("shake"), 420);
            activeGhost().classList.add("shake"); setTimeout(()=> activeGhost().classList.remove("shake"), 420);
            SwiftPAL.emit("answer_wrong", { slide_id: slide.id, phase: slide.phase, attempts: state.attempts });
            if(++wrongStreak >= (CARD.scaffold_rules.max_attempts || 3)){
              revealedAny = true; wrongStreak = 0;
              activeGhost().classList.add("reveal-glow");
              play(audioFor(slide, "reveal") || audioFor(slide, "hint") || null, ()=>{});
              setTimeout(()=> placeCorrect(), 1000);
            } else dragWrong(slide);
          }
        };
      });
      setNavActive(false); $("navBtn").onclick = ()=>{};   // completion is automatic — never gate a solved path
      $("hintBtn").onclick = ()=>{ if(!state.locked && bi < blanks.length){ const g = activeGhost();
        g.classList.add("reveal-glow"); setTimeout(()=> g.classList.remove("reveal-glow"), 800); } };
    }
  },

  SEQUENCE_NEXT: {
    // PICK test (what comes next / before): a number path with ONE '?' cell (null in data.path) is the
    // stimulus; the child taps the correct numeral option. Reuses mountTapOptions → full tap-to-answer
    // contract (wrong=buzz+✗+lock+try_again, right=confetti+advance) + speak-the-number-on-tap +
    // mastery scoring. data:{path:[n…,null,…], options:[{num, audio:"vo_num_N", correct}]}.
    mount(host, slide){
      const d = slide.data;
      const stim = document.createElement("div"); stim.className = "seq-stage";
      const path = document.createElement("div"); path.className = "seq-path";
      const cw = d.path.length > 7 ? 74 : 90;
      d.path.forEach((n,i)=>{
        if(i){ const con = document.createElement("div"); con.className = "seq-connector"; path.appendChild(con); }
        const cell = document.createElement("div");
        cell.style.width = cell.style.height = cw+"px"; cell.style.fontSize = Math.round(cw*0.56)+"px";
        if(n === null){ cell.className = "seq-cell seq-ghost active"; cell.innerHTML = '<span class="seq-q">?</span>'; }
        else { cell.className = "seq-cell filled"; cell.textContent = n; }
        path.appendChild(cell);
      });
      stim.appendChild(path);
      mountTapOptions({
        slide, host, signalName: "sequence_next_correct", stimulus: stim,
        options: d.options,
        optionRenderer: (o)=>{ const cell = document.createElement("div"); const s = document.createElement("span");
          s.className = "seq-optnum"; s.textContent = o.num; cell.appendChild(s); return cell; },
        isCorrect: (o)=> o.correct === true,
        mastery: slide.phase === "mastery",
        columnsHint: d.options.length,
        nudgeTarget: null
      });
    }
  },

  /* ===== ORDERING / SERIATION (MTKGA02_L02_S02 — "orders three objects by size, length, or weight") =====
     Additive modules sharing the .ord-* skin. Objects render at true magnitude (size scale / bar length);
     weight is assessed by 'pick the heaviest' (weight is not visual) — targeting the bigger=heavier
     misconception with a big-but-light distractor. */

  MEET_ORDER: {
    // TEACH BY DOING: the 3 objects are shown already in order (small→big / short→long / light→heavy);
    // the child taps each left→right to hear its rank name (सबसे छोटा / बीच का / सबसे बड़ा etc.), then an
    // explain line plays and नav unlocks. data:{by, items:[{mag,img/emoji/color}] (ascending), rank_audio:[id…],
    // arrow_lo, arrow_hi, hint_icon?}.
    mount(host, slide){
      const d = slide.data; state.ownsAudio = true; setNavActive(false); setSwMood("teach");
      const stage = document.createElement("div"); stage.className = "ord-stage ord-" + d.by;
      const arrow = document.createElement("div"); arrow.className = "ord-arrow";
      arrow.innerHTML = `<span>${d.arrow_lo||""}</span><span class="ord-arrowline"></span><span>${d.arrow_hi||""}</span>`;
      const row = document.createElement("div"); row.className = "ord-tray";
      const cells = d.items.map((o,i)=>{ const el = document.createElement("div"); el.className = "ord-item";
        el.style.opacity = ".5"; el.innerHTML = renderOrdObj(o, d.by); row.appendChild(el); return el; });
      if(d.hint_icon){ const hi = document.createElement("div"); hi.className = "ord-hint-icon"; hi.textContent = d.hint_icon; stage.appendChild(hi); }
      stage.appendChild(arrow); stage.appendChild(row); host.appendChild(stage);
      let tapped = 0;
      const nudgeNext = ()=>{ cells.forEach((c,i)=> c.classList.toggle("active", i === tapped));
        if(tapped < cells.length) startNudge(slide, cells[tapped]); else stopNudge(); };
      nudgeNext();
      cells.forEach((c,i)=>{ c.onclick = ()=>{ if(i !== tapped) return; stopNudge();
        c.classList.remove("active"); c.style.opacity = "1"; c.classList.add("reveal-glow");
        setTimeout(()=> c.classList.remove("reveal-glow"), 600);
        play("assets/Audio/" + (d.rank_audio[i]) + "." + AUDIO_EXT, ()=>{}); tapped++;
        if(tapped >= cells.length){ stopNudge();
          SwiftPAL.emit("meet_order_done", { slide_id: slide.id, phase: slide.phase });
          setTimeout(()=> play(audioFor(slide, "explain") || null, ()=> setNavActive(true)), 450);
        } else nudgeNext();
      }; });
      state.replayAudio = ()=> play(audioFor(slide, "explain") || null, ()=>{});
      $("navBtn").onclick = ()=> completeSlide(true);
    }
  },

  ORDER_BY_ATTR: {
    // PRODUCE test: 3 scrambled objects + a left→right strip (arrow छोटा→बड़ा). Tap the smallest-remaining
    // → it fills the next slot. Wrong (not the current smallest) = shake + soft buzz + spoken try_again;
    // demonstrate after max_attempts. data:{by, items:[{mag,img/emoji/color}], arrow_lo, arrow_hi}.
    mount(host, slide){
      const d = slide.data;
      const stage = document.createElement("div"); stage.className = "ord-stage ord-" + d.by;
      const arrow = document.createElement("div"); arrow.className = "ord-arrow";
      arrow.innerHTML = `<span>${d.arrow_lo||""}</span><span class="ord-arrowline"></span><span>${d.arrow_hi||""}</span>`;
      const strip = document.createElement("div"); strip.className = "ord-strip";
      const n = d.items.length; const slots = [];
      for(let i=0;i<n;i++){ const sl = document.createElement("div"); sl.className = "ord-slot"; strip.appendChild(sl); slots.push(sl); }
      const tray = document.createElement("div"); tray.className = "ord-tray";
      const disp = d.items.slice(); for(let i=disp.length-1;i>0;i--){ const j=(Math.random()*(i+1))|0; [disp[i],disp[j]]=[disp[j],disp[i]]; }
      const sortedMags = d.items.map(o=>o.mag).slice().sort((a,b)=>a-b);
      const tiles = disp.map(o=>{ const el = document.createElement("div"); el.className = "ord-item"; el._mag = o.mag;
        el.innerHTML = renderOrdObj(o, d.by); tray.appendChild(el); return el; });
      stage.appendChild(arrow); stage.appendChild(strip); stage.appendChild(tray); host.appendChild(stage);
      let placed = 0, wrongStreak = 0, revealed = false; state.locked = false; state.attempts = 0;
      const wantMag = ()=> sortedMags[placed];
      const nextTile = ()=> tiles.find(x=> !x.classList.contains("used") && x._mag === wantMag());
      const markActive = ()=>{ slots.forEach((s,i)=> s.classList.toggle("active", i === placed));
        if(placed < n) startNudge(slide, nextTile()); else stopNudge(); };
      const placeInto = (tile)=>{ const slot = slots[placed]; slot.classList.remove("active"); slot.classList.add("filled");
        slot.innerHTML = tile.innerHTML; tile.classList.add("used"); placed++;
        if(placed >= n){ state.locked = true; stopNudge();
          SwiftPAL.emit("order_by_attr_correct", { slide_id: slide.id, phase: slide.phase, value: !revealed,
            attempts: state.attempts + 1, latency_ms: Date.now()-state.slideStart });
          celebrateThenAdvance(slide, revealed);
        } else markActive();
      };
      markActive();
      tiles.forEach(t=>{ t.onclick = ()=>{ if(state.locked || t.classList.contains("used")) return; stopNudge();
        if(t._mag === wantMag()){ wrongStreak = 0; placeInto(t); }
        else { state.attempts++; t.classList.add("shake"); setTimeout(()=> t.classList.remove("shake"), 420);
          SwiftPAL.emit("answer_wrong", { slide_id: slide.id, phase: slide.phase, attempts: state.attempts });
          if(++wrongStreak >= (CARD.scaffold_rules.max_attempts || 3)){ revealed = true; wrongStreak = 0;
            const c = nextTile(); if(c){ c.classList.add("reveal-glow"); play(audioFor(slide,"reveal")||null, ()=>{});
              setTimeout(()=>{ c.classList.remove("reveal-glow"); placeInto(c); }, 1000); }
          } else dragWrong(slide);
        }
      }; });
      setNavActive(false); $("navBtn").onclick = ()=>{};
      $("hintBtn").onclick = ()=>{ if(!state.locked){ const t = nextTile(); if(t){ t.classList.add("reveal-glow"); setTimeout(()=> t.classList.remove("reveal-glow"), 800); } } };
    }
  },

  PICK_EXTREME: {
    // PICK test: tap the object that is the MOST (सबसे बड़ा / सबसे लंबा / सबसे भारी). For weight, options
    // include a big-but-light distractor to break the bigger=heavier misconception. Reuses mountTapOptions
    // → tap-to-answer + speak-the-word-on-tap + mastery. data:{by, options:[{img/emoji/color,mag,label,audio,correct}]}.
    mount(host, slide){
      const d = slide.data;
      mountTapOptions({
        slide, host, signalName: "pick_extreme_correct", stimulus: null,
        options: d.options,
        optionRenderer: (o)=>{ const cell = document.createElement("div"); cell.className = "ord-pick";
          cell.innerHTML = renderOrdObj(o, d.by) + (o.label ? `<span class="lbl">${o.label}</span>` : ""); return cell; },
        isCorrect: (o)=> o.correct === true,
        mastery: slide.phase === "mastery",
        columnsHint: d.options.length,
        nudgeTarget: null
      });
    }
  },

  ORDER_BY_WEIGHT: {
    // PRODUCE test — WEIGHT seriation via A-vs-B COMPARISON (weight is not visual). Two pans: tap a tray
    // object → it loads the next empty pan; with BOTH loaded the beam tilts toward the heavier (it DROPS)
    // + thunk, and the lighter one RISES + pulses. Tap the lighter (risen) object to send it to the next
    // हल्का→भारी slot — accepted only if it is the lightest still unplaced; else it is the lighter of a
    // heavy pair (an even lighter one exists) → soft buzz + try_again, both return. The last object
    // auto-places (it is forced). Objects render at sizes that DON'T match weight (a big balloon can be
    // light) so the SCALE is the only cue. data:{items:[{wmag,dmag,img,emoji}], arrow_lo, arrow_hi}.
    mount(host, slide){
      const d = slide.data;
      const stage = document.createElement("div"); stage.className = "ord-stage ord-weight";
      const arrow = document.createElement("div"); arrow.className = "ord-arrow";
      arrow.innerHTML = `<span>${d.arrow_lo||"हल्का"}</span><span class="ord-arrowline"></span><span>${d.arrow_hi||"भारी"}</span>`;
      const scale = document.createElement("div"); scale.className = "owt-scale";
      scale.innerHTML = `<div class="owt-foot"></div><div class="owt-post"></div>` +
        `<div class="owt-beamwrap"><div class="owt-beam"></div><div class="owt-cap"></div>` +
        `<div class="owt-arm l"></div><div class="owt-arm r"></div>` +
        `<div class="owt-pan l"><div class="owt-load"></div></div><div class="owt-pan r"><div class="owt-load"></div></div></div>`;
      const beamwrap = scale.querySelector(".owt-beamwrap");
      const panEl = { l: scale.querySelector(".owt-pan.l"), r: scale.querySelector(".owt-pan.r") };
      const loadEl = { l: panEl.l.querySelector(".owt-load"), r: panEl.r.querySelector(".owt-load") };
      const strip = document.createElement("div"); strip.className = "ord-strip";
      const n = d.items.length; const slots = [];
      for(let i=0;i<n;i++){ const sl = document.createElement("div"); sl.className = "ord-slot"; strip.appendChild(sl); slots.push(sl); }
      const tray = document.createElement("div"); tray.className = "ord-tray";
      const disp = d.items.slice(); for(let i=disp.length-1;i>0;i--){ const j=(Math.random()*(i+1))|0; [disp[i],disp[j]]=[disp[j],disp[i]]; }
      const sortedW = d.items.map(o=>o.wmag).slice().sort((a,b)=>a-b);
      const tiles = disp.map(o=>{ const el = document.createElement("div"); el.className = "ord-item"; el._o = o; el._w = o.wmag; el._onpan = false;
        el.innerHTML = renderOrdObj({ mag: o.dmag, img: o.img, emoji: o.emoji }, "size"); tray.appendChild(el); return el; });
      stage.appendChild(arrow); stage.appendChild(scale); stage.appendChild(strip); stage.appendChild(tray);
      host.appendChild(stage);

      let placed = 0, wrongStreak = 0, revealed = false, busy = false; state.locked = false; state.attempts = 0;
      const pans = { l: null, r: null };
      const wantW = ()=> sortedW[placed];
      const nextTile = ()=> tiles.find(x=> !x.classList.contains("used") && x._w === wantW());
      const remaining = ()=> tiles.filter(x=> !x.classList.contains("used"));
      const markActive = ()=>{ slots.forEach((s,i)=> s.classList.toggle("active", i === placed));
        if(placed < n && !pans.l && !pans.r){ const t = nextTile(); if(t && !t._onpan) startNudge(slide, t); } else stopNudge(); };
      const resetPans = ()=>{ ["l","r"].forEach(k=>{ const t = pans[k]; if(t){ t._onpan = false; t.style.visibility = ""; }
        loadEl[k].innerHTML = ""; loadEl[k].classList.remove("lighter"); pans[k] = null; }); beamwrap.style.transform = "rotate(0deg)"; };
      const loadPan = (k, t)=>{ pans[k] = t; t._onpan = true; t.style.visibility = "hidden"; loadEl[k].innerHTML = imgOrEmojiSized(t._o.img, t._o.emoji, 56); };
      const compare = ()=>{ beamwrap.style.transform = `rotate(${(pans.r._w - pans.l._w) * 7}deg)`;   // heavier side drops
        btThunk(Math.max(pans.l._w, pans.r._w)); const lightK = pans.l._w < pans.r._w ? "l" : "r";
        loadEl[lightK].classList.add("lighter"); loadEl[lightK === "l" ? "r" : "l"].classList.remove("lighter"); };
      const placeToSlot = (t, cb)=>{ const slot = slots[placed]; slot.classList.remove("active"); slot.classList.add("filled");
        slot.innerHTML = renderOrdObj({ mag: t._o.dmag, img: t._o.img, emoji: t._o.emoji }, "size"); t.classList.add("used"); t._onpan = false; placed++;
        if(placed >= n){ state.locked = true; stopNudge();
          SwiftPAL.emit("order_by_weight_correct", { slide_id: slide.id, phase: slide.phase, value: !revealed,
            attempts: state.attempts + 1, latency_ms: Date.now()-state.slideStart });
          celebrateThenAdvance(slide, revealed);
        } else markActive();
        if(cb) cb();
      };
      // when only one object remains it is forced — weigh it alone briefly, then place it.
      const autoLast = ()=>{ if(state.locked) return; const rem = remaining(); if(rem.length !== 1){ markActive(); return; }
        busy = true; const t = rem[0]; loadPan("l", t); beamwrap.style.transform = "rotate(-9deg)"; btThunk(t._w);
        setTimeout(()=>{ loadEl.l.innerHTML = ""; beamwrap.style.transform = "rotate(0deg)"; placeToSlot(t, ()=>{ busy = false; }); }, 850); };
      // tray tap → load the next empty pan (compare once both are full)
      tiles.forEach(t=>{ t.onclick = ()=>{ if(state.locked || busy || t.classList.contains("used") || t._onpan) return; stopNudge();
        if(!pans.l){ loadPan("l", t); }
        else if(!pans.r){ loadPan("r", t); compare(); }
      }; });
      // pan tap → try to place that pan's object (must be the LIGHTER of the two AND the lightest unplaced)
      ["l","r"].forEach(k=>{ panEl[k].onclick = ()=>{ if(state.locked || busy || !pans.l || !pans.r) return;
        const t = pans[k], other = pans[k === "l" ? "r" : "l"];
        if(t._w > other._w){ const lk = pans.l._w < pans.r._w ? "l" : "r";   // tapped the heavier one → re-pulse the lighter (hint), no penalty
          loadEl[lk].classList.remove("lighter"); void loadEl[lk].offsetWidth; loadEl[lk].classList.add("lighter"); return; }
        if(t._w === wantW()){ busy = true; wrongStreak = 0;   // correct: lighter AND globally lightest
          other._onpan = false; other.style.visibility = "";
          loadEl.l.innerHTML = ""; loadEl.r.innerHTML = ""; loadEl.l.classList.remove("lighter"); loadEl.r.classList.remove("lighter");
          pans.l = null; pans.r = null; beamwrap.style.transform = "rotate(0deg)";
          placeToSlot(t, ()=> setTimeout(()=>{ busy = false; autoLast(); }, 250));
        } else {   // lighter of the pair, but an even lighter one is still unplaced
          state.attempts++; SwiftPAL.emit("answer_wrong", { slide_id: slide.id, phase: slide.phase, attempts: state.attempts });
          if(++wrongStreak >= (CARD.scaffold_rules.max_attempts || 3)){ revealed = true; wrongStreak = 0; resetPans();
            const c = nextTile(); if(c){ c.classList.add("reveal-glow"); play(audioFor(slide, "reveal") || null, ()=>{});
              setTimeout(()=>{ c.classList.remove("reveal-glow"); busy = true; placeToSlot(c, ()=> setTimeout(()=>{ busy = false; autoLast(); }, 250)); }, 900); } }
          else { dragWrong(slide); resetPans(); }
        }
      }; });
      markActive();
      setNavActive(false); $("navBtn").onclick = ()=>{};
      $("hintBtn").onclick = ()=>{ if(!state.locked && !busy){ const t = nextTile(); if(t && !t._onpan){ t.classList.add("reveal-glow"); setTimeout(()=> t.classList.remove("reveal-glow"), 800); } } };
    }
  },

  BUILD_TO_NUMBER: {
    // Signature produce module. data: {target, mode:'guided'|'independent', topper, friend, goal_hi,
    // skyline_done, skyline_total}. Guided = dashed blueprint, auto-completes on fill. Independent =
    // free stack + "बन गया!" serve with world-enacted feedback (short/teeter, never a ✗). Ascending-
    // pitch thunk + spoken एक/दो/… per block. Geometry via offsets (throttle-safe).
    mount(host, slide){
      const d = slide.data, N = d.target, mode = d.mode || "independent";
      const stage = document.createElement("div"); stage.className = "bt-stage";
      const board = document.createElement("div"); board.className = "bt-board";
      board.innerHTML = `<span class="bt-numeral">${N}</span>` +
        (d.topper ? `<img class="bt-goalpic" src="assets/Images/${d.topper}.png" alt="">` : "") +
        (d.goal_hi ? `<span class="bt-goallbl">${d.goal_hi}</span>` : "");
      const track = document.createElement("div"); track.className = "bt-track"; const cells = [];
      for(let i=1;i<=N;i++){ const c = document.createElement("div"); c.className = "bt-nt"; track.appendChild(c); cells.push(c); }
      const yard = document.createElement("div"); yard.className = "bt-yard";
      const crane = document.createElement("div"); crane.className = "bt-crane"; crane.innerHTML = `<img src="assets/Images/obj_crane.png" alt="">`;
      const pile = document.createElement("div"); pile.className = "bt-pile";
      pile.innerHTML = `<div class="bt-pile-blocks"></div><span class="bt-pile-lbl">＋ ब्लॉक</span>`;
      const pb = pile.querySelector(".bt-pile-blocks");
      for(let i=0;i<3;i++){ const b = btBlock(i+1); b.style.left = (i*12) + "px"; b.style.bottom = (i*18) + "px"; pb.appendChild(b); }
      const plotwrap = document.createElement("div"); plotwrap.className = "bt-plotwrap";
      const plot = document.createElement("div"); plot.className = "bt-plot ground " + mode;
      plot.style.setProperty("--bh", Math.max(20, Math.min(46, Math.floor(230/N) - 2)) + "px");   // tall towers auto-shrink to fit
      plotwrap.appendChild(plot);
      const friend = document.createElement("div"); friend.className = "bt-friend";
      if(d.friend) friend.innerHTML = `<img src="assets/Images/${d.friend}.png" alt="">`;
      yard.appendChild(crane); yard.appendChild(pile); yard.appendChild(plotwrap); if(d.friend) yard.appendChild(friend);
      stage.appendChild(board); stage.appendChild(track); stage.appendChild(yard);
      if(d.skyline_total) stage.appendChild(btSkyline(d.skyline_done || 0, d.skyline_total));
      let serveBtn = null;
      if(mode === "independent"){ serveBtn = document.createElement("button"); serveBtn.type = "button"; serveBtn.className = "bt-serve"; serveBtn.textContent = "बन गया!"; stage.appendChild(serveBtn); }
      host.appendChild(stage);

      let count = 0; state.locked = false; state.attempts = 0;
      const lit = ()=> cells.forEach((c,i)=>{ const on = i < count; c.classList.toggle("lit", on); c.textContent = on ? (i+1) : ""; });
      const addSound = ()=>{ btThunk(count); btDust(plot); play("assets/Audio/vo_num_" + count + "." + AUDIO_EXT); };

      function success(){
        state.locked = true; if(serveBtn) serveBtn.disabled = true;
        if(d.topper){ const t = document.createElement("div"); t.className = "bt-topper snap"; t.innerHTML = `<img src="assets/Images/${d.topper}.png" alt="">`; plot.appendChild(t);
          if(d.topper === "top_rocket") setTimeout(()=> t.classList.add("rocket-go"), 750); }
        if(d.friend) friend.classList.add("hop");
        sfxCorrect(); burstStars();
        const lots = [...stage.querySelectorAll(".bt-bldg")]; const nextLot = lots[d.skyline_done || 0];
        if(nextLot) setTimeout(()=> nextLot.classList.add("done"), 380);
        SwiftPAL.emit("build_to_number_correct", { slide_id: slide.id, phase: slide.phase, value: true, target: N, attempts: state.attempts + 1, latency_ms: Date.now()-state.slideStart });
        play("assets/Audio/vo_total_" + N + "." + AUDIO_EXT); setNavActive(true);
      }

      if(mode === "guided"){
        const ghosts = [];
        for(let i=0;i<N;i++){ const g = document.createElement("div"); g.className = "bp-slot"; plot.appendChild(g); ghosts.push(g); }
        ghosts[0].classList.add("next");
        pile.onclick = ()=>{ if(state.locked) return;
          const g = ghosts.find(x=> x.classList.contains("bp-slot"));
          if(!g){ showBox("", "बस इतने ही चाहिए!", "hint", null, ()=>{}); return; }
          g.className = "blk drop"; g.style.background = BT_COLORS[count % 5];
          count++; lit(); addSound();
          const nx = ghosts.find(x=> x.classList.contains("bp-slot")); if(nx) nx.classList.add("next");
          if(count === N) setTimeout(success, 280);
        };
      } else {
        pile.onclick = ()=>{ if(state.locked) return;
          const b = btBlock(count); b.classList.add("drop");
          b.onclick = (e)=>{ e.stopPropagation(); if(state.locked) return; b.remove(); count--; lit(); };
          plot.appendChild(b); count++; lit(); addSound(); };
        serveBtn.onclick = ()=>{ if(state.locked) return;
          if(count === N){ success(); return; }
          state.attempts++;
          SwiftPAL.emit("answer_wrong", { slide_id: slide.id, phase: slide.phase, attempts: state.attempts, made: count, target: N });
          if(count < N){ if(d.friend) friend.classList.add("peer");
            showBox("", "थोड़े और चाहिए!", "hint", null, ()=>{ if(d.friend) friend.classList.remove("peer"); }); }
          else { const bs = [...plot.querySelectorAll(".blk")]; const top = bs[bs.length-1];
            if(top){ top.classList.add("wobble"); setTimeout(()=> top.classList.remove("wobble"), 520); }
            showBox("", "अरे! एक ब्लॉक हटाओ।", "hint", null, ()=>{}); } };
      }
      setNavActive(false);
      $("navBtn").onclick = ()=>{ if(state.locked) completeSlide(true); };
      pointNudgeAt(pile);
    }
  },

  MAKE_NUMBER: {
    // produce-the-numeral dial (grafted from Firefly Valley). A set of N built blocks; ＋/− dials a
    // 1–10 numeral; wrong is inert (build dim), exact match ignites the build + snaps its topper.
    mount(host, slide){
      const d = slide.data, N = d.count;
      const stage = document.createElement("div"); stage.className = "bt-stage";
      if(d.prompt2_hi){ const lbl = document.createElement("div"); lbl.className = "pat-unit-lbl"; lbl.textContent = d.prompt2_hi; stage.appendChild(lbl); }
      const yard = document.createElement("div"); yard.className = "bt-yard";
      const plotwrap = document.createElement("div"); plotwrap.className = "bt-plotwrap";
      const plot = document.createElement("div"); plot.className = "bt-plot ground"; plot.style.filter = "grayscale(.35) brightness(.95)";
      plot.style.setProperty("--bh", Math.max(20, Math.min(46, Math.floor(230/N) - 2)) + "px");
      for(let i=0;i<N;i++){ plot.appendChild(btBlock(i)); }
      plotwrap.appendChild(plot); yard.appendChild(plotwrap);
      const dial = document.createElement("div"); dial.className = "bt-dial";
      dial.innerHTML = `<button class="bt-dial-btn" data-d="-1" type="button">−</button><div class="bt-dial-val">1</div><button class="bt-dial-btn" data-d="1" type="button">＋</button>`;
      stage.appendChild(yard); stage.appendChild(dial); host.appendChild(stage);
      let val = 1; state.locked = false; const valEl = dial.querySelector(".bt-dial-val");
      const check = ()=>{ if(val === N && !state.locked){ state.locked = true; valEl.classList.add("match"); plot.style.filter = "";
        if(d.topper){ const t = document.createElement("div"); t.className = "bt-topper snap"; t.innerHTML = `<img src="assets/Images/${d.topper}.png" alt="">`; plot.appendChild(t); }
        sfxCorrect(); burstStars(); play("assets/Audio/vo_total_" + N + "." + AUDIO_EXT);
        SwiftPAL.emit("make_number_correct", { slide_id: slide.id, phase: slide.phase, value: true, count: N, latency_ms: Date.now()-state.slideStart });
        setNavActive(true); } };
      dial.querySelectorAll(".bt-dial-btn").forEach(btn=> btn.onclick = ()=>{ if(state.locked) return;
        val = Math.max(1, Math.min(10, val + parseInt(btn.dataset.d, 10))); valEl.textContent = val; sfxTap(); check(); });
      setNavActive(false); $("navBtn").onclick = ()=>{ if(state.locked) completeSlide(true); };
    }
  },

  TAP_LETTER_BY_NAME: {
    mount(host, slide){
      mountTapOptions({
        slide, host, signalName: "letter_name_first_try",
        stimulus: null,
        options: slide.data.options,
        isCorrect: (opt) => opt.letter === slide.data.target,
        optionRenderer: (opt) => letterCell(opt.letter)
      });
    }
  },

  TAP_LETTER_BY_SOUND: {
    mount(host, slide){
      mountTapOptions({
        slide, host, signalName: "letter_sound_first_try",
        stimulus: (()=> {
          const el = document.createElement("div"); el.className = "stimulus-pic";
          el.innerHTML = `<span class="emoji">🔊</span><span class="lbl">ध्वनि सुनो</span>`;
          el.style.cursor = "pointer";
          el.onclick = ()=>{ state.audioReplays++; play(audioFor(slide,"phoneme") || null); };
          return el;
        })(),
        options: slide.data.options,
        isCorrect: (opt) => opt.letter === slide.data.target,
        optionRenderer: (opt) => letterCell(opt.letter)
      });
    }
  },

  TAP_PICTURE_BY_LETTER: {
    mount(host, slide){
      mountTapOptions({
        slide, host, signalName: "letter_image_match_first_try",
        stimulus: stimulusLetter(slide.data.target_letter),
        options: slide.data.options,
        isCorrect: (opt) => opt.correct === true,
        optionRenderer: (opt) => pictureCell(opt.picture, opt.emoji, opt.img)
      });
    }
  },

  TAP_LETTER_BY_PICTURE: {
    mount(host, slide){
      mountTapOptions({
        slide, host, signalName: "image_letter_match_first_try",
        stimulus: stimulusPic(slide.data.picture, slide.data.emoji, slide.data.img),
        options: slide.data.options,
        isCorrect: (opt) => opt.letter === slide.data.target,
        optionRenderer: (opt) => letterCell(opt.letter)
      });
    }
  },

  ODD_ONE_OUT: {
    mount(host, slide){
      const sig = (slide.signals && slide.signals.on_complete && slide.signals.on_complete[0]) || "letter_recognise_first_try";
      const useShape = slide.data.options.some(o => o.shape);
      const usePic = slide.data.options.some(o => o.picture || o.word_hi || o.img);
      mountTapOptions({
        slide, host, signalName: sig,
        stimulus: null,
        options: slide.data.options,
        columnsHint: 4,
        isCorrect: (opt) => opt.is_odd === true,
        optionRenderer: (opt) => useShape
          ? shapeCell(opt)
          : usePic
            ? pictureCell(opt.word_hi || opt.picture, opt.emoji, opt.img)
            : letterCell(opt.letter),
        mastery: slide.phase === "mastery"
      });
    }
  },

  TAP_GENDER: {
    mount(host, slide){
      mountTapOptions({
        slide, host, signalName: "gender_match_first_try",
        stimulus: stimulusPic(slide.data.noun.word_hi, slide.data.noun.emoji, slide.data.noun.img),
        options: slide.data.options,
        columnsHint: 2,
        isCorrect: (opt) => opt.gender === slide.data.target_gender,
        optionRenderer: (opt) => genderLabelCell(opt.label, opt.gender),
        mastery: slide.phase === "mastery"
      });
    }
  },

  TAP_PICTURE_BY_GENDER: {
    mount(host, slide){
      mountTapOptions({
        slide, host, signalName: "gender_match_first_try",
        stimulus: stimulusGender(slide.data.label, slide.data.target_gender),
        options: slide.data.options,
        // tap-to-answer needs ONE unambiguous key — author marks the single intended picture
        // with correct:true (matches every other TAP_* module). The old `|| gender===target`
        // fallback silently accepted any same-gender distractor, defeating buzz+✗+lock.
        isCorrect: (opt) => opt.correct === true,
        optionRenderer: (opt) => pictureCell(opt.word_hi, opt.emoji, opt.img),
        mastery: slide.phase === "mastery"
      });
    }
  },

  GENDER_INTRO: {
    mount(host, slide){
      const wrap = document.createElement("div"); wrap.className = "gender-cats";
      const cats = slide.data.categories;
      const tapped = new Set();
      cats.forEach(cat => {
        const card = document.createElement("div");
        card.className = "gender-cat " + (cat.gender === "F" ? "fem" : "masc");
        card.innerHTML =
          `<div class="cat-title">${cat.label}</div>` +
          imgOrEmoji(cat.anchor.img, cat.anchor.emoji, "cat-pic", "cat-emoji") +
          `<div class="cat-word">${cat.anchor.word_hi}</div>`;
        card.onclick = ()=>{
          card.classList.add("played");
          playChain(["assets/Audio/" + cat.label_audio + "." + AUDIO_EXT, "assets/Audio/" + cat.name_audio + "." + AUDIO_EXT], 0);
          tapped.add(cat.gender);
          SwiftPAL.emit("gender_intro_tap", { slide_id: slide.id, gender: cat.gender });
          if(tapped.size >= cats.length){ stopNudge(); setNavActive(true); }
        };
        wrap.appendChild(card);
      });
      host.appendChild(wrap);
      state.gateNavUntilAudio = true;   // nav unlocks after the concept VO
      setNavActive(false);
      $("navBtn").onclick = ()=> completeSlide(true);
    }
  },

  MEET_GENDER: {
    mount(host, slide){
      const wrap = document.createElement("div"); wrap.className = "meet-gender";
      const n = slide.data.noun;
      wrap.innerHTML =
        `<div class="meet-pic-box">${imgOrEmoji(n.img, n.emoji, "pic-img", "pic-emoji")}<span class="pic-label">${n.word_hi}</span></div>` +
        `<div class="meet-arrow">→</div>` +
        `<div class="gender-badge${slide.data.gender === "F" ? " fem" : ""}">${slide.data.label}</div>`;
      host.appendChild(wrap);
      state.gateNavUntilAudio = true;   // nav unlocks after the model VO
      setNavActive(false);
      $("navBtn").onclick = ()=> completeSlide(true);
    }
  },

  SORT_GENDER: {
    mount(host, slide){
      const wrap = document.createElement("div"); wrap.className = "sort-stage";
      const binsRow = document.createElement("div"); binsRow.className = "sort-bins";
      slide.data.bins.forEach(b => {
        const bin = document.createElement("div");
        bin.className = "sort-bin dd-zone" + (b.gender === "F" ? " fem" : "");   // dd-zone → drop detection
        bin.dataset.gender = b.gender;
        bin.innerHTML = `<div class="bin-title">${b.label}</div><div class="bin-items"></div>`;
        binsRow.appendChild(bin);
      });
      const tray = document.createElement("div"); tray.className = "sort-tray";
      const items = slide.data.items.slice().sort(()=> Math.random() - 0.5);
      items.forEach(it => {
        const t = document.createElement("div"); t.className = "sort-item";
        t.dataset.gender = it.gender;
        t.innerHTML = imgOrEmoji(it.img, it.emoji, "img", "emoji") + `<span class="lbl">${it.word_hi}</span>`;
        tray.appendChild(t);
      });
      wrap.appendChild(binsRow); wrap.appendChild(tray);
      host.appendChild(wrap);

      state.attempts = 0; state.locked = false;
      let placed = 0; const need = slide.data.items.length;
      [...tray.children].forEach(tile => {
        makeDraggable(tile, (zone, t) => {
          const bin = zone.closest(".sort-bin"); if(!bin) return;
          state.attempts++;
          if(bin.dataset.gender === t.dataset.gender){
            t.classList.add("snapped");
            bin.querySelector(".bin-items").appendChild(t);
            placed++;
            SwiftPAL.emit("gender_sort_item", { slide_id: slide.id, gender: t.dataset.gender, attempts: state.attempts });
            if(placed === need){
              state.locked = true;
              SwiftPAL.emit("gender_sort_correct", {
                slide_id: slide.id, phase: slide.phase, value: true,
                attempts: state.attempts, latency_ms: Date.now() - state.slideStart
              });
              setTimeout(()=> celebrateThenAdvance(slide, false), 250);   // standard: confetti + VO + auto-advance, no popup
            }
          } else {
            bin.classList.add("hover"); bin.style.borderColor = "var(--wrong)";
            setTimeout(()=>{ bin.classList.remove("hover"); bin.style.borderColor = ""; }, 500);
            dragWrong(slide);   // buzz + Swiftie + spoken try_again (pre-readers need the spoken recovery)
            SwiftPAL.emit("answer_wrong", { slide_id: slide.id, phase: slide.phase, attempts: state.attempts });
          }
        });
      });
    }
  },

  MATCH_GENDER_PAIRS: {
    mount(host, slide){
      const wrap = document.createElement("div"); wrap.className = "dd-stage";
      const zoneRow = document.createElement("div"); zoneRow.className = "dd-row";
      const zones = slide.data.pairs.slice().sort(()=> Math.random() - 0.5);
      zones.forEach(p => {
        const z = document.createElement("div"); z.className = "dd-zone"; z.dataset.accept = p.id;
        z.innerHTML = imgOrEmoji(p.f.img, p.f.emoji, "zone-img", "zone-emoji") + `<span class="zone-lbl">${p.f.word_hi}</span>`;
        zoneRow.appendChild(z);
      });
      const tileRow = document.createElement("div"); tileRow.className = "dd-row"; tileRow.style.marginTop = "34px";
      const tiles = slide.data.pairs.slice().sort(()=> Math.random() - 0.5);
      tiles.forEach(p => {
        const t = document.createElement("div"); t.className = "dd-tile pic-tile"; t.dataset.pairId = p.id;
        t.innerHTML = imgOrEmoji(p.m.img, p.m.emoji, "zone-img", "zone-emoji") + `<span class="zone-lbl">${p.m.word_hi}</span>`;
        tileRow.appendChild(t);
      });
      wrap.appendChild(zoneRow); wrap.appendChild(tileRow);
      host.appendChild(wrap);

      state.attempts = 0; state.locked = false;
      let filled = 0, wrongStreak = 0, revealed = false; const need = slide.data.pairs.length;
      const settle = (zone, t)=>{                       // the one correct-placement path (drop AND reveal)
        zone.classList.add("filled","correct");
        // grey the matched masculine tile in place (pictures don't badge well)
        t.classList.add("matched"); t.style.transform = "";
        filled++;
        if(filled === need){ state.locked = true; setTimeout(()=> celebrateThenAdvance(slide, revealed), 250); }
      };
      // A8 reveal ceiling: after max consecutive misses, DEMONSTRATE one pair (pulse + auto-settle) so
      // the child is guided forward instead of dead-ending; run counts success=false via `revealed`.
      const revealOne = ()=>{
        const zone = [...zoneRow.children].find(z=> !z.classList.contains("filled")); if(!zone) return;
        const t = [...tileRow.children].find(x=> !x.classList.contains("matched") && x.dataset.pairId === zone.dataset.accept); if(!t) return;
        revealed = true; wrongStreak = 0;
        zone.classList.add("reveal-glow"); t.classList.add("reveal-glow");
        play(audioFor(slide,"reveal") || null, ()=>{});
        setTimeout(()=>{ zone.classList.remove("reveal-glow"); t.classList.remove("reveal-glow"); settle(zone, t); }, 1000);
      };
      [...tileRow.children].forEach(tile => {
        makeDraggable(tile, (zone, t) => {
          if(state.locked || zone.classList.contains("filled")) return;
          state.attempts++;
          if(zone.dataset.accept === t.dataset.pairId){
            wrongStreak = 0;
            SwiftPAL.emit("gender_pair_match", {
              slide_id: slide.id, phase: slide.phase, value: true,
              pair: t.dataset.pairId, attempts: state.attempts
            });
            settle(zone, t);
          } else {
            zone.classList.add("filled","wrong");
            setTimeout(()=> zone.classList.remove("filled","wrong"), 600);
            dragWrong(slide);
            SwiftPAL.emit("answer_wrong", { slide_id: slide.id, phase: slide.phase, attempts: state.attempts });
            if(++wrongStreak >= (CARD.scaffold_rules.max_attempts||3)) revealOne();
          }
        });
      });
    }
  },

  MATCH_DRAG_1: {
    mount(host, slide){
      const wrap = document.createElement("div"); wrap.className = "dd-stage";
      // zone (target picture)
      const zoneRow = document.createElement("div"); zoneRow.className = "dd-row";
      const zone = document.createElement("div"); zone.className = "dd-zone";
      zone.innerHTML = imgOrEmoji(slide.data.target.img, slide.data.target.emoji, "zone-img", "zone-emoji") + `<span class="zone-lbl">${slide.data.target.picture||""}</span>`;
      zone.dataset.accept = slide.data.letter.letter;
      zoneRow.appendChild(zone);
      // tile
      const tileRow = document.createElement("div"); tileRow.className = "dd-row"; tileRow.style.marginTop = "30px";
      const tile = document.createElement("div"); tile.className = "dd-tile"; tile.innerHTML = `<span class="ink-glyph">${slide.data.letter.letter}</span>`;
      tileRow.appendChild(tile);
      wrap.appendChild(zoneRow); wrap.appendChild(tileRow);
      host.appendChild(wrap);

      state.attempts = 0; state.locked = false;
      makeDraggable(tile, (zone, t) => {
        state.attempts++;
        const ok = (zone.dataset.accept === t.textContent.trim());
        if(ok){
          zone.classList.add("filled","correct");
          // snap tile into zone (badge is small — drop the ink-centering transform)
          t.classList.add("snapped");
          t.querySelector(".ink-glyph")?.style.removeProperty("transform");
          zone.appendChild(t);
          state.locked = true;
          SwiftPAL.emit("letter_image_match_first_try", {
            slide_id: slide.id, phase: slide.phase, value: true,
            first_try: state.attempts === 1, attempts: state.attempts,
            latency_ms: Date.now()-state.slideStart
          });
          celebrateThenAdvance(slide, false);
        } else {
          zone.classList.add("filled","wrong");
          setTimeout(()=> zone.classList.remove("filled","wrong"), 600);
          dragWrong(slide);
          SwiftPAL.emit("answer_wrong", { slide_id: slide.id, phase: slide.phase, attempts: state.attempts });
          if(state.attempts >= (CARD.scaffold_rules.max_attempts||3)){
            state.locked = true;
            // reveal = DEMONSTRATE, don't just tell: snap the letter into its picture (dimmed pulse)
            // with the spoken reveal line, then move on as success=false.
            showBox("", audioText(slide,"reveal") || "कोई बात नहीं! इसे यहाँ रखो।", "reveal", audioFor(slide,"reveal"), ()=>{});
            setTimeout(()=>{
              zone.classList.add("filled","correct","reveal-glow");
              t.classList.add("snapped");
              t.querySelector(".ink-glyph")?.style.removeProperty("transform");
              zone.appendChild(t);
              setTimeout(()=> completeSlide(false), 1300);
            }, 900);
          }
        }
      });
    }
  },

  MATCH_DRAG_N: {
    mount(host, slide){
      const wrap = document.createElement("div"); wrap.className = "dd-stage";
      const zoneRow = document.createElement("div"); zoneRow.className = "dd-row";
      // shuffle zones so order ≠ tile order
      const zones = slide.data.pairs.slice().sort(()=> Math.random()-0.5);
      zones.forEach(p => {
        const z = document.createElement("div"); z.className = "dd-zone";
        z.innerHTML = imgOrEmoji(p.img, p.emoji, "zone-img", "zone-emoji") + `<span class="zone-lbl">${p.picture||""}</span>`;
        z.dataset.accept = p.letter;
        zoneRow.appendChild(z);
      });
      const tileRow = document.createElement("div"); tileRow.className = "dd-row"; tileRow.style.marginTop = "30px";
      const tiles = slide.data.pairs.slice().sort(()=> Math.random()-0.5);
      tiles.forEach(p => {
        const t = document.createElement("div"); t.className = "dd-tile"; t.innerHTML = `<span class="ink-glyph">${p.letter}</span>`;
        tileRow.appendChild(t);
      });
      wrap.appendChild(zoneRow); wrap.appendChild(tileRow);
      host.appendChild(wrap);

      state.attempts = 0; state.locked = false;
      let filled = 0, wrongStreak = 0, revealed = false; const need = slide.data.pairs.length;
      const settle = (zone, t)=>{                       // one correct-placement path (drop AND reveal)
        zone.classList.add("filled","correct");
        t.classList.add("snapped"); t.querySelector(".ink-glyph")?.style.removeProperty("transform"); zone.appendChild(t);
        filled++;
        if(filled === need){ state.locked = true; setTimeout(()=> celebrateThenAdvance(slide, revealed), 250); }
      };
      // A8 reveal ceiling: after max consecutive misses, demonstrate one letter→picture match.
      const revealOne = ()=>{
        const zone = [...zoneRow.children].find(z=> !z.classList.contains("filled")); if(!zone) return;
        const t = [...tileRow.children].find(x=> !x.classList.contains("snapped") && x.textContent.trim() === zone.dataset.accept); if(!t) return;
        revealed = true; wrongStreak = 0;
        zone.classList.add("reveal-glow"); t.classList.add("reveal-glow");
        play(audioFor(slide,"reveal") || null, ()=>{});
        setTimeout(()=>{ zone.classList.remove("reveal-glow"); t.classList.remove("reveal-glow"); settle(zone, t); }, 1000);
      };
      [...tileRow.children].forEach(tile => {
        makeDraggable(tile, (zone, t) => {
          if(state.locked || zone.classList.contains("filled")) return;
          state.attempts++;
          const ok = (zone.dataset.accept === t.textContent.trim());
          if(ok){
            wrongStreak = 0;
            SwiftPAL.emit("letter_image_match_first_try", {
              slide_id: slide.id, phase: slide.phase, value: true,
              letter: t.textContent, attempts: state.attempts
            });
            settle(zone, t);
          } else {
            zone.classList.add("filled","wrong");
            dragWrong(slide);
            SwiftPAL.emit("answer_wrong", { slide_id: slide.id, phase: slide.phase, attempts: state.attempts });
            setTimeout(()=> zone.classList.remove("filled","wrong"), 600);
            if(++wrongStreak >= (CARD.scaffold_rules.max_attempts||3)) revealOne();
          }
        });
      });
    }
  },

  SEQUENCE_DRAG: {
    mount(host, slide){
      const wrap = document.createElement("div"); wrap.className = "dd-stage";
      // slots row
      const slots = document.createElement("div"); slots.className = "seq-slots";
      slide.data.correct_order.forEach((L,i) => {
        const sl = document.createElement("div"); sl.className = "seq-slot";
        sl.dataset.accept = L; sl.dataset.idx = String(i);
        sl.classList.add("dd-zone");      // reuse drop logic
        sl.innerHTML = `<span class="ordinal">${i+1}</span>`;
        slots.appendChild(sl);
      });
      const tileRow = document.createElement("div"); tileRow.className = "dd-row"; tileRow.style.marginTop = "40px";
      slide.data.tiles.forEach(t => {
        const tl = document.createElement("div"); tl.className = "dd-tile"; tl.innerHTML = `<span class="ink-glyph">${t.letter}</span>`;
        tileRow.appendChild(tl);
      });
      wrap.appendChild(slots); wrap.appendChild(tileRow);
      host.appendChild(wrap);

      let placed = 0, wrongStreak = 0, revealed = false; const need = slide.data.correct_order.length;
      state.attempts = 0; state.locked = false;
      const settle = (zone, t)=>{                       // one correct-placement path (drop AND reveal)
        zone.classList.remove("dd-zone");
        zone.classList.add("filled","correct");
        zone.innerHTML = `<span class="ordinal">${parseInt(zone.dataset.idx,10)+1}</span><span class="ink-glyph">${t.textContent.trim()}</span>`;
        centerInkGlyph(zone.querySelector(".ink-glyph"));
        t.remove();
        placed++;
        if(placed === need){
          state.locked = true;
          SwiftPAL.emit("letter_sequence_correct", {
            slide_id: slide.id, phase: slide.phase, value: !revealed,
            attempts: state.attempts, latency_ms: Date.now()-state.slideStart
          });
          setTimeout(()=> celebrateThenAdvance(slide, revealed), 250);
        }
      };
      // A8 reveal ceiling: after max consecutive misses, demonstrate the NEXT slot in the order.
      const revealOne = ()=>{
        const zone = [...slots.children].find(z=> !z.classList.contains("filled")); if(!zone) return;
        const t = [...tileRow.children].find(x=> x.textContent.trim() === zone.dataset.accept); if(!t) return;
        revealed = true; wrongStreak = 0;
        zone.classList.add("reveal-glow"); t.classList.add("reveal-glow");
        play(audioFor(slide,"reveal") || null, ()=>{});
        setTimeout(()=>{ zone.classList.remove("reveal-glow"); settle(zone, t); }, 1000);
      };
      [...tileRow.children].forEach(tile => {
        makeDraggable(tile, (zone, t) => {
          if(state.locked || zone.classList.contains("filled")) return;
          state.attempts++;
          const ok = (zone.dataset.accept === t.textContent.trim());
          if(ok){
            wrongStreak = 0;
            settle(zone, t);
          } else {
            zone.classList.add("wrong");
            setTimeout(()=> zone.classList.remove("wrong"), 600);
            dragWrong(slide);
            SwiftPAL.emit("answer_wrong", { slide_id: slide.id, phase: slide.phase, attempts: state.attempts });
            if(++wrongStreak >= (CARD.scaffold_rules.max_attempts||3)) revealOne();
          }
        });
      });
    }
  },

  MASTERY_SILENT_PICK: {
    mount(host, slide){
      const mode = slide.data.mode;
      let stimulus = null, options = null, isCorrect = null, optionRenderer = null;
      if(mode === "sound_to_letter"){
        stimulus = (()=> {
          const el = document.createElement("div"); el.className = "stimulus-pic"; el.style.cursor="pointer";
          el.innerHTML = `<span class="emoji">🔊</span><span class="lbl">ध्वनि सुनो</span>`;
          el.onclick = ()=>{ state.audioReplays++; play(audioFor(slide,"phoneme") || null); };
          return el;
        })();
        options = slide.data.options;
        isCorrect = (opt) => opt.letter === slide.data.target;
        optionRenderer = (opt) => letterCell(opt.letter);
      } else if(mode === "picture_to_letter"){
        stimulus = stimulusPic(slide.data.picture, slide.data.emoji, slide.data.img);
        options = slide.data.options;
        isCorrect = (opt) => opt.letter === slide.data.target;
        optionRenderer = (opt) => letterCell(opt.letter);
      } else if(mode === "name_to_shape"){
        stimulus = (()=> {
          const el = document.createElement("div"); el.className = "stimulus-pic"; el.style.cursor="pointer";
          el.innerHTML = `<span class="emoji">🔊</span><span class="lbl">${slide.data.name || "नाम सुनो"}</span>`;
          el.onclick = ()=>{ state.audioReplays++; play(audioFor(slide,"shape_name") || null); };
          return el;
        })();
        options = slide.data.options;
        isCorrect = (opt) => opt.shape === slide.data.target;
        optionRenderer = (opt) => shapeCell(opt);
      } else if(mode === "object_to_shape"){
        stimulus = stimulusPic(slide.data.object_hi, slide.data.object_emoji, slide.data.object_img);
        options = slide.data.options;
        isCorrect = (opt) => opt.shape === slide.data.target;
        optionRenderer = (opt) => shapeCell(opt);
      } else if(mode === "shape_to_object"){
        stimulus = stimulusShape({shape: slide.data.shape, color: slide.data.color, rotate: slide.data.rotate});
        options = slide.data.options;
        isCorrect = (opt) => opt.correct === true;
        optionRenderer = (opt) => pictureCell(opt.object_hi, opt.object_emoji, opt.object_img);
      } else { // letter_to_picture
        stimulus = stimulusLetter(slide.data.letter);
        options = slide.data.options;
        isCorrect = (opt) => opt.correct === true;
        optionRenderer = (opt) => pictureCell(opt.picture, opt.emoji, opt.img);
      }
      // SAME scaffold as the rest of the lesson — hint button after 1st wrong,
      // correct/incorrect feedback popups, reveal-on-3rd-wrong. Not silent.
      // `mastery:true` keeps the mastery_score tracking (first-try = hit).
      mountTapOptions({
        slide, host, signalName: "mastery_item",
        stimulus, options, isCorrect, optionRenderer, mastery: true
      });
    }
  },

  STORY_SCENE: {
    // TEACH: one picture-story beat. Scene image fills the frame; narration VO plays on mount;
    // slow Ken-Burns pan keeps it alive for a pre-reader. Chain several in order for the story.
    mount(host, slide){
      const d = slide.data || {};
      const wrap = document.createElement("div"); wrap.className = "story-scene";
      const fb = String(d.emoji || "📖").replace(/'/g,"");
      // [PORT] data.image_ids (array) → two or more pictures side by side in one frame (.story-frame-pair);
      // otherwise the single data.image_id as before.
      const _imgTag = id => '<img class="story-img" src="assets/Images/' + id + '.' + IMG_EXT + '" alt="' + (d.alt_hi||'') + '" ' +
            'onerror="var s=document.createElement(\'span\');s.className=\'story-fallback\';s.textContent=\'' + fb + '\';this.replaceWith(s);"/>';
      const _ids = (Array.isArray(d.image_ids) && d.image_ids.length) ? d.image_ids : null;
      if(_ids) wrap.classList.add("story-scene-pair");   // [PORT] pair page: sentence pill + speaker ABOVE the pictures (CSS: .story-scene-pair)
      wrap.innerHTML =
        (_ids ? '<div class="story-frame story-frame-pair">' + _ids.map(_imgTag).join('') + '</div>'
              : '<div class="story-frame">' + _imgTag(d.image_id) + '</div>') +
        (d.caption_hi ? '<div class="story-caption">' + d.caption_hi + '</div>' : '');
      host.appendChild(wrap);
      state.ownsAudio = true; setNavActive(false);
      $("navBtn").onclick = ()=> completeSlide(true);
      state.replayAudio = ()=>{ play(audioFor(slide, "narration") || null, ()=>{}); };
      setSwMood("talk");
      let _armed = false;
      const _armNav = ()=>{ if(_armed) return; _armed = true; setNavActive(true); setSwMood("point"); };
      play(audioFor(slide, "narration") || null, _armNav);
      setTimeout(_armNav, 30000);   // watchdog: nav always eventually opens if VO buffers slowly
    }
  },

  /* STORY_READ_PAGE (HI02H04_L02 — चित्र-संकेत की सहायता से वाक्य पठन), pages 2-10 laid out from Figma "FLN by MJ"
     section 19-13 (CSS: [L02-STORY-FIG], stage class .l02-story): the header band ("आइए कहानी पढ़ें।") with the mascot
     circle, the grid frame, the 468x244 picture in its yellow frame, the sentence in the white / blue-stroke bar under it
     with the small mic chip to its left (slide.caption_chip moves the frame's chip there), and आगे बढ़ें inside the
     frame. Beat order: a narration (card audio.prompt) would speak first and alone — but no story page has one any more:
     pages 3-10 lost their "इस वाक्य को पढ़िए।" ([L02-NO-READ-INSTR]) and page 2 its "आप खुद कहानी पढ़ने की कोशिश करिए…"
     (vo_help, [L02-NO-HELP-VO] 2026-10-03, together with the chip pulse that was timed to its "यह बटन…" words through
     data.chip_pulse_at — the code below still honours both fields for a card that has them) — so every page opens silently,
     straight into the beats below → 4 s later (1 s on page 2: data.cue_delay_ms, [L02-T1-CUE-2S] 2026-10-03; 1 s on pages 3-10 too
     since [L02-CUE-SILENT] 2026-10-07, build.py) ONLY the chip
     PULSES with the cue line "इस बटन पर टैप करिए और वाक्य पढ़िए।" and ONLY the chip takes the tap.
     [L02-READ-ALOUD] (2026-10-03; the reference lesson's [P2-READ-ALOUD] rev 2 + [STORY-CUE-VO], value for value): the cue
     line is the re-recorded vo_tap_speaker_sentence_story (the user's vo_1.wav — tap the mic and READ the sentence), so the
     FIRST tap on the chip no longer speaks the sentence: it starts a REC_MS read-aloud beat (ONE SECOND PER WORD of the sentence,
     [L02-READ-WORD-1S] 2026-10-07 — the reference's flat 12 s until then) — whatever is speaking
     stops, the white mic glyph inside the chip dissolves away and the chip art's sound wave bounces in its place (.p2-rec,
     CSS [L02-READ-ALOUD]), and the sentence's words light one by one, a second each (wordPace: the same
     .p2-word.on orange as the word sync, one word at a time), while nothing speaks (the cue and its idle repeat wait, the
     header mascot's narration replay is ignored, आगे बढ़ें stays disabled). When the beat is over the wave goes, the mic
     returns, the chip is disabled for good (.p2-rec-done: greyed, not tappable) and the sentence speaks exactly as a tap did
     before (at data.sentence_rate — 0.72 since [L02-SENT-RATE] 2026-10-07 (0.8, then 0.9 for an hour each): 28% slower, pitch kept; the highlight follows the clip's own
     clock, so it slows with it): the word being said turning dark orange with a tiny pop, in time with the recording (data.word_times — each
     word's start and the end of the last word, measured on the clip by the build like the reference's WORD_TIMES tables; a
     page without them falls back to the words' character shares) → the clip ends → the picture pops out and holds (2 s,
     [L02-POP-AFTER-SENTENCE]; 5 s on pages 2, 4, 5 and 10 — data.pop_ms, [L02-POP-5S] — until [L02-POP-2S] 2026-10-07: every page 2 s
     now, no page sets data.pop_ms, the 5 s path stays for a card that does) with its own sound (data.pop_sfx,
     [L02-POP-SFX]: starts with the pop, stops with it) → only then आगे बढ़ें lights up (the disabled pill was there from the
     start). With no tap the cue (pulse + line) repeats after 5 s of silence — page 1; on pages 2-9 ([L02-CUE-SILENT], 2026-10-07)
     the first cue is the pulse ALONE and the line joins the pulse only after 4 s of no tap (data.cue_repeat_ms; 7 s at first), then
     every 4 s (runCue below). The
     cue line itself is the user's 2026-10-07 take since [L02-CUE-VO-2] (build.py). A tap on the header mascot repeats the
     narration (the Figma page has no straddling bird), its pulse included — never during the beat. Taps during the beat,
     and on the disabled chip, do nothing.
     data:{image_id, alt_hi, emoji, words:[{text}], whole_audio, word_times?, cue_delay_ms?, cue_silent_first?, cue_repeat_ms?, cue_pulse_ms?,
     chip_pulse_at?, pop_sfx?, pop_ms?, pop_sfx_s?}; audio:{prompt}. */
  STORY_READ_PAGE: {
    mount(host, slide){
      const d = slide.data || {};
      const wrap = document.createElement("div"); wrap.className = "story-scene story-read-page";
      const fb = String(d.emoji || "📖").replace(/'/g,"");
      const words = (d.words || []).map(w => (w && w.text) || "").filter(Boolean);
      // [L02-READ-WORD-1S] (2026-10-07, user request) the read-aloud beat lasts ONE SECOND PER WORD of the sentence (page 1's six
      // words → 6 s, page 3's ten → 10 s, page 6's three → 3 s), no longer the reference's flat REC_MS = 12000: wordPace divides
      // REC_MS evenly, so each word is lit for exactly a second, and the moment the last word's second is over the beat ends and
      // the flow goes on exactly as before (the chip disabled, the sentence with its word sync, the picture's pop, आगे बढ़ें).
      const READ_WORD_MS = 1000;
      const REC_MS = READ_WORD_MS * Math.max(1, words.length);   // [L02-READ-ALOUD] the read-aloud beat: the sound wave plays and the words pace over these ms
      wrap.innerHTML =
        '<div class="story-frame"><img class="story-img" src="assets/Images/' + d.image_id + '.' + IMG_EXT + '" alt="' + (d.alt_hi || '') + '" ' +
          'onerror="var s=document.createElement(\'span\');s.className=\'story-fallback\';s.textContent=\'' + fb + '\';this.replaceWith(s);"/></div>' +
        '<div class="story-caption p2-sentence-btn"><span class="p2-words">' +
          words.map(w => '<span class="p2-word">' + w + '</span>').join(' ') + '</span></div>';
      host.appendChild(wrap);
      $("stage").classList.add("l02-story");        // [L02-STORY-FIG] Figma story-page layout (adapt.js clears it on other slides)
      $("navBtn").textContent = "आगे बढ़ें";           // the Figma pill's label (other pages keep "आगे" behind their arrow art)
      const frame = wrap.querySelector(".story-frame"), cap = wrap.querySelector(".story-caption");
      const wordEls = [...cap.querySelectorAll(".p2-word")];
      const wholeSrc = d.whole_audio ? ("assets/Audio/" + d.whole_audio + "." + AUDIO_EXT) : null;
      // [L02-READ-ALOUD] the cue line: the re-recorded "tap the mic and read the sentence" (vo_tap_speaker_sentence_story), else the fleet's old "tap here" line
      const cueSrc = (CARD.assets && CARD.assets.audio && (CARD.assets.audio["vo_tap_speaker_sentence_story"] || CARD.assets.audio["vo_tap_speaker_sentence"])) || null;
      const alive = ()=> CARD.slides[state.idx] === slide && host.isConnected;
      const stillMode = ()=> !!(window.FLNMotion && FLNMotion.still && FLNMotion.still());
      let heard = false, cueOn = false, cueTimer = 0, syncRaf = 0;
      let recOn = false, recDone = false, recTimer = 0;   // [L02-READ-ALOUD] the beat runs / the chip has had its one tap
      state.ownsAudio = true; setNavActive(false);
      $("navBtn").onclick = ()=>{ if(!$("navBtn").disabled){ stopPopSfx(); completeSlide(true); } };   // a pop sound still running ends with the page
      // wordsOff also drops .p2-speaking: it runs at the start of every clip (narration or sentence) and at the sentence's end,
      // so the chip's wave arcs can only blink for the sentence itself, never for the narration that may cut it short
      const wordsOff = ()=>{ cancelAnimationFrame(syncRaf); wordEls.forEach(w => w.classList.remove("on")); cap.classList.remove("p2-speaking");
        const c = cap.querySelector(".tut-audio"); if(c) c.classList.remove("p2-chip-pulse"); };   // and the narration pulse, if a clip cut it short
      const setCue = (on)=>{ cueOn = on; cap.classList.toggle("p2-cue", on); };
      // [L02-CUE-SILENT] (2026-10-07, user request) pages 2-9 (card data.cue_silent_first): the FIRST cue is the chip's pulse ALONE — no
      // line — for as long as the line would take (data.cue_pulse_ms: the clip's length, so the pulse looks the same with or without the
      // voice); after it the line comes WITH the pulse once the child has done nothing for data.cue_repeat_ms (4 s; 7 s at first), and
      // again after every further 4 s of nothing — each count runs from the end of the previous cue and restarts on any tap on the page. Page 1
      // (no such fields) keeps its cue as it was: the line with the pulse, again 5 s after it ends.
      const CUE_REPEAT_MS = (typeof d.cue_repeat_ms === "number" && d.cue_repeat_ms > 0) ? d.cue_repeat_ms : 5000;
      const CUE_PULSE_MS = (typeof d.cue_pulse_ms === "number" && d.cue_pulse_ms > 0) ? d.cue_pulse_ms : 2500;
      let cueSilentNext = d.cue_silent_first === true;
      let cueWaitMs = 0;                                                 // the wait being counted down (0: none) — a tap restarts it
      const scheduleCue = (ms)=>{ clearTimeout(cueTimer); cueWaitMs = 0; if(heard || recOn || recDone) return; cueWaitMs = ms; cueTimer = setTimeout(runCue, ms); };
      const runCue = ()=>{
        cueWaitMs = 0;
        if(!alive() || heard || recOn || recDone) return;              // [L02-READ-ALOUD] the child is reading, or has read: no cue any more
        if(isPlaying){ scheduleCue(1500); return; }                    // never talk over a running clip
        setCue(true);
        if(cueSilentNext){                                             // [L02-CUE-SILENT] the pulse alone; then the count to the first spoken cue
          cueSilentNext = false;
          clearTimeout(cueTimer); cueTimer = setTimeout(()=>{ setCue(false); if(alive() && !heard) scheduleCue(CUE_REPEAT_MS); }, CUE_PULSE_MS);
          return;
        }
        play(cueSrc, ()=>{ setCue(false); if(alive() && !heard) scheduleCue(CUE_REPEAT_MS); });   // again after 5 s (page 1) / 4 s (pages 2-9) with no tap
      };
      if(typeof d.cue_repeat_ms === "number")                           // [L02-CUE-SILENT] "inactivity": a tap anywhere on the page restarts a running count
        wrap.addEventListener("pointerdown", ()=>{ if(cueWaitMs && alive() && !cueOn) scheduleCue(cueWaitMs); }, true);
      // word-by-word highlight from the audio clock. With data.word_times (the reference's WORD_TIMES rule: word k is .on while
      // times[k] <= currentTime < times[k+1], off at the end of the last word; the loop stops when the clip ends or is cut) the words
      // follow the recording; without them each word's share of the clip is its character count (+ a beat).
      const wordTimes = (Array.isArray(d.word_times) && d.word_times.length === wordEls.length + 1 && d.word_times.every(t => typeof t === "number")) ? d.word_times : null;
      const syncWords = (a)=>{
        if(!a || !wordEls.length) return;
        let cur = -1;
        const show = (i)=>{ if(i !== cur){ if(cur >= 0) wordEls[cur].classList.remove("on"); if(i >= 0) wordEls[i].classList.add("on"); cur = i; } };
        if(wordTimes){
          const tick = ()=>{
            if(currentAudio !== a || a.ended || (a.paused && a.currentTime > 0)){ show(-1); return; }   // the clip ended, or a tap cut it
            const t = a.currentTime; let i = -1;
            for(let k = 0; k < wordEls.length; k++){ if(t >= wordTimes[k] && t < wordTimes[k + 1]){ i = k; break; } }
            show(i);
            if(t >= wordTimes[wordTimes.length - 1]){ show(-1); return; }
            syncRaf = requestAnimationFrame(tick);
          };
          syncRaf = requestAnimationFrame(tick); return;
        }
        const weights = wordEls.map(w => Math.max(1, (w.textContent || "").replace(/[।,!?\-]/g, "").length + 1.5));
        const total = weights.reduce((s, x)=> s + x, 0);
        const bounds = []; let acc = 0; weights.forEach(x => { acc += x; bounds.push(acc / total); });
        const tick = ()=>{
          if(currentAudio !== a || a.ended) return;
          const dur = (isFinite(a.duration) && a.duration > 0) ? a.duration : (0.45 * wordEls.length + 0.5);
          const f = Math.min(0.999, a.currentTime / Math.max(0.1, dur - 0.25));
          let i = bounds.findIndex(b => f < b); if(i < 0) i = wordEls.length - 1;
          show(i);
          syncRaf = requestAnimationFrame(tick);
        };
        syncRaf = requestAnimationFrame(tick);
      };
      // [L02-READ-ALOUD] pace the words over ms with no audio: word k is .on for its equal share of ms (the same .on look as the word sync)
      const wordPace = (ms)=>{
        wordsOff();
        if(!wordEls.length || !(ms > 0)) return;
        let cur = -1; const t0 = performance.now(), slot = ms / wordEls.length;
        const tick = ()=>{
          const t = performance.now() - t0;
          if(t >= ms || !alive()){ wordEls.forEach(w => w.classList.remove("on")); return; }
          const i = Math.min(wordEls.length - 1, Math.floor(t / slot));
          if(i !== cur){ if(cur >= 0) wordEls[cur].classList.remove("on"); wordEls[i].classList.add("on"); cur = i; }
          syncRaf = requestAnimationFrame(tick);
        };
        syncRaf = requestAnimationFrame(tick);
      };
      // [L02-POP-AFTER-SENTENCE] the picture's pop (p2BirdPop, 2 s — the same pop as before) comes AFTER the sentence has been
      // heard, not after the narration: the child taps the chip → the sentence speaks → the clip ends → the picture pops out and
      // holds → only when that pop is over does आगे बढ़ें light up. Every completed hearing pops the picture again; a clip cut
      // short (another tap) pops nothing. The wait is a timer, not animationend, so it also holds under html.no-anim.
      // p2BirdPop's duration in the CSS: 2 s, or 5 s on a page whose card says data.pop_ms = 5000 (pages 2, 4, 5, 10 until [L02-POP-2S] 2026-10-07; none now, [L02-POP-5S]:
      // the frame gets .p2-pop-5s, the same pop with a 3 s longer hold; the sound and आगे बढ़ें follow this length)
      const POP_MS = (d.pop_ms === 5000) ? 5000 : 2000;
      if(POP_MS === 5000) frame.classList.add("p2-pop-5s");
      let popTimer = 0;
      // [L02-POP-SFX] the pop's sound: assets/Audio/<data.pop_sfx>.ogg — the build cuts it from the user's assets/SFX track for
      // the page, to the pop's 2 s (with a fade-out) or, where the card says data.pop_sfx_s, to that many seconds (pages 4 and 5:
      // the first 10 s of their track) — on its own Audio element (never the VO chain: no chip waves, no mascot mouth), started
      // the instant the pop starts and stopped on its own clock: with the pop for a 2 s clip, at pop_sfx_s otherwise. The pop
      // itself is always the same 2 s. आगे बढ़ें and a replay of the sentence stop a sound that is still running.
      const sfxSrc = d.pop_sfx ? ("assets/Audio/" + d.pop_sfx + "." + AUDIO_EXT) : null;
      const sfxMs = Math.round(((typeof d.pop_sfx_s === "number") ? d.pop_sfx_s : POP_MS / 1000) * 1000);
      let popSfx = null, sfxTimer = 0;
      const stopPopSfx = ()=>{ clearTimeout(sfxTimer); if(popSfx){ try{ popSfx.pause(); }catch(e){} popSfx = null; } };
      const popPicture = (then)=>{ if(!alive()) return;
        frame.classList.remove("p2-pop"); void frame.offsetWidth; frame.classList.add("p2-pop");
        stopPopSfx();
        if(sfxSrc){ try{ popSfx = new Audio(sfxSrc); popSfx.play().catch(()=>{}); sfxTimer = setTimeout(stopPopSfx, sfxMs); }catch(e){ popSfx = null; } }
        clearTimeout(popTimer); popTimer = setTimeout(()=>{ if(alive() && then) then(); }, POP_MS); };
      const speakSentence = ()=>{
        if(!alive()) return;
        clearTimeout(cueTimer); setCue(false); wordsOff(); setSwMood("talk");
        stopPopSfx();   // [L02-POP-SFX] never under the sentence; the pop that follows starts it afresh
        cap.classList.add("p2-speaking");   // [L02-SPK-CUE] the chip's own voice: its wave arcs blink only while this clip plays
        play(wholeSrc, ()=>{ wordsOff(); setSwMood("point"); if(!alive()) return;
          if(!heard){ heard = true; SwiftPAL.emit("sentence_heard", { slide_id: slide.id, phase: slide.phase }); }
          popPicture(()=> setNavActive(true));   // [L02-POP-AFTER-SENTENCE] आगे बढ़ें only once the picture's pop is over
        });
        // [L02-SENT-RATE] (2026-10-07, user request) the sentence is heard slower (card data.sentence_rate: 0.72 = 10% slower, then 20% more; 0.8 / 0.9 before) with its pitch kept —
        // the browser's time-stretch on this clip's own element (play() makes a fresh one per clip, so nothing else is slowed); the
        // highlight below follows the clip's clock (currentTime vs data.word_times), so it slows with the voice by itself
        if(currentAudio && typeof d.sentence_rate === "number" && d.sentence_rate > 0){
          try{ currentAudio.preservesPitch = true; currentAudio.mozPreservesPitch = true; currentAudio.webkitPreservesPitch = true; currentAudio.playbackRate = d.sentence_rate; }catch(e){}
        }
        syncWords(currentAudio);
      };
      const chipEl = ()=> cap.querySelector(".tut-audio") || $("slideHost").querySelector(".tut-card .tut-audio");
      // [L02-READ-ALOUD] the FIRST tap on the chip starts the read-aloud beat (nothing speaks; the mic glyph dissolves into the
      // sound wave, the words pace over REC_MS), then the chip is disabled for good and the sentence speaks as a tap did before;
      // later taps do nothing. The chip is captured now: should the page be left during the beat, the timer touches nothing live.
      const startRec = ()=>{
        if(!alive() || recOn || recDone) return;
        recOn = true;
        clearTimeout(cueTimer); setCue(false);
        cancelAnimationFrame(pulseRaf); setChipPulse(false);
        try{ stopNudge(); }catch(e){}
        stopAudio();                                                      // the cue / the narration stops: the child reads now
        const chip = chipEl();
        if(chip && !stillMode()) chip.classList.add("p2-rec");
        SwiftPAL.emit("read_aloud_started", { slide_id: slide.id, phase: slide.phase, ms: REC_MS });
        wordPace(REC_MS);
        clearTimeout(recTimer);
        recTimer = setTimeout(()=>{
          recOn = false;
          cancelAnimationFrame(syncRaf); wordEls.forEach(w => w.classList.remove("on"));
          if(chip){ chip.classList.remove("p2-rec"); chip.classList.add("p2-rec-done"); chip.setAttribute("aria-disabled", "true"); }
          if(!alive()) return;
          recDone = true;
          speakSentence();                                                // the sentence with its word sync, then the pop and आगे बढ़ें as before
        }, REC_MS);
      };
      state.replayAudio = ()=>{ if(recOn || recDone) return; startRec(); };   // the chip beside the pill (slide.caption_chip): its one tap starts the beat
      // [L02-SPK-CHIP] (2026-10-10, user request) the title-bar speaker (adapt.js routes its tap here on story pages): the page's INSTRUCTION
      // again - the narration where the page has one, else the cue line ("tap the mic and read the sentence") spoken at once with the mic
      // chip's pulse, exactly as runCue speaks it (and the inactivity count goes on from its end as before); never over the cue itself,
      // the read-aloud beat or a running clip, and not once the child has read (the mic chip is spent then - nothing left to instruct)
      state.replayInstruction = ()=>{
        if(cueOn || recOn || recDone || !alive()) return;
        if(promptSrc){ narrate(); return; }
        if(!cueSrc || isPlaying) return;
        clearTimeout(cueTimer); cueWaitMs = 0; cueSilentNext = false; setCue(true);
        play(cueSrc, ()=>{ setCue(false); if(alive() && !heard) scheduleCue(CUE_REPEAT_MS); });
      };
      // [L02-SPK-CUE] the narration's "यह बटन दबाकर सुन सकते हैं" beat: from the moment the clip reaches data.chip_pulse_at
      // (seconds, measured on the clip by the build — 3.9 s into vo_help, where "यह बटन" starts) to the end of the clip the
      // speaker chip pulses, the same pulse as the cue. It is timed from the audio clock, so it lands on the words however late
      // the clip started; it stops with the clip, or at once when another clip cuts the narration short.
      const chipPulseAt = (typeof d.chip_pulse_at === "number") ? d.chip_pulse_at : null;
      let pulseRaf = 0;
      const setChipPulse = (on)=>{ const c = chipEl(); if(c) c.classList.toggle("p2-chip-pulse", on); };
      const armChipPulse = (a)=>{ cancelAnimationFrame(pulseRaf); setChipPulse(false); if(chipPulseAt === null || !a) return;
        const tick = ()=>{ if(currentAudio !== a || a.ended || !alive()){ setChipPulse(false); return; }
          if(a.currentTime >= chipPulseAt) setChipPulse(true);
          pulseRaf = requestAnimationFrame(tick); };
        pulseRaf = requestAnimationFrame(tick); };
      // [L02-NO-READ-INSTR] a page without a narration clip (pages 3-10: their "इस वाक्य को पढ़िए।" was removed from the card)
      // opens silently and runs straight into the same beat — the "tap here" cue 4 s in
      const promptSrc = audioFor(slide, "prompt") || null;
      // [L02-T1-CUE-2S] the cue comes data.cue_delay_ms after the page opens (page 2: 1 s — the user's request, 2 s at first; the
      // others keep the reference's 4 s); the chip pulse is the cue's own, for exactly as long as the line plays, so it is in sync with the VO
      const cueDelay = (typeof d.cue_delay_ms === "number" && d.cue_delay_ms >= 0) ? d.cue_delay_ms : 4000;
      const afterNarration = ()=>{ cancelAnimationFrame(pulseRaf); setChipPulse(false); setSwMood("point"); if(!alive()) return;
        scheduleCue(cueDelay);   // 4 s after the page opens (the reference spacing; 1 s on page 2, [L02-T1-CUE-2S]) — the picture's pop itself comes after the sentence
      };
      const narrate = ()=>{
        if(!alive()) return;
        clearTimeout(cueTimer); setCue(false); wordsOff();
        if(!promptSrc){ afterNarration(); return; }
        setSwMood("talk");
        play(promptSrc, afterNarration);
        armChipPulse(currentAudio);
      };
      // the header mascot repeats the narration on a tap (never while the chip cue is speaking, never during the read-aloud beat, and
      // not while the sentence that follows the beat is still speaking — the chip is disabled by then, so a cut sentence could not be
      // asked for again and the pop / आगे बढ़ें would never come), as the straddling bird did; on a page with no narration there is
      // nothing to repeat, so the mascot takes no tap there
      const mw = $("mascotWrap");
      if(mw){ mw.onclick = promptSrc ? ()=>{ if(cueOn || recOn || (recDone && !heard)) return; SwiftPAL.emit("audio_replay", { slide_id: slide.id, phase: slide.phase, src: "mascot" }); narrate(); } : null; }
      // the sentence sits on ONE line in the Figma bar: the type (the bar's 32px) is shrunk only for a line that would not fit
      const fitCaption = ()=>{ if(!alive()) return; let fs = parseFloat(getComputedStyle(cap).fontSize) || 32, guard = 16;
        while(guard-- > 0 && fs > 20 && cap.scrollWidth > cap.clientWidth + 1){ fs -= 1; cap.style.fontSize = fs + "px"; } };
      requestAnimationFrame(fitCaption);
      narrate();
    }
  },
  STORY_QUESTION: {
    // TEST: a comprehension question after story beats. A recall thumb (visual anchor) + 🔊 chip
    // form the stimulus; options are 2–3 picture chips. Tap-to-answer feedback is inherited from
    // mountTapOptions. Recall thumb is a CUE, hidden at mastery / when data.hide_recall so the
    // answer isn't leaked by thumb-reading.
    mount(host, slide){
      const d = slide.data || {};
      // Reference layout: the question lives in the header band and the header speaker chip replays it —
      // there is no in-stage listen chip. The only stimulus drawn is the recall PICTURE (picture→sentence
      // direction); it falls back to the card's emoji while the art is pending, like every other picture.
      const hideRecall = (slide.phase === "mastery" && d.hide_recall !== false) || d.hide_recall === true;   /* [L02-M1-SENTQ] an explicit false shows it at mastery */
      let stim = null;
      if(!hideRecall && d.recall_image_id){
        stim = document.createElement("div"); stim.className = "story-q-stim";
        // [PORT] slide.bare_recall: the framed recall picture is shown bare, at the story-page picture size (no white box)
        if(slide.bare_recall === true) stim.classList.add("sq-bare");
        const fb = (CARD._emoji_fallback && CARD._emoji_fallback[d.recall_image_id]) || "🖼️";
        stim.innerHTML = imgOrEmoji(d.recall_image_id, fb, "story-q-thumb", "story-q-thumb-emoji");
      }
      // [PORT] slide.sentence_box: a rounded listen box (🔊 + the sentence) above the options; tapping it
      // replays the question exactly like the header speaker chip.
      else if(slide.sentence_box === true && d.stim_hi){
        stim = document.createElement("div"); stim.className = "story-q-stim sq-sentence-box";
        stim.setAttribute("role","button"); stim.setAttribute("aria-label","फिर से सुनो");
        stim.innerHTML = '<span class="sq-spk" aria-hidden="true"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#fff" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg></span><span class="sq-text">' + d.stim_hi + '</span>' +
          // [PORT] the tutorial pages' 58px speaker chip (same .tut-audio markup + SPK_SVG art), anchored 14px left of the box
          // (CSS: .sq-sentence-box .tut-audio); a tap on it bubbles to the box's own replay handler below
          '<span class="tut-audio" role="button" aria-label="फिर से सुनो">' + SPK_SVG + '</span>';
        stim.onclick = ()=>{
          state.audioReplays++;
          SwiftPAL.emit("audio_replay", { slide_id: slide.id, phase: slide.phase, count: state.audioReplays, src: "sentence_box" });
          if(state.replayAudio) state.replayAudio(); else autoPlayChain(slide);
        };
      }
      // [PORT] no options authored → display-only beat: picture (and box) shown, prompt VO plays, आगे moves on
      if(!(d.options && d.options.length)){
        const row = document.createElement("div"); row.className = "q-row";
        if(stim) row.appendChild(stim);
        host.appendChild(row);
        // no आगे button and no idle hand: the beat moves on by itself once the prompt has played
        state.ownsAudio = true; setNavActive(false); stopNudge();
        state.replayAudio = ()=>{ play(audioFor(slide, "prompt") || null, ()=>{}); };
        let _done = false;
        const _go = ()=>{ if(_done) return; _done = true;
          setTimeout(()=>{ if(CARD.slides[state.idx] === slide) completeSlide(true); }, 1500); };
        play(audioFor(slide, "prompt") || null, _go);
        setTimeout(_go, 15000);   // watchdog if the clip never reports back
        return;
      }
      mountTapOptions({
        slide, host,
        signalName: d.signal_name || "story_question_first_try",
        stimulus: stim,
        nudgeTarget: null,
        options: d.options,
        isCorrect: (opt) => opt.correct === true,
        optionRenderer: (opt) => {
          const cell = document.createElement("div");
          // [PORT] slide.sentence_options: option = blue speaker chip + yellow sentence pill (the story caption pill);
          // the chip speaks the sentence, the pill answers
          if(slide.sentence_options === true){
            cell.className = "sent-opt";
            cell.innerHTML = '<span class="so-spk" role="button" aria-label="सुनो">' + SPK_SVG + '</span>' +
                             '<span class="so-pill story-caption">' + (opt.label_hi || '') + '</span>';
            cell.querySelector(".so-spk").onclick = (e)=>{ e.stopPropagation();
              if(opt.audio) play("assets/Audio/" + opt.audio + "." + AUDIO_EXT, ()=>{}); };
            return cell;
          }
          cell.innerHTML =
            imgOrEmoji(opt.img, opt.emoji, "story-q-opt-img", "story-q-opt-emoji") +
            (opt.label_hi ? '<span class="story-q-opt-label">' + opt.label_hi + '</span>' : '');
          return cell;
        },
        mastery: d.mastery === true,
        columnsHint: (d.options && d.options.length) <= 2 ? 2 : 3
      });
      // [PORT] slide.pic_options: the option pictures ARE the cards — no white box, the framed picture fills the cell
      if(slide.pic_options === true){ const g = host.querySelector(".opt-grid"); if(g) g.classList.add("pic-opts"); }
      if(slide.sentence_options === true){ const g = host.querySelector(".opt-grid"); if(g) g.classList.add("sent-opts"); }
    }
  },

  TAP_IN_SCENE: {
    // "Tap the thing in the picture" — a PRODUCE-style comprehension mechanic (NOT an MCQ). A story
    // scene fills the frame; the child taps the target region(s) (e.g. the monkeys who took the caps).
    // A correct hotspot → confetti + advance; a miss → soft buzz + try_again VO; after a few idle
    // seconds the target gently pulses (hint). Data: {image_id, alt_hi, prompt, hotspots:[{x,y,w,h,
    // correct}] (as % of the frame), audio:{prompt,correct,try_again}}. Reusable for any "find X".
    mount(host, slide){
      const d = slide.data || {};
      const wrap = document.createElement("div"); wrap.className = "tis-scene";
      const frame = document.createElement("div"); frame.className = "tis-frame";
      const img = document.createElement("img"); img.className = "tis-img";
      img.src = "assets/Images/" + d.image_id + "." + IMG_EXT; img.alt = d.alt_hi || "";
      frame.appendChild(img);
      let done = false;
      // [L02-FIND-HINTS] data.hint_seq (clip ids): the n-th miss speaks the n-th line, the last line repeats; when the last line is
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
        play("assets/Audio/" + seq[k] + "." + AUDIO_EXT, ()=>{}); };
      (d.hotspots || []).forEach(h => {
        const hs = document.createElement("button"); hs.className = "tis-hot" + (h.correct ? " correct-hot" : "");
        hs.style.left=h.x+"%"; hs.style.top=h.y+"%"; hs.style.width=h.w+"%"; hs.style.height=h.h+"%";
        hs.onclick = (e)=>{ e.stopPropagation(); if(done) return;
          if(h.correct){ done=true; if(pointed) stopNudge(); hs.classList.add("hit"); sfxCorrect(); confettiCannon(); setSwMood("happy");
            SwiftPAL.emit(d.signal_name || "scene_tap_first_try", {slide_id:slide.id, phase:slide.phase, correct:true});
            play(audioFor(slide,"correct")||null, ()=> setTimeout(()=>{ if(CARD.slides[state.idx] === slide) completeSlide(true); }, 900)); }   // [L02-FIND-FIG] only its own slide
          else { hs.classList.add("shake"); miss(); } };
        frame.appendChild(hs);
      });
      frame.onclick = miss;   // tapping empty scene = gentle try_again
      wrap.appendChild(frame); host.appendChild(wrap);
      $("navBtn").style.display = "none";   // advance on the correct tap — no आगे on a pick
      state.replayAudio = ()=> play(audioFor(slide,"prompt")||null, ()=>{});
      setSwMood("point");
      play(audioFor(slide,"prompt")||null, ()=>{});
      setTimeout(()=>{ if(!done) frame.querySelectorAll(".tis-hot.correct-hot").forEach(el=>el.classList.add("pulse")); }, 6000);
    }
  },

  BLANK_PANEL: {
    // [PORT] reference page frame (page 13): the constant header (mascot + title band) over ONE empty white panel with a
    // grey stroke — nothing else: no options, no आगे, no VO. Content is added later. CSS: .ref-panel + .stage.ref-frame
    mount(host, slide){
      const d = slide.data || {};
      const PIC_S = 1025 / 987;   // CSS px per picture px: the 987px-wide art is shown at the panel's 1025px inner width
      const panel = document.createElement("div"); panel.className = "ref-panel";
      // [PORT] data.train (image id): the train picture (train + its own rail band, transparent) shown at the panel's full
      // inner width, bottom-aligned to the panel's outer edge like the reference. TWO copies of the same picture: .ref-rail
      // keeps only the rail band (static, full width) and .ref-train keeps only the train, which slides in from the right
      // and stops centred (CSS: refTrainIn). Rows split at 218/234 of the picture.
      if(d.train){
        const src = 'assets/Images/' + d.train + '.png';
        ['ref-rail','ref-train'].forEach(cls => {
          const im = document.createElement('img'); im.className = cls; im.src = src; im.alt = '';
          im.onerror = ()=>{ im.style.display = 'none'; };
          panel.appendChild(im);
        });
        // the loco's two spoked wheels turn while the train runs (the coach wheels are plain discs, a turn would not show).
        // Each wheel is a 54x54 picture-px box centred on its hub, holding two images over the painted wheel: a static
        // backplate (train_wheel_bg_N.png: the body/chassis bands behind the spokes, r<60 of the source wheel, plus the
        // ring's inner outline) and the spokes+hub cut out alone (train_wheel_N.png), which rotates about the box centre.
        // The layer rides the train's runs (CSS .ref-wheels = refTrainIn / refTrainOut); the cut-out's spin (refWheelIn /
        // refWheelOut, the same curves) covers the run's distance — 92% of the 1025px panel width — rolling on the wheel's
        // outer radius r (picture px), anticlockwise as the train moves left. Built by the scratchpad make_wheels.py.
        const WHEELS = [{ cx:204.2, cy:174.4, r:32.9, hs:27, src:'train_wheel_1', bg:'train_wheel_bg_1' },
                        { cx:273.1, cy:174.3, r:32.9, hs:27, src:'train_wheel_2', bg:'train_wheel_bg_2' }];
        const wheels = document.createElement('div'); wheels.className = 'ref-wheels';
        WHEELS.forEach(w => {
          const geom = im => { im.style.left = ((w.cx - w.hs) * PIC_S) + 'px'; im.style.bottom = (-4 + (234 - (w.cy + w.hs)) * PIC_S) + 'px';
            im.style.width = im.style.height = (2 * w.hs * PIC_S) + 'px'; im.alt = ''; im.onerror = ()=>{ im.style.display = 'none'; }; };
          const bg = document.createElement('img'); bg.className = 'ref-wheel-bg'; geom(bg); bg.src = 'assets/Images/' + w.bg + '.png';
          const im = document.createElement('img'); im.className = 'ref-wheel'; geom(im);
          im.style.setProperty('--turn', (0.92 * 1025 / (2 * Math.PI * w.r * PIC_S) * 360).toFixed(1) + 'deg');
          im.src = 'assets/Images/' + w.src + '.png';
          wheels.appendChild(bg); wheels.appendChild(im); });
        panel.appendChild(wheels);
        // smoke over the engine's chimney: four puffs rising and fading, riding the same slide-in as the train
        // (CSS: .ref-smoke / .ref-puff); the steam-whistle SFX plays as the train appears (assets/Audio/sfx_train_whistle)
        // data.cargo (image ids): one picture per coach, in the picture area above each coach's sentence box; the layer
        // rides the same slide-in as the train (CSS: .ref-cargo / .ref-cargo-img, coach boxes measured on the picture).
        // data.cargo_pos (optional, a CSS object-position per picture): where the cover-fit keeps its focus — the boxes are
        // about 2:1, wider than the pictures, so "center 20%" keeps a subject near the top, "center 65%" one near the bottom
        if(Array.isArray(d.cargo) && d.cargo.length){
          const cargo = document.createElement('div'); cargo.className = 'ref-cargo';
          d.cargo.forEach((id, i) => { const im = document.createElement('img'); im.className = 'ref-cargo-img'; im.alt = '';
            if(Array.isArray(d.cargo_pos) && d.cargo_pos[i]) im.style.objectPosition = d.cargo_pos[i];
            im.src = 'assets/Images/' + id + '.png'; im.onerror = ()=>{ im.style.display = 'none'; }; cargo.appendChild(im); });
          panel.appendChild(cargo);
        }
        const smoke = document.createElement('div'); smoke.className = 'ref-smoke';
        for(let i = 0; i < 4; i++){ const puff = document.createElement('span'); puff.className = 'ref-puff'; smoke.appendChild(puff); }
        panel.appendChild(smoke);
        // the whistle is an .mp3 while this card's VO is .ogg, so it is played by full path (playSfx would append .ogg);
        // if the browser blocks autoplay (no tap yet), it plays on the learner's next tap instead
        try{
          const whistle = new Audio('assets/Audio/' + (d.train_sfx || 'sfx_train_whistle.mp3')); whistle.volume = 0.7;
          whistle.play().catch(()=>{ document.addEventListener('pointerdown', ()=>{ whistle.play().catch(()=>{}); }, { once:true }); });
        }catch(e){}
      }
      host.appendChild(panel);
      // data.sentences: one centred row of yellow sentence pills under the panel (the page-6 option pill look; CSS: .ref-opts)
      if(Array.isArray(d.sentences) && d.sentences.length){
        const row = document.createElement('div'); row.className = 'ref-opts';
        d.sentences.forEach(t => { const pill = document.createElement('span'); pill.className = 'ref-opt story-caption'; pill.textContent = t; row.appendChild(pill); });
        host.appendChild(row);
      }
      // data.pictures (image ids, the framed *_ylw assets): one centred row of bare framed pictures under the panel — page 5's
      // option look (20px corners, its soft shadow), sized to the train page: 160px tall, 28px apart, centred in the 303px
      // under the panel (CSS: .ref-pics). With data.pic_answers they are the page-14 draggables (see the drag system below).
      let picRow = null;
      if(Array.isArray(d.pictures) && d.pictures.length){
        const row = picRow = document.createElement('div'); row.className = 'ref-pics';
        // each card is a wrapper div holding the picture: the engine blanks pointer events on every <img> (Edge hover-toolbar
        // fix), so the wrapper is what is dragged
        d.pictures.forEach(id => { const card = document.createElement('div'); card.className = 'ref-pic';
          const im = document.createElement('img'); im.alt = ''; im.draggable = false; im.src = 'assets/Images/' + id + '.png';
          im.onerror = ()=>{ im.style.display = 'none'; }; card.appendChild(im); row.appendChild(card); });
        host.appendChild(row);
      }
      // ---- drag-and-drop onto the coaches: ONE system for the page-13 sentence pills (data.sentences + data.answers) and
      // the page-14 picture cards (data.pictures + data.pic_answers); answers[i] = the coach of item i. Unlocked once the
      // FIRST auto-drag pass has ended. A drop on the matching coach flies the item into that coach — a pill into the dashed
      // box, where the sentence is then written (writeInBox); a picture into the coach's interior above the box, which it
      // then fills exactly like page 13's cargo (placeCargo) — and a drop anywhere else shakes red and snaps back. In picture
      // px of the 987x234 art (train_wagons2*.png, the toy train of 2026-09-22): COACH = each coach body, outline to outline
      // (the drop test), BOX = the sentence box, 3px inside the coach's white window and 4px above its bottom (the windows
      // are x 336-498 / 525-691 / 717-885, y 20/19/17-154; the rail band starts at y 204, the funnel top is at (144,62))
      const sentences = Array.isArray(d.sentences) ? d.sentences : [], pictures = Array.isArray(d.pictures) ? d.pictures : [];
      const kind = sentences.length ? 'text' : (pictures.length ? 'pic' : null), items = kind === 'text' ? sentences : pictures;
      const answers = kind === 'text' ? (Array.isArray(d.answers) ? d.answers : null) : (kind === 'pic' && Array.isArray(d.pic_answers) ? d.pic_answers : null);
      const placed = [], placedEl = [], COACH_X = [[308,510],[510,701],[701,897]], COACH_Y = [0,181], BOX_X = [[339,495],[528,688],[720,881]], BOX_Y = [104,150];
      // where a dropped picture lands, in picture px: by default the white of the window above the sentence box (page 13's
      // cargo boxes, as CSS .ref-cargo-img: the window's x, y ~20-104). data.cargo_box {x:[[x0,x1] per coach], y:[y0,y1]} overrides it
      // for art with its own drop box — page 14's train_wagons2_p14 has a dashed drop box ABOVE the plain cream sentence
      // strip (the same x 339-495 / 528-688 / 720-881, y 23-101); the picture then fills that box edge to edge, dashes
      // included (inline bottom/height)
      const cb = d.cargo_box && Array.isArray(d.cargo_box.x) && Array.isArray(d.cargo_box.y) ? d.cargo_box : null;
      const CARGO_Y = cb ? cb.y : [20,104];
      const CARGO_L = cb ? cb.x.map(([x0]) => x0 * PIC_S) : [348.8, 544.9, 744.6], CARGO_W = cb ? cb.x.map(([x0, x1]) => (x1 - x0) * PIC_S) : [168.9, 173.4, 174.3];
      const CARGO_H = (CARGO_Y[1] - CARGO_Y[0]) * PIC_S, CARGO_B = -4 + (234 - CARGO_Y[1]) * PIC_S;   // a placed picture's CSS height / bottom
      // over a coach a picture card shrinks to its landing size (CSS .ref-over reads --ref-land-*; defaults = the 109px
      // interior): with a drop box, that box's height, the card's 1410x1188 aspect, margins that keep its 190x160 slot
      if(cb && picRow){ const w = CARGO_H * 1410 / 1188; picRow.style.setProperty('--ref-land-h', CARGO_H + 'px');
        picRow.style.setProperty('--ref-land-my', ((160 - CARGO_H) / 2) + 'px'); picRow.style.setProperty('--ref-land-mx', ((190 - w) / 2) + 'px'); }
      // where item i lands in coach c (picture px): the dashed box's centre for a sentence, the drop box's (else the
      // interior's) centre for a picture
      const targetOf = c => kind === 'pic' ? { x: cb ? (cb.x[c][0] + cb.x[c][1]) / 2 : (COACH_X[c][0] + COACH_X[c][1]) / 2, y: (CARGO_Y[0] + CARGO_Y[1]) / 2 }
                                           : { x: (BOX_X[c][0] + BOX_X[c][1]) / 2,     y: (BOX_Y[0] + BOX_Y[1]) / 2 };
      let dragReady = false, dragging = null;
      const railEl = ()=> panel.querySelector('.ref-rail');
      const stageScale = ()=> $("stage").getBoundingClientRect().width / 1333;
      // Liveness of THIS mount. The engine re-uses ONE #slideHost for every page (clearHost() only empties it), so the
      // host stays connected after this page has been left — a timer from an earlier visit would then act on a later
      // visit's elements. The hint loop used to do exactly that: it picked the pill up from the host (the new page's pill)
      // but measured its own, detached rail (an all-zero rect), and glided the pill towards the page's top-left every 4s.
      // So: liveness = this mount's own panel, and the items are this mount's own elements, fixed at mount time.
      const live = ()=> panel.isConnected;
      const ownItems = [...host.querySelectorAll(kind === 'pic' ? '.ref-pic' : '.ref-opt')];
      // every correct drop plays the "correct" chime (assets/Audio/sfx_correct.mp3, 1.3s) — ONE player, restarted from 0 on
      // each correct drop so chimes never stack. (The steam-engine recording is the departure's sound only.)
      let correctSfx = null;
      const playCorrect = ()=>{ try{
        if(!correctSfx){ correctSfx = new Audio('assets/Audio/' + (d.correct_sfx || 'sfx_correct.mp3')); correctSfx.volume = 0.7; }
        correctSfx.currentTime = 0; correctSfx.play().catch(()=>{}); }catch(e){} };
      // one sentence written inside a coach's dashed box, in the written-sentence style (.ref-slot-text: 17px, navy). The
      // labels sit in ONE full-width, 0-height layer (.ref-slots: the panel's own coordinates) so they can ride the train
      const writeInBox = (coach, text)=>{
        const label = document.createElement('div'); label.className = 'ref-slot-text'; label.textContent = text; label.dataset.coach = coach;
        label.style.left = (BOX_X[coach][0] * PIC_S) + 'px'; label.style.width = ((BOX_X[coach][1] - BOX_X[coach][0]) * PIC_S) + 'px';
        label.style.bottom = (-4 + (234 - BOX_Y[1]) * PIC_S) + 'px'; label.style.height = ((BOX_Y[1] - BOX_Y[0]) * PIC_S) + 'px';
        let slots = panel.querySelector('.ref-slots');
        if(!slots){ slots = document.createElement('div'); slots.className = 'ref-slots'; panel.appendChild(slots); }
        slots.appendChild(label); return label; };
      // one picture placed in a coach: the interior above the dashed box, filled exactly like page 13's cargo (.ref-cargo-img,
      // cover-fitted, 6px top corners; position/size inline per coach since drops come in any order). The layer is created
      // on the first placement WITHOUT the slide-in (.ref-static: the train has long stopped) and still rides the departure.
      const placeCargo = (coach, id, pos)=>{
        let cargo = panel.querySelector('.ref-cargo');
        if(!cargo){ cargo = document.createElement('div'); cargo.className = 'ref-cargo ref-static'; panel.appendChild(cargo); }
        const im = document.createElement('img'); im.className = 'ref-cargo-img ref-cargo-in'; im.alt = ''; im.dataset.coach = coach;
        im.style.left = CARGO_L[coach] + 'px'; im.style.width = CARGO_W[coach] + 'px';
        if(cb){ im.style.bottom = CARGO_B + 'px'; im.style.height = CARGO_H + 'px'; im.style.borderRadius = '9px'; }   // the drop box, its r9 corners on all four sides
        if(pos) im.style.objectPosition = pos;   // the cover-fit's focus (data.pic_cargo_pos)
        im.src = 'assets/Images/' + id + '.png'; im.onerror = ()=>{ im.style.display = 'none'; }; cargo.appendChild(im); return im; };
      // item i placed in coach c: the sentence written in the box, or the picture (its data.pic_cargo coach version, else the
      // card's own picture; data.pic_cargo_pos[i] = its cover-fit focus) filling the drop box
      const placeItem = (coach, i)=> placedEl[coach] = (kind === 'pic'
        ? placeCargo(coach, (Array.isArray(d.pic_cargo) && d.pic_cargo[i]) || pictures[i], (Array.isArray(d.pic_cargo_pos) && d.pic_cargo_pos[i]) || '')
        : writeInBox(coach, sentences[i]));
      // data.box_texts (one sentence per coach, in coach order; "" leaves a coach empty): written into the dashed boxes at
      // mount, exactly as page 13 writes a dropped sentence, and riding the train's slide-in with it (.ref-slots.ref-ride,
      // the cargo's own animation) — page 14's pre-filled coaches
      if(Array.isArray(d.box_texts) && d.box_texts.length){
        d.box_texts.forEach((t, c)=>{ if(t && BOX_X[c]) writeInBox(c, t); });
        const slots = panel.querySelector('.ref-slots'); if(slots) slots.classList.add('ref-ride');
      }
      // data.auto_drag {after_ms, repeat_ms}: 2s after the train has stopped, the first still-unplaced item lifts and glides to
      // where it belongs — a pill to its coach's dashed box, a picture to its coach's interior — pauses, and glides back
      // (CSS: .ref-autodrag / refAutoDrag). After each pass it re-arms: it plays again after repeat_ms (4s) of inactivity —
      // any tap or key press restarts that idle clock. The path is read from the live layout: the item's box and the rail
      // picture's box.
      // [AUTODRAG-FIRST] (2026-09-24) data.auto_drag.first_only (pages 13 and 14, repeat_ms 5000): the glide always demonstrates the
      // FIRST option (item 0). After a pass it re-arms as before - it plays again after repeat_ms (5 s) of inactivity, any tap or
      // key press restarting that clock - but only while item 0 is still unplaced; once it has been placed the hint stops for
      // good, so the later items are never demonstrated. (Replaces the short-lived once-only flag of the same day, which had no
      // idle repeat at all.) The pre-pass retries (rail not measurable yet, learner mid-drag) are untouched.
      if(d.auto_drag && items.length){
        const g = d.auto_drag, repeatMs = g.repeat_ms || 4000;
        let idleTimer = null;
        const cleanup = ()=>{ clearTimeout(idleTimer); idleTimer = null;
          document.removeEventListener('pointerdown', onActivity); document.removeEventListener('keydown', onActivity); };
        const schedule = ms => { clearTimeout(idleTimer); idleTimer = setTimeout(run, ms); };
        const onActivity = ()=>{ if(!live()){ cleanup(); return; } if(idleTimer) schedule(repeatMs); };   // only while waiting
        const run = ()=>{
          idleTimer = null;
          if(!live()){ cleanup(); return; }                                   // this page has been left: stop for good
          const idx = g.first_only ? (placed[0] ? -1 : 0) : items.findIndex((_, i)=> !placed[i]);   // [AUTODRAG-FIRST] item 0 only
          if(idx < 0){ cleanup(); return; }                                   // everything placed: no more hints
          if(dragging){ schedule(repeatMs); return; }                          // learner is mid-drag: try again later
          const el = ownItems[idx], rail = railEl();
          if(!el || !rail){ cleanup(); return; }
          if(el.classList.contains('ref-autodrag')) return;
          const coach = answers ? answers[idx] : (g.coach || 0), t = targetOf(coach);
          const sc = stageScale(), pr = el.getBoundingClientRect(), rr = rail.getBoundingClientRect();
          if(!(rr.width > 0 && rr.height > 0)){ dragReady = true; schedule(repeatMs); return; }   // rail not measurable (yet): no glide to nowhere
          const tx = rr.left + rr.width * (t.x / 987), ty = rr.top + rr.height * (t.y / 234);
          el.style.setProperty('--gdx', ((tx - (pr.left + pr.width / 2)) / sc) + 'px');
          el.style.setProperty('--gdy', ((ty - (pr.top + pr.height / 2)) / sc) + 'px');
          el.classList.add('ref-autodrag');
          el.addEventListener('animationend', ()=>{ el.classList.remove('ref-autodrag'); dragReady = true;
            if(live()) schedule(repeatMs); else cleanup(); }, { once:true });
        };
        document.addEventListener('pointerdown', onActivity); document.addEventListener('keydown', onActivity);
        // [VO-BATCH] the page's instruction (vo_p5_instr / vo_p6_instr, audio.prompt) speaks once the train has stopped, and the
        // first glide hint follows after_ms AFTER it has ended (the demonstration never talks over the instruction)
        const arm = ()=>{ const vo = audioFor(slide, "prompt"), go = ()=> setTimeout(run, g.after_ms || 2000); if(vo) play(vo, go); else go(); };
        const train = panel.querySelector('.ref-train');
        if(window.FLNMotion && FLNMotion.still()){ dragReady = true; const vo = audioFor(slide, "prompt"); if(vo) play(vo, ()=>{}); }   /* FLN ANIMATION KIT (R5): no animationend under reduced motion - skip the glide hint, arm dragging now */
        else if(train) train.addEventListener('animationend', arm, { once:true }); else arm();
      } else { dragReady = true; const vo = audioFor(slide, "prompt"); if(vo) play(vo, ()=>{}); }   // [VO-BATCH] no glide hint authored: the instruction still speaks
      if(answers && items.length){
        const coachAt = (cx, cy)=>{ const rr = railEl().getBoundingClientRect();
          const px = (cx - rr.left) / rr.width * 987, py = (cy - rr.top) / rr.height * 234;
          if(py < COACH_Y[0] || py > COACH_Y[1]) return -1;
          return COACH_X.findIndex(([x0, x1])=> px >= x0 && px <= x1); };
        const allDone = ()=>{
          SwiftPAL.emit("train_matched_all", { slide_id: slide.id, phase: slide.phase });
          // the engine's correct-answer reward, exactly as on the question pages (celebrateThenAdvance): the rising
          // correct sfx + the falling confetti burst over the stage + Swiftie's celebrate animation in the header
          sfxCorrect(); confettiCannon(); setSwMood("celebrate");
          // send-off: once the last item has popped in (350ms), the placed items — the written sentences on page 13, the
          // coach pictures on page 14 — give one small bounce coach by coach — 1st, 2nd, 3rd, 250ms apart (CSS: .ref-bounce)
          // — and when that has ended the train pulls out to the LEFT with its pictures, the sentences and a re-lit smoke
          // plume: the arrival run mirrored (CSS: .ref-panel.ref-depart / refTrainOut) to the steam-engine SFX
          // (assets/Audio/sfx_train_depart.mp3, trimmed to the run). आगे stays hidden until the train has left the panel:
          // it is shown by the departure run's end (animationend of refTrainOut on .ref-train, with a fallback timer a beat
          // after the 6.001s run). If the page has been unmounted, nothing runs.
          const els = [0, 1, 2].map(c => placedEl[c]).filter(Boolean);
          setTimeout(()=>{ if(!live()) return;
            els.forEach((el, k)=>{ el.style.animationDelay = (k * 0.25) + 's'; el.classList.add('ref-bounce'); }); }, 350);
          setTimeout(()=>{ if(!live()) return; panel.classList.add('ref-depart');
            try{ const sfx = new Audio('assets/Audio/' + (d.depart_sfx || 'sfx_train_depart.mp3')); sfx.volume = 0.7; sfx.play().catch(()=>{}); }catch(e){}
            let navShown = false;
            const showNav = ()=>{ if(navShown || !live()) return; navShown = true; $("navBtn").style.display = ""; setNavActive(true); };
            const train = panel.querySelector('.ref-train');
            if(train) train.addEventListener('animationend', e=>{ if(e.animationName === 'refTrainOut') showNav(); }, { once:true });
            setTimeout(showNav, 6300);
          }, 1650);
        };
        ownItems.forEach((el, i)=>{
          let active = false, sx = 0, sy = 0, dx = 0, dy = 0, bcx = 0, bcy = 0, over = false;
          el.addEventListener('pointerdown', e=>{
            if(!dragReady || placed[i] || dragging || el.classList.contains('ref-autodrag')) return;
            active = true; dragging = el; sx = e.clientX; sy = e.clientY; dx = dy = 0;
            el.classList.remove('ref-wrong'); el.classList.add('ref-dragging');
            const r0 = el.getBoundingClientRect(); bcx = r0.left + r0.width / 2; bcy = r0.top + r0.height / 2; over = false;   // slot centre
            try{ el.setPointerCapture(e.pointerId); }catch(err){}
            e.preventDefault();
          });
          el.addEventListener('pointermove', e=>{
            if(!active) return; const sc = stageScale(); dx = (e.clientX - sx) / sc; dy = (e.clientY - sy) / sc;
            // over a coach (the drop's own test, on the item's centre) the item shrinks to its landing size (.ref-over: a pill
            // to the dashed box, a picture to the interior's height; at scale 1 so it IS that size); anywhere else it rides
            // lifted at 1.04 and grows back to its own size
            const now = coachAt(bcx + dx * sc, bcy + dy * sc) >= 0;
            if(now !== over){ over = now; el.classList.toggle('ref-over', over); }
            el.style.transform = 'translate(' + dx + 'px,' + dy + 'px) scale(' + (over ? 1 : 1.04) + ')';
          });
          const finish = ()=>{
            if(!active) return; active = false; dragging = null; el.classList.remove('ref-dragging');
            const sc = stageScale(), pr = el.getBoundingClientRect(), cx = pr.left + pr.width / 2, cy = pr.top + pr.height / 2;
            const coach = coachAt(cx, cy), ok = coach === answers[i];
            SwiftPAL.emit("train_match_drop", { slide_id: slide.id, pill: i, kind, coach, correct: ok });
            if(!ok){ over = false; el.classList.remove('ref-over'); el.classList.add('ref-wrong'); el.style.transform = ''; setTimeout(()=> el.classList.remove('ref-wrong'), 650); return; }
            placed[i] = true; playCorrect();
            // glide from the (untransformed) slot to where it lands, at the landing size (the item is already shrunk to it,
            // .ref-over stays on), then place it there
            const rr = railEl().getBoundingClientRect(), t = targetOf(coach);
            const bx = rr.left + rr.width * (t.x / 987), by = rr.top + rr.height * (t.y / 234);
            const baseCx = cx - dx * sc, baseCy = cy - dy * sc;
            el.classList.add('ref-over'); el.classList.add('ref-placing');
            requestAnimationFrame(()=>{ el.style.transform = 'translate(' + ((bx - baseCx) / sc) + 'px,' + ((by - baseCy) / sc) + 'px) scale(1)'; });
            const settle = ()=>{ el.style.visibility = 'hidden'; el.classList.remove('ref-placing', 'ref-over'); placeItem(coach, i);
              // [VO-BATCH] the matched sentence is spoken as it lands: page 13 the pill's own line (data.sentence_audio[i]), page 14
              // the coach's written sentence (data.box_audio[coach]); the chime rides alongside on its own player
              const said = (kind === 'pic') ? (Array.isArray(d.box_audio) ? d.box_audio[coach] : null) : (Array.isArray(d.sentence_audio) ? d.sentence_audio[i] : null);
              if(said) play("assets/Audio/" + said + "." + AUDIO_EXT, ()=>{});
              if(placed.filter(Boolean).length === items.length) allDone(); };
            let done = false; const once = ()=>{ if(done) return; done = true; settle(); };
            el.addEventListener('transitionend', once, { once:true }); setTimeout(once, 450);
          };
          el.addEventListener('pointerup', finish); el.addEventListener('pointercancel', finish);
        });
      }
      $("navBtn").style.display = "none"; setNavActive(false);
      state.ownsAudio = true; state.locked = false; state.replayAudio = null;
      setSwMood("point");
    }
  },

  PHASE_TRANSITION: {
    // Additive "learning journey" beat between arc phases (the MoM "no sense of progression" fix).
    // Full-screen friendly panel: badge + "अब हम ___ करेंगे" headline + a 5-dot journey map with the
    // current step lit. The header Swiftie presents it (ONE-Swiftie rule — no second mascot). Learner-
    // paced: no auto-advance timer; आगे unlocks when the beat's VO ends (immediately if silent).
    // data:{ headline_hi, icon?, step (1-based), total_steps?, to_phase? }. Build scripts weave one of
    // these before each phase change; older cards without it are untouched (purely additive).
    mount(host, slide){
      const d = slide.data || {};
      const panel = document.createElement("div"); panel.className = "phase-transition";
      const total = d.total_steps || 5, step = Math.min(d.step || 1, total);
      let map = '<div class="pt-map">';
      for(let i = 1; i <= total; i++){
        map += `<span class="pt-step ${i < step ? 'done' : i === step ? 'current' : ''}"></span>`;
        if(i < total) map += '<span class="pt-connector"></span>';
      }
      map += '</div>';
      panel.innerHTML =
        `<div class="pt-badge">${d.icon || '🎯'}</div>` +
        `<div class="pt-headline">${d.headline_hi || slide.prompt_hi || ''}</div>` + map;
      host.appendChild(panel);
      setSwMood("teach");
      SwiftPAL.emit("phase_transition_shown", { slide_id: slide.id, to_phase: d.to_phase || slide.phase, step });
      state.ownsAudio = true; state.locked = false; setNavActive(false);
      $("navBtn").onclick = ()=> completeSlide(true);
      const vo = audioFor(slide, "prompt");
      if(vo) play(vo, ()=> setNavActive(true)); else setNavActive(true);
    }
  },

  CELEBRATION: {
    mount(host, slide){
      // celebration SFX — own Audio element so it overlaps the spoken VO chain
      (window.stdSfx || playSfx)(slide.audio && slide.audio.sfx ? slide.audio.sfx : "sfx_celebrate");   // [L02-STD-SFX] the card says sfx_confetti; the standard player
      // show end screen overlay + a big Hindi headline (== the VO) so the finale feels like a reward
      const et = $("endTitle"); if(et) et.textContent = slide.prompt_hi || "";
      const st = $("endSubtitle"); if(st) st.textContent = (slide.data && slide.data.end_subtitle) || "";
      const es = $("endScreen"); es.classList.add("show");
      document.body.classList.add("is-end");   // r4: immersive sunburst backdrop (end_screen.webp)
      const c = $("confetti"); c.innerHTML = "";
      starBurst();   // r4: gold star burst from centre (replaces flat falling confetti)
      const masteryScore = state.masteryAttempts ? (state.masteryHits/state.masteryAttempts) : 0;
      SwiftPAL.emit("mastery_score", { value: masteryScore, hits: state.masteryHits, attempts: state.masteryAttempts });
      SwiftPAL.emit("lesson_completed", { skill_code: CARD.skill_code, total_signals: SwiftPAL.signals.length });
      runValidator();
      setNavActive(false);
      // "आगे बढ़ें" appears only AFTER the celebration VO finishes (see autoPlayChain onDone)
      // reference celebration: the continue pill is available at once; no confetti may bleed onto this page
      document.querySelectorAll(".fx-confetti").forEach(w => w.remove());
      const eb = $("endBtn"); eb.classList.add("show");
      state.endBtnPending = false;
      // dev-only: a small "download results" button (teacher/QA), never in child flow
      if(new URLSearchParams(location.search).has("dev") && !$("dlResults")){
        const dl = document.createElement("button"); dl.id = "dlResults"; dl.textContent = "⬇ results JSON";
        dl.style.cssText = "position:absolute;bottom:20px;left:20px;z-index:5;font-family:var(--font-hi);font-weight:700;font-size:16px;padding:8px 16px;border-radius:12px;border:2px solid #B7DCFB;background:#fff;color:var(--navy);cursor:pointer;";
        dl.onclick = ()=> SwiftPAL.downloadResults();
        es.appendChild(dl);
      }
      eb.onclick = ()=>{
        SwiftPAL.emit("proceed_next", { skill_code: CARD.skill_code, part: CARD.part_label });
        try{ window.parent?.postMessage({type:"swiftpal:proceed", skill_code:CARD.skill_code, part:CARD.part_label}, "*"); }catch(e){}
      };
    }
  }
};

/* VACHAN (एकवचन/बहुवचन) + any 2-category attribute reuse the GENERIC gender modules — identical
   mechanic, just different labels. A vachan game authors these types with the category in the
   "gender" field (e.g. "S"/"P"), the two labels, and (for pairs) f=singular / m=plural; it then
   inherits immediate tap-to-answer feedback, speak-word-on-tap, layered hints, and the engine
   guard for free. Named *_VACHAN (not *_NUMBER) to avoid colliding with MEET_NUMBER = counting. */
SlideModules.VACHAN_INTRO          = SlideModules.GENDER_INTRO;
SlideModules.MEET_VACHAN           = SlideModules.MEET_GENDER;
SlideModules.TAP_VACHAN            = SlideModules.TAP_GENDER;
SlideModules.TAP_PICTURE_BY_VACHAN = SlideModules.TAP_PICTURE_BY_GENDER;
SlideModules.SORT_VACHAN           = SlideModules.SORT_GENDER;
SlideModules.MATCH_VACHAN_PAIRS    = SlideModules.MATCH_GENDER_PAIRS;

/* ---------- 13. CONTROLLER ---------- */
/* the reference speaker chip (white ring, blue gradient, two wave arcs) used on the teaching frame's shoulder */
const SPK_SVG = '<svg viewBox="0 0 62 60" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Audio"><g filter="url(#spChipShadow)"><rect x="8" y="4" width="46" height="44" rx="22" fill="url(#spChipGrad)"/><rect x="6" y="2" width="50" height="48" rx="24" stroke="white" stroke-width="4"/><path class="mic" d="M31 17.03a3.39 3.39 0 0 1 3.39 3.39v6.31a3.39 3.39 0 0 1-6.79 0v-6.31A3.39 3.39 0 0 1 31 17.03Z" fill="white"/><path class="mic" d="M26.13 27.03a4.87 4.87 0 0 0 9.74 0" stroke="white" stroke-width="1.18" stroke-linecap="round" fill="none"/><path class="mic" d="M31 31.9V34.85M28.64 34.85H33.36" stroke="white" stroke-width="1.18" stroke-linecap="round" fill="none"/><g class="mic-wave" fill="white"><rect x="24.36" y="22.72" width="1.8" height="6.56" rx="0.9"/><rect x="27.23" y="20.26" width="1.8" height="11.47" rx="0.9"/><rect x="30.1" y="18.62" width="1.8" height="14.75" rx="0.9"/><rect x="32.97" y="20.26" width="1.8" height="11.47" rx="0.9"/><rect x="35.83" y="22.72" width="1.8" height="6.56" rx="0.9"/></g></g><defs><filter id="spChipShadow" x="0" y="0" width="62" height="60" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feFlood flood-opacity="0" result="BackgroundImageFix"/><feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/><feOffset dy="4"/><feGaussianBlur stdDeviation="2"/><feComposite in2="hardAlpha" operator="out"/><feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/><feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow"/><feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape"/></filter><linearGradient id="spChipGrad" x1="8" y1="26" x2="54" y2="26" gradientUnits="userSpaceOnUse"><stop stop-color="#1987FC"/><stop offset="1" stop-color="#1565F4"/></linearGradient></defs></svg>';
/* r4: gold star burst for the celebration finale (adopted from Shruti's build) */
function starBurst(){
  if(document.documentElement.classList.contains("no-anim")) return;
  const host = $("confetti"); if(!host) return;
  const cv = document.createElement("canvas");
  cv.width = 1333; cv.height = 750;
  cv.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
  host.appendChild(cv);
  const ctx = cv.getContext("2d");
  const COLORS = ["#FFE400","#FFBD00","#E89400","#FFCA6C","#FDFFB8"];
  const TICKS = 100, DECAY = 0.96, START_V = 22;
  const parts = [];
  function starPath(r){
    ctx.beginPath();
    for(let i=0;i<10;i++){
      const rad = (i % 2 === 0) ? r : r/2;
      const a = Math.PI/5*i - Math.PI/2;
      ctx[i === 0 ? "moveTo" : "lineTo"](Math.cos(a)*rad, Math.sin(a)*rad);
    }
    ctx.closePath();
  }
  function shoot(){
    const add = (n, scalar, shape) => {
      for(let i=0;i<n;i++){
        const a = Math.random()*Math.PI*2;
        parts.push({ x:cv.width/2, y:cv.height/2, ax:Math.cos(a), ay:Math.sin(a),
          vel:START_V*(0.5 + Math.random()), tick:0, scalar, shape,
          color:COLORS[Math.floor(Math.random()*COLORS.length)],
          rot:Math.random()*Math.PI*2, spin:(Math.random()-.5)*0.3 });
      }
    };
    add(80, 1.8, "star");
    add(20, 1.0, "circle");
  }
  shoot(); setTimeout(shoot, 150); setTimeout(shoot, 300);
  let frames = 0;
  (function frame(){
    ctx.clearRect(0, 0, cv.width, cv.height);
    let alive = false;
    for(const p of parts){
      if(p.tick >= TICKS) continue;
      alive = true;
      p.x += p.ax*p.vel; p.y += p.ay*p.vel; p.vel *= DECAY; p.rot += p.spin; p.tick++;
      ctx.globalAlpha = 1 - p.tick/TICKS;
      ctx.fillStyle = p.color;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      if(p.shape === "star"){ starPath(8*p.scalar); ctx.fill(); }
      else { ctx.beginPath(); ctx.arc(0, 0, 6*p.scalar, 0, Math.PI*2); ctx.fill(); }
      ctx.restore();
    }
    frames++;
    if(alive || frames < 30) requestAnimationFrame(frame);
    else setTimeout(()=> cv.remove(), 300);
  })();
}
function clearHost(){
  document.body.classList.remove("is-end");   // r4: clear immersive end state when leaving celebration
  $("slideHost").innerHTML = "";
  document.querySelectorAll(".reveal-hand").forEach(function(x){ x.remove(); });   // parented to .slide-stage
  $("hintBtn").classList.remove("show");
  $("hintBtn").disabled = false;
  setNavActive(false);
  stopNudge();
  stopAudio();
}

function mountSlide(idx){
  state.idx = idx;
  state.slideStart = Date.now();
  state.attempts = 0; state.selectedKey = null; state.locked = false;
  state.hintUsed = false; state.nudgeUsed = false; state.scaffoldLevel = 0; state.hintActive = false;
  state.audioReplays = 0; state.gateNavUntilAudio = false; state.endBtnPending = false;
  state.replayAudio = null;   // a module may set a slide-specific replay (e.g. teach slides whose
                              // audio roles aren't in the autoPlayChain order); else the chip replays the chain
  state.ownsAudio = false;    // a module that drives its OWN audio sequence sets this → skip autoPlayChain
                              // (else the auto prompt-chain stomps/truncates the module's timed VO)
  const slide = CARD.slides[idx];
  clearHost();

  // header prompt
  $("promptText").textContent = slide.prompt_hi || "";

  // Hint button stays HIDDEN until the learner makes a wrong attempt, then it is
  // exposed (graduated scaffold). Mastery uses the SAME scaffold — not excluded.
  $("hintBtn").classList.remove("show");
  $("hintBtn").style.display = "";
  $("navBtn").style.display = "";        // restored by default; tap-to-answer slides hide it themselves
  // [16i] DEFAULT nav wiring — a module that enables आगे without overriding onclick still advances.
  // (DEMO_COUNT shipped an enabled-but-dead button; auto-INTRO inherited an unfulfillable tap guard.)
  $("navBtn").onclick = ()=> completeSlide(true);
  setSwMood("point");                    // Swiftie turns to present each new slide

  SwiftPAL.emit("slide_entered", { slide_id: slide.id, phase: slide.phase, eis: slide.eis, type: slide.type, idx });

  // audio chip = replay the slide audio. Prefer a module-supplied replay (teach slides own their
  // count_intro/explain sequence, which autoPlayChain deliberately skips), else replay the chain.
  $("audioChip").onclick = ()=>{
    state.audioReplays++;
    SwiftPAL.emit("audio_replay", { slide_id: slide.id, phase: slide.phase, count: state.audioReplays });
    if(state.replayAudio) state.replayAudio(); else autoPlayChain(slide);
  };

  // mount the type
  const mod = SlideModules[slide.type];
  if(!mod){ console.error("[engine] no module for", slide.type); return; }
  // [engine JS] r4/F1 TEACHING FRAME: tutorial slides mount inside a grid-paper .tut-card (header hidden,
  // prompt in-card, standing Swiftie bottom-left + shoulder audio chip). Type-agnostic — any tutorial-phase
  // module renders into the card. Non-tutorial slides mount bare into slideHost as before.
  const isTut = (slide.phase === "tutorial" && slide.type !== "PHASE_TRANSITION" && slide.type !== "CELEBRATION");
  $("stage").classList.toggle("tut", isTut);
  // [PORT] slide.hide_header_chip: no speaker on the header mascot for this slide (the in-stage listen button replays instead)
  $("stage").classList.toggle("no-hdr-chip", slide.hide_header_chip === true);
  $("stage").classList.toggle("sent-page", slide.sentence_options === true);
  // [PORT] slide.ref_frame: header laid out value-for-value like the attached reference frame (CSS: .stage.ref-frame)
  $("stage").classList.toggle("ref-frame", slide.ref_frame === true);
  document.body.classList.toggle("tut-page", isTut);
  let mountHost = $("slideHost");
  if(isTut){
    const card = document.createElement("div"); card.className = "tut-card";
    card.innerHTML = `<div class="tut-prompt">${slide.prompt_hi || ""}</div>` +
      `<img class="tut-mascot" src="assets/UI/start_mascot.webp" alt="" onerror="this.style.display='none'">` +
      `<span class="tut-audio" role="button" aria-label="फिर से सुनो">${SPK_SVG}</span>`;
    const inner = document.createElement("div"); inner.className = "tut-content";
    card.insertBefore(inner, card.querySelector(".tut-mascot"));
    card.querySelector(".tut-audio").onclick = ()=>{
      state.audioReplays++;
      SwiftPAL.emit("audio_replay", { slide_id: slide.id, phase: slide.phase, count: state.audioReplays, src: "tut_chip" });
      if(state.replayAudio) state.replayAudio(); else autoPlayChain(slide);
    };
    $("slideHost").appendChild(card);
    mountHost = inner;
  }
  mod.mount(mountHost, slide);
  // [PORT] slide.caption_chip (slide-level, like prompt_hi): the replay speaker sits beside the sentence pill (left of it) instead of at
  // Swiftie's shoulder. Same element, same handler — only its parent changes (CSS: .story-caption.has-chip).
  if(isTut && slide.caption_chip === true){
    const _cap = mountHost.querySelector(".story-caption"), _chip = $("slideHost").querySelector(".tut-card .tut-audio");
    if(_cap && _chip){ _cap.classList.add("has-chip"); _cap.appendChild(_chip); }
  }
  // game-feel: animate the slide content in on every mount
  { const _sh = $("slideHost"); _sh.classList.remove("slide-in"); void _sh.offsetWidth; _sh.classList.add("slide-in"); }

  // vertically ink-centre every Devanagari glyph once the slide has laid out
  requestAnimationFrame(()=> centerAllGlyphs($("slideHost")));

  // play the full VO chain automatically (prompt → phoneme/word_name → instruction).
  // If the slide gated its nav button on audio, enable it once the chain finishes
  // (so students can't skip before hearing it). SKIP when the module owns its audio
  // (state.ownsAudio) — else this chain stomps/truncates the module's own timed VO.
  if(!state.ownsAudio){
    autoPlayChain(slide, ()=>{
      if(state.gateNavUntilAudio) setNavActive(true);
      if(state.endBtnPending){ $("endBtn").classList.add("show"); state.endBtnPending = false; }
    });
  }
}

/* ---------- [engine JS] r4/P1 PHASE-TRANSITION PEEK GATE (Shruti's peek beat) ----------
   An automatic interstitial fired ON A PHASE BOUNDARY (not a slide type): blur the stage, Swiftie
   peeks up from the bottom under a big headline, hold ≥2s, then mount the next slide. Kept ALONGSIDE
   our journey-map PHASE_TRANSITION module (a distinct, author-placed slide type) — the gate below
   skips PHASE_TRANSITION + CELEBRATION so the two never double-fire. */
function afterConfetti(fn){
  // let a correct-answer confetti burst (.fx-confetti) finish falling before we move on; 8s hard cap.
  const started = Date.now();
  (function check(){
    if(!document.querySelector(".fx-confetti") || Date.now() - started > 8000){ fn(); return; }
    setTimeout(check, 200);
  })();
}
/* onscreen headline per gate (display only; distinct from any narration). Eligibility = phase IN this map. */
const PHASE_GATE_TITLE = { tutorial:"चलिए, शुरू करें!", guided:"चलिए, साथ में करें!", practice:"अब आपकी बारी!" };   // [16h] the lead’s official transition lines (VO = full sentences in the card manifest; NOTE aap-register — flagged)
const PHASE_GATE_VO    = { tutorial:"vo_pt_tutorial", guided:"vo_pt_guided", practice:"vo_pt_practice" };
const _gatedPhases = new Set();   // each phase gate plays ONCE (Start→tutorial, →guided, →practice)
let _gateToken = 0;
function phaseBlurTransition(cb, toPhase){                          // [L02-STD-GATE] the standard transition: the bird rises, its beak opens → the line appears and speaks → closed at 4 s
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

function completeSlide(success){
  const slide = CARD.slides[state.idx];
  SwiftPAL.emit("slide_completed", {
    slide_id: slide.id, phase: slide.phase, success: !!success,
    attempts: state.attempts, latency_ms: Date.now()-state.slideStart,
    scaffold_level: state.scaffoldLevel, hint_used: state.hintUsed,
    nudge_used: state.nudgeUsed, audio_replays: state.audioReplays
  });
  if(state.idx >= CARD.slides.length - 1){
    // last slide is CELEBRATION; nothing more
    return;
  }
  // advance only AFTER the correct-answer confetti has landed (to the gate AND to the next slide alike).
  const fromIdx = state.idx, nextIdx = state.idx + 1;
  const next = CARD.slides[nextIdx];
  if(next && next.phase !== slide.phase && next.type !== "CELEBRATION" && next.type !== "PHASE_TRANSITION"
     && PHASE_GATE_TITLE[next.phase] && !_gatedPhases.has(next.phase)){
    _gatedPhases.add(next.phase);
    afterConfetti(()=>{ if(state.idx === fromIdx) phaseBlurTransition(()=> mountSlide(nextIdx), next.phase); });
    return;
  }
  afterConfetti(()=>{ if(state.idx === fromIdx) mountSlide(nextIdx); });
}

/* ---------- 14. VALIDATOR (runtime self-check) ---------- */
function runValidator(){
  const missing = (CARD.signals_expected || []).filter(s => !SwiftPAL.firedSet.has(s));
  SwiftPAL.validatorReport.missing_signals = missing;
  SwiftPAL.validatorReport.passed = missing.length === 0;
  console.log("[validator]", SwiftPAL.validatorReport);
  try{ window.parent?.postMessage({type:"swiftpal:lesson_complete", signals: SwiftPAL.signals, validatorReport: SwiftPAL.validatorReport}, "*"); }catch(e){}
  // offline self-capture: write the final record to localStorage; optionally POST
  // it to a learning-record endpoint if one is configured AND the device is online.
  SwiftPAL.persist();
  if(TELEMETRY.endpoint && navigator.onLine){
    try{ fetch(TELEMETRY.endpoint, {method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify(SwiftPAL.exportResults()), keepalive:true}).catch(()=>{}); }catch(e){}
  }
  // dev banner
  if(new URLSearchParams(location.search).has("dev")){
    const b = $("devBanner");
    if(missing.length === 0){ b.textContent = "✓ all expected signals fired"; b.className = "dev-banner show ok"; }
    else { b.textContent = "✗ missing signals: " + missing.join(", "); b.className = "dev-banner show"; }
  }
}

/* ---------- [engine JS] r4/#2 DATA-DRIVEN LANDING CONCEPT STRIP ----------
   A landing_hero of kind "concept_strip" renders N visual-example tiles from card data, so any game
   declares its landing preview in card.json instead of hand-editing HTML. Tile types: discs (size),
   bars (length), balance (weight — equal-size objects, heavier lower, never a size cue), image. */
const SG_BALANCE_SVG =
  '<svg viewBox="0 0 124 112" xmlns="http://www.w3.org/2000/svg">' +
  '<line x1="62" y1="30" x2="62" y2="86" stroke="#8AA0C8" stroke-width="6" stroke-linecap="round"/>' +
  '<polygon points="62,60 44,100 80,100" fill="#8AA0C8"/>' +
  '<g transform="rotate(-13 62 34)">' +
  '<rect x="14" y="30" width="96" height="11" rx="5.5" fill="#4EA3F0"/>' +
  '<circle cx="22" cy="20" r="14" fill="#FBD24B" stroke="#D9A21A" stroke-width="2.5"/>' +
  '<circle cx="102" cy="20" r="14" fill="#98A2B3" stroke="#5B6577" stroke-width="2.5"/>' +
  '</g></svg>';
function conceptTileHTML(c){
  const lbl = c && c.label ? ` aria-label="${c.label}"` : "";   // a11y only; not shown (pre-reader → visual+VO)
  switch(c && c.type){
    case "discs": {
      const sizes = c.sizes || [34, 54, 76];
      return `<div class="sg-ex sg-ex-size" role="img"${lbl}>` +
        sizes.map(s => `<span class="sg-disc" style="width:${s}px;height:${s}px"></span>`).join("") + `</div>`;
    }
    case "bars": {
      const widths = c.widths || [42, 72, 102];
      return `<div class="sg-ex sg-ex-len" role="img"${lbl}>` +
        widths.map(w => `<span class="sg-bar" style="width:${w}px"></span>`).join("") + `</div>`;
    }
    case "balance":
      return `<div class="sg-ex sg-ex-wt" role="img"${lbl}>` + SG_BALANCE_SVG + `</div>`;
    case "image":
      return `<div class="sg-ex" role="img"${lbl}><img src="${c.src}" alt="${c.label || ''}"></div>`;
    default:
      return "";
  }
}

/* ---------- 15. BOOT ---------- */
function boot(){
  // god-mode visual theme (opt-in via CARD.theme) — warms the whole stage; scoped CSS under .thm-*
  if(CARD.theme) $("stage").classList.add("thm-" + CARD.theme);
  // banner title = skill name only (strip "(भाग…)" and the ": letters" list)
  $("sgTitle").textContent = (CARD.title.hi || "").split(/[:：(]/)[0].trim();
  if(CARD.landing_caption_hi && $("sgCaption")) $("sgCaption").textContent = CARD.landing_caption_hi;   // landing sentence pill (card-driven)
  // landing hero → the reference's icon row: each visual sits in a .sg-icon (staggered pop-in, 150px tall)
  (function(){ const hero = CARD.landing_hero, el = $("sgHero"); if(!hero || !el) return;
    const icon = inner => `<span class="sg-icon">${inner}</span>`;
    let html = "";
    if(hero.kind === "concept_strip") html = (hero.cells || []).map(c => icon(conceptTileHTML(c))).join("");
    else if(hero.kind === "shapes" && typeof shapeSVG === "function")
      html = (hero.shapes||[]).map(s=> icon(shapeSVG(s.shape, {color:s.color, size:104, rotate:s.rotate||0}))).join("");
    else if(hero.kind === "count"){
      const hi = Math.min(Math.max(parseInt(hero.n,10)||3, 1), 5);
      for(let i=1;i<=hi;i++) html += icon(`<div class="sg-hand-cell">${fingerCount(i, "sg-hand")}<span class="sg-hand-num">${devNumeral(i)}</span></div>`);
    }
    else if(hero.kind === "image") html = icon(`<img src="${hero.src}" alt="" onerror="this.style.display='none'">`);
    el.innerHTML = html;
  })();

  // ----- landing-screen welcome VO (lead review) -----
  // A warm greeting on the title screen. Autoplay is often blocked before a gesture, so we also
  // (a) expose a pulsing 🔊 "listen" button, and (b) fire it on the first pointer-down. The whole
  // greeting lives HERE now (not on slide 0), which also kills the old overlap glitch where the
  // landing VO and slide-0 VO could talk over each other.
  const landSrc = (CARD.assets && CARD.assets.audio && CARD.assets.audio["vo_landing"]) || ("assets/Audio/vo_landing." + AUDIO_EXT);
  // Page-1 rule (SME): the welcome VO plays exactly ONCE, and the शुरू करें button appears only after it has
  // finished (#sgBtn is display:none until it carries .ready — see <style id="LANDING-START-AFTER-VO">).
  // Outcomes: ended → reveal; file missing/unsupported → reveal after a short beat (the landing can never get
  // stuck); autoplay refused before a gesture → wait, the first pointerdown retries; a second refusal still reveals.
  const landingVO = { state:"idle", tapTried:false, followUpTimer:0, idleTimer:0, cue:"off", welcomeToken:0, leaving:false, revealWatch:0 };   // state: idle | playing | done
  // SME: शुरू करें pops in (.ready → one-shot sgBtnReveal) and then BREATHES (.sg-breathe → sgBtnPulse, see
  // LANDING-START-AFTER-VO). The pulse takes over only when the pop-in has landed, so nothing jumps.
  // [LANDING-BTN-AFTER-BIRD] (2026-09-23): the button no longer appears at the end of the welcome VO - it appears only once
  // the FIRST bird cue (bird pulse + "Page 1 Replay" line, 1.5 s after the welcome) has finished and the bird has settled
  // (runBirdCue → stopBirdPulse(false, revealStart)). Page 1 order is now: welcome VO → 1.5 s → bird pulses with its line →
  // bird settles → शुरू करें pops in and breathes. A welcome that could not be heard (file error) still reveals it at once,
  // and a 10 s watchdog from the end of the welcome reveals it if the cue never completes - the landing can never get stuck.
  const revealStart = ()=>{ const b = $("sgBtn"); if(!b || b.classList.contains("ready")) return; b.classList.add("ready");
    let on = false; const breathe = ()=>{ if(on) return; on = true; b.classList.add("sg-breathe"); };
    b.addEventListener("animationend", breathe, { once:true }); setTimeout(breathe, 700); };   // 700 ms fallback: the pop-in is .52 s
  // Page-1 follow-up (SME): 1.5 s after the welcome has finished, the bird pulses FOR AS LONG AS the replay line plays
  // ("फिर से सुनने के लिए मुझ पर टैप करिए" = vo_tap_swiftee_replay) and settles when it ends. [P1-CUE-ONCE] (2026-09-23): that cue
  // plays ONCE - the former "again after every 5 s without activity" repeat is off (armIdleReplay below is a no-op), so on
  // Page 1 the welcome, the bird pulse and the replay line are each heard once; only a tap on the bird replays the welcome.
  // A tap while the cue is running is left alone (the cue finishes). Dropped the moment the child taps शुरू करें or the
  // landing is bypassed, so it can never talk over the phase-transition line.
  // landingVO.cue: off (welcome not heard yet) | pending (1.5 s beat) | playing (pulse + line) | welcome (bird-tap replay of
  // the welcome) | idle (cue over; nothing more is scheduled)
  const replaySrc = (CARD.assets && CARD.assets.audio && CARD.assets.audio["vo_tap_swiftee_replay"]) || ("assets/Audio/vo_tap_swiftee_replay." + AUDIO_EXT);
  const birdEl = ()=> document.querySelector(".start-gate .sg-mascot");
  const onLanding = ()=> !landingVO.leaving && !$("startGate").classList.contains("hidden");
  // the bird's pulse and the button's breathing are mutually exclusive (SME): while the bird pulses with its line the
  // start gate carries .sg-bird-cue, which holds शुरू करें still; the two flags always flip together
  const setBirdCue = (on)=>{ const m = birdEl(); if(m) m.classList.toggle("sg-pulsing", on); $("startGate").classList.toggle("sg-bird-cue", on); };
  const stopBirdPulse = (atOnce, then)=>{ const m = birdEl();          // then: runs once the bird is at rest ([LANDING-BTN-AFTER-BIRD]: the button reveal)
    if(!m || !m.classList.contains("sg-pulsing")){ if(then) then(); return; }
    let off = false; const settle = ()=>{ if(off) return; off = true; setBirdCue(false); if(then) then(); };
    if(atOnce){ settle(); return; }
    m.addEventListener("animationiteration", settle, { once:true });   // let the current breath finish, then rest
    setTimeout(settle, 900); };
  const runBirdCue = ()=>{                               // pulse + replay line; when the line ends the bird settles and the idle count starts
    if(!onLanding()) return;
    landingVO.cue = "playing";
    setBirdCue(true);
    play(replaySrc, ()=>{ stopBirdPulse(false, revealStart); landingVO.cue = "idle"; armIdleReplay(); });   // line ended / missing / blocked → the bird settles, then शुरू करें pops in (first cue only; later cues find it there)
  };
  const armIdleReplay = ()=>{                            // [P1-CUE-ONCE]: the 5 s no-activity repeat of the cue is OFF - the cue plays once; kept as a no-op so its callers stay as they were
    clearTimeout(landingVO.idleTimer);
  };
  const scheduleFollowUp = ()=>{                       // [L02-NO-BIRD-CUE] no bird cue any more: the welcome's end reveals शुरू करें at once
    clearTimeout(landingVO.followUpTimer); clearTimeout(landingVO.revealWatch);
    landingVO.cue = "idle";
    revealStart();
  };
  // Page 1 counts as OPEN only once the boot loader has begun to fade (.done) or is gone
  const pageOneOpen = ()=>{ const bl = $("bootLoader"); return !bl || !bl.isConnected || bl.classList.contains("done"); };
  const playLanding = ()=>{
    if($("startGate").classList.contains("hidden") || landingVO.state !== "idle") return;   // once only: never restart / overlap
    if(!pageOneOpen()) return;                            // the VO belongs to Page 1: never speak behind the loading screen
    landingVO.state = "playing";
    stopAudio(); setPlaying(true);                        // same visible state as play(): mascot mouth + speaker waves
    let done = false;
    const finish = (why)=>{
      if(done) return; done = true; setPlaying(false);
      if(why === "blocked" && !landingVO.tapTried){ landingVO.state = "idle"; return; }   // browser wants a tap first → the first tap ON PAGE 1 plays it
      landingVO.state = "done";
      if(why === "ended") scheduleFollowUp();           // the bird cue follows a welcome that was actually heard; शुरू करें follows the cue ([LANDING-BTN-AFTER-BIRD])
      else revealStart();                               // welcome not heard (file error): nothing to wait for, show the button now
    };
    const a = new Audio(landSrc); currentAudio = a;       // registered so stopAudio() (start tap / dev nav) can silence it
    a.onended = ()=> finish("ended");
    a.onerror = ()=>{ currentAudio = null; setTimeout(()=> finish("error"), 1200); };
    a.play().catch((err)=>{ currentAudio = null;
      if(err && err.name === "NotAllowedError") finish("blocked");
      else setTimeout(()=> finish("error"), 1200); });
  };
  const sgVo = $("sgVo"); if(sgVo) sgVo.onclick = (e)=>{ e.stopPropagation(); playLanding(); };
  // Page-1 bird tap (SME): tapping the bird plays the Page 1 welcome again — but NOT while the bird is pulsing with its
  // replay line (that tap is ignored; the cue is left to finish). Only once the first welcome has finished (state done),
  // so the once-only reveal chain above is never disturbed. A tap during the replay restarts it (engine replay-chip
  // convention). The tap is activity: it drops any pending 1.5 s / 5 s cue, and when the replayed welcome ends the 5 s
  // no-activity count starts afresh. The shared play() is fine here: ended / missing / blocked all just end the replay.
  const replayWelcome = ()=>{
    if(landingVO.state !== "done" || !onLanding()) return;                    // first welcome still owed, or Page 1 left
    if(landingVO.cue === "playing") return;                                   // pulsing + replay line running → ignored
    const m = birdEl(); if(m && m.classList.contains("sg-pulsing")) return;   // still settling from the pulse → ignored
    clearTimeout(landingVO.followUpTimer); clearTimeout(landingVO.idleTimer); clearTimeout(landingVO.revealWatch);
    landingVO.cue = "welcome";
    const my = ++landingVO.welcomeToken;                                      // a re-tap restarts: only the latest replay's end counts
    play(landSrc, ()=>{ if(my !== landingVO.welcomeToken) return;
      if(!$("sgBtn").classList.contains("ready")){ scheduleFollowUp(); return; }   // [LANDING-BTN-AFTER-BIRD] button still owed: 1.5 s → bird cue → button, as after the first welcome
      landingVO.cue = "idle"; armIdleReplay(); });
  };
  const sgBird = birdEl(); if(sgBird) sgBird.addEventListener("click", replayWelcome);
  // ---- BOOT LOADER (reference parity, 2s): hold the logo, fade it, THEN start the landing narration.
  // The same handler adds body.loaded (unblocks the landing icon pop-in) and fires the landing VO. ----
  (function(){
    const bl = $("bootLoader"); if(!bl){ document.body.classList.add("loaded"); playLanding(); return; }
    const ready = ()=>{
      if(bl.classList.contains("done")) return;
      bl.classList.add("done");
      document.body.classList.add("loaded");
      playLanding();
      setTimeout(()=>{ if(bl.parentNode) bl.remove(); }, 440);
    };
    setTimeout(ready, 2000);
  })();
  // A tap on Page 1 plays the VO where the browser refused to start it by itself (desktop browsers before the first
  // click). A tap during the LOADING SCREEN must not start it early: playLanding waits for Page 1, and that tap only
  // unlocks sound, so the 2 s loader hand-over can speak. Once the VO has played this is a no-op (never a replay).
  // (armIdleReplay is a no-op since [P1-CUE-ONCE]: the bird cue no longer repeats on inactivity.)
  window.addEventListener("pointerdown", ()=>{
    if(landingVO.state === "idle" && pageOneOpen()){ landingVO.tapTried = true; playLanding(); }
    armIdleReplay();
  });

  $("sgBtn").onclick = ()=>{
    landingVO.leaving = true; clearTimeout(landingVO.followUpTimer); clearTimeout(landingVO.idleTimer); stopBirdPulse(true);   // no bird cue / replay line / idle replay once the child has moved on
    stopAudio();          // silence the landing greeting BEFORE slide 0 speaks (no VO overlap)
    _ac();                // unlock/resume WebAudio on the start gesture so the first clip never clips
    // [engine JS] r4/P1: peek gate into the tutorial. The landing stays visible-and-BLURRED behind the
    // peeking Swiftie + "चलिए शुरू करें"; it hides once the tutorial mounts (in the callback).
    _gatedPhases.add("tutorial");
    phaseBlurTransition(()=>{
      $("startGate").classList.add("hidden");
      document.body.classList.remove("is-start");   // blue bg only on the title screen
      mountSlide(0);
    }, "tutorial");
  };
  // tapping आगे clears any pending nav-nudge
  $("navBtn").addEventListener("click", ()=>{ clearTimeout(state.navNudgeTimer); stopNudge(); });

  // ---- teacher/dev nav (reference): skip current page, or jump to any page — visible only with ?dev=1 ----
  function gotoPage(idx){
    idx = Math.max(0, Math.min(CARD.slides.length - 1, idx|0));
    stopAudio(); _ac();
    const bl = $("bootLoader"); if(bl) bl.remove();
    document.body.classList.add("loaded");
    $("startGate").classList.add("hidden");
    document.body.classList.remove("is-start");
    $("endScreen") && $("endScreen").classList.remove("show");
    document.body.classList.remove("is-end");
    closeJump();
    mountSlide(idx);
  }
  const jGrid = $("jumpGrid"), jOv = $("jumpOverlay");
  if(jGrid && jOv){
    CARD.slides.forEach((s, i)=>{
      const it = document.createElement("button");
      it.className = "jump-item"; it.type = "button";
      it.innerHTML = `<b>${i+1}. ${s.id}</b><span class="ph">${s.phase}</span>` + `<span class="tp">${s.type}</span>`;
      it.title = s.prompt_hi || "";
      it.onclick = ()=> gotoPage(i);
      jGrid.appendChild(it);
    });
  }
  function openJump(){
    if(!jGrid || !jOv) return;
    [...jGrid.children].forEach((c, i)=> c.classList.toggle("current", i === (state.idx|0)));
    jOv.classList.add("show");
  }
  function closeJump(){ if(jOv) jOv.classList.remove("show"); }
  if($("skipBtn")) $("skipBtn").onclick = ()=>{ gotoPage((state.idx|0) + 1); };
  if($("jumpBtn")) $("jumpBtn").onclick = ()=>{ jOv.classList.contains("show") ? closeJump() : openJump(); };
  if($("jumpX")) $("jumpX").onclick = closeJump;
  if(jOv) jOv.onclick = (e)=>{ if(e.target === jOv) closeJump(); };
  if(new URLSearchParams(location.search).has("dev")){
    document.addEventListener("keydown", (e)=>{
      if(e.key === "j" || e.key === "J"){ jOv.classList.contains("show") ? closeJump() : openJump(); }
      else if(e.key === "Escape"){ closeJump(); }
      else if(e.key === "ArrowRight" || e.key === "PageDown"){ gotoPage((state.idx|0) + 1); }
      else if(e.key === "ArrowLeft"  || e.key === "PageUp"){ gotoPage((state.idx|0) - 1); }
    });
  }
  // [engine JS] r4 dev jump: ?slide=N skips the loader+gate and mounts slide N directly (QA/capture only)
  (function(){
    const j = parseInt(new URLSearchParams(location.search).get("slide"), 10);
    if(isNaN(j)) return;
    const bl = $("bootLoader"); if(bl) bl.remove();
    document.body.classList.add("loaded");
    $("startGate").classList.add("hidden");
    document.body.classList.remove("is-start");
    mountSlide(Math.max(0, Math.min(j, CARD.slides.length - 1)));
  })();
  // when the web font finishes loading, re-centre glyphs (metrics change vs fallback)
  if(document.fonts && document.fonts.ready){ document.fonts.ready.then(()=> centerAllGlyphs()); }
  // dev banner if ?dev=1 — show empty initially
  if(new URLSearchParams(location.search).has("dev")){
    $("devBanner").textContent = "engine ready · slides=" + CARD.slides.length;
    $("devBanner").className = "dev-banner show";
  }
}
boot();
;

/* ===== <script id="UIFIX-DEVGATE"> ===== */
(function(){
  /* Skip / Jump to page are DEV tools: visible only with ?dev=1. They stay parented to <body>
     (see TOTA-DEVNAV-FIX) so that when dev mode IS on they are clickable everywhere, including
     over the celebration screen. */
  if(new URLSearchParams(location.search).has("dev")) return;
  var hide=function(){ ["skipBtn","jumpBtn"].forEach(function(id){var e=document.getElementById(id); if(e) e.style.display="none";});
    document.querySelectorAll("#devNav,.devjump-btn,.skip-btn,.devjump-overlay").forEach(function(e){e.style.display="none";}); };
  if(document.readyState!=="loading") hide(); else document.addEventListener("DOMContentLoaded",hide);
  setTimeout(hide,500); setTimeout(hide,1500);
})();
;

/* ===== <script id="QA-SHOT"> ===== */
(function(){var q=new URLSearchParams(location.search);var n=q.get("shot");if(n===null)return;
setTimeout(function(){try{document.body.classList.remove("is-start");var sg=document.querySelector(".start-gate");sg&&sg.classList.add("hidden");
var pg=document.getElementById("phaseGate");if(pg){pg.classList.remove("show");pg.style.display="none";}
window.__pgWired=true; window.mountSlide(parseInt(n,10)||0);}catch(e){}},900);})();
;

/* ===== <script id="TOTA-END-REPARENT"> ===== */
(function(){
  function move(){
    var e = document.getElementById("endScreen");
    if(e && e.parentElement !== document.body) document.body.appendChild(e);
  }
  if(document.readyState !== "loading") move();
  else document.addEventListener("DOMContentLoaded", move);
  setTimeout(move, 300); setTimeout(move, 1200);
})();
;

/* ===== <script id="TOTA-DEVNAV-REPARENT"> ===== */
(function(){
  function move(){
    ["devNav","jumpOverlay"].forEach(function(id){
      var e=document.getElementById(id);
      if(e && e.parentElement !== document.body) document.body.appendChild(e);
    });
  }
  if(document.readyState!=="loading") move();
  else document.addEventListener("DOMContentLoaded", move);
  setTimeout(move,300); setTimeout(move,1200);
})();
;

/* ===== <script id="TOTA-FEEDBACK-JS"> ===== */
/* 2. the scene hotspots have no .crossed/.opt-redglow equivalent, so flash the tapped wrong
   region red for a few seconds here. */
(function(){
  document.addEventListener("click", function(ev){
    var t = ev.target && ev.target.closest ? ev.target.closest(".tis-hot") : null;
    if(!t || t.classList.contains("correct-hot")) return;
    t.classList.add("tis-wrong");
    setTimeout(function(){ t.classList.remove("tis-wrong"); }, 2000);
  }, true);
})();
;

/* ===== <script id="TOTA-WRONG-LOCKOUT"> ===== */
/* Belt and braces for the same rule: even if a module re-enables a card, a tap on anything
   marked out of play is swallowed at the capture phase before any handler sees it. */
(function(){
  var DEAD = ".opt-dim,.crossed,.tota-dim,.opt-redglow,.tota-hot-dim";
  document.addEventListener("click", function(ev){
    var t = ev.target && ev.target.closest ? ev.target.closest(".opt-cell,.tis-hot") : null;
    if(!t) return;
    if(t.matches(DEAD) || t.closest(DEAD)){
      ev.stopImmediatePropagation(); ev.preventDefault();
    }
  }, true);
})();
;

/* ===== <script id="TOTA-LANDING-REVEAL-WIRE"> ===== */
/* Fire the landing reveal the moment the boot loader begins to fade (it gets .done, then
   self-removes 440ms later). Independent watcher so the loader's own timing stays untouched. */
(function(){
  var fired = false;
  function go(){ if(fired) return; fired = true; document.body.classList.add("tota-landing-in"); }
  function wait(){
    var b = document.getElementById("bootLoader");
    if(!b || b.classList.contains("done")){ go(); return; }
    setTimeout(wait, 80);
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", wait);
  else wait();
  setTimeout(go, 8000);   // safety net: never leave the icons stuck invisible
})();
;

/* ===== <script id="FLN-ANIMATION-KIT-JS"> ===== */
/* ===== FLN ANIMATION KIT: nudge BEGIN ===== */
(function(){ "use strict";
  var M = window.FLNMotion;
  function place(el, o){
    var nh = document.getElementById(o.hand); if(!nh || !el) return;
    var host = document.querySelector(o.host); if(!host) return;
    var r = el.getBoundingClientRect(), sw = host.getBoundingClientRect(), s = M.scale();
    nh.style.left = ((r.left - sw.left)/s + r.width/s/2 + o.dx) + "px";
    nh.style.top  = ((r.top  - sw.top )/s + r.height/s   + o.dy) + "px";
    nh.classList.add("show");
  }
  M.nudge = {
    defaults:{ hand:"nudgeHand", host:".slide-stage", dx:-48, dy:-30, oneHand:true },
    pointAt: function(el, opts){
      var o = Object.assign({}, this.defaults, opts || {});
      M.guard(function(){
        if(M.still()) return;
        if(o.oneHand) document.querySelectorAll(".demo-hand").forEach(function(h){ h.remove(); });
        place(el, o);
      });
    },
    after: function(target, ms, opts){            // returns cancel()
      var o = Object.assign({}, this.defaults, opts || {}), t = null;
      M.guard(function(){
        if(!ms || M.still()) return;
        t = setTimeout(function(){
          var el = (typeof target === "string") ? document.querySelector(target) : target;
          if(el) place(el, o);
        }, ms);
      });
      return function(){ clearTimeout(t); };
    },
    hide: function(opts){
      var o = Object.assign({}, this.defaults, opts || {});
      var nh = document.getElementById(o.hand); if(nh) nh.classList.remove("show");
    }
  };
})();
/* ===== FLN ANIMATION KIT: nudge END ===== */
/* ===== FLN ANIMATION KIT: confetti BEGIN ===== */
(function(){ "use strict";
  var M = window.FLNMotion;
  function rnd(a, b){ return a + Math.random() * (b - a); }

  M.confetti = {
    defaults: {
      host:".stage-inner", count:80, stagger:0.35,
      fall:[1.1,1.8], drift:45, sway:[10,34], bob:[3,7],
      rockT:[0.6,1.2], tumbleT:[0.75,1.5], tumbleShare:0.22,
      amp:[28,52], yaw:30, depth:[0.75,1.15], tilt:25,
      /* weighted: star 40%, rectangle 20%, line 20%, square 20%.
         Repeat an entry to weight it - the array is sampled uniformly. */
      shapes:["st","st","st","st","rc","rc","ln","ln","sq","sq"],
      /* VIBGYOR. Front/back pairs - the back is the SAME hue darkened, never a
         different hue, or it reads as two pieces flickering instead of one turning. */
      colors:[["#8B2FC9","#5E1C8C"],   /* violet */
              ["#3F51B5","#27358A"],   /* indigo */
              ["#1E88E5","#135FA6"],   /* blue   */
              ["#22B24C","#157A34"],   /* green  */
              ["#FFD21E","#D9A800"],   /* yellow */
              ["#FF8A1E","#C75F00"],   /* orange */
              ["#E5322D","#A81F1B"]],  /* red    */
      phases:["guided","practice","mastery"]   /* [] disables phase gating */
    },
    burst: function(opts){
      var o = Object.assign({}, this.defaults, opts || {});
      M.guard(function(){
        if(M.still()) return;
        /* confetti ONLY on activity phases - never tutorials, demos, landing, transitions */
        if(o.phases.length && o.phase && o.phases.indexOf(o.phase) < 0) return;
        var host = document.querySelector(o.host); if(!host) return;

        var dist = host.clientHeight + 60, maxLife = 0;
        var wrap = document.createElement("div");
        wrap.className = "fx-confetti";

        for(var i = 0; i < o.count; i++){
          var z     = rnd(o.depth[0], o.depth[1]);        /* depth */
          var fall  = rnd(o.fall[0], o.fall[1]) / z;      /* nearer = bigger = faster */
          var delay = rnd(0, o.stagger);
          if(fall + delay > maxLife) maxLife = fall + delay;
          var pair = o.colors[i % o.colors.length];
          /* most pieces flutter (face stays visible); a minority go end-over-end */
          /* Two regimes, and a real plate moves DIFFERENTLY in each:
             flutter = zigzags hard, almost no net sideways drift;
             tumble  = autorotation gives a steady lateral force, so it barely
                       zigzags but drifts consistently to one side. */
          var flutter = Math.random() > o.tumbleShare;
          var rockT   = flutter ? rnd(o.rockT[0], o.rockT[1])
                                : rnd(o.tumbleT[0], o.tumbleT[1]);
          var sway    = flutter ? rnd(o.sway[0], o.sway[1]) : rnd(2, 8);
          var drift   = flutter ? rnd(-o.drift/2.5, o.drift/2.5) : rnd(-o.drift, o.drift);
          var bob     = flutter ? rnd(o.bob[0], o.bob[1]) : rnd(2, 4);

          /* set every property once - they inherit down to .w and .f */
          var p = document.createElement("i"); p.className = "p";
          p.style.cssText =
            "--x:"     + rnd(-2, 98).toFixed(1) + "%;" +
            "--dist:"  + dist + "px;" +
            "--fall:"  + fall.toFixed(2) + "s;" +
            "--delay:" + delay.toFixed(2) + "s;" +
            "--drift:" + drift.toFixed(0) + "px;" +
            "--sway:"  + sway.toFixed(0) + "px;" +
            "--bob:"   + bob.toFixed(1) + "px;" +
            "--rockT:" + rockT.toFixed(2) + "s;" +
            /* capped short of 90deg: even at max tilt the face still reads */
            "--amp:"   + Math.round(rnd(o.amp[0], o.amp[1])) + "deg;" +
            "--yaw:"   + Math.round(rnd(-o.yaw, o.yaw)) + "deg;" +
            "--tilt:"  + Math.round(rnd(-o.tilt, o.tilt)) + "deg;" +
            "--z:"     + z.toFixed(2) + ";" +
            "--dim:"   + (0.72 + (z - o.depth[0]) /
                          (o.depth[1] - o.depth[0]) * 0.28).toFixed(2) + ";" +
            /* shapes stay legible by ASPECT RATIO, not size - see the shape table */
            "--c:"     + pair[0] + ";--c2:" + pair[1] + ";";

          var w = document.createElement("i"); w.className = "w";
          var f = document.createElement("i");
          f.className = "f " + o.shapes[Math.floor(Math.random() * o.shapes.length)] +
                        (flutter ? "" : " tum");
          w.appendChild(f); p.appendChild(w); wrap.appendChild(p);
        }
        host.appendChild(wrap);
        /* lifetime is computed, not hard-coded - a longer fall cannot be cut off */
        setTimeout(function(){ wrap.remove(); }, (maxLife + 0.3) * 1000);
      });
    },
    /* stops a slide advancing mid-celebration. 8s safety cap. */
    after: function(fn){
      var started = Date.now();
      (function check(){
        if(!document.querySelector(".fx-confetti") || Date.now() - started > 8000){ fn(); return; }
        setTimeout(check, 200);
      })();
    }
  };
})();
/* ===== FLN ANIMATION KIT: confetti END ===== */
/* ===== FLN ANIMATION KIT: confetti-wire BEGIN ===== */
/* activity adaptation: the engine's six celebration sites call confettiCannon(), a global function
   declaration in the engine script. Re-point it at the kit burst; the current slide's phase gates it
   (guided / practice / mastery only, as the recipe requires). */
(function(){ "use strict";
  var M = window.FLNMotion;
  window.confettiCannon = function(){
    M.guard(function(){
      var sl = (typeof CARD !== "undefined" && typeof state !== "undefined" && CARD.slides) ? CARD.slides[state.idx] : null;
      M.confetti.burst({ phase: sl ? sl.phase : undefined });
    });
  };
})();
/* ===== FLN ANIMATION KIT: confetti-wire END ===== */
/* ===== FLN ANIMATION KIT: star-burst BEGIN ===== */
(function(){ "use strict";
  var M = window.FLNMotion;
  M.starBurst = {
    defaults:{ host:"#confetti", w:1333, h:750,
      colors:["#FFE400","#FFBD00","#E89400","#FFCA6C","#FDFFB8"],
      /* retuned: fewer, slower, longer. Travel distance is held at ~547px so the
         burst still fills the same area - only the density and pace changed. */
      ticks:150, decay:0.975, startV:14, shots:[0,220,440], spin:0.18,
      stars:32, starScale:1.8, circles:8, circleScale:1.0 },
    fire: function(opts){
      var o = Object.assign({}, this.defaults, opts || {});
      M.guard(function(){
        if(M.still()) return;
        var host = document.querySelector(o.host); if(!host) return;
        var cv = document.createElement("canvas");
        cv.width = o.w; cv.height = o.h;                 // design grid, scaled by CSS
        cv.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
        host.appendChild(cv);
        var ctx = cv.getContext("2d"), parts = [];

        function starPath(r){
          ctx.beginPath();
          for(var i = 0; i < 10; i++){
            var rad = (i % 2 === 0) ? r : r/2, a = Math.PI/5*i - Math.PI/2;
            ctx[i === 0 ? "moveTo" : "lineTo"](Math.cos(a)*rad, Math.sin(a)*rad);
          }
          ctx.closePath();
        }
        function add(n, scalar, shape){
          for(var i = 0; i < n; i++){
            var a = Math.random()*Math.PI*2;
            parts.push({ x:cv.width/2, y:cv.height/2, ax:Math.cos(a), ay:Math.sin(a),
              vel:o.startV*(0.5 + Math.random()), tick:0, scalar:scalar, shape:shape,
              color:o.colors[Math.floor(Math.random()*o.colors.length)],
              rot:Math.random()*Math.PI*2, spin:(Math.random()-.5)*o.spin });
          }
        }
        function shoot(){ add(o.stars, o.starScale, "star"); add(o.circles, o.circleScale, "circle"); }
        o.shots.forEach(function(ms){ ms ? setTimeout(shoot, ms) : shoot(); });

        /* derived from the LAST shot, so retiming the shots cannot end the loop
           before they have all fired. A hard-coded 30 breaks if shots move later. */
        var minFrames = Math.max.apply(null, o.shots) / 16 + 20;
        var frames = 0;
        (function frame(){
          ctx.clearRect(0, 0, cv.width, cv.height);
          var alive = false;
          for(var i = 0; i < parts.length; i++){
            var p = parts[i];
            if(p.tick >= o.ticks) continue;
            alive = true;
            p.x += p.ax*p.vel; p.y += p.ay*p.vel; p.vel *= o.decay;
            p.rot += p.spin; p.tick++;
            ctx.globalAlpha = 1 - p.tick/o.ticks;
            ctx.fillStyle = p.color;
            ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
            if(p.shape === "star"){ starPath(8*p.scalar); ctx.fill(); }
            else { ctx.beginPath(); ctx.arc(0, 0, 6*p.scalar, 0, Math.PI*2); ctx.fill(); }
            ctx.restore();
          }
          frames++;
          if(alive || frames < minFrames) requestAnimationFrame(frame);  // survive delayed shots
          else setTimeout(function(){ cv.remove(); }, 300);
        })();
      });
    }
  };
})();
/* ===== FLN ANIMATION KIT: star-burst END ===== */
/* ===== FLN ANIMATION KIT: star-burst-wire BEGIN ===== */
/* activity adaptation: the celebration slide calls starBurst(), a global function declaration in the
   engine script whose host (#confetti) and 1333x750 grid are the kit defaults. Re-point it at the
   kit's retuned burst; M.still() replaces its own no-anim check. */
(function(){ "use strict";
  var M = window.FLNMotion;
  window.starBurst = function(){ M.guard(function(){ M.starBurst.fire(); }); };
})();
/* ===== FLN ANIMATION KIT: star-burst-wire END ===== */
/* ===== FLN ANIMATION KIT: correct-select BEGIN ===== */
(function(){ "use strict";
  var M = window.FLNMotion;
  function rnd(a, b){ return a + Math.random() * (b - a); }
  function mk(cls){ var i = document.createElement("i"); i.className = cls; return i; }

  /* Every deferred step is parked ON THE TILE so clear() can cancel it. Without this
     a second play inherits the FIRST play's pending timers and they strip the state
     off the new beat part-way through. Owning the timers is what makes these safely
     re-fireable, which the 2-attempt ladder needs. */
  function later(el, fn, ms){ (el._selT = el._selT || []).push(setTimeout(fn, ms)); }

  /* Tempo lives in CSS (--fx-beat / --fx-reward) so the two effects cannot drift
     apart. JS reads it rather than keeping a second copy, and only writes --ckT or
     --wgT when a caller explicitly passes `dur`. Custom properties do not resolve
     calc(), so the two numbers are read and multiplied here rather than reading
     the composed value. */
  function tempo(el){
    var cs = getComputedStyle(el);
    function num(p, d){
      var v = parseFloat(cs.getPropertyValue(p));
      if(!v && v !== 0) return d;
      return v > 20 ? v / 1000 : v;              /* tolerate ms as well as s */
    }
    var beat = num("--fx-beat", 0.4);
    return { beat: beat, reward: beat * (parseFloat(cs.getPropertyValue("--fx-reward")) || 2) };
  }

  M.answer = {
    clear: function(el){
      if(!el) return;
      if(el._selT){ for(var j = 0; j < el._selT.length; j++) clearTimeout(el._selT[j]); }
      el._selT = [];
      el.classList.remove("ck-correct", "wg-wrong", "wg-out", "wg-rel");
      var fx = el.querySelectorAll(".ck-fx,.wg-fx");
      for(var i = 0; i < fx.length; i++) fx[i].remove();
    }
  };

  M.correctSelect = {
    defaults:{ crown:5 },      /* dur comes from CSS unless you pass one */
    play: function(el, opts){
      var o = Object.assign({}, this.defaults, opts || {});
      M.guard(function(){
        if(!el) return;
        M.answer.clear(el);
        void el.offsetWidth;                 /* forced reflow - restarts the pop */
        var dur = o.dur || tempo(el).reward;            /* CSS owns the tempo */
        if(o.dur) el.style.setProperty("--ckT", dur + "s");

        var fx = mk("ck-fx");

        if(o.crown && !M.still()){
          var cr = mk("ck-crown");
          /* clientWidth is layout px INSIDE the scaled stage - design px already.
             getBoundingClientRect() would come back multiplied by --scale (R1). */
          var w = el.clientWidth || 96, h = el.clientHeight || 96;
          var rx = w * 0.46, ry = h * 0.46;               /* the tile's own edge */
          for(var i = 0; i < o.crown; i++){
            var t  = (o.crown === 1) ? 0.5 : i / (o.crown - 1);
            var a  = (-158 + t * 136 + rnd(-7, 7)) * Math.PI / 180;   /* TOP arc */
            var x0 = Math.cos(a) * rx, y0 = Math.sin(a) * ry;
            var out = rnd(.20, .34);
            var s = mk("");
            s.style.cssText =
              "--ss:" + rnd(7, 12).toFixed(1) + "px;" +
              "--x0:" + x0.toFixed(1) + "px;" +
              "--y0:" + y0.toFixed(1) + "px;" +
              "--sx:" + (x0 + Math.cos(a) * w * out).toFixed(1) + "px;" +
              "--sy:" + (y0 + Math.sin(a) * h * out).toFixed(1) + "px;" +
              "--sr:" + Math.round(rnd(-140, 140)) + "deg;";
            cr.appendChild(s);
          }
          fx.appendChild(cr);
        }

        /* class FIRST: the border and the pop are the feedback, and they must not
           wait on ~9 nodes of decoration being built. Measured 45ms of dead time
           before any pixel moved when this ran the other way round. */
        el.classList.add("ck-correct");
        el.appendChild(fx);
        /* Only the TRANSIENT layers are swept. .ck-correct stays: the green outline
           is the correct-mark and it belongs to the tile until the slide advances. */
        later(el, function(){
          var t = fx.querySelectorAll(".ck-crown");
          for(var i = 0; i < t.length; i++) t[i].remove();
        }, dur * 1050);
      });
    }
  };
})();
/* ===== FLN ANIMATION KIT: correct-select END ===== */
/* ===== FLN ANIMATION KIT: wrong-select BEGIN ===== */
/* needs the `later`, `tempo` and `M.answer.clear` helpers from recipe 19 */
(function(){ "use strict";
  var M = window.FLNMotion;
  function mk(cls){ var i = document.createElement("i"); i.className = cls; return i; }
  function later(el, fn, ms){ (el._selT = el._selT || []).push(setTimeout(fn, ms)); }
  /* kit defect, fixed at install: tempo() is private to recipe 19's closure (the kit preview keeps
     both recipes in one scope). Copied verbatim from recipe 19 so this block can read the CSS tempo. */
  function tempo(el){
    var cs = getComputedStyle(el);
    function num(p, d){
      var v = parseFloat(cs.getPropertyValue(p));
      if(!v && v !== 0) return d;
      return v > 20 ? v / 1000 : v;              /* tolerate ms as well as s */
    }
    var beat = num("--fx-beat", 0.4);
    return { beat: beat, reward: beat * (parseFloat(cs.getPropertyValue("--fx-reward")) || 2) };
  }

  M.wrongSelect = {
    defaults:{},               /* dur comes from CSS unless you pass one */

    /* transient: shakes, holds red, then RELEASES */
    play: function(el, opts){
      var o = Object.assign({}, this.defaults, opts || {});
      M.guard(function(){
        if(!el) return;
        M.answer.clear(el);
        void el.offsetWidth;
        var dur = o.dur || tempo(el).beat;              /* CSS owns the tempo */
        if(o.dur) el.style.setProperty("--wgT", dur + "s");
        el.classList.add("wg-wrong");          /* class first - see recipe 19 */
        var fx = mk("wg-fx"); fx.appendChild(mk("wg-pulse"));
        el.appendChild(fx);
        /* RELEASE on a timeout, never on animationend: under the reduced-motion kill
           switch animationend never fires and the tile would stay red forever - on
           exactly the devices least able to recover from it. (R5, second half.)
           .wg-rel goes on BEFORE .wg-wrong comes off so the border has something to
           transition with. */
        later(el, function(){
          el.classList.add("wg-rel");
          el.classList.remove("wg-wrong");
          var f = el.querySelector(".wg-fx"); if(f) f.remove();
          later(el, function(){
            el.classList.remove("wg-rel");
            if(o.then) o.then();
          }, 260);
        }, dur * 1500 + 40);
      });
    },

    /* elimination: shakes once, recedes, and STAYS recessed. No auto-clear. */
    out: function(el, opts){
      var o = Object.assign({}, this.defaults, opts || {});
      M.guard(function(){
        if(!el) return;
        M.answer.clear(el);
        void el.offsetWidth;
        var dur = o.dur || tempo(el).beat;
        if(o.dur) el.style.setProperty("--wgT", dur + "s");
        el.classList.add("wg-out");
        var fx = mk("wg-fx"); fx.appendChild(mk("wg-pulse"));
        el.appendChild(fx);
      });
    }
  };
})();
/* ===== FLN ANIMATION KIT: wrong-select END ===== */
/* ===== FLN ANIMATION KIT: sky-drift BEGIN ===== */
(function(){ "use strict";
  var M = window.FLNMotion;

  function build(o){
    var sky = typeof o.container === "string" ? document.querySelector(o.container) : o.container;
    if(!sky) return null;
    sky.textContent = "";
    var maxSize = 0, frag = document.createDocumentFragment();

    o.layers.forEach(function(L, li){
      for(var i = 0; i < o.lanes; i++){
        var a = ((360 / o.lanes) * i + L.rot) * Math.PI / 180;
        var cos = Math.cos(a), sin = Math.sin(a);
        var size = +((o.size[0] + Math.random() * (o.size[1] - o.size[0])) * L.scale).toFixed(2);
        if(size > maxSize) maxSize = size;
        var dur = +(o.dur[0] + Math.random() * (o.dur[1] - o.dur[0])).toFixed(1);
        var el = document.createElement("i");
        el.className = o.shapes[(i + li) % o.shapes.length];
        el.style.cssText =
          "--s:"  + size + "vmax;" +
          "--x1:" + (o.r0 * cos).toFixed(2) + "vmax;--y1:" + (o.r0 * sin).toFixed(2) + "vmax;" +
          "--x2:" + (o.r1 * cos).toFixed(2) + "vmax;--y2:" + (o.r1 * sin).toFixed(2) + "vmax;" +
          "--t:"  + dur + "s;" +
          "--d:-" + (Math.random() * dur).toFixed(1) + "s;" +     // negative = de-sync
          "--g:"  + (o.glow[0] + Math.random() * (o.glow[1] - o.glow[0])).toFixed(1) + "s;" +
          "--gd:-" + (Math.random() * 4).toFixed(1) + "s;" +
          "--o:"  + (o.opacity[0] + Math.random() * (o.opacity[1] - o.opacity[0])).toFixed(2) + ";";
        frag.appendChild(el);
      }
    });
    sky.appendChild(frag);

    // collision proof: lane arc at the tightest radius must be >= 1.5x the largest element
    var arc = (2 * Math.PI * o.r0) / o.lanes, ok = arc >= maxSize * 1.5;
    if(!ok && o.warn !== false){
      console.warn("[animation-kit] sky lanes too tight: arc " + arc.toFixed(2) +
        "vmax vs element " + maxSize.toFixed(2) + "vmax. Reduce lanes or size.");
    }
    return { arc:arc, maxSize:maxSize, safe:ok, count:sky.children.length };
  }

  M.sky = {
    defaults: {
      container:".sg-sky", lanes:29,
      layers:[{rot:0,scale:1},{rot:6.2,scale:0.62},{rot:-6.2,scale:0.55}],
      r0:22, r1:72, size:[0.8,2.6], dur:[18,34], glow:[3.0,4.8],
      opacity:[0.62,0.92], shapes:["s1","s2","s3","s4","s5"], warn:true
    },
    init: function(opts){
      var o = Object.assign({}, this.defaults, opts || {}), res = null;
      M.guard(function(){ res = build(o); });
      return res;
    }
  };
  M.ready(function(){ M.guard(function(){ if(!window.__skyManual) M.sky.init(); }); });
})();
/* ===== FLN ANIMATION KIT: sky-drift END ===== */
/* ===== FLN ANIMATION KIT: sky-burst BEGIN ===== */
(function(){ "use strict";
  var M = window.FLNMotion;

  function boom(o){                      // sine thud + noise tail + square crackles
    var actx = M.audio(); if(!actx) return;
    try{
      var t = actx.currentTime, out = actx.createGain();
      out.gain.value = o.volume; out.connect(actx.destination);

      var tg = actx.createGain();
      tg.gain.setValueAtTime(0.9, t);
      tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      tg.connect(out);
      var osc = actx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(420, t);
      osc.frequency.exponentialRampToValueAtTime(90, t + 0.16);
      osc.connect(tg); osc.start(t); osc.stop(t + 0.18);

      var n = actx.sampleRate * 0.45;
      var buf = actx.createBuffer(1, n, actx.sampleRate), d = buf.getChannelData(0);
      for(var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.6);
      var src = actx.createBufferSource(); src.buffer = buf;

      for(var c = 0; c < o.crackles; c++){
        var cg = actx.createGain(), ct = t + 0.10 + Math.random() * 0.30;
        cg.gain.setValueAtTime(0.0001, ct);
        cg.gain.exponentialRampToValueAtTime(0.18, ct + 0.006);
        cg.gain.exponentialRampToValueAtTime(0.0001, ct + 0.07);
        cg.connect(out);
        var co = actx.createOscillator();
        co.type = "square";
        co.frequency.setValueAtTime(1500 + Math.random() * 2200, ct);
        co.connect(cg); co.start(ct); co.stop(ct + 0.08);
      }
      var bp = actx.createBiquadFilter();
      bp.type = "bandpass"; bp.frequency.value = 3400; bp.Q.value = 0.8;
      var ng = actx.createGain();
      ng.gain.setValueAtTime(0.0001, t);
      ng.gain.exponentialRampToValueAtTime(0.5, t + 0.03);
      ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      src.connect(bp); bp.connect(ng); ng.connect(out); src.start(t + 0.02);
    }catch(_){}
  }

  function pop(el, r, o){
    el.classList.add("popped");
    // respawn on the next FLIGHT lap - the glow cycle is much shorter, so filter by name
    el.addEventListener("animationiteration", function back(e){
      if(e.animationName !== "sgFly") return;
      el.classList.remove("popped");
      el.removeEventListener("animationiteration", back);
    });

    var kind = "k-dot", cls = el.classList;
    for(var ci = 0; ci < cls.length; ci++){ if(o.kind[cls[ci]]) kind = o.kind[cls[ci]]; }

    var bs = Math.max(11, r.width);
    var b = document.createElement("div");
    b.className = "sg-burst " + kind;
    b.style.left = (r.left + r.width / 2) + "px";
    b.style.top  = (r.top  + r.height / 2) + "px";
    b.style.setProperty("--bs", bs + "px");
    b.appendChild(document.createElement("div")).className = "fl";

    var k = 0;
    for(var g = 0; g < o.rings.length; g++){
      var R = o.rings[g], off = Math.random() * Math.PI * 2;
      for(var i = 0; i < R.n; i++, k++){
        var a = off + i / R.n * Math.PI * 2;
        var dist = bs * R.rad * (0.78 + Math.random() * 0.44);
        var p = document.createElement("i");
        p.style.cssText =
          "--ps:"  + (bs * R.size * (0.8 + Math.random() * 0.5)).toFixed(1) + "px;" +
          "--dx:"  + (Math.cos(a) * dist).toFixed(1) + "px;" +
          "--dy:"  + (Math.sin(a) * dist).toFixed(1) + "px;" +
          "--gy:"  + (dist * o.gravity).toFixed(1) + "px;" +
          "--sd:"  + (R.dur + Math.random() * 0.22).toFixed(2) + "s;" +
          "--sdl:" + (Math.random() * 0.06).toFixed(3) + "s;" +
          "color:" + o.hues[k % o.hues.length];
        b.appendChild(p);
      }
    }
    document.body.appendChild(b);
    if(o.sound) boom(o);
    setTimeout(function(){ b.remove(); }, o.life);
  }

  M.skyBurst = {
    defaults: {
      container:".sg-sky", when:["is-start","is-end"],
      rings:[{n:9,rad:3.1,size:.58,dur:.80},{n:7,rad:1.8,size:.78,dur:.62}],
      hues:["#FCB717","#3B7DD8","#21A74A","#E5484D","#7048D6","#F1781D"],
      kind:{s1:"k-star",s2:"k-star",s3:"k-spark",s4:"k-dot",s5:"k-dot"},
      gravity:0.42, pad:12, padRatio:0.7, minAlpha:0.08, life:1200,
      sound:true, volume:0.22, crackles:4
    },
    init: function(opts){
      var o = Object.assign({}, this.defaults, opts || {});
      M.guard(function(){
        var sky = typeof o.container === "string"
          ? document.querySelector(o.container) : o.container;
        if(!sky) return;
        // capture phase: .sg-sky is pointer-events:none, so hit-test by rect (R6)
        document.addEventListener("pointerdown", function(e){
          if(M.still()) return;
          if(!o.when.some(function(c){ return document.body.classList.contains(c); })) return;
          var els = sky.querySelectorAll("i:not(.popped)");
          for(var i = 0; i < els.length; i++){
            var el = els[i], r = el.getBoundingClientRect();
            if(r.width < 2) continue;
            var pad = Math.max(o.pad, r.width * o.padRatio);   // ~4px targets need slack
            if(e.clientX < r.left - pad || e.clientX > r.right  + pad ||
               e.clientY < r.top  - pad || e.clientY > r.bottom + pad) continue;
            if(parseFloat(getComputedStyle(el).opacity) < o.minAlpha) continue;
            // claim the tap, or it also fires the button under the star
            e.stopPropagation(); e.preventDefault();
            pop(el, r, o);
            return;
          }
        }, true);
      });
    }
  };
  M.ready(function(){ M.guard(function(){ M.skyBurst.init(); }); });
})();
/* ===== FLN ANIMATION KIT: sky-burst END ===== */
;

/* ===== L02-QUIET-AFTER-NAV-JS =====
   story pages (STORY_READ_PAGE): once आगे has lit up, no repeating animation is left on the page — the engine's आगे hand
   nudge (armed 4.5 s after आगे appears) is suppressed there, as on the reference story pages. Every other page keeps
   its nudge. */
(function(){
  var orig = window.nudgeNavBtn; if(typeof orig !== "function") return;
  window.nudgeNavBtn = function(){
    var s = (typeof CARD !== "undefined" && typeof state !== "undefined" && CARD.slides) ? CARD.slides[state.idx] : null;
    if(s && s.type === "STORY_READ_PAGE") return;
    return orig.apply(this, arguments);
  };
})();

/* ===== L02-STORY-FIG-JS =====
   pages 2-10 (STORY_READ_PAGE) carry .l02-story on the stage (the module adds it at mount — CSS [L02-STORY-FIG]); every other
   slide drops it, hands the header mascot tap back (the story pages use it to repeat the narration) and restores the fleet's
   आगे label behind the arrow art. */
(function(){
  var orig = window.mountSlide; if(typeof orig !== "function") return;
  window.mountSlide = function(idx){
    var r = orig.apply(this, arguments);
    var s = (typeof CARD !== "undefined" && CARD.slides) ? CARD.slides[idx] : null, story = !!(s && s.type === "STORY_READ_PAGE");
    var st = document.getElementById("stage"); if(st) st.classList.toggle("l02-story", story);
    if(!story){
      var mw = document.getElementById("mascotWrap"); if(mw) mw.onclick = null;
      var nb = document.getElementById("navBtn"); if(nb) nb.textContent = "आगे";
    }
    return r;
  };
})();

/* ===== L02-STD-SFX-JS ===== (2026-10-05, user request: "I have added a Standard SFX folder — apply all these sound effects wherever
   they can be applied and replace the existing sound effect with these where one already exists.") The five standard sounds
   (assets/Audio/sfx_confetti / sfx_correct_feedback / sfx_incorrect_feedback / sfx_next_button / sfx_play_button, cut by build.py from
   the user's folder) and where they sound:
     correct feedback   every correct answer — the engine's sfxCorrect() is the standard clip now (engine patch, build.py): the find pages'
                        hit, the question pages' right pill (G3 / I3 / M1 / M2: after the picture's own scene sound), the engine's other
                        correct branches. The synthesized rising arpeggio is gone.
     incorrect feedback every wrong answer — sfxWrongSoft() likewise (a decoy on the find pages, a wrong pill, a wrong drop). The soft
                        two-note buzz is gone.
     confetti           whenever confetti falls — confettiCannon() (every correct answer's burst, the kit's burst on a flagged slide) plays
                        it 250 ms after the correct chime so the two read as "ding, then the burst"; the celebration page's star burst
                        plays it instead of the engine's sfx_celebrate (engine patch).
     next button        every tap on an ACTIVE आगे / आगे बढ़ें pill (the story pages, the phase pages, any page that shows it) and on the
                        celebration page's finish pill.
     play button        the landing's शुरू करें tap.
   The lesson's own scene sounds stay (the story pops, the question pages' picture sounds, the car's motor, the checkpoint chime, the
   music bed): none of them is a feedback / button sound. stdSfx(id): its own Audio element at full volume (the clips are levelled to
   the lesson's SFX standard by the build), fire-and-forget, ducking the music like every sound. */
(function(){
  var ext = (typeof CARD !== "undefined" && CARD.assets && CARD.assets.audio_ext) || "ogg";
  window.stdSfx = function(id){ if(!id) return; try{ var a = new Audio("assets/Audio/" + id + "." + ext); a.volume = 1; a.play().catch(function(){}); }catch(e){} };
  // the confetti's sound, on every burst
  var origConfetti = window.confettiCannon;
  if(typeof origConfetti === "function") window.confettiCannon = function(){ setTimeout(function(){ stdSfx("sfx_confetti"); }, 250); return origConfetti.apply(this, arguments); };
  // the buttons (listeners alongside the engine's own handlers; capture phase, so a tap sounds before the page changes under it)
  function wire(){
    var nb = document.getElementById("navBtn");
    if(nb) nb.addEventListener("click", function(){ if(!nb.disabled && nb.classList.contains("active")) stdSfx("sfx_next_button"); }, true);
    var eb = document.getElementById("endBtn");
    if(eb) eb.addEventListener("click", function(){ stdSfx("sfx_next_button"); }, true);
    var sb = document.getElementById("sgBtn");
    if(sb) sb.addEventListener("click", function(){ stdSfx("sfx_play_button"); }, true);
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", wire); else wire();
})();

/* ===== L02-STD-GATE-JS ===== (2026-10-05, user request: the transition screens' bird is the standard Swiftee transition animation,
   and the pink line appears only when the bird starts moving its beak — build.py [L02-STD-GATE], engine patch 3j)
   The animation (CARD.gate.anim, an animated WebP) is fetched ONCE, at boot, and kept as a Blob; every gate gets a fresh object URL of
   it, so the browser decodes a new image and its animation starts from the first frame — no refetch (the reference restarted its loop
   with a cache-busting query, a download per gate), and the engine times the line against this image's load, which is the animation's
   first frame. If the fetch has not finished when the first gate opens, the gate waits for it; if it failed, the file itself with a
   cache-buster, as before. */
(function(){
  var SRC = (typeof CARD !== "undefined" && CARD.gate && CARD.gate.anim) || "assets/UI/gate_swiftee.webp", blob = null, url = null, failed = false;
  var pre = (typeof fetch === "function") ? fetch(SRC).then(function(r){ if(!r.ok) throw new Error(r.status); return r.blob(); }).then(function(b){ blob = b; }).catch(function(){ failed = true; }) : Promise.resolve(failed = true);
  function hand(img, res){
    var done = false, fin = function(){ if(done) return; done = true; res(); };
    if(url){ try{ URL.revokeObjectURL(url); }catch(e){} url = null; }
    img.onload = fin; img.onerror = fin;
    if(blob){ url = URL.createObjectURL(blob); img.src = url; } else { img.src = SRC + "?r=" + Date.now(); }
    setTimeout(fin, 1500);                                           // never leave a gate waiting on a load that does not fire
  }
  window.l02GateBird = { src: SRC, start: function(img){ return new Promise(function(res){ if(!img){ res(); return; } if(blob || failed) hand(img, res); else pre.then(function(){ hand(img, res); }); }); } };
})();

/* ===== L02-I1-CONFETTI-JS =====
   card slide.confetti: the kit's confetti burst fires on this slide whatever its phase. The kit's confetti-wire gates the
   burst to guided / practice / mastery (its recipe), so I1 — an independent-phase question — got the green mark, the ding
   and the praise line but no confetti; the user wants the same confetti there (2026-09-28). Only a flagged slide skips the
   gate (burst({phases: []}) — the kit's own "[] disables phase gating"); every other slide goes through the kit as before. */
(function(){
  var orig = window.confettiCannon; if(typeof orig !== "function" || !window.FLNMotion || !FLNMotion.confetti) return;
  window.confettiCannon = function(){
    var s = (typeof CARD !== "undefined" && typeof state !== "undefined" && CARD.slides) ? CARD.slides[state.idx] : null;
    if(s && s.confetti === true){ FLNMotion.confetti.burst({ phases: [] }); return; }
    return orig.apply(this, arguments);
  };
})();

/* ===== L02-FIND-FIG-JS =====
   "page 11" (the "find Madhav in the picture" page, G2 — card slide.find_fig; the first guided page now that G1 is gone) is
   laid out from Figma "FLN by MJ" node 110-2 (CSS [L02-FIND-FIG], stage class .l02-find): the header speaker chip is off, so
   the mascot tap replays the question exactly as the chip did (state.replayAudio, else the slide's VO chain). The page moves on
   by itself after the "correct" line, as the engine's TAP_IN_SCENE always did; [L02-FIND-NO-NEXT] (user, 2026-10-03) there is NO
   आगे बढ़ें on this page any more — the engine hides the pill at mount and nothing shows it again (until then the pill was shown
   in its disabled look and lit on the correct tap). The guard on completeSlide (below) still makes sure the page is left exactly
   once (the module's own delayed call is also fenced to its slide by build.py). The wrong-tap lines escalate (card
   data.hint_seq, engine patch [L02-FIND-HINTS] in build.py): the engine finds the answer's outline by its data-hot index. */
(function(){
  var orig = window.mountSlide; if(typeof orig !== "function") return;
  function applyFind(idx){
    var s = (typeof CARD !== "undefined" && CARD.slides) ? CARD.slides[idx] : null, find = !!(s && s.find_fig === true);
    var st = document.getElementById("stage"); if(st) st.classList.toggle("l02-find", find);
    if(!find) return;
    s._l02Left = false;
    var mw = document.getElementById("mascotWrap");
    if(mw) mw.onclick = function(){ if(typeof isPlaying !== "undefined" && isPlaying) return;
      state.audioReplays++;
      SwiftPAL.emit("audio_replay", { slide_id: s.id, phase: s.phase, count: state.audioReplays, src: "mascot" });
      if(state.replayAudio) state.replayAudio(); else autoPlayChain(s); };
    // [L02-FIND-HOTS] the shaped outlines (card data.shapes: the two silhouettes and the ball's circle, in the picture's own
    // pixel space) drawn in an SVG over the picture. Each outline is the tap target for one of the engine's rectangular
    // hotspots (data-hot = its index): a tap is forwarded to that rectangle, so the engine's own logic runs unchanged
    // (confetti + advance on the answer, shake + try-again line on a decoy, the "no taps while a clip sounds" lock — the CSS
    // gives the outlines the same lock); the rectangle's resulting classes are mirrored onto the outline (hit → green,
    // shake → red for 1 s, then white again — [L02-FIND-RED-1S] below), and a decoy wiggles once on EVERY tap of it. A tap on
    // the picture outside the outlines still reaches the frame, as a tap outside the rectangles did.
    var d = s.data || {}, frame = document.querySelector("#slideHost .tis-frame");
    var hots = frame ? [].slice.call(frame.querySelectorAll(".tis-hot")) : [];
    if(frame && d.shapes && d.shapes.length && hots.length && !frame.querySelector(".l02-shapes")){
      var NS = "http://www.w3.org/2000/svg", vb = d.shape_view || [1671, 941];
      var svg = document.createElementNS(NS, "svg"); svg.setAttribute("class", "l02-shapes");
      svg.setAttribute("viewBox", "0 0 " + vb[0] + " " + vb[1]); svg.setAttribute("preserveAspectRatio", "none"); svg.setAttribute("aria-hidden", "true");
      d.shapes.forEach(function(sh){
        var hot = hots[sh.hot]; if(!hot) return;
        var path = document.createElementNS(NS, "path"); path.setAttribute("d", sh.d); path.setAttribute("class", "l02-shape");
        path.setAttribute("data-hot", String(sh.hot));   // [L02-FIND-HINTS] the engine points its nudge hand at the answer's outline
        var mirror = function(){
          path.classList.toggle("hit", hot.classList.contains("hit"));
          path.classList.toggle("wrong", hot.classList.contains("shake")); };
        new MutationObserver(mirror).observe(hot, { attributes: true, attributeFilter: ["class"] });
        path.addEventListener("click", function(e){
          e.stopPropagation();
          if(CARD.slides[state.idx] !== s || frame.querySelector(".tis-hot.hit")) return;
          hot.click();
          if(!hot.classList.contains("correct-hot")){
            path.classList.remove("l02-wiggle"); void path.getBoundingClientRect(); path.classList.add("l02-wiggle");
            // [L02-FIND-RED-1S] the red is a 1 s flash, not a state (user, 2026-09-28): the engine leaves .shake on a missed
            // rectangle for good (the outline mirrored it as a red that stayed), so it is taken off 1 s after the tap and the
            // mirror puts the outline back to its white stroke; a fresh tap inside that second restarts the second.
            clearTimeout(hot._l02RedT); hot._l02RedT = setTimeout(function(){ hot.classList.remove("shake"); }, 1000);
          } });
        path.addEventListener("animationend", function(e){ if(e.animationName === "l02Wiggle") path.classList.remove("l02-wiggle"); });
        svg.appendChild(path); });
      frame.appendChild(svg);
    }
  }
  // [L02-Q3-FIG] G3, the guided story question, laid out from Figma "FLN by MJ" node 113-198 (CSS [L02-Q3-FIG], stage class
  // .l02-q3, card slide.fig_q3): the header speaker chip is off, so the mascot tap replays the question exactly as the chip
  // did; a sentence that wraps in the design gets its Figma text-box width from the option's label_w (the engine shuffles
  // the cards, so the width is looked up by the sentence, not by the position). Everything else — the tap, the feedback
  // lines, the reveal, the advance — is the engine's, untouched.
  // [L02-I1-REF] card slide.mascot_replay: a page whose header chip is off (I1, laid out like the reference lesson's G2 with
  // hide_header_chip) keeps a way to hear the question again — the mascot tap replays it, exactly as the chip did.
  function applyQ3(idx){
    var s = (typeof CARD !== "undefined" && CARD.slides) ? CARD.slides[idx] : null, q3 = !!(s && s.fig_q3 === true);
    var st = document.getElementById("stage"); if(st){ st.classList.toggle("l02-q3", q3); st.classList.toggle("l02-q3-yellow", q3 && s.fig_q3_yellow === true);   // [L02-P1-FIG] the yellow cards
      st.classList.toggle("l02-q3-contain", q3 && s.fig_q3_contain === true); }                                                                                       // [L02-BED-JOURNEY] cut-out icons shown whole
    if(!s || !(q3 || s.mascot_replay === true)) return;
    var mw = document.getElementById("mascotWrap");
    if(mw) mw.onclick = function(){ if(typeof isPlaying !== "undefined" && isPlaying) return;
      state.audioReplays++;
      SwiftPAL.emit("audio_replay", { slide_id: s.id, phase: s.phase, count: state.audioReplays, src: "mascot" });
      if(state.replayAudio) state.replayAudio(); else autoPlayChain(s); };
    if(!q3) return;
    var fs = 1333 / 1280, opts = (s.data && s.data.options) || [];
    document.querySelectorAll("#slideHost .opt-cell .story-q-opt-label").forEach(function(lb){
      var o = opts.filter(function(x){ return x.label_hi === lb.textContent; })[0];
      if(o && o.label_w) lb.style.width = (o.label_w * fs) + "px";
    });
  }
  // [L02-BED-FIG] I2 ("page 13", the independent find page — card slide.bed_fig) laid out from Figma "FLN by MJ" node 145-439
  // (CSS [L02-BED-FIG], stage class .l02-bed): Madhav's room with a striped path from the sleepy boy at the bottom left to his bed
  // at the top right. The engine's TAP_IN_SCENE runs the page as before — one (invisible) hotspot, the bed; a tap anywhere else is
  // its gentle try-again — with two additions: the Figma layer over the picture (the dashed guide, the four "?" tokens, the yawning
  // boy, the plant) and the walk: the tap on the bed is held back (a capturing listener on the hotspot stops the engine's own
  // handler), Madhav walks the guide's centre line (card data.walk, Figma px of the box's padding box; data.walk_s seconds, constant
  // speed, mirrored while he moves left) and, when he reaches the bed, the very same tap is handed to the engine — its "correct"
  // line, the mascot's smile, the advance (fenced to this slide by build.py). The आगे बढ़ें pill is shown disabled from the start and
  // lights when he arrives; a tap on it moves on at once (the completeSlide guard below makes sure the page is left exactly once).
  // The blurred room behind the whole artboard is the stage's first child while this page is up. No taps during the walk (CSS).
  // The board was ONE journey over five legs (I2, WALK2, P2, WALK4, WALK5 — a question page between each two; [L02-BED-JOURNEY] in
  // build.py). Since 2026-10-04 NO board page is left in the card (I2 became a card question [L02-I2-FIG]; WALK2 [L02-NO-WALK2] and then
  // P2 / WALK4 / WALK5 [L02-NO-BOARD] were removed by the user), so this code is dormant — kept for a page that sets slide.bed_fig
  // again: card data.bed carries each page's leg — Madhav's spot (boy), where the leg ends (boy_to: his spot before the next
  // checkpoint, or the bed), the leg's polyline (walk, Figma px of the box's padding box), its seconds (walk_s), which way he faces
  // at first (face), the checkpoints already showing the small Madhav (done) and the one he passes on this leg (flips: token +
  // distance). The room backdrop (card slide.room_bg) is shared with the card questions between the legs.
  // [L02-BED-STEPS] a leg may carry a footsteps clip (data.bed.sfx — page 13's leg only): its own Audio element (like the engine's pops),
  // buffered at mount, started with the walk, looped should the walk outlast it, faded out over 0.2 s as he arrives. A leg may end ON a
  // checkpoint (page 13: the first one's centre): that one (data.bed.reach) stops pulsing under him and keeps its "?"; the next board
  // page opens with it still resting under him (data.bed.rest — no pulse, no tap target) and flips it to the small Madhav as he steps
  // off (that leg's first flip). Whatever else a leg flips is flipped at the latest on arrival.
  // [L02-BED-AUTO] page 13 (data.bed.auto) is watched, not played: the picture takes no taps, Madhav walks by himself after the band's
  // line, the checkpoint reached lights the आगे बढ़ें pill (chime, confetti, the mascot's smile — no "correct" line, nothing was tapped)
  // and the page waits for the pill's tap; the other board pages keep the tap-to-walk and their advance after the correct line.
  var BED_IMGS = ["bed_room", "bed_bg", "bed_q", "bed_done", "bed_plant", "bed_boy", "p1_rona", "p1_utha"];
  function bedEl(tag, cls){ var e = document.createElement(tag); e.className = cls; return e; }
  function bedImg(cls, src){ var i = bedEl("img", cls); i.src = src; i.alt = ""; i.draggable = false; return i; }
  function applyRoomBg(idx){
    var s = (typeof CARD !== "undefined" && CARD.slides) ? CARD.slides[idx] : null, on = !!(s && s.room_bg === true);
    var st = document.getElementById("stage"); if(!st) return;
    st.classList.toggle("l02-roombg", on);
    var bg = st.querySelector(".l02-bed-bg");
    if(!on){ if(bg) bg.remove(); return; }
    if(!bg) st.insertBefore(bedImg("l02-bed-bg", "assets/Images/bed_bg.webp"), st.firstChild);
  }
  // [L02-I3-BG] (2026-10-05, user request) a page backdrop from a picture of the user's: card slide.page_bg = <image id> (registered in
  // CARD.assets.image) → stage class .l02-pagebg and the picture as the stage's first child (.l02-page-bg, CSS: the whole stage, cover),
  // under everything the page draws; the layout does not move. Page 14 (I3) carries it ("i3_floor"). Removed again on any other page.
  function applyPageBg(idx){
    var s = (typeof CARD !== "undefined" && CARD.slides) ? CARD.slides[idx] : null, id = (s && typeof s.page_bg === "string" && s.page_bg) || "";
    var st = document.getElementById("stage"); if(!st) return;
    st.classList.toggle("l02-pagebg", !!id);
    var bg = st.querySelector(".l02-page-bg");
    if(!id){ if(bg) bg.remove(); return; }
    var src = (CARD.assets && CARD.assets.image && CARD.assets.image[id]) || ("assets/Images/" + id + ".webp");
    if(!bg){ bg = bedImg("l02-page-bg", src); st.insertBefore(bg, st.firstChild); }
    else if(bg.getAttribute("src") !== src) bg.src = src;
  }
  // [L02-RC-FIG] (2026-10-05, user request) the RC-car screen before page 14 (card slide.rc_fig, stage class .l02-rc; Figma 264-664 →
  // 267-858): the engine's TAP_IN_SCENE mounts the page (its picture = the room-and-path picture in the Figma box, CSS), and this layer
  // adds the four "?" checkpoints (each "?" bobs gently all the while, CSS [L02-RC-MOTION]), the boy with his remote (the user's GIF,
  // mirrored as in the Figma) over his soft shadow, the title picture at the top of the stage and the RC car. Nothing is tapped:
  // data.rc.start_ms after the page opens the car drives along data.rc.leg.pts (Figma box coords of the car's CENTRE: the carpet's traced
  // centre line, build.py / rc_path_trace.py) to the first checkpoint over leg.s seconds, pulling away and braking smoothly (ease-in-out),
  // its motor sound (data.rc.sfx, own Audio element, looped, faded in over 250 ms and out over the last 400 ms) running with it —
  // or, where the card says data.rc.motor = "speed" (RC1, [L02-RC1-SMOOTH]), its volume and pitch following the car's speed instead.
  // [L02-RC-MOTION] The car's ANGLE follows the line's heading (damped over ~110 ms) and its VIEW follows the angle: data.rc.car.views
  // lists the renders by the screen heading each one shows ({src, deg}: the side view at 0°, the front three-quarter view at 42°); every
  // frame the two renders bracketing the heading are cross-faded (over the 30..70% stretch of the gap between them) and each is turned by
  // (heading − its deg), so the body always points along the carpet and the car looks round the bend as it comes down. On arrival the
  // checkpoint's "?" goes (the Figma 267-858 state: the car sits in the ring, at the carpet's heading there) and after data.rc.hold_ms the
  // page moves on by itself (completeSlide(true), once). A dev jump away mid-drive stops the sound quietly.
  // [L02-RC2] The same page serves every leg: data.rc.placed lists the checkpoints already won ({token, image, animate}: the token shows
  // that question's picture in its circle instead of the "?" — Figma 267-1053; with animate the picture is placed data.rc.place_ms after
  // the page opens, popping in under a short glow, CSS .placing, with data.rc.place_sfx — the user's level-up chime — started in the same
  // tick so its attack lands on the pop), data.rc.car.box is where the car stands as the page opens, data.rc.reach
  // the checkpoint this leg ends on. A view may carry its own `to` / `from` headings: the cross-fade to the next view runs from this
  // view's `to` to the next one's `from` (default: 30% / 70% of the gap between their degs).
  function applyRC(idx){
    var s = (typeof CARD !== "undefined" && CARD.slides) ? CARD.slides[idx] : null, on = !!(s && s.rc_fig === true);
    var st = document.getElementById("stage"); if(!st) return;
    st.classList.toggle("l02-rc", on);
    var title = st.querySelector(".l02-rc-title");
    if(!on){ if(title) title.remove(); return; }
    var R = (s.data && s.data.rc) || {}, fs = 1333 / 1280, B = 4, px = function(v){ return (v * fs).toFixed(3) + "px"; };
    var frame = document.querySelector("#slideHost .tis-frame");
    if(!frame || frame.querySelector(".l02-rc-layer")) return;
    if(!title){ title = bedImg("l02-rc-title", R.title || "assets/Images/rc_title.webp"); st.appendChild(title); }
    var layer = bedEl("div", "l02-rc-layer");
    var imgSrc = function(id){ return (id.indexOf("/") >= 0) ? id : ((CARD.assets && CARD.assets.image && CARD.assets.image[id]) || ("assets/Images/" + id + ".webp")); };
    var tokens = (R.tokens || []).map(function(t){
      var tok = bedEl("div", "l02-rc-token"); tok.style.left = px(t[0] - B); tok.style.top = px(t[1] - B);
      tok.appendChild(bedEl("i", "l02-rc-ring")); tok.appendChild(bedImg("l02-rc-q", R.q || "assets/Images/rc_q.webp"));
      layer.appendChild(tok); return tok; });
    var placing = [];
    (R.placed || []).forEach(function(pl){                                   // [L02-RC2] the checkpoints already won show their picture
      var tok = tokens[pl.token]; if(!tok) return;
      tok.appendChild(bedImg("l02-rc-done", imgSrc(pl.image)));
      if(pl.animate) placing.push(tok); else tok.classList.add("placed");
    });
    if(R.shadow){ var sh = bedImg("l02-rc-shadow", R.shadow_src || "assets/Images/rc_shadow.svg");   // the 58x12 ellipse sits at the centre of its 118x72 blurred SVG
      sh.style.left = px(R.shadow[0] + R.shadow[2] / 2 - 59 - B); sh.style.top = px(R.shadow[1] + R.shadow[3] / 2 - 36 - B); layer.appendChild(sh); }
    if(R.boy){ var boy = bedImg("l02-rc-boy", R.boy_src || "assets/Images/rc_boy.webp"); boy.style.left = px(R.boy[0] - B); boy.style.top = px(R.boy[1] - B);
      // [L02-RC1-FIG-2] (2026-10-10) the box's own width / height when the card gives them (RC1's frame 338-3 draws the boy at 90.3x167.5; the CSS 76x142 stays the default)
      if(R.boy.length >= 4 && (R.boy[2] !== 76 || R.boy[3] !== 142)){ boy.style.width = px(R.boy[2]); boy.style.height = px(R.boy[3]); }
      if(R.boy_flip === false) boy.style.transform = "none";                  // [L02-RC2-FIG-2] (2026-10-10) frame 338-2198 has the boy facing right as drawn (the CSS mirrors him by default)
      layer.appendChild(boy); }
    var noCar = (R.car === null);                                           // [L02-RC5-FINALE] (2026-10-10) data.rc.car = null: a page without the car (the finale after M2) — no car element, no leg, no motor
    var C = R.car || {}, size = C.size || 54.404, c0 = C.box || [64, 230.6], rot0 = (typeof C.rot === "number") ? C.rot : -5.3;
    // [L02-RC-MOTION] one <img> per view, stacked in the car's slot, sorted by the heading each one shows
    var views = (C.views && C.views.length) ? C.views.slice().sort(function(a, b){ return a.deg - b.deg; }) : [{ src: C.src || "rc_car", deg: 0 }];
    var car = bedEl("div", "l02-rc-car");
    car.style.left = px(c0[0] - B); car.style.top = px(c0[1] - B);
    var imgs = noCar ? [] : views.map(function(v){ var im = bedImg("", imgSrc(v.src)); car.appendChild(im); return im; });
    // [L02-RC1-FIG-2] (2026-10-10) a card-given size other than the Figma's 54.404 box scales the slot and its renders with it (the
    // 2.202 inset and the 50 px picture keep their proportion); RC1's frame 338-3 shows the car at 70.6 px (box 76.82). The CSS keeps
    // the default for the other pages.
    if(Math.abs(size - 54.404) > 0.01){
      car.style.width = px(size); car.style.height = px(size);
      imgs.forEach(function(im){ im.style.left = px(size * 2.202 / 54.404); im.style.top = px(size * 2.202 / 54.404); im.style.width = px(size * 50 / 54.404); im.style.height = px(size * 50 / 54.404); });
    }
    function pose(heading){
      // the two renders bracketing the heading cross-fade between the lower one's `to` and the upper one's `from` (default: the 30..70%
      // stretch of the gap between their degs); each is turned to the heading
      var n = views.length, lo = 0; if(noCar) return;
      while(lo < n - 2 && heading > views[lo + 1].deg) lo++;
      var a = views[lo], b = views[Math.min(n - 1, lo + 1)], w = 0;
      if(n > 1 && b.deg > a.deg){
        var h0 = (typeof a.to === "number") ? a.to : a.deg + 0.3 * (b.deg - a.deg), h1 = (typeof b.from === "number") ? b.from : a.deg + 0.7 * (b.deg - a.deg);
        var q = Math.min(1, Math.max(0, (heading - h0) / Math.max(0.001, h1 - h0))); w = q * q * (3 - 2 * q); }
      for(var i = 0; i < n; i++){
        var op = (i === lo) ? 1 - w : (i === lo + 1) ? w : 0;
        imgs[i].style.opacity = op.toFixed(3); imgs[i].style.visibility = op > 0.002 ? "" : "hidden";
        imgs[i].style.transform = "rotate(" + (heading - views[i].deg).toFixed(2) + "deg)";
      }
    }
    pose(rot0);
    if(!noCar) layer.appendChild(car); frame.appendChild(layer);
    // the leg: the car's centre starts at the box's centre and lands exactly on the last point; the speed eases in and out over leg.s
    var pts = (R.leg && R.leg.pts) || [], cum = [0], L = 0;
    for(var i = 1; i < pts.length; i++){ L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); cum.push(L); }
    function at(d){ var i = 1; while(i < cum.length - 1 && cum[i] < d) i++;
      var a = pts[i - 1], b = pts[i], seg = cum[i] - cum[i - 1], t = seg ? Math.min(1, Math.max(0, (d - cum[i - 1]) / seg)) : 0;
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }
    function ease(k){ return 0.5 - 0.5 * Math.cos(Math.PI * k); }          // pulls away and brakes smoothly
    var cx0 = c0[0] + size / 2, cy0 = c0[1] + size / 2, dur = ((R.leg && R.leg.s) || 2.6) * 1000;
    var motor = null; if(R.sfx){ try{ motor = new Audio("assets/Audio/" + R.sfx + "." + ((CARD.assets && CARD.assets.audio_ext) || "ogg")); motor.preload = "auto"; motor.loop = true;
      if(R.motor === "speed"){ motor.preservesPitch = false; motor.mozPreservesPitch = false; motor.webkitPreservesPitch = false; }   // [L02-RC1-SMOOTH] its pitch may follow the speed
    }catch(e){ motor = null; } }
    function stopMotor(){ var a = motor; if(!a) return; motor = null; try{ a.pause(); }catch(e){} }
    var started = false, done = false;
    function leave(){ if(done) return; done = true; if(CARD.slides[state.idx] !== s) return; if(typeof completeSlide === "function") completeSlide(true); }
    function drive(){
      if(started || CARD.slides[state.idx] !== s) return; started = true;
      if(pts.length < 2){ setTimeout(leave, R.hold_ms || 1000); return; }
      if(motor){ try{ motor.volume = 0; motor.currentTime = 0; motor.play().catch(function(){}); }catch(e){} }
      var t0 = null, tPrev = null, rot = rot0;
      function tick(now){
        if(CARD.slides[state.idx] !== s){ stopMotor(); return; }   // the page was left mid-drive (dev jump)
        if(t0 === null){ t0 = now; tPrev = now; }
        var dt = Math.min(100, now - tPrev); tPrev = now;
        var el = now - t0, k = Math.min(1, el / dur), d = ease(k) * L, p = at(d), a = at(Math.max(0, d - 5)), b = at(Math.min(L, d + 5));
        var heading = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
        rot += (heading - rot) * (1 - Math.exp(-dt / 110));                   // the body turns into the heading, damped (frame-rate independent)
        car.style.transform = "translate(" + ((p[0] - cx0) * fs).toFixed(2) + "px," + ((p[1] - cy0) * fs).toFixed(2) + "px)";
        pose(rot);
        if(motor){ try{
          if(R.motor === "speed"){                                              // [L02-RC1-SMOOTH] (2026-10-10) the motor follows the car's SPEED (data.rc.motor = "speed", RC1 only):
            var sp = Math.sin(Math.PI * k);                                     // idling as it pulls away, full at mid-leg, falling as it brakes, out as it stops — and a little higher-pitched the faster it goes
            motor.volume = Math.min(1, el / 120) * (0.22 + 0.78 * sp) * Math.min(1, (1 - k) / 0.04);
            motor.playbackRate = 0.9 + 0.18 * sp;
          } else motor.volume = Math.min(1, el / 250) * Math.min(1, Math.max(0, (dur - el) / 400));   // in over 250 ms, out over the last 400 ms as it brakes
        }catch(e){} }
        if(k < 1){ requestAnimationFrame(tick); return; }
        stopMotor();
        if(typeof R.reach === "number" && tokens[R.reach]) tokens[R.reach].classList.add("reached");
        setTimeout(leave, R.hold_ms || 1000);                                 // the page stays on the parked car, then moves on
      }
      requestAnimationFrame(tick);
    }
    if(placing.length) setTimeout(function(){ if(CARD.slides[state.idx] !== s) return;   // [L02-RC2] the won picture pops into its checkpoint under a glow, with the chime
      if(R.place_sfx){ try{ var chime = new Audio("assets/Audio/" + R.place_sfx + "." + ((CARD.assets && CARD.assets.audio_ext) || "ogg")); chime.play().catch(function(){}); }catch(e){} }
      placing.forEach(function(tok){ tok.classList.add("placed", "placing"); }); }, (typeof R.place_ms === "number") ? R.place_ms : 500);
    // [L02-VO-BATCH] data.rc.intro (RC1 only): the screen's opening line "अब आप बताइए कि माधव की कहानी में क्या-क्या हुआ?" speaks first,
    // through the engine's play() (so it is the page's current line: the music ducks under it, a page change stops it); the car sets off
    // data.rc.start_ms after the line has ended. A short beat after the page opens, as the music and the picture settle.
    if(R.intro && typeof play === "function"){
      var introSrc = (CARD.assets && CARD.assets.audio && CARD.assets.audio[R.intro]) || ("assets/Audio/" + R.intro + "." + ((CARD.assets && CARD.assets.audio_ext) || "ogg"));
      setTimeout(function(){ if(CARD.slides[state.idx] !== s) return; play(introSrc, function(){ setTimeout(drive, R.start_ms || 600); }); }, 300);
    } else if(!noCar) setTimeout(drive, R.start_ms || 600);
    // [L02-RC5-FINALE] (2026-10-10, user request) the finale page after M2 (Figma 339-3089, no car): the last checkpoint's picture is
    // placed as above (place_ms / place_sfx), then data.rc.finale pops the checkpoints one after another in token order (CSS .pop, from
    // at_ms every gap_ms) — each pop with the lesson's correct-answer ding (sfx: "correct" → the engine's sfxCorrect) and, on the pops
    // listed in `confetti`, the engine's correct-answer confetti burst (confettiCannon; its wrapper adds the confetti whoosh). The page
    // leaves at data.rc.end_ms (completeSlide(true) → the celebration; the engine waits for the confetti to land first). A dev jump away
    // cancels everything still pending (the slide check in each timer).
    if(R.finale){ var Fn = R.finale, tAt = (typeof Fn.at_ms === "number") ? Fn.at_ms : 1800, gap = (typeof Fn.gap_ms === "number") ? Fn.gap_ms : 400, conf = Fn.confetti || [];
      tokens.forEach(function(tok, i){ setTimeout(function(){ if(CARD.slides[state.idx] !== s) return;
        tok.classList.add("pop");
        if(Fn.sfx === "correct" && typeof sfxCorrect === "function"){ try{ sfxCorrect(); }catch(e){} }
        if(conf.indexOf(i) >= 0 && typeof confettiCannon === "function"){ try{ confettiCannon(); }catch(e){} }
      }, tAt + i * gap); }); }
    if(typeof R.end_ms === "number") setTimeout(leave, R.end_ms);
  }
  function applyBed(idx){
    var s = (typeof CARD !== "undefined" && CARD.slides) ? CARD.slides[idx] : null, bed = !!(s && s.bed_fig === true);
    var st = document.getElementById("stage"); if(st) st.classList.toggle("l02-bed", bed);
    if(!bed) return;
    var B = (s.data && s.data.bed) || {}, fs = 1333 / 1280, px = function(v){ return (v * fs).toFixed(3) + "px"; };
    s._l02Left = false;
    var nb = document.getElementById("navBtn"); if(nb){ nb.style.display = ""; nb.textContent = "आगे बढ़ें"; }
    var mw = document.getElementById("mascotWrap");
    if(mw) mw.onclick = function(){ if(typeof isPlaying !== "undefined" && isPlaying) return;
      state.audioReplays++;
      SwiftPAL.emit("audio_replay", { slide_id: s.id, phase: s.phase, count: state.audioReplays, src: "mascot" });
      if(state.replayAudio) state.replayAudio(); else autoPlayChain(s); };
    // [L02-BED-JOURNEY] the tap targets are the bed AND every remaining "?" checkpoint (all of them "correct" hotspots of the engine — a
    // forgiving board: any pulsing "?" means "walk on"); the first tap on any of them starts the leg, and that very hotspot gets the tap
    // back when Madhav arrives, so the engine's TAP_IN_SCENE runs its own correct flow
    var frame = document.querySelector("#slideHost .tis-frame"), hots = frame ? [].slice.call(frame.querySelectorAll(".tis-hot.correct-hot")) : [];
    if(!frame || !hots.length || frame.querySelector(".l02-bed-layer")) return;
    var layer = bedEl("div", "l02-bed-layer"), G = B.guide || {};
    var guide = bedImg("l02-bed-guide", G.src || "assets/Images/bed_guide_13.svg");
    guide.style.left = px(G.x || 151.53); guide.style.top = px(G.y || 124); guide.style.width = px(G.w || 627.97); guide.style.height = px(G.h || 260);
    layer.appendChild(guide);
    var tokens = ["t1", "t2", "t3", "t4"].map(function(t, i){
      var tok = bedEl("div", "l02-bed-token " + t + ((B.done || []).indexOf(i) >= 0 ? " done" : "") + ((B.rest || []).indexOf(i) >= 0 ? " reached" : ""));
      tok.appendChild(bedEl("i", "l02-bed-ring"));
      tok.appendChild(bedImg("l02-bed-q", "assets/Images/bed_q.webp")); tok.appendChild(bedImg("l02-bed-done", "assets/Images/bed_done.webp"));
      layer.appendChild(tok); return tok; });
    var boy = bedImg("l02-bed-boy", "assets/Images/bed_boy.webp"), from = B.boy || [182, 268], face = B.face || 1;
    boy.style.left = px(from[0]); boy.style.top = px(from[1]); boy.style.transform = "scaleX(" + face + ")";
    layer.appendChild(boy);
    var patch = bedEl("div", "l02-bed-patch"); patch.appendChild(document.createElement("i")); layer.appendChild(patch);
    layer.appendChild(bedImg("l02-bed-plant", "assets/Images/bed_plant.webp"));
    frame.appendChild(layer);
    // the leg: cumulative lengths for a constant-speed walk; he starts exactly at his Figma spot and lands exactly on boy_to (the
    // small difference between the route's ends and the designer's two spots is spread evenly over the leg)
    var pts = B.walk || [], cum = [0], L = 0;
    for(var i = 1; i < pts.length; i++){ L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); cum.push(L); }
    function at(d){ var i = 1; while(i < cum.length - 1 && cum[i] < d) i++;
      var a = pts[i - 1], b = pts[i], seg = cum[i] - cum[i - 1], t = seg ? Math.min(1, Math.max(0, (d - cum[i - 1]) / seg)) : 0;
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }
    var to = B.boy_to || from, last = pts.length ? pts[pts.length - 1] : from;
    var resid = pts.length ? [to[0] - (from[0] + last[0] - pts[0][0]), to[1] - (from[1] + last[1] - pts[0][1])] : [0, 0];
    var flips = (B.flips || []).map(function(f){ return { token: f.token, at: f.at, done: false }; });
    var walking = false, arrived = false;
    // [L02-BED-STEPS] the leg's footsteps, if it has any: buffered now so they start with the first stride
    var stepsSrc = B.sfx ? "assets/Audio/" + B.sfx + "." + ((CARD.assets && CARD.assets.audio_ext) || "ogg") : null, steps = null;
    if(stepsSrc){ try{ steps = new Audio(stepsSrc); steps.preload = "auto"; steps.loop = true; }catch(err){ steps = null; } }
    function stopSteps(fade){ var a = steps; if(!a) return; steps = null;
      if(!fade){ try{ a.pause(); }catch(err){} return; }
      var v0 = a.volume, t1 = null;
      requestAnimationFrame(function ease(now){ if(t1 === null) t1 = now; var q = Math.min(1, (now - t1) / 200); a.volume = v0 * (1 - q);
        if(q < 1) requestAnimationFrame(ease); else { try{ a.pause(); }catch(err){} } }); }
    function startWalk(onArrive){
      if(walking || arrived || CARD.slides[state.idx] !== s) return;
      if(pts.length < 2){ arrived = true; onArrive(); return; }
      walking = true; frame.classList.add("l02-walking");
      if(steps){ try{ steps.currentTime = 0; steps.play().catch(function(){}); }catch(err){} }
      var dur = (B.walk_s || 4.3) * 1000, t0 = null, lastX = pts[0][0];
      function tick(now){
        if(CARD.slides[state.idx] !== s){ stopSteps(false); return; }   // the page was left mid-walk (dev jump): stop quietly
        if(t0 === null) t0 = now;
        var k = Math.min(1, (now - t0) / dur), d = k * L, p = at(d);
        if(p[0] < lastX - 0.3) face = -1; else if(p[0] > lastX + 0.3) face = 1;
        lastX = p[0];
        var dx = (p[0] - pts[0][0]) + resid[0] * k, dy = (p[1] - pts[0][1]) + resid[1] * k;
        boy.style.transform = "translate(" + (dx * fs).toFixed(2) + "px," + (dy * fs).toFixed(2) + "px) scaleX(" + face + ")";
        flips.forEach(function(f){ if(!f.done && (d >= f.at || k >= 1) && tokens[f.token]){ f.done = true; tokens[f.token].classList.add("done"); } });
        if(k < 1){ requestAnimationFrame(tick); return; }
        walking = false; arrived = true; frame.classList.remove("l02-walking"); stopSteps(true);
        if(typeof B.reach === "number" && tokens[B.reach]) tokens[B.reach].classList.add("reached");   // he stands on it: its "?" rests
        if(typeof setNavActive === "function") setNavActive(true);   // the pill lights (the engine's own pill handler: completeSlide)
        onArrive();
      }
      requestAnimationFrame(tick);
    }
    if(B.auto === true){
      // [L02-BED-AUTO] page 13: nobody taps the picture (CSS .l02-auto) — Madhav sets off by himself data.bed.auto_ms after the page
      // opens (build.py: the band's line and a beat; not the engine's isPlaying flag, which the engine's double play() at mount clears
      // early), later if a replay of the line is still sounding (10 s more at the very most); reaching the checkpoint brings the chime,
      // the confetti and the mascot's smile and lights the pill — then the page waits for the pill's tap (the engine's completeSlide,
      // guarded below)
      frame.classList.add("l02-auto");
      var mounted = performance.now(), after = B.auto_ms || 4600;
      (function waitLine(){
        if(CARD.slides[state.idx] !== s) return;
        var el = performance.now() - mounted, quiet = !(typeof isPlaying !== "undefined" && isPlaying);
        if((el >= after && quiet) || el >= after + 10000){
          startWalk(function(){
            try{ if(typeof sfxCorrect === "function") sfxCorrect(); if(typeof confettiCannon === "function") confettiCannon();
                 if(typeof setSwMood === "function") setSwMood("happy"); }catch(err){} });
          return; }
        setTimeout(waitLine, 100);
      })();
      return;
    }
    hots.forEach(function(hot){ hot.addEventListener("click", function(e){
      if(arrived) return;                                   // the walk is over: this is the tap handed to the engine
      e.stopImmediatePropagation();                         // hold the engine's own handler back
      startWalk(function(){ hot.click(); });                // then the engine: the "correct" line, the mascot's smile, the advance
    }, true); });
  }
  // the pages' pictures are fetched once at boot (the lesson reaches them a dozen pages in), so nothing pops in late at mount
  if(typeof CARD !== "undefined" && CARD.slides && CARD.slides.some(function(x){ return x.bed_fig === true; }))
    BED_IMGS.map(function(k){ return "assets/Images/" + k + ".webp"; }).concat(["assets/Images/bed_guide_13.svg", "assets/Images/bed_guide_14.svg", "assets/Images/bed_guide_16.svg"])
      .forEach(function(src){ var im = new Image(); im.src = src; });
  window.mountSlide = function(idx){ var r = orig.apply(this, arguments); applyRoomBg(idx); applyPageBg(idx); applyFind(idx); applyQ3(idx); applyBed(idx); applyRC(idx); return r; };
  // the ?slide=N dev jump (QA/capture) mounts its slide while the engine block is still being evaluated, i.e. before this
  // hook exists — so a find page (or the Figma question page) that is already on the stage gets its layout here, once, at load
  if(typeof state !== "undefined" && typeof state.idx === "number" && document.querySelector("#slideHost .tis-scene")){ applyRoomBg(state.idx); applyFind(state.idx); applyBed(state.idx); applyRC(state.idx); }
  if(typeof state !== "undefined" && typeof state.idx === "number" && document.querySelector("#slideHost .opt-grid")){ applyRoomBg(state.idx); applyQ3(state.idx); }
  if(typeof state !== "undefined" && typeof state.idx === "number") applyPageBg(state.idx);   // [L02-I3-BG] a ?slide=N dev load of any page type (a no-op for a page without page_bg, so safe at boot too)
  var origDone = window.completeSlide; if(typeof origDone !== "function") return;
  window.completeSlide = function(){
    var s = (typeof CARD !== "undefined" && CARD.slides && typeof state !== "undefined") ? CARD.slides[state.idx] : null;
    if(s && (s.find_fig === true || s.bed_fig === true)){ if(s._l02Left) return; s._l02Left = true; }
    return origDone.apply(this, arguments);
  };
})();

/* ===== L02-CEL-MTG204 =====
   [L02-CEL-MTG204] (2026-10-10, user request) the celebration page's Swiftie and line = the reference MTG2A04_L01_S01's
   (github.com/CodeWithPiyush0/MTG204_L01_S01, its page JS "CELEBRATION SWIFTIE, round 2l-2r"), see build.py. Its code, adapted to this
   engine: play() is this engine's <audio> player and there is no _voiceClock (the typeof check falls back to isPlaying's first true as
   the clip's clock); audioFor / isPlaying / state.ownsAudio / SlideModules.CELEBRATION are the same here. The timeline: she jumps
   (the शाबाश sheet, frames 0-29 at 45 ms) and lands (30-35) in silence but for the celebration sfx the module plays at mount, THEN the
   line starts and the whole of it lip-syncs on the talk sheet (card.end_anim.bits: one char per 25 ms, 1 = mouth open), then the idle
   sheet's mouth-shut frames loop. The arrow waits greyed (cel-wait) until the line has ended, then pulses (cel-ready). */
(function(){
  /* round 2p (user): "once the VO finishes, the button is enabled and pulses" — on the celebration too.
     The engine shows its arrow at once; here it waits (dim, not pressable) until the celebration
     line has ended, then it pulses like the in-lesson arrow (no glow, no border change). */
  function celArrowAfterVO(){
    const eb = document.getElementById("endBtn"); if(!eb) return;
    eb.classList.remove("hint-glow"); eb.classList.add("cel-wait");
    const t0 = performance.now(); let heard = false;
    (function tick(){
      if(!eb.isConnected) return;
      if(isPlaying) heard = true;
      if((heard && !isPlaying) || performance.now() - t0 > 15000){
        eb.classList.remove("cel-wait"); eb.classList.add("cel-ready"); return; }
      requestAnimationFrame(tick);
    })();
  }
  setTimeout(()=> (function wrapCel(tries){
    const C = (typeof SlideModules !== "undefined") && SlideModules.CELEBRATION;
    if(!C || !C.mount){ if(tries < 200) setTimeout(()=> wrapCel(tries + 1), 25); return; }
    if(C.__celWrapped) return; C.__celWrapped = true;
    const _mount = C.mount;
    C.mount = function(host, slide){
      const r = _mount.apply(this, arguments);
      try { celArrowAfterVO(); } catch(e){}
      try { runCelSprite(slide); } catch(e){}
      return r;
    };
  })(0), 0);
  let _celGen = 0;
  /* round 2m — THREE SHEETS, ONE CLOCK (timeline re-ordered in round 2r — see inside: jump first, then
     the line). While she talks the clock is the celebration VO itself, from the moment it is sounding:
     the cursor walks the talk sheet forward (so the body keeps moving naturally) but only ever lands on
     a frame whose mouth matches the VO at that instant — open on each syllable, shut in every dip.
     All three sheets share frame size and alignment (make_cel_sprite.py), so switching never jumps. */
  function runCelSprite(slide){
    const A = CARD && CARD.end_anim;
    const im = document.querySelector("#endScreen .end-mascot");
    if(!A || !im || !A.bits || !A.shabaash) return;
    const gen = ++_celGen;
    let sp = document.getElementById("celSprite");
    if(!sp){
      sp = document.createElement("div"); sp.id = "celSprite"; sp.className = "cel-sprite";
      sp.innerHTML = '<div class="cel-art"></div>';
      im.parentNode.insertBefore(sp, im);
    }
    im.style.display = "none";
    const art = sp.querySelector(".cel-art");
    /* paint the talk + idle sheets once, invisibly, while the screen opens — so the browser decodes and
       uploads them now, not at the शाबाश -> talk switch (measured: a 130-180 ms stall there) */
    [A.talk, A.idle].forEach(sh => {
      const pp = document.createElement("div"); pp.className = "cel-art cel-prepaint";
      pp.style.aspectRatio = A.fw + " / " + A.fh; pp.style.backgroundImage = 'url("' + sh.src + '")';
      sp.appendChild(pp);
      requestAnimationFrame(()=> requestAnimationFrame(()=> setTimeout(()=> pp.remove(), 120)));
    });
    art.style.aspectRatio = A.fw + " / " + A.fh;
    let curSrc = "";
    const show = (sheet, i)=>{
      if(sheet.src !== curSrc){ art.style.backgroundImage = 'url("' + sheet.src + '")'; curSrc = sheet.src; }
      const c = i % A.cols, r = Math.floor(i / A.cols);
      art.style.backgroundPosition = (c * 100 / (A.cols - 1)) + "% " + (r * 100 / (A.cols - 1)) + "%";
      sp.dataset.sheet = sheet === A.shabaash ? "shabaash" : (sheet === A.idle ? "idle" : "talk");
      sp.dataset.f = i;
    };
    const S = A.shabaash, T = A.talk, I = A.idle;
    const OPEN = new Set(T.open);
    const bits = A.bits || "";
    const step = A.step_ms || 25;
    const loud = (t)=> bits.charAt(Math.floor(t / step)) === "1";
    const lenMs = bits.length * step;
    /* round 2r (user + reference HI02H11 r106): SHE JUMPS AND CELEBRATES FIRST, THEN SPEAKS. The line
       («बहुत बढ़िया, दोस्त! तुमने कमाल कर दिया!») has no «शाबाश» to hang the jump on, so the page owns
       the audio (ownsAudio: the engine's auto-play is skipped) and runs:
         jump     «शाबाश» sheet 0-29 at 45 ms/frame (1.35 s) — silent but for the engine's celebration sfx
         landing  «शाबाश» sheet 30-35 (mouth shut, 0.27 s)
         the VO   starts here; the WHOLE line lip-syncs on the talk sheet (the clip speaks from 0 ms)
         after    idle sheet, mouth-shut frames only, looping */
    const JUMP = S.pre.concat(S.word), LAND = S.post, FMS = 45;
    const src = (typeof audioFor === "function") ? audioFor(slide, "prompt") : null;
    if(!src) return;                                   /* no clip: let the engine's own auto-play run */
    state.ownsAudio = true;
    show(S, JUMP[0]);
    let m0 = 0, lastF = 0, smooth = 0, vclock = null;
    let phase = "jump", tj = 0, t0 = 0, waitStart = 0, done = false, cursor = 0, curOpen = null, lastStep = 0;
    const idle = ()=>{
      let j = 0;
      (function tick(){
        if(gen !== _celGen || !sp.isConnected) return;
        show(I, I.loop[j % I.loop.length]); j++;
        setTimeout(tick, 110);
      })();
    };
    (function frame(){
      if(gen !== _celGen || !sp.isConnected || done) return;
      if(CARD.slides[state.idx] !== slide){ done = true; return; }
      const now = performance.now();
      /* the jump's clock starts once the screen's opening work has settled — three smooth paints in a
         row (sunburst, stars, sfx and the sheets' first decode stall the first ~0.2-0.5 s; a jump timed
         from the mount skipped half its frames). Capped at 0.7 s, so she never stands still longer. */
      if(!tj){
        if(!m0){ m0 = now; lastF = now; }
        smooth = (now - lastF < 40) ? smooth + 1 : 0; lastF = now;
        if(smooth >= 3 || now - m0 > 700) tj = now;
        else { requestAnimationFrame(frame); return; }
      }
      if(phase === "jump" || phase === "land"){
        const list = phase === "jump" ? JUMP : LAND, k = Math.floor((now - tj) / FMS);
        if(k < list.length){ show(S, list[k]); requestAnimationFrame(frame); return; }
        if(phase === "jump"){ phase = "land"; tj = now; show(S, LAND[0]); requestAnimationFrame(frame); return; }
        phase = "wait"; waitStart = now;
        play(src, ()=>{});                             /* the line starts as she lands */
        /* the clip's OWN clock where the engine offers one (the reference's _voiceClock); here isPlaying's first true */
        vclock = (typeof _voiceClock === "function") ? _voiceClock() : null;
      }
      if(phase === "wait"){
        if(isPlaying){ phase = "talk"; t0 = now; }
        else if(now - waitStart > 1800){ done = true; idle(); return; }     /* the VO never started */
        else { requestAnimationFrame(frame); return; }
      }
      const vt = vclock ? vclock().t : null;
      const t = vt != null ? vt : now - t0;
      if(!isPlaying || t > lenMs + 400){ done = true; idle(); return; }
      const want = loud(t + 16);                       /* one paint ahead: the frame shows on the NEXT paint */
      /* step the talk sheet forward: at once when the mouth must change, else every 80 ms */
      if(want !== curOpen || now - lastStep > 80){
        let k = 1;
        while(k < 36 && OPEN.has((cursor + k) % 36) !== want) k++;
        cursor = (cursor + k) % 36;
        show(T, cursor); curOpen = want; lastStep = now;
      }
      sp.dataset.t = Math.round(t); sp.dataset.w = want ? 1 : 0;   /* the sprite's own clock + choice (tests) */
      requestAnimationFrame(frame);
    })();
  }
  /* warm the sheets during the lesson, so the end screen never opens on an empty box */
  setTimeout(()=>{ try { const A = CARD && CARD.end_anim; if(A && A.shabaash){
    window.__celWarm = [A.shabaash.src, A.talk.src, A.idle.src].map(u => { const i = new Image(); i.src = u; if(i.decode) i.decode().catch(()=>{}); return i; }); } } catch(e){} }, 1500);
})();

/* ===== L02-SPK-CHIP =====
   [L02-SPK-CHIP] (2026-10-10) the landing speaker's OFF state, as the reference hindi-game-gender-identify.vercel.app runs it ("the
   speaker button remains disabled when the VO is spoken; once the VO is complete it is enabled again"): #sgVo carries .sg-vo-off (grey,
   half-transparent, no taps - CSS) from the first frame until the welcome line has ended, and again whenever a line is sounding (the
   engine's setPlaying toggles .playing on it; this mirrors that into .sg-vo-off). The tap itself is the engine's: it replays the
   welcome (playLanding). The title-bar chip needs no script: its .playing state is styled directly. */
(function(){
  var v = document.getElementById("sgVo"); if(!v) return;
  var heard = false;
  var sync = function(){
    var on = v.classList.contains("playing"); if(on) heard = true;
    var off = on || !heard;
    if(v.classList.contains("sg-vo-off") !== off){ v.classList.toggle("sg-vo-off", off); v.setAttribute("aria-disabled", String(off)); }
  };
  sync();
  new MutationObserver(sync).observe(v, { attributes: true, attributeFilter: ["class"] });
})();

/* ===== L02-SPK-CHIP (taps) =====
   [L02-SPK-CHIP] (2026-10-10) the two replay taps, as the reference: a tap on an idle speaker plays the instruction again.
   TITLE BAR: the engine's chip handler (state.replayAudio, else the slide's VO chain) already does that on the question, find and
   sentence pages. On the STORY pages the module uses state.replayAudio for the caption's microphone (the read-aloud beat), so the
   title-bar chip is routed to the module's state.replayInstruction instead (story_read_page.js: the narration, else the cue line).
   LANDING: the engine's #sgVo handler only starts the FIRST welcome (playLanding is once-only); the welcome's REPLAY lives on the
   bird's tap (replayWelcome: once the first welcome is done, never over the bird's own cue). The chip's tap now runs both: the
   engine's handler (a no-op after the first welcome) and the bird's click (a no-op before it), so exactly one of them speaks. */
(function(){
  function wireHeaderChip(idx){
    var s = (typeof CARD !== "undefined" && CARD.slides) ? CARD.slides[idx] : null, chip = document.getElementById("audioChip");
    if(!s || !chip || s.type !== "STORY_READ_PAGE") return;
    chip.onclick = function(){
      state.audioReplays++;
      SwiftPAL.emit("audio_replay", { slide_id: s.id, phase: s.phase, count: state.audioReplays, src: "header_chip" });
      if(typeof state.replayInstruction === "function") state.replayInstruction();
    };
  }
  var _ms = window.mountSlide;
  window.mountSlide = function(idx){ if(typeof state !== "undefined") state.replayInstruction = null; var r = _ms.apply(this, arguments); wireHeaderChip(idx); return r; };
  if(typeof state !== "undefined" && typeof state.idx === "number" && document.querySelector("#slideHost .story-frame")) wireHeaderChip(state.idx);   // a ?slide=N dev load mounted before this ran
  var sg = document.getElementById("sgVo");
  if(sg){ var prev = sg.onclick; sg.onclick = function(e){ e.stopPropagation(); if(prev) prev.call(sg, e);
    var b = document.querySelector(".start-gate .sg-mascot, .sg-mascot"); if(b) b.dispatchEvent(new MouseEvent("click", { bubbles: true })); }; }
})();
;

/* ===== L02-SENTQ-JS ===== [L02-G3-REF] (2026-10-03, user request) G3 ("page 11" in the user's count, ?slide=10) behaves like page 5
   (G2, ?slide=4) of the deployed reference lesson https://hi-02-h04-l01-s01-dun.vercel.app/ (= Suresh's live HI02H04_L01_S01.html of
   2026-10-02). There those behaviours live in the reference's own page blocks (#P2-BIRD-POP-JS, keyed by slide index: [P6-OPT-WORDS],
   [P6-WRONG-QUIET], [P6-REVIEW], [P6-WRONG-RUNGS], [P6-OK-SENT], [P5-NO-OK-AFTER-REVEAL], [P6-PROMPT-IDLE] rev 2; #P5-CORRECT-SFX-JS
   with [P5-GUIDED-TAP]), which this lesson's build skips because they also script the reference's story and train pages. They are
   ported here value for value, card-driven: a slide with sent_ref === true gets them, nothing else changes. The page itself is the
   engine's own sentence_options + bare_recall + hide_header_chip + hide_nav STORY_QUESTION (the layout I1 already has).
   What the page does (observed on the reference, 2026-10-03):
     mount    the question line (audio.prompt) speaks; nothing else. Then, after data.prompt_idle_ms (5 s) of inactivity — no tap and
              nothing speaking — it speaks AGAIN, the recall picture showing a very small silent pop-and-hold (.p6-pop) for the length
              of the line (data.prompt_pop_ms), and so on for as long as the page is open; any pointerdown restarts the count.
     words    each pill's text is split into .p2-word spans; whenever one of the page's option lines (or the praise line, for the
              correct pill) is spoken, its words light up in time (data.word_times_by_audio: starts + the end of the last word).
              [L02-P1-WORDS] card slide.opt_words on a page that is NOT sent_ref (P1's Figma cards): this word-lighting ALONE — the
              card sentences (.story-q-opt-label) whose line has timings light up while it speaks (P1: the answer's line only, so
              the words light when the correct card is tapped); a standalone danda ("गया ।") joins the word before it. Nothing else
              of this module touches such a page.
     wrong 1  the kit's wiggle + soft buzz on the tapped pill; the pill's own line is NOT spoken (its words stay still); after the
              WRONG_BEAT_MS beat the try_again line (audio.try_again) speaks, then the pill reads normal again.
     wrong 2  the wiggle; then, instead of the engine's hint/try line, the READ-OUT: every pill in row order, REVIEW_GAP_MS apart,
              each lifted (.p6-say) while its line speaks with its words lit; taps wait meanwhile (state.hintActive).
     wrong 3  the wiggle; then the engine's reveal (decoys dimmed, the answer ringed with the pointing hand, the reveal line, page locked).
     guided   the tap on the ringed answer: the hand goes and the green mark shows at once, the page SFX (data.correct_sfx) plays and
              the picture pops (.p2-pop, 2 s) while taps are swallowed; then the same tap is handed to the engine (kit correct-select,
              happy mascot, the pill's own line with its words lit — the praise line is skipped after a reveal — then completeSlide),
              with the ding + confetti of a normal correct tap fired alongside.
     correct  (first or second try) the green mark at once, SFX + the picture's pop for hold_ms with taps swallowed; then the tap is
              handed to the engine: kit correct-select, ding, confetti, happy mascot, and the praise line ALONE (the pill's own line
              is skipped), the correct pill's words lit with the sentence inside the praise; then completeSlide 700 ms later.
     nav      none (slide.hide_nav -> .stage.no-nav, as the live reference's mountSlide does; this engine snapshot predates that flag).
   The standard SFX set (correct / incorrect / confetti / next / play — the reference replaced the engine's tones with it lesson-wide on
   2026-10-02) came to this lesson on 2026-10-05 from the user's own "Standard SFX" folder ([L02-STD-SFX]: engine patch 3h in build.py
   + adapt.js [L02-STD-SFX-JS]): the "ding" of the correct branch is the standard correct clip, the "soft buzz" of a wrong tap the
   standard incorrect clip, and the confetti burst carries the confetti clip. This page's own scene sound (data.correct_sfx) stays. */
(function(){ "use strict";
  var POP_MS = 2000, WRONG_BEAT_MS = 1000, REVIEW_GAP_MS = 500, DEFAULT_IDLE_MS = 5000, DEFAULT_PROMPT_POP_MS = 3200;
  function slideAt(idx){ return (typeof CARD === "object" && CARD && CARD.slides) ? CARD.slides[idx] : null; }
  function curIdx(){ return (typeof state === "object" && state) ? state.idx : -1; }
  function flagged(idx){ var s = slideAt(idx); return !!(s && s.sent_ref === true); }
  function stillMode(){ return !!(window.FLNMotion && FLNMotion.still && FLNMotion.still()); }
  function idOf(src){ return String(src).split("/").pop().replace(/\.[A-Za-z0-9]+$/, ""); }
  function srcOf(id){
    var a = (typeof CARD === "object" && CARD && CARD.assets && CARD.assets.audio) ? CARD.assets.audio[id] : null;
    return a || ("assets/Audio/" + id + "." + (typeof AUDIO_EXT === "string" ? AUDIO_EXT : "ogg"));
  }
  function voPlaying(){ return document.body.classList.contains("vo-playing"); }
  var timers = [];
  var optWords = null;                                      // audio id -> {els, times} of this page's pills (null when none)
  var reviewing = false;                                    // the read-out of the pills is running
  var wordRaf = 0, wordEls = null;                          // the running word-highlight loop and its spans
  var idleFrame = null, idleCue = null, idleTimer = null, idleMs = 0;   // the page whose question repeats on inactivity
  var holding = false, passthrough = false, holdTimer = null, sfx = null;   // the correct tap's SFX hold
  function cancel(){
    timers.forEach(function(t){ clearTimeout(t); }); timers = [];
    optWords = null; reviewing = false; wordStop(); idleCancel();
    if(holdTimer){ clearTimeout(holdTimer); holdTimer = null; }
    if(sfx){ try{ sfx.pause(); }catch(e){} sfx = null; }
    holding = false;
  }
  function whenQuiet(frame, fn){
    (function poll(){
      if(!frame.isConnected) return;
      if(voPlaying()){ timers.push(setTimeout(poll, 200)); return; }
      fn();
    })();
  }
  // ---- words: split the pill's sentence (its first non-empty text node) into .p2-word spans, once; spaces stay as text between them;
  // a flex/grid pill keeps the words in ONE inline box (.p2-words) so the spaces stay
  function splitWords(pill){
    if(pill.__p2Words) return pill.__p2Words;
    var node = null;
    for(var i = 0; i < pill.childNodes.length; i++){ var c = pill.childNodes[i]; if(c.nodeType === 3 && c.nodeValue.trim()){ node = c; break; } }
    if(!node) return null;
    var frag = document.createDocumentFragment(), els = [];
    var toks = node.nodeValue.split(/(\s+)/).filter(function(t){ return !!t; });
    for(var k = 0; k < toks.length; k++){
      var t = toks[k];
      if(/^\s+$/.test(t)){
        // [L02-P1-WORDS] a space before a standalone punctuation mark ("गया ।"): both join the word before them
        if(els.length && k + 1 < toks.length && /^[।॥!?.,]+$/.test(toks[k + 1])){ els[els.length - 1].textContent += t + toks[k + 1]; k++; continue; }
        frag.appendChild(document.createTextNode(t)); continue;
      }
      var sp = document.createElement("span"); sp.className = "p2-word"; sp.textContent = t; frag.appendChild(sp); els.push(sp);
    }
    var disp = ""; try{ disp = getComputedStyle(pill).display; }catch(e){}
    if(/flex|grid/.test(disp)){ var wrap = document.createElement("span"); wrap.className = "p2-words"; wrap.appendChild(frag); frag = wrap; }
    pill.replaceChild(frag, node);
    pill.__p2Words = els;
    return els;
  }
  // map this page's pills to their option audio ids (card options matched by label) and split them; the correct pill follows the
  // praise line (audio.correct) as well — its timings cover the sentence part of that clip only, so nothing is lit during the praise
  function wireOptWords(idx){
    optWords = null;
    var sl = slideAt(idx); if(!sl) return;
    var WT = (sl.data && sl.data.word_times_by_audio) || {};
    var opts = (sl.data && Array.isArray(sl.data.options)) ? sl.data.options : [];
    var map = {}, n = 0;
    Array.prototype.slice.call(document.querySelectorAll("#slideHost .sent-opt .so-pill, #slideHost .opt-cell .story-q-opt-label")).forEach(function(pill){   // [L02-P1-WORDS] a Figma card's sentence as well
      var label = (pill.textContent || "").trim(), opt = null;
      for(var i = 0; i < opts.length; i++){ if(opts[i] && (opts[i].label_hi || "").trim() === label){ opt = opts[i]; break; } }
      if(!opt || !opt.audio || !Array.isArray(WT[opt.audio])) return;
      var els = splitWords(pill);
      if(els && els.length === WT[opt.audio].length - 1){ map[opt.audio] = { els: els, times: WT[opt.audio] }; n++; }
    });
    var okId = sl.audio && sl.audio.correct, okT = okId ? WT[okId] : null;
    for(var k = 0; Array.isArray(okT) && k < opts.length; k++){
      var o = opts[k]; if(!o || o.correct !== true || !o.audio || !map[o.audio]) continue;
      if(map[o.audio].els.length === okT.length - 1){ map[okId] = { els: map[o.audio].els, times: okT }; n++; }
    }
    if(n) optWords = map;
  }
  function wordStop(){
    if(wordRaf){ cancelAnimationFrame(wordRaf); wordRaf = 0; }
    if(wordEls){ wordEls.forEach(function(w){ w.classList.remove("on"); }); wordEls = null; }
  }
  // follow the clock of a (play()'s element for the line): word k is .on while times[k] <= currentTime < times[k+1]
  function wordSync(a, els, times){
    wordStop();
    if(!a || !els || !times || els.length !== times.length - 1) return;
    wordEls = els; var cur = -1;
    (function tick(){
      wordRaf = 0;
      var gone = (typeof currentAudio !== "undefined") && currentAudio !== a;         // play() moved on (a tap cut the line)
      if(a.ended || gone || (a.paused && a.currentTime > 0)){ wordStop(); return; }
      var t = a.currentTime, i = -1;
      for(var k = 0; k < els.length; k++){ if(t >= times[k] && t < times[k + 1]){ i = k; break; } }
      if(i !== cur){ if(cur >= 0) els[cur].classList.remove("on"); if(i >= 0) els[i].classList.add("on"); cur = i; }
      if(t >= times[times.length - 1]){ wordStop(); return; }
      wordRaf = requestAnimationFrame(tick);
    })();
  }
  // ---- the play() seam: which engine call is which
  function optionOf(sl, src){
    var opts = (sl && sl.data && Array.isArray(sl.data.options)) ? sl.data.options : [], id = idOf(src);
    for(var i = 0; i < opts.length; i++){ if(opts[i] && opts[i].audio && idOf(srcOf(opts[i].audio)) === id) return opts[i]; }
    return null;
  }
  // the praise line (audio.correct) after the reveal: skipped (the guided tap speaks the pill's own line only)
  function okAfterRevealOff(sl, src){
    if(state.scaffoldLevel !== 3) return false;
    var id = sl.audio && sl.audio.correct;
    return !!id && idOf(srcOf(id)) === idOf(src);
  }
  // the engine speaking a tapped WRONG pill's own line: not spoken (outside the read-out, which speaks those same ids)
  function wrongWordOff(sl, src){
    if(reviewing || state.locked || !(state.attempts >= 1)) return false;
    var o = optionOf(sl, src); return !!o && o.correct !== true;
  }
  // the engine speaking the CORRECT pill's own line right after a correct tap (state.locked, no reveal) while the card has a praise
  // line: that line follows at once and carries the sentence, so this one is skipped and the sentence is heard once
  function okSentOff(sl, src){
    if(reviewing || !state.locked || state.scaffoldLevel === 3) return false;
    if(!sl.audio || !sl.audio.correct) return false;
    var o = optionOf(sl, src); return !!o && o.correct === true;
  }
  // the line the engine speaks after a second wrong tap (its hint rung: audio.hint, else audio.try_again, once state.attempts >= 2
  // and the page is not locked — the reveal after the third tap locks it first): replaced by the read-out
  function isReviewLine(sl, src){
    if(reviewing || state.locked || state.hintActive || !(state.attempts >= 2)) return false;
    var l2 = (typeof audioFor === "function") ? (audioFor(sl, "hint") || audioFor(sl, "try_again")) : null;
    return !!l2 && idOf(l2) === idOf(src);
  }
  var origPlay = window.play;
  if(typeof origPlay === "function"){
    window.play = function(src, onEnd){
      var ix = curIdx(), sl = slideAt(ix);
      if(src && sl && flagged(ix)){
        if(okAfterRevealOff(sl, src)){ if(onEnd) timers.push(setTimeout(onEnd, 0)); return; }
        if(wrongWordOff(sl, src)){
          var cbw = onEnd;
          if(typeof stopAudio === "function") stopAudio();                     // the tap still cuts whatever was speaking (the question), as the line did
          state.hintActive = true;                                            // taps wait for the beat, as during the read-out
          timers.push(setTimeout(function(){
            if(curIdx() !== ix) return;                                       // the page was left (mountSlide resets the hint state)
            state.hintActive = false;
            if(typeof cbw === "function") cbw();                              // the engine's feedback for this attempt
          }, WRONG_BEAT_MS));
          return;
        }
        if(okSentOff(sl, src)){ if(onEnd) timers.push(setTimeout(onEnd, 0)); return; }
        if(isReviewLine(sl, src)){
          reviewing = true; state.hintActive = true;
          reviewPills(ix, function(){
            reviewing = false;
            if(curIdx() === ix) state.hintActive = false;
            if(onEnd) onEnd();                                                // the engine's un-crossing
          });
          return;
        }
      }
      var r = origPlay.call(this, src, onEnd);
      if(optWords && src){
        var w = optWords[idOf(src)];
        if(w && w.els[0] && w.els[0].isConnected) wordSync((typeof currentAudio !== "undefined") ? currentAudio : null, w.els, w.times);
      }
      return r;
    };
  }
  // ---- the read-out: every pill in row order, lifted while its line speaks; then() once the last is over
  function reviewPills(idx, then){
    var sl = slideAt(idx), opts = (sl && sl.data && Array.isArray(sl.data.options)) ? sl.data.options : [], items = [];
    Array.prototype.slice.call(document.querySelectorAll("#slideHost .opt-grid .opt-cell")).forEach(function(cell){
      var pill = cell.querySelector(".so-pill") || cell, label = (pill.textContent || "").trim(), opt = null;
      for(var i = 0; i < opts.length; i++){ if(opts[i] && (opts[i].label_hi || "").trim() === label){ opt = opts[i]; break; } }
      if(opt && opt.audio) items.push({ cell: cell, pill: pill, src: srcOf(opt.audio) });
    });
    var over = false, fin = function(){ if(over) return; over = true; then(); };
    if(!items.length){ fin(); return; }
    items.forEach(function(it){ it.cell.classList.remove("crossed"); });      // the tapped pill reads like the others
    var k = 0;
    (function next(){
      if(k >= items.length){ timers.push(setTimeout(fin, 300)); return; }
      var it = items[k++];
      timers.push(setTimeout(function(){
        if(!it.pill.isConnected || curIdx() !== idx) return;                  // the page was left
        sayPill(it.pill, it.src, next);
      }, REVIEW_GAP_MS));
    })();
  }
  // speak src through play() with the pill lifted for as long as the sound plays (the play() wrapper lights its words); then() once —
  // at its end, or, if another line cut it, once nothing speaks any more
  function sayPill(pill, src, then){
    var done = false, up = false;
    var lift = function(){ if(up || done || stillMode()) return; up = true; pill.classList.add("p6-say"); };
    var fin = function(){ if(done) return; done = true; pill.classList.remove("p6-say"); then(); };
    if(typeof play !== "function"){ fin(); return; }
    play(src, fin);
    var a = (typeof currentAudio !== "undefined") ? currentAudio : null;
    if(a){
      if(!a.paused && a.currentTime > 0) lift(); else a.addEventListener("playing", lift, { once:true });
      a.addEventListener("pause", function(){ setTimeout(function(){ if(a.ended) return; whenQuiet(pill, fin); }, 0); }, { once:true });
    }
    timers.push(setTimeout(lift, 400));                                       // a slow load: lift anyway
  }
  // ---- the question repeats on inactivity, the picture popping with it
  function wireIdlePrompt(idx){
    var sl = slideAt(idx); if(!sl) return;
    var ms = (sl.data && sl.data.prompt_idle_ms) || DEFAULT_IDLE_MS;
    var src = (typeof audioFor === "function") ? audioFor(sl, "prompt") : null; if(!src) return;
    var frame = document.querySelector("#slideHost .q-row"); if(!frame || frame.__idleWired) return;
    frame.__idleWired = true;
    var popMs = (sl.data && sl.data.prompt_pop_ms) || DEFAULT_PROMPT_POP_MS;
    var thumb = document.querySelector("#slideHost .story-q-stim .story-q-thumb");
    if(thumb) thumb.style.setProperty("--sentq-pop", popMs + "ms");         // the pop-and-hold lasts exactly the line (CSS .p6-pop)
    var cue = { src: src, pop: "#slideHost .story-q-stim .story-q-thumb", popMs: popMs };
    whenQuiet(frame, function(){                                               // the page's own line first: the count runs from its end
      if(!frame.isConnected || curIdx() !== idx) return;
      idleFrame = frame; idleCue = cue; idleMs = ms; idleArm();
    });
  }
  function idleCancel(){ if(idleTimer){ clearTimeout(idleTimer); idleTimer = null; } idleFrame = null; idleCue = null; idleMs = 0; }
  function navShowing(){ var b = document.getElementById("navBtn"); return !!(b && b.classList.contains("active")); }
  function idleArm(){
    if(!idleFrame) return;
    if(idleTimer){ clearTimeout(idleTimer); idleTimer = null; }
    if(!idleFrame.isConnected){ idleCancel(); return; }
    if(navShowing()){ idleCancel(); return; }
    if(voPlaying()){ whenQuiet(idleFrame, idleArm); return; }                 // a line speaks: count from its end
    idleTimer = setTimeout(idleFire, idleMs);
  }
  function idleFire(){
    idleTimer = null;
    if(!idleFrame || !idleFrame.isConnected){ idleCancel(); return; }
    if(navShowing()){ idleCancel(); return; }
    if(voPlaying()){ idleArm(); return; }
    startCue(idleFrame, idleCue);
  }
  function startCue(frame, cue){
    if(!frame.isConnected || typeof play !== "function") return;
    play(cue.src, function(){ idleArm(); });                                  // the line ended: the count starts again
    if(cue.pop && !stillMode()) popWithCue(document.querySelector(cue.pop), cue.popMs);
  }
  // the small pop-and-hold on the picture: .p6-pop for the line's length (it runs to its end on its own even if the line is cut)
  function popWithCue(el, ms){
    if(!el) return;
    el.classList.add("p6-pop");
    el.addEventListener("animationend", function(){ el.classList.remove("p6-pop"); }, { once:true });
    timers.push(setTimeout(function(){ el.classList.remove("p6-pop"); }, ms + 250));   // fallback tidy-up
  }
  document.addEventListener("pointerdown", function(){ if(idleFrame && idleFrame.isConnected) idleArm(); }, true);   // any tap restarts the count
  // ---- the correct tap: the green mark at once, the page SFX + the picture's pop for hold_ms with taps swallowed, then the same tap
  // is handed to the engine (cell.click()); the ringed answer after a reveal gets the same beat ([P5-GUIDED-TAP])
  function correctOption(sl){ var opts = (sl && sl.data && sl.data.options) || []; for(var i = 0; i < opts.length; i++){ if(opts[i].correct === true) return opts[i]; } return null; }
  function isCorrectCell(cell, opt){ if(!opt) return false; var pill = cell.querySelector(".so-pill") || cell; return (pill.textContent || "").trim() === String(opt.label_hi || "").trim(); }
  function popEl(el){
    if(!el || stillMode()) return;                                            // reduced-motion: sound only
    el.classList.add("p2-pop");
    el.addEventListener("animationend", function(){ el.classList.remove("p2-pop"); }, { once:true });
    setTimeout(function(){ el.classList.remove("p2-pop"); }, POP_MS + 250);   // fallback tidy-up
  }
  document.addEventListener("click", function(e){
    if(passthrough) return;
    var idx = curIdx(); if(!flagged(idx)) return;
    var sl = slideAt(idx), cfg = sl.data && sl.data.correct_sfx; if(!cfg) return;
    var cell = (e.target && e.target.closest) ? e.target.closest("#slideHost .opt-cell") : null;
    if(!cell) return;
    if(holding){ e.stopPropagation(); e.preventDefault(); return; }          // nothing lands while the sound plays
    if(e.target.closest(".so-spk")) return;                                    // the option's speaker chip only speaks
    var guided = cell.classList.contains("opt-guided");                       // the reveal after 3 wrong taps: the hand points here, state.locked is true
    if(state.hintActive || cell.classList.contains("crossed") || cell.classList.contains("correct")) return;
    if(state.locked && !guided) return;
    if(!isCorrectCell(cell, correctOption(sl))) return;                       // a wrong option: the engine handles it
    e.stopPropagation(); e.preventDefault();
    holding = true; state.locked = true; cell.classList.add("correct");        // immediate tap feedback, taps blocked
    try{ stopNudge(); }catch(x){}
    if(guided){                                                                // onGuidedTap's first beat, brought forward to the tap
      document.querySelectorAll(".reveal-hand").forEach(function(x){ x.remove(); });
      cell.classList.remove("opt-guided");
    }
    popEl(document.querySelector("#slideHost .story-q-stim .story-q-thumb"));
    try{ sfx = new Audio(srcOf(cfg.src)); sfx.volume = (cfg.vol != null) ? cfg.vol : 1; sfx.play().catch(function(){}); }catch(x){ sfx = null; }
    holdTimer = setTimeout(function(){
      holdTimer = null; holding = false;
      if(!cell.isConnected || curIdx() !== idx) return;                       // the page was left during the hold
      cell.classList.remove("correct");                                       // hand the tap over exactly as it arrived
      if(!guided) state.locked = false;                                       // guided: locked stays true, so cell.onclick bows out and onGuidedTap takes the tap
      passthrough = true;
      try{ cell.click(); } finally { passthrough = false; }
      if(guided){ try{ sfxCorrect(); }catch(x){} try{ confettiCannon(); }catch(x){} }   // the ding + confetti of the normal correct branch
    }, cfg.hold_ms || POP_MS);
  }, true);
  // ---- per page
  function wire(idx){
    var sl = slideAt(idx), st = document.getElementById("stage");
    if(st){ st.classList.toggle("no-nav", !!(sl && sl.hide_nav === true)); st.classList.toggle("l02-sentq", flagged(idx));
      st.classList.toggle("l02-sentq-shadow", flagged(idx) && !!(sl && sl.sentq_shadow === true));     // [L02-SENTQ-SHADOW] the P1-style drop shadow on the picture + pills (card slide.sentq_shadow)
      st.classList.toggle("l02-q3-band", flagged(idx) && !!(sl && sl.q3_band === true)); }             // [L02-Q3-BAND] P1's Figma title bar (header variables + mascot circle + band shadow + ink; card slide.q3_band)
    if(!flagged(idx)){ if(sl && sl.opt_words === true) wireOptWords(idx); return; }   // [L02-P1-WORDS] the word-lighting alone on a card page
    wireOptWords(idx); wireIdlePrompt(idx);
  }
  var origMount = window.mountSlide;
  if(typeof origMount === "function"){
    window.mountSlide = function(idx){ cancel(); var r = origMount.apply(this, arguments); wire(idx); return r; };
  }
  wire(curIdx());   // a ?slide=N dev load mounts inside the engine script, before this block runs
})();
;

/* ===== [L02-BGM-DUCK] (2026-10-04, user request) ===== */
/* "From Page 1 T1 to Page 17 M2 apply this music in the background in a low volume and such that it doesn't make disturbance, and
   whenever any VO or any sound effect is played on any page the volume of this background music should be reduced to the minimal level."
   A low background-music bed from Page 1 (the landing) through the lesson's last question page (M2), ducked to a minimal level whenever
   ANY voice-over or sound effect plays and brought back when that sound has ended; the celebration page has no bed.
   Ported from the deployed reference lesson's [BGM-DUCK] block (HI02H04_L01_S01, 2026-10-02 — the same music, the user's "Standard
   Background Music 2") with two changes: the RANGE comes from the card (CARD.bgm.first / .last, set by build.py from the slide ids, so a
   removed page can never leave the bed on the wrong pages), and the bed also plays on the LANDING (the user's "Page 1"): from the moment
   the boot loader hands over (body.loaded, 2 s after load) — where the browser refuses to play before a gesture, the first pointerdown /
   keydown starts it (the very tap that starts the landing's welcome line, which then ducks it at once).
   - The bed: CARD.bgm.src = assets/Audio/bgm_standard_2.mp3 (4:00, looped; re-encoded 256 -> 128 kbps like the reference's), one
     <audio> element made at load so it buffers behind the loader. Element volume BASE 0.13 (about -18 dB: some 16 LU under the -16 LUFS
     voice lines, so it never competes) and DUCK 0.03 (about -30 dB, ~28 LU under: a whisper); ramps of 180 ms down and 600 ms up (a
     16 ms timer, so they run in a background tab too), so a tap's click dips the bed softly and the bed swells back after a line. It
     fades in from silence when it first starts and out (600 ms, then pause) when a page outside the range mounts; coming back into the
     range resumes it.
   - Detection WITHOUT touching any caller: every sound in this lesson is either an Audio element (play(): the VO chain, playSfx, the
     landing welcome, the story pages' picture-pop clips, G3's correct sfx) or a WebAudio source node (the engine's _tone taps and dings,
     the animation kit's sky-burst), so HTMLMediaElement.prototype.play and AudioScheduledSourceNode.prototype.start / stop are wrapped
     here: a media element keeps the bed ducked from its play() until its ended / pause / error (or a refused play()); a source node from
     its start(when) until its stop(when) + 120 ms, or 0.8 s when no stop is scheduled (a one-shot buffer). The bed's own element is left
     out. A set of sounding elements plus the nodes' deadlines decide; the bed rises again 150 ms after the last of them is over (so two
     lines back to back do not swell between). The read-aloud beat (12 s, nothing speaks) leaves the bed at BASE.
   - Range: window.mountSlide is wrapped (last, after every other wrapper): slides first..last start or keep the bed, any other slide
     (the celebration) fades it out; a ?slide=N dev load (mounted before this block ran) is handled at the end. The landing → T1 phase
     transition keeps the bed running (nothing mounts in between; the transition line ducks it).
   - iOS ignores an element's volume (always 1): there the bed plays at the file's level and cannot duck. Noted, not worked around (the
     reference accepted the same).
   Nothing else changes: no caller, no VO, no sfx, no timing. window.__bgm exposes read-only state for verification. */
(function(){
  var CFG = (typeof CARD === "object" && CARD && CARD.bgm) || null;
  if(!CFG || !CFG.src) return;
  var FIRST = CFG.first | 0, LAST = CFG.last | 0, LANDING = CFG.landing !== false;
  var SRC = CFG.src, BASE = (CFG.base != null) ? +CFG.base : 0.13, DUCK = (CFG.duck != null) ? +CFG.duck : 0.03;
  var DOWN_MS = 180, UP_MS = 600, OUT_MS = 600;
  if(typeof HTMLMediaElement === "undefined" || !HTMLMediaElement.prototype.play) return;
  var origPlay = HTMLMediaElement.prototype.play;
  var el = null, wanted = false, tapArmed = false;
  var sounding = new Set(), nodes = new Map();                                // elements playing now; source node -> deadline (ms)
  var level = 0, target = 0, rampFrom = 0, rampT0 = 0, rampMs = 0, stepTimer = 0, checkTimer = 0;
  function nodesUntil(){ var now = Date.now(), m = 0; nodes.forEach(function(t, n){ if(t <= now) nodes.delete(n); else if(t > m) m = t; }); return m; }
  function ducked(){ return sounding.size > 0 || nodesUntil() > Date.now(); }
  function apply(){ if(el){ try{ el.volume = Math.max(0, Math.min(1, level)); }catch(e){} } }
  function step(){ stepTimer = 0; var k = rampMs > 0 ? Math.min(1, (Date.now() - rampT0) / rampMs) : 1;
    level = rampFrom + (target - rampFrom) * k; apply();
    if(k < 1) stepTimer = setTimeout(step, 16);
    else if(!wanted && target === 0 && el){ try{ el.pause(); }catch(e){} } }
  function setTarget(v, ms){ if(v === target && Math.abs(level - v) < 1e-6) return;
    target = v; rampFrom = level; rampT0 = Date.now(); rampMs = ms; if(!stepTimer) step(); }
  function check(ms){ clearTimeout(checkTimer); checkTimer = setTimeout(update, ms); }
  function update(){ if(!wanted) return; var d = ducked(); setTarget(d ? DUCK : BASE, d ? DOWN_MS : UP_MS);
    var u = nodesUntil(); if(u > Date.now()) check(u - Date.now() + 40); }
  // ---- door 1: media elements ----
  HTMLMediaElement.prototype.play = function(){
    var m = this, r = origPlay.apply(this, arguments);
    if(m !== el){
      if(!sounding.has(m)){ sounding.add(m);
        var off = function(){ sounding.delete(m); m.removeEventListener("ended", off); m.removeEventListener("pause", off); m.removeEventListener("error", off); check(150); };
        m.addEventListener("ended", off); m.addEventListener("pause", off); m.addEventListener("error", off); }
      update();
      if(r && typeof r.then === "function") r.then(null, function(){ sounding.delete(m); check(150); });   // refused: nothing sounds
    }
    return r;
  };
  // ---- door 2: WebAudio source nodes (oscillators, buffers) ----
  var SN = window.AudioScheduledSourceNode;
  var protos = (SN && SN.prototype && SN.prototype.start) ? [SN.prototype]
    : [window.OscillatorNode, window.AudioBufferSourceNode].filter(function(C){ return C && C.prototype && C.prototype.start; }).map(function(C){ return C.prototype; });
  protos.forEach(function(P){
    var oStart = P.start, oStop = P.stop;
    var at = function(node, when){ var c = node.context, t = +when; if(!(t > 0)) t = 0; return Date.now() + Math.max(0, t - (c ? c.currentTime : 0)) * 1000; };
    P.start = function(when){ var r = oStart.apply(this, arguments); try{ nodes.set(this, at(this, when) + 800); update(); }catch(e){} return r; };
    if(oStop) P.stop = function(when){ var r = oStop.apply(this, arguments); try{ if(nodes.has(this)){ nodes.set(this, at(this, when) + 120); update(); } }catch(e){} return r; };
  });
  // ---- the bed ----
  try{ el = new Audio(SRC); el.loop = true; el.preload = "auto"; apply(); }catch(e){ el = null; }
  function armTap(){ if(tapArmed) return; tapArmed = true;
    var once = function(){ document.removeEventListener("pointerdown", once, true); document.removeEventListener("keydown", once, true); tapArmed = false; if(wanted) start(); };
    document.addEventListener("pointerdown", once, true); document.addEventListener("keydown", once, true); }
  function start(){ if(!el) return;
    if(el.paused){ var p = null; try{ p = origPlay.call(el); }catch(e){}            // origPlay: the bed is no "sound" to itself
      if(p && typeof p.then === "function") p.then(function(){ tapArmed = false; }, armTap); }
    update(); }
  function onSlide(idx){ wanted = idx >= FIRST && idx <= LAST; if(wanted) start(); else if(el) setTarget(0, OUT_MS); }
  var origMount = window.mountSlide;
  if(typeof origMount === "function") window.mountSlide = function(idx){ var r = origMount.apply(this, arguments); try{ onSlide(idx | 0); }catch(e){} return r; };
  // ---- the landing (Page 1): open once the boot loader has handed over (body.loaded) while the start gate is still up ----
  function gateEl(){ return document.getElementById("startGate"); }
  function landingOpen(){ var g = gateEl(); return !!(g && !g.classList.contains("hidden") && document.body && document.body.classList.contains("loaded")); }
  if(LANDING){
    var seen = false;
    var look = function(){ if(seen || !landingOpen()) return; seen = true; wanted = true; start(); };
    if(window.MutationObserver && document.body){ try{ new MutationObserver(look).observe(document.body, { attributes: true, attributeFilter: ["class"] }); }catch(e){} }
    look(); setTimeout(look, 2200); setTimeout(look, 3500);                   // the loader hands over 2 s after load
  }
  var gate = gateEl();
  if(gate && gate.classList.contains("hidden") && typeof state === "object" && state) onSlide(state.idx | 0);   // ?slide=N: mounted before this block
  window.__bgm = { get el(){ return el; }, get wanted(){ return wanted; }, get sounding(){ return sounding.size; },
    get nodesDuckMs(){ return Math.max(0, nodesUntil() - Date.now()); }, get level(){ return level; }, get target(){ return target; },
    get range(){ return [FIRST, LAST]; } };
})();
;
