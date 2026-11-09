// アニメ風の立ち絵（上半身）をSVGで組み立てる
// look: { hair, hairC, skin, eye, eyeC, brow, outfit, c1, c2, acc:[], patch, scar, gender }
// expr: normal | smile | serious | surprise | angry
let uid = 0;
const INK = '#14111c';

const shade = (hex, k) => {
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const f = v => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)));
  return '#' + [f(r), f(g), f(b)].map(v => v.toString(16).padStart(2, '0')).join('');
};

const SKIN = { light: '#f8dcc8', mid: '#efc6a6', tan: '#d9a27c', dark: '#a8714f', pale: '#ece4ea' };

// ===== 髪 =====
// back: 頭の後ろ側（顔より奥）, front: 前髪（顔より手前）
function hair(style, c, id) {
  const d = shade(c, -0.35), h = shade(c, 0.35);
  const F = `fill="url(#${id}h)" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"`;
  const hl = (p) => `<path d="${p}" fill="none" stroke="${h}" stroke-width="3" stroke-linecap="round" opacity=".8"/>`;
  const S = {
    spiky: {
      back: `<path d="M66,150 L58,118 L40,104 L62,94 L50,66 L80,72 L80,42 L104,58 L118,26 L134,54 L160,34 L160,66 L190,58 L178,90 L202,100 L182,116 L174,150 Z" ${F}/>`,
      front: `<path d="M70,124 L76,86 L84,104 L92,76 L100,112 L110,74 L118,116 L128,76 L136,112 L146,78 L152,106 L162,84 L168,126 L172,82 Q120,46 68,82 Z" ${F}/>${hl('M96,60 Q110,52 126,54')}`,
    },
    center: {
      back: `<path d="M64,170 Q52,70 120,50 Q188,70 176,170 L164,172 Q170,104 120,92 Q70,104 76,172 Z" ${F}/>`,
      front: `<path d="M120,60 Q86,62 72,136 Q82,118 88,108 Q92,124 90,140 Q104,108 112,86 Q116,74 120,68 Z" ${F}/><path d="M120,60 Q154,62 168,136 Q158,118 152,108 Q148,124 150,140 Q136,108 128,86 Q124,74 120,68 Z" ${F}/>${hl('M98,70 Q90,90 86,110')}`,
    },
    bob: {
      back: `<path d="M60,196 Q48,78 120,52 Q192,78 180,196 Q164,204 154,186 L86,186 Q76,204 60,196 Z" ${F}/>`,
      front: `<path d="M72,128 Q66,62 120,56 Q174,62 168,128 L160,124 L154,104 L144,122 L134,100 L124,124 L114,100 L104,122 L94,102 L86,124 L80,108 Z" ${F}/>${hl('M90,70 Q110,60 134,64')}`,
    },
    long: {
      back: `<path d="M56,272 Q34,150 60,92 Q80,48 120,48 Q160,48 180,92 Q206,150 184,272 Q160,282 150,262 L90,262 Q80,282 56,272 Z" ${F}/>`,
      front: `<path d="M70,132 Q64,60 120,54 Q176,60 170,132 L162,126 L156,102 L146,124 L136,98 L124,126 L112,98 L102,124 L92,100 L84,124 L78,110 Z" ${F}/><path d="M72,120 Q66,176 76,218 Q82,180 86,140 Z" ${F}/><path d="M168,120 Q174,176 164,218 Q158,180 154,140 Z" ${F}/>${hl('M90,68 Q110,58 136,62')}`,
    },
    pony: {
      back: `<path d="M150,70 Q216,74 212,150 Q210,196 186,232 Q192,180 180,140 Q172,110 150,96 Z" ${F}/><path d="M66,150 Q56,74 120,52 Q184,74 174,150 Z" ${F}/><rect x="150" y="72" width="14" height="14" rx="4" fill="#ff2d55" stroke="${INK}" stroke-width="2"/>`,
      front: `<path d="M72,126 Q66,62 120,56 Q174,62 168,126 L160,122 L156,100 L146,118 L138,96 L126,120 L114,94 L104,118 L94,98 L86,122 L80,106 Z" ${F}/><path d="M74,116 Q70,150 80,176 Q82,148 86,128 Z" ${F}/>${hl('M90,70 Q110,60 134,64')}`,
    },
    slick: {
      back: `<path d="M66,140 Q58,60 120,46 Q182,60 174,140 Q170,104 160,96 L80,96 Q70,104 66,140 Z" ${F}/>`,
      front: `<path d="M72,112 Q68,54 120,48 Q172,54 168,112 Q160,82 120,80 Q80,82 72,112 Z" ${F}/>${hl('M88,72 Q110,56 150,66')}<path d="M92,80 Q118,62 150,74 M100,90 Q124,74 156,86" fill="none" stroke="${d}" stroke-width="2"/>`,
    },
    undercut: {
      back: `<path d="M70,132 Q64,70 120,54 Q176,70 170,132 Z" fill="${d}" stroke="${INK}" stroke-width="2.4"/>`,
      front: `<path d="M74,104 Q70,40 128,40 Q182,44 172,100 L166,92 L160,108 Q150,84 132,92 L140,74 L120,92 Q96,78 86,100 Z" ${F}/>${hl('M100,52 Q130,42 158,54')}`,
    },
    buzz: {
      back: `<path d="M72,128 Q66,64 120,56 Q174,64 168,128 Z" fill="${c}" stroke="${INK}" stroke-width="2.4"/>`,
      front: `<path d="M72,112 Q70,64 120,60 Q170,64 168,112 Q150,94 120,94 Q90,94 72,112 Z" fill="${c}" stroke="${INK}" stroke-width="2.4"/>`,
    },
    wild: {
      back: `<path d="M50,230 Q30,170 46,120 L30,96 L58,92 Q60,52 120,40 Q180,52 182,92 L210,96 L194,120 Q210,170 190,230 Q170,200 166,160 L74,160 Q70,200 50,230 Z" ${F}/>`,
      front: `<path d="M68,132 L72,84 L82,108 L86,72 L98,110 L106,66 L118,114 L126,68 L138,112 L148,70 L154,106 L164,80 L172,132 L176,84 Q120,40 64,84 Z" ${F}/>${hl('M92,62 Q112,50 140,56')}`,
    },
  };
  return S[style] || S.center;
}

