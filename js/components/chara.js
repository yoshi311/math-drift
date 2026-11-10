// 立ち絵（上半身）：斜め45°の顔・片側を影で落とすライティング・逆光のリムライト・細い主線・重ね着
// look: { hair, hairC, skin, eye, eyeC, brow, build, gender, outfit, c1, c2, rim, inner, patch, acc:[], dir }
//   outfit: tee | denim | ma1 | suit | suitopen | leather | tank | tsunagi | business | coat | hoodie | blazer
//   acc: headset goggles cap mask earring glasses tablet scar stubble goatee beard wrinkle chain dogtag shadesHung tattoo bandana
// expr: normal | smile | serious | surprise | angry　　dir: 1=右向き / -1=左向き
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

// ===== 斜め45°の顔（画面右向き。dir=-1 で左右反転） =====
const FACE_M = 'M118,57 C138,58 152,74 155,96 C157,108 158,116 157,122 C155,128 153,131 154,136 C157,146 157,152 154,160 C152,168 151,174 147,182 C143,192 137,201 127,205 C118,207 108,202 100,194 C93,187 88,176 85,164 C81,150 79,134 80,116 C81,82 96,57 118,57Z';
const FACE_F = 'M118,58 C137,59 151,74 154,96 C156,110 156,118 155,124 C153,130 152,133 153,138 C155,148 154,156 151,164 C148,174 144,184 138,193 C132,201 125,204 119,204 C111,203 104,198 98,191 C91,182 87,170 84,158 C81,144 80,130 81,116 C82,82 97,58 118,58Z';
const RIM_FACE = 'M101,66 C87,80 81,98 81,116 C80,134 82,150 86,164 C89,176 94,187 101,194';
const SHADE_FAR = 'M140,60 C148,74 151,96 150,116 C149,128 147,136 147,142 Q150,152 153,161 L146,167 Q147,176 143,184 C139,194 133,202 123,208 L174,216 L174,56Z';

// 目（cx 中心、side=-1 は内側が右、ws 横幅の倍率）
function eye(cx, side, L, expr, ws = 1) {
  const cy = 136, fem = L.gender === 'f';
  if (L.eye === 'shades') return '';
  const w = (fem ? 12.5 : 12) * ws;
  let h = { normal: 5.4, sharp: 4.8, calm: 3.7, narrow: 3.1 }[L.eye] || 5.2;
  let tilt = { sharp: -3, calm: 1.2, narrow: -1 }[L.eye] || -.6;
  let lowUp = 0, inner = 0;
  if (fem) h += 1.1;
  if (expr === 'smile') { lowUp = 1.8; h *= .85; }
  if (expr === 'surprise') h *= 1.4;
  if (expr === 'angry') { h *= .78; inner = 2.4; }
  if (expr === 'serious') { h *= .86; inner = 1.3; }
  const ix = cx - side * w, ox = cx + side * w, oy = cy + tilt;
  const up = `M${ix},${cy + inner * .4} Q${cx - side * 2 * ws},${cy - h * 1.7 + inner * .6} ${ox},${oy}`;
  const low = `Q${cx},${cy + h * .95 - lowUp} ${ix},${cy + inner * .4}`;
  const ir = Math.max(3.4, Math.min(5.2, h * 1.02)) * (ws < 1 ? .85 : 1);
  const icx = cx + (ws < 1 ? 1.5 : 3.2), icy = cy + .4; // 視線は顔の向き（右）
  const id = 'e' + (++uid);
  return `<defs><clipPath id="${id}"><path d="${up} ${low}Z"/></clipPath></defs>
    <path d="${up} ${low}Z" fill="#efebe5"/>
    <g clip-path="url(#${id})">
      <circle cx="${icx}" cy="${icy}" r="${ir}" fill="${shade(L.eyeC, -.3)}"/>
      <circle cx="${icx}" cy="${icy + ir * .3}" r="${ir * .66}" fill="${shade(L.eyeC, .2)}" opacity=".5"/>
      <circle cx="${icx}" cy="${icy}" r="${ir * .45}" fill="${INK}"/>
      <path d="${up}" fill="none" stroke="${INK}" stroke-width="5.5" opacity=".3"/>
      <circle cx="${icx - 1.4}" cy="${icy - 1.6}" r="1" fill="#fff"/>
    </g>
    <path d="${up} L${ox + side * (fem ? 3.5 : 2) * ws},${oy + (fem ? -.5 : 1.4)}" fill="none" stroke="${INK}" stroke-width="${fem ? 2.7 : 2.4}" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M${cx - side * 4 * ws},${cy + h * .95 - lowUp + .6} Q${cx + side * 6 * ws},${cy + h * .9 - lowUp + .6} ${ox - side},${oy + 1.6}" fill="none" stroke="${INK}" stroke-width=".8" opacity=".5"/>
    <path d="M${cx - side * 5 * ws},${cy - h * 1.7 - 2.6} Q${cx + side * 3 * ws},${cy - h * 1.9 - 3} ${ox - side * 1.5},${oy - 3.5}" fill="none" stroke="${INK}" stroke-width=".8" opacity=".4"/>
    ${fem ? `<path d="M${ox},${oy} l${side * 3 * ws},-3 M${ox - side * 3 * ws},${oy - 2} l${side * 2 * ws},-3.5" stroke="${INK}" stroke-width="1.1" stroke-linecap="round"/>` : ''}`;
}

