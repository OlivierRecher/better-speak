/* Simulation de /api/send : plusieurs appels (simultanés ou répétés), doublons, changement
   de jour, journée déjà pratiquée… → exactement un rappel par appareil et par jour.
   Lancer : npm test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { runReminders, type ReminderStore, type SendFn } from '../api/_reminder.ts';
import type { StoredSub } from '../api/_lib.ts';

const tick = () => new Promise<void>(r => setImmediate(r)); // chaque appel « réseau » rend la main
const epKey = (e: string) => createHash('sha256').update(e).digest('hex').slice(0, 32);

/** Faux Redis en mémoire, avec des pauses pour révéler les courses entre appels. */
function fakeWorld() {
  const subs: Record<string, StoredSub> = {};
  const keys = new Map<string, number>();
  const dead = new Set<string>();
  const store: ReminderStore = {
    all: async () => { await tick(); return structuredClone(subs); },
    get: async id => { await tick(); return subs[id] ? structuredClone(subs[id]) : null; },
    put: async (id, rec) => { await tick(); subs[id] = structuredClone(rec); },
    remove: async id => { await tick(); delete subs[id]; },
    lock: async key => { await tick(); if (keys.has(key)) return false; keys.set(key, 1); return true; },
    unlock: async key => { await tick(); keys.delete(key); },
    markDead: async k => { await tick(); dead.add(k); },
  };
  const delivered: { endpoint: string; at: Date }[] = [];
  let failWith: ((endpoint: string) => number | null) = () => null;
  let clock = new Date();
  const send: SendFn = async sub => {
    await tick();
    const code = failWith(sub.endpoint);
    if (code) throw Object.assign(new Error(`push ${code}`), { statusCode: code });
    delivered.push({ endpoint: sub.endpoint, at: clock });
  };
  const run = (now: Date) => {
    clock = now;
    return runReminders({ store, send, now, title: 'Clair', message: () => 'Une minute ?', endpointKey: epKey });
  };
  return { subs, keys, dead, store, delivered, run, setFail: (f: typeof failWith) => { failWith = f; } };
}

const sub = (endpoint: string, over: Partial<StoredSub> = {}): StoredSub => ({
  subscription: { endpoint, keys: { p256dh: 'p', auth: 'a' } },
  time: '20:00', tz: 'Europe/Paris', anchor: 'café', streak: 3, lastActive: null, lastSent: null, ...over,
});

/** Instant UTC correspondant à une heure de Paris (novembre : UTC+1). */
const paris = (day: string, hhmm: string) => new Date(`${day}T${hhmm}:00+01:00`);

/** Simule le planificateur : un passage toutes les 5 min entre deux heures, `copies` appels simultanés à chaque passage. */
async function schedule(w: ReturnType<typeof fakeWorld>, day: string, from: string, to: string, copies = 1) {
  for (let t = paris(day, from).getTime(); t <= paris(day, to).getTime(); t += 5 * 60000) {
    await Promise.all(Array.from({ length: copies }, () => w.run(new Date(t))));
  }
}

const countFor = (w: ReturnType<typeof fakeWorld>, endpoint: string) => w.delivered.filter(d => d.endpoint === endpoint).length;

test('8 planifications en double qui tirent en même temps → 1 seul rappel', async () => {
  const w = fakeWorld();
  w.subs['d:phone-1234'] = sub('https://web.push.apple.com/A');
  await schedule(w, '2026-11-17', '19:30', '21:30', 8);
  assert.equal(countFor(w, 'https://web.push.apple.com/A'), 1);
  assert.equal(w.subs['d:phone-1234'].lastSent, '2026-11-17');
});

test('doublons dans Redis (ancien enregistrement par endpoint + appareil) → 1 seul rappel, le doublon est nettoyé', async () => {
  const w = fakeWorld();
  const ep = 'https://web.push.apple.com/B';
  w.subs['d:phone-5678'] = sub(ep);
  w.subs[epKey(ep)] = sub(ep);
  w.subs['autre-hash-0000'] = sub(ep); // troisième copie du même endpoint
  await schedule(w, '2026-11-17', '20:00', '20:30', 3);
  assert.equal(countFor(w, ep), 1);
  assert.deepEqual(Object.keys(w.subs), ['d:phone-5678']);
});

test('chaque jour suivant : exactement un rappel par jour, à l’heure choisie', async () => {
  const w = fakeWorld();
  const ep = 'https://fcm.googleapis.com/C';
  w.subs['d:android-01'] = sub(ep, { time: '08:15' });
  const days = ['2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-21'];
  for (const day of days) await schedule(w, day, '00:00', '23:55', 2);
  assert.equal(countFor(w, ep), days.length);
  for (const [i, d] of w.delivered.entries()) {
    const local = d.at.toLocaleString('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', day: '2-digit' });
    assert.equal(local, `${days[i].slice(8)} 08:15`);
  }
});