// ===== 目 =====
function eyes(type, expr, c, id) {
  const one = (cx, side) => {
    const cy = 134;
    let rot = 0, sy = 1;
    if (type === 'sharp') rot = -side * 11;
    if (type === 'droopy') rot = side * 9;
    if (type === 'narrow') sy = 0.55;
    if (expr === 'angry') sy *= 0.82;
    if (expr === 'serious') sy *= 0.9;
    if (expr === 'surprise') sy *= 1.12;
    if (type === 'shades') return '';
    if (expr === 'smile') {
      return `<path d="M${cx - 12},${cy + 2} Q${cx},${cy - 10} ${cx + 12},${cy + 2}" fill="none" stroke="${INK}" stroke-width="3.6" stroke-linecap="round"/>`;
    }
    const ir = expr === 'surprise' ? 5.2 : 7.4;
    return `<g transform="rotate(${rot} ${cx} ${cy}) translate(0 ${cy * (1 - sy)}) scale(1 ${sy})">
      <path d="M${cx - 12},${cy} Q${cx},${cy - 13} ${cx + 12},${cy} Q${cx},${cy + 11} ${cx - 12},${cy} Z" fill="#fff"/>
      <ellipse cx="${cx + side * 0.5}" cy="${cy + 1}" rx="${ir}" ry="${ir * 1.2}" fill="url(#${id}e)"/>
      <ellipse cx="${cx + side * 0.5}" cy="${cy + 2}" rx="${ir * 0.45}" ry="${ir * 0.6}" fill="${INK}"/>
      <circle cx="${cx - 2.6}" cy="${cy - 3}" r="2.4" fill="#fff"/>
      <circle cx="${cx + 2.8}" cy="${cy + 4}" r="1.1" fill="#fff" opacity=".8"/>
      <path d="M${cx - 13.5},${cy + 1} Q${cx},${cy - 15} ${cx + 13.5},${cy - 1} L${cx + side * 16},${cy - (side > 0 ? 5 : -2)}" fill="none" stroke="${INK}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M${cx - 8},${cy + 9} Q${cx},${cy + 11} ${cx + 8},${cy + 9}" fill="none" stroke="${INK}" stroke-width="1.4" opacity=".7"/>
    </g>`;
  };
  let s = `<g transform="translate(120 134) scale(1.16) translate(-120 -134)">${one(101, -1) + one(139, 1)}</g>`;
  if (type === 'shades') {
    s = `<path d="M80,124 L116,124 L114,142 Q100,150 86,142 Z M124,124 L160,124 L154,142 Q140,150 126,142 Z" fill="#0b0d14" stroke="${INK}" stroke-width="2.5"/>
      <path d="M116,128 L124,128" stroke="${INK}" stroke-width="3"/><path d="M86,128 L100,128" stroke="#7fdcff" stroke-width="2" opacity=".7"/><path d="M130,128 L144,128" stroke="#7fdcff" stroke-width="2" opacity=".7"/>`;
  }
  return s;
}

