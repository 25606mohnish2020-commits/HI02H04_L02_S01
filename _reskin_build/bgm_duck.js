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
