// SVGで車を横から描画（カスタム内容を反映）
import { carById } from '../../data/cars.js';

const G = 176; // 地面のy座標
let uidSeq = 0;

export function defaultConfig(car) {
  return {
    color: car.color, color2: car.color2 || '#111111', tone: !!car.tone,
    wheel: car.year < 1990 ? 'steel' : 'mesh', wcolor: '#c9ced6', inch: car.year < 1985 ? 14 : 15,
    height: 0, lip: 0, skirt: 0, wing: 0, bonnet: false, livery: 'none', tint: 0, neon: null, number: 86,
  };
}
export function getConfig(state, carId) {
  const car = carById(carId);
  return { ...defaultConfig(car), ...(state.garage.cars[carId] || {}) };
}

function lum(hex) {
  const h = hex.replace('#', ''); const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}
function shade(hex, amt) {
  const h = hex.replace('#', ''); const n = parseInt(h, 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = v => Math.max(0, Math.min(255, Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)));
  return '#' + [f(r), f(g), f(b)].map(v => v.toString(16).padStart(2, '0')).join('');
}

// 角丸ポリゴン（pts: [x,y,r]）
function roundPath(pts) {
  const n = pts.length; let d = '';
  for (let i = 0; i < n; i++) {
    const [x, y, r] = pts[i], p = pts[(i - 1 + n) % n], q = pts[(i + 1) % n];
    const d1 = Math.hypot(x - p[0], y - p[1]), d2 = Math.hypot(q[0] - x, q[1] - y);
    const rr = Math.min(r || 0, d1 / 2, d2 / 2);
    const ax = x + (p[0] - x) * rr / d1, ay = y + (p[1] - y) * rr / d1;
    const bx = x + (q[0] - x) * rr / d2, by = y + (q[1] - y) * rr / d2;
    d += (i === 0 ? 'M' : 'L') + ax.toFixed(1) + ',' + ay.toFixed(1) + ' Q' + x.toFixed(1) + ',' + y.toFixed(1) + ' ' + bx.toFixed(1) + ',' + by.toFixed(1) + ' ';
  }
  return d + 'Z';
}
const onLine = (a, b, y) => { const t = (y - a[1]) / (b[1] - a[1]); return a[0] + (b[0] - a[0]) * t; };

