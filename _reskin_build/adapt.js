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
  window.mountSlide = function(idx){ var r = orig.apply(this, arguments); applyRoomBg(idx); applyPageBg(idx); applyFind(idx); applyQ3(idx); applyBed(idx); return r; };
  // the ?slide=N dev jump (QA/capture) mounts its slide while the engine block is still being evaluated, i.e. before this
  // hook exists — so a find page (or the Figma question page) that is already on the stage gets its layout here, once, at load
  if(typeof state !== "undefined" && typeof state.idx === "number" && document.querySelector("#slideHost .tis-scene")){ applyRoomBg(state.idx); applyFind(state.idx); applyBed(state.idx); }
  if(typeof state !== "undefined" && typeof state.idx === "number" && document.querySelector("#slideHost .opt-grid")){ applyRoomBg(state.idx); applyQ3(state.idx); }
  if(typeof state !== "undefined" && typeof state.idx === "number") applyPageBg(state.idx);   // [L02-I3-BG] a ?slide=N dev load of any page type (a no-op for a page without page_bg, so safe at boot too)
  var origDone = window.completeSlide; if(typeof origDone !== "function") return;
  window.completeSlide = function(){
    var s = (typeof CARD !== "undefined" && CARD.slides && typeof state !== "undefined") ? CARD.slides[state.idx] : null;
    if(s && (s.find_fig === true || s.bed_fig === true)){ if(s._l02Left) return; s._l02Left = true; }
    return origDone.apply(this, arguments);
  };
})();
