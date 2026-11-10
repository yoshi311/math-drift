// 立ち絵（上半身）をSVGで組み立てる：走り屋マンガ・カーアクション映画の雰囲気に寄せた劇画調
// look: { hair, hairC, skin, eye, eyeC, brow, build, gender, outfit, c1, c2, patch, acc:[], age }
//   hair: messy | fringe | center | slick | spiky | undercut | skin | long | pony | bob | wild
//   eye: normal | sharp | calm | narrow | shades     build: slim | normal | muscle
//   outfit: tee | denim | suit | leather | tank | tsunagi | business | coat | hoodie | blazer
//   acc: headset goggles cap mask earring glasses tablet scar beard stubble goatee chain tattoo bandana
// expr: normal | smile | serious | surprise | angry
let uid = 0;
const INK = '#101016';

const shade = (hex, k) => {
  const n = parseInt(hex.slice(1), 16);
  const f = v => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)));
  return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map(f).map(v => v.toString(16).padStart(2, '0')).join('');
};
const SKIN = { light: '#f3d6c1', mid: '#e8bf9f', tan: '#c99673', dark: '#94603f', pale: '#e6dde3' };

// 前髪の下端（毛先）を曲線でつなぐ
function edge(pts, curl = 5) {
  let d = '';
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    d += ` Q${((x0 + x1) / 2 + curl).toFixed(1)},${((y0 + y1) / 2 - Math.abs(x1 - x0) * .15).toFixed(1)} ${x1},${y1}`;
  }
  return d;
}
// 前髪：左こめかみ → 頭頂 → 右こめかみ → 毛先（右から左）
function frontPath(L, R, peak, tips, curl) {
  return `M${L[0]},${L[1]} C${L[0] - 6},${peak + 26} ${100},${peak} 120,${peak} C${140},${peak} ${R[0] + 6},${peak + 26} ${R[0]},${R[1]}` + edge([R, ...tips, L], curl) + 'Z';
}

// 毛束（根元 rx,ry → 毛先 tx,ty、太さ w、曲がり b）
const lk = ([rx, ry, tx, ty, w, b]) => `M${rx},${ry - 6} Q${rx - w * 1.2},${ry + 4} ${(rx + tx) / 2 - w * .7 + b},${(ry + ty) / 2} T${tx},${ty} Q${(rx + tx) / 2 + w * .7 + b},${(ry + ty) / 2} ${rx + w * 1.2},${ry + 4} Z`;

