// SVGで車を横から描画（実車寸法ベースの形状データ＋カスタム反映）
import { carById } from '../../data/cars.js';
import { SHAPES } from '../../data/car-shapes.js';

const G = 176;        // 地面のy座標
const K = 0.078;      // 1mm あたりの px（全車共通の縮尺）
let uidSeq = 0;

export function defaultConfig(car) {
  const s = SHAPES[car.id] || {};
  return {
    color: car.color, color2: car.color2 || '#111111', tone: !!car.tone,
    wheel: s.wheel || (car.year < 1990 ? 'steel' : 'mesh'), wcolor: '#c9ced6', inch: s.inch || 15,
    height: 0, lip: 0, skirt: 0, wing: 0, bonnet: false, livery: 'none', tint: 0, neon: null, number: 86,
  };
}
export function getConfig(state, carId) {
  const car = carById(carId);
  return { ...defaultConfig(car), ...(state.garage.cars[carId] || {}) };
}

function lum(hex) {
  const h = hex.replace('#', ''); const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}
function shade(hex, amt) {
  const n = parseInt(hex.replace('#', ''), 16);
  const f = v => Math.max(0, Math.min(255, Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt)));
  return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(f).map(v => v.toString(16).padStart(2, '0')).join('');
}
const f1 = v => v.toFixed(1);

// 角丸ポリゴン（pts: [x,y,r] px）
function roundPath(pts) {
  const n = pts.length; let d = '';
  for (let i = 0; i < n; i++) {
    const [x, y, r] = pts[i], p = pts[(i - 1 + n) % n], q = pts[(i + 1) % n];
    const d1 = Math.hypot(x - p[0], y - p[1]) || 1, d2 = Math.hypot(q[0] - x, q[1] - y) || 1;
    const rr = Math.min(r || 0, d1 / 2, d2 / 2);
    const ax = x + (p[0] - x) * rr / d1, ay = y + (p[1] - y) * rr / d1;
    const bx = x + (q[0] - x) * rr / d2, by = y + (q[1] - y) * rr / d2;
    d += (i === 0 ? 'M' : 'L') + f1(ax) + ',' + f1(ay) + ' Q' + f1(x) + ',' + f1(y) + ' ' + f1(bx) + ',' + f1(by) + ' ';
  }
  return d + 'Z';
}
const poly = pts => 'M' + pts.map(p => f1(p[0]) + ',' + f1(p[1])).join(' L') + 'Z';

