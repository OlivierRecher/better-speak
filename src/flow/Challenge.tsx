/* Étape 1 — L'action brute : 1 minute de parole, enregistrée (audio ou vidéo).
   Chronomètre doux : à 60 s l'anneau passe à l'or et invite à conclure, sans couper. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, Recognizer, support } from '../legacy/audio.js';
import { getState, type Media } from '../lib/state';
import { chime, fmtClock, tap } from '../lib/ui';
import { LiveWave, Ring } from '../components/bits';
import { LoopHeader } from './LoopHeader';

export interface Take {
  blob: Blob | null;
  media: Media;
  secs: number;
  transcript: string;
  /** niveau moyen des passages parlés (référence pour le replay « plus fort ») */
  baseline: number;
  topic: string | null;
}

const TARGET = 60;      // la minute du défi
const HARD_STOP = 75;   // marge pour finir sa phrase

const PREP = [
  { l: 'P', n: 'Point', hint: 'De quoi tu parles, en une phrase.' },
  { l: 'R', n: 'Raison', hint: 'Pourquoi ? Ta raison principale, en une phrase.' },
  { l: 'E', n: 'Exemple', hint: 'Un détail concret, une image, un moment.' },
  { l: 'P', n: 'Point', hint: 'Reviens à ton point pour conclure.' },
];

type MicT = InstanceType<typeof Mic>;

