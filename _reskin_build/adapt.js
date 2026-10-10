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
