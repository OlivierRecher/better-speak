/* POST /api/unsubscribe — supprime l'abonnement (rappel désactivé). */
import { redis, SUBS_KEY, idOf, json, readJson, isEndpoint } from './_lib.js';

export async function POST(req: Request) {
  const b = await readJson<{ endpoint?: string }>(req);
  if (!b || !isEndpoint(b.endpoint)) return json({ error: 'endpoint invalide' }, 400);
  await redis.hdel(SUBS_KEY, idOf(b.endpoint));
  return json({ ok: true });
}