function brows(type, expr, c) {
  let ly = 112, inner = 0, outer = 0, w = 4;
  if (type === 'thick') w = 6;
  if (expr === 'angry') { inner = 8; outer = -2; }
  if (expr === 'serious') { inner = 4; }
  if (expr === 'surprise') { ly = 104; }
  if (expr === 'smile') { ly = 108; }
  if (type === 'sharp' && expr !== 'surprise') { inner += 3; outer -= 3; }
  const b = (x1, x2, yi, yo) => `<path d="M${x1},${yo} Q${(x1 + x2) / 2},${Math.min(yi, yo) - 4} ${x2},${yi}" fill="none" stroke="${shade(c, -0.4)}" stroke-width="${w}" stroke-linecap="round"/>`;
  return b(88, 114, ly + inner, ly + outer) + b(152, 126, ly + inner, ly + outer);
}

function mouth(expr) {
  const m = {
    normal: `<path d="M112,174 Q120,177 128,174" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>`,
    smile: `<path d="M108,170 Q120,186 132,170 Q120,176 108,170 Z" fill="#a8323f" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/><path d="M112,172 Q120,175 128,172" fill="#fff"/>`,
    serious: `<path d="M111,176 L129,175" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`,
    surprise: `<ellipse cx="120" cy="177" rx="5" ry="7" fill="#7a2230" stroke="${INK}" stroke-width="2.2"/>`,
    smirk: `<path d="M110,175 Q122,179 133,169" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`,
    angry: `<path d="M108,178 Q120,168 132,178 L130,182 Q120,176 110,182 Z" fill="#7a2230" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/><path d="M111,177 L129,177" stroke="#fff" stroke-width="2.2"/>`,
  };
  return m[expr] || m.normal;
}

