/* POST /api/subscribe — enregistre ou met à jour l'abonnement push et l'heure du rappel. */
import { redis, SUBS_KEY, idOf, subId, json, readJson, isTime, isTz, isEndpoint, isDay, type StoredSub } from './_lib.js';

interface Body {
  device?: string;
  subscription?: StoredSub['subscription'];
  time?: string;
  tz?: string;
  anchor?: string;
  streak?: number;
  lastActive?: string | null;
}

export async function POST(req: Request) {
  const b = await readJson<Body>(req);
  const sub = b?.subscription;
  if (!b || !sub || !isEndpoint(sub.endpoint) || typeof sub.keys?.p256dh !== 'string' || typeof sub.keys?.auth !== 'string')
    return json({ error: 'abonnement invalide' }, 400);
  if (!isTime(b.time) || !isTz(b.tz)) return json({ error: 'heure ou fuseau invalide' }, 400);

  const id = subId(b.device, sub.endpoint);
  const prev = await redis.hget<StoredSub>(SUBS_KEY, id);
  const rec: StoredSub = {
    subscription: { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
    time: b.time,
    tz: b.tz,
    anchor: typeof b.anchor === 'string' ? b.anchor.slice(0, 32) : '',
    streak: Number.isFinite(b.streak) ? Math.max(0, Math.min(10000, Number(b.streak))) : 0,
    lastActive: isDay(b.lastActive) ? b.lastActive : prev?.lastActive ?? null,
    lastSent: prev?.lastSent ?? null,
  };
  await redis.hset(SUBS_KEY, { [id]: rec });
  // migration : ancien enregistrement indexé par l'endpoint
  if (id !== idOf(sub.endpoint)) await redis.hdel(SUBS_KEY, idOf(sub.endpoint));
  return json({ ok: true });
}
