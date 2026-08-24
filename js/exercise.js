/* ==========================================================================
   exercise.js — moteur d'exercices plein écran : déroulé, mesures, notation
   ========================================================================== */
import { TWISTERS, TEXTS, PAIRS, DRILLS, TOPICS, WARMUPS, byId } from './content.js';
import * as store from './store.js';
import { Mic, Recognizer, Metronome, speak, stopSpeaking, support, blip, haptic } from './audio.js';
import * as A from './analysis.js';
import { $, esc, md, icon, clamp, toast, metric, Viz } from './ui.js';

const stage = () => document.getElementById('stage');
let S = null;                 // session courante
const MYTEXT = 'clair.mytext';

/* ------------------------------ outils ------------------------------ */
const rnd = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(x => x[1]);
function charDist(a, b) {
  a = a.toLowerCase(); b = b.toLowerCase();
  const m = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) m[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return m[a.length][b.length];
}
/** Moyenne pondérée ignorant les composantes non mesurables (null).
    Le score est PLAFONNÉ selon la part de critères réellement mesurés : sans cela, une prise
    dont on n'a pu évaluer qu'un ou deux aspects faciles décrocherait un « Excellent » immérité. */
function mixAvail(parts) {
  const ok = parts.filter(p => p.v != null && !Number.isNaN(p.v));
  const total = parts.reduce((a, p) => a + p.w, 0) || 1;
  if (!ok.length) return { score: 45, partial: true, coverage: 0 };
  const tw = ok.reduce((a, p) => a + p.w, 0);
  let score = ok.reduce((a, p) => a + clamp(p.v, 0, 100) * p.w, 0) / tw;
  const coverage = tw / total;
  if (coverage < 0.995) score = Math.min(score, 55 + 40 * coverage);
  return { score, partial: coverage < 0.995, coverage };
}
const vibrate = n => store.get().settings.haptics && haptic(n);
const sfx = k => store.get().settings.sound && blip(k);

/* ==========================================================================
   HANDLERS — un objet par type d'exercice
   Contrat :
     brief(S)        → HTML des options (facultatif)
     readOpts(S)     → lit les options du DOM dans S.params
     needs           → { mic, recog }
     rounds(S)       → nombre de manches
     roundHead(S)    → texte d'entête de manche
     live(S)         → HTML de la zone active (par manche)
     tick(S)         → mise à jour 60 fps
     done(S)         → true pour arrêter la manche automatiquement
     endRound(S,r)   → résultat de manche
     finish(S)       → { score, metrics, tips, cards, skills? }
   ========================================================================== */
const H = {};

/* ------------------------------ 1. Échauffements guidés ------------------------------ */
H.guided = {
  needs: { mic: false, recog: false },
  brief: S => {
    const w = WARMUPS.find(x => x.id === S.ex.data.warmup);
    return `<div class="card stack g12"><div class="row"><b class="grow">${w.steps.length} étapes</b>
      <span class="chip">${Math.round(w.dur / 60)} min</span></div>
      <div class="steps">${w.steps.map((s, i) => `<div class="step"><span class="n">${i + 1}</span>
        <span class="grow"><b>${esc(s.t)}</b><div class="small muted">${esc(s.d)}</div></span>
        <span class="tiny dim">${s.s}s</span></div>`).join('')}</div></div>`;
  },
  live: S => {
    S.w = WARMUPS.find(x => x.id === S.ex.data.warmup);
    S.step = 0; S.stepT0 = performance.now();
    return `<div class="stack g16">
      <div class="viz"><canvas id="vz"></canvas>
        <div class="cta"><div class="n" id="cd">${S.w.steps[0].s}</div><div class="u">seconde(s)</div></div></div>
      <div class="card stack g8"><div class="row"><span class="chip on" id="stepn">Étape 1/${S.w.steps.length}</span>
        <span class="grow"></span><button class="btn btn-sm btn-ghost" data-act="skipstep">Suivant ${icon('chevron')}</button></div>
        <h2 id="stept">${esc(S.w.steps[0].t)}</h2>
        <p class="muted" id="stepd" style="font-size:15px;line-height:1.55">${esc(S.w.steps[0].d)}</p></div>
      <div class="bar"><i id="gbar" style="width:0%"></i></div></div>`;
  },
  tick: S => {
    const st = S.w.steps[S.step];
    const el = (performance.now() - S.stepT0) / 1000;
    const left = Math.max(0, Math.ceil(st.s - el));
    const cd = $('#cd'); if (cd) cd.textContent = left;
    const totalBefore = S.w.steps.slice(0, S.step).reduce((a, x) => a + x.s, 0);
    const total = S.w.steps.reduce((a, x) => a + x.s, 0);
    const gb = $('#gbar'); if (gb) gb.style.width = `${clamp((totalBefore + Math.min(el, st.s)) / total, 0, 1) * 100}%`;
    if (S.viz) S.viz.draw({ mode: 'ring', level: S.mic ? S.mic.norm : 0.18 + 0.12 * Math.sin(performance.now() / 900), progress: clamp(el / st.s, 0, 1) });
    if (el >= st.s) H.guided.next(S);
  },
  next: S => {
    if (S.step >= S.w.steps.length - 1) { S.stopReason = 'auto'; return finishRound(); }
    S.step++; S.stepT0 = performance.now(); sfx('ok'); vibrate(18);
    $('#stepn').textContent = `Étape ${S.step + 1}/${S.w.steps.length}`;
    $('#stept').textContent = S.w.steps[S.step].t;
    $('#stepd').textContent = S.w.steps[S.step].d;
  },
  finish: S => {
    const done = S.step + 1, total = S.w.steps.length;
    const planned = S.w.steps.reduce((a, x) => a + x.s, 0);
    const timeRatio = clamp(S.elapsed / planned, 0, 1);
    // un échauffement expédié ne vaut pas un échauffement fait : le temps réel compte double
    const score = Math.round(clamp(20 + 55 * timeRatio + 25 * (done / total), 0, 100));
    const tips = [];
    if (timeRatio > .85) tips.push({ kind: 'good', text: "Échauffement mené jusqu'au bout. Ta voix est prête : enchaîne maintenant sur un exercice mesuré, tu y gagneras 5 à 10 points." });
    else if (timeRatio > .4) tips.push({ kind: 'work', text: `Tu as tenu ${Math.round(timeRatio * 100)} % du temps prévu. Les étapes de souffle demandent la durée annoncée pour agir : c'est physiologique, pas symbolique.` });
    else tips.push({ kind: 'work', text: "Échauffement survolé. Refais-le en respectant les minuteurs : c'est cet exercice qui rend tous les autres plus faciles." });
    tips.push({ kind: 'good', text: "Cet exercice ne modifie pas tes compétences mesurées : c'est une **préparation**, pas une évaluation. Il compte pour ta série et ton niveau." });
    return {
      score,
      metrics: { steps: done, total, seconds: Math.round(S.elapsed) },
      cards: [metric('Étapes', `${done}/${total}`), metric('Durée', A.fmtTime(S.elapsed), '', `prévu ${A.fmtTime(planned)}`, A.gradeClass(timeRatio * 100))],
      tips,
    };
  },
};

/* ------------------------------ 2. Virelangues ------------------------------ */
H.twister = {
  needs: { mic: true, recog: true },
  brief: S => {
    const pool = TWISTERS;
    S.params.pick = S.params.pick ?? Math.floor(Math.random() * pool.length);
    const t = pool[S.params.pick];
    return `<div class="card stack g12">
      <div class="row"><span class="chip">Difficulté ${'●'.repeat(t.d)}${'○'.repeat(3 - t.d)}</span>
        <span class="chip">sons : ${esc(t.f)}</span><span class="grow"></span>
        <button class="btn btn-sm btn-ghost" data-act="reroll">${icon('refresh')}</button></div>
      <div class="script lg" id="twt">${esc(t.t)}</div>
      <div class="row"><button class="btn btn-sm btn-ghost" data-act="listen" data-text="${esc(t.t)}">${icon('sound')} Écouter le modèle</button></div>
      <p class="small dim">3 passages. Le 1ᵉʳ lentement et sans faute, le 2ᵉ au tempo naturel, le 3ᵉ le plus vite possible en gardant la netteté.</p></div>`;
  },
  readOpts: S => { S.ref = TWISTERS[S.params.pick].t; },
  rounds: () => 3,
  roundHead: S => ['Passage 1 · lentement, zéro faute', 'Passage 2 · tempo naturel', 'Passage 3 · vite et net'][S.round],
  live: S => `<div class="stack g16">
      <div class="viz"><canvas id="vz"></canvas><div class="cta">
        <div class="n" id="wc">0</div><div class="u">mots reconnus</div></div></div>
      <div class="script lg" id="scr">${wordsHtml(S.ref)}</div>
      <div class="transcript" id="tr"></div></div>`,
  tick: S => { liveScript(S); vizRing(S); },
  endRound: S => {
    const hyp = A.words(S.transcript), ref = A.words(S.ref);
    const al = A.align(ref, hyp);
    const spoken = roundSpeakSec(S);
    const w = A.wpm(hyp.length, Math.max(0.8, spoken));
    return { accuracy: al.accuracy, wpm: w, marks: al.marks, hyp: hyp.length, seconds: S.elapsed, hasRecog: S.recogOk };
  },
  finish: S => {
    const rs = S.rounds;
    const best = rs.reduce((a, b) => (b.accuracy > a.accuracy ? b : a), rs[0]);
    const fastClean = rs.filter(r => r.accuracy >= 88).map(r => r.wpm);
    const speed = fastClean.length ? Math.max(...fastClean) : 0;
    const accAvg = rs.reduce((a, r) => a + r.accuracy, 0) / rs.length;
    const m = A.audioMetrics(S.snap);
    const parts = [
      { v: S.recogOk ? accAvg : null, w: 3.2, k: 'Précision' },
      { v: S.recogOk ? A.upScore(speed, 90, 230) : null, w: 1.6, k: 'Vitesse nette' },
      { v: A.downScore(m.volCv, 0.3, 0.75), w: .6, k: 'Stabilité' },
    ];
    const { score, partial, coverage } = mixAvail(parts);
    const tips = A.coachTips({ ...m, wpm: best.wpm }, { kind: 'twister', refWords: A.words(S.ref).length, accuracy: S.recogOk ? accAvg : null });
    if (S.recogOk && speed > 0 && speed < 130)
      tips.unshift({ kind: 'work', text: "Ta meilleure prise propre reste lente. Le progrès vient en montant la vitesse **par paliers de 10 %**, jamais d'un coup." });
    if (S.recogOk && rs[2] && rs[2].accuracy < rs[0].accuracy - 12)
      tips.unshift({ kind: 'work', text: "La netteté s'écroule quand tu accélères : c'est le signe que le mouvement n'est pas encore automatique. Reste au tempo du passage 2 pendant quelques jours." });
    return {
      score, partial, coverage,
      metrics: { accuracy: Math.round(accAvg), wpm: Math.round(best.wpm), speed: Math.round(speed) },
      cards: [
        metric('Précision moy.', S.recogOk ? Math.round(accAvg) : '—', '%', '', A.gradeClass(accAvg)),
        metric('Meilleure prise', S.recogOk ? Math.round(best.accuracy) : '—', '%'),
        metric('Vitesse nette', speed ? Math.round(speed) : '—', 'mpm', 'Passage le plus rapide avec ≥88 % de précision'),
      ],
      detail: S.recogOk ? `<div class="card stack g8"><div class="tiny dim">Dernier passage · mots manqués en rouge</div>
        <div class="script">${marksHtml(S.ref, rs[rs.length - 1].marks)}</div></div>` : '',
    };
  },
};