// ===== 服 =====
function outfit(type, c1, c2, patch, id) {
  const d1 = shade(c1, -0.35), l1 = shade(c1, 0.25);
  const body = `M14,300 Q16,240 70,224 L102,214 L138,214 L170,224 Q224,240 226,300 Z`;
  const base = `<path d="${body}" fill="url(#${id}o)" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>`;
  const fold = `<path d="M60,300 Q66,262 76,246 M180,300 Q174,262 164,246" fill="none" stroke="${d1}" stroke-width="3" opacity=".8"/>`;
  const pt = patch ? `<g transform="translate(150 258) rotate(-6)"><rect x="-22" y="-10" width="44" height="20" rx="3" fill="${c2}" stroke="${INK}" stroke-width="1.6"/><text x="0" y="5" text-anchor="middle" font-family="Orbitron,sans-serif" font-weight="900" font-size="10" fill="${shade(c2, -0.75)}">${patch}</text></g>` : '';
  const T = {
    suit: base + `<path d="M24,262 Q60,236 98,226 L104,240 Q64,250 30,276 Z M216,262 Q180,236 142,226 L136,240 Q176,250 210,276 Z" fill="${c2}" stroke="${INK}" stroke-width="1.6"/>
      <path d="M100,214 L106,232 L120,238 L134,232 L140,214" fill="${d1}" stroke="${INK}" stroke-width="2.2"/><path d="M120,238 L120,300" stroke="${INK}" stroke-width="2"/><path d="M120,238 L120,300" stroke="#c9d2e0" stroke-width="1" stroke-dasharray="3 3"/>
      <g transform="translate(86 266) rotate(4)"><rect x="-16" y="-8" width="32" height="16" rx="3" fill="#fff" stroke="${INK}" stroke-width="1.4"/><text x="0" y="4" text-anchor="middle" font-family="Orbitron,sans-serif" font-weight="900" font-size="8" fill="#d0021b">GLJ</text></g>` + pt + fold,
    tsunagi: base + `<path d="M98,214 L120,252 L142,214" fill="#e9e6df" stroke="${INK}" stroke-width="2"/><path d="M90,218 L120,262 L150,218" fill="none" stroke="${INK}" stroke-width="2.4"/>
      <path d="M86,218 L104,250 L94,256 L76,226 Z M154,218 L136,250 L146,256 L164,226 Z" fill="${l1}" stroke="${INK}" stroke-width="1.8"/>
      <rect x="148" y="266" width="34" height="22" rx="2" fill="${d1}" stroke="${INK}" stroke-width="1.6"/><path d="M152,270 L178,270" stroke="${l1}" stroke-width="2"/>` + (patch ? `<g transform="translate(78 274)"><rect x="-20" y="-8" width="40" height="16" rx="2" fill="#fff" stroke="${INK}" stroke-width="1.4"/><text x="0" y="4" text-anchor="middle" font-family="Orbitron,sans-serif" font-weight="900" font-size="8" fill="${INK}">${patch}</text></g>` : '') + fold,
    hoodie: base + `<path d="M76,226 Q84,204 120,206 Q156,204 164,226 Q150,238 120,240 Q90,238 76,226 Z" fill="${c2}" stroke="${INK}" stroke-width="2.2"/>
      <path d="M100,238 L120,300 L140,238" fill="${shade(c1, -0.55)}" stroke="${INK}" stroke-width="2"/><path d="M108,240 L106,272 M132,240 L134,272" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/><circle cx="106" cy="274" r="2.6" fill="#fff"/><circle cx="134" cy="274" r="2.6" fill="#fff"/>` + pt + fold,
    blazer: base + `<path d="M100,214 L120,256 L140,214" fill="#f4f6fb" stroke="${INK}" stroke-width="2"/><path d="M88,220 L112,276 L120,256 L100,214 Z M152,220 L128,276 L120,256 L140,214 Z" fill="${l1}" stroke="${INK}" stroke-width="2"/>
      <path d="M110,226 L120,234 L130,226 L126,246 L120,238 L114,246 Z" fill="${c2}" stroke="${INK}" stroke-width="1.6"/><circle cx="120" cy="286" r="3" fill="#ffd400" stroke="${INK}"/>` + fold,
    leather: base + `<path d="M98,214 L120,244 L142,214" fill="${c2}" stroke="${INK}" stroke-width="2"/><path d="M84,220 L110,262 L100,300 M156,220 L130,262 L140,300" fill="none" stroke="${INK}" stroke-width="2.4"/>
      <path d="M86,222 L108,258 L92,262 L70,232 Z M154,222 L132,258 L148,262 L170,232 Z" fill="${l1}" stroke="${INK}" stroke-width="1.8"/><path d="M128,262 L134,300" stroke="#c0c6d0" stroke-width="2" stroke-dasharray="2 2"/>` + pt + fold,
    business: base + `<path d="M100,214 L120,260 L140,214" fill="#f2f2f2" stroke="${INK}" stroke-width="2"/><path d="M116,224 L124,224 L128,272 L120,282 L112,272 Z" fill="${c2}" stroke="${INK}" stroke-width="1.6"/>
      <path d="M88,220 L114,282 L104,300 M152,220 L126,282 L136,300" fill="none" stroke="${INK}" stroke-width="2.4"/>` + fold,
    coat: `<path d="M8,300 Q10,236 66,218 L100,210 L140,210 L174,218 Q230,236 232,300 Z" fill="url(#${id}o)" stroke="${INK}" stroke-width="2.6"/>
      <path d="M78,222 Q82,184 100,180 L104,214 Z M162,222 Q158,184 140,180 L136,214 Z" fill="${l1}" stroke="${INK}" stroke-width="2.2"/>
      <path d="M104,214 L120,300 L136,214" fill="${c2}" stroke="${INK}" stroke-width="2"/><path d="M60,300 L72,240 M180,300 L168,240" stroke="${d1}" stroke-width="3"/>`,
    tee: base + `<path d="M100,214 Q120,230 140,214" fill="none" stroke="${INK}" stroke-width="2.4"/><path d="M14,300 Q16,240 60,226 L76,300 Z M226,300 Q224,240 180,226 L164,300 Z" fill="${c2}" stroke="${INK}" stroke-width="2.2"/>` + pt + fold,
  };
  return T[type] || T.tee;
}

