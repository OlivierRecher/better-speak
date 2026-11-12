/* « Ton rituel » : rappel quotidien ancré sur une habitude existante + réglages bien-être. */
import { useEffect, useMemo, useRef, useState } from 'react';
import * as store from '../legacy/store.js';
import { toast } from '../legacy/ui.js';
import { useClair, setSetting, setReminder, setName, type Theme } from '../lib/state';
import { pushStatus, enableReminder, disableReminder, syncReminder, testNotification, isIOS, isStandalone, type PushStatus } from '../lib/push';
import { pickMessage } from '../lib/messages';
import { tap } from '../lib/ui';
import { Card, Switch } from '../components/bits';

const ANCHORS = ['Mon café', 'Ma douche', 'Mon trajet', 'Ma pause déj'];

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

export function Me() {
  const s = useClair();
  const [status, setStatus] = useState<PushStatus>(pushStatus());
  const [busy, setBusy] = useState(false);
  const [install, setInstall] = useState<BIPEvent | null>(null);
  const preview = useMemo(() => pickMessage({ anchor: s.reminder.anchor }), [s.reminder.anchor]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onBIP = (e: Event) => { e.preventDefault(); setInstall(e as BIPEvent); };
    window.addEventListener('beforeinstallprompt', onBIP);
    return () => window.removeEventListener('beforeinstallprompt', onBIP);
  }, []);

  const toggleReminder = async (on: boolean) => {
    tap();
    setBusy(true);
    try {
      if (on) { await enableReminder(); setReminder({ enabled: true }); toast(`Rappel activé · ${s.reminder.time}`); }
      else { await disableReminder(); setReminder({ enabled: false }); }
    } catch (e) {
      const code = (e as Error).message;
      toast(code === 'denied' ? 'Notifications refusées : autorise-les dans les réglages du navigateur.' : 'Activation impossible pour le moment. Réessaie plus tard.', 3600);
    } finally {
      setStatus(pushStatus());
      setBusy(false);
    }
  };

  const changeReminder = (patch: { time?: string; anchor?: string }) => {
    setReminder(patch);
    if (s.reminder.enabled) syncReminder().catch(() => toast('Hors ligne : l’heure sera synchronisée plus tard.'));
  };

  const statusNote: Record<PushStatus, string> = {
    'unsupported': 'Ce navigateur ne gère pas les notifications push.',
    'needs-install': 'Sur iPhone, ajoute d’abord Clair à l’écran d’accueil (Partager › Sur l’écran d’accueil), puis ouvre-la depuis l’icône.',
    'not-configured': 'Le serveur de rappels n’est pas encore configuré sur ce déploiement.',
    'denied': 'Notifications bloquées : autorise-les dans les réglages du navigateur pour ce site.',
    'ready': 'Messages variés, jamais culpabilisants. Pas de rappel si tu as déjà pratiqué.',
  };

  const doExport = () => {
    const blob = new Blob([store.exportJSON()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `clair-progres-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  };
  const doImport = (f: File) => {
    f.text().then(t => { store.importJSON(t); toast('Progression restaurée'); }).catch(() => toast('Fichier illisible', 3000));
  };

  const rows: { k: 'softMode' | 'keepTakes' | 'joker' | 'haptics' | 'sound'; t: string; d: string }[] = [
    { k: 'softMode', t: 'Mode doux', d: 'Masquer les notes chiffrées' },
    { k: 'keepTakes', t: 'Garder mes prises', d: s.settings.keepTakes ? 'Oui : chaque défi est gardé dans tes souvenirs' : 'Non : elles s’effacent en fin de séance' },
    { k: 'joker', t: 'Joker de chaîne', d: '1 jour off par semaine sans casser la série' },
    { k: 'haptics', t: 'Vibrations', d: isIOS() ? 'Non disponibles sur iPhone' : 'Retour haptique sur les actions' },
    { k: 'sound', t: 'Sons', d: 'Petits signaux de validation' },
  ];

  return (
    <div className="c-screen">
      <header className="c-top-simple"><h1 className="c-h1">Ton rituel</h1></header>

      <div className="c-notif-preview" aria-label="Aperçu du rappel">
        <img src="/icons/icon-192.png" alt="" width={38} height={38} />
        <div><div className="c-caption">CLAIR · {s.reminder.time}</div><p className="c-sm">{preview}</p></div>
      </div>

      <Card>
        <div className="c-row-between">
          <h2 className="c-h3">Rappel quotidien</h2>
          <Switch on={s.reminder.enabled} label="Activer mon rappel quotidien" onChange={v => !busy && (status === 'ready' || !v) && toggleReminder(v)} />
        </div>
        <label className="c-time">
          <span className="c-sr">Heure du rappel</span>
          <input type="time" value={s.reminder.time} step={300} onChange={e => e.target.value && changeReminder({ time: e.target.value })} />
        </label>
        <p className="c-caption">Choisis le moment où tu es déjà là, chaque jour.</p>
        <div className="c-eyebrow c-muted3 c-mt">Accroche-le à…</div>
        <div className="c-anchors">
          {ANCHORS.map(a => (
            <button key={a} aria-pressed={s.reminder.anchor === a} onClick={() => { tap(); changeReminder({ anchor: a }); }}>{a}</button>
          ))}
        </div>
        <p className={`c-caption c-mt ${status !== 'ready' ? 'c-warn' : ''}`}>{statusNote[status]}</p>
        {status !== 'unsupported' && status !== 'needs-install' && (
          <button className="c-link c-sm" onClick={() => testNotification(preview).catch(() => toast('Notifications refusées'))}>Tester une notification</button>
        )}
      </Card>

      <Card>
        {rows.map(r => (
          <div key={r.k} className="c-setting">
            <div className="c-grow"><div>{r.t}</div><div className="c-caption">{r.d}</div></div>
            <Switch on={s.settings[r.k]} label={r.t} onChange={v => { tap(); setSetting(r.k, v); }} />
          </div>
        ))}
        <div className="c-setting">
          <div className="c-grow"><div>Thème</div></div>
          <div className="c-seg c-seg-solid" role="radiogroup" aria-label="Thème">
            {([['auto', 'Auto'], ['light', 'Clair'], ['dark', 'Sombre']] as [Theme, string][]).map(([v, l]) => (
              <button key={v} role="radio" aria-checked={s.settings.theme === v} onClick={() => { tap(); setSetting('theme', v); }}>{l}</button>
            ))}
          </div>
        </div>
        <label className="c-setting">
          <div className="c-grow"><div>Prénom</div><div className="c-caption">Pour l’accueil</div></div>
          <input className="c-input" defaultValue={s.profile.name} maxLength={24} placeholder="Facultatif" onBlur={e => setName(e.target.value.trim())} />
        </label>
      </Card>

      {!isStandalone() && (
        install ? (
          <button className="c-cta-ghost c-wide" onClick={async () => { await install.prompt(); setInstall(null); }}>Installer l’app sur l’écran d’accueil</button>
        ) : isIOS() ? (
          <Card><b className="c-sm">Installer sur iPhone</b><p className="c-caption">Dans Safari : bouton Partager › « Sur l’écran d’accueil ». Indispensable pour recevoir les rappels.</p></Card>
        ) : null
      )}

      <Card>
        <h2 className="c-h3">Mes données</h2>
        <p className="c-caption">Tout reste sur cet appareil. Aucune voix n’est envoyée nulle part.</p>
        <div className="c-data-btns">
          <button className="c-pill" onClick={doExport}>Exporter</button>
          <button className="c-pill" onClick={() => fileRef.current?.click()}>Importer</button>
          <button className="c-pill c-danger" onClick={() => { if (window.confirm('Effacer définitivement toute ta progression ?')) { store.resetAll(); toast('Données effacées'); } }}>Tout effacer</button>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={e => e.target.files?.[0] && doImport(e.target.files[0])} />
        </div>
      </Card>
    </div>
  );
}
