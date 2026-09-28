  /* STORY_READ_PAGE (HI02H04_L02 — चित्र-संकेत की सहायता से वाक्य पठन), pages 2-10 laid out from Figma "FLN by MJ"
     section 19-13 (CSS: [L02-STORY-FIG], stage class .l02-story): the header band ("आइए कहानी पढ़ें।") with the mascot
     circle, the grid frame, the 468x244 picture in its yellow frame, the sentence in the white / blue-stroke bar under it
     with the small speaker chip to its left (slide.caption_chip moves the frame's chip there), and आगे बढ़ें inside the
     frame. Beat order, unchanged: the narration speaks first and alone — page 2 only (vo_help); pages 3-10 have no narration
     clip any more ([L02-NO-READ-INSTR], their "इस वाक्य को पढ़िए।" was removed) and open silently, straight into the beats
     below (the speaker chip stays still — its wave arcs do
     NOT blink for the narration, CSS [L02-SPK-CUE]; the one exception: while the narration says "यह बटन दबाकर सुन सकते हैं"
     — page 2's vo_help, from data.chip_pulse_at (set by the build, read off the audio clock) to the end of the clip — the chip
     PULSES, the same pulse the cue uses) → 4 s later ONLY the speaker chip PULSES with the "tap here to hear the sentence"
     line (vo_tap_speaker_sentence) and ONLY the chip takes the tap → the child taps it → the sentence speaks (only now the
     chip's wave arcs blink: .p2-speaking on the bar for the length of the clip), the word being said turning dark orange
     with a tiny pop, in time with the clip → the clip ends → the picture pops out and holds (2 s, [L02-POP-AFTER-SENTENCE];
     5 s on pages 2, 4, 5 and 10, data.pop_ms, [L02-POP-5S]) with its own sound (data.pop_sfx, [L02-POP-SFX]: starts with the pop,
     stops with it) → only then आगे बढ़ें lights up (the disabled pill was there from the start). With no tap the cue (pulse +
     line) repeats after 5 s of silence. A tap on the header mascot repeats the narration (the Figma page has no straddling
     bird), its pulse included.
     data:{image_id, alt_hi, emoji, words:[{text}], whole_audio, chip_pulse_at?, pop_sfx?, pop_ms?, pop_sfx_s?}; audio:{prompt}. */
  STORY_READ_PAGE: {
    mount(host, slide){
      const d = slide.data || {};
      const wrap = document.createElement("div"); wrap.className = "story-scene story-read-page";
      const fb = String(d.emoji || "📖").replace(/'/g,"");
      const words = (d.words || []).map(w => (w && w.text) || "").filter(Boolean);
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
      const cueSrc = (CARD.assets && CARD.assets.audio && CARD.assets.audio["vo_tap_speaker_sentence"]) || null;
      const alive = ()=> CARD.slides[state.idx] === slide && host.isConnected;
      let heard = false, cueOn = false, cueTimer = 0, syncRaf = 0;
      state.ownsAudio = true; setNavActive(false);
      $("navBtn").onclick = ()=>{ if(!$("navBtn").disabled){ stopPopSfx(); completeSlide(true); } };   // a pop sound still running ends with the page
      // wordsOff also drops .p2-speaking: it runs at the start of every clip (narration or sentence) and at the sentence's end,
      // so the chip's wave arcs can only blink for the sentence itself, never for the narration that may cut it short
      const wordsOff = ()=>{ cancelAnimationFrame(syncRaf); wordEls.forEach(w => w.classList.remove("on")); cap.classList.remove("p2-speaking");
        const c = cap.querySelector(".tut-audio"); if(c) c.classList.remove("p2-chip-pulse"); };   // and the narration pulse, if a clip cut it short
      const setCue = (on)=>{ cueOn = on; cap.classList.toggle("p2-cue", on); };
      const scheduleCue = (ms)=>{ clearTimeout(cueTimer); if(heard) return; cueTimer = setTimeout(runCue, ms); };
      const runCue = ()=>{
        if(!alive() || heard) return;
        if(isPlaying){ scheduleCue(1500); return; }                    // never talk over a running clip
        setCue(true);
        play(cueSrc, ()=>{ setCue(false); if(alive() && !heard) scheduleCue(5000); });   // again after 5 s with no tap
      };
      // word-by-word highlight from the audio clock: each word's share of the clip is its character count (+ a beat)
      const syncWords = (a)=>{
        if(!a || !wordEls.length) return;
        const weights = wordEls.map(w => Math.max(1, (w.textContent || "").replace(/[।,!?\-]/g, "").length + 1.5));
        const total = weights.reduce((s, x)=> s + x, 0);
        const bounds = []; let acc = 0; weights.forEach(x => { acc += x; bounds.push(acc / total); });
        let cur = -1;
        const tick = ()=>{
          if(currentAudio !== a || a.ended) return;
          const dur = (isFinite(a.duration) && a.duration > 0) ? a.duration : (0.45 * wordEls.length + 0.5);
          const f = Math.min(0.999, a.currentTime / Math.max(0.1, dur - 0.25));
          let i = bounds.findIndex(b => f < b); if(i < 0) i = wordEls.length - 1;
          if(i !== cur){ cur = i; wordEls.forEach((w, k)=> w.classList.toggle("on", k === i)); }
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
        syncWords(currentAudio);
      };
      state.replayAudio = speakSentence;   // the speaker chip beside the pill (slide.caption_chip) speaks the sentence
      // [L02-SPK-CUE] the narration's "यह बटन दबाकर सुन सकते हैं" beat: from the moment the clip reaches data.chip_pulse_at
      // (seconds, measured on the clip by the build — 3.9 s into vo_help, where "यह बटन" starts) to the end of the clip the
      // speaker chip pulses, the same pulse as the cue. It is timed from the audio clock, so it lands on the words however late
      // the clip started; it stops with the clip, or at once when another clip cuts the narration short.
      const chipPulseAt = (typeof d.chip_pulse_at === "number") ? d.chip_pulse_at : null;
      let pulseRaf = 0;
      const chipEl = ()=> cap.querySelector(".tut-audio") || $("slideHost").querySelector(".tut-card .tut-audio");
      const setChipPulse = (on)=>{ const c = chipEl(); if(c) c.classList.toggle("p2-chip-pulse", on); };
      const armChipPulse = (a)=>{ cancelAnimationFrame(pulseRaf); setChipPulse(false); if(chipPulseAt === null || !a) return;
        const tick = ()=>{ if(currentAudio !== a || a.ended || !alive()){ setChipPulse(false); return; }
          if(a.currentTime >= chipPulseAt) setChipPulse(true);
          pulseRaf = requestAnimationFrame(tick); };
        pulseRaf = requestAnimationFrame(tick); };
      // [L02-NO-READ-INSTR] a page without a narration clip (pages 3-10: their "इस वाक्य को पढ़िए।" was removed from the card)
      // opens silently and runs straight into the same beat — the "tap here" cue 4 s in
      const promptSrc = audioFor(slide, "prompt") || null;
      const afterNarration = ()=>{ cancelAnimationFrame(pulseRaf); setChipPulse(false); setSwMood("point"); if(!alive()) return;
        scheduleCue(4000);   // 4 s after the narration (the reference spacing, kept; the picture's pop itself now comes after the sentence)
      };
      const narrate = ()=>{
        if(!alive()) return;
        clearTimeout(cueTimer); setCue(false); wordsOff();
        if(!promptSrc){ afterNarration(); return; }
        setSwMood("talk");
        play(promptSrc, afterNarration);
        armChipPulse(currentAudio);
      };
      // the header mascot repeats the narration on a tap (never while the chip cue is speaking), as the straddling bird did;
      // on a page with no narration there is nothing to repeat, so the mascot takes no tap there
      const mw = $("mascotWrap");
      if(mw){ mw.onclick = promptSrc ? ()=>{ if(cueOn) return; SwiftPAL.emit("audio_replay", { slide_id: slide.id, phase: slide.phase, src: "mascot" }); narrate(); } : null; }
      // the sentence sits on ONE line in the Figma bar: the type (the bar's 32px) is shrunk only for a line that would not fit
      const fitCaption = ()=>{ if(!alive()) return; let fs = parseFloat(getComputedStyle(cap).fontSize) || 32, guard = 16;
        while(guard-- > 0 && fs > 20 && cap.scrollWidth > cap.clientWidth + 1){ fs -= 1; cap.style.fontSize = fs + "px"; } };
      requestAnimationFrame(fitCaption);
      narrate();
    }
  },

