/* ==========================================================================
   store.js — état persistant, progression, XP, séries, records
   ========================================================================== */
import { BADGES, PROGRAM, SKILLS } from './content.js';

const KEY = 'clair.state.v1';
const ALPHA = 0.28;          // poids d'une nouvelle séance dans une compétence
const MAX_SESSIONS = 400;    // historique conservé

const todayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayDiff = (a, b) => Math.round((new Date(b + 'T00:00') - new Date(a + 'T00:00')) / 864e5);

function blank() {
  return {
    v: 1,
    createdAt: Date.now(),
    profile: { name: '', lang: 'fr-FR', targetWpm: 150, dailyGoal: 2 },
    skills: { articulation: 0, debit: 0, prosodie: 0, fluidite: 0, projection: 0 },
    counts: { articulation: 0, debit: 0, prosodie: 0, fluidite: 0, projection: 0 },
    xp: 0,
    sessions: [],
    streak: { current: 0, best: 0, lastDay: null },
    program: { done: {} },
    records: { phonation: 0, twister: 0, bestScore: 0, longestTalk: 0, wpmAccuracy: 0 },
    badges: [],
    seen: { onboarded: false },
    settings: { haptics: true, sound: true, theme: 'dark', tips: true, autoStop: true },
  };
}

function migrate(s) {
  const b = blank();
  const out = { ...b, ...s };
  for (const k of ['profile', 'skills', 'counts', 'streak', 'program', 'records', 'settings', 'seen'])
    out[k] = { ...b[k], ...(s[k] || {}) };
  out.sessions = Array.isArray(s.sessions) ? s.sessions : [];
  out.badges = Array.isArray(s.badges) ? s.badges : [];
  return out;
}

let state = load();
const subs = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? migrate(JSON.parse(raw)) : blank();
  } catch { return blank(); }
}
function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch (e) { console.warn('Sauvegarde impossible', e); }
}
export function subscribe(fn) { subs.add(fn); return () => subs.delete(fn); }
function emit() { persist(); subs.forEach(f => f(state)); }

export const get = () => state;

/* ------------------------------ Niveaux ------------------------------ */
/* xp cumulé requis pour atteindre le niveau n : 120 * (n-1) * n / 2 */
export const xpForLevel = n => 60 * (n - 1) * n;
export function levelInfo(xp = state.xp) {
  let n = 1;
  while (xpForLevel(n + 1) <= xp) n++;
  const base = xpForLevel(n), next = xpForLevel(n + 1);
  return { level: n, base, next, into: xp - base, span: next - base, pct: (xp - base) / (next - base) };
}
export const TITLES = [
  [1, "Débutant"], [3, "Apprenti"], [5, "Voix qui se pose"], [8, "Orateur en formation"],
  [11, "Orateur assuré"], [15, "Voix claire"], [20, "Orateur confirmé"], [26, "Belle diction"],
  [33, "Maître de la parole"], [42, "Virtuose"],
];
export function title(lvl = levelInfo().level) {
  let t = TITLES[0][1];
  for (const [l, name] of TITLES) if (lvl >= l) t = name;
  return t;
}

/* ------------------------------ Séries ------------------------------ */
function bumpStreak() {
  const t = todayKey(), st = state.streak;
  if (st.lastDay === t) return;
  st.current = st.lastDay && dayDiff(st.lastDay, t) === 1 ? st.current + 1 : 1;
  st.lastDay = t;
  st.best = Math.max(st.best, st.current);
}
export function streakStatus() {
  const st = state.streak, t = todayKey();
  if (!st.lastDay) return { ...st, current: 0, activeToday: false };
  const gap = dayDiff(st.lastDay, t);
  return { ...st, current: gap <= 1 ? st.current : 0, activeToday: gap === 0 };
}
/** 7 derniers jours (lun→dim glissant), pour la frise d'accueil */
export function last7Days() {
  const days = [];
  const done = new Set(state.sessions.map(s => todayKey(new Date(s.date))));
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const k = todayKey(d);
    days.push({ key: k, label: ['D', 'L', 'M', 'M', 'J', 'V', 'S'][d.getDay()], done: done.has(k), today: i === 0 });
  }
  return days;
}
export const sessionsToday = () =>
  state.sessions.filter(s => todayKey(new Date(s.date)) === todayKey()).length;

