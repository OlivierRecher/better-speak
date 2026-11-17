/* Logique d'envoi du rappel quotidien, sans dépendance à Redis ni à web-push :
   api/send.ts la branche sur les vrais services, tests/reminders.test.ts sur des faux.
   (Fichier préfixé « _ » : Vercel n'en fait pas une fonction. Imports de types seulement,
   pour que Node puisse l'exécuter tel quel dans les tests.) */
import type { StoredSub } from './_lib.js';

/** Rattrapage : si un passage du planificateur est manqué ou en retard, le rappel part
    au passage suivant, tant qu'on reste dans cette fenêtre après l'heure choisie. */
export const CATCHUP_MIN = 60;
/** Durée de vie des verrous « déjà envoyé aujourd'hui » (couvre tous les fuseaux). */
export const LOCK_TTL_S = 2 * 86400;
/** Le service push jette le message s'il n'a pas pu le livrer dans ce délai. */
export const PUSH_TTL_S = 2 * 3600;
/** Sujet Web Push : un message en attente non livré est remplacé, pas empilé. */
export const PUSH_TOPIC = 'clair-daily';

export interface ReminderStore {
  all(): Promise<Record<string, StoredSub>>;
  get(id: string): Promise<StoredSub | null>;
  put(id: string, rec: StoredSub): Promise<void>;
  remove(id: string): Promise<void>;
  /** SET NX : vrai si le verrou vient d'être pris. */
  lock(key: string, ttlSeconds: number): Promise<boolean>;
  unlock(key: string): Promise<void>;
  /** Mémorise un endpoint refusé (404/410) pour que le client se réabonne. */
  markDead(endpointKey: string): Promise<void>;
}

export type SendFn = (
  sub: StoredSub['subscription'],
  payload: string,
  opts: { TTL: number; urgency: 'normal'; topic: string },
) => Promise<unknown>;

export type Verdict =
  | 'à-envoyer'        // dû maintenant (verdictFor)
  | 'envoyé'
  | 'pas-encore'       // l'heure n'est pas arrivée
  | 'trop-tard'        // fenêtre de rattrapage dépassée
  | 'déjà-envoyé'      // lastSent = aujourd'hui
  | 'déjà-pratiqué'    // lastActive = aujourd'hui
  | 'verrou'           // un autre appel l'a déjà envoyé (planifications en double, nouvel essai)
  | 'doublon'          // même endpoint qu'un autre enregistrement
  | 'expiré'           // 404/410 : abonnement supprimé
  | 'échec'            // erreur du service push : nouvel essai au prochain passage
  | 'invalide';        // enregistrement illisible

export interface RunReport {
  at: string;
  total: number;
  sent: number;
  removed: number;
  failed: number;
  skipped: number;
  results: { id: string; verdict: Verdict; day?: string; code?: number }[];
}

const isRecord = (s: unknown): s is StoredSub => {
  const r = s as StoredSub | null;
  return !!r && typeof r === 'object' && typeof r.time === 'string' && /^\d{2}:\d{2}$/.test(r.time)
    && typeof r.tz === 'string' && typeof r.subscription?.endpoint === 'string';
};

/** Date locale (AAAA-MM-JJ) et minutes écoulées depuis minuit dans le fuseau donné. */
export function localNow(tz: string, now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(now).map(p => [p.type, p.value]),
  );
  return { day: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}

/** Verdict pour un abonné à l'instant donné, sans tenir compte des verrous. */
export function verdictFor(s: StoredSub, now: Date): { verdict: Verdict; day?: string } {
  if (!isRecord(s)) return { verdict: 'invalide' };
  let local: { day: string; minutes: number };
  try { local = localNow(s.tz, now); } catch { return { verdict: 'invalide' }; }
  const [h, m] = s.time.split(':').map(Number);
  const target = h * 60 + m;
  const { day, minutes } = local;
  if (s.lastActive === day) return { verdict: 'déjà-pratiqué', day };
  if (s.lastSent === day) return { verdict: 'déjà-envoyé', day };
  if (minutes < target) return { verdict: 'pas-encore', day };
  if (minutes >= target + CATCHUP_MIN) return { verdict: 'trop-tard', day };
  return { verdict: 'à-envoyer', day };
}

/** Un seul enregistrement par endpoint : celui indexé par appareil (« d: ») l'emporte
    sur un ancien enregistrement indexé par le hash de l'endpoint. */
