import { tap } from '../lib/ui';

const STEPS = ['Défi', 'Réécoute', 'Replay', 'Bravo'];

/** En-tête de la boucle : fermer + progression en 4 segments. */
export function LoopHeader({ step, label, onClose, right }: { step: number; label: string; onClose: () => void; right?: React.ReactNode }) {
  return (
    <header className="c-loophead">
      <button className="c-close" onClick={() => { tap(); onClose(); }} aria-label="Fermer">✕</button>
      <div className="c-loophead-mid">
        <div className="c-eyebrow c-muted3">{label}</div>
        {step >= 0 && (
          <div className="c-steps" aria-label={`Étape ${step + 1} sur 4`}>
            {STEPS.map((s, i) => <i key={s} className={i < step ? 'done' : i === step ? 'now' : ''} />)}
          </div>
        )}
      </div>
      {right}
    </header>
  );
}