function brows(L, expr) {
  const c = shade(L.hairC === '#e9edf5' || L.hair === 'skin' ? '#4a3a30' : L.hairC, -.45);
  let y = 119, inner = 0, outer = 0;
  if (L.eye === 'sharp') { inner = 2; outer = -2; }
  if (expr === 'angry') { inner += 7; outer -= 2.5; }
  if (expr === 'serious') inner += 2;
  if (expr === 'surprise') { y -= 4; inner -= 1.5; }
  if (expr === 'smile') y -= 1;
  const th = L.gender === 'f' ? 2.2 : (L.brow === 'thick' ? 4.2 : 3.3);
  const b = (ix, ox) => `<path d="M${ix},${y + inner + th / 2} Q${(ix + ox) / 2},${y - 3 + (inner + outer) / 2} ${ox},${y + outer + 2} L${ox},${y + outer + 2 - th * .6} Q${(ix + ox) / 2},${y - 3 - th + (inner + outer) / 2} ${ix},${y + inner - th / 2}Z" fill="${c}"/>`;
  return b(119, 91) + b(131, 151);
}

function nose(skinD) {
  return `<path d="M146,141 Q150,152 153,161 L147,166 Q146,156 143,146Z" fill="${shade(skinD, -.15)}" opacity=".55"/>
    <path d="M147,142 Q150.5,152 153.5,161 Q152.5,166 146.5,166.5" fill="none" stroke="${INK}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M138.5,164.5 q2.2,-2 5,-1" fill="none" stroke="${INK}" stroke-width="1" opacity=".7"/>
    <path d="M128,146 Q132,156 136,160" fill="none" stroke="${shade(skinD, -.2)}" stroke-width="1.1" opacity=".45"/>`;
}

function mouth(L, expr, skinD) {
  const fem = L.gender === 'f', lip = fem ? '#c05a5a' : shade(skinD, -.25);
  const lower = `<path d="M124,190 Q131,192 138,189.5" fill="none" stroke="${lip}" stroke-width="${fem ? 2.2 : 1.4}" opacity=".85"/>`;
  switch (expr) {
    case 'smile': return `<path d="M116,181 Q130,188 144,177" fill="none" stroke="${INK}" stroke-width="1.9" stroke-linecap="round"/><path d="M143.5,177 l2.4,-1.8" stroke="${INK}" stroke-width="1.3" stroke-linecap="round"/>${lower}`;
    case 'serious': return `<path d="M118,184 Q130,183 142,182.5" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>${lower}`;
    case 'surprise': return `<path d="M125,181 Q131,178 137,181 Q138,189 131,190 Q124,189 125,181Z" fill="#5a1e24" stroke="${INK}" stroke-width="1.5"/>`;
    case 'angry': return `<path d="M116,183 Q130,177 144,183 L142,189 Q130,192 118,189Z" fill="#4a1a20" stroke="${INK}" stroke-width="1.7" stroke-linejoin="round"/><path d="M118,184.5 Q130,180 142,184.5 L142,186 Q130,182.5 118,186Z" fill="#f4f0ea"/>`;
  }
  return `<path d="M118,183 Q131,185 143,181" fill="none" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>${lower}`;
}