// ホイール（タイヤ外径 R、リム半径 rr）
function wheel(cx, cy, R, rr, design, color, uid) {
  const dark = '#1c1e22', lip = shade(color, .35), deep = shade(color, -.35);
  let spokes = '';
  const P = (a, r) => `${f1(Math.cos(a) * r)},${f1(Math.sin(a) * r)}`;
  if (design === 'stock') design = 'steel';
  if (design === 'steel') {
    spokes = `<circle r="${rr * .97}" fill="#3e4248"/><circle r="${rr * .78}" fill="#2f3238" stroke="#4b4f56" stroke-width="1"/>` +
      [0, 1, 2, 3, 4, 5].map(i => `<ellipse cx="${f1(Math.cos(i * Math.PI / 3) * rr * .6)}" cy="${f1(Math.sin(i * Math.PI / 3) * rr * .6)}" rx="${rr * .12}" ry="${rr * .08}" transform="rotate(${i * 60} ${f1(Math.cos(i * Math.PI / 3) * rr * .6)} ${f1(Math.sin(i * Math.PI / 3) * rr * .6)})" fill="#141518"/>`).join('') +
      `<circle r="${rr * .3}" fill="#8b9098"/><circle r="${rr * .16}" fill="#5c6168"/>`;
  } else if (design === 'mesh') {
    let l = '';
    for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8; l += `<path d="M${P(a, rr * .3)} L${P(a + .38, rr * .92)} M${P(a, rr * .3)} L${P(a - .38, rr * .92)}"/>`; }
    spokes = `<circle r="${rr * .95}" fill="${dark}"/><g stroke="${color}" stroke-width="1.3" stroke-linecap="round">${l}</g><circle r="${rr * .32}" fill="${color}"/><circle r="${rr * .14}" fill="${deep}"/>`;
  } else if (design === '5spoke' || design === '6spoke') {
    const n = design === '5spoke' ? 5 : 6, w = design === '5spoke' ? .26 : .16;
    let s = '';
    for (let i = 0; i < n; i++) {
      const a = i * 2 * Math.PI / n - Math.PI / 2;
      s += `<path d="M${P(a - w * 1.9, rr * .26)} Q${P(a - w * .8, rr * .6)} ${P(a - w, rr * .93)} L${P(a + w, rr * .93)} Q${P(a + w * .8, rr * .6)} ${P(a + w * 1.9, rr * .26)}Z"/>`;
      if (design === '6spoke') s += `<path d="M${P(a + Math.PI / n, rr * .32)} L${P(a + Math.PI / n, rr * .9)}" stroke="${color}" stroke-width="${rr * .07}"/>`;
    }
    spokes = `<circle r="${rr * .95}" fill="${dark}"/><g fill="${color}">${s}</g><g fill="${deep}" opacity=".55">${s}</g><circle r="${rr * .3}" fill="${color}"/>` +
      Array.from({ length: n }, (_, i) => `<circle cx="${f1(Math.cos(i * 2 * Math.PI / n) * rr * .18)}" cy="${f1(Math.sin(i * 2 * Math.PI / n) * rr * .18)}" r="${rr * .035}" fill="#222"/>`).join('');
  } else if (design === 'deep') {
    let s = '';
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; s += `<path d="M${P(a - .1, rr * .25)} L${P(a - .07, rr * .66)} L${P(a + .07, rr * .66)} L${P(a + .1, rr * .25)}Z"/>`; }
    spokes = `<circle r="${rr * .97}" fill="${lip}"/><circle r="${rr * .9}" fill="${color}"/><circle r="${rr * .68}" fill="${dark}"/><g fill="${color}">${s}</g><circle r="${rr * .24}" fill="${color}"/><circle r="${rr * .1}" fill="${deep}"/>`;
  } else {
    spokes = `<circle r="${rr * .96}" fill="${color}"/><circle r="${rr * .82}" fill="url(#${uid}disc)"/><circle r="${rr * .5}" fill="none" stroke="${shade(color, .3)}" stroke-width="1"/><circle r="${rr * .2}" fill="${deep}"/>`;
  }
  return `<g transform="translate(${f1(cx)},${f1(cy)})">
    <circle r="${R}" fill="url(#${uid}tire)"/>
    <circle r="${R * .93}" fill="none" stroke="#2b2e34" stroke-width="${R * .05}" stroke-dasharray="2 5" opacity=".7"/>
    <circle r="${rr * .82}" fill="url(#${uid}rotor)"/>
    <path d="M${P(-2.5, rr * .58)} A${rr * .58},${rr * .58} 0 0 1 ${P(-1.5, rr * .58)} L${P(-1.5, rr * .82)} A${rr * .82},${rr * .82} 0 0 0 ${P(-2.5, rr * .82)}Z" fill="#c4161c"/>
    <g class="wheel-rot">${spokes}</g>
    <circle r="${rr}" fill="none" stroke="${lip}" stroke-width="${Math.max(1.2, rr * .07)}"/>
    <circle r="${rr + .8}" fill="none" stroke="#000" stroke-width=".8" opacity=".6"/>
  </g>`;
}

