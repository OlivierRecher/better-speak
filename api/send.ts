/* POST /api/send — appelé toutes les 5 minutes par UNE planification Upstash QStash.
   Envoie le rappel à chaque abonné dont l'heure locale est arrivée (avec rattrapage),
   sauf s'il a déjà pratiqué aujourd'hui ou déjà reçu son rappel. Les règles et les
   verrous « un par appareil et par jour » sont dans api/_reminder.ts. */
import { setVapidDetails, sendNotification } from 'web-push';
import { Receiver } from '@upstash/qstash';
import { redis, redisStore, idOf, json, adminAuthorized, RUNS_KEY, AUTH_FAIL_KEY } from './_lib.js';
import { runReminders } from './_reminder.js';
import { pickMessage, REMINDER_TITLE } from '../src/lib/messages.js';

async function authorize(req: Request, body: string): Promise<string | null> {
  // 1) appel signé par QStash
  const sig = req.headers.get('upstash-signature');
  if (sig) {
    const current = process.env.QSTASH_CURRENT_SIGNING_KEY;
    const next = process.env.QSTASH_NEXT_SIGNING_KEY;
    if (!current || !next) return 'signature QStash reçue mais QSTASH_CURRENT_SIGNING_KEY / QSTASH_NEXT_SIGNING_KEY manquantes';
    try {
      await new Receiver({ currentSigningKey: current, nextSigningKey: next }).verify({ signature: sig, body, clockTolerance: 30 });
      return null;
    } catch (e) {
      return `signature QStash invalide : ${(e as Error).message}`;
    }
  }
  // 2) déclenchement manuel / autre planificateur : jeton secret
  return adminAuthorized(req) ? null : 'ni signature QStash ni jeton CRON_SECRET';
}

export async function POST(req: Request) {
  const body = await req.text();
  const refused = await authorize(req, body);
  if (refused) {
    console.error('[rappels] appel refusé :', refused);
    await redis.set(AUTH_FAIL_KEY, { at: new Date().toISOString(), reason: refused }).catch(() => {});
    return json({ error: 'non autorisé' }, 401);
  }

  const pub = process.env.VAPID_PUBLIC_KEY ?? process.env.VITE_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) {
    console.error('[rappels] clés VAPID manquantes');
    return json({ error: 'clés VAPID manquantes' }, 500);
  }
  setVapidDetails(process.env.VAPID_SUBJECT ?? 'mailto:contact@example.com', pub, priv);

  const report = await runReminders({
    store: redisStore,
    send: sendNotification,
    message: s => pickMessage({ streak: s.streak, anchor: s.anchor }),
    title: REMINDER_TITLE,
    endpointKey: idOf,
    log: (msg, extra) => console.error(`[rappels] ${msg}`, extra ?? ''),
  });

  // trace du passage : qui a appelé (plusieurs planifications ? nouvel essai ?) et ce qui est parti
  const run = {
    at: report.at,
    messageId: req.headers.get('upstash-message-id'),
    scheduleId: req.headers.get('upstash-schedule-id'),
    retried: Number(req.headers.get('upstash-retried') ?? 0),
    manual: !req.headers.get('upstash-signature'),
    total: report.total, sent: report.sent, removed: report.removed, failed: report.failed, skipped: report.skipped,
    results: report.results.filter(r => r.verdict !== 'pas-encore' && r.verdict !== 'trop-tard').map(r => ({ ...r, id: r.id.slice(0, 10) })),
  };
  console.log('[rappels]', JSON.stringify(run));
  await redis.lpush(RUNS_KEY, run).then(() => redis.ltrim(RUNS_KEY, 0, 299)).catch(e => console.error('[rappels] journal', e));

  // toujours 200 une fois authentifié : une erreur push ne doit pas déclencher de nouvel essai QStash
  return json({ ok: true, ...report, results: run.results });
}