function wheel(cx, cy, R, inch, design, color, uid) {
  const rr = R * (0.56 + (inch - 14) * 0.035);
  let inner = '';
  const dark = '#2a2d33';
  if (design === 'steel') {
    inner = `<circle r="${rr}" fill="#4a4e55"/><circle r="${rr * .8}" fill="#3b3f45"/>` +
      [0, 1, 2, 3].map(i => { const a = i * Math.PI / 2 + .6; return `<circle cx="${(Math.cos(a) * rr * .55).toFixed(1)}" cy="${(Math.sin(a) * rr * .55).toFixed(1)}" r="${rr * .12}" fill="#15171a"/>`; }).join('') +
      `<circle r="${rr * .32}" fill="#8a9099"/>`;
  } else if (design === 'mesh') {
    let l = '';
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; l += `<line x1="0" y1="0" x2="${(Math.cos(a) * rr).toFixed(1)}" y2="${(Math.sin(a) * rr).toFixed(1)}"/>`; }
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6 + Math.PI / 12; l += `<line x1="${(Math.cos(a) * rr * .35).toFixed(1)}" y1="${(Math.sin(a) * rr * .35).toFixed(1)}" x2="${(Math.cos(a + .5) * rr).toFixed(1)}" y2="${(Math.sin(a + .5) * rr).toFixed(1)}"/><line x1="${(Math.cos(a) * rr * .35).toFixed(1)}" y1="${(Math.sin(a) * rr * .35).toFixed(1)}" x2="${(Math.cos(a - .5) * rr).toFixed(1)}" y2="${(Math.sin(a - .5) * rr).toFixed(1)}"/>`; }
    inner = `<circle r="${rr}" fill="${dark}"/><g stroke="${color}" stroke-width="1.6">${l}</g><circle r="${rr}" fill="none" stroke="${color}" stroke-width="2.5"/><circle r="${rr * .3}" fill="${color}"/>`;
  } else if (design === '5spoke' || design === '6spoke') {
    const n = design === '5spoke' ? 5 : 6, w = design === '5spoke' ? .28 : .17;
    let s = '';
    for (let i = 0; i < n; i++) {
      const a = i * 2 * Math.PI / n - Math.PI / 2, b1 = a - w, b2 = a + w;
      s += `<path d="M${(Math.cos(a - w * 1.6) * rr * .25).toFixed(1)},${(Math.sin(a - w * 1.6) * rr * .25).toFixed(1)} L${(Math.cos(b1) * rr * .96).toFixed(1)},${(Math.sin(b1) * rr * .96).toFixed(1)} L${(Math.cos(b2) * rr * .96).toFixed(1)},${(Math.sin(b2) * rr * .96).toFixed(1)} L${(Math.cos(a + w * 1.6) * rr * .25).toFixed(1)},${(Math.sin(a + w * 1.6) * rr * .25).toFixed(1)}Z"/>`;
    }
    inner = `<circle r="${rr}" fill="${dark}"/><g fill="${color}">${s}</g><circle r="${rr}" fill="none" stroke="${color}" stroke-width="2.5"/><circle r="${rr * .3}" fill="${color}"/>`;
  } else if (design === 'deep') {
    let s = '';
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; s += `<line x1="0" y1="0" x2="${(Math.cos(a) * rr * .7).toFixed(1)}" y2="${(Math.sin(a) * rr * .7).toFixed(1)}"/>`; }
    inner = `<circle r="${rr}" fill="${color}"/><circle r="${rr * .72}" fill="${dark}"/><g stroke="${shade(color, -.2)}" stroke-width="3">${s}</g><circle r="${rr * .25}" fill="${color}"/>`;
  } else {
    inner = `<circle r="${rr}" fill="${color}"/><circle r="${rr * .82}" fill="none" stroke="${shade(color, -.25)}" stroke-width="1.5"/><circle r="${rr * .5}" fill="none" stroke="${shade(color, .3)}" stroke-width="1"/><circle r="${rr * .22}" fill="${shade(color, -.3)}"/>`;
  }
  return `<g transform="translate(${cx.toFixed(1)},${cy.toFixed(1)})"><circle r="${R}" fill="#0d0e10"/><circle r="${R - 2}" fill="none" stroke="#24262b" stroke-width="2"/><g class="wheel-rot">${inner}</g></g>`;
}