const HAIR = {
  messy: { locks: [[100,50,82,126,8,-7],[110,46,96,118,8,-5],[120,44,112,124,8,-2],[130,46,128,114,8,3],[140,50,146,124,8,6],[150,56,162,134,7,8],[92,58,74,140,7,-9],[116,52,104,28,7,-5],[128,52,142,30,7,5]], back: 'M70,152 C60,96 78,38 120,35 C162,46 182,96 170,152 Z',
    front: frontPath([74, 130], [166, 128], 36, [[160, 108], [154, 122], [146, 98], [138, 118], [128, 96], [120, 116], [110, 94], [101, 116], [92, 100], [86, 120], [80, 106]], 4) },
  fringe: { locks: [[98,48,80,142,9,-9],[108,46,94,134,9,-7],[118,44,110,148,8,-4],[127,44,126,132,8,1],[136,46,142,144,9,5],[146,50,156,130,8,8],[154,58,168,146,7,10]], back: 'M68,160 C58,96 78,36 120,33 C162,44 184,96 172,160 Z',
    front: frontPath([72, 140], [168, 136], 34, [[162, 116], [156, 134], [148, 108], [140, 128], [132, 104], [124, 140], [114, 106], [104, 126], [96, 104], [86, 128], [80, 112]], 6) },
  center: { locks: [[116,46,86,124,9,-12],[112,50,78,156,9,-14],[106,56,72,184,8,-10],[124,46,154,124,9,12],[128,50,162,156,9,14],[134,56,168,184,8,10]], back: 'M64,196 C50,100 74,34 120,31 C166,42 190,100 176,196 L160,200 L160,150 L80,150 L80,200Z',
    front: frontPath([70, 168], [170, 168], 32, [[164, 140], [156, 116], [146, 96], [132, 76], [122, 66], [116, 74], [104, 92], [92, 112], [82, 136], [76, 156]], 3) },
  slick: { locks: [[96,96,104,44,6,-4],[112,90,118,40,6,-2],[128,90,134,40,6,2],[144,96,146,46,6,4]], back: 'M70,146 C60,92 78,36 120,33 C162,44 182,92 170,146 Z',
    front: `M76,116 C70,66 96,42 122,42 C150,42 170,64 164,114 Q156,90 136,86 Q120,84 104,88 Q86,92 76,116Z` },
  spiky: { locks: [[110,56,96,24,8,-6],[122,54,124,18,8,0],[134,56,150,26,8,6],[146,64,174,48,8,8],[98,64,70,50,8,-8],[100,52,84,124,8,-6],[118,50,112,118,8,-2],[136,52,144,120,8,5]], back: 'M68,150 L56,120 L64,92 L54,70 L80,70 L84,42 L106,56 L122,30 L136,54 L160,40 L160,68 L186,68 L178,94 L186,120 L172,150Z',
    front: frontPath([72, 128], [168, 126], 34, [[162, 104], [156, 120], [148, 92], [140, 114], [130, 88], [122, 114], [112, 88], [102, 112], [94, 92], [86, 118], [80, 100]], 2) },
  undercut: { locks: [[92,100,154,56,12,-8],[108,88,164,70,11,-6],[98,104,94,122,7,-3]], back: 'M74,140 C68,92 84,48 120,45 C156,56 172,92 166,140 Z',
    front: `M80,108 C74,58 100,36 130,38 C160,40 178,64 166,104 Q160,82 146,74 Q150,90 140,100 Q130,80 112,80 Q96,82 90,98 Q86,104 80,108Z` },
  skin: { back: '', front: '' },
  long: { locks: [[104,50,90,122,7,-5],[114,48,108,120,7,-2],[124,48,126,118,7,2],[134,50,144,122,7,5],[96,56,76,128,7,-6],[144,56,164,128,7,6]], back: 'M54,284 C36,160 58,36 120,33 C182,44 204,160 186,284 L152,276 L152,172 L88,172 L88,276Z',
    front: frontPath([72, 150], [168, 150], 32, [[164, 124], [154, 118], [146, 106], [136, 116], [128, 102], [118, 116], [108, 102], [98, 114], [88, 106], [78, 120]], 3),
    side: ['M74,120 C66,180 70,230 80,270 C86,226 88,176 90,128Z', 'M166,120 C174,180 170,230 160,270 C154,226 152,176 150,128Z'] },
  bob: { locks: [[104,50,90,122,7,-5],[114,48,108,120,7,-2],[124,48,126,118,7,2],[134,50,144,122,7,5],[96,56,76,128,7,-6],[144,56,164,128,7,6]], back: 'M60,206 C48,100 72,36 120,33 C168,44 192,100 180,206 C162,214 152,200 152,190 L88,190 C88,200 78,214 60,206Z',
    front: frontPath([72, 150], [168, 150], 32, [[162, 120], [152, 112], [142, 120], [132, 108], [122, 120], [112, 108], [102, 120], [92, 110], [82, 122]], 2),
    side: ['M72,118 C64,160 68,190 82,206 C84,176 86,150 90,124Z', 'M168,118 C176,160 172,190 158,206 C156,176 154,150 150,124Z'] },
  pony: { locks: [[104,50,92,118,7,-5],[116,48,112,116,7,-2],[128,48,132,114,7,3],[140,52,152,120,7,6],[96,58,78,124,7,-6]], back: 'M150,72 Q214,80 210,156 Q208,204 184,240 Q190,190 178,146 Q170,112 148,98Z M68,150 C58,92 78,44 120,42 C162,44 182,92 172,150Z',
    front: frontPath([72, 136], [168, 134], 32, [[162, 112], [152, 106], [144, 116], [134, 100], [124, 114], [114, 100], [104, 114], [94, 104], [84, 118]], 2),
    side: ['M74,120 C68,150 72,172 82,190 C84,166 86,146 88,126Z'] },
  wild: { locks: [[98,44,74,146,10,-10],[110,40,96,138,10,-7],[122,38,120,132,10,0],[134,40,146,140,10,7],[146,46,166,148,10,10]], back: 'M46,246 C26,150 48,28 120,25 C192,36 214,150 194,246 C178,230 172,200 168,170 L72,170 C68,200 62,230 46,246Z',
    front: frontPath([70, 150], [170, 150], 30, [[166, 124], [160, 140], [152, 100], [144, 126], [134, 94], [124, 120], [112, 92], [102, 122], [92, 98], [84, 132], [76, 112]], 7),
    side: ['M72,124 C62,170 66,200 74,222 C80,196 84,166 88,132Z', 'M168,124 C178,170 174,200 166,222 C160,196 156,166 152,132Z'] },
};

