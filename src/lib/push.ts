/* Rappel quotidien par notification push (Web Push API).
   Le navigateur ne sait pas programmer une notification app fermée : c'est le serveur
   (api/send.ts, réveillé toutes les 5 min par Upstash QStash) qui l'envoie à l'heure choisie. */
import { getState, streak, todayKey } from './state';

const VAPID = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export type PushStatus =
  | 'unsupported'      // navigateur sans Push API
  | 'needs-install'    // iOS : l'app doit être ajoutée à l'écran d'accueil
  | 'not-configured'   // clé VAPID absente (déploiement incomplet)
  | 'denied'           // permission refusée
  | 'ready';           // on peut s'abonner

export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

export const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export function pushStatus(): PushStatus {
  const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  if (!supported) return isIOS() && !isStandalone() ? 'needs-install' : 'unsupported';
  if (!VAPID) return 'not-configured';
  if (Notification.permission === 'denied') return 'denied';
  return 'ready';
}

function urlB64ToUint8Array(base64: string) {
  const pad = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
}

const tz = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

async function currentSub() {
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

function payload(sub: PushSubscription) {
  const s = getState();
  const st = streak();
  return {
    subscription: sub.toJSON(),
    time: s.reminder.time,
    anchor: s.reminder.anchor,
    tz: tz(),
    streak: st.current,
    lastActive: st.activeToday ? todayKey() : null,
  };
}

async function post(path: string, body: unknown) {
  const r = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`${path} → ${r.status}`);
}

/** Demande la permission, s'abonne et enregistre l'heure côté serveur. */
export async function enableReminder(): Promise<void> {
  if (pushStatus() !== 'ready') throw new Error(pushStatus());
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') throw new Error('denied');
  const reg = await navigator.serviceWorker.ready;
  const sub = (await reg.pushManager.getSubscription())
    ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8Array(VAPID!) }));
  await post('/api/subscribe', payload(sub));
}

/** Met à jour l'heure ou l'ancre (même abonnement). */
export async function syncReminder(): Promise<void> {
  const sub = await currentSub();
  if (sub) await post('/api/subscribe', payload(sub));
}

export async function disableReminder(): Promise<void> {
  const sub = await currentSub();
  if (!sub) return;
  await post('/api/unsubscribe', { endpoint: sub.endpoint }).catch(() => {});
  await sub.unsubscribe();
}

/** Signale au serveur que la journée est validée : pas de rappel inutile aujourd'hui. */
export async function markActiveRemote(): Promise<void> {
  try {
    if (!getState().reminder.enabled || !('serviceWorker' in navigator)) return;
    const sub = await currentSub();
    if (sub) await post('/api/active', { endpoint: sub.endpoint, day: todayKey(), streak: streak().current });
  } catch {
    /* hors ligne : le rappel partira peut-être, ce n'est pas grave */
  }
}

/** Notification locale immédiate, pour prévisualiser (aucun serveur requis). */
export async function testNotification(body: string) {
  if (Notification.permission !== 'granted') {
    const p = await Notification.requestPermission();
    if (p !== 'granted') throw new Error('denied');
  }
  const reg = await navigator.serviceWorker.ready;
  await reg.showNotification('Clair', { body, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', tag: 'clair-test', data: { url: '/' } });
}
