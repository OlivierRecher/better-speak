/* ==========================================================================
   ui.js — helpers DOM, icônes, graphiques SVG, visualiseur canvas
   ========================================================================== */

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/** **gras** → <b> (utilisé par les conseils) */
export const md = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<i>$1</i>');
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ------------------------------ Icônes (traits, 24×24) ------------------------------ */
const P = {
  home:   'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  play:   'M6 4.5v15l13-7.5z',
  chart:  'M4 20V9M10 20V4M16 20v-7M22 20H2',
  book:   'M4 5a2 2 0 0 1 2-2h13v18H6a2 2 0 0 0-2 2zM19 3v18',
  gear:   'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 7 19.4a1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 15a1.7 1.7 0 0 0-1.6-1H1a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 3 9a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 9 3.6V3a2 2 0 1 1 4 0v.1A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.7 1.7 0 0 0 21 9v0',
  mic:    'M12 15a3.5 3.5 0 0 0 3.5-3.5V6a3.5 3.5 0 1 0-7 0v5.5A3.5 3.5 0 0 0 12 15zM5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M8.5 21h7',
  zap:    'M13 2 4.5 13.5H11l-1 8.5L19.5 10H13z',
  flame:  'M12 22c4 0 6.5-2.6 6.5-6 0-4.5-4-6.5-4-10.5 0 0-3 1.5-3 5 0 1.5-1 2-1.8 1.2C8.5 10.4 8.5 8.5 8.5 8.5 6.6 10 5.5 12.4 5.5 15c0 3.4 2.5 7 6.5 7z',
  heart:  'M12 20.3 4.7 13a4.6 4.6 0 0 1 6.5-6.5l.8.8.8-.8A4.6 4.6 0 0 1 19.3 13z',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zM12 13.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
  gauge:  'M12 21a9 9 0 1 1 9-9M12 12l5-4',
  music:  'M9 18V6l11-2v12M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  wave:   'M2 12c2 0 2-6 4-6s2 12 4 12 2-12 4-12 2 6 4 6 2-3 4-3',
  lungs:  'M12 3v10M12 13c0-3-2-4-3.5-4S5 10.5 5 14v4a2 2 0 0 0 2 2h1.5a2 2 0 0 0 2-2zM12 13c0-3 2-4 3.5-4S19 10.5 19 14v4a2 2 0 0 1-2 2h-1.5a2 2 0 0 1-2-2z',
  dice:   'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM8.5 8.5h.01M15.5 8.5h.01M12 12h.01M8.5 15.5h.01M15.5 15.5h.01',
  clock:  'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3.5 2',
  file:   'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h4',
  grid:   'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  scissors:'M6 6.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM6 22.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM8 8l12 12M20 4 8 16',
  back:   'M15 5l-7 7 7 7',
  close:  'M6 6l12 12M18 6 6 18',
  chevron:'M9 5l7 7-7 7',
  check:  'M4 12.5 9 18 20 6.5',
  lock:   'M6 11h12v10H6zM9 11V7.5a3 3 0 0 1 6 0V11',
  bulb:   'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3z',
  sound:  'M4 9h3l5-4v14l-5-4H4zM16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12',
  refresh:'M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5',
  trophy: 'M8 4h8v5a4 4 0 0 1-8 0zM8 6H5.5A2.5 2.5 0 0 0 8 10.5M16 6h2.5A2.5 2.5 0 0 1 16 10.5M12 13v4M8.5 21h7l-.5-3h-6z',
  plus:   'M12 5v14M5 12h14',
  info:   'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v6M12 7.5h.01',
  pause:  'M8 4v16M16 4v16',
  stop:   'M6 6h12v12H6z',
};
export function icon(name, cls = '') {
  const d = P[name] || P.info;
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="${cls}" aria-hidden="true">${
    d.split('M').filter(Boolean).map(s => `<path d="M${s}"/>`).join('')}</svg>`;
}

/* ------------------------------ Anneau de score ------------------------------ */
export function ring(pct, { size = 78, label = '', sub = '', stroke = 7 } = {}) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const off = c * (1 - clamp(pct, 0, 1));
  const gid = 'rg' + Math.random().toString(36).slice(2, 7);
  return `<div class="ring-wrap" style="width:${size}px;height:${size}px">
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#7c5cff"/><stop offset="1" stop-color="#22d3ee"/></linearGradient></defs>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--surface-2)" stroke-width="${stroke}"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="url(#${gid})" stroke-width="${stroke}"
        stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${off}"
        transform="rotate(-90 ${size / 2} ${size / 2})" style="transition:stroke-dashoffset .8s cubic-bezier(.22,1,.36,1)"/>
    </svg>
    <div class="val">${esc(label)}${sub ? `<small>${esc(sub)}</small>` : ''}</div></div>`;
}

/* ------------------------------ Radar des compétences ------------------------------ */
export function radar(values, labels, { size = 300 } = {}) {
  const cx = size / 2, cy = size / 2 + 4, R = size * 0.33, n = values.length;
  const pt = (i, r) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  };
  const grid = [0.25, 0.5, 0.75, 1].map(k =>
    `<polygon points="${Array.from({ length: n }, (_, i) => pt(i, R * k).map(v => v.toFixed(1)).join(',')).join(' ')}"
      fill="none" stroke="var(--line)" stroke-width="1"/>`).join('');
  const spokes = Array.from({ length: n }, (_, i) =>
    `<line x1="${cx}" y1="${cy}" x2="${pt(i, R)[0].toFixed(1)}" y2="${pt(i, R)[1].toFixed(1)}" stroke="var(--line)"/>`).join('');
  const poly = Array.from({ length: n }, (_, i) => pt(i, R * clamp(values[i] / 100, 0.04, 1)).map(v => v.toFixed(1)).join(',')).join(' ');
  const dots = Array.from({ length: n }, (_, i) => {
    const [x, y] = pt(i, R * clamp(values[i] / 100, 0.04, 1));
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.4" fill="#22d3ee"/>`;
  }).join('');
  const txt = labels.map((l, i) => {
    const [x, y] = pt(i, R + 24);
    const anchor = x < cx - 6 ? 'end' : x > cx + 6 ? 'start' : 'middle';
    return `<text x="${x.toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="${anchor}" font-size="11.5" font-weight="600" fill="var(--txt-2)">${esc(l)}</text>
            <text x="${x.toFixed(1)}" y="${(y + 17).toFixed(1)}" text-anchor="${anchor}" font-size="11" font-weight="700" fill="var(--txt)">${Math.round(values[i])}</text>`;
  }).join('');
  const pad = 46;   // marge latérale : sans elle les libellés gauche et droite sont rognés
  return `<svg class="radar" viewBox="${-pad} 0 ${size + pad * 2} ${size + 26}" role="img" aria-label="Profil de compétences">
    <defs><linearGradient id="rdg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#7c5cff" stop-opacity=".55"/><stop offset="1" stop-color="#22d3ee" stop-opacity=".35"/></linearGradient></defs>
    ${grid}${spokes}
    <polygon points="${poly}" fill="url(#rdg)" stroke="#22d3ee" stroke-width="2"/>
    ${dots}${txt}</svg>`;
}

