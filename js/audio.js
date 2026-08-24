/* ==========================================================================
   audio.js — micro (niveau, hauteur, silences), reconnaissance, synthèse, métronome
   Tout est natif navigateur : aucun service externe, aucun coût.
   ========================================================================== */

export const support = {
  mic: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
  recog: !!(window.SpeechRecognition || window.webkitSpeechRecognition),
  tts: !!window.speechSynthesis,
  rec: typeof MediaRecorder !== 'undefined',
};

/* ------------------------------ Détection de hauteur ------------------------------
   Autocorrélation NORMALISÉE (bornée à 1, sans biais en faveur des longs décalages),
   restreinte à la plage de la voix (70–400 Hz), avec correction d'erreur d'octave.
   Les sommes d'énergie sont obtenues par sommes préfixes : coût O(N) par décalage
   au lieu de O(3N), ce qui rend la mesure viable sur mobile.                     */
function detectPitch(buf, sr) {
  const N = buf.length;
  // sommes préfixes des carrés : P[k] = somme des x[i]^2 pour i < k
  const P = new Float32Array(N + 1);
  for (let i = 0; i < N; i++) P[i + 1] = P[i] + buf[i] * buf[i];
  const rms = Math.sqrt(P[N] / N);
  if (rms < 0.012) return 0;

  const minLag = Math.max(2, Math.floor(sr / 400));
  const maxLag = Math.min(N - 3, Math.floor(sr / 70));
  if (maxLag <= minLag + 2) return 0;

  const r = new Float32Array(maxLag + 2);
  for (let lag = minLag - 1; lag <= maxLag + 1; lag++) {
    if (lag < 1) continue;
    const lim = N - lag;
    let num = 0;
    for (let i = 0; i < lim; i++) num += buf[i] * buf[i + lag];
    const e1 = P[lim];            // énergie de x[0..lim)
    const e2 = P[N] - P[lag];     // énergie de x[lag..N)
    const den = Math.sqrt(e1 * e2);
    r[lag] = den > 1e-12 ? num / den : 0;
  }

  let best = 0, bestLag = -1;
  for (let lag = minLag; lag <= maxLag; lag++) if (r[lag] > best) { best = r[lag]; bestLag = lag; }
  if (bestLag < 0 || best < 0.4) return 0;

  // Correction d'octave : pour un signal périodique, la corrélation au double de la
  // période est presque aussi forte. On retient le plus petit décalage équivalent.
  const thr = best * 0.88;
  for (let lag = minLag + 1; lag < bestLag; lag++) {
    if (r[lag] >= thr && r[lag] > r[lag - 1] && r[lag] >= r[lag + 1]) { bestLag = lag; break; }
  }

  // interpolation parabolique autour du pic
  const y1 = r[bestLag - 1] || 0, y2 = r[bestLag], y3 = r[bestLag + 1] || 0;
  const d = y1 + y3 - 2 * y2;
  const shift = d ? (y1 - y3) / (2 * d) : 0;
  const f = sr / (bestLag + Math.max(-0.5, Math.min(0.5, shift)));
  return f > 60 && f < 500 ? f : 0;
}

export const hzToSemi = hz => 12 * Math.log2(hz / 110); // demi-tons au-dessus de A2

