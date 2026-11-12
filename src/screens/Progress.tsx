/* Progrès : le long terme. Régularité d'abord, comparaison uniquement à soi-même. */
import { useEffect, useState } from 'react';
import { SKILLS, BADGES } from '../legacy/content.js';
import { useClair, streak, activeDays, PHASES, phaseOf, type SkillKey } from '../lib/state';
import { listMemories, deleteMemory, type Memory } from '../lib/memories';
import { tap } from '../lib/ui';
import { Card, Heatmap } from '../components/bits';

const TONES: Record<SkillKey, string> = {
  articulation: 'var(--c-acc)', debit: 'var(--c-teal)', prosodie: 'var(--c-ember)', fluidite: 'var(--c-green)', projection: 'var(--c-gold)',
};

export function Progress() {
  const s = useClair();
  const st = streak();
  const day = activeDays();
  const { index } = phaseOf(Math.max(1, day));
  const minutes = Math.round(Object.values(s.days).reduce((a, d) => a + d.secs, 0) / 60);

  // compétences : valeur actuelle vs instantané le plus proche d'il y a 30 jours
  const scored = s.sessions.filter(x => x.score != null && x.snap);
  const monthAgo = Date.now() - 30 * 864e5;
  const past = scored.find(x => x.date <= monthAgo)?.snap ?? scored[scored.length - 1]?.snap;
  const hasSkills = scored.length > 0;

  const [mems, setMems] = useState<Memory[] | null>(null);
  useEffect(() => { listMemories().then(setMems).catch(() => setMems([])); }, []);

  return (
    <div className="c-screen">
      <header className="c-top-simple">
        <h1 className="c-h1">Progrès</h1>
        <p className="c-muted c-sm">Ce qui compte : la régularité, pas la perfection.</p>
      </header>

      <div className="c-stats">
        <div><b>{st.current}</b><span>jours de série</span></div>
        <div><b>{day}</b><span>jours actifs</span></div>
        <div><b>{s.totalReps}</b><span>reps</span></div>
        <div><b>{minutes}</b><span>min parlées</span></div>
      </div>

      <Card>
        <h2 className="c-h3">Ton parcours vers l’automatisme</h2>
        <ol className="c-timeline">
          {PHASES.map((p, i) => (
            <li key={p.key} className={i < index ? 'past' : i === index ? 'now' : ''} style={{ ['--tone' as string]: p.color }}>
              <div className="c-row-between">
                <b>{p.name}</b>
                <span className="c-caption">J{p.from} → J{p.to}</span>
                {i === index && day > 0 && <span className="c-tag" style={{ ['--tone' as string]: p.color }}>en cours · J{day}</span>}
              </div>
              <p className="c-caption">{p.text}</p>
            </li>
          ))}
        </ol>
      </Card>

      <Card>
        <div className="c-row-between">
          <h2 className="c-h3">{day} jour{day > 1 ? 's' : ''} actif{day > 1 ? 's' : ''}</h2>
          <span className="c-caption" style={{ color: 'var(--c-gold-ink)' }}>
            {s.settings.joker ? (st.jokerAvailable ? 'joker dispo' : 'joker utilisé') : `record ${st.best} j`}
          </span>
        </div>
        <Heatmap weeks={26} highlightToday />
      </Card>

      <Card>
        <h2 className="c-h3">Tes 5 compétences · vs il y a 30 j</h2>
        {hasSkills ? (
          <div className="c-skills">
            {(Object.keys(SKILLS) as SkillKey[]).map(k => {
              const now = Math.round(s.skills[k]);
              const was = Math.round(past?.[k] ?? now);
              const d = now - was;
              return (
                <div key={k} className="c-skill" style={{ ['--tone' as string]: TONES[k] }}>
                  <span className="c-sm c-muted">{SKILLS[k].name}</span>
                  <span className="c-skill-bar"><i style={{ width: `${was}%` }} className="was" /><i style={{ width: `${now}%` }} /></span>
                  <b className="c-sm" style={{ color: TONES[k] }}>{s.counts[k] === 0 ? '–' : d > 0 ? `+${d}` : d === 0 ? '=' : d}</b>
                </div>
              );
            })}
            {s.settings.softMode && <p className="c-caption">Barres pâles : il y a 30 jours. Barres pleines : aujourd’hui.</p>}
          </div>
        ) : (
          <p className="c-caption">Fais quelques exercices de l’Atelier : ils mesurent articulation, débit, prosodie, fluidité et projection.</p>
        )}
      </Card>

      <Card>
        <h2 className="c-h3">Souvenirs gardés</h2>
        {mems === null ? <p className="c-caption">Chargement…</p> : mems.length === 0 ? (
          <p className="c-caption">Aucun. Après un défi, « Garder ce souvenir » conserve la prise ici, sur ton appareil uniquement.</p>
        ) : (
          <div className="c-mems">
            {mems.map(m => <MemoryItem key={m.id} m={m} onDelete={async () => { tap(); await deleteMemory(m.id); setMems(x => x?.filter(y => y.id !== m.id) ?? null); }} />)}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="c-h3">Badges</h2>
        <div className="c-badges">
          {(BADGES as { id: string; e: string; n: string }[]).map(b => (
            <div key={b.id} className={`c-badge ${s.badges.includes(b.id) ? '' : 'off'}`}><span>{b.e}</span><small>{b.n}</small></div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function MemoryItem({ m, onDelete }: { m: Memory; onDelete: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  const date = new Date(m.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  return (
    <div className="c-mem">
      <div className="c-row-between">
        <div className="c-grow"><b className="c-sm">{m.topic}</b><div className="c-caption">{date} · {Math.round(m.secs)} s · {m.media === 'video' ? 'vidéo' : 'audio'}</div></div>
        {!url && <button className="c-pill" onClick={() => setUrl(URL.createObjectURL(m.blob))}>▶</button>}
        <button className="c-pill" onClick={onDelete} aria-label="Supprimer ce souvenir">✕</button>
      </div>
      {url && (m.media === 'video'
        ? <video src={url} controls playsInline className="c-mem-media" />
        : <audio src={url} controls className="c-mem-media" />)}
    </div>
  );
}
