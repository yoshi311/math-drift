// 画面共通パーツ
import { state } from './state.js';
import { fmtNum, esc } from './util.js';
import { CHARS } from '../data/story/index.js';
import { charaSVG, meLook } from './components/chara.js';

export function topbar(title, { back = '#/home', right = '' } = {}) {
  return `<div class="topbar">
    ${back ? `<a class="btn btn-ghost icon-btn" href="${back}" aria-label="戻る">‹</a>` : ''}
    <div class="title">${title}</div>
    ${right}
    <div class="gp-badge"><span class="coin">GP</span><span class="gp-val">${fmtNum(state.gp)}</span></div>
  </div>`;
}

export function stars(n, max = 3) {
  let s = '';
  for (let i = 0; i < max; i++) s += `<span class="${i < n ? 'on' : ''}">★</span>`;
  return `<span class="stars">${s}</span>`;
}

export function name() { return esc(state.profile.name || 'キミ'); }

// GP表示の自動更新
window.addEventListener('gp-change', () => {
  document.querySelectorAll('.gp-val').forEach(el => el.textContent = fmtNum(state.gp));
});

// 背景（ストーリー/ホーム用）SVG
export function sceneBg(kind = 'pass-night') {
  const sky = {
    'pass-night': ['#060a1a', '#1a1040'], 'pass-rain': ['#0b1218', '#1c2a33'], summit: ['#0a0614', '#3a0f2e'],
    garage: ['#0c0d10', '#1c1a16'], warehouse: ['#07090c', '#1a1f1a'], city: ['#05060d', '#141a3a'],
  }[kind] || ['#060a1a', '#1a1040'];
  let extra = '';
  if (kind === 'garage') {
    extra = `<rect x="0" y="0" width="1200" height="700" fill="url(#gfloor)"/>
      ${[0, 1, 2, 3, 4, 5].map(i => `<rect x="${60 + i * 190}" y="60" width="150" height="10" fill="#fff" opacity=".85" filter="url(#bl)"/>`).join('')}
      <rect x="0" y="470" width="1200" height="230" fill="#14161b"/>
      ${[0, 1, 2, 3, 4, 5, 6, 7].map(i => `<line x1="${i * 160}" y1="470" x2="${i * 160 - 80}" y2="700" stroke="#1f232b" stroke-width="3"/>`).join('')}
      <rect x="40" y="200" width="220" height="200" fill="#1a1d24" stroke="#2a2f3a"/>${[0, 1, 2, 3].map(i => `<rect x="55" y="${215 + i * 46}" width="190" height="34" fill="#232833"/>`).join('')}
      <text x="960" y="200" font-family="Orbitron" font-weight="900" font-size="46" fill="#ffd400" opacity=".15" text-anchor="middle">TAKAMIYA</text>
      <text x="960" y="245" font-family="Orbitron" font-weight="800" font-size="26" fill="#ffd400" opacity=".15" text-anchor="middle" letter-spacing="10">FACTORY</text>`;
  } else if (kind === 'warehouse') {
    extra = [0, 1, 2, 3].map(i => `<path d="M${i * 320 - 40},470 v-200 l140,-60 l140,60 v200z" fill="#101410" stroke="#1f2a1f"/><rect x="${i * 320 + 40}" y="340" width="120" height="130" fill="#0a0d0a" stroke="#2a3a2a"/>`).join('') +
      `<rect x="0" y="470" width="1200" height="230" fill="#0d0f0d"/>` + [0, 1, 2, 3, 4].map(i => `<circle cx="${120 + i * 250}" cy="250" r="5" fill="#ffd27a"/><circle cx="${120 + i * 250}" cy="250" r="40" fill="#ffd27a" opacity=".08"/>`).join('');
  } else {
    const rain = kind === 'pass-rain' ? Array.from({ length: 70 }, (_, i) => `<line x1="${(i * 97) % 1200}" y1="${(i * 53) % 700}" x2="${(i * 97) % 1200 - 10}" y2="${(i * 53) % 700 + 30}" stroke="#8fb3c9" stroke-opacity=".3"/>`).join('') : '';
    const starsS = kind !== 'pass-rain' ? Array.from({ length: 60 }, (_, i) => `<circle cx="${(i * 131) % 1200}" cy="${(i * 71) % 300}" r="${i % 3 ? 1 : 1.6}" fill="#fff" opacity="${.3 + (i % 5) / 10}"/>`).join('') : '';
    extra = `${starsS}
      <path d="M0,380 L160,240 L300,330 L470,170 L640,320 L800,210 L1000,340 L1200,250 L1200,700 L0,700Z" fill="#0b0f1e" opacity=".95"/>
      <path d="M0,450 L200,330 L380,420 L560,300 L760,430 L940,330 L1200,420 L1200,700 L0,700Z" fill="#070a14"/>
      <path d="M-50,700 C300,560 520,600 640,520 S1000,470 1250,500" fill="none" stroke="#1c2238" stroke-width="70"/>
      <path d="M-50,700 C300,560 520,600 640,520 S1000,470 1250,500" fill="none" stroke="#ffd400" stroke-width="3" stroke-dasharray="30 30" opacity=".5"/>
      <path d="M-50,700 C300,560 520,600 640,520 S1000,470 1250,500" fill="none" stroke="#00e5ff" stroke-width="2" opacity=".35" filter="url(#bl)"/>
      ${kind === 'summit' ? '<circle cx="980" cy="130" r="60" fill="#ffe7c2" opacity=".85"/><circle cx="980" cy="130" r="110" fill="#ffe7c2" opacity=".08"/>' : '<circle cx="1000" cy="110" r="38" fill="#e8f1ff" opacity=".8"/>'}
      ${rain}`;
  }
  return `<svg class="scene-bg" viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient>
    <linearGradient id="gfloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#16181d"/><stop offset="1" stop-color="#0c0d10"/></linearGradient>
    <filter id="bl"><feGaussianBlur stdDeviation="4"/></filter></defs>
    <rect width="1200" height="700" fill="url(#sky)"/>${extra}</svg>`;
}

