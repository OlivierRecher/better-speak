/* Étape 4 — Clôture & récompense : confettis, chaîne, myélinisation.
   La journée est validée dès le premier défi : la barre est volontairement basse. */
import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { useClair, streak, myelin } from '../lib/state';
import { reducedMotion, tap } from '../lib/ui';
import { Heatmap } from '../components/bits';

export function Reward({ repsBefore, firstToday, onElan, onFinish }: {
  repsBefore: number;
  firstToday: boolean;
  onElan: () => void;
  onFinish: () => void;
}) {
  const s = useClair();
  const st = streak();
  const before = myelin(repsBefore);
  const after = myelin(s.totalReps);
  const [shown, setShown] = useState(before);

  useEffect(() => {
    tap(60);
    if (!reducedMotion()) {
      const colors = ['#FFC857', '#8B7CFF', '#4FD1C5', '#FF7A90', '#5EE6A0'];
      confetti({ particleCount: 90, spread: 75, startVelocity: 38, origin: { y: 0.28 }, colors, scalar: 0.9, disableForReducedMotion: true });
      setTimeout(() => confetti({ particleCount: 40, spread: 110, origin: { y: 0.3 }, colors, scalar: 0.7 }), 260);
    }
    const id = setTimeout(() => setShown(after), 450);
    return () => clearTimeout(id);
  }, [after]);

  const gainPct = Math.max(0.1, (after - before) * 100);

  return (
    <div className="c-flow c-reward">
      <div className="c-medal-zone">
        <div className="c-medal-halo" aria-hidden />
        <div className="c-medal" aria-label={`Série de ${st.current} jour${st.current > 1 ? 's' : ''}`}>
          <b>{st.current}</b>
          <span>jour{st.current > 1 ? 's' : ''}</span>
        </div>
      </div>
      <h1 className="c-h1 c-center">{firstToday ? 'Rep validée.' : 'Rep bonus.'}</h1>
      <p className="c-lead c-center">
        {firstToday
          ? '1 minute suffit à valider ta journée. Tu as affronté l’inconfort : c’est exactement ce qui recâble la parole.'
          : 'Ta journée était déjà validée. Ce défi en plus renforce encore le circuit.'}
      </p>

      <div className="c-card">
        <div className="c-row-between">
          <b className="c-sm">Myélinisation · Prise de parole</b>
          <b className="c-sm" style={{ color: 'var(--c-green)' }}>+{gainPct.toFixed(1)} %</b>
        </div>
        <div className="c-myelin" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(after * 100)}>
          <i style={{ width: `${before * 100}%` }} />
          <em style={{ left: `${before * 100}%`, width: `${Math.max(0.6, (shown - before) * 100)}%` }} />
        </div>
        <p className="c-caption">Chaque rep épaissit la gaine du circuit : plus rapide, plus fluide, moins coûteux.</p>
      </div>

      <div className="c-card">
        <div className="c-row-between">
          <b className="c-sm">10 semaines</b>
          <span className="c-caption">record : {st.best} j</span>
        </div>
        <Heatmap weeks={10} />
      </div>

      <div className="c-stack-btns">
        <button className="c-cta c-wide" onClick={() => { tap(15); onElan(); }}>Rester dans l’élan&nbsp;&nbsp;→</button>
        <button className="c-cta-ghost c-wide" onClick={() => { tap(); onFinish(); }}>Terminer pour aujourd’hui</button>
      </div>
    </div>
  );
}
