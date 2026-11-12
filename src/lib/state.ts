/* Pont typé entre React et le store persistant hérité (src/legacy/store.js).
   Le store reste la source unique de vérité : le moteur d'exercices de l'Atelier
   et les nouveaux écrans lisent et écrivent au même endroit. */
import { useSyncExternalStore } from 'react';
import * as store from '../legacy/store.js';

export type Theme = 'auto' | 'light' | 'dark';
export type Media = 'audio' | 'video';

export interface DayStat {
  reps: number;
  defis: number;
  secs: number;
}
export interface Session {
  id: string;
  date: number;
  exerciseId?: string;
  kind: string;
  title: string;
  score: number | null;
  effort?: boolean;
  duration: number;
  snap?: Record<string, number>;
}
export interface Settings {
  haptics: boolean;
  sound: boolean;
  theme: Theme;
  softMode: boolean;
  keepTakes: boolean;
  joker: boolean;
  media: Media;
}
export interface Reminder {
  enabled: boolean;
  time: string;
  anchor: string;
}
export interface ClairState {
  profile: { name: string; lang: string; targetWpm: number; dailyGoal: number };
  skills: Record<SkillKey, number>;
  counts: Record<SkillKey, number>;
  xp: number;
  sessions: Session[];
  streak: { current: number; best: number; lastDay: string | null };
  program: { done: Record<string, number> };
  records: { phonation: number; twister: number; bestScore: number; longestTalk: number; wpmAccuracy: number };
  badges: string[];
  settings: Settings;
  reminder: Reminder;
  days: Record<string, DayStat>;
  totalReps: number;
}
export type SkillKey = 'articulation' | 'debit' | 'prosodie' | 'fluidite' | 'projection';

export interface StreakInfo {
  current: number;
  best: number;
  activeToday: boolean;
  atRisk: boolean;
  jokerAvailable: boolean;
  jokerDays: string[];
}

export const getState = () => store.get() as unknown as ClairState;

/** Abonne le composant au store ; renvoie l'état courant à chaque mutation. */
export function useClair(): ClairState {
  useSyncExternalStore(store.subscribe, store.getVersion);
  return getState();
}

export const streak = () => store.computeStreak() as StreakInfo;
export const activeDays = (): number => store.activeDays();
export const todayKey = (d: Date = new Date()): string => store.todayKey(d);
export const isActive = (k: string): boolean => store.isActive(k);

export function setSetting<K extends keyof Settings>(k: K, v: Settings[K]) {
  store.setSetting(k, v);
}
export const setReminder = (patch: Partial<Reminder>) => store.setReminder(patch);
export const setName = (name: string) => store.setProfile('name', name);

export function recordRep(opts: { kind: string; secs?: number; defi?: boolean; title?: string }) {
  return store.recordRep(opts) as { gained: number; repsToday: number; newBadges: { e: string; n: string }[] };
}

/* ------------------------------ Cycle neurobiologique ------------------------------
   Les études sur la formation d'habitudes (Lally et al., 2010) situent l'automatisation
   autour de 66 jours en médiane. On découpe le parcours en trois phases lisibles. */
export const PHASES = [
  { key: 'ancrage', name: 'Ancrage', from: 1, to: 14, color: 'var(--c-green)', text: 'Le geste devient familier. Ne casse pas la chaîne.' },
  { key: 'consolidation', name: 'Consolidation', from: 15, to: 30, color: 'var(--c-teal)', text: 'Le circuit se renforce, les replays se ciblent.' },
  { key: 'automatisation', name: 'Automatisation', from: 31, to: 66, color: 'var(--c-acc2)', text: 'Parler devient un réflexe, plus un effort.' },
] as const;

export function phaseOf(day: number) {
  const i = PHASES.findIndex(p => day <= p.to);
  return i === -1 ? { index: 3, phase: null } : { index: i, phase: PHASES[i] };
}

/** « Myélinisation » : progression saturante (chaque rep compte, de moins en moins). */
export const myelin = (reps: number) => 1 - Math.exp(-reps / 150);
