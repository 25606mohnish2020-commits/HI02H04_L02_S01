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
   Not ported: the reference's standard SFX set for correct / incorrect / confetti (it replaced the engine's tones lesson-wide on
   2026-10-02) — this lesson keeps its own sounds on every page, this one included. */
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
    node.nodeValue.split(/(\s+)/).forEach(function(t){
      if(!t) return;
      if(/^\s+$/.test(t)){ frag.appendChild(document.createTextNode(t)); return; }
      var sp = document.createElement("span"); sp.className = "p2-word"; sp.textContent = t; frag.appendChild(sp); els.push(sp);
    });
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
    Array.prototype.slice.call(document.querySelectorAll("#slideHost .sent-opt .so-pill")).forEach(function(pill){
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
    if(!flagged(idx)) return;
    wireOptWords(idx); wireIdlePrompt(idx);
  }
  var origMount = window.mountSlide;
  if(typeof origMount === "function"){
    window.mountSlide = function(idx){ cancel(); var r = origMount.apply(this, arguments); wire(idx); return r; };
  }
  wire(curIdx());   // a ?slide=N dev load mounts inside the engine script, before this block runs
})();
