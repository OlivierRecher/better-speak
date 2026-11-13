/* POST /api/unsubscribe — supprime l'abonnement (rappel désactivé). */
import { redis, SUBS_KEY, idOf, subId, json, readJson, isEndpoint } from './_lib.js';

export async function POST(req: Request) {
  const b = await readJson<{ endpoint?: string; device?: string }>(req);
  if (!b || !isEndpoint(b.endpoint)) return json({ error: 'endpoint invalide' }, 400);
  await redis.hdel(SUBS_KEY, subId(b.device, b.endpoint), idOf(b.endpoint));
  return json({ ok: true });
}
