/* Composants d'interface partagés. */
import { useEffect, useRef, type ReactNode } from 'react';
import { iconHtml } from '../lib/ui';
import { getState, isActive, todayKey, PHASES, phaseOf } from '../lib/state';

export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  return <span className="c-icon" style={{ width: size, height: size }} aria-hidden dangerouslySetInnerHTML={{ __html: iconHtml(name) }} />;
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className="c-switch" onClick={() => onChange(!on)}>
      <span />
    </button>
  );
}

export function Card({ children, className = '', style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  return <section className={`c-card ${className}`} style={style}>{children}</section>;
}

/* ------------------------------ Anneau de progression ------------------------------ */
export function Ring({ size = 220, stroke = 6, pct, color = 'var(--c-acc2)', children }: { size?: number; stroke?: number; pct: number; color?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="c-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--c-s3)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, Math.max(0, pct)))}
          transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: 'stroke-dashoffset .25s linear, stroke .4s' }}
        />
      </svg>
      <div className="c-ring-in">{children}</div>
    </div>
  );
}

/* ------------------------------ Onde vocale en direct ------------------------------
   Lit le niveau du micro via une fonction (pas d'état React à 60 fps). */
export function LiveWave({ read, bars = 44, height = 44, color = 'var(--c-acc2)' }: { read: () => number; bars?: number; height?: number; color?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const hist = new Array(bars).fill(0.08);
    let raf = 0;
    const loop = () => {
      hist.push(Math.max(0.08, Math.min(1, read())));
      hist.shift();
      const kids = el.children;
      for (let i = 0; i < kids.length; i++) (kids[i] as HTMLElement).style.transform = `scaleY(${hist[i]})`;
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [read, bars]);
  return (
    <div ref={ref} className="c-wave" style={{ height, ['--wave' as string]: color }} aria-hidden>
      {Array.from({ length: bars }, (_, i) => <i key={i} />)}
    </div>
  );
}

/** Onde statique (décorative), dessinée à partir d'une graine. */
export function StaticWave({ bars = 40, height = 44, seed = 1, played = 1, color = 'var(--c-acc2)' }: { bars?: number; height?: number; seed?: number; played?: number; color?: string }) {
  return (
    <div className="c-wave static" style={{ height, ['--wave' as string]: color }} aria-hidden>
      {Array.from({ length: bars }, (_, i) => {
        const v = 0.15 + 0.85 * Math.abs(Math.sin(i * 0.7 * seed + Math.sin(i * 0.23) * 2)) * (0.5 + 0.5 * Math.abs(Math.sin(i * 0.11 + seed)));
        return <i key={i} style={{ transform: `scaleY(${v})`, opacity: i / bars < played ? 1 : 0.3 }} />;
      })}
    </div>
  );
}

/* ------------------------------ Chaîne de la semaine ------------------------------ */
const DAY_LETTERS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
export function WeekChain({ jokerDays }: { jokerDays: string[] }) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const k = todayKey(d);
    return { k, letter: DAY_LETTERS[d.getDay()], done: isActive(k), today: i === 6, joker: jokerDays.includes(k) };
  });
  return (
    <div className="c-week" role="list" aria-label="Les 7 derniers jours">
      {days.map(d => (
        <span
          key={d.k} role="listitem"
          className={`c-day ${d.done ? 'done' : ''} ${d.today ? 'today' : ''} ${d.joker ? 'joker' : ''}`}
          aria-label={`${d.letter} : ${d.done ? 'fait' : d.joker ? 'joker utilisé' : d.today ? "aujourd'hui" : 'repos'}`}
          title={d.joker ? 'Joker : jour manqué toléré' : undefined}
        >
          {d.letter}
        </span>
      ))}
    </div>
  );
}

/* ------------------------------ Jauge des phases (66 jours) ------------------------------ */
export function PhaseGauge({ day }: { day: number }) {
  const { index, phase } = phaseOf(Math.max(1, day));
  const pct = Math.min(1, day / 66);
  const remaining = phase ? phase.to - day + 1 : 0;
  const next = PHASES[index + 1];
  return (
    <Card className="c-phase">
      <div className="c-eyebrow" style={{ color: phase?.color ?? 'var(--c-acc2)' }}>
        {phase ? `Phase ${index + 1} · ${phase.name}` : 'Automatisé'}
      </div>
      <div className="c-h2">{day > 66 ? `Jour ${day} · au-delà des 66` : `Jour ${Math.max(day, 0)} sur 66`}</div>
      <p className="c-muted c-sm">
        {day === 0
          ? 'Le premier défi lance ton cycle de 66 jours.'
          : phase
            ? `${phase.text}${next ? ` Encore ${remaining} jour${remaining > 1 ? 's' : ''} avant la ${next.name.toLowerCase()}.` : ''}`
            : 'Parler est devenu une habitude. Continue pour l’entretenir.'}
      </p>
      <div className="c-track" role="progressbar" aria-valuemin={0} aria-valuemax={66} aria-valuenow={day}>
        <i style={{ width: `${pct * 100}%` }} />
        {[14, 30].map(t => <b key={t} style={{ left: `${(t / 66) * 100}%` }} />)}
      </div>
      <div className="c-phase-legend">
        {PHASES.map((p, i) => <span key={p.key} style={{ color: i === index ? p.color : undefined }}>{p.name}</span>)}
      </div>
    </Card>
  );
}

/* ------------------------------ Calendrier d'activité ------------------------------ */
export function Heatmap({ weeks = 10, highlightToday = true }: { weeks?: number; highlightToday?: boolean }) {
  // le composant parent est abonné au store : un rendu suffit à relire les jours
  const days = getState().days;
  // colonnes = semaines (lundi → dimanche), la dernière contient aujourd'hui
  const today = new Date();
  const dow = (today.getDay() + 6) % 7; // 0 = lundi
  const start = new Date(today);
  start.setDate(today.getDate() - dow - (weeks - 1) * 7);
  const cols = Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const x = new Date(start);
      x.setDate(start.getDate() + w * 7 + d);
      const k = todayKey(x);
      const reps = days[k]?.reps ?? 0;
      const future = x > today;
      return { k, reps, future, today: k === todayKey(today) };
    }),
  );
  const level = (r: number) => (r === 0 ? 0 : r === 1 ? 1 : r <= 3 ? 2 : 3);
  return (
    <div className="c-heat" style={{ gridTemplateColumns: `repeat(${weeks}, 1fr)` }} aria-label={`Activité des ${weeks} dernières semaines`}>
      {cols.map((col, i) => (
        <div key={i} className="c-heat-col">
          {col.map(c => (
            <i key={c.k} className={`l${level(c.reps)} ${c.future ? 'future' : ''} ${highlightToday && c.today ? 'now' : ''}`} title={`${c.k} · ${c.reps} rep${c.reps > 1 ? 's' : ''}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

