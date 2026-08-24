/* ==========================================================================
   app.js — routeur, vues et amorçage
   ========================================================================== */
import { PROGRAM, SKILLS, BADGES, GUIDES, byId } from './content.js';
import * as store from './store.js';
import * as ex from './exercise.js';
import { support } from './audio.js';
import { $, esc, md, icon, ring, radar, spark, metric, tileHtml, toast, fmtDate, clamp } from './ui.js';
import * as A from './analysis.js';

const SK = Object.keys(SKILLS);
let route = 'home';
let sub = {};

/* ------------------------------ Barre d'onglets ------------------------------ */
const TABS = [
  { id: 'home', t: 'Accueil', i: 'home' },
  { id: 'train', t: 'Entraînement', i: 'play' },
  { id: 'progress', t: 'Progrès', i: 'chart' },
  { id: 'library', t: 'Repères', i: 'book' },
];
function renderTabs() {
  $('#tabbar').innerHTML =
    `<svg width="0" height="0" style="position:absolute"><defs><linearGradient id="tabgrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#7c5cff"/><stop offset="1" stop-color="#22d3ee"/></linearGradient></defs></svg>` +
    TABS.map(t => `<button data-nav="${t.id}" ${route === t.id ? 'aria-current="page"' : ''}>${icon(t.i)}<span>${t.t}</span></button>`).join('');
}

/* ------------------------------ Entête ------------------------------ */
function renderTop() {
  const s = store.get(), li = store.levelInfo();
  const map = {
    home: ["Clair", `${store.title()} · niveau ${li.level}`],
    train: ["Entraînement", "Programme et exercices"],
    progress: ["Progrès", `${store.stats().count} séances · ${store.stats().minutes} min`],
    library: ["Repères", "Fiches et méthode"],
    settings: ["Réglages", "Profil et données"],
  };
  const [t, st] = map[route] || map.home;
  $('#topbar').innerHTML = `<div class="grow"><div class="tb-t">${esc(t)}</div><div class="tb-s">${esc(st)}</div></div>
    ${route === 'settings'
      ? `<button class="iconbtn" data-nav="home" aria-label="Retour">${icon('back')}</button>`
      : `<button class="iconbtn" data-nav="settings" aria-label="Réglages">${icon('gear')}</button>`}`;
}

/* ==========================================================================
   VUE — Accueil
   ========================================================================== */
