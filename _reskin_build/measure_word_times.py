"""[L02-READ-ALOUD] Measure where each word starts in the story clips -> word_times.json (read by build.py into card data.word_times;
story_read_page.js lights word k while times[k] <= currentTime < times[k+1], the reference lesson's WORD_TIMES rule).

Method: faster-whisper (CPU, int8) transcribes the clip with word timestamps; its words are matched to the card's words in order
(the voice may spell differently - matching is by count, then by letters where a word was split or merged); every start is then
snapped to the energy envelope where the word begins with a stop / affricate consonant (the closure before it is a clear dip: the
start is where the energy comes back) within +-90 ms. Where the recognizer's word count cannot be reconciled, the clip falls back
to build.py's envelope-only measurement. `--validate` runs the same method on the reference lesson's recordings and prints the
difference to its hand-measured tables (#P2-BIRD-POP-JS WORD_TIMES_*), so a change of model or rule can be judged.

    python _reskin_build/measure_word_times.py [--model small|medium|large-v3] [--validate]

then `python _reskin_build/build.py`. Needs: pip install faster-whisper (downloads the model once). Entries written here are keyed by
clip id with the clip's md5 and words; a hand-corrected entry ("measured": "hand") is left alone.

STATUS 2026-10-03: written but NOT yet run or validated — the model download (huggingface CDN, 483 MB) delivered no bytes from this
network. The shipped word_times.json entries are build.py's envelope-only measurement (0.13 s mean error against the reference's hand
tables). Run `--validate` first; adopt this method only if its mean error is clearly lower."""
import os, re, sys, json, math, struct, hashlib, subprocess, argparse

SCR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(SCR)
CUR = os.path.join(ROOT, "HI02H04_L02_S01_dist")
WT_PATH = os.path.join(SCR, "word_times.json")
REF_AUDIO = r"C:\Users\25606\OneDrive\FLN @ CG\Suresh's File\HI02H04_L01_S01-20260916T080241Z-1-001\HI02H04_L01_S01\assets\Audio"
STOPS = set("कखगघचछजझटठडढतथदधपफबभ")
PUNCT = re.compile(r"[\u0964\u0965,!?\-\u2013\u2014.;:\"'()]+")
SR, HOP, WIN = 16000, 0.005, 0.020

def pcm(path):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True)
    return r.stdout