export function dedupeByEndpoint(all: Record<string, StoredSub>) {
  const keep = new Map<string, string>(); // endpoint → id gardé
  const dupes: { id: string; keptId: string }[] = [];
  const ids = Object.keys(all).sort((a, b) => Number(b.startsWith('d:')) - Number(a.startsWith('d:')) || a.localeCompare(b));
  for (const id of ids) {
    const ep = all[id]?.subscription?.endpoint;
    if (typeof ep !== 'string') continue;
    const kept = keep.get(ep);
    if (kept) dupes.push({ id, keptId: kept });
    else keep.set(ep, id);
  }
  return { keep: new Set(keep.values()), dupes };
}

export interface RunDeps {
  store: ReminderStore;
  send: SendFn;
  /** Corps du message (varié, jamais culpabilisant). */
  message: (s: StoredSub) => string;
  title: string;
  /** Clé courte et stable d'un endpoint (hash). */
  endpointKey: (endpoint: string) => string;
  now?: Date;
  log?: (msg: string, extra?: unknown) => void;
}

/** Un passage du planificateur : au plus UN rappel par appareil et par jour local,
    quel que soit le nombre d'appels simultanés ou répétés. */
export async function runReminders(d: RunDeps): Promise<RunReport> {
  const now = d.now ?? new Date();
  const log = d.log ?? (() => {});
  const all = (await d.store.all()) ?? {};
  const { keep, dupes } = dedupeByEndpoint(all);
  const results: RunReport['results'] = [];

  // anciens enregistrements indexés par endpoint qui doublonnent un enregistrement d'appareil
  for (const { id, keptId } of dupes) {
    results.push({ id, verdict: 'doublon' });
    if (!id.startsWith('d:') && keptId.startsWith('d:')) await d.store.remove(id).catch(e => log('suppression doublon', e));
  }

  await Promise.all([...keep].map(async id => {
    const s = all[id];
    try {
      const v = verdictFor(s, now);
      if (v.verdict !== 'à-envoyer') { results.push({ id, ...v }); return; }
      const day = v.day!;

      /* Verrous atomiques « un rappel par jour » : par appareil et par endpoint. Ils survivent
         à un changement d'heure, à une désactivation/réactivation et aux appels concurrents. */
      const epKey = d.endpointKey(s.subscription.endpoint);
      const locks = [`clair:sent:${id}:${day}`, `clair:sent:e:${epKey}:${day}`];
      if (!(await d.store.lock(locks[0], LOCK_TTL_S))) { results.push({ id, verdict: 'verrou', day }); return; }
      if (!(await d.store.lock(locks[1], LOCK_TTL_S))) {
        await d.store.unlock(locks[0]);
        results.push({ id, verdict: 'verrou', day });
        return;
      }
      const release = () => Promise.all(locks.map(k => d.store.unlock(k))).catch(e => log('libération verrou', e));

      const payload = JSON.stringify({ title: d.title, body: d.message(s), url: '/?src=rappel', tag: 'clair-daily' });
      try {
        await d.send(s.subscription, payload, { TTL: PUSH_TTL_S, urgency: 'normal', topic: PUSH_TOPIC });
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        await release();
        if (code === 404 || code === 410) {
          // abonnement révoqué : on le retire et on le signale au client à sa prochaine ouverture
          await d.store.remove(id);
          await d.store.markDead(epKey);
          results.push({ id, verdict: 'expiré', day, code });
        } else {
          log(`envoi push échoué (${code ?? 'sans code'})`, (e as { body?: string }).body ?? String(e));
          results.push({ id, verdict: 'échec', day, code });
        }
        return;
      }
      results.push({ id, verdict: 'envoyé', day });
      // lastSent sur l'enregistrement relu (ne pas écraser une heure changée entre-temps)
      try {
        const fresh = await d.store.get(id);
        if (fresh) await d.store.put(id, { ...fresh, lastSent: day });
      } catch (e) { log('mise à jour lastSent', e); }
    } catch (e) {
      // un enregistrement ou un appel Redis en erreur ne bloque jamais les autres
      log(`abonné ${id.slice(0, 10)} en erreur`, String(e));
      results.push({ id, verdict: 'échec' });
    }
  }));

  const count = (v: Verdict) => results.filter(r => r.verdict === v).length;
  const sent = count('envoyé'), removed = count('expiré'), failed = count('échec');
  return { at: now.toISOString(), total: Object.keys(all).length, sent, removed, failed, skipped: results.length - sent - removed - failed, results };
}