function viewHome() {
  const s = store.get(), li = store.levelInfo(), ov = store.overall();
  const stk = store.streakStatus(), days = store.last7Days();
  const next = store.nextProgramSession(), pp = store.programProgress();
  const weak = store.weakest();
  const today = store.sessionsToday();
  const recent = s.sessions.slice(0, 3);

  const onboarding = !s.seen.onboarded ? `
    <div class="card pad-l stack g12" style="border-color:rgba(124,92,255,.4)">
      <div class="row"><span class="chip on">Bienvenue</span></div>
      <h2>Comment ça marche</h2>
      <p class="small muted">Tout se passe dans ce navigateur : ta voix n'est <b>jamais envoyée sur un serveur</b>, l'analyse est faite en local et tes progrès sont stockés sur cet appareil.</p>
      <div class="steps">
        <div class="step"><span class="n">1</span><span class="grow"><b>Autorise le micro</b><div class="small muted">Nécessaire pour mesurer débit, souffle, mélodie et articulation.</div></span></div>
        <div class="step"><span class="n">2</span><span class="grow"><b>Fais la séance du jour</b><div class="small muted">Le programme de 12 semaines enchaîne 2 à 3 exercices, soit 8 à 15 minutes.</div></span></div>
        <div class="step"><span class="n">3</span><span class="grow"><b>Reviens demain</b><div class="small muted">Dix minutes par jour battent deux heures le dimanche : la voix est un réflexe moteur.</div></span></div>
      </div>
      ${!support.recog ? `<div class="banner">${icon('info')}<span>Ce navigateur ne transcrit pas la parole. Les exercices de souffle, volume, intonation et rythme fonctionnent ; ceux qui notent la <b>précision des mots</b> ont besoin de Chrome ou Edge (Android/ordinateur).</span></div>` : ''}
      <button class="btn btn-primary" data-act="onboard-ok">C'est parti</button>
    </div>` : '';

  const hero = `
    <div class="hero">
      <div class="row">
        <div class="grow">
          <div class="lvl">Niveau ${li.level} · ${esc(store.title())}</div>
          <div class="big">${ov}<span style="font-size:17px;color:var(--txt-3);font-weight:600">/100</span></div>
          <div class="small muted">Indice global de maîtrise</div>
        </div>
        ${ring(li.pct, { label: `${li.into}`, sub: `/ ${li.span} XP` })}
      </div>
      <div class="bar" style="margin-top:14px"><i style="width:${(li.pct * 100).toFixed(1)}%"></i></div>
      <div class="row" style="margin-top:14px">
        <div class="grow small"><b>${stk.current}</b> jour${stk.current > 1 ? 's' : ''} d'affilée
          <span class="dim">· record ${stk.best}</span></div>
        <span class="chip ${today >= s.profile.dailyGoal ? 'ok' : ''}">${today}/${s.profile.dailyGoal} aujourd'hui</span>
      </div>
      <div class="streak" style="margin-top:10px">${days.map(d =>
        `<i class="${d.done ? 'done' : ''} ${d.today ? 'today' : ''}">${d.label}</i>`).join('')}</div>
    </div>`;

  const session = next ? `
    <div class="sect-h"><h2>Séance du jour</h2><span class="tiny dim">${pp.done}/${pp.total} faites</span></div>
    <div class="card pad-l stack g12">
      <div class="row">
        <div class="grow"><div class="tiny dim">Semaine ${next.week.n} · ${esc(next.week.t)}</div>
          <h2 style="margin-top:3px">${esc(next.session.label)}</h2>
          <div class="small muted" style="margin-top:3px">${esc(next.week.f)}</div></div>
      </div>
      <div class="stack g8">${next.session.exercises.map((id, i) => {
        const e = byId(id);
        return `<div class="row small"><span class="chip">${i + 1}</span><b class="grow">${esc(e.title)}</b><span class="dim tiny">${esc(e.sub)}</span></div>`;
      }).join('')}</div>
      <button class="btn btn-primary btn-block" data-act="startsession" data-id="${next.session.id}">
        ${icon('play')} Démarrer la séance</button>
    </div>` : `
    <div class="sect-h"><h2>Programme terminé</h2></div>
    <div class="card stack g8"><b>Les 12 semaines sont bouclées. 👑</b>
      <p class="small muted">Continue en séances libres : les exercices notés restent tous disponibles, et tes compétences continuent d'évoluer.</p></div>`;

  const reco = `
    <div class="sect-h"><h2>Ton point faible</h2></div>
    ${tileHtml({
      ico: 'target', t: `${weak.name} · ${Math.round(weak.value)}/100`,
      s: weak.desc, attrs: `data-act="focus" data-skill="${weak.key}"`,
    })}`;

  const quick = `
    <div class="sect-h"><h2>Accès rapide</h2></div>
    <div class="stack g8">
      ${['ex-warm-express', 'ex-twister', 'ex-impro', 'ex-phonation'].map(id => {
        const e = byId(id);
        return tileHtml({ ico: e.ico, t: e.title, s: e.sub, attrs: `data-act="ex" data-id="${e.id}"` });
      }).join('')}
    </div>`;

  const last = recent.length ? `
    <div class="sect-h"><h2>Dernières séances</h2><button data-nav="progress">Tout voir</button></div>
    <div class="card">${recent.map(r => histRow(r)).join('')}</div>` : '';

  return onboarding + hero + session + reco + quick + last;
}