def envelope_db(path):
    x = struct.unpack("<%df" % (len(pcm(path)) // 4), pcm(path)); h, w = int(SR * HOP), int(SR * WIN)
    e = [10 * math.log10(sum(v * v for v in x[i:i + w]) / w + 1e-12) for i in range(0, max(1, len(x) - w), h)]
    return [sum(e[max(0, i - 2):min(len(e), i + 3)]) / (min(len(e), i + 3) - max(0, i - 2)) for i in range(len(e))]

def speech_span(env):
    n = len(env); peak = max(env); floor = sorted(env)[max(0, int(0.05 * n))]; thr = max(floor + 12, peak - 38)
    on = next(i for i in range(n) if env[i] > thr); off = next(i for i in range(n - 1, -1, -1) if env[i] > thr)
    return on, off

def snap_to_release(env, p, radius=0.09, min_depth=8.0):
    """The nearest clear dip around frame p (a closure) -> the frame where the energy comes back (6 dB over the dip); else p."""
    n = len(env); r = int(radius / HOP); lo, hi = max(1, p - r), min(n - 2, p + r)
    if hi <= lo: return p
    best = min(range(lo, hi + 1), key=lambda i: env[i] + 2.0 * abs(i - p) / max(1, r))
    before = max(env[max(0, best - int(0.12 / HOP)):best] or [env[best]]); after = max(env[best:min(n, best + int(0.12 / HOP))] or [env[best]])
    if min(before, after) - env[best] < min_depth: return p
    for i in range(best, min(n, best + int(0.12 / HOP))):
        if env[i] >= env[best] + 6: return i
    return best

_model = None
def whisper_words(path, model_name):
    global _model
    from faster_whisper import WhisperModel
    if _model is None: _model = WhisperModel(model_name, device="cpu", compute_type="int8")
    segs, _ = _model.transcribe(path, language="hi", word_timestamps=True, beam_size=5, condition_on_previous_text=False,
                                vad_filter=False, temperature=0.0)
    out = []
    for s in segs:
        for w in (s.words or []): out.append((w.start, w.end, w.word.strip()))
    return out

def clean(s): return PUNCT.sub("", s).replace(" ", "")

def align(words, toks):
    """Our words -> (start, end) from the recognizer's tokens: one-to-one when the counts agree; otherwise tokens are merged /
    our words grouped by letter counts (the recognizer's spelling may differ, so lengths, not letters, decide). None if hopeless."""
    if not toks: return None
    if len(toks) == len(words): return [(s, e) for s, e, _ in toks]
    # merge tokens greedily by the length of each of our words
    res = []; i = 0; total_t = sum(len(clean(t[2])) for t in toks); total_w = sum(len(clean(w)) for w in words)
    if total_t == 0 or total_w == 0: return None
    scale = total_t / total_w
    for w in words:
        need = len(clean(w)) * scale; got = 0; st = None; en = None
        while i < len(toks) and (st is None or got + len(clean(toks[i][2])) / 2 < need):
            s, e, tx = toks[i]; i += 1
            if st is None: st = s
            en = e; got += len(clean(tx))
        if st is None: return None
        res.append((st, en))
    if i < len(toks): res[-1] = (res[-1][0], toks[-1][1])
    return res

def measure(path, words, model_name, verbose=True):
    env = envelope_db(path); on, off = speech_span(env)
    toks = whisper_words(path, model_name)
    al = align(words, toks)
    if al is None:
        if verbose: print("   recognizer words do not line up (%r) - envelope fallback" % [t[2] for t in toks])
        return None, [t[2] for t in toks]
    bounds = [on]; last = on; notes = []
    for k in range(1, len(words)):
        p = int(round(al[k][0] / HOP)); p = max(p, last + int(0.08 / HOP)); note = "asr"
        if words[k] and words[k][0] in STOPS:
            q = snap_to_release(env, p)
            if q != p: note = "asr+dip"; p = max(q, last + int(0.08 / HOP))
        bounds.append(p); last = p; notes.append(note)
    bounds.append(max(off + int(0.02 / HOP), last + int(0.08 / HOP)))
    times = [round(i * HOP, 2) for i in bounds]
    if verbose: print("   ->", " | ".join("%s %.2f%s" % (w, t, "" if j == 0 else " (" + notes[j - 1] + ")") for j, (w, t) in enumerate(zip(words, times))), "| end %.2f" % times[-1], "| asr:", " ".join(t[2] for t in toks))
    return times, [t[2] for t in toks]

REF_TABLES = {
    "vo_sent_children_sit_ok": ("बच्चे मैदान में बैठे हैं।", [0.27, 0.69, 1.11, 1.55, 1.94, 2.09]),
    "vo_sent_cat_ok":          ("बिल्ली दूध पी रही है।", [0.26, 0.83, 1.21, 1.35, 1.62, 1.79]),
    "vo_sent_mom_ok":          ("माँ अखबार पढ़ रही है।", [0.29, 1.00, 1.56, 1.73, 2.05, 2.25]),
    "vo_sent_boy_fill_ok":     ("लड़का पानी भर रहा है।", [0.29, 0.95, 1.29, 1.50, 1.81, 1.96]),
    "vo_sent_cat_sleep_ok":    ("बिल्ली सो रही है।", [0.27, 0.76, 1.08, 1.36, 1.54]),
    "vo_sent_children_ball":   ("बच्चे गेंद से खेल रहे हैं।", [0.29, 0.98, 1.32, 1.52, 1.79, 2.07, 2.29]),
    "vo_sent_grandpa_newspaper": ("दादाजी अखबार पढ़ रहे हैं", [0.28, 0.80, 1.18, 1.37, 1.82, 2.45]),
}

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--model", default="small"); ap.add_argument("--validate", action="store_true"); a = ap.parse_args()
    if a.validate:
        errs = []
        for clip, (sent, ref) in REF_TABLES.items():
            p = os.path.join(REF_AUDIO, clip + ".ogg")
            if not os.path.exists(p): print(clip, "missing"); continue
            print(clip, sent, "| ref:", " ".join("%.2f" % v for v in ref))
            t, _ = measure(p, sent.split(), a.model)
            if t: d = [round(x - y, 2) for x, y in zip(t, ref)]; print("   diff (mine - ref):", d); errs += [abs(x) for x in d[1:-1]]
        if errs: print("mean |diff| of inner word starts: %.3f s, max %.2f s" % (sum(errs) / len(errs), max(errs)))
        return
    html = open(os.path.join(CUR, "index.html"), encoding="utf-8").read()
    card = json.loads(re.search(r'<script type="application/json" id="cardData">(.*?)</script>', html, re.S).group(1))
    cache = json.load(open(WT_PATH, encoding="utf-8")) if os.path.exists(WT_PATH) else {}
    for s in card["slides"]:
        if s["type"] != "STORY_READ_PAGE": continue
        d = s["data"]; words = [w["text"] for w in d["words"]]; clip = d["whole_audio"]
        p = os.path.join(CUR, card["assets"]["audio"][clip]); md5 = hashlib.md5(open(p, "rb").read()).hexdigest()
        e = cache.get(clip)
        if isinstance(e, dict) and e.get("measured") == "hand" and e.get("md5") == md5 and e.get("words") == words:
            print(s["id"], clip, "hand-corrected entry kept"); continue
        print(s["id"], clip, " ".join(words))
        times, asr = measure(p, words, a.model)
        if times is None: continue      # build.py measures it by the envelope
        cache[clip] = {"words": words, "md5": md5, "times": times, "measured": "faster-whisper %s + stop-closure snap" % a.model, "asr": " ".join(asr)}
    with open(WT_PATH, "w", encoding="utf-8", newline="\n") as f: json.dump(cache, f, ensure_ascii=False, indent=1)
    print("wrote", WT_PATH, "- now run build.py")

if __name__ == "__main__": main()
