/* Étape 2 — Le débriefing chirurgical : 30 s réécoutées, UNE seule chose nommée.
   Validation de l'effort d'abord, jamais de jugement de qualité. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { keepMemory } from '../lib/memories';
import { getState, type ClairState } from '../lib/state';
import { tap } from '../lib/ui';
import { StaticWave } from '../components/bits';
import { LoopHeader } from './LoopHeader';
import type { Take } from './Challenge';
import type { Struggle } from '../lib/topics';

const PRAISE = [
  'Peu importe le résultat : ton cerveau vient de renforcer le circuit de la prise de parole.',
  'Tu as parlé alors qu’une partie de toi préférait se taire. C’est exactement ça, l’entraînement.',
  'Chaque prise use un peu la peur. Celle-ci compte, quelle qu’elle soit.',
  'Le circuit « je parle » vient d’être sollicité. C’est la répétition, pas la perfection, qui le renforce.',
];

const fmtLen = (s: number) => (s >= 60 ? `${Math.floor(s / 60)} min${s % 60 >= 5 ? ` ${String(Math.round(s % 60)).padStart(2, '0')}` : ''}` : `${Math.round(s)} s`);

export function Debrief({ take, url, onChoose, onQuit }: {
  take: Take;
  url: string | null;
  onChoose: (s: Struggle | null) => void;
  onQuit: () => void;
}) {
  const praise = useMemo(() => PRAISE[Math.floor(Math.random() * PRAISE.length)], []);
  const len = Math.min(30, take.secs);
  // extrait de 30 s pris au hasard dans la prise
  const start = useMemo(() => (take.secs > len + 4 ? Math.random() * (take.secs - len) : 0), [take.secs, len]);
  const el = useRef<HTMLMediaElement | null>(null);
  const ready = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [kept, setKept] = useState<'no' | 'saving' | 'yes'>('no');
  const settings: ClairState['settings'] = getState().settings;

  // « Garder mes prises » activé : on conserve sans demander
  useEffect(() => {
    if (settings.keepTakes && take.blob && kept === 'no') {
      setKept('saving');
      keepMemory({ topic: take.topic ?? 'Sujet libre', media: take.media, secs: take.secs, blob: take.blob }).then(() => setKept('yes'));
    }
  }, [settings.keepTakes, take, kept]);

  useEffect(() => {
    const m = el.current;
    if (!m || !url) return;
    /* Les fichiers WebM produits par MediaRecorder n'ont pas de durée : Chrome refuse alors
       de se positionner. Astuce connue : viser très loin force le calcul de la durée. */
    const onMeta = () => {
      if (m.duration === Infinity || Number.isNaN(m.duration)) m.currentTime = 1e101;
      else { m.currentTime = start; ready.current = true; }
    };
    const onDur = () => { if (!ready.current && Number.isFinite(m.duration)) { m.currentTime = start; ready.current = true; } };
    const onTime = () => {
      if (!ready.current) return;
      const p = m.currentTime - start;
      setPos(Math.max(0, p));
      if (p >= len) { m.pause(); m.currentTime = start; setPlaying(false); setPos(0); }
    };
    const onEnd = () => { setPlaying(false); setPos(0); };
    m.addEventListener('loadedmetadata', onMeta);
    m.addEventListener('durationchange', onDur);
    m.addEventListener('timeupdate', onTime);
    m.addEventListener('ended', onEnd);
    return () => {
      m.removeEventListener('loadedmetadata', onMeta);
      m.removeEventListener('durationchange', onDur);
      m.removeEventListener('timeupdate', onTime);
      m.removeEventListener('ended', onEnd);
    };
  }, [url, start, len]);

  const toggle = () => {
    const m = el.current;
    if (!m) return;
    tap();
    if (playing) { m.pause(); setPlaying(false); }
    else { if (ready.current && m.currentTime < start) m.currentTime = start; m.play().then(() => setPlaying(true)).catch(() => {}); }
  };

  const keep = async () => {
    if (!take.blob || kept !== 'no') return;
    tap(20);
    setKept('saving');
    await keepMemory({ topic: take.topic ?? 'Sujet libre', media: take.media, secs: take.secs, blob: take.blob });
    setKept('yes');
  };

  const clock = (s: number) => `0:${String(Math.floor(s)).padStart(2, '0')}`;

  return (
    <div className="c-flow">
      <LoopHeader step={1} label="Étape 2 · Réécoute" onClose={onQuit} />
      <h1 className="c-h1 c-mt">Friction franchie.</h1>
      <p className="c-lead">Tu as parlé {fmtLen(take.secs)}. {praise}</p>

      {url ? (
        <div className="c-card c-player">
          <div className="c-caption">{take.secs > len + 4 ? 'Un extrait de 30 s, choisi au hasard' : 'Ta prise'}</div>
          {take.media === 'video' ? (
            <video ref={v => { el.current = v; }} src={url} playsInline preload="auto" className={`c-player-video ${playing ? 'on' : ''}`} onClick={toggle} />
          ) : (
            <audio ref={a => { el.current = a; }} src={url} preload="auto" />
          )}
          <div className="c-player-row">
            <button className="c-play" onClick={toggle} aria-label={playing ? 'Pause' : 'Écouter l’extrait'}>{playing ? '❚❚' : '▶'}</button>
            <div className="c-grow">
              <StaticWave bars={40} height={44} seed={2.1} played={pos / len} />
              <div className="c-row-between c-caption"><span>{clock(pos)}</span><span>{clock(len)}</span></div>
            </div>
          </div>
        </div>
      ) : (
        <div className="c-card c-caption">La réécoute n’est pas disponible sur ce navigateur. Fie-toi à ton ressenti.</div>
      )}

      <h2 className="c-h3 c-mt">Une seule chose à remarquer&nbsp;:</h2>
      <button className="c-choice" onClick={() => { tap(15); onChoose('mumble'); }}>
        <span className="c-choice-ic" style={{ ['--tone' as string]: 'var(--c-teal)' }} />
        <span className="c-grow"><b>J’ai marmonné ou accéléré</b><span className="c-caption">→ replay : voix posée + pause</span></span>
        <span className="c-chev">›</span>
      </button>
      <button className="c-choice" onClick={() => { tap(15); onChoose('structure'); }}>
        <span className="c-choice-ic" style={{ ['--tone' as string]: 'var(--c-ember)' }} />
        <span className="c-grow"><b>J’ai perdu ma structure</b><span className="c-caption">→ replay : une phrase PREP nette</span></span>
        <span className="c-chev">›</span>
      </button>
      <button className="c-link c-center" onClick={() => { tap(); onChoose(null); }}>Rien de marquant ? Passer à la récompense</button>

      <div className="c-keep">
        {take.blob && (
          <button className="c-pill" onClick={keep} disabled={kept !== 'no'}>
            {kept === 'yes' ? '♥  Souvenir gardé' : kept === 'saving' ? 'Enregistrement…' : '♡  Garder ce souvenir'}
          </button>
        )}
        <p className="c-caption c-center">
          {kept === 'yes' ? 'Retrouve-le dans Progrès › Souvenirs.' : 'Sinon, la prise s’autodétruit en fin de séance.'}
        </p>
      </div>
    </div>
  );
}