const histRow = r => `<div class="hist-item">
  <div class="sc" style="color:${r.score >= 80 ? '#6ee7b7' : r.score >= 60 ? '#fde68a' : '#fca5a5'}">${r.score}</div>
  <div class="grow"><b style="font-size:14.5px">${esc(r.title)}</b>
    <div class="tiny dim">${fmtDate(r.date)} · ${A.fmtTime(r.duration)}${metricsSummary(r)}</div></div>
  <span class="go">${icon('chevron')}</span></div>`;

function metricsSummary(r) {
  const m = r.metrics || {}, bits = [];
  if (m.wpm) bits.push(`${m.wpm} mpm`);
  if (m.accuracy) bits.push(`${m.accuracy} %`);
  if (m.fillers != null) bits.push(`${m.fillers} tic${m.fillers > 1 ? 's' : ''}`);
  if (m.seconds) bits.push(`${m.seconds} s`);
  if (m.zone != null) bits.push(`${m.zone} % zone`);
  if (m.correct != null) bits.push(`${m.correct}/${m.total}`);
  if (m.offsetMs) bits.push(`${m.offsetMs} ms`);
  return bits.length ? ' · ' + bits.join(' · ') : '';
}

/* ==========================================================================
   VUE — Entraînement
   ========================================================================== */
function viewTrain() {
  const tab = sub.train || 'program';
  const seg = `<div class="seg" style="margin-top:6px">
    ${[['program', 'Programme'], ['all', 'Tous les exercices']].map(([k, l]) =>
      `<button data-sub="train:${k}" aria-selected="${tab === k}">${l}</button>`).join('')}</div>`;
  return seg + (tab === 'program' ? programList() : catalogList());
}

function programList() {
  const s = store.get(), pp = store.programProgress();
  const next = store.nextProgramSession();
  const openWeek = sub.week ?? (next ? next.week.n : 1);
  return `
    <div class="card stack g8" style="margin-top:16px">
      <div class="row"><b class="grow">Progression du programme</b><span class="mono">${pp.done}/${pp.total}</span></div>
      <div class="bar"><i style="width:${(pp.done / pp.total * 100).toFixed(1)}%"></i></div>
      <p class="tiny dim">12 semaines · 3 séances par semaine · 8 à 15 minutes par séance. Tu peux faire les séances dans l'ordre que tu veux, mais l'ordre proposé est progressif.</p>
    </div>
    ${PROGRAM.map(w => {
      const done = w.sessions.filter(x => s.program.done[x.id]).length;
      const isOpen = w.n === openWeek;
      return `<div class="card" style="margin-top:10px;padding:0;overflow:hidden">
        <button class="tile" style="border:0;background:none;width:100%;border-radius:0" data-sub="week:${isOpen ? 0 : w.n}">
          <span class="ico" style="${done === w.sessions.length ? 'background:rgba(52,211,153,.16);color:#6ee7b7' : ''}">
            ${done === w.sessions.length ? icon('check') : `<b style="font-size:15px">${w.n}</b>`}</span>
          <span class="grow"><span class="t">${esc(w.t)}</span><span class="s">${esc(w.f)}</span></span>
          <span class="go tiny mono">${done}/${w.sessions.length}</span></button>
        ${isOpen ? `<div style="padding:0 14px 14px">${w.sessions.map(ss => {
          const d = s.program.done[ss.id];
          return `<div class="step ${d ? 'done' : ''}" style="border-bottom:1px solid var(--line)">
            <span class="n">${d ? '✓' : ss.n}</span>
            <span class="grow"><b>${esc(ss.label)}</b>
              <div class="tiny dim">${ss.exercises.map(id => esc(byId(id).title)).join(' · ')}</div></span>
            <button class="btn btn-sm ${d ? 'btn-ghost' : 'btn-primary'}" data-act="startsession" data-id="${ss.id}">
              ${d ? 'Refaire' : 'Faire'}</button></div>`;
        }).join('')}</div>` : ''}</div>`;
    }).join('')}`;
}