// 服：近い側（左）の肩を広く、遠い側（右）を狭くして体のひねりを出す
function outfit(L, skin, skinD, rim) {
  const sw = { slim: 96, normal: 104, muscle: 118 }[L.build || 'normal'], nw = { slim: 16, normal: 19, muscle: 26 }[L.build || 'normal'];
  const c1 = L.c1, c2 = L.c2, d1 = shade(c1, -.42), l1 = shade(c1, .18);
  const cx = 118, lx = cx - sw * 1.06, rx = cx + sw * .84, nl = cx - nw - 4, nr = cx + nw * .85 - 2;
  const bodyD = `M${lx - 14},300 C${lx - 10},262 ${lx + 12},244 ${lx + 46},236 L${nl},222 L${nr},222 L${rx - 40},234 C${rx - 12},242 ${rx + 6},262 ${rx + 10},300Z`;
  const base = fill => `<path d="${bodyD}" fill="${fill}" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>`;
  const cel = `<path d="M${cx + 18},226 L${rx - 40},234 C${rx - 12},242 ${rx + 6},262 ${rx + 10},300 L${cx + 26},300 C${cx + 30},270 ${cx + 26},246 ${cx + 18},226Z" fill="#000" opacity=".34"/>
    <path d="M${nl + 2},226 Q${cx},242 ${nr - 2},226 L${nr},233 Q${cx},250 ${nl},233Z" fill="#000" opacity=".25"/>`;
  const rimL = `<path d="M${lx - 12},298 C${lx - 8},262 ${lx + 12},245 ${lx + 46},237" fill="none" stroke="${rim}" stroke-width="2.6" opacity=".85" stroke-linecap="round"/>`;
  const folds = `<path d="M${lx + 30},300 Q${lx + 36},274 ${lx + 52},256 M${cx + 40},300 Q${cx + 36},280 ${cx + 46},262 M${cx - 12},300 Q${cx - 10},284 ${cx - 16},270" fill="none" stroke="${INK}" stroke-width="1.1" opacity=".4"/>`;
  const patches = [];
  if (L.patch) patches.push({ x: lx + 56, y: 270, rot: 4, fill: c2, text: L.patch });
  const zip = (x0, x1) => `<path d="M${x0},244 L${x1},300" stroke="${INK}" stroke-width="1.6"/><path d="M${x0 + 1.5},246 L${x1 + 1.5},300" stroke="#c8ced8" stroke-width=".8" stroke-dasharray="2 2"/>`;
  const T = {
    tee: () => base(c1) + `<path d="M${nl - 2},224 Q${cx},246 ${nr + 2},224" fill="none" stroke="${shade(c1, -.5)}" stroke-width="3.5"/>` + folds,
    denim: () => base(c2) + `<path d="M${nl},224 Q${cx},244 ${nr},224" fill="none" stroke="${shade(c2, -.5)}" stroke-width="3"/>
      <path d="M${lx - 14},300 C${lx - 10},262 ${lx + 12},244 ${lx + 46},236 L${nl - 4},222 L${cx - 10},262 L${cx - 6},300Z M${rx + 10},300 C${rx + 6},262 ${rx - 12},242 ${rx - 40},234 L${nr + 4},222 L${cx + 22},262 L${cx + 20},300Z" fill="${c1}" stroke="${INK}" stroke-width="1.7" stroke-linejoin="round"/>
      <path d="M${nl - 4},222 L${nl - 20},236 L${cx - 10},262Z M${nr + 4},222 L${nr + 16},234 L${cx + 22},262Z" fill="${l1}" stroke="${INK}" stroke-width="1.4"/>
      <path d="M${lx + 34},268 h30 v12 h-30Z" fill="none" stroke="${shade(c1, .45)}" stroke-width="1.1" stroke-dasharray="3 2"/>` + folds,
    ma1: () => base(c2) + `<path d="M${lx - 14},300 C${lx - 10},262 ${lx + 12},244 ${lx + 46},236 L${nl - 6},224 Q${cx - 6},250 ${cx - 4},300Z M${rx + 10},300 C${rx + 6},262 ${rx - 12},242 ${rx - 40},234 L${nr + 6},224 Q${cx + 22},250 ${cx + 22},300Z" fill="${c1}" stroke="${INK}" stroke-width="1.7" stroke-linejoin="round"/>
      <path d="M${nl - 10},230 Q${cx},212 ${nr + 10},230 L${nr + 6},224 Q${cx},206 ${nl - 6},224Z" fill="${d1}" stroke="${INK}" stroke-width="1.4"/>
      <path d="M${nl},226 Q${cx},244 ${nr},226 Q${cx + 4},262 ${cx},300 L${cx - 2},300 Q${cx - 6},262 ${nl},226Z" fill="${shade(c2, -.25)}" opacity=".6"/>
      <path d="M${cx - 6},250 L${cx - 8},280 M${cx + 8},250 L${cx + 10},280" stroke="#eee" stroke-width="2" stroke-linecap="round"/>
      <rect x="${lx + 30}" y="258" width="22" height="10" rx="2" fill="#d97a22" stroke="${INK}" stroke-width="1"/>
      <path d="M${cx - 4},262 L${cx - 2},300 M${cx + 22},262 L${cx + 22},300" stroke="#c9ced6" stroke-width="1.6" stroke-dasharray="2 1.5"/>` + folds,
    suit: () => base(c1) + `<path d="M${lx - 8},270 C${lx + 4},250 ${lx + 30},240 ${nl - 12},232 L${nl - 8},244 C${lx + 36},252 ${lx + 14},262 ${lx - 4},284Z M${rx + 6},268 C${rx - 4},250 ${rx - 24},240 ${nr + 12},232 L${nr + 8},244 C${rx - 28},252 ${rx - 10},262 ${rx + 2},280Z" fill="${c2}" stroke="${INK}" stroke-width="1.2"/>
      <path d="M${nl + 2},222 L${nl},238 Q${cx},246 ${nr},238 L${nr - 2},222" fill="${d1}" stroke="${INK}" stroke-width="1.6"/>` + zip(cx + 4, cx + 8) + folds,
    suitopen: () => base(L.inner || '#1a1a1a') + `<path d="M${nl - 2},224 Q${cx},248 ${nr + 2},224" fill="none" stroke="#000" stroke-width="3" opacity=".6"/>
      <path d="M${lx - 14},300 C${lx - 10},262 ${lx + 12},244 ${lx + 46},236 L${nl - 2},222 L${cx - 16},258 L${cx - 18},300Z M${rx + 10},300 C${rx + 6},262 ${rx - 12},242 ${rx - 40},234 L${nr + 2},222 L${cx + 26},258 L${cx + 26},300Z" fill="${c1}" stroke="${INK}" stroke-width="1.7" stroke-linejoin="round"/>
      <path d="M${lx - 8},270 C${lx + 4},250 ${lx + 30},240 ${nl - 10},232 L${nl - 6},242 C${lx + 36},252 ${lx + 14},262 ${lx - 4},284Z" fill="${c2}" stroke="${INK}" stroke-width="1.1"/>
      <path d="M${nl - 2},222 L${nl - 14},234 L${cx - 16},258Z M${nr + 2},222 L${nr + 12},232 L${cx + 26},258Z" fill="${d1}" stroke="${INK}" stroke-width="1.2"/>
      <path d="M${cx - 16},258 L${cx - 18},300 M${cx + 26},258 L${cx + 26},300" stroke="#c9ced6" stroke-width="1.4" stroke-dasharray="2 1.5"/>`,
    leather: () => base(c1) + `<path d="M${nl},224 L${cx},262 L${nr},224" fill="${c2}" stroke="${INK}" stroke-width="1.5"/>
      <path d="M${nl - 2},224 L${nl - 28},238 L${lx + 54},262 L${cx - 8},258 L${cx},262Z" fill="${l1}" stroke="${INK}" stroke-width="1.6"/><path d="M${nr + 2},224 L${nr + 20},236 L${rx - 44},262 L${cx + 8},264Z" fill="${l1}" stroke="${INK}" stroke-width="1.6"/>
      <path d="M${cx + 8},264 L${cx + 16},300" stroke="#c8cdd4" stroke-width="1.8" stroke-dasharray="2 1.5"/><path d="M${lx + 20},270 l18,-4" stroke="${shade(c1, .35)}" stroke-width="1.4"/>` + folds,
    tank: () => base(skin) + `<path d="M${lx + 40},300 C${lx + 44},270 ${lx + 52},252 ${nl - 4},240 L${nl},230 Q${cx},258 ${nr},230 L${nr + 4},240 C${rx - 46},252 ${rx - 40},270 ${rx - 36},300Z" fill="${c1}" stroke="${INK}" stroke-width="1.8"/>
      <path d="M${lx + 8},258 Q${lx + 26},244 ${lx + 46},242 M${rx - 6},258 Q${rx - 22},246 ${rx - 40},242" fill="none" stroke="${skinD}" stroke-width="2"/>
      <path d="M${nl - 6},236 Q${cx - 30},232 ${lx + 46},238" fill="none" stroke="${skinD}" stroke-width="1.5" opacity=".8"/>`,
    tsunagi: () => base(c1) + `<path d="M${nl},222 L${cx + 2},258 L${nr},222" fill="#e8e4dc" stroke="${INK}" stroke-width="1.5"/>
      <path d="M${nl - 4},224 L${nl - 22},236 L${cx - 4},268 L${cx + 2},258Z M${nr + 4},224 L${nr + 18},234 L${cx + 8},268 L${cx + 2},258Z" fill="${l1}" stroke="${INK}" stroke-width="1.5"/>
      <rect x="${rx - 56}" y="268" width="28" height="20" rx="2" fill="${d1}" stroke="${INK}" stroke-width="1.2"/>` + folds,
    business: () => base(c1) + `<path d="M${nl},222 L${cx + 2},262 L${nr},222" fill="#f1f1f1" stroke="${INK}" stroke-width="1.5"/><path d="M${cx - 2},230 L${cx + 6},230 L${cx + 10},276 L${cx + 2},286 L${cx - 6},276Z" fill="${c2}" stroke="${INK}" stroke-width="1.2"/>
      <path d="M${nl - 4},224 L${cx - 4},288 L${cx - 12},300 M${nr + 4},224 L${cx + 8},288 L${cx + 14},300" fill="none" stroke="${INK}" stroke-width="1.8"/>` + folds,
    coat: () => base(c1) + `<path d="M${nl - 12},236 Q${nl - 16},196 ${nl + 6},192 L${nl + 8},222Z M${nr + 12},236 Q${nr + 14},198 ${nr - 4},194 L${nr - 6},222Z" fill="${l1}" stroke="${INK}" stroke-width="1.8"/>
      <path d="M${nl + 8},222 L${cx + 2},300 L${nr - 6},222" fill="${c2}" stroke="${INK}" stroke-width="1.5"/><path d="M${lx + 26},300 L${lx + 40},248" stroke="${d1}" stroke-width="2.6"/>`,
    hoodie: () => base(c1) + `<path d="M${nl - 26},236 Q${nl - 14},206 ${cx},208 Q${nr + 14},206 ${nr + 22},234 Q${cx + 16},246 ${cx},246 Q${cx - 16},246 ${nl - 26},236Z" fill="${c2}" stroke="${INK}" stroke-width="1.6"/>
      <path d="M${cx - 12},246 L${cx + 2},300 L${cx + 16},246" fill="${shade(c1, -.55)}" stroke="${INK}" stroke-width="1.5"/><path d="M${cx - 8},248 L${cx - 10},278 M${cx + 12},248 L${cx + 14},278" stroke="#f2f2f2" stroke-width="2" stroke-linecap="round"/>` + folds,
    blazer: () => base(c1) + `<path d="M${nl},222 L${cx + 2},262 L${nr},222" fill="#f3f5fa" stroke="${INK}" stroke-width="1.5"/><path d="M${nl - 6},226 L${cx - 6},282 L${cx + 2},262 L${nl},222Z M${nr + 6},226 L${cx + 10},282 L${cx + 2},262 L${nr},222Z" fill="${l1}" stroke="${INK}" stroke-width="1.5"/>
      <path d="M${cx - 7},232 L${cx + 2},240 L${cx + 11},232 L${cx + 8},252 L${cx + 2},244 L${cx - 4},252Z" fill="${c2}" stroke="${INK}" stroke-width="1.1"/>` + folds,
  };
  return { svg: (T[L.outfit] || T.tee)() + cel + rimL, patches, sw, nw, cx, lx, rx, nl, nr };
}