export function carSVG(carId, cfg, opts = {}) {
  const car = carById(carId);
  const s = car.shape, uid = 'c' + (++uidSeq);
  cfg = { ...defaultConfig(car), ...(cfg || {}) };
  const L = s.L, x0 = (440 - L) / 2 + (opts.offsetX || 0);
  const X = f => x0 + f * L;
  const dy = -cfg.height * 2.3;
  const yb = G - 19 + dy;
  const Y = y => y + dy;
  const rr = s.sharp ? .5 : s.round ? 1.6 : 1;
  const R = 21.5 + (cfg.inch - 14) * 0.95;
  const rwx = X(s.rw), fwx = X(s.fw), wcy = G - R;
  const archY = G - 23 + dy, archR = 26.5;

  // ボディ形状
  let pts;
  const deckY = Y(s.deckY), roofY = Y(s.roofY), hoodY = Y(s.hoodY), noseY = Y(s.noseY);
  if (s.open) {
    pts = [[X(.006), yb - 2, 6], [X(0), deckY + 12, 14 * rr], [X(.03), deckY, 8], [X(s.ws - .02), deckY + 2, 4], [X(s.ws), hoodY, 4],
      [X(.97), noseY, 16 * rr], [X(1), noseY + 9, 7], [X(.994), yb - 2, 6]];
  } else {
    pts = [[X(.006), yb - 2, 6], [X(0), deckY + 11, 12 * rr], [X(.03), deckY, 8 * rr], [X(s.rws), deckY, 6], [X(s.roofR), roofY, 16 * rr],
      [X(s.roofF), roofY, 12 * rr], [X(s.ws), hoodY, 8], [X(.97), noseY, 14 * rr], [X(1), noseY + 9, 6 * rr], [X(.994), yb - 2, 6]];
  }
  const body = roundPath(pts);
  const col = cfg.color || car.color;
  const contrast = lum(col) > .55 ? '#111' : '#fff';

  // 窓
  let windows = '', pillar = '';
  const tintFill = ['url(#' + uid + 'glass)', '#2f3a45', '#0e1115'][cfg.tint || 0];
  if (s.open) {
    const ft = [X(s.roofF), roofY], fb = [X(s.ws) - 2, hoodY];
    windows = `<path d="M${fb[0]},${fb[1]} L${ft[0]},${ft[1]} L${ft[0] - 8},${ft[1] + 2} L${fb[0] - 8},${fb[1] - 2}Z" fill="${tintFill}" stroke="#1a1a1a" stroke-width="2.5"/>
      <path d="M${X(.30)},${deckY + 1} q4,-20 16,-20 q8,0 10,20Z" fill="#1a1b1f"/>`;
  } else {
    const yw = Math.min(deckY, hoodY) - 1;
    const rearA = [X(s.rws), deckY], rearB = [X(s.roofR), roofY], wsA = [X(s.ws), hoodY], wsB = [X(s.roofF), roofY];
    const rb = [onLine(rearA, rearB, yw) + 9, yw], rt = [X(s.roofR) + 7, roofY + 5], ft = [X(s.roofF) - 2, roofY + 5], fb = [onLine(wsA, wsB, yw) - 9, yw];
    windows = `<path d="${roundPath([[...rb, 3], [...rt, 8], [...ft, 6], [...fb, 3]])}" fill="${tintFill}" stroke="#0b0b0d" stroke-width="1.5"/>`;
    const px = rb[0] + (fb[0] - rb[0]) * (s.rws < .1 ? .36 : .42);
    pillar = `<line x1="${px}" y1="${roofY + 4}" x2="${px - 3}" y2="${yw + 1}" stroke="${s.rws < .1 ? '#0b0b0d' : col}" stroke-width="6"/>
      <line x1="${px - 3}" y1="${yw}" x2="${px - 4}" y2="${yb - 9}" stroke="rgba(0,0,0,.45)" stroke-width="1.2"/>
      <line x1="${fwx - R - 10}" y1="${hoodY + 2}" x2="${fwx - R - 8}" y2="${yb - 9}" stroke="rgba(0,0,0,.45)" stroke-width="1.2"/>
      <rect x="${px + 6}" y="${yw + 8}" width="12" height="3" rx="1.5" fill="rgba(0,0,0,.5)"/>`;
  }

  // ライト
  let lights = '';
  if (s.popup) lights += `<path d="M${X(.9)},${noseY - 1} L${X(.965)},${noseY + .5}" stroke="rgba(0,0,0,.6)" stroke-width="1.5"/><rect x="${X(.975)}" y="${noseY + 9}" width="7" height="4" rx="1" fill="#ffb347"/>`;
  else if (s.roundLight) lights += `<circle cx="${X(.985)}" cy="${noseY + 7}" r="5.5" fill="#fff6c8" stroke="#888" stroke-width="1.2"/>`;
  else lights += `<path d="M${X(.945)},${noseY + 1} L${X(.992)},${noseY + 4} L${X(.997)},${noseY + 10} L${X(.95)},${noseY + 8}Z" fill="#e9f3ff" stroke="#555" stroke-width="1"/>`;
  lights += `<rect x="${X(0) - .5}" y="${deckY + 3}" width="7" height="10" rx="2" fill="#e0142c"/><rect x="${X(0) - .5}" y="${deckY + 3}" width="7" height="3" rx="1" fill="#ff6b7d"/>`;

  // ツートン
  const ySplit = yb - (yb - hoodY) * .48;
  const tone = cfg.tone ? `<rect x="0" y="${ySplit}" width="440" height="${G}" fill="${cfg.color2}" clip-path="url(#${uid}body)"/><line x1="${X(0)}" y1="${ySplit}" x2="${X(1)}" y2="${ySplit}" stroke="rgba(0,0,0,.5)" stroke-width="1" clip-path="url(#${uid}body)"/>` : '';

  // ステッカー
  let livery = '';
  const midX = (rwx + fwx) / 2, doorY = (Math.min(deckY, hoodY) + yb) / 2 + 2;
  if (cfg.livery === 'stripe') livery = `<g clip-path="url(#${uid}body)"><rect x="0" y="${hoodY + 6}" width="440" height="4" fill="${contrast}"/><rect x="0" y="${hoodY + 12}" width="440" height="2" fill="${contrast}"/></g>`;
  else if (cfg.livery === 'number') livery = `<circle cx="${midX}" cy="${doorY}" r="13" fill="#fff" stroke="#111" stroke-width="2"/><text x="${midX}" y="${doorY + 5.5}" text-anchor="middle" font-family="Orbitron,sans-serif" font-weight="900" font-size="15" fill="#111">${cfg.number ?? 86}</text>`;
  else if (cfg.livery === 'ghost') livery = `<text x="${midX + 4}" y="${doorY + 4}" text-anchor="middle" font-family="Orbitron,sans-serif" font-style="italic" font-weight="900" font-size="13" fill="${contrast}" stroke="#00e5ff" stroke-width=".8" transform="skewX(-12)" transform-origin="${midX} ${doorY}">GHOST LINE</text>`;
  else if (cfg.livery === 'fire') livery = `<path clip-path="url(#${uid}body)" d="M${X(1)},${hoodY + 2} L${X(.6)},${hoodY + 2} q-14,6 -6,10 q-22,-4 -30,6 q16,2 8,8 q-24,-6 -38,4 q30,4 34,14 L${X(1)},${yb}Z" fill="url(#${uid}fire)" opacity=".95"/>`;
  else if (cfg.livery === 'shop') livery = `<text x="${midX - 6}" y="${doorY - 2}" text-anchor="middle" font-family="Orbitron,sans-serif" font-weight="800" font-size="9" fill="${contrast}">TAKAMIYA</text><text x="${midX - 6}" y="${doorY + 9}" text-anchor="middle" font-family="Orbitron,sans-serif" font-weight="800" font-size="7" fill="${contrast}" letter-spacing="1.5">FACTORY</text>`;

  // エアロ
  let aero = '';
  if (cfg.lip) {
    const h = 2 + cfg.lip * 2;
    aero += `<path d="M${X(.82)},${yb - 2} L${X(1) + cfg.lip * 2},${yb - 2} L${X(1) + cfg.lip * 1.5},${yb + h - 2} L${X(.84)},${yb + h - 3}Z" fill="#141518"/>`;
    if (cfg.lip >= 3) aero += `<path d="M${X(.985)},${noseY + 14} l12,-3 l-3,6Z" fill="#141518"/>`;
  }
  if (cfg.skirt) aero += `<rect x="${rwx + R + 2}" y="${yb - 3}" width="${fwx - rwx - 2 * R - 4}" height="${3 + cfg.skirt * 2.5}" rx="2" fill="${shade(cfg.tone ? cfg.color2 : col, -.35)}"/>`;
  if (cfg.bonnet && !s.open) {
    aero += `<path d="M${X(s.ws) + 3},${hoodY + .5} L${X(.96)},${noseY + .5} L${X(.955)},${noseY + 5} L${X(s.ws) + 4},${hoodY + 4.5}Z" fill="url(#${uid}carbon)"/>`;
  } else if (cfg.bonnet) {
    aero += `<path d="M${X(s.ws) + 3},${hoodY + .5} L${X(.96)},${noseY + .5} L${X(.955)},${noseY + 5} L${X(s.ws) + 4},${hoodY + 4.5}Z" fill="url(#${uid}carbon)"/>`;
  }
  if (cfg.wing) {
    const hatch = s.rws < .12 && !s.open;
    let ax = X(.07), ay = deckY;
    if (hatch && cfg.wing === 1) { ax = X(s.roofR) + 2; ay = roofY + 2; }
    else if (hatch) { const k = .2; ax = X(s.rws) + (X(s.roofR) - X(s.rws)) * k + 6; ay = deckY + (roofY - deckY) * k; }
    if (cfg.wing === 1) aero += hatch ? `<path d="M${ax - 22},${ay + 1} L${ax + 4},${ay - 1} L${ax + 2},${ay + 4}Z" fill="${shade(col, -.2)}"/>` : `<path d="M${X(.004)},${deckY + 1} L${X(0) - 2},${deckY - 6} L${X(.09)},${deckY}Z" fill="${shade(col, -.15)}"/>`;
    else if (cfg.wing === 2) aero += `<rect x="${ax - 2}" y="${ay - 9}" width="3" height="9" fill="#222"/><rect x="${ax - 28}" y="${ay - 13}" width="42" height="5" rx="2" fill="${shade(col, -.1)}" stroke="#111" stroke-width="1"/>`;
    else aero += `<rect x="${ax - 4}" y="${ay - 24}" width="3" height="24" fill="#222"/><rect x="${ax + 8}" y="${ay - 24}" width="3" height="24" fill="#1a1a1a"/><path d="M${ax - 40},${ay - 30} L${ax + 20},${ay - 30} L${ax + 18},${ay - 23} L${ax - 38},${ay - 25}Z" fill="#141518"/><rect x="${ax - 42}" y="${ay - 36}" width="5" height="16" rx="1" fill="#141518"/>`;
  }

  const neon = cfg.neon ? `<ellipse cx="220" cy="${G - 2}" rx="${L * .44}" ry="7" fill="${cfg.neon}" filter="url(#${uid}blur)" opacity=".95"/>` : '';

  return `<svg class="car-svg" viewBox="0 0 440 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${car.name}">
  <defs>
    <clipPath id="${uid}body"><path d="${body}"/></clipPath>
    <mask id="${uid}arch" maskUnits="userSpaceOnUse" x="0" y="0" width="440" height="200"><rect width="440" height="200" fill="#fff"/><circle cx="${rwx}" cy="${archY}" r="${archR}" fill="#000"/><circle cx="${fwx}" cy="${archY}" r="${archR}" fill="#000"/></mask>
    <linearGradient id="${uid}shine" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".35" stop-color="#fff" stop-opacity=".05"/><stop offset=".7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></linearGradient>
    <linearGradient id="${uid}glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9fc3dc"/><stop offset=".5" stop-color="#4d6b82"/><stop offset="1" stop-color="#2b3e4d"/></linearGradient>
    <linearGradient id="${uid}fire" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#ffd400"/><stop offset=".5" stop-color="#ff7a00"/><stop offset="1" stop-color="#ff2d55"/></linearGradient>
    <pattern id="${uid}carbon" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="#1b1c1f"/><rect width="2" height="2" fill="#2c2e33"/><rect x="2" y="2" width="2" height="2" fill="#2c2e33"/></pattern>
    <filter id="${uid}blur" x="-20%" y="-200%" width="140%" height="500%"><feGaussianBlur stdDeviation="6"/></filter>
  </defs>
  ${neon}
  <ellipse cx="220" cy="${G + 2}" rx="${L * .5}" ry="6" fill="rgba(0,0,0,.55)"/>
  <g clip-path="url(#${uid}body)"><circle cx="${rwx}" cy="${archY}" r="${archR}" fill="#050506"/><circle cx="${fwx}" cy="${archY}" r="${archR}" fill="#050506"/></g>
  ${wheel(rwx, wcy, R, cfg.inch, cfg.wheel, cfg.wcolor, uid)}
  ${wheel(fwx, wcy, R, cfg.inch, cfg.wheel, cfg.wcolor, uid)}
  <g mask="url(#${uid}arch)">
    <path d="${body}" fill="${col}"/>
    ${tone}
    ${livery}
    <path d="${body}" fill="url(#${uid}shine)"/>
    ${windows}${pillar}${lights}
    <path d="${body}" fill="none" stroke="rgba(0,0,0,.6)" stroke-width="1.2"/>
  </g>
  ${aero}
</svg>`;
}
