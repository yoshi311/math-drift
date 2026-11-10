// AE86 スプリンタートレノ（3ドア GT-APEX）専用モデル
// 寸法：全長4205 / 全幅1625 / 全高1335 / ホイールベース2400 / タイヤ185/70R13（Wikipedia・car-me）
// 側面の輪郭は、真横の実車写真（Wikimedia Commons）を切り抜いて測った点列（ホイールベース基準でmmに換算）
// 座標：x=後端0→前端4205、y=地面から上、z=車幅方向（mm）
import * as THREE from '../../vendor/three/three.module.min.js';

const MM = 0.001;
export const AE86 = { len: 4205, hw0: 812, wb: 2400, fo: 800, tire: 590, belt: 930, split: 540 };
const L = AE86.len, HW = AE86.hw0, BELT = AE86.belt;
const WF = L - AE86.fo, WR = WF - AE86.wb, WY = AE86.tire / 2, ARCH = 338;

// 上側の輪郭（写真から測定。リトラは閉じた状態）
const TOP = [[0, 640], [12, 760], [40, 840], [95, 900], [200, 968], [262, 992], [500, 1112], [800, 1192], [1050, 1268], [1300, 1312], [1550, 1328], [1800, 1335],
  [2000, 1318], [2150, 1294], [2253, 1268], [2450, 1162], [2650, 1058], [2850, 952], [2905, 936], [3200, 884], [3550, 818], [3850, 758], [4050, 718], [4150, 700], [4188, 690], [4205, 640]];
// 下側（バンパー下端・サイドシル）
const BOT = [[0, 330], [60, 300], [160, 270], [400, 240], [3900, 235], [4060, 225], [4170, 232], [4205, 300]];
const pw = (pts, x) => { if (x <= pts[0][0]) return pts[0][1]; for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return y0 + (y1 - y0) * (x - x0) / (x1 - x0); } return pts[pts.length - 1][1]; };
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const topAt = x => pw(TOP, x);
function botAt(x) {
  let y = pw(BOT, x);
  for (const wx of [WF, WR]) { const dx = x - wx; if (Math.abs(dx) < ARCH) y = Math.max(y, WY + Math.sqrt(ARCH * ARCH - dx * dx)); }
  return y;
}
// 平面形：前後の角を丸める（前R=210・後R=170。バンパーが回り込む角）
export function hwAt(x) {
  const df = L - x, dr = x;
  const r = df < dr ? 150 : 150, d = Math.min(df, dr);
  if (d >= r) return HW;
  const e = r - d; return HW - r + Math.sqrt(Math.max(0, r * r - e * e));
}

// 断面（右半分・下中央→上中央の11点）
function section(x) {
  const yt = topAt(x), yb = Math.min(botAt(x), yt - 30), hw = hwAt(x);
  const g = clamp((yt - BELT - 40) / 140, 0, 1);  // 窓まわりの量（0=ボンネット/デッキ, 1=キャビン）
  const sh = Math.min(BELT, yt - 22);
  const P = [
    [0, yb], [hw * .93, yb], [hw * .985, yb + 30], [hw, Math.max(yb + 45, 470)], [hw * .996, sh - 45], [hw * .978, sh],
    [lerp(hw * .968, hw * .955, g), lerp(sh + (yt - sh) * .35, sh + 18, g)],
    [lerp(hw * .945, hw * .79, g), lerp(yt - 7, yt - 70, g)],
    [lerp(hw * .87, hw * .745, g), lerp(yt - 1.5, yt - 26, g)],
    [lerp(hw * .5, hw * .55, g), lerp(yt + 2, yt - 4, g)],
    [0, lerp(yt + 4, yt, g)],
  ];
  return { x, P, g, yt, yb, hw };
}