// 目
function eye(cx, side, L, expr) {
  const cy = 136, fem = L.gender === 'f';
  if (L.eye === 'shades') return '';
  const w = fem ? 12.5 : 12;
  let h = { normal: 5.6, sharp: 5, calm: 3.8, narrow: 3.2 }[L.eye] || 5.4;
  let tilt = { sharp: -3, calm: 1.2, narrow: -1 }[L.eye] || -.6;
  let lowUp = 0, inner = 0;
  if (fem) h += 1.2;
  if (expr === 'smile') { lowUp = 1.8; h *= .85; }
  if (expr === 'surprise') h *= 1.45;
  if (expr === 'angry') { h *= .8; inner = 2.2; }
  if (expr === 'serious') { h *= .88; inner = 1.2; }
  const ix = cx - side * w, ox = cx + side * w, oy = cy + tilt;
  const up = `M${ix},${cy + inner * .4} Q${cx - side * 2},${cy - h * 1.7 + inner * .6} ${ox},${oy}`;
  const low = `Q${cx},${cy + h * .95 - lowUp} ${ix},${cy + inner * .4}`;
  const ir = Math.max(3.6, Math.min(5.4, h * 1.02)), icx = cx + side * .6, icy = cy + .4;
  const id = 'e' + (++uid);
  return `<defs><clipPath id="${id}"><path d="${up} ${low}Z"/></clipPath></defs>
    <path d="${up} ${low}Z" fill="#f2eee8"/>
    <g clip-path="url(#${id})">
      <circle cx="${icx}" cy="${icy}" r="${ir}" fill="${shade(L.eyeC, -.25)}"/>
      <circle cx="${icx}" cy="${icy + ir * .25}" r="${ir * .7}" fill="${shade(L.eyeC, .15)}" opacity=".55"/>
      <circle cx="${icx}" cy="${icy}" r="${ir * .45}" fill="${INK}"/>
      <path d="${up}" fill="none" stroke="${INK}" stroke-width="5" opacity=".28"/>
      <circle cx="${icx - 1.6}" cy="${icy - 1.6}" r="1.1" fill="#fff"/>
    </g>
    <path d="${up} L${ox + side * (fem ? 4 : 2.5)},${oy + (fem ? -0.5 : 1.5)}" fill="none" stroke="${INK}" stroke-width="${fem ? 3.2 : 2.8}" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M${cx - side * 4},${cy + h * .95 - lowUp + .6} Q${cx + side * 6},${cy + h * .9 - lowUp + .6} ${ox - side * 1},${oy + 1.6}" fill="none" stroke="${INK}" stroke-width=".9" opacity=".55"/>
    <path d="M${cx - side * 5},${cy - h * 1.7 - 2.6} Q${cx + side * 3},${cy - h * 1.9 - 3} ${ox - side * 1.5},${oy - 3.5}" fill="none" stroke="${INK}" stroke-width=".9" opacity=".45"/>
    ${fem ? `<path d="M${ox},${oy} l${side * 3},-3 M${ox - side * 3},${oy - 2} l${side * 2},-3.5" stroke="${INK}" stroke-width="1.2" stroke-linecap="round"/>` : ''}`;
}

function brows(L, expr) {
  const c = shade(L.hairC === '#e9edf5' || L.hair === 'skin' ? '#4a3a30' : L.hairC, -.45);
  let y = 119, inner = 0, outer = 0;
  if (L.eye === 'sharp') { inner = 2; outer = -2; }
  if (expr === 'angry') { inner += 7; outer -= 2.5; }
  if (expr === 'serious') inner += 2;
  if (expr === 'surprise') { y -= 4; inner -= 1.5; }
  if (expr === 'smile') y -= 1;
  const th = L.gender === 'f' ? 2.4 : (L.brow === 'thick' ? 4.6 : 3.6);
  const b = (ix, ox) => `<path d="M${ix},${y + inner + th / 2} Q${(ix + ox) / 2},${y - 3 + (inner + outer) / 2} ${ox},${y + outer + 2} L${ox},${y + outer + 2 - th * .6} Q${(ix + ox) / 2},${y - 3 - th + (inner + outer) / 2} ${ix},${y + inner - th / 2}Z" fill="${c}"/>`;
  return b(113, 87) + b(127, 153);
}

function nose(L, skinD) {
  const s = shade(skinD, -.2);
  return `<path d="M124,139 Q127,151 127.5,159" fill="none" stroke="${s}" stroke-width="1.6" opacity=".7"/>
    <path d="M125,152 Q131,158 128,164 L123,164Z" fill="${skinD}" opacity=".7"/>
    <path d="M114.5,163 Q119,167.5 126.5,164.5" fill="none" stroke="${INK}" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M117.5,163.8 q1.3,-1.6 3.2,-.9" fill="none" stroke="${INK}" stroke-width="1" opacity=".7"/>`;
}

function mouth(L, expr, skinD) {
  const fem = L.gender === 'f', lip = fem ? '#c25c5c' : shade(skinD, -.25);
  const lower = `<path d="M114,188 Q121,190.5 128,188" fill="none" stroke="${lip}" stroke-width="${fem ? 2.2 : 1.5}" opacity=".85"/>`;
  switch (expr) {
    case 'smile': return `<path d="M107,180 Q121,186 135,177" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/><path d="M134,177 l2.5,-1.8" stroke="${INK}" stroke-width="1.4" stroke-linecap="round"/>${lower}`;
    case 'serious': return `<path d="M109,182 Q121,181 133,181.5" fill="none" stroke="${INK}" stroke-width="2.1" stroke-linecap="round"/>${lower}`;
    case 'surprise': return `<path d="M115,180 Q121,177 127,180 Q128,188 121,189 Q114,188 115,180Z" fill="#5a1e24" stroke="${INK}" stroke-width="1.6"/>`;
    case 'angry': return `<path d="M107,182 Q121,176 135,182 L133,188 Q121,191 109,188Z" fill="#4a1a20" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/><path d="M109,183.5 Q121,179 133,183.5 L133,185 Q121,181.5 109,185Z" fill="#f4f0ea"/>`;
  }
  return `<path d="M109,181 Q121,183.5 133,180.5" fill="none" stroke="${INK}" stroke-width="1.9" stroke-linecap="round"/>${lower}`;
}

