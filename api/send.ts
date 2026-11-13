/* POST /api/send — appelé toutes les 5 minutes par Upstash QStash (planification).
   Envoie le rappel à chaque abonné dont l'heure locale vient d'arriver,
   sauf s'il a déjà pratiqué aujourd'hui ou déjà reçu son rappel. */
import { setVapidDetails, sendNotification } from 'web-push';
import { Receiver } from '@upstash/qstash';
import { redis, SUBS_KEY, json, localNow, type StoredSub } from './_lib.js';
import { pickMessage, REMINDER_TITLE } from '../src/lib/messages.js';

// fenêtre d'envoi : un peu plus large que l'intervalle de planification (5 min) pour absorber la gigue
const WINDOW_MIN = 10;

async function authorized(req: Request, body: string): Promise<boolean> {
  // 1) appel signé par QStash
  const sig = req.headers.get('upstash-signature');
  const current = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const next = process.env.QSTASH_NEXT_SIGNING_KEY;
  if (sig && current && next) {
    try {
      return await new Receiver({ currentSigningKey: current, nextSigningKey: next }).verify({ signature: sig, body });
    } catch {
      return false;
    }
  }
  // 2) déclenchement manuel / autre planificateur : jeton secret
  const secret = process.env.CRON_SECRET;
  return !!secret && req.headers.get('authorization') === `Bearer ${secret}`;
}

export async function POST(req: Request) {
  const body = await req.text();
  if (!(await authorized(req, body))) return json({ error: 'non autorisé' }, 401);

  const pub = process.env.VAPID_PUBLIC_KEY ?? process.env.VITE_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return json({ error: 'clés VAPID manquantes' }, 500);
  setVapidDetails(process.env.VAPID_SUBJECT ?? 'mailto:contact@example.com', pub, priv);

  const all = (await redis.hgetall<Record<string, StoredSub>>(SUBS_KEY)) ?? {};
  let sent = 0, removed = 0, skipped = 0;

  await Promise.all(Object.entries(all).map(async ([id, s]) => {
    const [h, m] = s.time.split(':').map(Number);
    const target = h * 60 + m;
    const { day, minutes } = localNow(s.tz);
    const due = minutes >= target && minutes < target + WINDOW_MIN;
    if (!due || s.lastSent === day || s.lastActive === day) { skipped++; return; }

    const payload = JSON.stringify({ title: REMINDER_TITLE, body: pickMessage({ streak: s.streak, anchor: s.anchor }), url: '/?src=rappel', tag: 'clair-daily' });
    try {
      await sendNotification(s.subscription, payload, { TTL: 3 * 3600, urgency: 'normal' });
      await redis.hset(SUBS_KEY, { [id]: { ...s, lastSent: day } });
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      // abonnement expiré ou révoqué : on nettoie
      if (code === 404 || code === 410) { await redis.hdel(SUBS_KEY, id); removed++; }
      else console.error('envoi push échoué', code);
    }
  }));

  return json({ ok: true, sent, removed, skipped, total: Object.keys(all).length });
}