// 純正・社外ウイング
function wingSVG(type, ax, ay, col) {
  const c = shade(col, -.12), blk = '#141518';
  switch (type) {
    case 1: return `<path d="M${ax - 22},${ay + 1} Q${ax - 4},${ay - 2} ${ax + 6},${ay - 6} L${ax + 8},${ay - 2} Q${ax - 4},${ay + 3} ${ax - 22},${ay + 4}Z" fill="${c}" stroke="rgba(0,0,0,.5)" stroke-width=".8"/>`;
    case 2: return `<path d="M${ax - 2},${ay} L${ax},${ay - 9} L${ax + 3},${ay - 9} L${ax + 3},${ay}Z" fill="${blk}"/><path d="M${ax - 28},${ay - 11} Q${ax - 6},${ay - 15} ${ax + 16},${ay - 13} L${ax + 15},${ay - 8} Q${ax - 6},${ay - 9} ${ax - 28},${ay - 7}Z" fill="${c}" stroke="#111" stroke-width=".8"/>`;
    case 3: return `<path d="M${ax - 6},${ay} L${ax - 3},${ay - 24} L${ax},${ay - 24} L${ax - 2},${ay}Z" fill="${blk}"/>
      <path d="M${ax - 44},${ay - 31} Q${ax - 10},${ay - 35} ${ax + 22},${ay - 31} L${ax + 20},${ay - 24} Q${ax - 10},${ay - 27} ${ax - 42},${ay - 25}Z" fill="${blk}"/>
      <path d="M${ax - 46},${ay - 38} L${ax - 40},${ay - 38} L${ax - 38},${ay - 20} L${ax - 45},${ay - 21}Z" fill="#202227"/>`;
    case 'sti': return `<path d="M${ax - 12},${ay} L${ax - 6},${ay - 12} L${ax - 2},${ay - 12} L${ax - 5},${ay}Z M${ax + 10},${ay} L${ax + 12},${ay - 12} L${ax + 16},${ay - 12} L${ax + 15},${ay}Z" fill="${c}"/>
      <path d="M${ax - 22},${ay - 15} Q${ax},${ay - 19} ${ax + 22},${ay - 14} L${ax + 21},${ay - 10} Q${ax},${ay - 13} ${ax - 22},${ay - 11}Z" fill="${c}" stroke="rgba(0,0,0,.5)" stroke-width=".8"/>`;
    case 'evo': return `<path d="M${ax - 10},${ay} L${ax - 5},${ay - 14} L${ax},${ay - 14} L${ax - 3},${ay}Z" fill="${blk}"/>
      <path d="M${ax - 30},${ay - 18} Q${ax - 4},${ay - 22} ${ax + 20},${ay - 17} L${ax + 19},${ay - 12} Q${ax - 4},${ay - 15} ${ax - 30},${ay - 13}Z" fill="${blk}"/>`;
    case 'r34': return `<path d="M${ax - 4},${ay} L${ax},${ay - 8} L${ax + 4},${ay - 8} L${ax + 2},${ay}Z" fill="${c}"/>
      <path d="M${ax - 22},${ay - 10} Q${ax},${ay - 13} ${ax + 22},${ay - 9} L${ax + 21},${ay - 6} Q${ax},${ay - 8} ${ax - 22},${ay - 6}Z" fill="${c}" stroke="rgba(0,0,0,.5)" stroke-width=".8"/>`;
    case 'r32': return `<path d="M${ax - 18},${ay} Q${ax},${ay - 6} ${ax + 18},${ay - 3} L${ax + 18},${ay + 1}Z" fill="${c}" stroke="rgba(0,0,0,.4)" stroke-width=".7"/>`;
    case 'hoop': return `<path d="M${ax - 18},${ay - 2} Q${ax - 22},${ay - 14} ${ax - 14},${ay - 16} L${ax + 26},${ay - 14} Q${ax + 30},${ay - 8} ${ax + 26},${ay} L${ax + 22},${ay} Q${ax + 24},${ay - 9} ${ax + 22},${ay - 10} L${ax - 12},${ay - 12} Q${ax - 15},${ay - 10} ${ax - 13},${ay - 2}Z" fill="${c}" stroke="rgba(0,0,0,.5)" stroke-width=".8"/>`;
    case 'fk8': return `<path d="M${ax - 8},${ay} L${ax - 3},${ay - 12} L${ax + 1},${ay - 12} L${ax - 3},${ay}Z" fill="${blk}"/>
      <path d="M${ax - 34},${ay - 14} Q${ax - 8},${ay - 19} ${ax + 18},${ay - 15} L${ax + 17},${ay - 10} Q${ax - 8},${ay - 13} ${ax - 34},${ay - 10}Z" fill="${blk}"/>`;
    case 'roof': return `<path d="M${ax - 24},${ay + 1} L${ax + 6},${ay - 2} L${ax + 4},${ay + 3} L${ax - 22},${ay + 5}Z" fill="${c}" stroke="rgba(0,0,0,.5)" stroke-width=".8"/>`;
  }
  return '';
}

