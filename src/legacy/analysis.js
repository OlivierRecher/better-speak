/* ==========================================================================
   analysis.js — mesures objectives + notation + conseils
   ========================================================================== */
import { hzToSemi } from './audio.js';

/* ------------------------------ Texte ------------------------------ */
const strip = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
export const words = t => strip(String(t).toLowerCase())
  .replace(/[’'ʼ]/g, '')          // élisions : « l'archiduchesse » → « larchiduchesse »
  .replace(/[-–—_]/g, ' ')        // « sont-elles » → deux mots
  .replace(/[^a-z0-9 ]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .split(' ')
  .filter(Boolean);

/** Distance de Levenshtein au niveau des mots + alignement (pour surligner le texte) */
export function align(ref, hyp) {
  const n = ref.length, m = hyp.length;
  const d = Array.from({ length: n + 1 }, (_, i) => {
    const row = new Int32Array(m + 1); row[0] = i; return row;
  });
  for (let j = 0; j <= m; j++) d[0][j] = j;
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++)
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + (ref[i - 1] === hyp[j - 1] ? 0 : 1),
      );
  // remontée
  let i = n, j = m; const marks = new Array(n).fill('sub'); let sub = 0, del = 0, ins = 0;
  while (i > 0 && j > 0) {
    if (ref[i - 1] === hyp[j - 1] && d[i][j] === d[i - 1][j - 1]) { marks[i - 1] = 'hit'; i--; j--; }
    else if (d[i][j] === d[i - 1][j - 1] + 1) { marks[i - 1] = 'sub'; sub++; i--; j--; }
    else if (d[i][j] === d[i - 1][j] + 1) { marks[i - 1] = 'del'; del++; i--; }
    else { ins++; j--; }
  }
  while (i > 0) { marks[i - 1] = 'del'; del++; i--; }
  ins += j;
  const dist = d[n][m];
  return { marks, dist, sub, del, ins, accuracy: n ? Math.max(0, 100 * (1 - dist / n)) : 0 };
}

/* ------------------------------ Tics de langage ------------------------------ */
export const FILLERS = [
  { p: /\b(euh+|heu+|hein|hum+|bah|ben|beh)\b/g, l: 'euh / bah' },
  { p: /\bdu coup\b/g, l: 'du coup' },
  { p: /\ben fait\b/g, l: 'en fait' },
  { p: /\bvoila\b/g, l: 'voilà' },
  { p: /\bgenre\b/g, l: 'genre' },
  { p: /\btu vois\b/g, l: 'tu vois' },
  { p: /\bc'est(-| )a(-| )dire\b/g, l: "c'est-à-dire" },
  { p: /\bun peu\b/g, l: 'un peu' },
  { p: /\bje pense que\b/g, l: 'je pense que' },
  { p: /\bdisons\b/g, l: 'disons' },
  { p: /\bquelque part\b/g, l: 'quelque part' },
  { p: /\bfinalement\b/g, l: 'finalement' },
  { p: /\bon va dire\b/g, l: 'on va dire' },
];
export function findFillers(text) {
  const t = ' ' + strip(String(text).toLowerCase()).replace(/[’']/g, "'") + ' ';
  const detail = [];
  let total = 0;
  for (const f of FILLERS) {
    const m = t.match(f.p);
    if (m?.length) { detail.push({ label: f.l, n: m.length }); total += m.length; }
  }
  detail.sort((a, b) => b.n - a.n);
  return { total, detail };
}

/* ------------------------------ Signal audio ------------------------------ */
export function audioMetrics(snap) {
  const { duration = 0, speakMs = 0, silenceMs = 0, levels = [], pitches = [], pauses = [] } = snap || {};
  const speakSec = speakMs / 1000;
  const silenceRatio = duration > 0 ? Math.min(1, silenceMs / 1000 / duration) : 0;

  // volume : moyenne et stabilité pendant la parole seulement
  const loud = levels.filter(l => l > 0.03);
  const mean = loud.length ? loud.reduce((a, b) => a + b, 0) / loud.length : 0;
  const sd = loud.length > 1
    ? Math.sqrt(loud.reduce((a, b) => a + (b - mean) ** 2, 0) / loud.length) : 0;
  const volCv = mean > 0 ? sd / mean : 1;             // coefficient de variation
  const dbfs = mean > 0 ? 20 * Math.log10(mean) : -80;

  // hauteur : dispersion en demi-tons (médiane robuste, on écarte les 10 % extrêmes)
  const semis = pitches.map(p => hzToSemi(p.hz)).sort((a, b) => a - b);
  let pitchSd = 0, pitchRange = 0, medianHz = 0;
  if (semis.length > 8) {
    const cut = Math.floor(semis.length * 0.08);
    const core = semis.slice(cut, semis.length - cut);
    const mu = core.reduce((a, b) => a + b, 0) / core.length;
    pitchSd = Math.sqrt(core.reduce((a, b) => a + (b - mu) ** 2, 0) / core.length);
    pitchRange = core[core.length - 1] - core[0];
    medianHz = 110 * Math.pow(2, core[Math.floor(core.length / 2)] / 12);
  }
  const voicedRatio = duration > 0 ? Math.min(1, pitches.length / (duration * 20)) : 0;

  const longPauses = pauses.filter(p => p.dur >= 1200);
  const avgPause = pauses.length ? pauses.reduce((a, p) => a + p.dur, 0) / pauses.length : 0;

  return {
    duration, speakSec, silenceRatio,
    volMean: mean, volSd: sd, volCv, dbfs, peak: snap?.peak || 0,
    pitchSd, pitchRange, medianHz, voicedRatio,
    pauses: pauses.length, longPauses: longPauses.length, avgPause,
    pausesPerMin: duration > 0 ? pauses.length / (duration / 60) : 0,
  };
}

/* ------------------------------ Notation ------------------------------ */
/** 100 dans [lo,hi], décroissance linéaire jusqu'à 0 à distance `fall` de la zone */
export function bandScore(v, lo, hi, fall = (hi - lo) * 1.6) {
  if (v >= lo && v <= hi) return 100;
  const d = v < lo ? lo - v : v - hi;
  return Math.max(0, 100 * (1 - d / fall));
}
/** croissant : 0 à `lo`, 100 à `hi` */
export const upScore = (v, lo, hi) => Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100));
/** décroissant : 100 à `good`, 0 à `bad` */
export const downScore = (v, good, bad) => Math.max(0, Math.min(100, ((bad - v) / (bad - good)) * 100));

export const mix = parts => {
  const tw = parts.reduce((a, p) => a + p.w, 0) || 1;
  return parts.reduce((a, p) => a + p.v * p.w, 0) / tw;
};

/* Repères de référence utilisés partout */
export const REF = {
  wpm: [138, 168],        // mots/min confortables à l'oral
  wpmRead: [140, 175],
  silence: [0.10, 0.22],  // part de silence saine
  pitchSd: [1.8, 4.2],    // écart-type en demi-tons ; parole expressive ≈ 2–4
  volCv: 0.42,            // au-delà = volume instable
  fillersPerMin: [0, 2],
  pausesPerMin: [6, 18],
};

export const wpm = (nWords, seconds) => (seconds > 0 ? (nWords / seconds) * 60 : 0);

/* ------------------------------ Conseils ------------------------------ */
const tip = (kind, text) => ({ kind, text });

export function coachTips(m, { kind, refWords = 0, accuracy = null, fillers = null, target = null } = {}) {
  const out = [];
  const push = (k, t) => out.push(tip(k, t));

  if (m.wpm != null && refWords > 4) {
    const [lo, hi] = target ? [target - 12, target + 12] : REF.wpm;
    if (m.wpm > hi + 22) push('work', `**${Math.round(m.wpm)} mots/min** : c'est trop rapide pour être suivi. Ne ralentis pas les mots — ajoute un silence à chaque virgule et deux à chaque point.`);
    else if (m.wpm > hi) push('work', `**${Math.round(m.wpm)} mots/min**, un peu au-dessus de la zone confortable (${lo}–${hi}). Marque mieux les fins de phrase.`);
    else if (m.wpm < lo - 25) push('work', `**${Math.round(m.wpm)} mots/min** : le débit traîne et l'attention décroche. Enchaîne les groupes de sens sans étirer les voyelles.`);
    else if (m.wpm < lo) push('work', `**${Math.round(m.wpm)} mots/min**, légèrement lent. Garde les silences mais accélère l'intérieur des phrases.`);
    else push('good', `Débit de **${Math.round(m.wpm)} mots/min** : pile dans la zone d'un orateur clair.`);
  }

  if (accuracy != null) {
    if (accuracy >= 96) push('good', `Précision **${Math.round(accuracy)} %** : chaque mot est passé. Tu peux monter la vitesse.`);
    else if (accuracy >= 85) push('work', `Précision **${Math.round(accuracy)} %**. Les mots manqués sont surlignés : reprends-les isolément, lentement, cinq fois.`);
    else push('work', `Précision **${Math.round(accuracy)} %** : trop de syllabes se perdent. Refais l'exercice à moitié de la vitesse avant de chercher le tempo.`);
  }

  if (fillers != null && m.duration > 12) {
    const perMin = fillers.total / Math.max(0.4, m.duration / 60);
    if (fillers.total === 0) push('good', "Aucun tic de langage détecté. C'est rare et c'est excellent.");
    else if (perMin <= 2) push('good', `${fillers.total} tic${fillers.total > 1 ? 's' : ''} de langage seulement (${perMin.toFixed(1)}/min). Tu es dans le vert.`);
    else push('work', `**${fillers.total} tics** (${perMin.toFixed(1)}/min), dont « ${fillers.detail[0].label} » ×${fillers.detail[0].n}. Le remède n'est pas de te retenir : c'est de respirer à la place.`);
  }

  if (m.silenceRatio != null && m.duration > 15) {
    if (m.silenceRatio < 0.06) push('work', "Presque aucun silence : le discours est un bloc continu. Laisse une seconde entière après chaque idée importante.");
    else if (m.silenceRatio > 0.34) push('work', `${Math.round(m.silenceRatio * 100)} % de silence : les hésitations prennent trop de place. Prépare ta phrase suivante pendant que tu termines la précédente.`);
    else if (m.silenceRatio >= 0.10 && m.silenceRatio <= 0.24) push('good', `Respiration du discours équilibrée (${Math.round(m.silenceRatio * 100)} % de silence).`);
  }

  if (m.pitchSd > 0 && m.voicedRatio > 0.15) {
    if (m.pitchSd < 1.2) push('work', `Variation de hauteur de **${m.pitchSd.toFixed(1)} demi-ton** : c'est perçu comme monocorde. Choisis trois mots clés et monte volontairement dessus.`);
    else if (m.pitchSd < 1.9) push('work', `Mélodie encore sage (${m.pitchSd.toFixed(1)} demi-tons). Descends nettement en fin de phrase déclarative, cela crée du relief.`);
    else if (m.pitchSd > 5.2) push('work', `Intonation très ample (${m.pitchSd.toFixed(1)} demi-tons) : attention à l'effet théâtral involontaire.`);
    else push('good', `Belle mélodie : **${m.pitchSd.toFixed(1)} demi-tons** de variation, la voix vit.`);
  }

  if (m.volCv != null && m.volMean > 0.02) {
    if (m.volCv > 0.55) push('work', "Volume instable : les fins de phrase retombent. C'est un manque d'air — reprends ton souffle une phrase plus tôt.");
    else if (m.volCv < 0.34) push('good', "Volume très stable d'un bout à l'autre : le souffle est bien géré.");
  }
  if (m.dbfs != null && m.dbfs < -34 && m.volMean > 0) push('work', "Voix faible captée par le micro. Vérifie la distance, puis travaille l'appui abdominal plutôt que la gorge.");

  if (kind === 'impro' && m.duration >= 20 && !out.some(o => o.kind === 'good'))
    push('good', "Tu es allé au bout sans t'arrêter. C'est déjà la moitié du travail.");

  return out.slice(0, 5);
}

/* ------------------------------ Utilitaires d'affichage ------------------------------ */
export const fmtTime = s => {
  s = Math.max(0, Math.round(s));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
export const gradeClass = v => (v >= 80 ? 'g' : v >= 60 ? 'w' : 'b');
export const gradeLabel = v =>
  v >= 92 ? "Excellent" : v >= 80 ? "Très bien" : v >= 68 ? "Bien" : v >= 55 ? "Correct" : v >= 40 ? "À consolider" : "À retravailler";
