/* Messages des rappels quotidiens — partagés par le serveur (api/send.ts),
   le service worker et l'aperçu dans l'app.
   Ton : court, orienté action, jamais culpabilisant. */

export const REMINDER_TITLE = 'Clair';

export const GENERIC_MESSAGES = [
  '1 minute chrono pour muscler ta voix. Un sujet simple t’attend, zéro pression.',
  'Ton défi du jour est prêt. Tu appuies, tu parles, c’est validé.',
  'Une minute de parole, maintenant. Le reste de la journée t’appartient.',
  'Pas besoin d’être en forme : il suffit de commencer. 60 secondes.',
  'Ton cerveau adore la régularité. Une minute aujourd’hui, c’est gagné.',
  'Le sujet du jour se raconte sans réfléchir. On y va ?',
  'Personne n’écoute, rien n’est gardé. Juste toi et une minute.',
];

export const STREAK_MESSAGES = [
  'Ne casse pas ta chaîne : 1 seule minute aujourd’hui suffit à garder tes synapses actives.',
  '{n} jours d’affilée. Une minute de plus et la chaîne continue.',
  'Ta série de {n} jours t’attend. 60 secondes, et c’est fait.',
];

export const ANCHOR_MESSAGES: Record<string, string> = {
  'Mon café': 'Café en main ? Parfait : 1 minute de parole pendant qu’il refroidit.',
  'Ma douche': 'Juste après la douche : 1 minute de voix, cheveux mouillés compris.',
  'Mon trajet': 'Pendant le trajet : un sujet, une minute, à voix basse si besoin.',
  'Ma pause déj': 'Pause déj : 60 secondes de parole avant de reprendre.',
};

export function pickMessage({ streak = 0, anchor = '' }: { streak?: number; anchor?: string } = {}): string {
  const r = Math.random();
  if (streak >= 3 && r < 0.4) {
    const m = STREAK_MESSAGES[Math.floor(Math.random() * STREAK_MESSAGES.length)];
    return m.replace('{n}', String(streak));
  }
  if (ANCHOR_MESSAGES[anchor] && r < 0.6) return ANCHOR_MESSAGES[anchor];
  return GENERIC_MESSAGES[Math.floor(Math.random() * GENERIC_MESSAGES.length)];
}