/* ------------------------------ Courbe (historique) ------------------------------ */
export function spark(values, { w = 320, h = 56, fill = true } = {}) {
  if (!values.length) return `<div class="dim tiny center" style="padding:14px">Pas encore de données</div>`;
  const vals = values.length === 1 ? [values[0], values[0]] : values;
  const min = Math.min(...vals, 0), max = Math.max(...vals, 100);
  const x = i => (i / (vals.length - 1)) * w;
  const y = v => h - ((v - min) / (max - min || 1)) * h;
  const d = vals.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="Évolution des scores">
    <defs><linearGradient id="spg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#7c5cff" stop-opacity=".45"/><stop offset="1" stop-color="#7c5cff" stop-opacity="0"/></linearGradient></defs>
    ${fill ? `<path d="${d} L${w} ${h} L0 ${h} Z" fill="url(#spg)"/>` : ''}
    <path d="${d}" fill="none" stroke="#22d3ee" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
    <circle cx="${x(vals.length - 1).toFixed(1)}" cy="${y(vals[vals.length - 1]).toFixed(1)}" r="3.2" fill="#22d3ee"/></svg>`;
}

/* ------------------------------ Visualiseur canvas ------------------------------ */
export class Viz {
  constructor(canvas) {
    this.c = canvas; this.ctx = canvas.getContext('2d');
    this.trail = [];
    this.resize();
  }
  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const r = this.c.getBoundingClientRect();
    this.w = Math.max(80, r.width); this.h = Math.max(80, r.height);
    this.c.width = this.w * dpr; this.c.height = this.h * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  /** mode 'ring' : anneau réactif au volume + barres de spectre
      mode 'pitch': courbe de hauteur défilante
      mode 'band' : anneau + zone cible verte                                  */
  draw({ mode = 'ring', level = 0, bars = [], pitch = 0, band = null, progress = 0, hot = false }) {
    const { ctx, w, h } = this;
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.36;

    if (mode === 'pitch') {
      this.trail.push(pitch || 0);
      if (this.trail.length > 160) this.trail.shift();
      // grille
      ctx.strokeStyle = 'rgba(255,255,255,.06)'; ctx.lineWidth = 1;
      for (let i = 1; i < 5; i++) {
        ctx.beginPath(); ctx.moveTo(0, (h / 5) * i); ctx.lineTo(w, (h / 5) * i); ctx.stroke();
      }
      const voiced = this.trail.filter(Boolean);
      const lo = voiced.length ? Math.min(...voiced) * 0.85 : 80;
      const hi = voiced.length ? Math.max(...voiced) * 1.15 : 300;
      const g = ctx.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0, '#7c5cff'); g.addColorStop(1, '#22d3ee');
      ctx.strokeStyle = g; ctx.lineWidth = 2.6; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      ctx.beginPath();
      let started = false;
      this.trail.forEach((p, i) => {
        const x = (i / 159) * w;
        if (!p) { started = false; return; }
        const y = h - ((p - lo) / (hi - lo || 1)) * h * 0.86 - h * 0.07;
        if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
      });
      ctx.stroke();
      return;
    }

    // barres de spectre en couronne
    if (bars.length) {
      ctx.lineCap = 'round';
      bars.forEach((v, i) => {
        const a = -Math.PI / 2 + (i / bars.length) * Math.PI * 2;
        const r1 = R * 1.16, r2 = r1 + 4 + v * R * 0.5;
        ctx.strokeStyle = `rgba(124,92,255,${0.25 + v * 0.6})`;
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
        ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
        ctx.stroke();
      });
    }
    // halo de volume
    const rad = R * (0.62 + level * 0.5);
    const gr = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(1, rad));
    gr.addColorStop(0, `rgba(34,211,238,${0.12 + level * 0.3})`);
    gr.addColorStop(1, 'rgba(34,211,238,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(cx, cy, rad, 0, 7); ctx.fill();

    // zone cible (mode band)
    if (band) {
      ctx.strokeStyle = 'rgba(52,211,153,.30)'; ctx.lineWidth = R * (band[1] - band[0]);
      ctx.beginPath(); ctx.arc(cx, cy, R * (band[0] + (band[1] - band[0]) / 2), 0, 7); ctx.stroke();
    }
    // piste
    ctx.strokeStyle = 'rgba(255,255,255,.09)'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.stroke();
    // progression
    if (progress > 0) {
      const g2 = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
      g2.addColorStop(0, '#7c5cff'); g2.addColorStop(1, '#22d3ee');
      ctx.strokeStyle = g2; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(progress, 0, 1)); ctx.stroke();
    }
    // aiguille de niveau
    ctx.strokeStyle = hot ? '#34d399' : '#eef2ff';
    ctx.lineWidth = 3; ctx.beginPath();
    ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(level, 0, 1));
    ctx.stroke();
  }
}

/* ------------------------------ Toasts ------------------------------ */
export function toast(msg, ms = 2200) {
  const box = document.getElementById('toasts');
  const el = document.createElement('div');
  el.className = 'toast'; el.innerHTML = md(msg);
  box.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateY(8px)'; el.style.transition = 'all .3s'; }, ms);
  setTimeout(() => el.remove(), ms + 340);
}

/* ------------------------------ Composants réutilisables ------------------------------ */
export const metric = (k, v, unit = '', hint = '', grade = '') =>
  `<div class="metric ${grade}"><div class="k">${esc(k)}</div>
   <div class="v">${esc(v)}${unit ? `<small>${esc(unit)}</small>` : ''}</div>
   ${hint ? `<div class="h">${md(hint)}</div>` : ''}</div>`;

export const tileHtml = ({ ico = 'play', t, s, right = '', cls = '', attrs = '' }) =>
  `<button class="tile ${cls}" ${attrs}>
     <span class="ico">${icon(ico)}</span>
     <span class="grow"><span class="t">${esc(t)}</span><span class="s">${esc(s)}</span></span>
     <span class="go">${right || icon('chevron')}</span></button>`;

export function fmtDate(ts) {
  const d = new Date(ts), n = new Date();
  const sameDay = d.toDateString() === n.toDateString();
  const y = new Date(n); y.setDate(y.getDate() - 1);
  if (sameDay) return `Aujourd'hui ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (d.toDateString() === y.toDateString()) return `Hier ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) + ' ' +
         d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