// 服（体型で肩幅・首の太さが変わる）
function outfit(L, id, skin, skinD) {
  const sw = { slim: 96, normal: 104, muscle: 118 }[L.build || 'normal'], nw = { slim: 16, normal: 19, muscle: 26 }[L.build || 'normal'];
  const c1 = L.c1, c2 = L.c2, d1 = shade(c1, -.4), l1 = shade(c1, .2);
  const lx = 120 - sw, rx = 120 + sw;
  const bodyD = `M${lx - 12},300 C${lx - 8},262 ${lx + 14},244 ${lx + 46},236 L${120 - nw},222 L${120 + nw},222 L${rx - 46},236 C${rx - 14},244 ${rx + 8},262 ${rx + 12},300Z`;
  const base = (fill) => `<path d="${bodyD}" fill="${fill}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>`;
  const cel = `<path d="M${rx - 30},238 C${rx + 2},248 ${rx + 10},270 ${rx + 12},300 L${rx - 26},300 C${rx - 24},276 ${rx - 30},256 ${rx - 46},244Z" fill="#000" opacity=".28"/>
    <path d="M${120 - nw + 2},226 Q120,240 ${120 + nw - 2},226 L${120 + nw},232 Q120,248 ${120 - nw},232Z" fill="#000" opacity=".22"/>`;
  const folds = `<path d="M${lx + 30},300 Q${lx + 36},274 ${lx + 52},256 M${rx - 30},300 Q${rx - 36},276 ${rx - 50},258 M108,300 Q110,284 104,270" fill="none" stroke="${INK}" stroke-width="1.3" opacity=".45"/>`;
  const patch = L.patch ? `<g transform="translate(${rx - 44} 268) rotate(-4)"><rect x="-21" y="-9" width="42" height="18" rx="2" fill="${c2}" stroke="${INK}" stroke-width="1.3"/><text x="0" y="4.5" text-anchor="middle" font-family="Orbitron,sans-serif" font-weight="900" font-size="${L.patch.length > 5 ? 7 : 9}" fill="${shade(c2, -.8)}">${L.patch}</text></g>` : '';
  const T = {
    tee: base(c1) + `<path d="M${120 - nw - 4},224 Q120,246 ${120 + nw + 4},224" fill="none" stroke="${shade(c1, -.5)}" stroke-width="4"/>` + folds + cel + patch,
    denim: base(c2) + `<path d="M${120 - nw - 2},224 Q120,244 ${120 + nw + 2},224" fill="none" stroke="${shade(c2, -.5)}" stroke-width="3"/>
      <path d="M${lx - 12},300 C${lx - 8},262 ${lx + 14},244 ${lx + 46},236 L${120 - nw - 4},224 L104,262 L108,300Z M${rx + 12},300 C${rx + 8},262 ${rx - 14},244 ${rx - 46},236 L${120 + nw + 4},224 L136,262 L132,300Z" fill="${c1}" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M${120 - nw - 4},224 L${120 - nw - 18},236 L104,262 Z M${120 + nw + 4},224 L${120 + nw + 18},236 L136,262Z" fill="${l1}" stroke="${INK}" stroke-width="1.8"/>
      <path d="M${lx + 34},268 h30 v12 h-30Z M${rx - 64},268 h30 v12 h-30Z" fill="none" stroke="${shade(c1, .45)}" stroke-width="1.2" stroke-dasharray="3 2"/>
      <circle cx="${lx + 49}" cy="276" r="1.8" fill="#d8b46a"/><circle cx="${rx - 49}" cy="276" r="1.8" fill="#d8b46a"/>` + folds + cel,
    suit: base(c1) + `<path d="M${lx - 6},270 C${lx + 6},250 ${lx + 30},240 ${120 - nw - 16},232 L${120 - nw - 12},244 C${lx + 36},252 ${lx + 14},262 ${lx - 2},284Z M${rx + 6},270 C${rx - 6},250 ${rx - 30},240 ${120 + nw + 16},232 L${120 + nw + 12},244 C${rx - 36},252 ${rx - 14},262 ${rx + 2},284Z" fill="${c2}" stroke="${INK}" stroke-width="1.4"/>
      <path d="M${120 - nw - 2},222 L${120 - nw - 4},238 Q120,246 ${120 + nw + 4},238 L${120 + nw + 2},222" fill="${d1}" stroke="${INK}" stroke-width="2"/>
      <path d="M120,244 L120,300" stroke="${INK}" stroke-width="2"/><path d="M121.5,246 L121.5,300" stroke="#c8ced8" stroke-width=".8" stroke-dasharray="2 2"/>
      <g transform="translate(${lx + 52} 270) rotate(3)"><rect x="-15" y="-7" width="30" height="14" rx="2" fill="#fff" stroke="${INK}" stroke-width="1.1"/><text x="0" y="3.5" text-anchor="middle" font-family="Orbitron,sans-serif" font-weight="900" font-size="7" fill="#c8102e">GLJ</text></g>` + folds + cel + patch,
    leather: base(c1) + `<path d="M${120 - nw},224 L120,262 L${120 + nw},224" fill="${c2}" stroke="${INK}" stroke-width="1.8"/>
      <path d="M${120 - nw - 2},224 L${120 - nw - 26},238 L${lx + 52},262 L112,258 L120,262Z" fill="${l1}" stroke="${INK}" stroke-width="2"/><path d="M${120 + nw + 2},224 L${120 + nw + 24},238 L${rx - 52},262 L128,264Z" fill="${l1}" stroke="${INK}" stroke-width="2"/>
      <path d="M128,264 L136,300" stroke="#c8cdd4" stroke-width="2" stroke-dasharray="2 1.5"/><path d="M${lx + 20},270 l18,-4 M${rx - 22},270 l-16,-4" stroke="${shade(c1, .35)}" stroke-width="1.6"/>` + folds + cel + patch,
    tank: base(skin) + `<path d="M${lx + 40},300 C${lx + 44},270 ${lx + 52},252 ${120 - nw - 6},240 L${120 - nw - 2},230 Q120,258 ${120 + nw + 2},230 L${120 + nw + 6},240 C${rx - 52},252 ${rx - 44},270 ${rx - 40},300Z" fill="${c1}" stroke="${INK}" stroke-width="2.2"/>
      <path d="M${lx + 8},258 Q${lx + 26},244 ${lx + 46},242 M${rx - 8},258 Q${rx - 26},244 ${rx - 46},242" fill="none" stroke="${skinD}" stroke-width="2.2"/>
      <path d="M${120 - nw - 8},236 Q${120 - 30},232 ${lx + 46},238 M${120 + nw + 8},236 Q${120 + 30},232 ${rx - 46},238" fill="none" stroke="${skinD}" stroke-width="1.6" opacity=".8"/>
      <path d="M104,262 Q120,270 136,262 M110,282 Q120,286 130,282" fill="none" stroke="${shade(c1, -.5)}" stroke-width="1.3" opacity=".7"/>` + cel,
    tsunagi: base(c1) + `<path d="M${120 - nw - 2},222 L120,258 L${120 + nw + 2},222" fill="#e8e4dc" stroke="${INK}" stroke-width="1.8"/>
      <path d="M${120 - nw - 6},224 L${120 - nw - 24},236 L114,268 L120,258Z M${120 + nw + 6},224 L${120 + nw + 24},236 L126,268 L120,258Z" fill="${l1}" stroke="${INK}" stroke-width="1.8"/>
      <rect x="${rx - 62}" y="268" width="32" height="22" rx="2" fill="${d1}" stroke="${INK}" stroke-width="1.4"/>` +
      (L.patch ? `<g transform="translate(${lx + 50} 276)"><rect x="-22" y="-8" width="44" height="16" rx="2" fill="#fff" stroke="${INK}" stroke-width="1.2"/><text x="0" y="4" text-anchor="middle" font-family="Orbitron,sans-serif" font-weight="900" font-size="${L.patch.length > 5 ? 7 : 8}" fill="${INK}">${L.patch}</text></g>` : '') + folds + cel,
    business: base(c1) + `<path d="M${120 - nw},222 L120,262 L${120 + nw},222" fill="#f1f1f1" stroke="${INK}" stroke-width="1.8"/><path d="M116,230 L124,230 L128,276 L120,286 L112,276Z" fill="${c2}" stroke="${INK}" stroke-width="1.4"/>
      <path d="M${120 - nw - 4},224 L114,288 L106,300 M${120 + nw + 4},224 L126,288 L134,300" fill="none" stroke="${INK}" stroke-width="2.2"/>` + folds + cel,
    coat: base(c1) + `<path d="M${120 - nw - 14},236 Q${120 - nw - 18},196 ${120 - nw + 2},192 L${120 - nw + 4},222Z M${120 + nw + 14},236 Q${120 + nw + 18},196 ${120 + nw - 2},192 L${120 + nw - 4},222Z" fill="${l1}" stroke="${INK}" stroke-width="2.2"/>
      <path d="M${120 - nw + 4},222 L120,300 L${120 + nw - 4},222" fill="${c2}" stroke="${INK}" stroke-width="1.8"/><path d="M${lx + 26},300 L${lx + 40},248 M${rx - 26},300 L${rx - 40},248" stroke="${d1}" stroke-width="3"/>` + cel,
    hoodie: base(c1) + `<path d="M${120 - nw - 28},236 Q${120 - nw - 18},206 120,208 Q${120 + nw + 18},206 ${120 + nw + 28},236 Q${120 + 16},246 120,246 Q${120 - 16},246 ${120 - nw - 28},236Z" fill="${c2}" stroke="${INK}" stroke-width="2"/>
      <path d="M104,246 L120,300 L136,246" fill="${shade(c1, -.55)}" stroke="${INK}" stroke-width="1.8"/><path d="M108,248 L106,278 M132,248 L134,278" stroke="#f2f2f2" stroke-width="2.2" stroke-linecap="round"/>` + folds + cel + patch,
    blazer: base(c1) + `<path d="M${120 - nw},222 L120,262 L${120 + nw},222" fill="#f3f5fa" stroke="${INK}" stroke-width="1.8"/><path d="M${120 - nw - 6},226 L112,282 L120,262 L${120 - nw},222Z M${120 + nw + 6},226 L128,282 L120,262 L${120 + nw},222Z" fill="${l1}" stroke="${INK}" stroke-width="1.8"/>
      <path d="M111,232 L120,240 L129,232 L126,252 L120,244 L114,252Z" fill="${c2}" stroke="${INK}" stroke-width="1.3"/>` + folds + cel,
  };
  return { svg: T[L.outfit] || T.tee, sw, nw };
}