function accessories(acc, look, id) {
  let back = '', front = '';
  const c = look.c2 || '#00e5ff';
  for (const a of acc || []) {
    if (a === 'headset') {
      back += `<path d="M66,130 Q62,46 120,42 Q178,46 174,130" fill="none" stroke="${INK}" stroke-width="9"/><path d="M66,130 Q62,46 120,42 Q178,46 174,130" fill="none" stroke="#2b3240" stroke-width="5"/>`;
      front += `<rect x="58" y="118" width="18" height="32" rx="7" fill="#262c38" stroke="${INK}" stroke-width="2.2"/><rect x="62" y="124" width="4" height="20" rx="2" fill="${c}"/>
        <path d="M68,148 Q74,180 104,184" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/><circle cx="106" cy="184" r="4.5" fill="#262c38" stroke="${INK}" stroke-width="1.6"/>`;
    }
    if (a === 'goggles') {
      front += `<path d="M70,92 Q120,74 170,92" fill="none" stroke="${INK}" stroke-width="8"/><path d="M70,92 Q120,74 170,92" fill="none" stroke="#3a3f4b" stroke-width="5"/>
        <rect x="84" y="72" width="30" height="20" rx="8" fill="#7fdcff" stroke="${INK}" stroke-width="2.4" opacity=".95"/><rect x="126" y="72" width="30" height="20" rx="8" fill="#7fdcff" stroke="${INK}" stroke-width="2.4" opacity=".95"/>
        <path d="M90,78 L100,76 M132,78 L142,76" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>`;
    }
    if (a === 'cap') {
      front += `<path d="M70,98 Q66,42 120,38 Q174,42 170,98 Z" fill="${c}" stroke="${INK}" stroke-width="2.4"/><path d="M66,98 Q120,86 190,100 Q176,112 120,104 Q84,104 66,98 Z" fill="${shade(c, -0.4)}" stroke="${INK}" stroke-width="2.4"/>
        <text x="120" y="80" text-anchor="middle" font-family="Orbitron,sans-serif" font-weight="900" font-size="13" fill="#fff">${look.capText || 'TF'}</text>`;
    }
    if (a === 'bandana') {
      front += `<path d="M70,104 Q120,86 170,104 L170,118 Q120,100 70,118 Z" fill="${c}" stroke="${INK}" stroke-width="2.2"/><path d="M168,108 L190,96 L186,114 Z M168,112 L188,124 L176,128 Z" fill="${c}" stroke="${INK}" stroke-width="2"/>
        <circle cx="96" cy="104" r="2" fill="#fff"/><circle cx="120" cy="99" r="2" fill="#fff"/><circle cx="144" cy="104" r="2" fill="#fff"/>`;
    }
    if (a === 'mask') {
      front += `<path d="M74,116 Q120,100 166,116 L162,146 Q146,156 130,148 L120,140 L110,148 Q94,156 78,146 Z" fill="#f2eef8" stroke="${INK}" stroke-width="2.6"/>
        <path d="M86,132 Q100,124 112,134 Q100,140 86,132 Z M154,132 Q140,124 128,134 Q140,140 154,132 Z" fill="${c}"/><path d="M80,120 Q120,108 160,120" fill="none" stroke="${c}" stroke-width="2.4"/>`;
    }
    if (a === 'earring') front += `<circle cx="74" cy="152" r="3.5" fill="#ffd400" stroke="${INK}" stroke-width="1.4"/>`;
    if (a === 'glasses') {
      front += `<rect x="86" y="124" width="30" height="22" rx="5" fill="rgba(160,220,255,.18)" stroke="${INK}" stroke-width="2.6"/><rect x="124" y="124" width="30" height="22" rx="5" fill="rgba(160,220,255,.18)" stroke="${INK}" stroke-width="2.6"/><path d="M116,132 L124,132" stroke="${INK}" stroke-width="2.4"/>`;
    }
    if (a === 'tablet') {
      front += `<g transform="translate(150 250) rotate(-12)"><rect x="-6" y="-4" width="66" height="50" rx="6" fill="#20242e" stroke="${INK}" stroke-width="2.4"/><rect x="0" y="2" width="54" height="38" rx="3" fill="#0b2a3a"/>
        <path d="M4,32 L16,22 L26,28 L38,12 L50,18" fill="none" stroke="${c}" stroke-width="2.4"/></g>`;
    }
    if (a === 'scar') front += `<path d="M146,150 L158,170 M150,154 L144,160 M154,162 L148,166" stroke="#b5574f" stroke-width="2" stroke-linecap="round"/>`;
    if (a === 'beard') front += `<path d="M94,176 Q120,206 146,176 Q144,196 120,202 Q96,196 94,176 Z" fill="${shade(look.hairC, -0.1)}" stroke="${INK}" stroke-width="1.8"/>`;
    if (a === 'wrinkle') front += `<path d="M86,154 Q92,158 98,156 M142,156 Q148,158 154,154" fill="none" stroke="${INK}" stroke-width="1.4" opacity=".6"/>`;
  }
  return { back, front };
}

