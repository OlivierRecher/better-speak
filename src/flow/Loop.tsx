/* Boucle d'entraînement : Défi → Débrief → Replay → Récompense → Dans l'élan.
   La prise vit uniquement en mémoire et disparaît à la fermeture (sauf « Garder ce souvenir »). */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Challenge, type Take } from './Challenge';
import { Debrief } from './Debrief';
import { Replay } from './Replay';
import { Reward } from './Reward';
import { Elan } from './Elan';
import { LoopHeader } from './LoopHeader';
import { getState, recordRep, useClair } from '../lib/state';
import { sentenceFrom, type Struggle } from '../lib/topics';
import { markActiveRemote } from '../lib/push';

type Step =
  | { k: 'challenge'; n: number }
  | { k: 'empty' }
  | { k: 'debrief' }
  | { k: 'replay'; struggle: Struggle }
  | { k: 'reward' }
  | { k: 'elan' };

export function Loop({ initialTopic, onClose }: { initialTopic: string | null; onClose: () => void }) {
  const s = useClair();
  const [topic, setTopic] = useState<string | null>(initialTopic);
  const [step, setStep] = useState<Step>({ k: 'challenge', n: 0 });
  const [take, setTake] = useState<Take | null>(null);
  const [meta, setMeta] = useState({ repsBefore: 0, firstToday: true });

  // URL de lecture de la prise, révoquée dès qu'elle change : rien ne traîne en mémoire
  const url = useMemo(() => (take?.blob ? URL.createObjectURL(take.blob) : null), [take]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  // chaque étape repart du haut de l'écran
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { box.current?.scrollTo({ top: 0 }); }, [step]);

  // la boucle occupe tout l'écran : on bloque le défilement de la page dessous
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const onTake = (t: Take) => {
    const repsBefore = getState().totalReps;
    const res = recordRep({ kind: 'defi', defi: true, secs: t.secs, title: t.topic ?? 'Sujet libre' });
    setMeta({ repsBefore, firstToday: res.repsToday === 1 });
    setTake(t);
    setStep({ k: 'debrief' });
    markActiveRemote();
  };

  const restart = (t: string | null) => {
    setTake(null);
    setTopic(t);
    setStep(st => ({ k: 'challenge', n: (st.k === 'challenge' ? st.n : 0) + 1 }));
  };

  return (
    <div ref={box} className="c-overlay" role="dialog" aria-modal="true" aria-label="Défi">
      {step.k === 'challenge' && (
        <Challenge
          key={step.n} topic={topic} media={s.settings.media}
          onDone={onTake} onEmpty={() => setStep({ k: 'empty' })} onQuit={onClose}
        />
      )}
      {step.k === 'empty' && (
        <div className="c-flow">
          <LoopHeader step={0} label="Étape 1 · Action" onClose={onClose} />
          <div className="c-empty">
            <h1 className="c-h1">On n’a presque rien entendu.</h1>
            <p className="c-lead">Ce n’est pas grave : ça arrive quand le micro est loin ou que l’élan n’est pas là. On recommence, sans compter.</p>
            <button className="c-cta c-wide" onClick={() => restart(topic)}>Recommencer</button>
            <button className="c-cta-ghost c-wide" onClick={onClose}>Revenir plus tard</button>
          </div>
        </div>
      )}
      {step.k === 'debrief' && take && (
        <Debrief take={take} url={url} onQuit={onClose} onChoose={st => setStep(st ? { k: 'replay', struggle: st } : { k: 'reward' })} />
      )}
      {step.k === 'replay' && take && (
        <Replay
          struggle={step.struggle} sentence={sentenceFrom(take.transcript)} baseline={take.baseline}
          onDone={() => setStep({ k: 'reward' })} onQuit={onClose}
        />
      )}
      {step.k === 'reward' && (
        <Reward repsBefore={meta.repsBefore} firstToday={meta.firstToday} onElan={() => { setTake(null); setStep({ k: 'elan' }); }} onFinish={onClose} />
      )}
      {step.k === 'elan' && <Elan onNewChallenge={restart} onFinish={onClose} />}
    </div>
  );
}