export function flatSVG(carId, cfg, opts = {}) {
  const car = carById(carId);
  const S = SHAPES[car.id] || SHAPES.ae86, uid = 'c' + (++uidSeq);
  cfg = { ...defaultConfig(car), ...(cfg || {}) };
  const x0 = 220 - S.len * K / 2 + (opts.offsetX || 0);
  const dy = -(cfg.height || 0) * 2.2;
  const X = m => x0 + m * K;
  const Y = m => G - m * K + dy;      // ボディ（車高で上下）
  const YW = m => G - m * K;          // 足まわり（地面基準）
  const P = ([x, y, r]) => [X(x), Y(y), (r || 0) * K];

  const col = cfg.color || car.color;
  const contrast = lum(col) > .55 ? '#111' : '#fff';
  const R = S.tire / 2 * K;                                       // タイヤ半径
  const rr = Math.min(R - 3.2, (cfg.inch * 25.4 / 2 + 22) * K);    // リム半径
  const fwx = X(S.len - S.fo), rwx = X(S.len - S.fo - S.wb), wcy = YW(S.tire / 2);
  const archR = R + 4.2, archY = Y(S.tire / 2) + 1.5;

  const body = roundPath(S.body.map(P));
  const beltY = Y(S.belt), rockY = Y(S.rocker);
  const top = Math.min(...S.body.map(p => Y(p[1])));

  // 窓
  const tint = ['url(#' + uid + 'glass)', '#25303a', '#0b0e12'][cfg.tint || 0];
  let glass = '';
  if (S.glass) {
    const gp = roundPath(S.glass.map(P));
    glass = `<path d="${gp}" fill="${tint}"/>
      <g clip-path="url(#${uid}gl)"><path d="M${X(S.bp + 300)},${top} l-30,60 l18,0 l30,-60Z M${X(S.bp - 300)},${top} l-30,60 l8,0 l30,-60Z" fill="#fff" opacity=".18"/></g>
      <g clip-path="url(#${uid}gl)">${S.bp ? `<path d="M${X(S.bp)},${top - 2} L${X(S.bp - 40)},${beltY + 1} L${X(S.bp - 110)},${beltY + 1} L${X(S.bp - 70)},${top - 2}Z" fill="#0b0c0e"/>` : ''}
      ${S.qp ? `<path d="M${X(S.qp)},${top} L${X(S.qp - 30)},${beltY} L${X(S.qp - 70)},${beltY} L${X(S.qp - 40)},${top}Z" fill="#0b0c0e"/>` : ''}</g>
      <path d="${gp}" fill="none" stroke="${S.chromeTrim ? '#d9dde3' : '#08090b'}" stroke-width="${S.chromeTrim ? 1.4 : 1.6}"/>`;
    glass = `<defs><clipPath id="${uid}gl"><path d="${gp}"/></clipPath></defs>` + glass;
  }
  if (S.open) {
    glass = `<path d="${poly(S.shield.map(p => [X(p[0]), Y(p[1])]))}" fill="${tint}" stroke="#0b0c0e" stroke-width="1.4"/>
      ${S.seats.map(sx => `<path d="M${X(sx - 120)},${Y(S.belt) + 1} L${X(sx - 90)},${Y(S.belt + 230)} Q${X(sx)},${Y(S.belt + 270)} ${X(sx + 70)},${Y(S.belt + 200)} L${X(sx + 60)},${Y(S.belt) + 1}Z" fill="#121316"/>`).join('')}`;
  }

  // パネルライン・ドア
  let panels = '';
  (S.doors || []).forEach((dx, i) => {
    panels += `<path d="M${X(dx)},${beltY + 1} Q${X(dx + 25)},${f1((beltY + rockY) / 2)} ${X(dx - 10)},${rockY - 3}" fill="none" stroke="rgba(0,0,0,.55)" stroke-width="1"/>
      <path d="M${X(dx) + 1},${beltY + 1} Q${X(dx + 25) + 1},${f1((beltY + rockY) / 2)} ${X(dx - 10) + 1},${rockY - 3}" fill="none" stroke="rgba(255,255,255,.18)" stroke-width=".7"/>`;
    if (i < (S.doors.length - 1) || S.doors.length === 1) {
      const hx = X(dx - (S.doors.length === 1 ? 220 : (dx - S.doors[i + 1]) * .82));
      panels += `<rect x="${f1(hx)}" y="${f1(beltY + 7)}" width="${f1(130 * K)}" height="2.4" rx="1.2" fill="rgba(0,0,0,.55)"/><rect x="${f1(hx)}" y="${f1(beltY + 7)}" width="${f1(130 * K)}" height=".8" fill="rgba(255,255,255,.3)"/>`;
    }
  });
  if (S.line) {
    const ln = 'M' + S.line.map(p => f1(X(p[0])) + ',' + f1(Y(p[1]))).join(' L');
    panels += `<path d="${ln}" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="1"/><path d="${ln}" transform="translate(0,1.4)" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="1.2"/>`;
  }
  // バンパーの分割線
  panels += `<path d="M${X(S.len - 330)},${Y(S.rocker + 60)} Q${X(S.len - 280)},${Y(S.rocker + 260)} ${X(S.len - 160)},${Y(S.rocker + 420)}" fill="none" stroke="rgba(0,0,0,.35)" stroke-width=".9"/>`;
  panels += `<path d="M${X(260)},${Y(S.rocker + 60)} Q${X(230)},${Y(S.rocker + 260)} ${X(140)},${Y(S.rocker + 400)}" fill="none" stroke="rgba(0,0,0,.35)" stroke-width=".9"/>`;
  (S.vents || []).forEach(v => { panels += `<path d="${poly(v.map(p => [X(p[0]), Y(p[1])]))}" fill="#0d0e10" stroke="rgba(255,255,255,.2)" stroke-width=".6"/>`; });
  if (S.intake) panels += `<path d="${poly(S.intake.map(p => [X(p[0]), Y(p[1])]))}" fill="url(#${uid}intake)" stroke="rgba(0,0,0,.6)" stroke-width=".8"/>`;

  // ライト
  let lights = '';
  if (S.head) {
    if (S.round) {
      const c = S.head.reduce((a, p) => [a[0] + p[0] / 4, a[1] + p[1] / 4], [0, 0]);
      lights += `<ellipse cx="${X(c[0])}" cy="${Y(c[1])}" rx="2.4" ry="${f1(Math.abs(S.head[0][1] - S.head[2][1]) * K / 2)}" fill="url(#${uid}head)" stroke="#bfc4cb" stroke-width="1"/>`;
    } else {
      lights += `<path d="${poly(S.head.map(p => [X(p[0]), Y(p[1])]))}" fill="url(#${uid}head)" stroke="#2a2d33" stroke-width=".9"/>`;
      if (!S.popup) lights += `<path d="M${X(S.head[0][0] + 60)},${Y((S.head[0][1] + S.head[3][1]) / 2)} L${X(S.head[1][0] - 20)},${Y((S.head[1][1] + S.head[2][1]) / 2)}" stroke="rgba(255,255,255,.8)" stroke-width=".8"/>`;
    }
  }
  if (S.popupLine) {
    const [a, b, c] = S.popupLine;
    const hy = x => { const h = S.hood; return h[1] + (h[3] - h[1]) * (x - h[0]) / (h[2] - h[0]); };
    lights += `<path d="M${X(a)},${Y(hy(a)) + 1} L${X(b)},${Y(hy(b)) + 1} L${X(c)},${Y(hy(c)) + 1.2}" fill="none" stroke="rgba(0,0,0,.6)" stroke-width="1"/><path d="M${X(b)},${Y(hy(b)) + 1} L${X(b + 20)},${Y(hy(b)) + 5}" stroke="rgba(0,0,0,.5)" stroke-width=".9"/>`;
  }
  if (S.tail) lights += `<path d="${poly(S.tail.map(p => [X(p[0]), Y(p[1])]))}" fill="url(#${uid}tail)" stroke="#3a0a10" stroke-width=".8"/>`;
  // サイドマーカー
  lights += `<rect x="${f1(X(S.len - S.fo + S.tire / 2 + 120))}" y="${f1(Y(S.rocker + 330))}" width="${f1(110 * K)}" height="2" rx="1" fill="#ffae3a" opacity=".9"/>`;

  // ミラー
  const [mx, my] = S.mirror || [0, 0];
  const mirror = S.mirror ? `<path d="M${X(mx - 40)},${Y(my + 10)} Q${X(mx + 10)},${Y(my + 85)} ${X(mx + 120)},${Y(my + 75)} L${X(mx + 115)},${Y(my - 5)} Q${X(mx + 40)},${Y(my - 30)} ${X(mx - 40)},${Y(my + 10)}Z" fill="${shade(col, -.15)}" stroke="rgba(0,0,0,.6)" stroke-width=".8"/>` : '';

  // ツートン
  const ySplit = Y((S.belt + S.rocker) / 2 - 30);
  const tone = cfg.tone ? `<rect x="0" y="${f1(ySplit)}" width="440" height="${G}" fill="${cfg.color2}"/><line x1="0" y1="${f1(ySplit)}" x2="440" y2="${f1(ySplit)}" stroke="rgba(0,0,0,.5)" stroke-width="1"/>` : '';

  // ステッカー
  let livery = '';
  const d0 = (S.doors || [S.len / 2 + 400])[0], d1 = (S.doors && S.doors[1]) || d0 - 1000;
  const midX = X((d0 + d1) / 2), doorY = (beltY + rockY) / 2 + 1;
  if (cfg.livery === 'stripe') livery = `<rect x="0" y="${f1(Y(S.rocker + 230))}" width="440" height="3.5" fill="${contrast}"/><rect x="0" y="${f1(Y(S.rocker + 170))}" width="440" height="1.6" fill="${contrast}"/>`;
  else if (cfg.livery === 'number') livery = `<circle cx="${f1(midX)}" cy="${f1(doorY)}" r="11" fill="#fff" stroke="#111" stroke-width="1.8"/><text x="${f1(midX)}" y="${f1(doorY + 4.8)}" text-anchor="middle" font-family="Orbitron,sans-serif" font-weight="900" font-size="13" fill="#111">${cfg.number ?? 86}</text>`;
  else if (cfg.livery === 'ghost') livery = `<text x="${f1(midX + 4)}" y="${f1(doorY + 4)}" text-anchor="middle" font-family="Orbitron,sans-serif" font-style="italic" font-weight="900" font-size="11" fill="${contrast}" stroke="#00e5ff" stroke-width=".7">GHOST LINE</text>`;
  else if (cfg.livery === 'fire') { const hx = X(S.len - S.fo - 200); livery = `<path d="M${X(S.len + 50)},${Y(S.belt - 80)} L${hx},${Y(S.belt - 80)} q-14,6 -6,10 q-22,-4 -30,6 q16,2 8,8 q-24,-6 -38,4 q30,4 34,14 L${X(S.len + 50)},${rockY}Z" fill="url(#${uid}fire)" opacity=".95"/>`; }
  else if (cfg.livery === 'shop') livery = `<text x="${f1(midX)}" y="${f1(doorY - 2)}" text-anchor="middle" font-family="Orbitron,sans-serif" font-weight="800" font-size="8" fill="${contrast}">TAKAMIYA</text><text x="${f1(midX)}" y="${f1(doorY + 8)}" text-anchor="middle" font-family="Orbitron,sans-serif" font-weight="800" font-size="6" fill="${contrast}" letter-spacing="1.5">FACTORY</text>`;

  // フェンダーの張り出し
  const flare = S.flare ? [rwx, fwx].map(cx => `<path d="M${f1(cx - archR - 1.5)},${f1(archY + 1)} A${f1(archR + 1.5)},${f1(archR + 1.5)} 0 0 1 ${f1(cx + archR + 1.5)},${f1(archY + 1)}" fill="none" stroke="${shade(col, -.25)}" stroke-width="2.4"/>`).join('') : '';
  const archLip = [rwx, fwx].map(cx => `<path d="M${f1(cx - archR)},${f1(archY + 1)} A${f1(archR)},${f1(archR)} 0 0 1 ${f1(cx + archR)},${f1(archY + 1)}" fill="none" stroke="rgba(0,0,0,.65)" stroke-width="1.1"/>`).join('');

  // エアロ
  let aero = '';
  if (cfg.lip) {
    const h = 1.5 + cfg.lip * 1.6;
    aero += `<path d="M${X(S.len - 700)},${rockY - 1} L${X(S.len - 20) + cfg.lip * 1.8},${rockY - 2} L${X(S.len - 40) + cfg.lip * 1.4},${rockY + h - 1} L${X(S.len - 650)},${rockY + h - 2}Z" fill="#111214"/>`;
    if (cfg.lip >= 3) aero += `<path d="M${X(S.len - 30)},${Y(S.rocker + 260)} l11,-2 l-3,5Z" fill="#111214"/>`;
  }
  if (cfg.skirt) aero += `<path d="M${f1(rwx + archR)},${f1(rockY - 3)} L${f1(fwx - archR)},${f1(rockY - 3)} L${f1(fwx - archR - 2)},${f1(rockY + cfg.skirt * 2.2)} L${f1(rwx + archR + 2)},${f1(rockY + cfg.skirt * 2.2)}Z" fill="${shade(cfg.tone ? cfg.color2 : col, -.4)}"/>`;
  if (cfg.bonnet && S.hood) {
    const [hx1, hy1, hx2, hy2] = S.hood;
    aero += `<path d="M${X(hx1 + 20)},${Y(hy1)} L${X(hx2)},${Y(hy2)} L${X(hx2 - 10)},${Y(hy2 - 50)} L${X(hx1 + 25)},${Y(hy1 - 55)}Z" fill="url(#${uid}carbon)"/>`;
  }
  if (S.scoop) aero += `<path d="${poly(S.scoop.map(p => [X(p[0]), Y(p[1])]))}" fill="${cfg.bonnet ? 'url(#' + uid + 'carbon)' : shade(col, -.1)}" stroke="rgba(0,0,0,.55)" stroke-width=".8"/>`;
  const [wax, way] = S.wingAt || [200, 900];
  if (cfg.wing) aero += wingSVG(cfg.wing, X(wax), Y(way), col);
  else if (S.stock) aero += wingSVG(S.stock, X(wax), Y(way), col);

  // メッキバンパー（旧車）
  const chrome = S.chrome ? `<rect x="${X(S.len - 60)}" y="${Y(S.rocker + 260)}" width="${f1(110 * K)}" height="${f1(80 * K)}" rx="2" fill="url(#${uid}chrome)"/><rect x="${X(-40)}" y="${Y(S.rocker + 300)}" width="${f1(110 * K)}" height="${f1(80 * K)}" rx="2" fill="url(#${uid}chrome)"/>` : '';

  const neon = cfg.neon ? `<ellipse cx="${f1((rwx + fwx) / 2)}" cy="${G - 2}" rx="${f1(S.len * K * .44)}" ry="7" fill="${cfg.neon}" filter="url(#${uid}blur)" opacity=".95"/>` : '';
  const mid = (rwx + fwx) / 2, Lp = S.len * K;

  return `<svg class="car-svg" viewBox="0 0 440 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${car.name}">
  <defs>
    <clipPath id="${uid}body"><path d="${body}"/></clipPath>
    <clipPath id="${uid}upper"><rect x="0" y="0" width="440" height="${f1(beltY - 2)}"/></clipPath>
    <mask id="${uid}arch" maskUnits="userSpaceOnUse" x="0" y="0" width="440" height="200"><rect width="440" height="200" fill="#fff"/><circle cx="${f1(rwx)}" cy="${f1(archY)}" r="${f1(archR)}" fill="#000"/><circle cx="${f1(fwx)}" cy="${f1(archY)}" r="${f1(archR)}" fill="#000"/></mask>
    <linearGradient id="${uid}paint" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="${f1(top)}" y2="${f1(rockY)}">
      <stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset=".2" stop-color="#fff" stop-opacity=".16"/>
      <stop offset="${f1(Math.max(.25, Math.min(.7, (beltY - top) / (rockY - top))) * 100) / 100}" stop-color="#fff" stop-opacity=".02"/>
      <stop offset=".7" stop-color="#000" stop-opacity=".12"/><stop offset="1" stop-color="#000" stop-opacity=".62"/></linearGradient>
    <linearGradient id="${uid}refl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".35" stop-color="#fff" stop-opacity=".38"/><stop offset=".6" stop-color="#fff" stop-opacity=".1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <linearGradient id="${uid}glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a9c9de"/><stop offset=".45" stop-color="#456277"/><stop offset="1" stop-color="#1c2833"/></linearGradient>
    <linearGradient id="${uid}head" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#cfe2f5"/><stop offset="1" stop-color="#7e93a8"/></linearGradient>
    <linearGradient id="${uid}tail" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff5a6a"/><stop offset=".5" stop-color="#d0101f"/><stop offset="1" stop-color="#6d0610"/></linearGradient>
    <linearGradient id="${uid}chrome" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="#9aa1aa"/><stop offset="1" stop-color="#e6e9ee"/></linearGradient>
    <linearGradient id="${uid}intake" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2a2d33"/><stop offset="1" stop-color="#050506"/></linearGradient>
    <radialGradient id="${uid}tire"><stop offset=".6" stop-color="#1b1c1f"/><stop offset=".86" stop-color="#2a2c30"/><stop offset="1" stop-color="#0c0d0f"/></radialGradient>
    <radialGradient id="${uid}rotor"><stop offset=".35" stop-color="#3b3e44"/><stop offset=".8" stop-color="#8a8f97"/><stop offset="1" stop-color="#5b5f66"/></radialGradient>
    <radialGradient id="${uid}disc"><stop offset="0" stop-color="#e9edf2"/><stop offset="1" stop-color="#7d838c"/></radialGradient>
    <radialGradient id="${uid}well"><stop offset=".55" stop-color="#000"/><stop offset="1" stop-color="#1a1b1e"/></radialGradient>
    <linearGradient id="${uid}fire" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#ffd400"/><stop offset=".5" stop-color="#ff7a00"/><stop offset="1" stop-color="#ff2d55"/></linearGradient>
    <pattern id="${uid}carbon" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="#1b1c1f"/><rect width="2" height="2" fill="#2e3035"/><rect x="2" y="2" width="2" height="2" fill="#2e3035"/></pattern>
    <filter id="${uid}blur" x="-20%" y="-200%" width="140%" height="500%"><feGaussianBlur stdDeviation="6"/></filter>
  </defs>
  ${neon}
  <ellipse cx="${f1(mid)}" cy="${G + 1.5}" rx="${f1(Lp * .52)}" ry="5" fill="rgba(0,0,0,.6)"/>
  <ellipse cx="${f1(mid)}" cy="${G + 1}" rx="${f1(Lp * .4)}" ry="2.5" fill="rgba(0,0,0,.7)"/>
  <g clip-path="url(#${uid}body)"><circle cx="${f1(rwx)}" cy="${f1(archY)}" r="${f1(archR)}" fill="url(#${uid}well)"/><circle cx="${f1(fwx)}" cy="${f1(archY)}" r="${f1(archR)}" fill="url(#${uid}well)"/></g>
  ${wheel(rwx, wcy, R, rr, cfg.wheel, cfg.wcolor, uid)}
  ${wheel(fwx, wcy, R, rr, cfg.wheel, cfg.wcolor, uid)}
  <g mask="url(#${uid}arch)">
    <path d="${body}" fill="${col}"/>
    <g clip-path="url(#${uid}body)">
      ${tone}
      ${livery}
      <rect x="0" y="0" width="440" height="200" fill="url(#${uid}paint)"/>
      <rect x="${f1(X(0))}" y="${f1(beltY + 3)}" width="${f1(Lp)}" height="${f1(Math.max(2, (rockY - beltY) * .12))}" fill="url(#${uid}refl)"/>
      <rect x="0" y="${f1(rockY - (rockY - beltY) * .22)}" width="440" height="40" fill="#000" opacity=".22"/>
      <path d="M${X(S.len - 420)},${f1(rockY + 2)} L${X(S.len + 40)},${f1(rockY + 2)} L${X(S.len + 40)},${f1(Y(S.rocker + 170))} L${X(S.len - 380)},${f1(Y(S.rocker + 110))}Z" fill="#000" opacity=".55"/>
      <path d="M${X(-40)},${f1(rockY + 2)} L${X(330)},${f1(rockY + 2)} L${X(300)},${f1(Y(S.rocker + 120))} L${X(-40)},${f1(Y(S.rocker + 150))}Z" fill="#000" opacity=".5"/>
      <path d="${body}" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.2" transform="translate(0,1.1)" clip-path="url(#${uid}upper)"/>
      ${panels}
      ${lights}
      ${chrome}
    </g>
    ${glass}
    <path d="${body}" fill="none" stroke="rgba(0,0,0,.7)" stroke-width="1.1"/>
    ${archLip}
  </g>
  ${flare}
  ${mirror}
  ${aero}
</svg>`;
}