function accessories(L, sw, nw, skinD) {
  let back = '', front = '', face = '', neck = '';
  const c = L.c2 || '#00e5ff';
  for (const a of L.acc || []) {
    if (a === 'headset') {
      back += `<path d="M70,134 Q66,44 120,40 Q174,44 170,134" fill="none" stroke="${INK}" stroke-width="8"/><path d="M70,134 Q66,44 120,40 Q174,44 170,134" fill="none" stroke="#2b3240" stroke-width="4.5"/>`;
      front += `<rect x="62" y="122" width="16" height="30" rx="6" fill="#232833" stroke="${INK}" stroke-width="2"/><rect x="66" y="128" width="3.5" height="18" rx="1.5" fill="${c}"/>
        <path d="M70,150 Q76,182 104,186" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><circle cx="106" cy="186" r="4" fill="#232833" stroke="${INK}" stroke-width="1.4"/>`;
    }
    if (a === 'goggles') front += `<path d="M72,90 Q120,74 168,90" fill="none" stroke="${INK}" stroke-width="7"/><path d="M72,90 Q120,74 168,90" fill="none" stroke="#3a3f4b" stroke-width="4"/>
      <rect x="86" y="72" width="28" height="17" rx="7" fill="#6fcff5" stroke="${INK}" stroke-width="2.2"/><rect x="126" y="72" width="28" height="17" rx="7" fill="#6fcff5" stroke="${INK}" stroke-width="2.2"/><path d="M92,77 l9,-2 M132,77 l9,-2" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/>`;
    if (a === 'cap') front += `<path d="M74,100 Q70,40 120,38 Q170,40 166,100 Z" fill="${c}" stroke="${INK}" stroke-width="2.2"/><path d="M70,100 Q120,88 188,102 Q174,114 120,106 Q84,106 70,100Z" fill="${shade(c, -.45)}" stroke="${INK}" stroke-width="2.2"/>
      <path d="M120,40 L120,98" stroke="${shade(c, -.3)}" stroke-width="1.2"/><text x="104" y="80" text-anchor="middle" font-family="Orbitron,sans-serif" font-weight="900" font-size="12" fill="#fff">${L.capText || 'TF'}</text>`;
    if (a === 'bandana') front += `<path d="M76,104 Q120,88 164,104 L164,116 Q120,100 76,116 Z" fill="${c}" stroke="${INK}" stroke-width="2"/><path d="M162,108 L184,98 L180,114Z M162,112 L182,124 L170,128Z" fill="${c}" stroke="${INK}" stroke-width="1.8"/>`;
    if (a === 'mask') face += `<path d="M78,118 Q120,104 162,118 L158,146 Q144,154 130,147 L120,140 L110,147 Q96,154 82,146 Z" fill="#f0ecf6" stroke="${INK}" stroke-width="2.4"/>
      <path d="M88,133 Q100,126 112,135 Q100,140 88,133Z M152,133 Q140,126 128,135 Q140,140 152,133Z" fill="${c}"/><path d="M82,122 Q120,110 158,122" fill="none" stroke="${c}" stroke-width="2.2"/>`;
    if (a === 'earring') front += `<circle cx="78" cy="160" r="3" fill="#e6c34a" stroke="${INK}" stroke-width="1.2"/>`;
    if (a === 'glasses') face += `<rect x="87" y="126" width="29" height="19" rx="4" fill="rgba(160,220,255,.15)" stroke="${INK}" stroke-width="2.2"/><rect x="124" y="126" width="29" height="19" rx="4" fill="rgba(160,220,255,.15)" stroke="${INK}" stroke-width="2.2"/><path d="M116,133 L124,133" stroke="${INK}" stroke-width="2"/>`;
    if (a === 'tablet') front += `<g transform="translate(150 252) rotate(-12)"><rect x="-6" y="-4" width="64" height="48" rx="6" fill="#1d2129" stroke="${INK}" stroke-width="2.2"/><rect x="0" y="2" width="52" height="36" rx="3" fill="#0b2a3a"/><path d="M4,30 L16,20 L26,26 L38,10 L48,16" fill="none" stroke="${c}" stroke-width="2.2"/></g>`;
    if (a === 'scar') face += `<path d="M146,146 L156,168 M150,152 L144,157 M153,160 L147,164" stroke="#a24f48" stroke-width="1.8" stroke-linecap="round"/>`;
    if (a === 'stubble') face += `<path d="M90,170 Q96,196 120,206 Q144,196 150,170 Q146,186 134,192 Q121,196 106,192 Q94,186 90,170Z M104,174 Q121,170 138,174 Q134,178 121,176 Q108,178 104,174Z" fill="${shade(L.hairC || '#222', -.2)}" opacity=".28"/>`;
    if (a === 'goatee') face += `<path d="M110,192 Q121,212 132,192 Q128,200 121,201 Q114,200 110,192Z M106,176 Q121,171 136,176 L134,179 Q121,175 108,179Z" fill="${shade(L.hairC, -.1)}" stroke="${INK}" stroke-width="1"/>`;
    if (a === 'beard') face += `<path d="M86,160 Q90,196 120,208 Q150,196 154,160 Q150,184 136,190 L136,184 Q121,178 106,184 L106,190 Q92,184 86,160Z" fill="${shade(L.hairC, -.05)}" stroke="${INK}" stroke-width="1.4"/>`;
    if (a === 'wrinkle') face += `<path d="M96,156 Q100,164 106,166 M144,156 Q140,164 134,166 M100,108 Q120,104 140,108" fill="none" stroke="${INK}" stroke-width="1.1" opacity=".45"/>`;
    if (a === 'chain') neck += `<path d="M${120 - nw - 4},232 Q120,272 ${120 + nw + 4},232" fill="none" stroke="#e1c15a" stroke-width="2.4" stroke-dasharray="3 1.5"/><path d="M120,258 l-4,8 l4,4 l4,-4Z" fill="#e1c15a" stroke="${INK}" stroke-width="1"/>`;
    if (a === 'tattoo') neck += `<path d="M${120 - nw + 2},196 q-8,10 -2,18 q-10,4 -6,14 M${120 - nw - 4},214 q-10,0 -14,10 M${120 - sw + 22},252 q8,-12 20,-8 q-6,8 4,14 q-12,2 -14,12 q-4,-8 -10,-4" fill="none" stroke="#1f3a52" stroke-width="2.6" stroke-linecap="round" opacity=".85"/>`;
  }
  return { back, front, face, neck };
}