export function Challenge({ topic, media, onDone, onEmpty, onQuit }: {
  topic: string | null;
  media: Media;
  onDone: (t: Take) => void;
  onEmpty: () => void;
  onQuit: () => void;
}) {
  const mic = useRef<MicT | null>(null);
  const recog = useRef<InstanceType<typeof Recognizer> | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<'starting' | 'live' | 'paused' | 'error' | 'stopping'>('starting');
  const [mode, setMode] = useState<Media>(media);
  const [elapsed, setElapsed] = useState(0);
  const [step, setStep] = useState(0);
  const [showPrep, setShowPrep] = useState(true);
  const [error, setError] = useState('');
  const pausedAt = useRef(0);
  const pausedTotal = useRef(0);
  const t0 = useRef(0);
  const stopping = useRef(false);
  const chimed = useRef(false);
  const alive = useRef(true);

  const start = useCallback(async (m: Media) => {
    setPhase('starting');
    setError('');
    try {
      const mc = new Mic({ video: m === 'video' });
      await mc.start();
      if (!alive.current) { mc.stop(); return; }
      mic.current = mc;
      setMode(m);
      if (m === 'video' && video.current) {
        video.current.srcObject = mc.stream ?? null;
        video.current.play().catch(() => {});
      }
      if (support.recog) {
        const r = new Recognizer({ lang: getState().profile.lang });
        r.start();
        recog.current = r;
      }
      t0.current = performance.now();
      setPhase('live');
      tap(20);
    } catch {
      if (m === 'video') return start('audio'); // caméra refusée : on continue en audio
      setError("Le micro n'est pas accessible. Autorise-le dans les réglages du navigateur, puis réessaie.");
      setPhase('error');
    }
  }, []);

  const finish = useCallback(async () => {
    if (stopping.current || !mic.current) return;
    stopping.current = true;
    setPhase('stopping');
    const transcript = recog.current?.stop() ?? '';
    const { blob, snapshot } = await mic.current.stop();
    mic.current = null;
    if (video.current) video.current.srcObject = null;
    const voiced = (snapshot.levels as number[]).filter(v => v > 0.035);
    const baseline = voiced.length ? voiced.reduce((a, b) => a + b, 0) / voiced.length : 0.05;
    if ((snapshot.speakMs ?? 0) < 1500) return onEmpty();
    chime('win');
    onDone({ blob, media: mode, secs: snapshot.duration - pausedTotal.current / 1000, transcript, baseline, topic });
  }, [mode, onDone, onEmpty, topic]);

  // démarrage immédiat : le tap sur « Lancer » est le geste utilisateur
  useEffect(() => {
    alive.current = true;
    start(media);
    return () => {
      alive.current = false;
      recog.current?.stop();
      mic.current?.stop();
      mic.current = null;
    };
  }, [media, start]);

  // horloge d'affichage (4 Hz suffit, pas besoin de 60 fps)
  useEffect(() => {
    if (phase !== 'live') return;
    const id = setInterval(() => {
      const e = (performance.now() - t0.current - pausedTotal.current) / 1000;
      setElapsed(e);
      if (e >= TARGET && !chimed.current) { chimed.current = true; chime('ok'); tap(30); }
      if (e >= HARD_STOP) finish();
    }, 250);
    return () => clearInterval(id);
  }, [phase, finish]);

  // quitter l'onglet pendant la prise : on clôture proprement
  useEffect(() => {
    const onVis = () => { if (document.hidden && phase === 'live') { if (elapsed > 3) finish(); else onQuit(); } };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [phase, elapsed, finish, onQuit]);

  const togglePause = () => {
    const rec = (mic.current as unknown as { recorder?: MediaRecorder })?.recorder;
    if (phase === 'live') {
      pausedAt.current = performance.now();
      rec?.state === 'recording' && rec.pause();
      setPhase('paused');
    } else if (phase === 'paused') {
      pausedTotal.current += performance.now() - pausedAt.current;
      rec?.state === 'paused' && rec.resume();
      setPhase('live');
    }
    tap();
  };

  const readLevel = useCallback(() => mic.current?.norm ?? 0, []);
  const over = elapsed >= TARGET;
  const remaining = TARGET - elapsed;

  return (
    <div className="c-flow">
      <LoopHeader step={0} label="Étape 1 · Action" onClose={onQuit} />

      <div className="c-challenge-topic">
        {topic ? (
          <p className="c-topic-sm">«&nbsp;{topic.replace(/\.$/, '')}.&nbsp;»</p>
        ) : (
          <>
            <p className="c-topic-free">Sujet libre</p>
            <p className="c-caption">Parle de ce que tu as en tête. Personne n’écoute.</p>
          </>
        )}
      </div>

      <div className={`c-stagezone ${mode === 'video' ? 'is-video' : ''}`}>
        {mode === 'video' && <video ref={video} className="c-selfie" muted playsInline aria-label="Aperçu caméra" />}
        <Ring size={mode === 'video' ? 132 : 220} stroke={6} pct={over ? 1 : elapsed / TARGET} color={over ? 'var(--c-gold)' : 'var(--c-acc2)'}>
          <div className={`c-clock ${mode === 'video' ? 'sm' : ''}`}>{over ? '✓' : fmtClock(remaining)}</div>
          <div className="c-caption">
            {phase === 'starting' ? 'Micro…' : phase === 'paused' ? 'En pause' : over ? 'Conclus quand tu veux' : 'Prends ton temps'}
          </div>
        </Ring>
      </div>

      {phase === 'error' ? (
        <div className="c-card c-error" role="alert">
          <p>{error}</p>
          <button className="c-cta" onClick={() => start(mode)}>Réessayer</button>
        </div>
      ) : (
        <LiveWave read={readLevel} />
      )}

      {showPrep && (
        <div className="c-card c-prep" aria-label="Prompteur P-R-E-P">
          <div className="c-prep-steps">
            {PREP.map((p, i) => (
              <button
                key={i} className={`c-prep-step ${i < step ? 'done' : ''} ${i === step ? 'now' : ''}`}
                onClick={() => { tap(); setStep(i); }} aria-current={i === step}
              >
                <b>{p.l}</b><span>{p.n}</span>
              </button>
            ))}
          </div>
          <p className="c-prep-hint">{PREP[step].hint}</p>
          <button className="c-link c-sm" onClick={() => { tap(); setStep(s => Math.min(3, s + 1)); }} disabled={step === 3}>
            Étape suivante →
          </button>
        </div>
      )}

      <div className="c-reminders" aria-label="Rappels">
        <span>Ralentis de 20&nbsp;%</span><span>Accepte le silence</span><span>Pose ta voix</span>
      </div>

      <div className="c-controls">
        <button className="c-round-btn" onClick={togglePause} aria-label={phase === 'paused' ? 'Reprendre' : 'Pause'} disabled={phase !== 'live' && phase !== 'paused'}>
          {phase === 'paused' ? '▶' : '❚❚'}
        </button>
        <div className="c-stop-wrap">
          <button className="c-stop" onClick={() => { tap(20); finish(); }} aria-label="Terminer" disabled={phase === 'starting' || phase === 'stopping' || phase === 'error'}>
            <span />
          </button>
          <span className="c-caption">Terminer</span>
        </div>
        <button className="c-round-btn" onClick={() => setShowPrep(v => !v)} aria-label={showPrep ? 'Masquer le prompteur' : 'Afficher le prompteur'} aria-pressed={!showPrep}>
          Aa
        </button>
      </div>
    </div>
  );
}