/* ------------------------------ 3. Lecture / débit / expressif / téléprompteur --------- */
const readLike = (variant) => ({
  needs: { mic: true, recog: true },
  brief: S => {
    if (variant === 'prompter') {
      const saved = localStorage.getItem(MYTEXT) || '';
      return `<div class="card stack g12"><div class="field">
        <label>Ton texte (présentation, pitch, discours…)</label>
        <textarea id="mytext" placeholder="Colle ici le texte que tu veux travailler. 80 à 250 mots est l'idéal pour une prise.">${esc(saved)}</textarea></div>
        <div class="row"><label class="tiny dim grow">Vitesse de défilement</label>
          <span class="chip mono" id="spdv">150 mpm</span></div>
        <input type="range" id="spd" min="90" max="220" step="5" value="150">
        <p class="small dim">Le texte défile tout seul. Si tu décroches, ce n'est pas grave : on mesure ta lecture réelle, pas le défilement.</p></div>`;
    }
    const opts = TEXTS;
    if (S.ex.data?.custom) return `<div class="card stack g12"><div class="script">${esc(S.ex.data.custom)}</div>
      <div class="row"><button class="btn btn-sm btn-ghost" data-act="listen" data-text="${esc(S.ex.data.custom)}">${icon('sound')} Écouter</button></div></div>`;
    S.params.pick = S.params.pick ?? 0;
    return `<div class="card stack g12">
      <div class="hscroll" style="margin:0;padding:0">${opts.map((t, i) =>
        `<button class="chip ${i === S.params.pick ? 'on' : ''}" data-act="pick" data-i="${i}">${esc(t.title)}</button>`).join('')}</div>
      <div class="script" id="txtprev" style="font-size:17px">${esc(opts[S.params.pick].t)}</div>
      <div class="row"><span class="tiny dim grow">${esc(opts[S.params.pick].src)} · ${A.words(opts[S.params.pick].t).length} mots</span>
        <button class="btn btn-sm btn-ghost" data-act="listen" data-text="${esc(opts[S.params.pick].t.slice(0, 240))}">${icon('sound')} Écouter</button></div>
      ${variant === 'pace' ? `<div class="sep"></div><div class="row"><label class="tiny dim grow">Débit cible</label>
        <span class="chip mono" id="tgv">${S.params.target || 150} mots/min</span></div>
      <input type="range" id="tg" min="110" max="200" step="5" value="${S.params.target || 150}">` : ''}
      ${variant === 'expressive' ? `<p class="small dim">Consigne : donne une intention à chaque phrase. Fais entendre la ponctuation.</p>` : ''}</div>`;
  },
  readOpts: S => {
    if (variant === 'prompter') {
      const t = ($('#mytext')?.value || '').trim();
      if (A.words(t).length < 12) { toast("Colle un texte d'au moins 12 mots"); return false; }
      localStorage.setItem(MYTEXT, t);
      S.ref = t; S.params.speed = +($('#spd')?.value || 150);
      return true;
    }
    S.ref = S.ex.data?.custom || TEXTS[S.params.pick].t;
    if (variant === 'pace') S.params.target = +($('#tg')?.value || S.ex.data?.target || 150);
    return true;
  },
  live: S => {
    const gauge = variant === 'pace' ? `
      <div class="stack g8"><div class="gauge" id="gg">
        <div class="zone" id="gz"></div><div class="cur" id="gc" style="left:50%"></div>
        <div class="lbl" id="gl">— mots/min</div></div>
        <div class="row tiny dim"><span>lent</span><span class="grow center" style="text-align:center">cible ${S.params.target}</span><span>rapide</span></div></div>` : '';
    const script = variant === 'prompter'
      ? `<div class="script prompter" id="pr"><div class="inner" id="pri">${wordsHtml(S.ref)}</div></div>`
      : `<div class="script" id="scr">${wordsHtml(S.ref)}</div>`;
    return `<div class="stack g16">
      ${variant === 'pace' ? gauge : `<div class="viz" style="max-width:190px"><canvas id="vz"></canvas>
        <div class="cta"><div class="n" id="wc">0</div><div class="u">mots</div></div></div>`}
      ${script}
      <div class="transcript" id="tr"></div></div>`;
  },
  tick: S => {
    liveScript(S);
    if (variant === 'prompter') {
      const el = $('#pri'), box = $('#pr');
      if (el && box) {
        const totalW = A.words(S.ref).length;
        const secs = (totalW / S.params.speed) * 60;
        const p = clamp(S.elapsed / Math.max(4, secs), 0, 1);
        const over = Math.max(0, el.scrollHeight - box.clientHeight);
        el.style.transform = `translateY(${-over * p}px)`;
      }
    }
    if (variant === 'pace') {
      const w = liveWpm(S);
      const g = $('#gg'), z = $('#gz'), c = $('#gc'), l = $('#gl');
      if (g && z) {
        const lo = 80, hi = 240, pos = v => clamp((v - lo) / (hi - lo), 0, 1) * 100;
        const t = S.params.target, tol = S.ex.data?.tol || 15;
        z.style.left = pos(t - tol) + '%'; z.style.width = (pos(t + tol) - pos(t - tol)) + '%';
        if (w) { c.style.left = pos(w) + '%'; l.textContent = `${Math.round(w)} mots/min`; l.style.color = Math.abs(w - t) <= tol ? '#6ee7b7' : ''; }
      }
    } else vizRing(S);
  },
  finish: S => {
    const hyp = A.words(S.transcript), ref = A.words(S.ref);
    const al = S.recogOk ? A.align(ref, hyp) : null;
    const m = A.audioMetrics(S.snap);
    const spoken = Math.max(1, m.speakSec || S.elapsed);
    const w = S.recogOk ? A.wpm(hyp.length, spoken) : null;
    const fill = S.recogOk ? A.findFillers(S.transcript) : null;
    const target = variant === 'pace' ? S.params.target : null;
    const [lo, hi] = target ? [target - 15, target + 15] : A.REF.wpmRead;
    const paceV = w ? A.bandScore(w, lo, hi, 55) : null;
    const pauseV = A.bandScore(m.silenceRatio, ...A.REF.silence, 0.24) * 0.7 +
                   A.bandScore(m.pausesPerMin, ...A.REF.pausesPerMin, 14) * 0.3;
    const prosoV = A.upScore(m.pitchSd, 0.7, 3.2);   // parole expressive : écart-type 2–4 demi-tons
    const stabV = A.downScore(m.volCv, 0.3, 0.78);
    const accV = al ? al.accuracy : null;

    const W = {
      read:       [{ v: accV, w: 3 }, { v: paceV, w: 2.2 }, { v: pauseV, w: 1.6 }, { v: prosoV, w: .9 }, { v: stabV, w: .8 }],
      pace:       [{ v: paceV, w: 4.2 }, { v: accV, w: 1.4 }, { v: pauseV, w: 1.2 }, { v: prosoV, w: .7 }, { v: stabV, w: .8 }],
      expressive: [{ v: prosoV, w: 3.4 }, { v: pauseV, w: 1.8 }, { v: accV, w: 1.6 }, { v: stabV, w: .8 }],
      prompter:   [{ v: paceV, w: 2 }, { v: prosoV, w: 1.8 }, { v: pauseV, w: 1.6 }, { v: accV, w: 1.4 }, { v: stabV, w: 1 }],
    }[variant];
    const { score, partial, coverage } = mixAvail(W);

    const tips = A.coachTips({ ...m, wpm: w }, {
      kind: variant, refWords: ref.length, accuracy: accV,
      fillers: variant === 'prompter' || variant === 'expressive' ? fill : null, target,
    });
    if (variant === 'expressive' && m.pitchSd >= 2.2 && m.silenceRatio < 0.09)
      tips.push({ kind: 'work', text: "La mélodie est là mais les silences manquent : l'expressivité passe autant par les blancs que par la voix." });

    return {
      score, partial, coverage,
      metrics: {
        accuracy: accV ? Math.round(accV) : null, wpm: w ? Math.round(w) : null,
        silenceRatio: +m.silenceRatio.toFixed(2), pitchSd: +m.pitchSd.toFixed(1),
        pauses: m.pauses, fillers: fill?.total ?? null, words: hyp.length,
      },
      cards: [
        metric('Débit', w ? Math.round(w) : '—', 'mpm', target ? `cible ${target}` : `zone ${A.REF.wpmRead[0]}–${A.REF.wpmRead[1]}`, w ? A.gradeClass(paceV) : ''),
        metric('Précision', accV ? Math.round(accV) : '—', '%', 'mots correctement prononcés', accV ? A.gradeClass(accV) : ''),
        metric('Silence', Math.round(m.silenceRatio * 100), '%', `${m.pauses} pauses · zone 10–22 %`, A.gradeClass(A.bandScore(m.silenceRatio, ...A.REF.silence, .24))),
        metric('Mélodie', m.pitchSd.toFixed(1), 'demi-tons', 'zone 1,8–4,2 demi-tons', A.gradeClass(prosoV)),
        metric('Stabilité', Math.round(stabV), '/100', 'régularité du volume', A.gradeClass(stabV)),
        ...(fill ? [metric('Tics', fill.total, '', fill.detail[0] ? `dont « ${fill.detail[0].label} »` : 'aucun détecté', fill.total <= 1 ? 'g' : fill.total <= 4 ? 'w' : 'b')] : []),
      ],
      detail: al ? `<div class="card stack g8"><div class="tiny dim">Lecture mot à mot · en rouge ce qui n'a pas été reconnu</div>
        <div class="script" style="font-size:16px">${marksHtml(S.ref, al.marks)}</div></div>` : '',
    };
  },
});
H.read = readLike('read');
H.pace = readLike('pace');
H.prompter = readLike('prompter');
H.expressive = readLike('expressive');

