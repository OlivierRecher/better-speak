#!/usr/bin/env node
/* Diagnostic des rappels en production, en LECTURE SEULE par défaut.
     UPSTASH_REDIS_REST_URL=... UPSTASH_REDIS_REST_TOKEN=... [QSTASH_TOKEN=...] node scripts/reminders-diagnose.mjs
   Montre les abonnés (sans clés ni endpoint complet), les doublons, les verrous du jour,
   les endpoints expirés, les derniers passages de /api/send et, avec QSTASH_TOKEN,
   les planifications et les derniers messages QStash.
   --fix-duplicates : supprime les anciens enregistrements indexés par endpoint qui doublonnent
   un enregistrement d'appareil (même endpoint). Rien d'autre n'est jamais modifié. */
import { Redis } from '@upstash/redis';
import { createHash } from 'node:crypto';

const FIX = process.argv.includes('--fix-duplicates');
const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
const idOf = e => createHash('sha256').update(e).digest('hex').slice(0, 32);
const host = e => { try { return new URL(e).host; } catch { return '?'; } };

if (url && token) {
  const redis = new Redis({ url, token });
  const subs = (await redis.hgetall('clair:subs')) ?? {};
  const ids = Object.keys(subs);
  console.log(`\n== Abonnés (clair:subs) : ${ids.length}`);
  const byEp = new Map();
  for (const id of ids) {
    const s = subs[id];
    const ep = s?.subscription?.endpoint ?? '?';
    byEp.set(ep, [...(byEp.get(ep) ?? []), id]);
    console.log([id.slice(0, 12).padEnd(12), id.startsWith('d:') ? 'appareil' : 'endpoint', host(ep).padEnd(26),
      `ep:${idOf(ep).slice(0, 8)}`, s.time, s.tz, `lastSent=${s.lastSent}`, `lastActive=${s.lastActive}`].join('  '));
  }
  const dupes = [...byEp.entries()].filter(([, l]) => l.length > 1);
  console.log(`\n== Endpoints partagés par plusieurs enregistrements : ${dupes.length}`);
  for (const [ep, l] of dupes) {
    console.log(`  ep:${idOf(ep).slice(0, 8)} (${host(ep)}) ← ${l.join(', ')}`);
    const keep = l.find(id => id.startsWith('d:'));
    if (keep && FIX) for (const id of l.filter(id => !id.startsWith('d:'))) { await redis.hdel('clair:subs', id); console.log(`    supprimé ${id}`); }
  }
  if (dupes.length && !FIX) console.log('  (relancer avec --fix-duplicates pour retirer les anciens enregistrements par endpoint)');

  const scan = async pattern => { const out = []; let cur = '0'; do { const [c, k] = await redis.scan(cur, { match: pattern, count: 500 }); cur = String(c); out.push(...k); } while (cur !== '0'); return out; };
  const locks = await scan('clair:sent:*');
  console.log(`\n== Verrous « déjà envoyé » (clair:sent:*) : ${locks.length}`);
  for (const k of locks.sort()) console.log('  ' + k.replace(/(clair:sent:(?:e:|d:)?)([^:]{8})[^:]*/, '$1$2…'));
  const dead = await scan('clair:dead:*');
  console.log(`\n== Endpoints expirés (404/410) mémorisés : ${dead.length}`);

  const fail = await redis.get('clair:auth-fail');
  if (fail) console.log(`\n== Dernier appel refusé : ${JSON.stringify(fail)}`);
  const runs = (await redis.lrange('clair:runs', 0, 299)) ?? [];
  console.log(`\n== Passages de /api/send journalisés : ${runs.length}${runs[0] ? ` (dernier ${runs[0].at})` : ' (journal ajouté par ce correctif)'}`);
  const slots = new Map();
  for (const r of runs) { const t = new Date(r.at); t.setUTCSeconds(0, 0); t.setUTCMinutes(t.getUTCMinutes() - t.getUTCMinutes() % 5); slots.set(+t, (slots.get(+t) ?? 0) + 1); }
  const max = Math.max(0, ...slots.values());
  if (runs.length) console.log(`  max de passages dans une même tranche de 5 min : ${max}${max > 1 ? '  ← plusieurs planifications ou nouveaux essais' : ''}`);
  for (const r of runs.filter(r => r.sent || r.failed || r.removed).slice(0, 15)) console.log(`  ${r.at} envoyés=${r.sent} échecs=${r.failed} expirés=${r.removed} schedule=${r.scheduleId ?? '?'} essai=${r.retried}`);
} else {
  console.log('(UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN absents : partie Redis ignorée)');
}

const qtoken = process.env.QSTASH_TOKEN;
if (qtoken) {
  const base = process.env.QSTASH_URL ?? 'https://qstash.upstash.io';
  const get = async path => { const r = await fetch(base + path, { headers: { authorization: `Bearer ${qtoken}` } }); if (!r.ok) throw new Error(`${path} → ${r.status} ${await r.text()}`); return r.json(); };
  const schedules = (await get('/v2/schedules')).filter(s => /\/api\/send\/?$/.test(s.destination ?? ''));
  console.log(`\n== Planifications QStash vers /api/send : ${schedules.length}${schedules.length > 1 ? '  ← une seule attendue' : ''}`);
  for (const s of schedules) console.log(`  ${s.scheduleId}  ${s.destination}  "${s.cron}"  ${s.isPaused ? 'EN PAUSE' : 'active'}  essais=${s.retries}  créée ${new Date(s.createdAt).toISOString()}`);
  try {
    const logs = await get('/v2/logs?count=1000');
    const events = logs.events ?? logs.logs ?? [];
    const toSend = events.filter(e => /\/api\/send/.test(e.url ?? ''));
    const byDayState = new Map();
    for (const e of toSend) { const k = `${new Date(e.time).toISOString().slice(0, 10)} ${e.state}${e.responseStatus ? ` ${e.responseStatus}` : ''}`; byDayState.set(k, (byDayState.get(k) ?? 0) + 1); }
    console.log(`\n== Journal QStash (${toSend.length} évènements récents vers /api/send), par jour et état :`);
    for (const [k, n] of [...byDayState.entries()].sort()) console.log(`  ${k} : ${n}`);
    const errs = toSend.filter(e => e.error || (e.responseStatus && e.responseStatus >= 400)).slice(0, 5);
    for (const e of errs) console.log(`  erreur ${new Date(e.time).toISOString()} ${e.state} ${e.responseStatus ?? ''} ${(e.error ?? e.responseBody ?? '').toString().slice(0, 160)}`);
  } catch (e) { console.log(`\n(journal QStash indisponible : ${e.message})`); }
} else {
  console.log('\n(QSTASH_TOKEN absent : planifications non vérifiées)');
}
