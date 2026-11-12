/* Sujets du défi quotidien : concrets, racontables sans réfléchir.
   Règle éditoriale : on doit pouvoir commencer à parler dans la seconde.
   Pas d'opinion à construire, pas de culture générale, pas de piège. */
export const DIRECT_TOPICS = [
  'Raconte ta matinée, du réveil à maintenant.',
  'Décris ce que tu vois par la fenêtre.',
  'Décris la pièce où tu es, comme à un ami au téléphone.',
  'Raconte ton dernier repas.',
  'Explique comment tu prépares ton café ou ton thé.',
  'Décris ton trajet le plus fréquent.',
  'Raconte ton dernier week-end.',
  "Présente l'objet le plus proche de ta main.",
  'Raconte la dernière série ou le dernier film que tu as vu.',
  'Décris ta cuisine, placard par placard.',
  'Raconte ce que tu vas faire ce soir.',
  "Décris la météo d'aujourd'hui et ce qu'elle te donne envie de faire.",
  'Raconte ton dernier fou rire.',
  'Décris ton petit-déjeuner idéal.',
  'Raconte la dernière chose que tu as achetée.',
  'Décris ta rue à quelqu’un qui ne l’a jamais vue.',
  'Raconte ta journée d’hier en commençant par la fin.',
  'Explique ton métier à un enfant de 8 ans.',
  'Décris le dernier endroit où tu es allé·e en vacances.',
  'Raconte une recette que tu sais faire par cœur.',
  'Décris tes chaussures préférées.',
  'Raconte ce que tu as fait pendant ta dernière pause.',
  'Décris ton bureau ou ton coin de travail.',
  'Raconte la dernière conversation qui t’a fait sourire.',
  'Décris ton sac et tout ce qu’il contient.',
  'Raconte comment tu as rencontré un ami proche.',
  'Décris ta boulangerie ou ton commerce préféré.',
  'Raconte ton premier souvenir de vélo, de nage ou de sport.',
  'Décris le plat que tu cuisines le plus souvent.',
  'Raconte ta dernière sortie au restaurant.',
  'Décris ce que tu entends en ce moment, son par son.',
  'Raconte une journée type de ta semaine.',
  'Décris une photo que tu aimes sur ton téléphone.',
  'Raconte ton meilleur souvenir de l’été dernier.',
  'Décris ton animal préféré, ou celui de quelqu’un que tu connais.',
  'Raconte la dernière fois que tu t’es perdu·e.',
  'Décris ta tenue du jour, de la tête aux pieds.',
  'Raconte ce que tu ferais d’une journée entièrement libre demain.',
  'Décris le jeu ou le sport auquel tu jouais enfant.',
  'Raconte ton trajet de ce matin comme un reportage radio.',
] as const;

export function pickTopic(exclude?: string | null): string {
  const pool = DIRECT_TOPICS.filter(t => t !== exclude);
  return pool[Math.floor(Math.random() * pool.length)];
}

/* ------------------------------ Débrief & replay ------------------------------ */
export type Struggle = 'mumble' | 'structure';

export const REPLAY_CONSTRAINTS: Record<Struggle, { target: string; rules: { badge: string; text: string; tone: string }[] }> = {
  mumble: {
    target: 'Cible : voix posée',
    rules: [
      { badge: '2×', text: "plus fort que d'habitude", tone: 'var(--c-ember)' },
      { badge: '2 s', text: 'de pause au milieu (//)', tone: 'var(--c-teal)' },
      { badge: '↓', text: 'termine en baissant la voix', tone: 'var(--c-acc2)' },
    ],
  },
  structure: {
    target: 'Cible : une phrase P-R-E-P',
    rules: [
      { badge: 'P', text: 'ton point, en une phrase', tone: 'var(--c-acc2)' },
      { badge: 'R', text: '« parce que… » une seule raison', tone: 'var(--c-teal)' },
      { badge: 'E+P', text: '« par exemple… », puis « donc… » ton point', tone: 'var(--c-ember)' },
    ],
  },
};

/** Extrait une phrase de 8 à 14 mots de la transcription, coupée au milieu par « // ». */
export function sentenceFrom(transcript: string): string | null {
  const words = transcript.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  if (words.length < 5) return null;
  const n = Math.min(words.length, 12);
  const chunk = words.slice(0, n);
  const mid = Math.ceil(n / 2);
  const s = [...chunk.slice(0, mid), '//', ...chunk.slice(mid)].join(' ');
  return s.charAt(0).toUpperCase() + s.slice(1) + (words.length > n ? '…' : '.');
}