/* ------------------------------ 4. Paires minimales ------------------------------ */
H.pairs = {
  needs: { mic: false, recog: true },
  brief: S => {
    S.params.set = S.params.set ?? 0;
    const p = PAIRS[S.params.set];
    return `<div class="card stack g12">
      <div class="hscroll" style="margin:0;padding:0">${PAIRS.map((x, i) =>
        `<button class="chip ${i === S.params.set ? 'on' : ''}" data-act="pickset" data-i="${i}">${esc(x.name)}</button>`).join('')}</div>
      <h3>${esc(p.name)}</h3><p class="small muted">${esc(p.hint)}</p>
      <div class="pairs">${p.items.slice(0, 4).map(it => `<div class="pair" style="font-size:17px;padding:14px 8px">${esc(it[0])} / ${esc(it[1])}</div>`).join('')}</div>
      <p class="small dim">8 mots te seront demandés au hasard. Prononce uniquement le mot surligné, distinctement. La reconnaissance vocale juge.</p></div>`;
  },
  readOpts: S => {
    const p = PAIRS[S.params.set];
    S.set = p;
    S.queue = shuffle(p.items.flatMap(it => [[it, 0], [it, 1]])).slice(0, 8);
    return true;
  },
  rounds: S => S.queue.length,
  roundHead: S => `Mot ${S.round + 1}/${S.queue.length} · ${S.set.name}`,
  live: S => {
    const [it, k] = S.queue[S.round];
    S.cur = { it, k, t0: performance.now(), settled: false };
    return `<div class="stack g16">
      <p class="center muted small">Prononce le mot surligné</p>
      <div class="pairs" id="pp">
        <div class="pair ${k === 0 ? 'target' : ''}" data-w="0">${esc(it[0])}</div>
        <div class="pair ${k === 1 ? 'target' : ''}" data-w="1">${esc(it[1])}</div></div>
      <div class="row" style="justify-content:center">
        <button class="btn btn-sm btn-ghost" data-act="listen" data-text="${esc(it[k])}">${icon('sound')} Écouter le modèle</button></div>
      <div class="viz" style="max-width:150px"><canvas id="vz"></canvas>
        <div class="cta"><div class="n" id="cd" style="font-size:26px">5</div><div class="u">sec</div></div></div>
      <div class="transcript center" id="tr">…</div></div>`;
  },
  tick: S => {
    const c = S.cur;
    const el = (performance.now() - c.t0) / 1000;
    const cd = $('#cd'); if (cd) cd.textContent = Math.max(0, Math.ceil(6 - el));
    if (S.viz) S.viz.draw({ mode: 'ring', level: S.mic ? S.mic.norm : 0.25, progress: clamp(el / 6, 0, 1) });
    if (c.settled) return;
    const heard = S.transcript.trim();
    if (heard) {
      const tokens = A.words(heard);
      const last = tokens[tokens.length - 1] || '';
      const d0 = charDist(last, A.words(c.it[0])[0] || c.it[0]);
      const d1 = charDist(last, A.words(c.it[1])[0] || c.it[1]);
      if (Math.min(d0, d1) <= 1 || tokens.length >= 1 && el > 1.6) {
        const which = d0 === d1 ? -1 : (d0 < d1 ? 0 : 1);
        c.settled = true; c.heard = last; c.which = which;
        const ok = which === c.k;
        const el0 = $(`#pp .pair[data-w="${which}"]`);
        el0?.classList.add(ok ? 'win' : 'lose');
        $('#tr').innerHTML = ok
          ? `<b style="color:#6ee7b7">Entendu « ${esc(last)} » ✓</b>`
          : `Entendu « <b>${esc(last)}</b> » — ce n'est pas le mot visé`;
        sfx(ok ? 'ok' : 'bad'); vibrate(ok ? 14 : 40);
        setTimeout(() => S && S.phase === 'active' && finishRound(), 950);
      }
    }
    if (el > 6.2 && !c.settled) { c.settled = true; c.which = -2; setTimeout(() => S && S.phase === 'active' && finishRound(), 250); }
  },
  endRound: S => ({ target: S.cur.it[S.cur.k], heard: S.cur.heard || null, ok: S.cur.which === S.cur.k, other: S.cur.it[1 - S.cur.k] }),
  finish: S => {
    const rs = S.rounds, ok = rs.filter(r => r.ok).length, ans = rs.filter(r => r.heard).length;
    const score = ans ? (ok / rs.length) * 100 : 40;
    const missed = rs.filter(r => !r.ok && r.heard);
    const tips = [];
    if (!ans) tips.push({ kind: 'work', text: "Aucun mot n'a été capté. Vérifie l'autorisation micro et parle juste après l'affichage du mot." });
    else if (ok === rs.length) tips.push({ kind: 'good', text: "Sans faute. Ces deux sons sont maîtrisés — passe à une autre paire, plus difficile." });
    else {
      tips.push({ kind: 'work', text: `${missed.length} confusion${missed.length > 1 ? 's' : ''} sur ${rs.length}. ${esc(S.set.hint)}` });
      tips.push({ kind: 'work', text: "Méthode : prononce les deux mots en alternance devant un miroir, dix fois, en exagérant la position des lèvres. L'oreille suit la bouche." });
    }
    return {
      score,
      metrics: { correct: ok, total: rs.length, set: S.set.id },
      cards: [
        metric('Réussite', `${ok}/${rs.length}`, '', S.set.name, A.gradeClass(score)),
        metric('Non captés', rs.length - ans, '', 'mots non reconnus'),
      ],
      detail: `<div class="card stack g8"><div class="tiny dim">Détail</div>${rs.map(r =>
        `<div class="row small" style="padding:4px 0"><span style="width:20px">${r.ok ? '✅' : r.heard ? '❌' : '⚪️'}</span>
         <b class="grow">${esc(r.target)}</b><span class="dim">${r.heard ? `entendu « ${esc(r.heard)} »` : 'non capté'}</span></div>`).join('')}</div>`,
    };
  },
};

