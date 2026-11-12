/* Étape 3 — Le replay correctif : rejouer UNE phrase avec une contrainte ciblée.
   Retour uniquement positif : on signale ce qui a été tenu, jamais ce qui a manqué. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic } from '../legacy/audio.js';
import { recordRep } from '../lib/state';
import { REPLAY_CONSTRAINTS, type Struggle } from '../lib/topics';
import { chime, tap } from '../lib/ui';
import { LiveWave, StaticWave } from '../components/bits';
import { LoopHeader } from './LoopHeader';

const TRIES = 2;
const MAX_SECS = 25;

type MicT = InstanceType<typeof Mic>;

export function Replay({ struggle, sentence, baseline, onDone, onQuit }: {
  struggle: Struggle;
  sentence: string | null;
  baseline: number;
  onDone: () => void;
  onQuit: () => void;
}) {
  const c = REPLAY_CONSTRAINTS[struggle];
  const mic = useRef<MicT | null>(null);
  const timer = useRef(0);
  const [rec, setRec] = useState(false);
  const [tries, setTries] = useState(0);
  const [wins, setWins] = useState<string[]>([]);
  const [err, setErr] = useState('');

  useEffect(() => () => { clearTimeout(timer.current); mic.current?.stop(); }, []);

  const stop = useCallback(async () => {
    const m = mic.current;
    if (!m) return;
    mic.current = null;
    clearTimeout(timer.current);
    const { snapshot } = await m.stop();
    setRec(false);
    const voiced = (snapshot.levels as number[]).filter(v => v > 0.035);
    const mean = voiced.length ? voiced.reduce((a, b) => a + b, 0) / voiced.length : 0;
    const longPause = (snapshot.pauses as { dur: number }[]).some(p => p.dur >= 1400);
    const w: string[] = [];
    if ((snapshot.speakMs ?? 0) > 800) w.push('Essai fait');
    if (struggle === 'mumble' && mean > baseline * 1.2) w.push('Voix plus forte ✓');
    if (longPause) w.push('Pause tenue ✓');
    if (struggle === 'structure' && (snapshot.speakMs ?? 0) > 6000) w.push('Phrase complète ✓');
    setWins(w);
    setTries(t => t + 1);
    chime('ok');
    tap(25);
  }, [baseline, struggle]);

  const startRec = async () => {
    setErr('');
    try {
      const m = new Mic({ record: false });
      await m.start();
      mic.current = m;
      setRec(true);
      setWins([]);
      tap(20);
      timer.current = window.setTimeout(stop, MAX_SECS * 1000);
    } catch {
      setErr('Micro indisponible. Tu peux passer cette étape.');
    }
  };

  const finish = () => {
    if (tries > 0) recordRep({ kind: 'replay', secs: 15 * tries });
    onDone();
  };

  const readLevel = useCallback(() => mic.current?.norm ?? 0, []);
  const done = tries >= TRIES;

  return (
    <div className="c-flow">
      <LoopHeader step={2} label="Étape 3 · Replay" onClose={onQuit} />
      <span className="c-tag" style={{ ['--tone' as string]: struggle === 'mumble' ? 'var(--c-teal)' : 'var(--c-ember)' }}>{c.target}</span>
      <h1 className="c-h1">{struggle === 'mumble' ? 'Rejoue juste cette phrase.' : 'Une phrase, bien construite.'}</h1>

      <div className="c-card c-quote" style={{ ['--tone' as string]: struggle === 'mumble' ? 'var(--c-teal)' : 'var(--c-ember)' }}>
        {struggle === 'mumble' ? (
          <>
            <div className="c-eyebrow c-muted3">{sentence ? 'Ta phrase (transcrite)' : 'Ta phrase'}</div>
            <p className="c-quote-t">{sentence ? `« ${sentence} »` : 'Redis la première phrase de ta prise, celle par laquelle tu as commencé.'}</p>
          </>
        ) : (
          <>
            <div className="c-eyebrow c-muted3">Modèle</div>
            <p className="c-quote-t">Mon point, c’est… // parce que… // par exemple… // donc…</p>
          </>
        )}
      </div>

      <div className="c-rules">
        <div className="c-caption">La contrainte</div>
        {c.rules.map(r => (
          <div key={r.text} className="c-rule">
            <span className="c-rule-badge" style={{ ['--tone' as string]: r.tone }}>{r.badge}</span>
            <span>{r.text}</span>
          </div>
        ))}
      </div>

      <div className="c-card c-pauseguide">
        <div className="c-caption">{rec ? 'Je t’écoute…' : 'Pause guidée'}</div>
        {rec ? (
          <LiveWave read={readLevel} bars={36} height={40} />
        ) : (
          <div className="c-pauseguide-row">
            <StaticWave bars={16} height={36} seed={1.7} />
            <span className="c-pause-chip">2 s</span>
            <StaticWave bars={16} height={36} seed={2.9} />
          </div>
        )}
      </div>

      <div className="c-wins" aria-live="polite">
        {wins.map(w => <span key={w} className="c-win">{w}</span>)}
        {!wins.length && <span className="c-caption">Essai {Math.min(tries + 1, TRIES)} sur {TRIES} · aucune note, seulement l’effort</span>}
      </div>
      {err && <p className="c-caption c-center" role="alert">{err}</p>}

      <div className="c-rec-zone">
        {done ? (
          <button className="c-cta c-wide" onClick={finish}>Continuer</button>
        ) : (
          <>
            <button className={`c-rec ${rec ? 'on' : ''}`} onClick={rec ? stop : startRec} aria-label={rec ? 'Arrêter' : 'Parler'}>
              <span />
            </button>
            <span className="c-caption">{rec ? 'Touche pour arrêter' : 'Touche pour parler'}</span>
          </>
        )}
      </div>
      {!done && <button className="c-link c-skip" onClick={finish}>{tries ? 'C’est bon' : 'Passer'}</button>}
    </div>
  );
}
