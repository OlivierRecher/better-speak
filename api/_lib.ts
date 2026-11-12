/* Outils partagés des fonctions serverless (Vercel). */
import { Redis } from '@upstash/redis';
import { createHash } from 'node:crypto';

export interface StoredSub {
  subscription: { endpoint: string; keys: { p256dh: string; auth: string }; expirationTime?: number | null };
  time: string;        // « HH:MM » heure locale du rappel
  tz: string;          // fuseau IANA, ex. Europe/Paris
  anchor: string;      // habitude d'ancrage (café, douche…)
  streak: number;
  lastActive: string | null; // AAAA-MM-JJ local du dernier jour pratiqué
  lastSent: string | null;   // AAAA-MM-JJ local du dernier rappel envoyé
}

export const SUBS_KEY = 'clair:subs';

// Accepte les variables de l'intégration Vercel Marketplace (KV_*) comme celles d'Upstash
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL ?? '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN ?? '',
});

export const idOf = (endpoint: string) => createHash('sha256').update(endpoint).digest('hex').slice(0, 32);

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

/** Date locale (AAAA-MM-JJ) et minutes écoulées depuis minuit dans le fuseau donné. */
export function localNow(tz: string, now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(now).map(p => [p.type, p.value]),
  );
  return { day: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}