// キャラクターの立ち絵
// チームは右向き、ライバルは左向き（VS画面やストーリーで向かい合う）
const TEAM_SIDE = new Set(['me', 'kaito', 'gen', 'mio', 'jii']);
export function chara(key, expr = 'normal', dir) {
  const c = CHARS[key];
  if (!c || !c.look) return '';
  return charaSVG(c.look === 'me' ? meLook(state.profile) : c.look, expr, dir ?? (TEAM_SIDE.has(key) ? 1 : -1));
}

// タコメーター風のリングゲージ
export function gauge(pct, big, small = '', color = 'var(--cyan)') {
  const r = 52, len = Math.PI * 2 * r * 0.75, p = Math.max(0, Math.min(1, pct));
  const ticks = Array.from({ length: 13 }, (_, i) => {
    const a = (135 + i * 22.5) * Math.PI / 180, r1 = 62, r2 = i % 3 ? 58 : 54;
    return `<line x1="${70 + Math.cos(a) * r1}" y1="${70 + Math.sin(a) * r1}" x2="${70 + Math.cos(a) * r2}" y2="${70 + Math.sin(a) * r2}" stroke="${i >= 10 ? '#ff2d55' : '#5b6684'}" stroke-width="2"/>`;
  }).join('');
  return `<svg class="gauge" viewBox="0 0 140 140" aria-hidden="true">${ticks}
    <circle cx="70" cy="70" r="${r}" fill="none" stroke="#1c2233" stroke-width="9" stroke-dasharray="${len} 999" transform="rotate(135 70 70)" stroke-linecap="round"/>
    <circle cx="70" cy="70" r="${r}" fill="none" stroke="${color}" stroke-width="9" stroke-dasharray="${len * p} 999" transform="rotate(135 70 70)" stroke-linecap="round" class="gauge-arc"/>
    <text x="70" y="76" text-anchor="middle" class="gauge-big">${big}</text>
    <text x="70" y="98" text-anchor="middle" class="gauge-small">${small}</text></svg>`;
}