/* ------------------------------ 5. Improvisation ------------------------------ */
H.impro = {
  needs: { mic: true, recog: true },
  brief: S => {
    S.params.topic = S.params.topic || rnd(TOPICS);
    return `<div class="card stack g12">
      <div class="row"><span class="chip">${S.ex.data.dur} s de parole</span><span class="chip">${S.ex.data.prep} s de préparation</span>
        <span class="grow"></span><button class="btn btn-sm btn-ghost" data-act="rerollTopic">${icon('refresh')}</button></div>
      <div class="script lg" id="tp">${esc(S.params.topic)}</div>
      <p class="small dim">Structure conseillée : une idée, un exemple concret, une conclusion en une phrase. Interdiction de t'arrêter avant la fin.</p></div>`;
  },
  prep: S => S.ex.data.prep,
  prepHtml: S => `<div class="script lg center">${esc(S.params.topic)}</div>
    <p class="center muted small">Prépare ta première phrase. Ne cherche pas un plan complet : trois idées suffisent.</p>`,
  live: S => `<div class="stack g16">
      <div class="viz"><canvas id="vz"></canvas><div class="cta">
        <div class="n" id="cd">${S.ex.data.dur}</div><div class="u">secondes</div></div></div>
      <div class="card stack g8"><div class="small dim">Sujet</div><b style="font-size:17px">${esc(S.params.topic)}</b></div>
      <div class="metrics" style="grid-template-columns:repeat(3,1fr)">
        <div class="metric"><div class="k">Mots</div><div class="v" id="mw">0</div></div>
        <div class="metric"><div class="k">Débit</div><div class="v" id="mp">—</div></div>
        <div class="metric" id="mfbox"><div class="k">Tics</div><div class="v" id="mf">0</div></div></div>
      <div class="transcript" id="tr"></div></div>`,
  tick: S => {
    const left = Math.max(0, S.ex.data.dur - S.elapsed);
    const cd = $('#cd'); if (cd) cd.textContent = Math.ceil(left);
    vizRing(S, clamp(S.elapsed / S.ex.data.dur, 0, 1));
    const n = A.words(S.transcript).length;
    const mw = $('#mw'); if (mw) mw.textContent = n;
    const w = liveWpm(S);
    const mp = $('#mp'); if (mp) mp.textContent = w ? Math.round(w) : '—';
    const f = A.findFillers(S.transcript).total;
    const mf = $('#mf'); if (mf && +mf.textContent !== f) {
      mf.textContent = f;
      $('#mfbox').className = 'metric ' + (f <= 2 ? 'g' : f <= 5 ? 'w' : 'b');
      if (f > (S._lastF || 0)) { vibrate(30); S._lastF = f; }
    }
    const tr = $('#tr'); if (tr) tr.innerHTML = transcriptHtml(S);
  },
  done: S => S.elapsed >= S.ex.data.dur,
  finish: S => {
    const m = A.audioMetrics(S.snap);
    const hyp = A.words(S.transcript);
    const fill = S.recogOk ? A.findFillers(S.transcript) : null;
    const spoken = Math.max(1, m.speakSec || S.elapsed);
    const w = S.recogOk && hyp.length > 4 ? A.wpm(hyp.length, spoken) : null;
    const perMin = fill ? fill.total / Math.max(0.4, S.elapsed / 60) : null;
    const fluidV = perMin != null ? A.downScore(perMin, 0.6, 8) * .65 + A.bandScore(m.silenceRatio, .08, .24, .26) * .35
                                  : A.bandScore(m.silenceRatio, .08, .24, .26);
    const paceV = w ? A.bandScore(w, ...A.REF.wpm, 55) : null;
    const prosoV = A.upScore(m.pitchSd, 0.7, 3.2);
    const stabV = A.downScore(m.volCv, .32, .8);
    const goV = A.upScore(S.elapsed / S.ex.data.dur * 100, 40, 96);
    const { score, partial, coverage } = mixAvail([
      { v: fluidV, w: 3 }, { v: paceV, w: 2 }, { v: prosoV, w: 1.6 }, { v: stabV, w: 1 }, { v: goV, w: 1.4 },
    ]);
    const tips = A.coachTips({ ...m, wpm: w }, { kind: 'impro', refWords: hyp.length, fillers: fill });
    if (S.elapsed < S.ex.data.dur * 0.75)
      tips.unshift({ kind: 'work', text: `Tu t'es arrêté à ${A.fmtTime(S.elapsed)} sur ${A.fmtTime(S.ex.data.dur)}. Tenir la durée compte plus que la qualité au début : la fluidité vient de l'endurance.` });
    return {
      score, partial, coverage,
      metrics: {
        words: hyp.length, wpm: w ? Math.round(w) : null, fillers: fill?.total ?? null,
        fillersPerMin: perMin != null ? +perMin.toFixed(1) : null,
        silenceRatio: +m.silenceRatio.toFixed(2), pitchSd: +m.pitchSd.toFixed(1), pauses: m.pauses,
      },
      cards: [
        metric('Tics', fill ? fill.total : '—', '', perMin != null ? `${perMin.toFixed(1)}/min` : '', fill ? A.gradeClass(A.downScore(perMin, .6, 8)) : ''),
        metric('Débit', w ? Math.round(w) : '—', 'mpm', `zone ${A.REF.wpm[0]}–${A.REF.wpm[1]}`, paceV ? A.gradeClass(paceV) : ''),
        metric('Silence', Math.round(m.silenceRatio * 100), '%', `${m.pauses} pauses`, A.gradeClass(A.bandScore(m.silenceRatio, .08, .24, .26))),
        metric('Mélodie', m.pitchSd.toFixed(1), 'st', 'variation de hauteur', A.gradeClass(prosoV)),
        metric('Tenue', A.fmtTime(S.elapsed), '', `objectif ${A.fmtTime(S.ex.data.dur)}`, A.gradeClass(goV)),
        metric('Mots', hyp.length, '', 'transcription'),
      ],
      detail: fill && fill.detail.length ? `<div class="card stack g8"><div class="tiny dim">Tics détectés</div>
        <div class="row wrap">${fill.detail.map(d => `<span class="chip bad">${esc(d.label)} ×${d.n}</span>`).join('')}</div></div>` : '',
    };
  },
};

/* ------------------------------ 6. Intonation ------------------------------ */
const INTENTS = [
  { t: "Affirmation neutre", d: "Descends nettement en fin de phrase." },
  { t: "Question", d: "Monte franchement sur la dernière syllabe." },
  { t: "Surprise", d: "Attaque haut, écarte l'aigu et le grave." },
  { t: "Confidence", d: "Voix basse, posée, sans monotonie." },
  { t: "Enthousiasme", d: "Rythme vif, mélodie ample, sourire audible." },
];
H.pitch = {
  needs: { mic: true, recog: false },
  brief: S => {
    S.params.phrase = S.params.phrase || "Nous avons trois semaines pour y arriver";
    return `<div class="card stack g12"><div class="field"><label>Phrase support</label>
      <input type="text" id="ph" value="${esc(S.params.phrase)}"></div>
      <div class="steps">${INTENTS.map((i, k) => `<div class="step"><span class="n">${k + 1}</span>
        <span class="grow"><b>${esc(i.t)}</b><div class="small muted">${esc(i.d)}</div></span></div>`).join('')}</div>
      <p class="small dim">Tu diras la même phrase cinq fois, avec cinq intentions. On mesure l'amplitude de ta mélodie et la différence entre les intentions.</p></div>`;
  },
  readOpts: S => { S.params.phrase = ($('#ph')?.value || S.params.phrase).trim() || S.params.phrase; return true; },
  rounds: () => INTENTS.length,
  roundHead: S => `${S.round + 1}/5 · ${INTENTS[S.round].t}`,
  live: S => {
    S.cur = { t0: performance.now(), base: S.mic ? S.mic.pitches.length : 0 };
    return `<div class="stack g16">
      <div class="card stack g8"><span class="chip on">${esc(INTENTS[S.round].t)}</span>
        <p class="muted small">${esc(INTENTS[S.round].d)}</p>
        <div class="script lg">${esc(S.params.phrase)}</div></div>
      <div class="card" style="padding:8px"><div class="viz" style="max-width:none;aspect-ratio:auto;height:120px"><canvas id="vz"></canvas></div></div>
      <div class="metrics" style="grid-template-columns:repeat(3,1fr)">
        <div class="metric"><div class="k">Hauteur</div><div class="v" id="mh">—<small>Hz</small></div></div>
        <div class="metric"><div class="k">Amplitude</div><div class="v" id="mr">—<small>st</small></div></div>
        <div class="metric"><div class="k">Temps</div><div class="v" id="mt">0<small>s</small></div></div></div>
      <button class="btn btn-primary btn-block" data-act="nextround">Valider cette intention</button></div>`;
  },
  tick: S => {
    if (S.viz) S.viz.draw({ mode: 'pitch', pitch: S.mic?.pitch || 0 });
    const el = (performance.now() - S.cur.t0) / 1000;
    $('#mt') && ($('#mt').innerHTML = el.toFixed(1) + '<small>s</small>');
    const hz = S.mic?.pitch || 0;
    if (hz) $('#mh') && ($('#mh').innerHTML = Math.round(hz) + '<small>Hz</small>');
    const seg = (S.mic?.pitches || []).slice(S.cur.base).map(p => 12 * Math.log2(p.hz / 110));
    if (seg.length > 6) {
      seg.sort((a, b) => a - b);
      const c = Math.floor(seg.length * .08), core = seg.slice(c, seg.length - c);
      const rng = core[core.length - 1] - core[0];
      $('#mr') && ($('#mr').innerHTML = rng.toFixed(1) + '<small>st</small>');
    }
    if (el > 14) finishRound();
  },
  endRound: S => {
    const seg = (S.mic?.pitches || []).slice(S.cur.base);
    const semis = seg.map(p => 12 * Math.log2(p.hz / 110)).sort((a, b) => a - b);
    if (semis.length < 6) return { intent: INTENTS[S.round].t, range: 0, median: 0, n: semis.length };
    const c = Math.floor(semis.length * .08), core = semis.slice(c, semis.length - c);
    const mu = core.reduce((a, b) => a + b, 0) / core.length;
    return {
      intent: INTENTS[S.round].t,
      range: core[core.length - 1] - core[0],
      sd: Math.sqrt(core.reduce((a, b) => a + (b - mu) ** 2, 0) / core.length),
      median: core[Math.floor(core.length / 2)], n: core.length,
    };
  },
  finish: S => {
    const rs = S.rounds.filter(r => r.n > 5);
    if (!rs.length) return {
      score: 35, metrics: {}, cards: [metric('Voix captée', 'non')],
      tips: [{ kind: 'work', text: "Aucune hauteur exploitable détectée. Rapproche-toi du micro et parle en voix pleine, pas chuchotée." }],
    };
    const avgRange = rs.reduce((a, r) => a + r.range, 0) / rs.length;
    const avgSd = rs.reduce((a, r) => a + r.sd, 0) / rs.length;
    const meds = rs.map(r => r.median);
    const spread = Math.max(...meds) - Math.min(...meds);   // différenciation entre intentions
    const { score } = mixAvail([
      { v: A.upScore(avgRange, 2.5, 10), w: 3 },     // excursion grave→aigu dans la phrase
      { v: A.upScore(avgSd, .7, 3), w: 2 },          // richesse de la mélodie
      { v: A.upScore(spread, .8, 5), w: 2.2 },       // différenciation entre les intentions
    ]);
    const tips = [];
    if (avgRange < 3) tips.push({ kind: 'work', text: `Amplitude moyenne de **${avgRange.toFixed(1)} demi-tons** : la voix reste plate quelle que soit l'intention. Exagère volontairement — ce qui te paraît excessif est perçu comme normal par l'auditoire.` });
    else if (avgRange < 6) tips.push({ kind: 'work', text: `Amplitude moyenne de **${avgRange.toFixed(1)} demi-tons**. Une phrase vivante en couvre 6 à 12 : appuie davantage la descente finale et la montée sur le mot clé.` });
    else tips.push({ kind: 'good', text: `Amplitude moyenne de **${avgRange.toFixed(1)} demi-tons** : ta voix porte une vraie mélodie.` });
    if (spread < 1.2) tips.push({ kind: 'work', text: "Tes cinq intentions se ressemblent trop. Change aussi le **débit** et le **volume**, pas seulement la hauteur : c'est le trio qui crée l'intention." });
    else tips.push({ kind: 'good', text: `Tes intentions sont bien différenciées (**${spread.toFixed(1)} demi-tons** d'écart entre les registres utilisés).` });
    if (avgRange > 16) tips.push({ kind: 'work', text: "Amplitude très large : vérifie que la voix reste stable et non forcée dans l'aigu." });
    return {
      score, metrics: { pitchSd: +avgSd.toFixed(1), pitchRange: +avgRange.toFixed(1), spread: +spread.toFixed(1) },
      cards: [
        metric('Amplitude', avgRange.toFixed(1), 'st', 'phrase vivante : 6 à 12', A.gradeClass(A.upScore(avgRange, 2.5, 10))),
        metric('Variation moy.', avgSd.toFixed(1), 'st', 'monocorde en dessous de 1,2', A.gradeClass(A.upScore(avgSd, .7, 3))),
        metric('Contraste', spread.toFixed(1), 'st', 'écart entre intentions', A.gradeClass(A.upScore(spread, .8, 5))),
      ],
      detail: `<div class="card stack g8"><div class="tiny dim">Par intention</div>${rs.map(r =>
        `<div class="row small" style="padding:5px 0"><b class="grow">${esc(r.intent)}</b>
         <span class="dim mono">${r.range.toFixed(1)} st · centre ${Math.round(110 * Math.pow(2, r.median / 12))} Hz</span></div>`).join('')}</div>`,
      tips,
    };
  },
};