export function buildAE86Body(cfg, mats) {
  // 断面の位置（前後端とホイールアーチ付近を細かく）
  const xs = [];
  for (let i = 0; i <= 150; i++) { const t = i / 150; xs.push(2 + (L - 4) * (0.5 - 0.5 * Math.cos(Math.PI * t))); }
  for (const wx of [WF, WR]) for (let d = -ARCH; d <= ARCH; d += 28) xs.push(wx + d);
  xs.sort((a, b) => a - b);
  const secs = xs.filter((x, i) => i === 0 || x - xs[i - 1] > 6).map(section);
  const N = 11, R = 2 * N - 2; // 1周20点
  const ring = P => [...P, ...P.slice(1, N - 1).reverse().map(([z, y]) => [-z, y])];
  const verts = [];
  secs.forEach(s => { s.ring = ring(s.P); s.ring.forEach(([z, y]) => verts.push(s.x * MM, y * MM, z * MM)); });
  const G = { paint: [], tone: [], glass: [], under: [], trim: [] };
  const seg = k => (k < N ? k : R - k);
  for (let i = 0; i < secs.length - 1; i++) {
    const s = secs[i], n = secs[i + 1], xm = (s.x + n.x) / 2, gm = (s.g + n.g) / 2;
    for (let k = 0; k < R; k++) {
      const k2 = (k + 1) % R, a = i * R + k, b = i * R + k2, c = (i + 1) * R + k, d = (i + 1) * R + k2;
      const sk = Math.min(seg(k), seg(k2)), ym = (s.ring[k][1] + s.ring[k2][1]) / 2;
      let grp = 'paint';
      if (sk === 0) grp = 'under';
      else if (xm > 3745 && ym < AE86.split + 10 && ym > 200) grp = 'trim';  // 前：黒い樹脂バンパー（ホイールアーチまで回り込む）
      else if (xm < 660 && ym > 200 && ym < 430) grp = 'trim';                 // 後ろ：バンパー下部（黒）
      else if (xm < 660 && ym >= 430 && ym < 565) grp = 'paint';               // 後ろ：バンパー上部（ボディ色）
      else if (xm < 60 && ym >= 565 && ym < 830) grp = 'trim';                 // 後ろ：テールの黒い帯
      else if (sk === 6 && gm > .3) grp = (xm > 1545 && xm < 1640) || xm > 2585 || xm < 330 ? 'trim' : 'glass'; // サイドガラスとピラー（後ろはクォーターガラス）
      else if (sk >= 8 && xm > 2262 && xm < 2842) grp = 'glass';                        // フロントガラス
      else if (sk >= 8 && xm > 292 && xm < 1236) grp = 'glass';                         // ハッチガラス
      else if (cfg.tone && ym < AE86.split) grp = 'tone';
      G[grp].push(a, c, b, b, c, d);
    }
  }
  // 前後の面（断面の輪郭でふさぐ）
  const cap = (s, front) => {
    const c0 = verts.length / 3; verts.push(s.x * MM, (s.yb + s.yt) / 2 * MM, 0);
    const base = secs.indexOf(s) * R;
    for (let k = 0; k < R; k++) { const k2 = (k + 1) % R; const ym = (s.ring[k][1] + s.ring[k2][1]) / 2; const grp = front ? (ym < AE86.split ? 'trim' : 'paint') : (ym < 430 || (ym > 565 && ym < 830) ? 'trim' : 'paint'); if (front) G[grp].push(c0, base + k2, base + k); else G[grp].push(c0, base + k, base + k2); }
  };
  cap(secs[0], false); cap(secs[secs.length - 1], true);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  const order = ['paint', 'tone', 'glass', 'under', 'trim'], idx = [];
  order.forEach((k, mi) => { const st = idx.length; idx.push(...G[k]); geo.addGroup(st, G[k].length, mi); });
  geo.setIndex(idx); geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, [mats.paint, mats.tone || mats.paint, mats.glass, mats.under, mats.bumper]);
  mesh.castShadow = true;
  return mesh;
}

// ===== 細部パーツ =====
function box(w, h, d, mat, x, y, z, rz = 0, ry = 0) { const m = new THREE.Mesh(new THREE.BoxGeometry(w * MM, h * MM, d * MM), mat); m.position.set(x * MM, y * MM, z * MM); m.rotation.z = rz; m.rotation.y = ry; return m; }
const slopeAt = x => Math.atan2(topAt(x + 20) - topAt(x - 20), 40);

