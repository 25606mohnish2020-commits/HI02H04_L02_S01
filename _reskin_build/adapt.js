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
   the mascot tap replays the question exactly as the chip did (state.replayAudio, else the slide's VO chain); the आगे बढ़ें
   pill (which TAP_IN_SCENE hides) is shown in its disabled look from the start and lights on the correct tap. The page still
   moves on by itself after the "correct" line, as before; a tap on the lit pill moves on at once instead, and the guard on
   completeSlide makes sure the page is left exactly once (the module's own delayed call is also fenced to its slide by build.py). */
(function(){
  var orig = window.mountSlide; if(typeof orig !== "function") return;
  function applyFind(idx){
    var s = (typeof CARD !== "undefined" && CARD.slides) ? CARD.slides[idx] : null, find = !!(s && s.find_fig === true);
    var st = document.getElementById("stage"); if(st) st.classList.toggle("l02-find", find);
    if(!find) return;
    s._l02Left = false;
    var nb = document.getElementById("navBtn"); if(nb){ nb.style.display = ""; nb.textContent = "आगे बढ़ें"; }
    var mw = document.getElementById("mascotWrap");
    if(mw) mw.onclick = function(){ if(typeof isPlaying !== "undefined" && isPlaying) return;
      state.audioReplays++;
      SwiftPAL.emit("audio_replay", { slide_id: s.id, phase: s.phase, count: state.audioReplays, src: "mascot" });
      if(state.replayAudio) state.replayAudio(); else autoPlayChain(s); };
    document.querySelectorAll("#slideHost .tis-hot.correct-hot").forEach(function(h){
      h.addEventListener("click", function(){ if(CARD.slides[state.idx] === s) setNavActive(true); }); });
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
    var st = document.getElementById("stage"); if(st) st.classList.toggle("l02-q3", q3);
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
  window.mountSlide = function(idx){ var r = orig.apply(this, arguments); applyFind(idx); applyQ3(idx); return r; };
  // the ?slide=N dev jump (QA/capture) mounts its slide while the engine block is still being evaluated, i.e. before this
  // hook exists — so a find page (or the Figma question page) that is already on the stage gets its layout here, once, at load
  if(typeof state !== "undefined" && typeof state.idx === "number" && document.querySelector("#slideHost .tis-scene")) applyFind(state.idx);
  if(typeof state !== "undefined" && typeof state.idx === "number" && document.querySelector("#slideHost .opt-grid")) applyQ3(state.idx);
  var origDone = window.completeSlide; if(typeof origDone !== "function") return;
  window.completeSlide = function(){
    var s = (typeof CARD !== "undefined" && CARD.slides && typeof state !== "undefined") ? CARD.slides[state.idx] : null;
    if(s && s.find_fig === true){ if(s._l02Left) return; s._l02Left = true; }
    return origDone.apply(this, arguments);
  };
})();
