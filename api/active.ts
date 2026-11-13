/* POST /api/active — la journée est validée : pas de rappel inutile aujourd'hui. */
import { redis, SUBS_KEY, idOf, subId, json, readJson, isEndpoint, isDay, type StoredSub } from './_lib.js';

export async function POST(req: Request) {
  const b = await readJson<{ endpoint?: string; device?: string; day?: string; streak?: number }>(req);
  if (!b || !isEndpoint(b.endpoint) || !isDay(b.day)) return json({ error: 'requête invalide' }, 400);
  let id = subId(b.device, b.endpoint);
  let prev = await redis.hget<StoredSub>(SUBS_KEY, id);
  if (!prev && id !== idOf(b.endpoint)) { id = idOf(b.endpoint); prev = await redis.hget<StoredSub>(SUBS_KEY, id); }
  if (!prev) return json({ ok: false, reason: 'inconnu' }, 404);
  const streak = Number.isFinite(b.streak) ? Math.max(0, Math.min(10000, Number(b.streak))) : prev.streak;
  await redis.hset(SUBS_KEY, { [id]: { ...prev, lastActive: b.day, streak } });
  return json({ ok: true });
}