function accessories(L, O, skinD) {
  let back = '', front = '', face = '', neck = '';
  const c = L.c2 || '#00e5ff';
  for (const a of L.acc || []) {
    if (a === 'headset') {
      back += `<path d="M74,136 Q70,44 118,40 Q160,44 162,120" fill="none" stroke="${INK}" stroke-width="7"/><path d="M74,136 Q70,44 118,40 Q160,44 162,120" fill="none" stroke="#2b3240" stroke-width="4"/>`;
      front += `<rect x="64" y="124" width="15" height="28" rx="6" fill="#232833" stroke="${INK}" stroke-width="1.6"/><rect x="68" y="130" width="3" height="16" rx="1.5" fill="${c}"/>
        <path d="M72,150 Q80,184 112,186" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/><circle cx="114" cy="186" r="3.6" fill="#232833" stroke="${INK}" stroke-width="1.2"/>`;
    }
    if (a === 'goggles') front += `<path d="M76,92 Q118,76 158,88" fill="none" stroke="${INK}" stroke-width="6"/><path d="M76,92 Q118,76 158,88" fill="none" stroke="#3a3f4b" stroke-width="3.5"/>
      <rect x="92" y="72" width="27" height="16" rx="7" fill="#6fcff5" stroke="${INK}" stroke-width="1.8"/><rect x="130" y="72" width="20" height="15" rx="6" fill="#6fcff5" stroke="${INK}" stroke-width="1.8"/><path d="M97,77 l8,-2" stroke="#fff" stroke-width="2" stroke-linecap="round"/>`;
    if (a === 'cap') front += `<path d="M76,102 Q72,40 118,38 Q162,40 160,100 Z" fill="${c}" stroke="${INK}" stroke-width="1.8"/><path d="M118,96 Q150,90 196,102 Q184,114 140,108 Q122,106 118,96Z" fill="${shade(c, -.45)}" stroke="${INK}" stroke-width="1.8"/>
      <path d="M124,40 L130,96" stroke="${shade(c, -.3)}" stroke-width="1.1"/><text x="104" y="80" text-anchor="middle" font-family="Orbitron,sans-serif" font-weight="900" font-size="11" fill="#fff">${L.capText || 'TF'}</text>`;
    if (a === 'bandana') front += `<path d="M80,106 Q120,90 158,102 L158,114 Q120,102 80,118 Z" fill="${c}" stroke="${INK}" stroke-width="1.6"/><path d="M82,108 L62,98 L66,114Z M82,112 L64,124 L76,128Z" fill="${c}" stroke="${INK}" stroke-width="1.5"/>`;
    if (a === 'mask') face += `<path d="M84,120 Q120,106 158,118 L156,142 Q146,152 134,146 L128,140 L116,148 Q98,154 86,146 Z" fill="#f0ecf6" stroke="${INK}" stroke-width="2"/>
      <path d="M94,134 Q106,126 118,136 Q106,141 94,134Z M148,133 Q140,127 132,135 Q140,139 148,133Z" fill="${c}"/><path d="M86,124 Q120,112 156,122" fill="none" stroke="${c}" stroke-width="2"/>`;
    if (a === 'earring') front += `<circle cx="80" cy="161" r="2.8" fill="#e6c34a" stroke="${INK}" stroke-width="1"/>`;
    if (a === 'glasses') face += `<rect x="92" y="127" width="28" height="18" rx="4" fill="rgba(160,220,255,.15)" stroke="${INK}" stroke-width="1.8"/><rect x="132" y="127" width="19" height="17" rx="4" fill="rgba(160,220,255,.15)" stroke="${INK}" stroke-width="1.8"/><path d="M120,133 L132,133 M92,131 L82,128" stroke="${INK}" stroke-width="1.6"/>`;
    if (a === 'tablet') front += `<g transform="translate(150 252) rotate(-12)"><rect x="-6" y="-4" width="64" height="48" rx="6" fill="#1d2129" stroke="${INK}" stroke-width="1.8"/><rect x="0" y="2" width="52" height="36" rx="3" fill="#0b2a3a"/><path d="M4,30 L16,20 L26,26 L38,10 L48,16" fill="none" stroke="${c}" stroke-width="2"/></g>`;
    if (a === 'scar') face += `<path d="M94,146 L102,168 M97,152 L91,157 M100,160 L94,164" stroke="#a24f48" stroke-width="1.6" stroke-linecap="round"/>`;
    if (a === 'stubble') face += `<path d="M92,170 Q100,198 126,206 Q146,198 152,172 Q148,188 136,193 Q124,197 110,193 Q98,186 92,170Z M114,176 Q130,172 146,176 Q142,180 130,178 Q118,180 114,176Z" fill="${shade(L.hairC || '#222', -.2)}" opacity=".28"/>`;
    if (a === 'goatee') face += `<path d="M120,194 Q131,214 142,193 Q138,201 131,202 Q124,201 120,194Z M116,177 Q130,172 145,176 L143,179 Q130,175 118,180Z" fill="${shade(L.hairC, -.1)}" stroke="${INK}" stroke-width=".9"/>`;
    if (a === 'beard') face += `<path d="M88,162 Q94,198 126,208 Q150,198 154,164 Q150,186 140,191 L140,185 Q128,179 114,185 L114,191 Q98,186 88,162Z" fill="${shade(L.hairC, -.05)}" stroke="${INK}" stroke-width="1.2"/>`;
    if (a === 'wrinkle') face += `<path d="M98,156 Q102,164 108,167 M146,154 Q143,162 138,166 M100,108 Q120,104 142,108" fill="none" stroke="${INK}" stroke-width="1" opacity=".45"/>`;
    if (a === 'chain') neck += `<path d="M${O.nl - 2},232 Q${O.cx + 2},272 ${O.nr + 2},232" fill="none" stroke="#e1c15a" stroke-width="2.2" stroke-dasharray="3 1.5"/><path d="M${O.cx + 2},258 l-4,8 l4,4 l4,-4Z" fill="#e1c15a" stroke="${INK}" stroke-width=".9"/>`;
    if (a === 'dogtag') neck += `<path d="M${O.nl},232 Q${O.cx},262 ${O.nr},232" fill="none" stroke="#b8bec8" stroke-width="1.4" stroke-dasharray="1.5 1.5"/><rect x="${O.cx - 5}" y="252" width="10" height="15" rx="2.5" fill="#cfd5de" stroke="${INK}" stroke-width=".9"/>`;
    if (a === 'shadesHung') neck += `<path d="M${O.cx + 6},248 L${O.cx + 30},246 Q${O.cx + 30},258 ${O.cx + 24},260 Q${O.cx + 12},260 ${O.cx + 8},254Z" fill="#0a0c12" stroke="${INK}" stroke-width="1.3"/>`;
    if (a === 'tattoo') neck += `<path d="M${O.nl + 6},196 q-8,10 -2,18 q-10,4 -6,14 M${O.nl},214 q-10,0 -14,10 M${O.lx + 22},252 q8,-12 20,-8 q-6,8 4,14 q-12,2 -14,12 q-4,-8 -10,-4" fill="none" stroke="#1f3a52" stroke-width="2.4" stroke-linecap="round" opacity=".85"/>`;
  }
  return { back, front, face, neck };
}

