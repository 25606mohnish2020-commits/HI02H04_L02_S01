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
     [L02-POP-AFTER-SENTENCE]; 5 s on pages 2, 4, 5 and 10, data.pop_ms, [L02-POP-5S]) with its own sound (data.pop_sfx,
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
      // p2BirdPop's duration in the CSS: 2 s, or 5 s on a page whose card says data.pop_ms = 5000 (pages 2, 4, 5, 10, [L02-POP-5S]:
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
