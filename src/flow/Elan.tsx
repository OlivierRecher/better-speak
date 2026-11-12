/* « Dans l'élan » : mini-exos variés de 20 à 45 s, puis relance d'un nouveau défi.
   Rien à perdre : la journée est déjà validée, on peut s'arrêter à tout moment. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic } from '../legacy/audio.js';
import { drawMinis, type Mini } from '../lib/minis';
import { pickTopic } from '../lib/topics';
import { getState, recordRep, useClair, todayKey } from '../lib/state';
import { chime, fmtClock, tap } from '../lib/ui';
import { LiveWave, Ring } from '../components/bits';
import { LoopHeader } from './LoopHeader';

type MicT = InstanceType<typeof Mic>;

export function Elan({ onNewChallenge, onFinish }: { onNewChallenge: (topic: string | null) => void; onFinish: () => void }) {
  const s = useClair();
  const [minis, setMinis] = useState<Mini[]>(() => drawMinis(3));
  const [done, setDone] = useState(0);
  const [running, setRunning] = useState<Mini | null>(null);
  const [topic, setTopic] = useState(() => pickTopic());
  const repsToday = s.days[todayKey()]?.reps ?? 0;
  const current = minis[0];

  const complete = (m: Mini, secs: number) => {
    recordRep({ kind: 'mini', secs });
    setRunning(null);
    setDone(d => d + 1);
    setMinis(list => list.filter(x => x.id !== m.id));
  };

  if (running) return <MiniRunner mini={running} onDone={secs => complete(running, secs)} onCancel={() => setRunning(null)} />;

  return (
    <div className="c-flow">
      <LoopHeader
        step={-1} label="Dans l’élan · bonus" onClose={onFinish}
        right={<span className="c-tag" style={{ ['--tone' as string]: 'var(--c-green)' }}>Journée validée ✓</span>}
      />
      <div className="c-elan-dots" aria-hidden>
        {[0, 1, 2, 3].map(i => <i key={i} className={i < done ? 'done' : i === done ? 'now' : ''} />)}
      </div>
      <h1 className="c-h1">Encore un peu&nbsp;?</h1>
      <p className="c-lead">Des mini-exos tirés au hasard. Arrête quand tu veux : rien à perdre.</p>

      {current ? (
        <div className="c-card c-mini-now" style={{ ['--tone' as string]: current.tone }}>
          <span className="c-tag">{current.label.toUpperCase()} · {current.secs} s</span>
          <p className="c-mini-script">{current.script}</p>
          <p className="c-caption">{current.hint}</p>
          <button className="c-cta c-cta-tone c-wide" onClick={() => { tap(15); setRunning(current); }}>Go</button>
        </div>
      ) : (
        <div className="c-card c-center">
          <b>3 mini-exos faits.</b>
          <p className="c-caption">Tu peux en tirer d’autres, ou relancer un défi.</p>
        </div>
      )}

      <div className="c-row-between c-mt">
        <span className="c-caption">Ensuite</span>
        <button className="c-link c-sm" onClick={() => { tap(); setMinis(drawMinis(3)); }}>↻ Mélanger</button>
      </div>
      {minis.slice(1).map(m => (
        <div key={m.id} className="c-mini-next" style={{ ['--tone' as string]: m.tone }}>
          <span className="c-mini-ic" aria-hidden />
          <span className="c-grow">{m.label}</span>
          <span className="c-caption">{m.secs} s</span>
        </div>
      ))}

      <div className="c-newdefi">
        <div className="c-eyebrow" style={{ color: 'var(--c-acc2)' }}>Nouveau défi · 1 min</div>
        <p className="c-newdefi-t">«&nbsp;{topic.replace(/\.$/, '')}.&nbsp;»</p>
        <div className="c-newdefi-row">
          <button className="c-cta" onClick={() => { tap(15); onNewChallenge(topic); }}>Relancer un défi</button>
          <button className="c-glass-btn" onClick={() => { tap(15); onNewChallenge(null); }}>J’ai mon sujet</button>
        </div>
        <button className="c-link c-sm" onClick={() => { tap(); setTopic(t => pickTopic(t)); }}>↻ Autre sujet</button>
      </div>

      <button className="c-link c-center c-muted3" onClick={onFinish}>Terminer pour aujourd’hui</button>
      <p className="c-center c-caption" style={{ color: 'var(--c-gold-ink)' }}>{repsToday} rep{repsToday > 1 ? 's' : ''} aujourd’hui · l’élan monte</p>
    </div>
  );
}

/* ------------------------------ Exécution d'un mini-exo ------------------------------ */
function MiniRunner({ mini, onDone, onCancel }: { mini: Mini; onDone: (secs: number) => void; onCancel: () => void }) {
  const mic = useRef<MicT | null>(null);
  const t0 = useRef(0);
  const best = useRef(0);       // souffle : plus long segment voisé continu
  const segStart = useRef(0);
  const [elapsed, setElapsed] = useState(0);
  const [held, setHeld] = useState(0);
  const [err, setErr] = useState(false);
  const alive = useRef(true);

  const end = useCallback(async () => {
    const m = mic.current;
    mic.current = null;
    const secs = (performance.now() - t0.current) / 1000;
    await m?.stop();
    if (mini.kind === 'breath' && best.current > 0) {
      const r = getState().records;
      r.phonation = Math.max(r.phonation || 0, Math.round(best.current * 10) / 10);
    }
    chime('win');
    tap(30);
    onDone(Math.round(secs));
  }, [mini.kind, onDone]);

  useEffect(() => {
    alive.current = true;
    (async () => {
      try {
        const m = new Mic({ record: false });
        await m.start();
        if (!alive.current) { m.stop(); return; }
        mic.current = m;
      } catch {
        setErr(true); // sans micro, le mini-exo reste faisable : seul le visuel manque
      }
      t0.current = performance.now();
    })();
    return () => { alive.current = false; mic.current?.stop(); mic.current = null; };
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      if (!t0.current) return;
      const e = (performance.now() - t0.current) / 1000;
      setElapsed(e);
      const m = mic.current;
      if (mini.kind === 'breath' && m) {
        if (m.speaking) {
          if (!segStart.current) segStart.current = performance.now();
          const cur = (performance.now() - segStart.current) / 1000;
          best.current = Math.max(best.current, cur);
          setHeld(cur);
        } else { segStart.current = 0; setHeld(0); }
      }
      if (e >= mini.secs) { clearInterval(id); end(); }
    }, 200);
    return () => clearInterval(id);
  }, [mini.secs, mini.kind, end]);

  const read = useCallback(() => mic.current?.norm ?? 0, []);
  const cue = mini.cues ? mini.cues[Math.min(mini.cues.length - 1, Math.floor(elapsed / (mini.secs / mini.cues.length)))] : null;
  const record = getState().records.phonation || 0;

  return (
    <div className="c-flow" style={{ ['--tone' as string]: mini.tone }}>
      <LoopHeader step={-1} label={mini.label} onClose={onCancel} />
      <div className="c-stagezone">
        <Ring size={200} stroke={6} pct={elapsed / mini.secs} color={mini.tone}>
          {mini.kind === 'breath' ? (
            <>
              <div className="c-clock">{held.toFixed(1)}<small> s</small></div>
              <div className="c-caption">{record ? `record : ${record} s` : 'tiens le son'}</div>
            </>
          ) : (
            <>
              <div className="c-clock">{fmtClock(mini.secs - elapsed)}</div>
              <div className="c-caption">{cue ?? 'à voix haute'}</div>
            </>
          )}
        </Ring>
      </div>
      {cue && <div className="c-cue" key={cue}>{cue}</div>}
      <p className="c-mini-script c-center">{mini.script}</p>
      <p className="c-caption c-center">{mini.hint}</p>
      {!err && <LiveWave read={read} color={mini.tone} />}
      <div className="c-stack-btns">
        <button className="c-cta c-wide" onClick={end}>Fait ✓</button>
      </div>
    </div>
  );
}
