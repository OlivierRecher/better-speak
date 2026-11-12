/* Accueil « Aujourd'hui » : action d'abord. Un défi d'une minute prêt à lancer. */
import { useClair, streak, activeDays, setSetting } from '../lib/state';
import { tap } from '../lib/ui';
import { Icon, PhaseGauge, WeekChain, Card } from '../components/bits';

interface Props {
  topic: string;
  onReroll: () => void;
  onStart: (topic: string | null) => void;
}

const DATE_FMT = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

export function Home({ topic, onReroll, onStart }: Props) {
  const s = useClair();
  const st = streak();
  const day = activeDays();
  const media = s.settings.media;
  const hello = s.profile.name ? `Bonjour ${s.profile.name}` : 'Bonjour';
  const date = DATE_FMT.format(new Date());

  return (
    <div className="c-screen">
      <header className="c-top">
        <div>
          <div className="c-date">{date.charAt(0).toUpperCase() + date.slice(1)}</div>
          <h1 className="c-h1">{hello}</h1>
        </div>
        <div className="c-streak-pill" aria-label={`Série : ${st.current} jour${st.current > 1 ? 's' : ''}`}>
          <span className="c-flame" aria-hidden />
          <b>{st.current} j</b>
        </div>
      </header>

      {st.atRisk && (
        <div className="c-nudge" role="status">
          Hier était off, c’est permis. Aujourd’hui garde ta chaîne : <b>1 minute suffit.</b>
        </div>
      )}

      <section className="c-hero" aria-labelledby="defi-t">
        <div className="c-hero-aura" aria-hidden />
        <div className="c-hero-row">
          <span className="c-chip-glass">{st.activeToday ? 'JOURNÉE VALIDÉE ✓ · ENCORE UN ?' : 'DÉFI 1 MIN · IMPRO'}</span>
          <div className="c-seg" role="radiogroup" aria-label="Mode d’enregistrement">
            {(['audio', 'video'] as const).map(m => (
              <button key={m} role="radio" aria-checked={media === m} onClick={() => { tap(); setSetting('media', m); }}>
                {m === 'audio' ? 'Audio' : 'Vidéo'}
              </button>
            ))}
          </div>
        </div>
        <div className="c-hero-label">Ton sujet</div>
        <p id="defi-t" className="c-hero-topic">«&nbsp;{topic.replace(/\.$/, '')}.&nbsp;»</p>
        <div className="c-hero-actions">
          <button className="c-chip-btn" onClick={() => { tap(); onReroll(); }}>
            <Icon name="refresh" size={15} /> Autre sujet
          </button>
          <button className="c-chip-btn" onClick={() => { tap(15); onStart(null); }}>
            ✎&nbsp; J’ai mon sujet
          </button>
        </div>
        <button className="c-cta c-cta-hero" onClick={() => { tap(15); onStart(topic); }}>
          Lancer mon défi&nbsp;&nbsp;·&nbsp;&nbsp;1 min
        </button>
        <p className="c-hero-note">La prise s’efface après la séance. Personne ne t’écoute.</p>
      </section>

      <Card className="c-chain">
        <div className="c-row-between">
          <h2 className="c-h3">Ta chaîne</h2>
          <span className="c-caption">{s.settings.joker ? (st.jokerAvailable ? 'Joker dispo · jamais 2 jours manqués' : 'Joker utilisé cette semaine') : 'Jamais 2 jours manqués'}</span>
        </div>
        <WeekChain jokerDays={st.jokerDays} />
      </Card>

      <PhaseGauge day={day} />
    </div>
  );
}
