/* Mini-exercices « dans l'élan » : 20 à 45 s, tirés des outils de l'Atelier.
   Ils prolongent l'élan après le défi sans redemander d'effort de décision. */
import { TWISTERS, DRILLS } from '../legacy/content.js';

export type MiniKind = 'twister' | 'breath' | 'intonation' | 'pataka' | 'finales' | 'silence';

export interface Mini {
  id: string;
  kind: MiniKind;
  label: string;
  secs: number;
  tone: string;
  /** texte principal affiché en grand */
  script: string;
  /** consigne courte */
  hint: string;
  /** étapes qui défilent (intonation), facultatif */
  cues?: string[];
}

const rnd = <T,>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)];

const PHRASES = ['Il est déjà huit heures.', 'On se retrouve demain matin.', 'Tu as reçu mon message ?', 'Le train arrive à quai.'];

export function makeMini(kind: MiniKind): Mini {
  switch (kind) {
    case 'twister': {
      const t = rnd(TWISTERS.filter((x: { d: number }) => x.d <= 2)) as { t: string };
      return { id: crypto.randomUUID(), kind, label: 'Virelangue express', secs: 30, tone: 'var(--c-acc)', script: `« ${t.t} »`, hint: 'Lent, puis 2× plus vite. Chaque consonne nette.' };
    }
    case 'breath':
      return { id: crypto.randomUUID(), kind, label: 'Souffle · /a/ tenu', secs: 40, tone: 'var(--c-teal)', script: '« aaaaaa… »', hint: 'Inspire par le ventre, puis tiens un « a » stable le plus longtemps possible.' };
    case 'intonation': {
      const p = rnd(PHRASES);
      return { id: crypto.randomUUID(), kind, label: 'Intonation · 1 phrase, 3 émotions', secs: 36, tone: 'var(--c-ember)', script: `« ${p} »`, hint: 'Change d’émotion à chaque signal. Exagère, personne n’écoute.', cues: ['Surpris·e', 'Déçu·e', 'Enthousiaste'] };
    }
    case 'pataka': {
      const d = DRILLS.find((x: { id: string }) => x.id === 'pataka') as { seq: string };
      return { id: crypto.randomUUID(), kind, label: 'Gamme · Pa-Ta-Ka', secs: 20, tone: 'var(--c-acc)', script: d.seq, hint: 'En boucle, net, puis accélère sans rien écraser.' };
    }
    case 'finales': {
      const d = DRILLS.find((x: { id: string }) => x.id === 'finales') as { seq: string };
      return { id: crypto.randomUUID(), kind, label: 'Consonnes finales', secs: 25, tone: 'var(--c-gold)', script: d.seq, hint: 'Va jusqu’à la dernière consonne de chaque mot.' };
    }
    case 'silence':
      return { id: crypto.randomUUID(), kind, label: 'Accepte le silence', secs: 30, tone: 'var(--c-green)', script: 'Une phrase · 2 s de silence · une phrase', hint: 'Parle de ta journée. Entre chaque phrase, tiens 2 secondes de silence.' };
  }
}

const ALL: MiniKind[] = ['twister', 'breath', 'intonation', 'pataka', 'finales', 'silence'];

/** Tirage varié : 3 mini-exos de familles différentes. */
export function drawMinis(n = 3): Mini[] {
  const kinds = [...ALL].sort(() => Math.random() - 0.5).slice(0, n);
  return kinds.map(makeMini);
}
