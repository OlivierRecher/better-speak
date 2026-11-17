/* Outils partagés des fonctions serverless (Vercel). */
import { Redis } from '@upstash/redis';
import { createHash, timingSafeEqual } from 'node:crypto';
import type { ReminderStore } from './_reminder.js';

export interface StoredSub {
  subscription: { endpoint: string; keys: { p256dh: string; auth: string }; expirationTime?: number | null };
  time: string;        // « HH:MM » heure locale du rappel
  tz: string;          // fuseau IANA, ex. Europe/Paris
  anchor: string;      // habitude d'ancrage (café, douche…)
  streak: number;
  lastActive: string | null; // AAAA-MM-JJ local du dernier jour pratiqué
  lastSent: string | null;   // AAAA-MM-JJ local du dernier rappel envoyé
  armedAt?: string | null;   // ISO : activation ou dernier changement d'heure
}

export const SUBS_KEY = 'clair:subs';

// Accepte les variables de l'intégration Vercel Marketplace (KV_*) comme celles d'Upstash
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL ?? '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN ?? '',
});

export const idOf = (endpoint: string) => createHash('sha256').update(endpoint).digest('hex').slice(0, 32);

/** Identifiant d'abonné : l'identifiant d'appareil s'il est fourni (un seul rappel par
    appareil, même si le navigateur renouvelle son abonnement), sinon le hash de l'endpoint. */
export const subId = (device: unknown, endpoint: string) =>
  typeof device === 'string' && /^[a-z0-9-]{8,64}$/i.test(device) ? `d:${device}` : idOf(endpoint);

export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });

export async function readJson<T>(req: Request, max = 4096): Promise<T | null> {
  const text = await req.text();
  if (text.length > max) return null;
  try { return JSON.parse(text) as T; } catch { return null; }
}

export const isTime = (t: unknown): t is string => typeof t === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
export const isDay = (d: unknown): d is string => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d);
export function isTz(tz: unknown): tz is string {
  if (typeof tz !== 'string' || tz.length > 64) return false;
  try { new Intl.DateTimeFormat('en', { timeZone: tz }); return true; } catch { return false; }
}
export function isEndpoint(e: unknown): e is string {
  if (typeof e !== 'string' || e.length > 1024) return false;
  try { return new URL(e).protocol === 'https:'; } catch { return false; }
}

/* ---- Rappels : état annexe dans Redis ---- */
/** Endpoints refusés par le service push (404/410) : le client devra se réabonner. */
export const deadKey = (endpoint: string) => `clair:dead:${idOf(endpoint)}`;
/** Journal des derniers passages de /api/send (diagnostic, voir /api/status). */
export const RUNS_KEY = 'clair:runs';
/** Dernier appel refusé (signature QStash invalide, clés manquantes…). */
export const AUTH_FAIL_KEY = 'clair:auth-fail';

/** Branche la logique d'envoi (api/_reminder.ts) sur Redis. */
export const redisStore: ReminderStore = {
  all: async () => (await redis.hgetall<Record<string, StoredSub>>(SUBS_KEY)) ?? {},
  get: id => redis.hget<StoredSub>(SUBS_KEY, id),
  put: async (id, rec) => { await redis.hset(SUBS_KEY, { [id]: rec }); },
  remove: async id => { await redis.hdel(SUBS_KEY, id); },
  lock: async (key, ttl) => (await redis.set(key, 1, { nx: true, ex: ttl })) === 'OK',
  unlock: async key => { await redis.del(key); },
  markDead: async epKey => { await redis.set(`clair:dead:${epKey}`, 1, { ex: 30 * 86400 }); },
};

/** Jeton d'administration (déclenchement manuel, /api/status). */
export function adminAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const a = Buffer.from(req.headers.get('authorization') ?? ''), b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}