/* ------------------------------ 7. Projection / volume ------------------------------ */
H.volume = {
  needs: { mic: true, recog: false },
  brief: () => `<div class="card stack g12">
    <p>Tu vas lire ou parler librement pendant <b>45 secondes</b> en gardant ta voix dans la <b>zone verte</b> : ni murmure, ni cri.</p>
    <p class="small muted">Le but n'est pas le volume maximal mais la <b>constance</b>. Une voix qui porte est une voix stable, appuyée sur le souffle abdominal — la gorge doit rester détendue.</p>
    <p class="small dim">Astuce : imagine que tu parles à quelqu'un assis au dernier rang, sans hausser le ton.</p></div>`,
  live: () => `<div class="stack g16">
      <div class="viz"><canvas id="vz"></canvas><div class="cta">
        <div class="n" id="cd">45</div><div class="u">secondes</div></div></div>
      <div class="metrics" style="grid-template-columns:repeat(3,1fr)">
        <div class="metric" id="zbox"><div class="k">Dans la zone</div><div class="v" id="mz">0<small>%</small></div></div>
        <div class="metric"><div class="k">Niveau</div><div class="v" id="mdb">—<small>dB</small></div></div>
        <div class="metric"><div class="k">Stabilité</div><div class="v" id="ms">—</div></div></div>
      <div class="bar"><i id="lvl" style="width:0%"></i></div>
      <p class="center small dim">Parle en continu : compte à voix haute, décris la pièce, ou lis quelque chose.</p></div>`,
  tick: S => {
    S.zin = S.zin || 0; S.ztot = S.ztot || 0;
    const n = S.mic.norm;
    const inZone = n >= .42 && n <= .78;
    S.ztot++; if (inZone) S.zin++;
    const left = Math.max(0, 45 - S.elapsed);
    $('#cd') && ($('#cd').textContent = Math.ceil(left));
    $('#mz') && ($('#mz').innerHTML = Math.round((S.zin / Math.max(1, S.ztot)) * 100) + '<small>%</small>');
    $('#zbox') && ($('#zbox').className = 'metric ' + (inZone ? 'g' : 'w'));
    const db = S.mic.smooth > 0 ? 20 * Math.log10(S.mic.smooth) : -80;
    $('#mdb') && ($('#mdb').innerHTML = Math.round(db) + '<small>dB</small>');
    $('#lvl') && ($('#lvl').style.width = Math.round(n * 100) + '%');
    // la stabilité recopie tout l'historique : une fois toutes les 12 frames suffit
    if (S.ztot % 12 === 0) {
      const m = A.audioMetrics(S.mic.snapshot());
      $('#ms') && ($('#ms').textContent = m.volMean > .02 ? Math.round(A.downScore(m.volCv, .3, .8)) : '—');
    }
    if (S.viz) S.viz.draw({ mode: 'band', level: n, band: [.42, .78], bars: S.mic.bars(30), progress: clamp(S.elapsed / 45, 0, 1), hot: inZone });
    if (S.elapsed >= 45) finishRound();
  },
  done: S => S.elapsed >= 45,
  finish: S => {
    const m = A.audioMetrics(S.snap);
    const zone = (S.zin || 0) / Math.max(1, S.ztot || 1) * 100;
    const stab = A.downScore(m.volCv, .3, .8);
    const { score } = mixAvail([
      { v: zone, w: 3.4 }, { v: stab, w: 2.4 }, { v: A.upScore(m.speakSec / Math.max(1, m.duration) * 100, 45, 88), w: 1.2 },
    ]);
    const tips = [];
    if (zone < 45 && m.dbfs < -30) tips.push({ kind: 'work', text: "Voix trop en retrait. Ouvre davantage la bouche et pousse depuis le ventre : la puissance vient du souffle, pas de la gorge — sinon tu t'enroues." });
    else if (zone < 45) tips.push({ kind: 'work', text: "Le niveau sort souvent de la zone. Cherche un volume moyen que tu peux tenir cinq minutes sans fatigue : c'est ton volume de travail." });
    else tips.push({ kind: 'good', text: `Tu es resté **${Math.round(zone)} %** du temps dans la zone cible.` });
    if (stab < 55) tips.push({ kind: 'work', text: "Le volume chute en fin de phrase — signe classique de manque d'air. Reprends ton souffle une phrase plus tôt que d'habitude." });
    else tips.push({ kind: 'good', text: "Volume régulier : le souffle est bien réparti sur la phrase." });
    return {
      score, metrics: { zone: Math.round(zone), stability: Math.round(stab), dbfs: Math.round(m.dbfs) },
      cards: [
        metric('Dans la zone', Math.round(zone), '%', 'temps passé au bon volume', A.gradeClass(zone)),
        metric('Stabilité', Math.round(stab), '/100', 'régularité du niveau', A.gradeClass(stab)),
        metric('Niveau moyen', Math.round(m.dbfs), 'dB', 'relatif au micro'),
        metric('Temps de parole', Math.round(m.speakSec), 's', `sur ${Math.round(m.duration)} s`),
      ],
      tips,
    };
  },
};

/* ------------------------------ 8. Souffle : /a/ tenu ------------------------------ */
H.phonation = {
  needs: { mic: true, recog: false },
  brief: S => {
    const r = store.get().records.phonation || 0;
    return `<div class="card stack g12">
      <p>Inspire profondément par le nez, puis tiens un <b>« aaa »</b> le plus longtemps possible, à volume constant.</p>
      <div class="row wrap"><span class="chip">&lt; 12 s : à travailler</span><span class="chip">15 s : correct</span>
        <span class="chip ok">20 s : bon</span><span class="chip on">25 s + : excellent</span></div>
      ${r ? `<div class="row"><span class="grow small muted">Ton record</span><b class="mono">${r} s</b></div>` : ''}
      <p class="small dim">Le chronomètre démarre dès que le son est détecté et s'arrête quand il s'éteint. Ne force pas la fin : arrête-toi avant l'inconfort.</p></div>`;
  },
  live: () => `<div class="stack g16">
      <div class="viz"><canvas id="vz"></canvas><div class="cta">
        <div class="n" id="cd">0.0</div><div class="u" id="cdl">en attente du son…</div></div></div>
      <div class="metrics" style="grid-template-columns:repeat(2,1fr)">
        <div class="metric"><div class="k">Hauteur</div><div class="v" id="mh">—<small>Hz</small></div></div>
        <div class="metric"><div class="k">Régularité</div><div class="v" id="ms">—</div></div></div>
      <div class="bar"><i id="lvl" style="width:0%"></i></div>
      <p class="center small dim">Volume constant, hauteur constante. La régularité compte autant que la durée.</p></div>`,
  tick: S => {
    const n = S.mic.norm, on = S.mic.smooth > .045;
    if (!S.ph) S.ph = { started: 0, last: 0, levels: [], hz: [] };
    const now = performance.now();
    if (on) {
      if (!S.ph.started) { S.ph.started = now; sfx('ok'); $('#cdl').textContent = 'secondes tenues'; }
      S.ph.last = now; S.ph.levels.push(S.mic.smooth);
      if (S.mic.pitch) S.ph.hz.push(S.mic.pitch);
    }
    const dur = S.ph.started ? (Math.max(S.ph.last, S.ph.started) - S.ph.started) / 1000 : 0;
    $('#cd') && ($('#cd').textContent = dur.toFixed(1));
    $('#lvl') && ($('#lvl').style.width = Math.round(n * 100) + '%');
    if (S.mic.pitch) $('#mh') && ($('#mh').innerHTML = Math.round(S.mic.pitch) + '<small>Hz</small>');
    if (S.ph.levels.length > 20) {
      const l = S.ph.levels, mu = l.reduce((a, b) => a + b, 0) / l.length;
      const sd = Math.sqrt(l.reduce((a, b) => a + (b - mu) ** 2, 0) / l.length);
      $('#ms') && ($('#ms').textContent = Math.round(A.downScore(mu ? sd / mu : 1, .18, .6)));
    }
    if (S.viz) S.viz.draw({ mode: 'ring', level: n, bars: S.mic.bars(26), progress: clamp(dur / 30, 0, 1), hot: on });
    // arrêt automatique : 900 ms de silence après un son tenu au moins 2 s
    if (S.ph.started && dur > 2 && !on && now - S.ph.last > 900) finishRound();
    if (S.elapsed > 75) finishRound();
  },
  finish: S => {
    const ph = S.ph || { levels: [], hz: [] };
    const dur = ph.started ? (ph.last - ph.started) / 1000 : 0;
    const l = ph.levels, mu = l.length ? l.reduce((a, b) => a + b, 0) / l.length : 0;
    const sd = l.length > 1 ? Math.sqrt(l.reduce((a, b) => a + (b - mu) ** 2, 0) / l.length) : 0;
    const reg = A.downScore(mu ? sd / mu : 1, .18, .62);
    const hz = ph.hz.length ? ph.hz.reduce((a, b) => a + b, 0) / ph.hz.length : 0;
    const hzSd = ph.hz.length > 4
      ? Math.sqrt(ph.hz.reduce((a, b) => a + (b - hz) ** 2, 0) / ph.hz.length) : 0;
    const { score } = mixAvail([
      { v: A.upScore(dur, 5, 27), w: 3.6 }, { v: reg, w: 2 },
      { v: A.downScore(hz ? hzSd / hz * 100 : 30, 2.5, 14), w: 1.2 },
    ]);
    const rec = store.get().records.phonation || 0;
    const tips = [];
    if (dur < 2) tips.push({ kind: 'work', text: "Aucun son tenu détecté. Reprends : inspire, puis émets un « aaa » franc, à 20 cm du micro." });
    else if (dur < 12) tips.push({ kind: 'work', text: `**${dur.toFixed(1)} s**. L'appui du souffle est à construire : entraîne l'expiration sur un « ssss » régulier, deux minutes par jour. On gagne facilement 5 s en trois semaines.` });
    else if (dur < 20) tips.push({ kind: 'work', text: `**${dur.toFixed(1)} s** : correct. Pour passer 20 s, travaille surtout l'**inspiration basse** — le ventre se gonfle, les épaules ne montent pas.` });
    else tips.push({ kind: 'good', text: `**${dur.toFixed(1)} s** : très bonne capacité. Tu peux tenir des phrases longues sans t'essouffler.` });
    if (dur > 4 && reg < 55) tips.push({ kind: 'work', text: "Le son tremble ou faiblit. Cherche un débit d'air constant plutôt qu'une durée maximale : la stabilité précède l'endurance." });
    if (dur > rec && dur > 2) tips.unshift({ kind: 'good', text: `Nouveau record personnel : **${dur.toFixed(1)} s** (précédent : ${rec || '—'} s).` });
    return {
      score, metrics: { seconds: +dur.toFixed(1), regularity: Math.round(reg), hz: Math.round(hz) },
      cards: [
        metric('Durée', dur.toFixed(1), 's', `record ${rec || '—'} s`, A.gradeClass(A.upScore(dur, 5, 27))),
        metric('Régularité', Math.round(reg), '/100', 'constance du volume', A.gradeClass(reg)),
        metric('Hauteur', hz ? Math.round(hz) : '—', 'Hz', hz ? `±${(hzSd).toFixed(1)} Hz` : ''),
      ],
      tips,
    };
  },
};