test('déjà pratiqué aujourd’hui → aucun rappel ce jour-là, mais il revient le lendemain', async () => {
  const w = fakeWorld();
  const ep = 'https://web.push.apple.com/D';
  w.subs['d:phone-dddd'] = sub(ep, { lastActive: '2026-11-17' });
  await schedule(w, '2026-11-17', '19:00', '23:55');
  assert.equal(countFor(w, ep), 0);
  await schedule(w, '2026-11-18', '19:00', '23:55');
  assert.equal(countFor(w, ep), 1);
});

test('changer l’heure après l’envoi, ou désactiver/réactiver, ne renvoie rien le même jour', async () => {
  const w = fakeWorld();
  const ep = 'https://web.push.apple.com/E';
  w.subs['d:phone-eeee'] = sub(ep, { time: '09:00' });
  await schedule(w, '2026-11-17', '08:30', '09:30');
  assert.equal(countFor(w, ep), 1);
  // l'utilisateur choisit 10:00 (subscribe garde lastSent)…
  w.subs['d:phone-eeee'] = { ...w.subs['d:phone-eeee'], time: '10:00' };
  await schedule(w, '2026-11-17', '09:30', '11:00');
  // …puis désactive (enregistrement supprimé) et réactive avec un nouvel endpoint à 12:00
  delete w.subs['d:phone-eeee'];
  w.subs['d:phone-eeee'] = sub(ep, { time: '12:00' });
  await schedule(w, '2026-11-17', '11:30', '13:00', 2);
  assert.equal(countFor(w, ep), 1);
  // le lendemain, à la nouvelle heure
  await schedule(w, '2026-11-18', '11:30', '13:00');
  assert.equal(countFor(w, ep), 2);
});

test('changer l’heure avant l’envoi → un rappel à la nouvelle heure, pas à l’ancienne', async () => {
  const w = fakeWorld();
  const ep = 'https://web.push.apple.com/F';
  w.subs['d:phone-ffff'] = sub(ep, { time: '18:00' });
  await schedule(w, '2026-11-17', '12:00', '17:00');
  w.subs['d:phone-ffff'] = { ...w.subs['d:phone-ffff'], time: '21:00' };
  await schedule(w, '2026-11-17', '17:00', '23:55');
  assert.equal(w.delivered.length, 1);
  assert.equal(w.delivered[0].at.toISOString(), paris('2026-11-17', '21:00').toISOString());
});

test('passage manqué ou décalé (heure non multiple de 5, planificateur en panne 20 min) → rattrapé une fois', async () => {
  const w = fakeWorld();
  const ep = 'https://web.push.apple.com/G';
  w.subs['d:phone-gggg'] = sub(ep, { time: '07:03' });
  await w.run(paris('2026-11-17', '07:00'));
  // panne : rien entre 07:00 et 07:25
  await schedule(w, '2026-11-17', '07:25', '09:00', 2);
  assert.equal(countFor(w, ep), 1);
});

test('fuseaux : chaque appareil reçoit le sien à son heure locale', async () => {
  const w = fakeWorld();
  w.subs['d:paris-0001'] = sub('https://p/1', { time: '20:00', tz: 'Europe/Paris' });
  w.subs['d:mtl-00001'] = sub('https://p/2', { time: '20:00', tz: 'America/Toronto' });
  for (let h = 0; h < 48; h++) for (let m = 0; m < 60; m += 5) await w.run(new Date(Date.UTC(2026, 10, 17, h, m)));
  assert.equal(countFor(w, 'https://p/1'), 2);
  assert.equal(countFor(w, 'https://p/2'), 2);
  const toronto = w.delivered.filter(d => d.endpoint === 'https://p/2').map(d => d.at.toISOString());
  assert.deepEqual(toronto, ['2026-11-17T01:00:00.000Z', '2026-11-18T01:00:00.000Z']); // 20:00 à Toronto les 16 et 17
});

test('erreur passagère du service push → nouvel essai au passage suivant, toujours un seul rappel', async () => {
  const w = fakeWorld();
  const ep = 'https://web.push.apple.com/H';
  w.subs['d:phone-hhhh'] = sub(ep);
  let fails = 2;
  w.setFail(() => (fails-- > 0 ? 503 : null));
  await schedule(w, '2026-11-17', '20:00', '21:30', 2);
  assert.equal(countFor(w, ep), 1);
});

test('abonnement révoqué (410) → retiré et marqué expiré pour que l’app s’en recrée un ; les autres continuent', async () => {
  const w = fakeWorld();
  w.subs['d:revoked-01'] = sub('https://web.push.apple.com/dead');
  w.subs['d:healthy-01'] = sub('https://web.push.apple.com/ok');
  w.subs['d:broken-001'] = { ...sub('https://x/bad'), tz: 'Pas/UnFuseau' }; // enregistrement corrompu
  w.setFail(e => (e.endsWith('/dead') ? 410 : null));
  const r = await w.run(paris('2026-11-17', '20:00'));
  assert.equal(r.sent, 1);
  assert.equal(r.removed, 1);
  assert.equal(w.subs['d:revoked-01'], undefined);
  assert.ok(w.dead.has(epKey('https://web.push.apple.com/dead')));
  assert.equal(r.results.find(x => x.id === 'd:broken-001')?.verdict, 'invalide');
});