/* ------------------------------ Enregistrement d'une séance ------------------------------ */
export function recordSession({ exerciseId, kind, title: label, score, skills, metrics = {}, duration = 0, extra = {} }) {
  const sc = Math.max(0, Math.min(100, Math.round(score)));
  const before = { ...state.skills };
  const beforeLevel = levelInfo().level;

  // Compétences : moyenne courante au début (peu de données), puis moyenne exponentielle.
  // Une compétence peu sollicitée par l'exercice (poids < .3) ne bouge que marginalement.
  for (const [k, w] of Object.entries(skills || {})) {
    if (!(k in state.skills) || !w) continue;
    const n = state.counts[k] || 0;
    const a = w >= .3 ? Math.max(ALPHA * w, 1 / (n + 1)) : ALPHA * w;
    state.skills[k] = state.skills[k] * (1 - a) + sc * a;
    if (w >= .3) state.counts[k] = n + 1;
  }
  for (const k of Object.keys(state.skills)) state.skills[k] = Math.round(state.skills[k] * 10) / 10;

  // XP : base + bonus performance + bonus durée
  const gained = Math.round(10 + sc * 0.5 + Math.min(duration, 240) / 24);
  state.xp += gained;

  state.sessions.unshift({
    id: `s${Date.now().toString(36)}`, date: Date.now(),
    exerciseId, kind, title: label, score: sc, skills, metrics, duration,
    snap: { ...state.skills },      // niveau des compétences juste après la séance
    ...extra,
  });
  if (state.sessions.length > MAX_SESSIONS) state.sessions.length = MAX_SESSIONS;

  // Records
  const r = state.records;
  r.bestScore = Math.max(r.bestScore || 0, sc);
  if (kind === 'phonation' && metrics.seconds) r.phonation = Math.max(r.phonation || 0, Math.round(metrics.seconds * 10) / 10);
  if (kind === 'twister' && metrics.accuracy >= 90 && metrics.wpm) r.twister = Math.max(r.twister || 0, Math.round(metrics.wpm));
  if (kind === 'impro') r.longestTalk = Math.max(r.longestTalk || 0, Math.round(duration));
  if (metrics.accuracy) r.wpmAccuracy = Math.max(r.wpmAccuracy || 0, Math.round(metrics.accuracy));

  bumpStreak();
  const newBadges = refreshBadges();
  const afterLevel = levelInfo().level;
  emit();

  return {
    gained, score: sc, newBadges,
    levelUp: afterLevel > beforeLevel ? afterLevel : null,
    deltas: Object.fromEntries(Object.keys(state.skills).map(k => [k, Math.round((state.skills[k] - before[k]) * 10) / 10])),
  };
}

export function markProgramSession(sessionId) {
  if (!state.program.done[sessionId]) { state.program.done[sessionId] = Date.now(); refreshBadges(); emit(); }
}

/* ------------------------------ Badges ------------------------------ */
function refreshBadges() {
  const ctx = { ...state, level: levelInfo().level, streak: streakStatus() };
  const won = [];
  for (const b of BADGES) {
    if (state.badges.includes(b.id)) continue;
    try { if (b.test(ctx)) { state.badges.push(b.id); won.push(b); } } catch {}
  }
  return won;
}

/* ------------------------------ Lecture / dérivés ------------------------------ */
export function nextProgramSession() {
  for (const w of PROGRAM)
    for (const s of w.sessions)
      if (!state.program.done[s.id]) return { week: w, session: s };
  return null;
}
export function programProgress() {
  const all = PROGRAM.flatMap(w => w.sessions);
  return { done: all.filter(s => state.program.done[s.id]).length, total: all.length };
}
export const overall = () => {
  const v = Object.values(state.skills);
  return Math.round(v.reduce((a, b) => a + b, 0) / v.length);
};
export function weakest() {
  const e = Object.entries(state.skills).sort((a, b) => a[1] - b[1])[0];
  return { key: e[0], value: e[1], ...SKILLS[e[0]] };
}
export function scoreHistory(kind = null, n = 20) {
  return state.sessions.filter(s => !kind || s.kind === kind).slice(0, n).reverse().map(s => s.score);
}
/** Évolution réelle de la compétence : valeur enregistrée après chacune des n dernières séances. */
export function skillTrend(key, n = 12) {
  const pts = state.sessions
    .filter(s => s.snap && typeof s.snap[key] === 'number')
    .slice(0, n).reverse()
    .map(s => s.snap[key]);
  return pts.length ? pts : [state.skills[key]];
}
export function stats() {
  const s = state.sessions;
  const total = s.reduce((a, x) => a + (x.duration || 0), 0);
  return {
    count: s.length,
    minutes: Math.round(total / 60),
    avg: s.length ? Math.round(s.reduce((a, x) => a + x.score, 0) / s.length) : 0,
    avg10: s.length ? Math.round(s.slice(0, 10).reduce((a, x) => a + x.score, 0) / Math.min(10, s.length)) : 0,
  };
}

/* ------------------------------ Réglages / maintenance ------------------------------ */
export function setSetting(k, v) { state.settings[k] = v; emit(); }
export function setProfile(k, v) { state.profile[k] = v; emit(); }
export function markSeen(k) { state.seen[k] = true; emit(); }
export function exportJSON() { return JSON.stringify(state, null, 2); }
export function importJSON(txt) {
  const parsed = JSON.parse(txt);
  if (!parsed || typeof parsed !== 'object' || !('skills' in parsed)) throw new Error('Format non reconnu');
  state = migrate(parsed); emit(); return true;
}
export function resetAll() { state = blank(); emit(); }
export function deleteSession(id) {
  state.sessions = state.sessions.filter(s => s.id !== id); emit();
}