function catalogList() {
  const groups = [
    ['Préparation', ['ex-warm-express', 'ex-warm-full', 'ex-calm']],
    ['Articulation & prononciation', ['ex-twister', 'ex-drill', 'ex-finales', 'ex-pairs']],
    ['Débit & lecture', ['ex-read', 'ex-pace', 'ex-expressive']],
    ['Voix & souffle', ['ex-phonation', 'ex-volume', 'ex-pitch']],
    ['Prise de parole', ['ex-impro', 'ex-impro-long', 'ex-prompter']],
  ];
  return groups.map(([g, ids]) => `
    <div class="sect-h"><h2>${esc(g)}</h2></div>
    <div class="stack g8">${ids.map(id => {
      const e = byId(id);
      const best = store.get().sessions.filter(x => x.exerciseId === id);
      const bestScore = best.length ? Math.max(...best.map(x => x.score)) : null;
      return tileHtml({
        ico: e.ico, t: e.title, s: e.sub, attrs: `data-act="ex" data-id="${id}"`,
        right: bestScore != null ? `<span class="chip tiny">${bestScore}</span>` : icon('chevron'),
      });
    }).join('')}</div>`).join('');
}

/* ==========================================================================
   VUE — Progrès
   ========================================================================== */
function viewProgress() {
  const s = store.get(), st = store.stats();
  const vals = SK.map(k => s.skills[k]);
  const hist = store.scoreHistory(null, 24);
  const tab = sub.prog || 'skills';

  const head = `
    <div class="card stack g12" style="margin-top:16px">
      ${radar(vals, SK.map(k => SKILLS[k].name))}
      <div class="metrics" style="grid-template-columns:repeat(3,1fr)">
        ${metric('Séances', st.count)}
        ${metric('Temps total', st.minutes, 'min')}
        ${metric('Moy. 10 dern.', st.avg10, '/100')}
      </div>
    </div>
    <div class="seg" style="margin-top:14px">
      ${[['skills', 'Compétences'], ['hist', 'Historique'], ['badges', 'Badges']].map(([k, l]) =>
        `<button data-sub="prog:${k}" aria-selected="${tab === k}">${l}</button>`).join('')}</div>`;

  if (tab === 'skills') {
    return head + `
      <div class="sect-h"><h2>Évolution des scores</h2></div>
      <div class="card">${spark(hist)}
        <div class="row tiny dim" style="margin-top:6px"><span>${hist.length} dernières séances</span>
          <span class="grow"></span><span>moyenne ${st.avg}</span></div></div>
      <div class="sect-h"><h2>Détail par compétence</h2></div>
      <div class="card">${SK.map(k => {
        const v = s.skills[k], tr = store.skillTrend(k, 10);
        const delta = tr.length > 1 ? v - tr[0] : 0;
        return `<div class="skill-row">
          <span class="nm">${SKILLS[k].emoji} ${SKILLS[k].name}</span>
          <span class="grow"><span class="bar"><i style="width:${clamp(v, 2, 100)}%"></i></span></span>
          <span class="num">${Math.round(v)}</span>
          <span class="tiny ${delta >= 0 ? '' : 'dim'}" style="width:38px;text-align:right;color:${delta > .3 ? '#6ee7b7' : delta < -.3 ? '#fca5a5' : 'var(--txt-3)'}">
            ${delta > .3 ? '+' : ''}${Math.abs(delta) < .3 ? '=' : delta.toFixed(1)}</span></div>`;
      }).join('')}</div>
      <div class="sect-h"><h2>Records</h2></div>
      <div class="metrics">
        ${metric('Souffle max', s.records.phonation || '—', 's', '« aaa » tenu')}
        ${metric('Meilleur score', s.records.bestScore || '—', '/100')}
        ${metric('Virelangue net', s.records.twister || '—', 'mpm', '≥88 % de précision')}
        ${metric('Parole continue', s.records.longestTalk ? A.fmtTime(s.records.longestTalk) : '—', '', 'improvisation')}
      </div>
      <div class="sect-h"><h2>Conseil du moment</h2></div>
      ${adviceCard()}`;
  }
  if (tab === 'hist') {
    if (!s.sessions.length) return head + `<div class="empty"><div class="e">🎙️</div><p>Aucune séance pour l'instant.</p></div>`;
    const byDay = {};
    for (const r of s.sessions) {
      const k = new Date(r.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
      (byDay[k] = byDay[k] || []).push(r);
    }
    return head + Object.entries(byDay).map(([d, rows]) => `
      <div class="sect-h"><h2 style="font-size:14px;text-transform:capitalize">${esc(d)}</h2>
        <span class="tiny dim">${rows.length} séance${rows.length > 1 ? 's' : ''}</span></div>
      <div class="card">${rows.map(r => histRow(r)).join('')}</div>`).join('');
  }
  return head + `
    <div class="sect-h"><h2>Badges</h2><span class="tiny dim">${s.badges.length}/${BADGES.length}</span></div>
    <div class="badges">${BADGES.map(b => `<div class="badge ${s.badges.includes(b.id) ? '' : 'off'}">
      <div class="e">${b.e}</div><div class="n">${esc(b.n)}</div></div>`).join('')}</div>`;
}

function adviceCard() {
  const s = store.get(), w = store.weakest();
  const map = {
    articulation: ['g-artic', ['ex-drill', 'ex-twister', 'ex-finales']],
    debit: ['g-debit', ['ex-pace', 'ex-read']],
    prosodie: ['g-proso', ['ex-pitch', 'ex-expressive']],
    fluidite: ['g-tics', ['ex-impro', 'ex-impro-long']],
    projection: ['g-souffle', ['ex-phonation', 'ex-volume']],
  };
  const [gid, exs] = map[w.key];
  const g = GUIDES.find(x => x.id === gid);
  return `<div class="card stack g12">
    <div class="row"><span class="chip on">${SKILLS[w.key].emoji} ${SKILLS[w.key].name} ${Math.round(w.value)}/100</span></div>
    <p class="small muted">${md(g.body[0])}</p>
    <div class="stack g8">${exs.map(id => {
      const e = byId(id);
      return tileHtml({ ico: e.ico, t: e.title, s: e.sub, attrs: `data-act="ex" data-id="${id}"` });
    }).join('')}</div>
    <button class="btn btn-ghost btn-sm" data-act="guide" data-id="${gid}">${icon('book')} Lire la fiche « ${esc(g.t)} »</button></div>`;
}

/* ==========================================================================
   VUE — Repères (fiches)
   ========================================================================== */
function viewLibrary() {
  if (sub.guide) {
    const g = GUIDES.find(x => x.id === sub.guide);
    return `<div class="stack g16" style="margin-top:16px">
      <button class="btn btn-sm btn-ghost" style="align-self:flex-start" data-sub="guide:0">${icon('back')} Toutes les fiches</button>
      <div class="card pad-l stack g12"><div style="font-size:30px">${g.e}</div><h1>${esc(g.t)}</h1>
        ${g.body.map(p => `<p style="font-size:15.5px;line-height:1.6" class="muted">${md(p)}</p>`).join('')}</div></div>`;
  }
  return `
    <div class="sect-h"><h2>Fiches méthode</h2></div>
    <div class="stack g8">${GUIDES.map(g =>
      `<button class="tile" data-sub="guide:${g.id}"><span class="ico" style="font-size:20px">${g.e}</span>
        <span class="grow"><span class="t">${esc(g.t)}</span><span class="s">${esc(g.body[0].replace(/\*\*/g, '').slice(0, 62))}…</span></span>
        <span class="go">${icon('chevron')}</span></button>`).join('')}</div>

    <div class="sect-h"><h2>Repères mesurés</h2></div>
    <div class="card stack g12">
      ${[
        ['Débit', '140 – 165 mots/min', "En dessous de 120 l'attention chute, au-dessus de 180 la compréhension chute."],
        ['Silence', '10 – 22 % du temps', "Un discours sans silence est illisible ; au-delà de 30 %, ce sont des hésitations."],
        ['Mélodie', '1,8 – 4,2 demi-tons', "Écart-type de la hauteur de voix. Sous 1,2 demi-ton, la voix est perçue comme monocorde."],
        ['Amplitude', '6 – 12 demi-tons', "Excursion grave → aigu d'une phrase vivante."],
        ['Souffle', '20 s et plus', "Durée d'un « aaa » tenu à volume constant."],
        ['Tics', 'moins de 2 / min', "Au-delà de 4 par minute, l'auditoire les remarque consciemment."],
        ['Pauses', '6 – 18 / min', "Une pause tous les 3 à 10 secondes structure naturellement le propos."],
      ].map(([k, v, d]) => `<div><div class="row"><b class="grow" style="font-size:14.5px">${k}</b>
        <span class="chip on mono">${v}</span></div><p class="tiny dim" style="margin-top:4px">${esc(d)}</p></div>`).join('')}
    </div>

    <div class="sect-h"><h2>Comment lire tes scores</h2></div>
    <div class="card stack g8">
      <p class="small muted">Chaque exercice produit une note sur 100 en combinant plusieurs mesures objectives issues du signal audio et, quand le navigateur le permet, de la transcription de ta parole.</p>
      <p class="small muted">Les cinq compétences évoluent en <b>moyenne glissante</b> : une mauvaise séance ne les effondre pas, une bonne ne les fait pas bondir. Il faut environ dix séances pour que le profil devienne fiable.</p>
      <p class="small muted">Les mesures dépendent de ton micro et du bruit ambiant. Compare tes résultats <b>dans les mêmes conditions</b> : même pièce, même appareil, même distance.</p>
    </div>

    <div class="sect-h"><h2>Une séance efficace</h2></div>
    <div class="card"><div class="steps">
      ${[['2 min', "Échauffement", "Souffle, visage, résonance. Jamais d'exercice à froid."],
         ['5 min', "Technique ciblée", "Un seul défaut à la fois : articulation, débit ou mélodie."],
         ['3 min', "Mise en situation", "Improvisation ou lecture expressive, pour transférer l'acquis."],
         ['1 min', "Réécoute", "L'étape que tout le monde saute, et la plus rentable de toutes."]]
        .map(([d, t, s], i) => `<div class="step"><span class="n">${i + 1}</span>
          <span class="grow"><b>${t}</b> <span class="tiny dim">· ${d}</span><div class="small muted">${s}</div></span></div>`).join('')}
    </div></div>`;
}

/* ==========================================================================
   VUE — Réglages
   ========================================================================== */
function viewSettings() {
  const s = store.get();
  const sw = (k, label, hint) => `<div class="switch"><div class="grow"><b style="font-size:14.5px">${label}</b>
    ${hint ? `<div class="tiny dim">${hint}</div>` : ''}</div>
    <button class="tg" role="switch" aria-checked="${!!s.settings[k]}" data-act="toggle" data-k="${k}"></button></div>`;
  return `
    <div class="sect-h"><h2>Objectifs</h2></div>
    <div class="card stack g16">
      <div class="field"><label>Débit cible par défaut · <b class="mono" id="twv">${s.profile.targetWpm}</b> mots/min</label>
        <input type="range" id="tw" min="110" max="200" step="5" value="${s.profile.targetWpm}"></div>
      <div class="field"><label>Séances par jour · <b class="mono" id="dgv">${s.profile.dailyGoal}</b></label>
        <input type="range" id="dg" min="1" max="6" step="1" value="${s.profile.dailyGoal}"></div>
      <div class="field"><label>Langue de la reconnaissance vocale</label>
        <select id="lang">${[['fr-FR', 'Français (France)'], ['fr-CA', 'Français (Canada)'], ['fr-BE', 'Français (Belgique)'],
          ['en-US', 'English (US)'], ['en-GB', 'English (UK)'], ['es-ES', 'Español'], ['de-DE', 'Deutsch'], ['it-IT', 'Italiano'], ['pt-BR', 'Português (BR)']]
          .map(([v, l]) => `<option value="${v}" ${s.profile.lang === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    </div>

    <div class="sect-h"><h2>Préférences</h2></div>
    <div class="card">
      ${sw('haptics', 'Retour haptique', "Vibrations courtes sur mobile")}
      ${sw('sound', 'Sons de repère', "Bips de début, fin et validation")}
      ${sw('tips', 'Conseils détaillés', "Analyse écrite après chaque exercice")}
      <div class="switch"><div class="grow"><b style="font-size:14.5px">Thème clair</b>
        <div class="tiny dim">Par défaut : sombre, plus confortable en soirée</div></div>
        <button class="tg" role="switch" aria-checked="${s.settings.theme === 'light'}" data-act="theme"></button></div>
    </div>

    <div class="sect-h"><h2>Compatibilité de cet appareil</h2></div>
    <div class="card stack g8">
      ${[['Micro', support.mic], ['Transcription de la parole', support.recog],
         ['Synthèse vocale (modèles à écouter)', support.tts], ['Enregistrement pour réécoute', support.rec]]
        .map(([l, ok]) => `<div class="row small"><span class="grow">${l}</span>
          <span class="chip ${ok ? 'ok' : 'bad'}">${ok ? 'disponible' : 'non disponible'}</span></div>`).join('')}
      ${!support.recog ? `<p class="tiny dim">Sans transcription, les exercices de souffle, volume, intonation, rythme et échauffement restent entièrement fonctionnels. Pour la précision des mots et le comptage des tics, utilise Chrome ou Edge (Android ou ordinateur).</p>` : ''}
    </div>

    <div class="sect-h"><h2>Tes données</h2></div>
    <div class="card stack g12">
      <p class="small muted">Tout est stocké <b>sur cet appareil uniquement</b> (localStorage). Aucun compte, aucun serveur, aucun envoi de ta voix. Les enregistrements de réécoute ne sont jamais conservés après la fin d'un exercice.</p>
      <div class="row wrap" style="gap:8px">
        <button class="btn btn-sm btn-ghost" data-act="export">${icon('file')} Exporter (JSON)</button>
        <button class="btn btn-sm btn-ghost" data-act="import">${icon('plus')} Importer</button>
        <button class="btn btn-sm btn-danger" data-act="reset">Tout effacer</button>
      </div>
      <input type="file" id="imp" accept="application/json,.json" hidden>
      <div class="tiny dim">Séances enregistrées : ${s.sessions.length} · créé le ${new Date(s.createdAt).toLocaleDateString('fr-FR')}</div>
    </div>

    <div class="sect-h"><h2>À propos</h2></div>
    <div class="card stack g8">
      <b>Clair — coach d'élocution</b>
      <p class="small muted">Outil hors ligne d'entraînement à l'élocution, à la diction, à la prononciation et à la prise de parole. Construit uniquement sur les API natives du navigateur : aucune dépendance, aucun service payant.</p>
      <p class="tiny dim">Les mesures sont des indicateurs relatifs destinés à suivre une progression, pas un diagnostic. En cas de gêne vocale persistante (enrouement, douleur, extinction de voix), consulte un ORL ou un orthophoniste.</p>
    </div>`;
}

/* ==========================================================================
   Routeur
   ========================================================================== */
const VIEWS = { home: viewHome, train: viewTrain, progress: viewProgress, library: viewLibrary, settings: viewSettings };

function render() {
  renderTop(); renderTabs();
  const v = $('#view');
  v.innerHTML = (VIEWS[route] || viewHome)();
  document.documentElement.dataset.theme = store.get().settings.theme;
}
function go(r) {
  if (route === r) { $('#view').scrollTo?.({ top: 0, behavior: 'smooth' }); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  route = r;
  if (r !== 'library') sub.guide = null;
  location.hash = r === 'home' ? '' : '#' + r;
  render();
  window.scrollTo({ top: 0 });
}

/* ------------------------------ Lancement d'exercices ------------------------------ */
async function startExercise(id) {
  const e = byId(id);
  if (!e) return;
  await ex.run(e, { onDone: () => render(), onQuit: () => render() });
}
async function startSession(sid) {
  let found = null;
  for (const w of PROGRAM) for (const s of w.sessions) if (s.id === sid) found = { w, s };
  if (!found) return;
  await ex.runSequence(found.s.exercises, {
    programSession: sid,
    label: `Semaine ${found.w.n}`,
  });
  render();
  const done = store.get().program.done[sid];
  if (done) toast(`Séance terminée · semaine ${found.w.n} ✓`, 3000);
}

/* ------------------------------ Événements ------------------------------ */
document.addEventListener('click', e => {
  const nav = e.target.closest('[data-nav]');
  if (nav) { go(nav.dataset.nav); return; }
  const sb = e.target.closest('[data-sub]');
  if (sb) {
    const [k, v] = sb.dataset.sub.split(':');
    if (k === 'guide') { sub.guide = v === '0' ? null : v; }
    else if (k === 'week') { sub.week = +v; }
    else if (k === 'train') { sub.train = v; }
    else if (k === 'prog') { sub.prog = v; }
    render(); return;
  }
  const a = e.target.closest('[data-act]');
  if (!a || ex.isOpen()) return;
  const act = a.dataset.act;
  if (act === 'ex') startExercise(a.dataset.id);
  else if (act === 'startsession') startSession(a.dataset.id);
  else if (act === 'onboard-ok') { store.markSeen('onboarded'); render(); }
  else if (act === 'guide') { route = 'library'; sub.guide = a.dataset.id; go('library'); }
  else if (act === 'focus') {
    const map = { articulation: 'ex-drill', debit: 'ex-pace', prosodie: 'ex-pitch', fluidite: 'ex-impro', projection: 'ex-phonation' };
    startExercise(map[a.dataset.skill]);
  }
  else if (act === 'toggle') { store.setSetting(a.dataset.k, !store.get().settings[a.dataset.k]); render(); }
  else if (act === 'theme') {
    store.setSetting('theme', store.get().settings.theme === 'light' ? 'dark' : 'light');
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', store.get().settings.theme === 'light' ? '#f6f7fb' : '#0a0e17');
    render();
  }
  else if (act === 'export') {
    const blob = new Blob([store.exportJSON()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const el = document.createElement('a');
    el.href = url; el.download = `clair-progres-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(el); el.click(); el.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast("Fichier de sauvegarde téléchargé");
  }
  else if (act === 'import') $('#imp')?.click();
  else if (act === 'reset') {
    if (confirm("Effacer définitivement toutes tes séances, scores et badges ?")) { store.resetAll(); toast("Données effacées"); render(); }
  }
});

