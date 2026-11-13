import { useEffect, useState } from 'react';
import { Home } from './screens/Home';
import { Atelier } from './screens/Atelier';
import { Progress } from './screens/Progress';
import { Me } from './screens/Me';
import { Loop } from './flow/Loop';
import { useClair } from './lib/state';
import { pickTopic } from './lib/topics';
import { applyTheme, iconHtml, tap } from './lib/ui';
import { syncReminder } from './lib/push';

type Tab = 'today' | 'atelier' | 'progress' | 'me';
const TABS: { k: Tab; label: string; icon: string }[] = [
  { k: 'today', label: 'Aujourd’hui', icon: 'home' },
  { k: 'atelier', label: 'Atelier', icon: 'grid' },
  { k: 'progress', label: 'Progrès', icon: 'chart' },
  { k: 'me', label: 'Moi', icon: 'gear' },
];
const fromHash = (): Tab => {
  const h = location.hash.slice(1) as Tab;
  return TABS.some(t => t.k === h) ? h : 'today';
};

export function App() {
  const s = useClair();
  const [tab, setTab] = useState<Tab>(fromHash);
  const [topic, setTopic] = useState(() => pickTopic());
  const [loop, setLoop] = useState<{ topic: string | null } | null>(null);

  // thème : suit le système en mode « auto »
  useEffect(() => {
    applyTheme(s.settings.theme);
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const on = () => applyTheme(s.settings.theme);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [s.settings.theme]);

  useEffect(() => {
    const on = () => setTab(fromHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  // rappel actif : on resynchronise fuseau, série et identifiant d'appareil au démarrage
  useEffect(() => {
    if (s.reminder.enabled) syncReminder().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ouverture depuis la notification : on propose directement le défi
  useEffect(() => {
    if (new URLSearchParams(location.search).get('src') === 'rappel') {
      history.replaceState(null, '', location.pathname + location.hash);
      setTab('today');
    }
  }, []);

  const go = (t: Tab) => {
    tap();
    if (t === tab) window.scrollTo({ top: 0, behavior: 'smooth' });
    setTab(t);
    history.replaceState(null, '', t === 'today' ? location.pathname : `#${t}`);
    window.scrollTo({ top: 0 });
  };

  const closeLoop = () => {
    setLoop(null);
    setTopic(t => pickTopic(t));
  };

  return (
    <>
      <main className="c-main" aria-hidden={loop ? true : undefined}>
        {tab === 'today' && <Home topic={topic} onReroll={() => setTopic(t => pickTopic(t))} onStart={t => setLoop({ topic: t })} />}
        {tab === 'atelier' && <Atelier />}
        {tab === 'progress' && <Progress />}
        {tab === 'me' && <Me />}
      </main>
      {!loop && (
        <nav className="c-tabbar" aria-label="Navigation principale">
          {TABS.map(t => (
            <button key={t.k} aria-current={tab === t.k ? 'page' : undefined} onClick={() => go(t.k)}>
              <span className="c-icon" aria-hidden dangerouslySetInnerHTML={{ __html: iconHtml(t.icon) }} />
              {t.label}
            </button>
          ))}
        </nav>
      )}
      {loop && <Loop initialTopic={loop.topic} onClose={closeLoop} />}
    </>
  );
}
