/* Petits utilitaires d'interface : thème, retour haptique, sons, icônes. */
import { haptic, blip } from '../legacy/audio.js';
import { icon as legacyIcon } from '../legacy/ui.js';
import { getState, type Theme } from './state';

export function resolveTheme(t: Theme): 'light' | 'dark' {
  if (t !== 'auto') return t;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function applyTheme(t: Theme) {
  const r = resolveTheme(t);
  document.documentElement.dataset.theme = r;
  document.querySelectorAll('meta[name="theme-color"]').forEach(m => m.setAttribute('content', r === 'light' ? '#F6F4F0' : '#0B0D12'));
}

/** Vibration courte (Android). iOS ne l'expose pas : le retour reste visuel. */
export const tap = (ms = 10) => getState().settings.haptics && haptic(ms);
export const chime = (k: 'ok' | 'win' = 'ok') => getState().settings.sound && blip(k);

/** Icône SVG (jeu d'icônes de la v1) sous forme de HTML. */
export const iconHtml = (name: string) => legacyIcon(name);

export const fmtClock = (s: number) => {
  const v = Math.max(0, Math.ceil(s));
  return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, '0')}`;
};

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