document.addEventListener('change', e => {
  if (e.target.id === 'imp') {
    const f = e.target.files?.[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try { store.importJSON(rd.result); toast("Progression restaurée"); render(); }
      catch { toast("Fichier illisible ou format inattendu", 3000); }
    };
    rd.readAsText(f);
  }
  if (e.target.id === 'lang') store.setProfile('lang', e.target.value);
});
document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'tw') { $('#twv').textContent = t.value; store.setProfile('targetWpm', +t.value); }
  if (t.id === 'dg') { $('#dgv').textContent = t.value; store.setProfile('dailyGoal', +t.value); }
});
window.addEventListener('hashchange', () => {
  const r = location.hash.slice(1) || 'home';
  if (VIEWS[r] && r !== route) { route = r; render(); }
});

/* ------------------------------ Amorçage ------------------------------ */
(function boot() {
  const r = location.hash.slice(1);
  if (VIEWS[r]) route = r;
  document.documentElement.dataset.theme = store.get().settings.theme;
  render();
  store.subscribe(() => { if (!ex.isOpen()) render(); });

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
  // évite le zoom involontaire au double-tap sur iOS
  let lastTouch = 0;
  document.addEventListener('touchend', e => {
    const now = Date.now();
    if (now - lastTouch < 320) e.preventDefault();
    lastTouch = now;
  }, { passive: false });
})();
