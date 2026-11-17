/* GET /api/status — diagnostic des rappels, protégé par CRON_SECRET :
     curl -H "Authorization: Bearer $CRON_SECRET" https://ton-app.vercel.app/api/status
   Montre chaque abonné (sans ses clés ni son endpoint complet), ce que /api/send ferait
   maintenant, les derniers passages du planificateur et l'état de la configuration. */
import { redis, redisStore, json, adminAuthorized, RUNS_KEY, AUTH_FAIL_KEY } from './_lib.js';
import { verdictFor, localNow, dedupeByEndpoint, CATCHUP_MIN } from './_reminder.js';

interface Run { at: string; scheduleId?: string | null; messageId?: string | null; retried?: number; manual?: boolean; sent?: number }

export async function GET(req: Request) {
  if (!adminAuthorized(req)) return json({ error: 'non autorisé (Authorization: Bearer <CRON_SECRET>)' }, 401);
  const now = new Date();
  const all = await redisStore.all();
  const { dupes } = dedupeByEndpoint(all);
  const dupeIds = new Set(dupes.map(d => d.id));

  const subs = await Promise.all(Object.entries(all).map(async ([id, s]) => {
    let local: { day: string; minutes: number } | null = null;
    try { local = localNow(s.tz, now); } catch { /* fuseau invalide */ }
    const v = verdictFor(s, now);
    const locked = local ? (await redis.exists(`clair:sent:${id}:${local.day}`)) === 1 : false;
    let host = '?';
    try { host = new URL(s.subscription.endpoint).host; } catch { /* endpoint illisible */ }
    return {
      id: id.slice(0, 10), keyedBy: id.startsWith('d:') ? 'appareil' : 'endpoint', pushService: host,
      time: s.time, tz: s.tz,
      localNow: local ? `${local.day} ${String(Math.floor(local.minutes / 60)).padStart(2, '0')}:${String(local.minutes % 60).padStart(2, '0')}` : null,
      lastSent: s.lastSent, lastActive: s.lastActive, sentLockToday: locked,
      verdictNow: dupeIds.has(id) ? 'doublon' : v.verdict,
    };
  }));

  const runs = ((await redis.lrange<Run>(RUNS_KEY, 0, 299)) ?? []);
  // passages par tranche de 5 min : plus d'un par tranche = plusieurs planifications (ou nouveaux essais)
  const perSlot = new Map<string, number>();
  for (const r of runs) {
    if (r.manual) continue;
    const t = new Date(r.at); t.setUTCSeconds(0, 0); t.setUTCMinutes(t.getUTCMinutes() - (t.getUTCMinutes() % 5));
    perSlot.set(t.toISOString(), (perSlot.get(t.toISOString()) ?? 0) + 1);
  }
  const busiest = Math.max(0, ...perSlot.values());
  const last = runs[0]?.at ?? null;
  const minutesSinceLast = last ? Math.round((now.getTime() - new Date(last).getTime()) / 60000) : null;

  const pub = process.env.VAPID_PUBLIC_KEY, vite = process.env.VITE_VAPID_PUBLIC_KEY;
  return json({
    now: now.toISOString(),
    catchupMinutes: CATCHUP_MIN,
    config: {
      redis: !!(process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL),
      vapid: !!(pub ?? vite) && !!process.env.VAPID_PRIVATE_KEY,
      vapidPublicKeysMatch: !pub || !vite || pub === vite,
      qstashSigningKeys: !!process.env.QSTASH_CURRENT_SIGNING_KEY && !!process.env.QSTASH_NEXT_SIGNING_KEY,
    },
    scheduler: {
      lastRun: last,
      minutesSinceLastRun: minutesSinceLast,
      healthy: minutesSinceLast !== null && minutesSinceLast <= 15,
      maxRunsInOneSlot: busiest,
      duplicateSchedulesSuspected: busiest > 1,
      scheduleIds: [...new Set(runs.map(r => r.scheduleId).filter(Boolean))],
      lastAuthFailureLastMinute: await redis.get(AUTH_FAIL_KEY),
    },
    subscribers: subs.length,
    duplicates: dupes.length,
    subs,
    recentRuns: runs.filter(r => (r.sent ?? 0) > 0 || r.manual).slice(0, 20),
  });
}