// ===== 3D画像への差し替え =====
// まず平面のSVGを返し、3Dの静止画ができしだい同じ場所を <img> に置きかえる
const V3D = 'v7';
let use3d = null, car3dMod = null;
const queue = [];
let running = false;
function hash(s) { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
function can3d() {
  if (use3d !== null) return use3d;
  try { const c = document.createElement('canvas'); use3d = !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { use3d = false; }
  if (typeof location !== 'undefined' && /[?&]flat=1/.test(location.search)) use3d = false;
  return use3d;
}
async function pump() {
  if (running) return; running = true;
  try {
    if (!car3dMod) car3dMod = await import('./car3d.js');
    while (queue.length) {
      const job = queue.shift();
      if (!document.querySelector(`[data-c3d="${job.key}"]`)) continue;
      const url = await car3dMod.renderCarImage(job.key, job.carId, job.cfg, job.view, job.w, job.h);
      document.querySelectorAll(`[data-c3d="${job.key}"]`).forEach(el => { el.outerHTML = imgTag(url, job.name, job.view); });
      await new Promise(r => setTimeout(r, 0));
    }
  } catch (e) { console.warn('3D描画に失敗したため平面表示にします', e); use3d = false; }
  running = false;
}
const imgTag = (url, name, view) => `<img class="car-svg car3d ${view === 'side' ? 'side' : ''}" src="${url}" alt="${name}" draggable="false">`;

export function carSVG(carId, cfg, opts = {}) {
  const car = carById(carId);
  const c = { ...defaultConfig(car), ...(cfg || {}) };
  const flat = flatSVG(carId, c, opts);
  if (!can3d() || opts.flat) return flat;
  const view = opts.view === 'side' ? 'side' : '34';
  const [w, h] = opts.small ? [440, 200] : [880, 400];
  const { engine, tire, ...vis } = c; // 見た目に関係ない性能パーツは、画像キャッシュのキーから外す
  const key = hash(V3D + car.id + JSON.stringify(vis) + view + w);
  const hit = car3dMod && car3dMod.cachedImage(key);
  if (hit) return imgTag(hit, car.name, view);
  queue.push({ key, carId: car.id, cfg: c, view, w, h, name: car.name });
  setTimeout(pump, 0);
  return flat.replace('<svg class="car-svg"', `<svg class="car-svg c3d-wait" data-c3d="${key}"`);
}

// ガレージ用の回せる3D表示（使えないときは null）
export async function mountCarViewer(el, carId, cfg) {
  if (!can3d()) return null;
  try { if (!car3dMod) car3dMod = await import('./car3d.js'); return car3dMod.mountViewer(el, carId, { ...defaultConfig(carById(carId)), ...(cfg || {}) }); }
  catch (e) { console.warn(e); return null; }
}