/* ------------------------------ 9. Gammes d'articulation (métronome) ------------------------------ */
H.drill = {
  needs: { mic: true, recog: false },
  brief: S => {
    S.params.pick = S.params.pick ?? 0; S.params.bpm = S.params.bpm ?? 92;
    const d = DRILLS[S.params.pick];
    return `<div class="card stack g12">
      <div class="hscroll" style="margin:0;padding:0">${DRILLS.map((x, i) =>
        `<button class="chip ${i === S.params.pick ? 'on' : ''}" data-act="pickdrill" data-i="${i}">${esc(x.name)}</button>`).join('')}</div>
      <div class="script lg center" id="dseq">${esc(d.seq)}</div>
      <p class="small muted" id="ddesc">${esc(d.desc)}</p>
      <div class="row"><label class="tiny dim grow">Tempo</label><span class="chip mono" id="bpmv">${S.params.bpm} BPM</span></div>
      <input type="range" id="bpm" min="50" max="180" step="2" value="${S.params.bpm}">
      <p class="small dim">Une syllabe par clic, pendant 45 s. On mesure la <b>précision rythmique</b> de tes attaques, pas le volume.</p></div>`;
  },
  readOpts: S => { S.params.bpm = +($('#bpm')?.value || 92); S.drill = DRILLS[S.params.pick]; return true; },
  live: S => `<div class="stack g16">
      <div class="viz"><canvas id="vz"></canvas><div class="cta">
        <div class="n" id="cd">45</div><div class="u">secondes</div></div></div>
      <div class="script lg center">${esc(S.drill.seq)}</div>
      <div class="metrics" style="grid-template-columns:repeat(3,1fr)">
        <div class="metric"><div class="k">Tempo</div><div class="v">${S.params.bpm}<small>bpm</small></div></div>
        <div class="metric"><div class="k">Attaques</div><div class="v" id="mo">0</div></div>
        <div class="metric"><div class="k">Précision</div><div class="v" id="mt2">—</div></div></div>
      <div class="row"><button class="btn btn-sm btn-ghost grow" data-act="bpmdown">− 8 BPM</button>
        <button class="btn btn-sm btn-ghost grow" data-act="bpmup">+ 8 BPM</button></div></div>`,
  onStart: async S => {
    S.metro = new Metronome(S.params.bpm);
    S.beats = [];
    S.metro.onBeat = () => S.beats.push(performance.now() - S.t0);
    await S.metro.start(S.params.bpm);
  },
  tick: S => {
    $('#cd') && ($('#cd').textContent = Math.ceil(Math.max(0, 45 - S.elapsed)));
    const on = S.mic.onsets.length;
    $('#mo') && ($('#mo').textContent = on);
    const tight = drillTightness(S);
    $('#mt2') && ($('#mt2').textContent = tight.matched > 3 ? Math.round(tight.score) : '—');
    const beat = S.beats.length ? (performance.now() - S.t0 - S.beats[S.beats.length - 1]) / (60000 / S.params.bpm) : 0;
    if (S.viz) S.viz.draw({ mode: 'ring', level: S.mic.norm, bars: S.mic.bars(28), progress: clamp(S.elapsed / 45, 0, 1), hot: beat < .18 });
    if (S.elapsed >= 45) finishRound();
  },
  onStop: S => S.metro?.stop(),
  finish: S => {
    const t = drillTightness(S);
    const m = A.audioMetrics(S.snap);
    const cover = S.beats.length ? clamp(t.matched / (S.beats.length * .92), 0, 1) * 100 : 0;
    const { score } = mixAvail([
      { v: cover, w: 3 }, { v: t.matched > 3 ? t.score : null, w: 3 },
      { v: A.downScore(m.volCv, .35, .9), w: .8 },
    ]);
    const tips = [];
    if (cover < 55) tips.push({ kind: 'work', text: `Tu n'as suivi que ${Math.round(cover)} % des clics. Baisse le tempo de 15 BPM : la netteté d'abord, la vitesse ensuite.` });
    else tips.push({ kind: 'good', text: `Tu as tenu ${Math.round(cover)} % des clics à ${S.params.bpm} BPM.` });
    if (t.matched > 3) {
      if (t.meanAbs > 90) tips.push({ kind: 'work', text: `Tes attaques tombent en moyenne **${Math.round(t.meanAbs)} ms** à côté du clic. Anticipe : la syllabe doit démarrer *sur* le clic, pas après.` });
      else tips.push({ kind: 'good', text: `Attaques calées à **${Math.round(t.meanAbs)} ms** du clic en moyenne : très bon placement rythmique.` });
    }
    if (cover > 80 && t.meanAbs < 80) tips.push({ kind: 'good', text: `Tempo maîtrisé. Prochaine séance : monte à **${S.params.bpm + 10} BPM**.` });
    return {
      score, metrics: { bpm: S.params.bpm, onsets: t.matched, offsetMs: Math.round(t.meanAbs), coverage: Math.round(cover), drill: S.drill.id },
      cards: [
        metric('Syllabes tenues', `${t.matched}/${S.beats.length}`, '', `${Math.round(cover)} % des clics`, A.gradeClass(cover)),
        metric('Écart au clic', t.matched > 3 ? Math.round(t.meanAbs) : '—', 'ms', 'excellent sous 60 ms', t.matched > 3 ? A.gradeClass(t.score) : ''),
        metric('Tempo', S.params.bpm, 'bpm'),
      ],
      tips,
    };
  },
};
/** Apparie chaque clic du métronome à une attaque de syllabe.
    Appariement glouton sur les paires triées par écart croissant : le résultat ne dépend
    pas de l'ordre de parcours, contrairement à un appariement clic par clic. */
function drillTightness(S) {
  const beats = S.beats || [], onsets = S.mic?.onsets || [];
  if (!beats.length || !onsets.length) return { matched: 0, meanAbs: 0, score: 0 };
  const tol = Math.min(220, (60000 / S.params.bpm) * .45);
  const pairs = [];
  for (let b = 0; b < beats.length; b++)
    for (let o = 0; o < onsets.length; o++) {
      const d = Math.abs(onsets[o] - beats[b]);
      if (d <= tol) pairs.push([d, b, o]);
    }
  pairs.sort((x, y) => x[0] - y[0]);
  const usedB = new Set(), usedO = new Set();
  let sum = 0, matched = 0;
  for (const [d, b, o] of pairs) {
    if (usedB.has(b) || usedO.has(o)) continue;
    usedB.add(b); usedO.add(o); matched++; sum += d;
  }
  const meanAbs = matched ? sum / matched : 0;
  return { matched, meanAbs, score: A.downScore(meanAbs, 45, 200) };
}

/* ==========================================================================
   Fragments partagés
   ========================================================================== */