export function charaSVG(look = {}, expr = 'normal', dirOverride) {
  const id = 'ch' + (++uid);
  const L = { hair: 'messy', hairC: '#24242c', skin: 'light', eye: 'normal', eyeC: '#3a5f8a', brow: 'normal', build: 'normal', outfit: 'tee', c1: '#2b3245', c2: '#00e5ff', acc: [], ...look };
  const dir = dirOverride ?? L.dir ?? 1;
  const skin = SKIN[L.skin] || L.skin, skinD = shade(skin, -.2), skinDD = shade(skin, -.36);
  const fem = L.gender === 'f';
  const rim = L.rim || L.c2;
  const H = HAIR[L.hair] || HAIR.messy;
  const O = outfit(L, skin, skinD, rim), A = accessories(L, O, skinD);
  const face = fem ? FACE_F : FACE_M;
  const hc = L.hairC, hd = shade(hc, -.4), hl = shade(hc, .42);
  const HT = 'translate(-3 0)';
  const hairBack = H.back ? `<path d="${H.back}" transform="${HT}" fill="url(#${id}h)" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>` : '';
  const sides = (H.side || []).map(p => `<path d="${p}" fill="url(#${id}h)" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>`).join('');
  const lockD = (H.locks || []).map(lk).join(' ');
  let hairFront = '';
  if (H.front) {
    hairFront = `<path d="${H.front}" fill="url(#${id}h)" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>
      <g clip-path="url(#${id}hf)">
        ${(H.locks || []).map(l => `<path d="${lk(l)}" fill="url(#${id}h)" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/><path d="M${l[0] - l[4] * .2},${l[1] + 4} Q${(l[0] + l[2]) / 2 - l[4] * .4 + l[5]},${(l[1] + l[3]) / 2} ${l[2] + (l[0] - l[2]) * .15},${l[3] - (l[3] - l[1]) * .15}" fill="none" stroke="${hl}" stroke-width="1.2" opacity=".55"/>`).join('')}
        <path d="M126,20 C146,60 158,100 176,170 L200,170 L200,20Z" fill="${hd}" opacity=".55"/>
        <path d="M78,96 Q82,62 108,52" fill="none" stroke="${rim}" stroke-width="3" opacity=".7" stroke-linecap="round"/>
        <path d="M86,68 Q104,52 130,54" fill="none" stroke="${hl}" stroke-width="5" stroke-linecap="round" stroke-dasharray="8 5" opacity=".75"/>
      </g>`;
  }
  const skinHead = L.hair === 'skin' ? `<path d="M80,108 C80,68 98,52 120,52 C142,52 158,68 158,108 C156,82 142,64 120,64 C98,64 82,82 80,108Z" fill="${skinD}" opacity=".35"/><ellipse cx="102" cy="70" rx="13" ry="5.5" fill="#fff" opacity=".35" transform="rotate(-22 102 70)"/><path d="M82,104 Q86,70 108,58" fill="none" stroke="${rim}" stroke-width="2.6" opacity=".75"/>` : '';
  const shades = L.eye === 'shades' ? `<path d="M88,128 L121,127 Q121,141 112,146 Q96,148 90,140Z M131,127 L153,128 Q151,140 147,145 Q136,147 132,140Z" fill="#0a0c12" stroke="${INK}" stroke-width="1.8"/><path d="M121,130 L131,130" stroke="${INK}" stroke-width="2.2"/><path d="M93,132 L108,131 M135,131 L146,132" stroke="#8fd8ff" stroke-width="1.4" opacity=".6"/><path d="M88,129 L78,128" stroke="${INK}" stroke-width="1.8"/>` : '';
  const sweat = expr === 'surprise' ? `<path d="M160,108 Q166,120 160,126 Q154,120 160,108Z" fill="#9fe3ff" stroke="${INK}" stroke-width="1"/>` : '';
  const nw = O.nw, ncx = 115, neckL = ncx - nw + 3, neckR = ncx + nw * .85 - 1;
  const patchSVG = O.patches.map(p => { const x = dir < 0 ? 240 - p.x : p.x; return `<g transform="translate(${x} ${p.y}) rotate(${dir < 0 ? -p.rot : p.rot})"><rect x="-21" y="-9" width="42" height="18" rx="2" fill="${p.fill}" stroke="${INK}" stroke-width="1.1"/><text x="0" y="4.5" text-anchor="middle" font-family="Orbitron,sans-serif" font-weight="900" font-size="${p.text.length > 5 ? 7 : 9}" fill="${shade(p.fill, -.8)}">${p.text}</text></g>`; }).join('');
  const HEAD = 'translate(120 66) scale(1.04 0.91) translate(-120 -56)';

  const inner = `
  <g transform="${HEAD}">${hairBack}${A.back}</g>
  <path d="M${neckL},176 L${neckL - 1},226 Q${ncx},238 ${neckR + 1},226 L${neckR},176 Z" fill="url(#${id}sk)" stroke="${INK}" stroke-width="1.7"/>
  <path d="M${neckL},176 L${neckR},176 L${neckR},210 Q${ncx},192 ${neckL},202Z" fill="${skinDD}" opacity=".75"/>
  <path d="M${neckL + 4},204 Q${ncx + 4},216 ${ncx + 10},230" fill="none" stroke="${skinDD}" stroke-width="1.4" opacity=".9"/>
  <path d="M${neckL},180 L${neckL - 1},224" stroke="${rim}" stroke-width="2.2" opacity=".75"/>
  ${O.svg}
  ${A.neck}
  <g transform="${HEAD}">
  <path d="M84,124 Q73,122 72,137 Q73,153 86,158Z" fill="${skin}" stroke="${INK}" stroke-width="1.6"/><path d="M80,130 Q76,138 80,148" fill="none" stroke="${skinDD}" stroke-width="1.4"/>
  <path d="${face}" fill="url(#${id}sk)" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>
  <g clip-path="url(#${id}f)">
    <path d="${SHADE_FAR}" fill="${skinD}"/><path d="${SHADE_FAR}" fill="${skinDD}" opacity=".25" transform="translate(6 0)"/>
    ${H.front ? `<g filter="url(#${id}s)" transform="translate(-1 8)" opacity=".75"><path d="${H.front} ${lockD}"/></g>` : ''}
    ${!fem ? `<path d="M92,152 Q96,160 102,163" fill="none" stroke="${skinDD}" stroke-width="1.1" opacity=".6"/>` : `<ellipse cx="102" cy="161" rx="8" ry="3.4" fill="#ff8a8a" opacity=".22"/>`}
    <path d="M110,200 Q126,212 146,196 L150,216 L106,216Z" fill="${skinDD}" opacity=".4"/>
  </g>
  <path d="${RIM_FACE}" fill="none" stroke="${rim}" stroke-width="2.4" opacity=".8" stroke-linecap="round"/>
  ${skinHead}
  ${eye(106, -1, L, expr)}${eye(143, 1, L, expr, .62)}
  ${brows(L, expr)}
  ${nose(skinD)}
  ${mouth(L, expr, skinD)}
  ${A.face}${shades}
  ${sides}${hairFront}${A.front}${sweat}
  </g>`;

  return `<svg viewBox="0 0 240 300" class="chara" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="${id}h" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${shade(hc, .14)}"/><stop offset=".5" stop-color="${hc}"/><stop offset="1" stop-color="${shade(hc, -.45)}"/></linearGradient>
    <linearGradient id="${id}sk" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${shade(skin, .08)}"/><stop offset=".55" stop-color="${skin}"/><stop offset="1" stop-color="${skinD}"/></linearGradient>
    <clipPath id="${id}f"><path d="${face}"/></clipPath>
    ${H.front ? `<clipPath id="${id}hf"><path d="${H.front} ${lockD}"/></clipPath>` : ''}
    <filter id="${id}s"><feFlood flood-color="${skinDD}"/><feComposite in2="SourceAlpha" operator="in"/></filter>
  </defs>
  <g${dir < 0 ? ' transform="translate(240 0) scale(-1 1)"' : ''}>${inner}</g>
  ${patchSVG}
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
  return { hair: st.hair, hairC: profile.hairC || ME_COLORS[0], eye: 'normal', eyeC: '#3b6f9e', build: 'slim', outfit: 'ma1', c1: '#2f3a2c', c2: '#2a2f3a', rim: '#00e5ff', acc: ['headset', 'dogtag'], patch: 'TF' };
}