/* ------------------------------ Moteur micro ------------------------------ */
export class Mic {
  constructor(opts = {}) {
    this.silenceDb = opts.silenceDb ?? 0.035;   // seuil RMS de parole
    this.minPause = opts.minPause ?? 260;       // ms — en dessous, ce n'est pas une pause
    this.onFrame = opts.onFrame || (() => {});
    this.reset();
  }
  reset() {
    this.level = 0; this.smooth = 0; this.peak = 0; this.pitch = 0;
    this.levels = []; this.pitches = []; this.pauses = []; this.onsets = [];
    this.speaking = false; this.speakMs = 0; this.silenceMs = 0;
    this.t0 = 0; this.lastT = 0; this._segStart = 0; this._frames = 0;
  }
  async start() {
    if (!support.mic) throw new Error("Micro non disponible sur ce navigateur.");
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false },
    });
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    this.src = this.ctx.createMediaStreamSource(this.stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.55;
    this.src.connect(this.analyser);
    this.buf = new Float32Array(this.analyser.fftSize);
    this.freq = new Uint8Array(this.analyser.frequencyBinCount);
    this.reset();
    this.t0 = this.lastT = performance.now();
    this._segStart = this.t0;
    this.running = true;
    this._loop();
    if (support.rec) this._startRecorder();
    return this;
  }
  _startRecorder() {
    try {
      const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find(m => MediaRecorder.isTypeSupported(m));
      this.chunks = [];
      this.recorder = new MediaRecorder(this.stream, mime ? { mimeType: mime } : undefined);
      this.recorder.ondataavailable = e => e.data.size && this.chunks.push(e.data);
      this.recorder.start(1000);
    } catch { this.recorder = null; }
  }
  _loop() {
    if (!this.running) return;
    const now = performance.now();
    const dt = now - this.lastT; this.lastT = now;

    this.analyser.getFloatTimeDomainData(this.buf);
    this.analyser.getByteFrequencyData(this.freq);

    let e = 0;
    for (let i = 0; i < this.buf.length; i++) e += this.buf[i] * this.buf[i];
    const rms = Math.sqrt(e / this.buf.length);
    this.level = rms;
    this.smooth = this.smooth * 0.72 + rms * 0.28;
    this.peak = Math.max(this.peak * 0.995, rms);
    this.levels.push(rms);

    // hauteur : 1 frame sur 3 (coût CPU)
    if (this._frames++ % 4 === 0) {
      const p = detectPitch(this.buf.subarray(0, 1024), this.ctx.sampleRate);
      this.pitch = p;
      if (p) this.pitches.push({ t: now - this.t0, hz: p });
    }

    // segmentation parole / silence
    const isSpeech = rms > this.silenceDb;
    if (isSpeech) {
      this.speakMs += dt;
      if (!this.speaking) {
        const dur = now - this._segStart;
        if (dur >= this.minPause) this.pauses.push({ at: this._segStart - this.t0, dur });
        this.onsets.push(now - this.t0);
        this.speaking = true; this._segStart = now;
      }
    } else {
      this.silenceMs += dt;
      if (this.speaking) { this.speaking = false; this._segStart = now; }
    }

    this.onFrame(this);
    this._raf = requestAnimationFrame(() => this._loop());
  }
  /** niveau 0..1 lissé et compressé pour l'affichage */
  get norm() { return Math.min(1, Math.pow(this.smooth / 0.28, 0.65)); }
  get elapsed() { return this.t0 ? (performance.now() - this.t0) / 1000 : 0; }
  /** spectre réduit à n barres, 0..1 */
  bars(n = 32) {
    const out = new Array(n).fill(0);
    if (!this.freq) return out;
    const usable = Math.floor(this.freq.length * 0.42);
    for (let i = 0; i < n; i++) {
      const a = Math.floor((i / n) ** 1.4 * usable), b = Math.max(a + 1, Math.floor(((i + 1) / n) ** 1.4 * usable));
      let m = 0; for (let j = a; j < b; j++) m = Math.max(m, this.freq[j]);
      out[i] = m / 255;
    }
    return out;
  }
  async stop() {
    this.running = false;
    cancelAnimationFrame(this._raf);
    // referme un éventuel segment de parole en cours
    if (this.speaking) this.speakMs += 0;
    let blob = null;
    if (this.recorder && this.recorder.state !== 'inactive') {
      blob = await new Promise(res => {
        this.recorder.onstop = () => res(this.chunks.length ? new Blob(this.chunks, { type: this.recorder.mimeType }) : null);
        try { this.recorder.stop(); } catch { res(null); }
      });
    }
    this.stream?.getTracks().forEach(t => t.stop());
    try { await this.ctx?.close(); } catch {}
    return { blob, snapshot: this.snapshot() };
  }
  snapshot() {
    return {
      duration: this.elapsed,
      speakMs: this.speakMs, silenceMs: this.silenceMs,
      levels: this.levels.slice(), pitches: this.pitches.slice(), pauses: this.pauses.slice(),
      onsets: this.onsets.slice(),
      peak: this.peak,
    };
  }
}