function wordsHtml(text) {
  return text.split(/(\s+)/).map(tok => /^\s+$/.test(tok) ? tok : `<span class="w pend">${esc(tok)}</span>`).join('');
}
function marksHtml(text, marks) {
  let i = 0;
  return text.split(/(\s+)/).map(tok => {
    if (/^\s+$/.test(tok)) return tok;
    if (!A.words(tok).length) return `<span class="w">${esc(tok)}</span>`;
    const m = marks[i++];
    return `<span class="w ${m === 'hit' ? 'hit' : 'miss'}">${esc(tok)}</span>`;
  }).join('');
}
/** surligne la progression estimée dans le texte à partir du nombre de mots transcrits */
function liveScript(S) {
  const scr = $('#scr') || $('#pri');
  const n = A.words(S.transcript).length;
  $('#wc') && ($('#wc').textContent = n);
  const tr = $('#tr'); if (tr) tr.innerHTML = transcriptHtml(S);
  if (!scr || n === S._lastN) return;
  S._lastN = n;
  const ws = scr.querySelectorAll('.w');
  ws.forEach((el, i) => {
    el.classList.toggle('hit', i < n - 1);
    el.classList.toggle('cur', i === n - 1 || (n === 0 && i === 0));
    el.classList.toggle('pend', i > n - 1);
  });
  const cur = scr.querySelector('.w.cur');
  if (cur && !$('#pri')) {
    const box = scr, r = cur.getBoundingClientRect(), br = box.getBoundingClientRect();
    if (r.bottom > br.bottom - 8 || r.top < br.top + 8) cur.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
}
function transcriptHtml(S) {
  if (!S.recogAvailable) return `<span class="dim tiny">Transcription indisponible sur ce navigateur — les mesures acoustiques restent actives.</span>`;
  if (S.recog?.fatal && !S.recogOk) {
    const why = { 'not-allowed': "accès refusé", 'service-not-allowed': "service refusé", 'audio-capture': "micro déjà utilisé", 'language-not-supported': "langue non prise en charge", 'unstable': "service instable", 'start-failed': "démarrage impossible" }[S.recog.fatal] || S.recog.fatal;
    return `<span class="dim tiny">Transcription interrompue (${esc(why)}) — l'exercice continue, le score sera calculé sur les mesures acoustiques.</span>`;
  }
  const f = S.recog?.final || '', i = S.recog?.interim || '';
  if (!f && !i) return `<span class="dim tiny pulse">À l'écoute…</span>`;
  const tail = f.split(' ').slice(-24).join(' ');
  return `<b>${esc(tail)}</b> <span class="interim">${esc(i)}</span>`;
}
/** débit instantané, estimé sur une fenêtre glissante de 10 s */
function liveWpm(S) {
  const n = A.words(S.transcript).length, t = S.elapsed;
  S.wsamp = S.wsamp || [];
  const last = S.wsamp[S.wsamp.length - 1];
  if (!last || last.n !== n) S.wsamp.push({ t, n });
  const cut = t - 10;
  const win = S.wsamp.filter(s => s.t >= cut);
  if (win.length < 2 || t < 3.5) return n > 2 ? A.wpm(n, Math.max(1, t)) : 0;
  const a = win[0], b = win[win.length - 1];
  return b.t - a.t > 1.5 ? A.wpm(b.n - a.n, b.t - a.t) : A.wpm(n, Math.max(1, t));
}
/** temps de parole effectif de la manche en cours (le micro tourne sur tout l'exercice) */
function roundSpeakSec(S) {
  if (!S.mic) return Math.max(0.8, S.elapsed);
  return Math.max(0.8, (S.mic.speakMs - (S._micBase || 0)) / 1000);
}
function vizRing(S, progress = 0) {
  if (!S.viz) return;
  S.viz.draw({
    mode: 'ring', level: S.mic ? S.mic.norm : 0, bars: S.mic ? S.mic.bars(30) : [],
    progress, hot: S.mic ? S.mic.smooth > .05 : false,
  });
}

/* ==========================================================================
   RUNNER
   ========================================================================== */
export function isOpen() { return !!S; }

export function runSequence(ids, { programSession = null, label = '' } = {}) {
  return new Promise(resolve => {
    const list = ids.map(byId).filter(Boolean);
    const results = [];
    const step = i => {
      if (i >= list.length) {
        if (programSession && results.length === list.length) store.markProgramSession(programSession);
        resolve(results); return;
      }
      run(list[i], {
        queue: { i, n: list.length, label },
        onDone: r => { if (r && !r.empty) results.push(r); step(i + 1); },
        onQuit: () => resolve(results),
      });
    };
    step(0);
  });
}

export function run(ex, opts = {}) {
  const handler = H[ex.kind] || (ex.id === 'ex-expressive' ? H.expressive : null);
  const h = ex.id === 'ex-expressive' ? H.expressive : handler;
  if (!h) { toast("Exercice indisponible"); return; }
  S = {
    ex, H: h, opts, params: {}, phase: 'brief', round: 0, rounds: [],
    mic: null, recog: null, viz: null, raf: 0, elapsed: 0, t0: 0,
    transcript: '', recogOk: false, recogAvailable: support.recog, snap: null, blob: null,
  };
  document.body.style.overflow = 'hidden';
  renderBrief();
  const st = stage();
  st.hidden = false; st.style.display = 'flex';   // `display` explicite : `hidden` seul serait annulé par le CSS
  st.onclick = onStageClick;
  st.oninput = onStageInput;
  return S;
}

function close(result) {
  stopAll();
  const st = stage();
  st.hidden = true; st.style.display = 'none';
  st.innerHTML = ''; st.onclick = null; st.oninput = null;
  document.body.style.overflow = '';
  const o = S?.opts || {}; S = null;
  if (result) o.onDone?.(result); else o.onQuit?.();
}

function stopAll() {
  if (!S) return;
  cancelAnimationFrame(S.raf); S.raf = 0;
  S.H.onStop?.(S);
  S.metro?.stop();
  try { S.recog?.stop(); } catch {}
  stopSpeaking();
  if (S.mic?.running) S.mic.stop();
}

/* ------------------------------ Vues ------------------------------ */
function head(sub) {
  const q = S.opts.queue;
  return `<div class="stage-head">
    <button class="iconbtn" data-act="quit" aria-label="Quitter">${icon('close')}</button>
    <div class="grow"><div class="st">${esc(S.ex.title)}</div>
      <div class="ss">${q ? `${q.label ? q.label + ' · ' : ''}exercice ${q.i + 1}/${q.n} · ` : ''}${esc(sub || S.ex.sub)}</div></div></div>`;
}

function renderBrief() {
  S.phase = 'brief';
  const warn = [];
  if (S.H.needs.recog && !support.recog)
    warn.push("Ce navigateur ne transcrit pas la parole : le score sera calculé sur les mesures acoustiques seules. Chrome (Android/ordinateur) ou Edge donnent l'analyse complète.");
  if (S.H.needs.mic && !support.mic) warn.push("Micro inaccessible : cet exercice a besoin du micro.");
  stage().innerHTML = `${head()}
    <div class="stage-body"><div class="stack g16">
      <p style="font-size:15.5px;line-height:1.55" class="muted">${md(S.ex.brief)}</p>
      ${warn.map(w => `<div class="banner">${icon('info')}<span>${esc(w)}</span></div>`).join('')}
      ${S.H.brief ? S.H.brief(S) : ''}
      <div class="row wrap">${Object.entries(S.ex.skills).map(([k, v]) =>
        `<span class="chip">${['articulation', 'debit', 'prosodie', 'fluidite', 'projection'].includes(k) ? '' : ''}${
          { articulation: 'Articulation', debit: 'Débit', prosodie: 'Prosodie', fluidite: 'Fluidité', projection: 'Projection' }[k]} ${Math.round(v * 100)} %</span>`).join('')}</div>
    </div></div>
    <div class="stage-foot">
      <button class="btn btn-primary btn-block" data-act="begin" ${S.H.needs.mic && !support.mic ? 'disabled' : ''}>
        ${icon('play')} Commencer</button></div>`;
}

async function begin() {
  if (S.H.readOpts && S.H.readOpts(S) === false) return;
  S.rounds = []; S.round = 0;
  await startRound();
}

async function startRound() {
  S.phase = 'prep';
  S.transcript = ''; S._lastN = -1; S.wsamp = null; S.ph = null; S.zin = 0; S.ztot = 0;
  const prepSec = S.round === 0 && S.H.prep ? S.H.prep(S) : 0;
  if (prepSec) { await renderPrep(prepSec); if (!S) return; }
  await goActive();
}

function renderPrep(sec) {
  return new Promise(res => {
    stage().innerHTML = `${head('préparation')}
      <div class="stage-body" style="justify-content:center"><div class="stack g24">
        <div class="viz"><canvas id="vz"></canvas><div class="cta">
          <div class="n" id="prepn">${sec}</div><div class="u">préparation</div></div></div>
        ${S.H.prepHtml ? S.H.prepHtml(S) : ''}</div></div>
      <div class="stage-foot"><button class="btn btn-ghost btn-block" data-act="skipprep">Je suis prêt ${icon('chevron')}</button></div>`;
    const cv = $('#vz'); S.viz = cv ? new Viz(cv) : null;
    let done = false;
    const finish = () => { if (!done) { done = true; sfx('win'); vibrate(40); res(); } };
    S._skipPrep = finish;
    const t0 = performance.now();
    const loop = () => {
      if (!S || S.phase !== 'prep' || done) return;
      const left = Math.max(0, sec - (performance.now() - t0) / 1000);
      const el = $('#prepn'); if (el) el.textContent = Math.ceil(left);
      S.viz?.draw({ mode: 'ring', level: .28, progress: 1 - left / sec });
      if (left <= 0) return finish();
      S.raf = requestAnimationFrame(loop);
    };
    loop();
  });
}

async function goActive() {
  S.phase = 'active';
  stage().innerHTML = `${head(S.H.roundHead ? S.H.roundHead(S) : S.ex.sub)}
    <div class="stage-body">${S.H.live(S)}</div>
    <div class="stage-foot">
      ${S.H.autoOnly ? '' : `<button class="btn btn-primary btn-block" data-act="stop">${icon('stop')} ${
        (S.H.rounds ? S.round + 1 < S.H.rounds(S) : false) ? "Valider et passer au suivant" : "Terminer et analyser"}</button>`}
    </div>`;
  const cv = $('#vz'); S.viz = cv ? new Viz(cv) : null;

  // micro
  if (S.H.needs.mic || S.ex.data?.mic !== false) {
    if (support.mic && (S.H.needs.mic || S.H.needs.recog)) {
      try {
        if (!S.mic || !S.mic.running) { S.mic = new Mic(); await S.mic.start(); }
      } catch (e) {
        if (S.H.needs.mic) { toast("Micro refusé — autorise l'accès pour cet exercice", 3200); return renderBrief(); }
      }
    }
  }
  // reconnaissance (une seule instance pour tout l'exercice)
  if (S.H.needs.recog && support.recog && !S.recog) {
    S.recog = new Recognizer({
      lang: store.get().profile.lang,
      onUpdate: () => { S.transcript = S.recog.text; if (S.recog.text) S.recogOk = true; },
    });
    S.recog.start();
  }
  if (S.recog) S.recog.final = '', S.recog.interim = '';

  S.t0 = performance.now();
  S._micBase = S.mic ? S.mic.speakMs : 0;
  await S.H.onStart?.(S);
  const loop = () => {
    if (!S || S.phase !== 'active') return;
    S.elapsed = (performance.now() - S.t0) / 1000;
    if (S.recog) S.transcript = S.recog.text;
    try { S.H.tick(S); } catch (e) { console.warn(e); }
    if (S.H.done?.(S)) return finishRound();
    S.raf = requestAnimationFrame(loop);
  };
  loop();
}

async function finishRound() {
  if (!S || S.phase !== 'active') return;
  S.phase = 'wait';
  cancelAnimationFrame(S.raf);
  const total = S.H.rounds ? S.H.rounds(S) : 1;
  const r = S.H.endRound ? S.H.endRound(S) : {};
  S.rounds.push(r);
  S.H.onStop?.(S);
  S.metro?.stop();

  if (S.round + 1 < total) {
    S.round++;
    sfx('ok');
    return startRound();
  }
  // dernière manche → on coupe tout et on analyse
  const out = S.mic?.running ? await S.mic.stop() : { blob: null, snapshot: null };
  S.snap = out.snapshot || S.mic?.snapshot?.() || { duration: S.elapsed, levels: [], pitches: [], pauses: [], onsets: [], speakMs: 0, silenceMs: 0 };
  S.blob = out.blob;
  try { S.recog?.stop(); } catch {}
  renderResult();
}

/* ------------------------------ Résultats ------------------------------ */
/** Une prise sans voix n'est pas une performance : on ne la note pas et on ne l'enregistre pas. */
function isEmptyTake() {
  if (S.ex.kind === 'guided') return false;
  const voiced = (S.snap?.speakMs || 0) / 1000;
  const said = A.words(S.transcript).length;
  const answered = S.ex.kind === 'pairs' && S.rounds.some(r => r.heard);
  return voiced < 1.2 && !said && !answered;
}

function renderEmptyTake() {
  S.phase = 'result';
  const q = S.opts.queue;
  stage().innerHTML = `${head('prise vide')}
    <div class="stage-body" style="justify-content:center"><div class="stack g16">
      <div class="center" style="font-size:40px">🎙️</div>
      <h2 class="center">Aucune voix détectée</h2>
      <p class="muted center small">Cette prise n'est pas comptabilisée : elle n'apporterait aucune information sur ta progression.</p>
      <div class="card stack g8"><div class="tiny dim">À vérifier</div>
        <div class="small muted">· Le micro sélectionné est-il le bon ? (casque branché, entrée externe)</div>
        <div class="small muted">· Es-tu à 15–30 cm du micro ?</div>
        <div class="small muted">· L'onglet est-il resté au premier plan pendant la prise ?</div>
        <div class="small muted">· Parle en voix pleine : le chuchotement n'est pas détecté comme de la parole.</div></div>
    </div></div>
    <div class="stage-foot">
      <button class="btn btn-primary btn-block" data-act="retry">${icon('refresh')} Réessayer</button>
      <button class="btn btn-ghost btn-block" data-act="next">${q && q.i + 1 < q.n ? "Passer à l'exercice suivant" : "Quitter"}</button>
    </div>`;
  S.result = null;
}

function renderResult() {
  if (isEmptyTake()) return renderEmptyTake();
  S.phase = 'result';
  let res;
  try { res = S.H.finish(S); } catch (e) { console.error(e); res = { score: 50, cards: [], tips: [], metrics: {} }; }
  const dur = S.snap?.duration || S.elapsed;
  const tips = res.tips || A.coachTips(A.audioMetrics(S.snap), { kind: S.ex.kind });
  if (res.partial) tips.unshift({ kind: 'work', text: `**Analyse partielle** : la transcription de ta parole n'était pas disponible, seuls ${Math.round((res.coverage || 0) * 100)} % des critères ont pu être évalués. La note est donc plafonnée. Pour l'analyse complète (précision des mots, débit, tics), utilise Chrome ou Edge.` });
  const saved = store.recordSession({
    exerciseId: S.ex.id, kind: S.ex.kind, title: S.ex.title,
    score: res.score, skills: res.skills || S.ex.skills, metrics: res.metrics || {}, duration: dur,
  });
  sfx(res.score >= 80 ? 'win' : 'ok'); vibrate(res.score >= 80 ? 60 : 25);

  const url = S.blob ? URL.createObjectURL(S.blob) : null;
  const q = S.opts.queue;
  const nextLabel = q && q.i + 1 < q.n ? "Exercice suivant" : "Terminer";

  stage().innerHTML = `${head('résultat')}
    <div class="stage-body"><div class="stack g16">
      <div class="result-hero">
        <div class="score">${Math.round(res.score)}</div>
        <div class="lbl">${A.gradeLabel(res.score)} · ${esc(S.ex.title)}${res.partial ? ' · analyse partielle' : ''}</div>
        <div class="row" style="justify-content:center;margin-top:12px;gap:8px;flex-wrap:wrap">
          <span class="xp-pop">+${saved.gained} XP</span>
          ${saved.levelUp ? `<span class="xp-pop">${icon('trophy')} Niveau ${saved.levelUp}</span>` : ''}
          ${Object.entries(saved.deltas).filter(([, v]) => v >= .4).map(([k, v]) =>
            `<span class="chip ok">${{ articulation: 'Articulation', debit: 'Débit', prosodie: 'Prosodie', fluidite: 'Fluidité', projection: 'Projection' }[k]} +${v.toFixed(1)}</span>`).join('')}
        </div>
      </div>
      ${res.cards?.length ? `<div class="metrics">${res.cards.join('')}</div>` : ''}
      ${tips.length ? `<div class="stack g8">${tips.map(t =>
        `<div class="tip ${t.kind}"><span class="ic">${icon(t.kind === 'good' ? 'check' : 'bulb')}</span><span>${md(t.text)}</span></div>`).join('')}</div>` : ''}
      ${res.detail || ''}
      ${url ? `<div class="card stack g8"><div class="tiny dim">Réécoute ta prise — c'est l'exercice le plus efficace de tous</div>
        <audio controls src="${url}" style="width:100%"></audio></div>` : ''}
      ${saved.newBadges.length ? `<div class="card stack g8"><div class="tiny dim">Nouveau${saved.newBadges.length > 1 ? 'x' : ''} badge${saved.newBadges.length > 1 ? 's' : ''}</div>
        <div class="row wrap">${saved.newBadges.map(b => `<span class="chip on">${b.e} ${esc(b.n)}</span>`).join('')}</div></div>` : ''}
    </div></div>
    <div class="stage-foot">
      <button class="btn btn-primary btn-block" data-act="next">${esc(nextLabel)}</button>
      <button class="btn btn-ghost btn-block" data-act="retry">${icon('refresh')} Recommencer cet exercice</button>
    </div>`;
  S.result = { ...res, score: Math.round(res.score), saved };
}

/* ------------------------------ Interactions ------------------------------ */
function onStageClick(e) {
  const btn = e.target.closest('[data-act]');
  if (!btn || !S) return;
  const act = btn.dataset.act;
  vibrate(8);
  switch (act) {
    case 'quit':
      if (S.phase === 'active' && S.elapsed > 3) { if (!confirm("Quitter l'exercice ? La prise en cours sera perdue.")) return; }
      close(null); break;
    case 'begin': begin(); break;
    case 'stop': finishRound(); break;
    case 'nextround': finishRound(); break;
    case 'skipprep': S._skipPrep?.(); break;
    case 'skipstep': H.guided.next(S); break;
    case 'retry': { const ex = S.ex, o = S.opts; close(null); setTimeout(() => run(ex, o), 60); break; }
    case 'next': close(S.result || { score: 0, empty: true }); break;
    case 'listen': speak(btn.dataset.text, { lang: store.get().profile.lang, rate: 0.86 }); break;
    case 'reroll': S.params.pick = Math.floor(Math.random() * TWISTERS.length); renderBrief(); break;
    case 'rerollTopic': S.params.topic = rnd(TOPICS); renderBrief(); break;
    case 'pick': S.params.pick = +btn.dataset.i; renderBrief(); break;
    case 'pickset': S.params.set = +btn.dataset.i; renderBrief(); break;
    case 'pickdrill': S.params.pick = +btn.dataset.i; renderBrief(); break;
    case 'bpmup': case 'bpmdown': {
      S.params.bpm = clamp(S.params.bpm + (act === 'bpmup' ? 8 : -8), 40, 200);
      S.metro?.setBpm(S.params.bpm); toast(`${S.params.bpm} BPM`, 1200); break;
    }
  }
}
function onStageInput(e) {
  if (!S) return;
  const t = e.target;
  if (t.id === 'tg') $('#tgv').textContent = `${t.value} mots/min`;
  if (t.id === 'bpm') { S.params.bpm = +t.value; $('#bpmv').textContent = `${t.value} BPM`; }
  if (t.id === 'spd') { $('#spdv').textContent = `${t.value} mpm`; }
}

/* Si l'utilisateur quitte l'onglet pendant une prise, le navigateur suspend la boucle
   d'animation : on clôture proprement au lieu de rester figé. */
document.addEventListener('visibilitychange', () => {
  if (!S || !document.hidden) return;
  if (S.phase === 'active') {
    S.interrupted = true;
    if (S.elapsed > 3) finishRound();
    else { toast("Exercice interrompu : reste sur l'écran pendant la prise", 3200); close(null); }
  }
});

/* échappement clavier (ordinateur) */
window.addEventListener('keydown', e => {
  if (!S) return;
  if (e.key === 'Escape') { if (S.phase === 'result') close(S.result); else close(null); }
  if (e.key === ' ' && S.phase === 'active' && !S.H.autoOnly) { e.preventDefault(); finishRound(); }
});
