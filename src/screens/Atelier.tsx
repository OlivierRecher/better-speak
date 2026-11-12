/* Atelier : les 16 exercices de la v1 et le programme 12 semaines, conservés tels quels.
   Ils s'exécutent dans le moteur hérité (src/legacy/exercise.js), re-stylé par les jetons v2. */
import { useState } from 'react';
import { CATALOG, PROGRAM, GUIDES, byId } from '../legacy/content.js';
import * as store from '../legacy/store.js';
import * as engine from '../legacy/exercise.js';
import { toast, md } from '../legacy/ui.js';
import { useClair } from '../lib/state';
import { tap } from '../lib/ui';
import { Icon } from '../components/bits';

interface Ex { id: string; title: string; sub: string; ico: string }

const GROUPS: { key: string; label: string; tone: string; ids: string[] }[] = [
  { key: 'warm', label: 'Échauffer', tone: 'var(--c-gold)', ids: ['ex-warm-express', 'ex-warm-full', 'ex-calm'] },
  { key: 'artic', label: 'Articuler', tone: 'var(--c-acc)', ids: ['ex-twister', 'ex-drill', 'ex-finales', 'ex-pairs'] },
  { key: 'pace', label: 'Débit', tone: 'var(--c-ember)', ids: ['ex-read', 'ex-pace', 'ex-expressive'] },
  { key: 'voice', label: 'Voix', tone: 'var(--c-teal)', ids: ['ex-pitch', 'ex-volume', 'ex-phonation'] },
  { key: 'talk', label: 'Parole', tone: 'var(--c-green)', ids: ['ex-impro', 'ex-impro-long', 'ex-prompter'] },
];
const DUR: Record<string, string> = {
  'ex-warm-express': '2 min', 'ex-warm-full': '5 min', 'ex-calm': '3 min', 'ex-twister': '3 min', 'ex-drill': '3 min',
  'ex-finales': '2 min', 'ex-pairs': '4 min', 'ex-read': '3 min', 'ex-pace': '3 min', 'ex-expressive': '3 min',
  'ex-pitch': '4 min', 'ex-volume': '2 min', 'ex-phonation': '1 min', 'ex-impro': '2 min', 'ex-impro-long': '4 min', 'ex-prompter': '5 min',
};

export function Atelier() {
  const s = useClair();
  const [filter, setFilter] = useState('all');
  const [guide, setGuide] = useState<string | null>(null);
  const next = store.nextProgramSession() as { week: { n: number; t: string }; session: { id: string; n: number; label: string; exercises: string[] } } | null;
  const progress = store.programProgress() as { done: number; total: number };

  const mastery = (id: string) => {
    const n = s.sessions.filter(x => x.exerciseId === id).length;
    return n === 0 ? 0 : n <= 2 ? 1 : n <= 5 ? 2 : 3;
  };

  const run = (id: string) => {
    if (engine.isOpen()) return;
    tap(12);
    engine.run(byId(id), {});
  };

  const runSession = async () => {
    if (!next || engine.isOpen()) return;
    tap(12);
    await engine.runSequence(next.session.exercises, { programSession: next.session.id, label: `Semaine ${next.week.n}` });
    if (s.program.done[next.session.id]) toast(`Séance terminée · semaine ${next.week.n} ✓`, 3000);
  };

  const groups = GROUPS.filter(g => filter === 'all' || g.key === filter);
  const weekSessions = next ? PROGRAM[next.week.n - 1].sessions : [];

  return (
    <div className="c-screen">
      <header className="c-top-simple">
        <h1 className="c-h1">Atelier</h1>
        <p className="c-muted c-sm">Tes 16 outils, quand tu as envie d’aller plus loin.</p>
      </header>

      {next ? (
        <section className="c-program">
          <div className="c-eyebrow" style={{ color: 'var(--c-teal)' }}>Programme · semaine {next.week.n} / 12</div>
          <h2 className="c-h2">Thème : {next.week.t.charAt(0).toLowerCase() + next.week.t.slice(1)}</h2>
          <div className="c-program-row">
            <p className="c-muted c-sm">
              Séance {next.session.n} · {next.session.exercises.map((id: string) => byId(id)?.title).join(' + ')}
            </p>
            <button className="c-cta c-cta-teal" onClick={runSession}>Lancer</button>
          </div>
          <div className="c-program-dots" aria-label={`${progress.done} séances faites sur ${progress.total}`}>
            {weekSessions.map((x: { id: string }) => <i key={x.id} className={s.program.done[x.id] ? 'done' : ''} />)}
          </div>
        </section>
      ) : (
        <section className="c-program"><h2 className="c-h2">Programme achevé 👑</h2><p className="c-muted c-sm">Les 36 séances sont faites. Les exercices restent à volonté.</p></section>
      )}

      <div className="c-filters" role="tablist" aria-label="Familles d’exercices">
        {[{ key: 'all', label: 'Tout' }, ...GROUPS].map(g => (
          <button key={g.key} role="tab" aria-selected={filter === g.key} onClick={() => { tap(); setFilter(g.key); }}>{g.label}</button>
        ))}
      </div>

      {groups.map(g => (
        <section key={g.key} className="c-group">
          <h2 className="c-eyebrow c-muted3">{g.label}</h2>
          {g.ids.map(id => {
            const e = (CATALOG as Ex[]).find(x => x.id === id)!;
            const m = mastery(id);
            return (
              <button key={id} className="c-ex" onClick={() => run(id)} style={{ ['--tone' as string]: g.tone }}>
                <span className="c-ex-ic"><Icon name={e.ico} size={20} /></span>
                <span className="c-grow">
                  <b>{e.title}</b>
                  <span className="c-caption">{e.sub}{/min/.test(e.sub) ? '' : ` · ${DUR[id]}`}</span>
                </span>
                <span className="c-mastery" aria-label={`Maîtrise ${m} sur 3`}>{[0, 1, 2].map(i => <i key={i} className={i < m ? 'on' : ''} />)}</span>
              </button>
            );
          })}
        </section>
      ))}

      <section className="c-group">
        <h2 className="c-eyebrow c-muted3">Fiches méthode</h2>
        {(GUIDES as { id: string; t: string; e: string; body: string[] }[]).map(gd => (
          <div key={gd.id} className="c-guide">
            <button className="c-guide-h" aria-expanded={guide === gd.id} onClick={() => { tap(); setGuide(guide === gd.id ? null : gd.id); }}>
              <span>{gd.e}</span><b className="c-grow">{gd.t}</b><span className="c-chev">{guide === gd.id ? '−' : '+'}</span>
            </button>
            {guide === gd.id && (
              <div className="c-guide-b">
                {gd.body.map((p, i) => <p key={i} dangerouslySetInnerHTML={{ __html: md(p) }} />)}
              </div>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