export function charaSVG(look = {}, expr = 'normal') {
  const id = 'ch' + (++uid);
  const L = { hair: 'messy', hairC: '#24242c', skin: 'light', eye: 'normal', eyeC: '#3a5f8a', brow: 'normal', build: 'normal', outfit: 'tee', c1: '#2b3245', c2: '#00e5ff', acc: [], ...look };
  const skin = SKIN[L.skin] || L.skin, skinD = shade(skin, -.2), skinDD = shade(skin, -.34);
  const fem = L.gender === 'f';
  const H = HAIR[L.hair] || HAIR.messy;
  const O = outfit(L, id, skin, skinD), A = accessories(L, O.sw, O.nw, skinD);
  const nw = O.nw;
  // 顔の輪郭（女性はあごを細く）
  const face = fem ? 'M82,110 C82,142 88,166 98,182 C106,196 113,203 120,204 C127,203 134,196 142,182 C152,166 158,142 158,110 C158,72 141,56 120,56 C99,56 82,72 82,110Z'
    : 'M80,110 C80,140 83,160 90,177 C98,193 109,203 120,206 C131,203 142,193 150,177 C157,160 160,140 160,110 C160,72 142,55 120,55 C98,55 80,72 80,110Z';
  const hc = L.hairC, hd = shade(hc, -.38), hl = shade(hc, .42);
  const hairBack = H.back ? `<path d="${H.back}" fill="url(#${id}h)" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>` : '';
  const sides = (H.side || []).map(p => `<path d="${p}" fill="url(#${id}h)" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>`).join('');
  let hairFront = '';
  if (H.front) {
    hairFront = `<path d="${H.front}" fill="url(#${id}h)" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
      <g clip-path="url(#${id}hf)">
        ${(H.locks || []).map(l => `<path d="${lk(l)}" fill="url(#${id}h)" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/><path d="M${l[0] - l[4] * .2},${l[1] + 4} Q${(l[0] + l[2]) / 2 - l[4] * .4 + l[5]},${(l[1] + l[3]) / 2} ${l[2] + (l[0] - l[2]) * .15},${l[3] - (l[3] - l[1]) * .15}" fill="none" stroke="${hl}" stroke-width="1.4" opacity=".55"/>`).join('')}
        <path d="M128,20 C150,60 160,100 176,170 L200,170 L200,20Z" fill="${hd}" opacity=".45"/>
        <path d="M84,70 Q104,52 132,56" fill="none" stroke="${hl}" stroke-width="6" stroke-linecap="round" stroke-dasharray="9 5" opacity=".8"/>
        <path d="M96,58 C100,80 98,100 92,118 M118,52 C120,80 118,100 112,120 M140,56 C140,80 142,100 150,116 M108,54 C112,74 108,96 104,110 M130,52 C132,76 132,98 132,112" fill="none" stroke="${hd}" stroke-width="1.3" opacity=".8"/>
      </g>`;
  }
  const skinHead = L.hair === 'skin' ? `<path d="M80,108 C80,68 98,52 120,52 C142,52 160,68 160,108 C158,82 142,64 120,64 C98,64 82,82 80,108Z" fill="${skinD}" opacity=".35"/><ellipse cx="104" cy="72" rx="14" ry="6" fill="#fff" opacity=".35" transform="rotate(-20 104 72)"/>` : '';
  const shades = L.eye === 'shades' ? `<path d="M83,127 L117,126 Q118,140 108,146 Q92,148 86,140Z M123,126 L157,127 Q154,140 148,146 Q132,148 124,140Z" fill="#0a0c12" stroke="${INK}" stroke-width="2.2"/><path d="M117,129 L123,129" stroke="${INK}" stroke-width="2.6"/><path d="M88,131 L104,130 M128,130 L146,131" stroke="#8fd8ff" stroke-width="1.6" opacity=".6"/><path d="M80,128 L70,126 M160,128 L170,126" stroke="${INK}" stroke-width="2"/>` : '';
  const anger = expr === 'angry' ? `<path d="M108,124 l4,3 M132,124 l-4,3" stroke="${INK}" stroke-width="1.4" opacity=".6"/>` : '';
  const sweat = expr === 'surprise' ? `<path d="M164,108 Q170,120 164,126 Q158,120 164,108Z" fill="#9fe3ff" stroke="${INK}" stroke-width="1.2"/>` : '';
  const neckW = nw - 3;

  return `<svg viewBox="0 0 240 300" class="chara" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="${id}h" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${shade(hc, .16)}"/><stop offset=".55" stop-color="${hc}"/><stop offset="1" stop-color="${shade(hc, -.42)}"/></linearGradient>
    <linearGradient id="${id}sk" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${shade(skin, .06)}"/><stop offset=".62" stop-color="${skin}"/><stop offset="1" stop-color="${skinD}"/></linearGradient>
    <clipPath id="${id}f"><path d="${face}"/></clipPath>
    ${H.front ? `<clipPath id="${id}hf"><path d="${H.front} ${(H.locks || []).map(lk).join(' ')}"/></clipPath>` : ''}
    <filter id="${id}s"><feFlood flood-color="${skinDD}"/><feComposite in2="SourceAlpha" operator="in"/></filter>
  </defs>
  ${hairBack}${A.back}
  <path d="M${120 - neckW},176 L${120 - neckW - 1},226 Q120,238 ${120 + neckW + 1},226 L${120 + neckW},176 Z" fill="url(#${id}sk)" stroke="${INK}" stroke-width="2.2"/>
  <path d="M${120 - neckW},176 L${120 + neckW},176 L${120 + neckW},206 Q120,192 ${120 - neckW},200Z" fill="${skinDD}" opacity=".75"/>
  <path d="M${120 - neckW + 5},206 Q${120 - 6},218 ${120 - 2},230 M${120 + neckW - 5},206 Q${120 + 6},218 ${120 + 2},230" fill="none" stroke="${skinDD}" stroke-width="1.5" opacity=".9"/>
  ${O.svg}
  ${A.neck}
  <path d="M80,124 Q72,124 72,138 Q73,154 84,158Z" fill="${skin}" stroke="${INK}" stroke-width="2"/><path d="M160,124 Q168,124 168,138 Q167,154 156,158Z" fill="${skinD}" stroke="${INK}" stroke-width="2"/>
  <path d="${face}" fill="url(#${id}sk)" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>
  <g clip-path="url(#${id}f)">
    <path d="M140,62 C158,84 164,118 160,150 C156,176 144,198 122,208 L170,208 L170,62Z" fill="${skinD}" opacity=".85"/>
    <path d="M141,64 C156,90 158,126 152,156 C148,178 138,196 124,206 C140,186 146,162 147,134 C148,106 146,84 141,64Z" fill="${skinDD}" opacity=".35"/>
    ${H.front ? `<g filter="url(#${id}s)" transform="translate(2 7)" opacity=".7"><path d="${H.front} ${(H.locks || []).map(lk).join(' ')}"/></g>` : ''}
    ${!fem ? `<path d="M88,150 Q93,160 99,163" fill="none" stroke="${skinDD}" stroke-width="1.2" opacity=".6"/>` : `<ellipse cx="96" cy="160" rx="8" ry="3.5" fill="#ff8a8a" opacity=".25"/><ellipse cx="144" cy="160" rx="8" ry="3.5" fill="#ff8a8a" opacity=".2"/>`}
    <path d="M104,198 Q120,210 136,198 L136,214 L104,214Z" fill="${skinDD}" opacity=".35"/>
  </g>
  ${skinHead}
  ${eye(101, -1, L, expr)}${eye(139, 1, L, expr)}
  ${brows(L, expr)}
  ${nose(L, skinD)}
  ${mouth(L, expr, skinD)}
  ${A.face}${shades}
  ${sides}${hairFront}${A.front}${anger}${sweat}
</svg>`;
}

// 主人公の見た目（設定で選べる）
export const ME_STYLES = {
  a: { hair: 'messy', label: '無造作ショート' },
  b: { hair: 'fringe', label: '長めの前髪' },
  c: { hair: 'undercut', label: 'ツーブロック' },
  d: { hair: 'center', label: 'センター分け' },
};
export const ME_COLORS = ['#22222a', '#5a3d28', '#b08a5a', '#34466e', '#8e2c3a'];

export function meLook(profile = {}) {
  const st = ME_STYLES[profile.look] || ME_STYLES.a;
  return { hair: st.hair, hairC: profile.hairC || ME_COLORS[0], eye: 'normal', eyeC: '#3b6f9e', build: 'slim', outfit: 'hoodie', c1: '#1b2233', c2: '#00e5ff', acc: ['headset'], patch: 'TF' };
}