/* ------------------------------ Reconnaissance vocale ------------------------------ */
export class Recognizer {
  constructor({ lang = 'fr-FR', onUpdate = () => {}, onEnd = () => {} } = {}) {
    this.lang = lang; this.onUpdate = onUpdate; this.onEnd = onEnd;
    this.final = ''; this.interim = ''; this.wantRunning = false; this.errors = [];
    this.fatal = null; this._fails = 0; this._startedAt = 0;
  }
  get available() { return support.recog; }
  start() {
    if (!support.recog) return false;
    const R = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.r = new R();
    this.r.lang = this.lang;
    this.r.continuous = true;
    this.r.interimResults = true;
    this.r.maxAlternatives = 1;
    this.final = ''; this.interim = ''; this.wantRunning = true;
    this.fatal = null; this._fails = 0;
    this.r.onstart = () => { this._startedAt = performance.now(); };
    this.r.onresult = e => {
      let itm = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) this.final += (this.final ? ' ' : '') + res[0].transcript.trim();
        else itm += res[0].transcript;
      }
      this.interim = itm;
      this.onUpdate(this.final, this.interim);
    };
    this.r.onerror = e => {
      this.errors.push(e.error);
      // erreurs définitives : inutile d'insister
      if (['not-allowed', 'service-not-allowed', 'audio-capture', 'language-not-supported'].includes(e.error)) {
        this.wantRunning = false; this.fatal = e.error;
      }
    };
    // Relance automatique (le service coupe toutes les ~60 s) MAIS avec repli exponentiel :
    // sans ce garde-fou, un service indisponible provoque une boucle de redémarrage qui gèle l'onglet.
    this.r.onend = () => {
      if (!this.wantRunning) { this.onEnd(this.text); return; }
      const alive = performance.now() - this._startedAt;
      this._fails = alive < 400 ? this._fails + 1 : 0;
      if (this._fails >= 5) {
        this.wantRunning = false; this.fatal = 'unstable';
        this.onEnd(this.text); return;
      }
      const delay = this._fails ? Math.min(2500, 200 * 2 ** this._fails) : 80;
      this._retry = setTimeout(() => {
        if (!this.wantRunning) return;
        try { this.r.start(); } catch { this.wantRunning = false; this.fatal = 'start-failed'; }
      }, delay);
    };
    try { this.r.start(); return true; } catch { return false; }
  }
  stop() {
    this.wantRunning = false;
    clearTimeout(this._retry);
    try { this.r?.abort?.(); } catch {}
    try { this.r?.stop(); } catch {}
    return this.text;
  }
  get text() { return (this.final + ' ' + this.interim).trim(); }
}

/* ------------------------------ Synthèse (modèle à écouter) ------------------------------ */
let voices = [];
function loadVoices() { voices = window.speechSynthesis?.getVoices?.() || []; }
if (support.tts) { loadVoices(); window.speechSynthesis.onvoiceschanged = loadVoices; }

export function speak(text, { lang = 'fr-FR', rate = 0.92, pitch = 1 } = {}) {
  if (!support.tts) return false;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang; u.rate = rate; u.pitch = pitch;
  if (!voices.length) loadVoices();
  const v = voices.find(x => x.lang?.replace('_', '-') === lang && x.localService)
         || voices.find(x => x.lang?.replace('_', '-') === lang)
         || voices.find(x => x.lang?.startsWith(lang.slice(0, 2)));
  if (v) u.voice = v;
  window.speechSynthesis.speak(u);
  return true;
}
export const stopSpeaking = () => support.tts && window.speechSynthesis.cancel();

/* ------------------------------ Métronome / clics ------------------------------ */
export class Metronome {
  constructor(bpm = 90) { this.bpm = bpm; this.on = false; this.beat = 0; this.onBeat = () => {}; }
  async start(bpm = this.bpm) {
    this.bpm = bpm;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = this.ctx || new AC();
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    this.on = true; this.beat = 0;
    this.next = this.ctx.currentTime + 0.12;
    this._tick();
  }
  _tick() {
    if (!this.on) return;
    const spb = 60 / this.bpm;
    while (this.next < this.ctx.currentTime + 0.18) {
      this._click(this.next, this.beat % 4 === 0);
      const b = this.beat;
      const delay = Math.max(0, (this.next - this.ctx.currentTime) * 1000);
      setTimeout(() => this.on && this.onBeat(b), delay);
      this.beat++; this.next += spb;
    }
    this._t = setTimeout(() => this._tick(), 60);
  }
  _click(when, strong) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.frequency.value = strong ? 1180 : 820;
    o.type = 'square';
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(strong ? 0.14 : 0.07, when + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.055);
    o.connect(g).connect(this.ctx.destination);
    o.start(when); o.stop(when + 0.07);
  }
  setBpm(b) { this.bpm = b; }
  stop() { this.on = false; clearTimeout(this._t); }
}

/* ------------------------------ Petits sons d'interface ------------------------------ */
let uiCtx = null;
export function blip(kind = 'ok') {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    uiCtx = uiCtx || new AC();
    const t = uiCtx.currentTime;
    const seq = kind === 'ok' ? [[660, 0], [880, .09]]
              : kind === 'win' ? [[660, 0], [880, .08], [1320, .16]]
              : kind === 'bad' ? [[300, 0], [220, .1]]
              : [[520, 0]];
    for (const [f, d] of seq) {
      const o = uiCtx.createOscillator(), g = uiCtx.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t + d);
      g.gain.exponentialRampToValueAtTime(0.09, t + d + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.16);
      o.connect(g).connect(uiCtx.destination); o.start(t + d); o.stop(t + d + 0.18);
    }
  } catch {}
}
export function haptic(ms = 12) { try { navigator.vibrate?.(ms); } catch {} }