export function charaSVG(look = {}, expr = 'normal') {
  const id = 'ch' + (++uid);
  const L = { hair: 'center', hairC: '#2a2a35', skin: 'light', eye: 'normal', eyeC: '#3a6bd8', brow: 'normal', outfit: 'tee', c1: '#2b3245', c2: '#00e5ff', acc: [], ...look };
  const cool = expr === 'smile' && ['sharp', 'narrow', 'shades'].includes(L.eye);
  const eExpr = cool ? 'normal' : expr, mExpr = cool ? 'smirk' : expr;
  const skin = SKIN[L.skin] || L.skin, skinD = shade(skin, -0.16);
  const H = hair(L.hair, L.hairC, id), A = accessories(L.acc, L, id);
  const blush = (expr === 'smile' && !cool) || L.blush ? `<ellipse cx="94" cy="158" rx="9" ry="4" fill="#ff7a8a" opacity=".35"/><ellipse cx="146" cy="158" rx="9" ry="4" fill="#ff7a8a" opacity=".35"/>` : '';
  const sweat = expr === 'surprise' ? `<path d="M168,104 Q174,116 168,122 Q162,116 168,104 Z" fill="#9fe3ff" stroke="${INK}" stroke-width="1.4"/>` : '';
  const anger = expr === 'angry' ? `<path d="M158,74 l6,6 m0,-6 l-6,6 M166,70 l4,10" stroke="#ff2d55" stroke-width="3" stroke-linecap="round" opacity=".9"/>` : '';
  return `<svg viewBox="0 0 240 300" class="chara" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="${id}h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(L.hairC, 0.18)}"/><stop offset=".55" stop-color="${L.hairC}"/><stop offset="1" stop-color="${shade(L.hairC, -0.35)}"/></linearGradient>
    <linearGradient id="${id}e" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(L.eyeC, -0.55)}"/><stop offset=".6" stop-color="${L.eyeC}"/><stop offset="1" stop-color="${shade(L.eyeC, 0.45)}"/></linearGradient>
    <linearGradient id="${id}o" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${shade(L.c1, 0.15)}"/><stop offset=".6" stop-color="${L.c1}"/><stop offset="1" stop-color="${shade(L.c1, -0.4)}"/></linearGradient>
    <clipPath id="${id}f"><path d="M76,104 Q74,152 92,178 Q106,198 120,201 Q134,198 148,178 Q166,152 164,104 Q164,62 120,60 Q76,62 76,104 Z"/></clipPath>
    <filter id="${id}s"><feFlood flood-color="${skinD}"/><feComposite in2="SourceAlpha" operator="in"/></filter>
  </defs>
  ${H.back}${A.back}
  ${outfit(L.outfit, L.c1, L.c2, L.patch, id)}
  <path d="M104,184 L104,222 Q120,232 136,222 L136,184 Z" fill="${skinD}" stroke="${INK}" stroke-width="2.2"/>
  <path d="M104,196 Q120,212 136,196 L136,184 L104,184 Z" fill="${shade(skin, -0.28)}"/>
  <ellipse cx="74" cy="138" rx="8" ry="13" fill="${skin}" stroke="${INK}" stroke-width="2.2"/><ellipse cx="166" cy="138" rx="8" ry="13" fill="${skin}" stroke="${INK}" stroke-width="2.2"/>
  <path d="M76,104 Q74,152 92,178 Q106,198 120,201 Q134,198 148,178 Q166,152 164,104 Q164,62 120,60 Q76,62 76,104 Z" fill="${skin}" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>
  <g clip-path="url(#${id}f)" filter="url(#${id}s)" transform="translate(2 7)" opacity=".75">${H.front}</g>
  ${blush}
  ${eyes(L.eye, eExpr, L.eyeC, id)}
  ${brows(L.brow, expr, L.hairC)}
  <path d="M121,148 L118,160 L123,161" fill="none" stroke="${shade(skin, -0.4)}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  ${mouth(mExpr)}
  ${H.front}${A.front}${sweat}${anger}
</svg>`;
}

// 主人公の見た目（設定で選べる）
export const ME_STYLES = {
  a: { hair: 'spiky', label: 'ツンツン' },
  b: { hair: 'center', label: 'センター分け' },
  c: { hair: 'undercut', label: 'ツーブロック' },
  d: { hair: 'bob', label: 'ショート' },
};
export const ME_COLORS = ['#2a2a35', '#6b4a2f', '#c9a36b', '#3b4f8f', '#b23a48'];

export function meLook(profile = {}) {
  const st = ME_STYLES[profile.look] || ME_STYLES.a;
  return { hair: st.hair, hairC: profile.hairC || ME_COLORS[0], eye: 'normal', eyeC: '#2fa6ff', outfit: 'hoodie', c1: '#1b2233', c2: '#00e5ff', acc: ['headset'], patch: 'TF' };
}