export function addAE86Parts(g, cfg, mats, tex) {
  const gap = mats.gap, black = mats.bumper, trim = mats.trim;
  const hwF = hwAt(L - 4);
  // --- フロント ---
  // リトラの蓋の前面（黒いアイライン）と、その間の細いグリル（一段奥）
  const lidZ1 = hwAt(L - 8) - 12, lidZ0 = lidZ1 - 455;
  for (const s of [-1, 1]) g.add(box(16, 52, lidZ1 - lidZ0, black, L - 8, 662, s * (lidZ0 + lidZ1) / 2));
  g.add(box(12, 40, lidZ0 * 2 - 20, mats.grille, L - 14, 655, 0));
  // リトラクタブルヘッドライトの蓋（閉）：見切り線
  for (const s of [-1, 1]) {
    const zi = s * lidZ0, zo = s * lidZ1, x0 = 3880, x1 = L - 20;
    const yl = x => topAt(x) + 1.5;
    g.add(box(x1 - x0, 3, 6, gap, (x0 + x1) / 2, yl((x0 + x1) / 2), zi, slopeAt((x0 + x1) / 2)));
    g.add(box(7, 3, Math.abs(zo - zi), gap, x0, yl(x0), (zi + zo) / 2));
  }
  // バンパー：白い帯の下に黒い樹脂部（前面）
  g.add(box(16, AE86.split - 250, hwF * 2 - 10, black, L - 2, (AE86.split + 250) / 2, 0));
  // 中央グリル（横スリット）とTRUENOのエンブレム
  const gw = 620;
  g.add(box(10, 120, gw, mats.grille, L + 7, 468, 0));
  for (let i = 0; i < 5; i++) g.add(box(6, 7, gw - 16, trim, L + 12, 418 + i * 24, 0));
  g.add(box(4, 30, 170, new THREE.MeshStandardMaterial({ map: tex.emblem(), transparent: true, roughness: .3, metalness: .6 }), L + 16, 490, 0));
  // ウインカー（橙）＋クリアランスランプ（白）：バンパーの角
  for (const s of [-1, 1]) {
    g.add(box(10, 74, 200, mats.amber, L + 7, 470, s * (hwF - 300)));
    g.add(box(10, 74, 150, mats.clear, L + 7, 470, s * (hwF - 120)));
    g.add(box(110, 50, 8, mats.amber, L - 190, 470, s * (hwAt(L - 190) + 2)));   // 側面のサイドマーカー
  }
  // ナンバープレート
  g.add(box(6, 165, 330, new THREE.MeshStandardMaterial({ map: tex.plate(), roughness: .5 }), L + 12, 320, 0));
  // 下部リップ
  g.add(box(70, 22, hwF * 2 - 120, black, L - 30, 240, 0));
  // 前バンパーのサイド（ホイールアーチまで回り込む）は本体の黒い面で表現

  // --- サイド ---
  for (const s of [-1, 1]) {
    // サイドモール（黒い帯）
    g.add(box(WF - WR - 2 * ARCH + 760, 34, 10, black, (WF + WR) / 2, AE86.split + 22, s * (HW + 2)));
    // ホイールアーチの黒いモール
    for (const wx of [WF, WR]) {
      const arc = new THREE.Mesh(new THREE.TorusGeometry((ARCH + 18) * MM, 22 * MM, 6, 28, Math.PI * .92), black);
      arc.position.set(wx * MM, WY * MM, s * (HW - 6) * MM); arc.rotation.z = Math.PI * .04; g.add(arc);
    }
    // ドアの切れ目（前端・後端）と下端
    const dF = 2770, dR = 1555;
    g.add(box(4, BELT - 270, 3, gap, dF, (BELT + 270) / 2, s * (hwAt(dF) + 1)));
    g.add(box(4, BELT - 270, 3, gap, dR, (BELT + 270) / 2, s * (hwAt(dR) + 1)));
    // ドアハンドル（黒い小さい引き手）
    g.add(box(120, 26, 14, trim, 1690, 760, s * (HW + 4)));
    // ドアミラー（黒・台形）
    const mz = s * (hwAt(2620) + 40);
    g.add(box(60, 60, 70, trim, 2640, BELT + 20, s * (hwAt(2640) + 8)));
    g.add(box(150, 100, 70, trim, 2610, BELT + 75, mz, 0, s * .12));
    g.add(box(8, 84, 56, mats.mirror, 2535, BELT + 75, mz, 0, s * .12));
  }
  // ボンネット後端・ハッチの見切り線
  g.add(box(4, 3, (HW - 70) * 2 * .96, gap, 2895, topAt(2895) + 2, 0));

  // --- リア ---
  const hwR = hwAt(6);
  // 白いバンパー上部（少し張り出す）と黒い下部
  const hwB = hwAt(30) - 4;
  g.add(box(40, 110, hwB * 2, mats.paint, 8, 487, 0));
  g.add(box(30, 160, hwB * 2 - 6, black, 10, 345, 0));
  // テールの黒い帯：外側に赤＋橙（バックランプ付き）、中央にナンバー
  g.add(box(10, 250, hwR * 2 - 30, mats.grille, -3, 695, 0));
  for (const s of [-1, 1]) {
    const zc = s * (hwR - 300);
    g.add(box(12, 190, 480, mats.tail, -7, 700, s * (hwR - 330)));
    g.add(box(13, 190, 110, mats.amber, -8, 700, s * (hwR - 120)));
    g.add(box(13, 80, 90, mats.clear, -8, 680, s * (hwR - 330)));
  }
  g.add(box(6, 165, 330, new THREE.MeshStandardMaterial({ map: tex.plate(), roughness: .5 }), -10, 690, 0));
  // リアワイパー
  g.add(box(380, 8, 14, trim, 330, topAt(330) + 10, 0, slopeAt(330), .9));
  // ワイパー
  for (const z of [-260, 220]) g.add(box(520, 8, 14, trim, 2770, topAt(2770) + 12, z, slopeAt(2770) * .2, .25));
}
