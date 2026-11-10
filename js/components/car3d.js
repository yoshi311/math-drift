// 車の3D描画（three.js）：実車寸法の形状データからボディを生成し、映り込みのある塗装で描く
// ・renderCarImage(): 共有の描画エンジンで静止画（dataURL）を作る（キャッシュつき）
// ・mountViewer(): ガレージ用の、指で回せる表示
import * as THREE from '../vendor/three/three.module.min.js';
import { RoomEnvironment } from '../vendor/three/RoomEnvironment.js';
import { OrbitControls } from '../vendor/three/OrbitControls.js';
import { SHAPES } from '../../data/car-shapes.js';
import { carById } from '../../data/cars.js';
import { AE86, buildAE86Body, addAE86Parts, hwAt as ae86hw, topAt as ae86top } from './cars3d/ae86.js';

// 実車資料から作り込んだ専用モデル（車種ID → 生成関数）
const DETAIL = {
  ae86: (cfg, mats) => ({ mesh: buildAE86Body(cfg, mats), hwAt: ae86hw, topAt: ae86top, hw0: AE86.hw0, parts: g => addAE86Parts(g, cfg, mats, { plate: plateTex, emblem: () => canvasTex(256, 48, gg => { gg.fillStyle = '#e8ecf0'; gg.font = '900 40px sans-serif'; gg.textAlign = 'center'; gg.textBaseline = 'middle'; gg.fillText('TRUENO', 128, 26); }) }) }),
};

const MM = 0.001;
// 全幅（mm・公表値）
const WIDTH = { ae86: 1625, ae86l: 1625, s13: 1690, ek9: 1695, r32: 1755, gc8: 1690, s15: 1695, a80: 1810, nsx: 1810, na6: 1675, gr86: 1775, gryaris: 1805, kpgc10: 1665, s30: 1630, fd3s: 1760, ct9a: 1770, rz34: 1845, r34: 1785, t2000gt: 1600, fk8: 1875, r35: 1895, lfa: 1895 };

// ===== 輪郭の処理 =====
function densify(pts) {
  // 角丸ポリゴンを細かい点列に（2次ベジェで角を丸める）
  const n = pts.length, out = [];
  for (let i = 0; i < n; i++) {
    const [x, y, r] = pts[i], p = pts[(i - 1 + n) % n], q = pts[(i + 1) % n];
    const d1 = Math.hypot(x - p[0], y - p[1]) || 1, d2 = Math.hypot(q[0] - x, q[1] - y) || 1;
    const rr = Math.min(r || 0, d1 / 2, d2 / 2);
    const a = [x + (p[0] - x) * rr / d1, y + (p[1] - y) * rr / d1], b = [x + (q[0] - x) * rr / d2, y + (q[1] - y) * rr / d2];
    const steps = rr > 0 ? 8 : 1;
    for (let k = 0; k <= steps; k++) {
      const t = steps === 1 ? 0 : k / steps, u = 1 - t;
      out.push([u * u * a[0] + 2 * u * t * x + t * t * b[0], u * u * a[1] + 2 * u * t * y + t * t * b[1]]);
    }
  }
  return out;
}
function vspan(poly, x) {
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    if ((a[0] - x) * (b[0] - x) <= 0 && a[0] !== b[0]) {
      const y = a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]);
      lo = Math.min(lo, y); hi = Math.max(hi, y);
    }
  }
  return [lo, hi];
}
function inPoly(poly, x, y) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
  }
  return c;
}
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ===== 素材 =====
function paintMat(hex) {
  const c = new THREE.Color(hex);
  const hsl = {}; c.getHSL(hsl);
  const metallic = hsl.s < .12 && hsl.l > .3 && hsl.l < .85 ? .55 : .25;
  return new THREE.MeshPhysicalMaterial({ color: c, metalness: metallic, roughness: .3, clearcoat: 1, clearcoatRoughness: .04, envMapIntensity: 1.4, side: THREE.DoubleSide });
}
function canvasTex(w, h, draw) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
let CARBON = null;
const carbonTex = () => CARBON || (CARBON = (() => { const t = canvasTex(64, 64, (g) => { for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.fillStyle = (x + y) % 2 ? '#2b2d31' : '#16171a'; g.fillRect(x * 8, y * 8, 8, 8); } }); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(12, 4); return t; })());
let PLATE = null;
const plateTex = () => PLATE || (PLATE = canvasTex(256, 128, (g) => { g.fillStyle = '#f4f4ee'; g.fillRect(0, 0, 256, 128); g.strokeStyle = '#2f6b3a'; g.lineWidth = 6; g.strokeRect(5, 5, 246, 118); g.fillStyle = '#2f6b3a'; g.font = '700 26px sans-serif'; g.textAlign = 'center'; g.fillText('群馬 330', 128, 40); g.font = '900 58px sans-serif'; g.fillText('86-86', 140, 106); }));
let BLOB = null;
const blobTex = () => BLOB || (BLOB = canvasTex(256, 256, (g, w, h) => { const r = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w / 2); r.addColorStop(0, 'rgba(0,0,0,.85)'); r.addColorStop(.55, 'rgba(0,0,0,.45)'); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); }));

// ===== ボディのメッシュ生成 =====
function buildBody(S, cfg, mats) {
  const len = S.len, hw0 = (WIDTH[cfgId(S)] || 1750) / 2;
  const poly = densify(S.body);
  const xs = poly.map(p => p[0]);
  const xmin = Math.min(...xs) + 1, xmax = Math.max(...xs) - 1;
  const NS = 120, stations = [];
  for (let i = 0; i <= NS; i++) { const t = i / NS; stations.push(xmin + (xmax - xmin) * (0.5 - 0.5 * Math.cos(Math.PI * t))); }
  const wy = S.tire / 2, archR = S.tire / 2 + 45;
  const wheelsX = [len - S.fo, len - S.fo - S.wb];
  const glass = S.glass ? densify(S.glass) : null;
  // ルーフの前後端・デッキ位置
  const tops = stations.map(x => vspan(poly, x)[1]);
  const ymax = Math.max(...tops);
  let roofF = len * .55, roofR = len * .35;
  for (let i = NS; i >= 0; i--) if (tops[i] > ymax - 60) { roofF = stations[i]; break; }
  for (let i = 0; i <= NS; i++) if (tops[i] > ymax - 60) { roofR = stations[i]; break; }
  const cowl = S.hood ? S.hood[0] : roofF + 600;
  let deck = roofR - 500;
  for (let i = 0; i <= NS; i++) if (stations[i] < roofR && tops[i] > S.belt + 60) { deck = stations[i]; break; }
  const split = (S.belt + S.rocker) / 2 - 30;

  const verts = [], secs = [];
  stations.forEach((x, si) => {
    let [yb, yt] = vspan(poly, x);
    if (!isFinite(yb)) { yb = 300; yt = 320; }
    for (const wx of wheelsX) { const dx = x - wx; if (Math.abs(dx) < archR) yb = Math.max(yb, wy + Math.sqrt(archR * archR - dx * dx)); }
    if (yt < yb + 20) yt = yb + 20;
    const dEnd = Math.min(x - xmin, xmax - x), front = x > len / 2;
    const Rc = front ? 420 : 320, u = Math.min(1, dEnd / Rc);
    const taper = (front ? .52 : .62) + (1 - (front ? .52 : .62)) * Math.sqrt(1 - Math.pow(1 - u, 2));
    const hw = hw0 * taper;
    const h = yt - yb, belt = Math.min(S.belt, yt - 30);
    const g = S.open ? 0 : clamp((yt - S.belt - 40) / 180, 0, 1);
    const P = [
      [0, yb], [hw * .9, yb], [hw * .985, yb + Math.min(120, h * .15)], [hw, yb + (belt - yb) * .55],
      [hw * .985, lerp(yt - Math.min(90, h * .25), S.belt, g)],
      [lerp(hw * .955, hw * .93, g), lerp(yt - Math.min(45, h * .12), S.belt + (yt - S.belt) * .14, g)],
      [lerp(hw * .86, hw * .74, g), lerp(yt - 12, yt - 55, g)],
      [lerp(hw * .64, hw * .55, g), lerp(yt - 2, yt - 8, g)],
      [0, lerp(yt + 3, yt, g)],
    ];
    secs.push({ x, P, g });
  });
  // 前後の端は断面を1点にすぼめて閉じる
  const pinch = (sc, dx) => { const cy = sc.P.reduce((t, p) => t + p[1], 0) / sc.P.length; return { x: sc.x + dx, P: sc.P.map(() => [0, cy]), g: sc.g }; };
  secs.unshift(pinch(secs[0], -4)); secs.push(pinch(secs[secs.length - 1], 4));
  // 頂点：各断面で 右半分（0..8）→ 左半分（7..1）の順に一周（17点）
  const ring = P => [...P.map(([z, y]) => [z, y]), ...P.slice(1, 8).reverse().map(([z, y]) => [-z, y])];
  const R = 16;
  secs.forEach(s => { s.ring = ring(s.P); s.ring.forEach(([z, y]) => verts.push(s.x * MM, y * MM, z * MM)); });
  const groups = { paint: [], tone: [], glass: [], under: [] };
  const seg = k => (k <= 8 ? k : 16 - k); // 左右で同じ区間番号
  for (let i = 0; i < secs.length - 1; i++) {
    for (let k = 0; k < R; k++) {
      const a = i * R + k, b = i * R + (k + 1) % R, c = (i + 1) * R + k, d = (i + 1) * R + (k + 1) % R;
      const s = secs[i], sn = secs[i + 1];
      const xm = (s.x + sn.x) / 2, gm = (s.g + sn.g) / 2;
      const sk = Math.min(seg(k), seg((k + 1) % R));
      const ym = (s.ring[k][1] + s.ring[(k + 1) % R][1]) / 2;
      let grp = 'paint';
      const endQuad = i === 0 || i === secs.length - 2;
      if (endQuad) grp = cfg.tone && ym < split ? 'tone' : 'paint';
      else if (k === 0 || k === R - 1) grp = 'under';
      else if (gm > .5 && glass && sk === 5 && inPoly(glass, xm, ym) && !(S.bp && Math.abs(xm - (S.bp - 60)) < 55) && !(S.qp && Math.abs(xm - (S.qp - 40)) < 40)) grp = 'glass';
      else if (gm > .5 && (sk === 6 || sk === 7) && ((xm > roofF && xm < cowl) || (xm < roofR && xm > deck))) grp = 'glass';
      else if (cfg.tone && ym < split) grp = 'tone';
      groups[grp].push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  const order = ['paint', 'tone', 'glass', 'under'], idx = [];
  order.forEach((k, mi) => { const st = idx.length; idx.push(...groups[k]); geo.addGroup(st, groups[k].length, mi); });
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, [mats.paint, mats.tone || mats.paint, mats.glass, mats.under]);
  mesh.castShadow = true;
  // 断面から半幅を引く関数（パーツ配置用）
  const hwAt = x => { let best = secs[0]; for (const s of secs) if (Math.abs(s.x - x) < Math.abs(best.x - x)) best = s; return best.P[3][0]; };
  const topAt = x => vspan(poly, x)[1];
  return { mesh, hwAt, hw0, roofF, roofR, cowl, topAt };
}
const cfgId = S => S.__id;

// ===== ホイール =====
function buildWheel(S, cfg, side, mats) {
  const g = new THREE.Group();
  const R = S.tire / 2 * MM, rr = Math.min(R - .045, (cfg.inch * 25.4 / 2 + 18) * MM), tw = .215;
  // タイヤ（回転体の断面）
  const prof = [];
  const steps = 10;
  prof.push(new THREE.Vector2(rr - .005, -tw / 2));
  for (let i = 0; i <= steps; i++) { const a = -Math.PI / 2 + Math.PI * i / steps; prof.push(new THREE.Vector2(R - .03 + Math.cos(a) * .03, Math.sin(a) * (tw / 2))); }
  prof.push(new THREE.Vector2(rr - .005, tw / 2));
  const tire = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), mats.tire);
  tire.rotation.x = Math.PI / 2; tire.castShadow = true; g.add(tire);
  // ブレーキ
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(rr * .78, rr * .78, .028, 32), mats.rotor); disc.rotation.x = Math.PI / 2; disc.position.z = side * .01; g.add(disc);
  const cal = new THREE.Mesh(new THREE.BoxGeometry(rr * .5, rr * .32, .05), mats.caliper); cal.position.set(-rr * .38, rr * .45, side * .04); cal.rotation.z = -.6; g.add(cal);
  // リム
  const rimG = new THREE.Group(); rimG.position.z = side * (tw / 2 - .03);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(rr - .008, .012, 10, 48), mats.rim); rimG.add(lip);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(rr - .01, rr - .01, .14, 40, 1, true), mats.rimDark); barrel.rotation.x = Math.PI / 2; barrel.position.z = -side * .07; rimG.add(barrel);
  const face = (r, mat, depth = .02) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, depth, 40), mat); m.rotation.x = Math.PI / 2; return m; };
  const d = cfg.wheel;
  if (d === 'steel') {
    rimG.add(face(rr * .95, mats.steel));
    for (let i = 0; i < 6; i++) { const h = face(rr * .1, mats.rimDark, .03); const a = i * Math.PI / 3; h.position.set(Math.cos(a) * rr * .6, Math.sin(a) * rr * .6, side * .005); rimG.add(h); }
    const cap = face(rr * .3, mats.chrome, .04); cap.position.z = side * .01; rimG.add(cap);
  } else if (d === 'disc') {
    rimG.add(face(rr * .96, mats.rim, .03));
    const cap = face(rr * .2, mats.rimDark, .04); cap.position.z = side * .01; rimG.add(cap);
  } else {
    const inner = face(rr * .96, mats.rimDark, .01); inner.position.z = -side * .03; rimG.add(inner);
    const n = d === '5spoke' ? 5 : d === '6spoke' ? 6 : d === 'deep' ? 8 : 16;
    const wdt = d === 'mesh' ? .012 : d === 'deep' ? .03 : d === '5spoke' ? .06 : .04;
    const startR = d === 'deep' ? rr * .2 : rr * .22, endR = d === 'deep' ? rr * .68 : rr * .95;
    for (let i = 0; i < n; i++) {
      const a = i * 2 * Math.PI / n;
      const make = (ang) => { const sp = new THREE.Mesh(new THREE.BoxGeometry(endR - startR, wdt, .03), mats.rim); sp.position.set(Math.cos(ang) * (startR + endR) / 2, Math.sin(ang) * (startR + endR) / 2, side * .005); sp.rotation.z = ang; return sp; };
      if (d === 'mesh') { const s1 = make(a + .25); s1.rotation.z += .45; rimG.add(s1); const s2 = make(a - .25); s2.rotation.z -= .45; rimG.add(s2); }
      else rimG.add(make(a));
    }
    if (d === 'deep') { const dish = new THREE.Mesh(new THREE.TorusGeometry(rr * .82, rr * .13, 8, 40), mats.rim); dish.position.z = side * .005; rimG.add(dish); }
    const hub = face(rr * .26, mats.rim, .05); hub.position.z = side * .01; rimG.add(hub);
  }
  g.add(rimG);
  return g;
}

// ===== パーツ =====
function box(w, h, d, mat, x, y, z, rz = 0) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.rotation.z = rz; m.castShadow = true; return m; }
function bboxOf(pts) { const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]); return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }; }

function wing(type, S, B, mats, body) {
  const g = new THREE.Group();
  const [wx, wyy] = S.wingAt || [200, 900];
  const span = B.hw0 * 2 * MM * .92;
  const spec = { 1: { h: 25, c: 230, t: 30, up: 0 }, 2: { h: 110, c: 260, t: 35, up: 1 }, 3: { h: 300, c: 330, t: 30, up: 1, plate: 1 },
    sti: { h: 150, c: 230, t: 35, up: 1 }, evo: { h: 170, c: 280, t: 30, up: 1, dark: 1 }, r34: { h: 90, c: 260, t: 30, up: 1 }, r32: { h: 30, c: 200, t: 25, up: 0 },
    hoop: { h: 160, c: 220, t: 35, up: 1, hoop: 1 }, fk8: { h: 150, c: 300, t: 30, up: 1, dark: 1 }, roof: { h: 20, c: 260, t: 25, up: 0 } }[type];
  if (!spec) return g;
  const mat = spec.dark || type === 3 ? mats.trim : body;
  const y = (wyy + spec.h) * MM, x = wx * MM;
  g.add(box(spec.c * MM, spec.t * MM, span, mat, x, y, 0, .08));
  if (spec.up) for (const z of [-1, 1]) g.add(box(.05, spec.h * MM, .03, spec.hoop ? body : mats.trim, x + (spec.hoop ? -.04 : .02), (wyy + spec.h / 2) * MM, z * span * (spec.hoop ? .48 : .32)));
  if (spec.plate) for (const z of [-1, 1]) g.add(box(.36, .16, .008, mats.trim, x, y, z * span / 2));
  return g;
}

function decal(tex, w, h, x, y, z, side) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshPhysicalMaterial({ map: tex, transparent: true, roughness: .4, clearcoat: 1, polygonOffset: true, polygonOffsetFactor: -2 }));
  m.position.set(x, y, z); if (side < 0) m.rotation.y = Math.PI; return m;
}

// ===== 車1台を組み立てる =====
export function buildCar(carId, cfg) {
  const car = carById(carId);
  const S = { ...(SHAPES[car.id] || SHAPES.ae86), __id: car.id };
  const col = cfg.color || car.color;
  const tintCol = ['#152029', '#0b1015', '#050608'][cfg.tint || 0];
  const mats = {
    paint: paintMat(col), tone: cfg.tone ? paintMat(cfg.color2 || '#111111') : null,
    glass: new THREE.MeshPhysicalMaterial({ color: tintCol, metalness: .2, roughness: .03, clearcoat: 1, envMapIntensity: 1.1, side: THREE.DoubleSide }),
    under: new THREE.MeshStandardMaterial({ color: '#0a0a0b', roughness: .9, side: THREE.DoubleSide }),
    tire: new THREE.MeshStandardMaterial({ color: '#141416', roughness: .82 }),
    rim: new THREE.MeshStandardMaterial({ color: cfg.wcolor || '#c9ced6', metalness: .92, roughness: .22 }),
    rimDark: new THREE.MeshStandardMaterial({ color: '#1b1c1f', metalness: .6, roughness: .5 }),
    steel: new THREE.MeshStandardMaterial({ color: '#3c4047', metalness: .5, roughness: .45 }),
    chrome: new THREE.MeshStandardMaterial({ color: '#eef1f5', metalness: 1, roughness: .08 }),
    rotor: new THREE.MeshStandardMaterial({ color: '#8b9097', metalness: .85, roughness: .35 }),
    caliper: new THREE.MeshStandardMaterial({ color: '#c4161c', metalness: .3, roughness: .4 }),
    trim: new THREE.MeshStandardMaterial({ color: '#121315', metalness: .3, roughness: .45 }),
    grille: new THREE.MeshStandardMaterial({ color: '#08090a', metalness: .2, roughness: .7 }),
    head: new THREE.MeshStandardMaterial({ color: '#dfe9f5', emissive: '#e8f2ff', emissiveIntensity: .55, metalness: .4, roughness: .1 }),
    tail: new THREE.MeshStandardMaterial({ color: '#7a0710', emissive: '#ff1a2a', emissiveIntensity: .45, roughness: .2 }),
    amber: new THREE.MeshStandardMaterial({ color: '#ff9a1a', emissive: '#ff8a00', emissiveIntensity: .3, roughness: .3 }),
    clear: new THREE.MeshPhysicalMaterial({ color: '#e9eef3', metalness: .3, roughness: .08, clearcoat: 1 }),
    bumper: new THREE.MeshStandardMaterial({ color: '#16171a', metalness: .05, roughness: .62, side: THREE.DoubleSide }),
    gap: new THREE.MeshBasicMaterial({ color: '#050506' }),
    mirror: new THREE.MeshStandardMaterial({ color: '#c8d0da', metalness: 1, roughness: .05 }),
  };
  const root = new THREE.Group();
  const bodyG = new THREE.Group();
  bodyG.position.y = (cfg.height || 0) * 15 * MM; // 車高：マイナス＝下げる
  const D = DETAIL[car.id];
  const B = D ? D(cfg, mats) : buildBody(S, cfg, mats);
  bodyG.add(B.mesh);
  if (D) B.parts(bodyG);
  const len = S.len;
  // ライト
  const lightBox = (pts, mat, rear) => {
    const b = bboxOf(pts); const xe = rear ? b.x0 + 15 : b.x1 - 15; const top = B.topAt(xe) - 18;
    const y1 = Math.min(b.y1, top), y0 = Math.min(b.y0, y1 - 40), hw = B.hwAt(xe);
    const lx = Math.min(140, b.x1 - b.x0 + 30), cx = rear ? b.x0 + lx / 2 - 10 : b.x1 - lx / 2 + 10;
    for (const s of [-1, 1]) bodyG.add(box(lx * MM, (y1 - y0) * MM, hw * .42 * MM, mat, cx * MM, (y0 + y1) / 2 * MM, s * hw * .6 * MM));
  };
  if (!D && S.head) lightBox(S.head, S.popup ? mats.amber : mats.head, false);
  if (!D && S.tail) lightBox(S.tail, mats.tail, true);
  // グリル（前面下部の開口）とナンバープレート
  if (!D) {
    const fx = len - 8, gy = S.rocker + 200, gh = Math.min(220, (B.topAt(len - 60) - S.rocker) * .42);
    const hw = B.hwAt(len - 60);
    bodyG.add(box(.06, gh * MM, hw * 1.05 * MM, mats.grille, (fx - 40) * MM, gy * MM, 0));
    const plate = new THREE.MeshStandardMaterial({ map: plateTex(), roughness: .5 });
    bodyG.add(box(.012, .165, .33, plate, (fx - 2) * MM, (gy + gh * .1) * MM, 0));
    const rhw = B.hwAt(60);
    bodyG.add(box(.012, .165, .33, plate, 4 * MM, (S.rocker + 360) * MM, 0));
    bodyG.add(box(.05, .09, rhw * 1.3 * MM, mats.grille, 18 * MM, (S.rocker + 110) * MM, 0));
  }
  // ミラー
  if (!D && S.mirror) { const [mx, my] = S.mirror; const hw = B.hwAt(mx); for (const s of [-1, 1]) { bodyG.add(box(.15, .095, .05, mats.paint, mx * MM, (S.belt + 75) * MM, s * (hw * .93 + 70) * MM)); bodyG.add(box(.05, .035, .09, mats.trim, (mx + 20) * MM, (S.belt + 30) * MM, s * (hw * .93 + 25) * MM)); } }
  // メッキバンパー
  if (S.chrome) { bodyG.add(box(.05, .07, B.hwAt(len - 40) * 1.7 * MM, mats.chrome, (len - 4) * MM, (S.rocker + 220) * MM, 0)); bodyG.add(box(.05, .07, B.hwAt(40) * 1.7 * MM, mats.chrome, 2 * MM, (S.rocker + 260) * MM, 0)); }
  // オープンカーのフロントガラスとシート
  if (S.open && S.shield) {
    const [a, b] = [S.shield[0], S.shield[1]]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]), ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const hw = B.hwAt(a[0]) * .9;
    bodyG.add(box(L * MM, .012, hw * 2 * MM, mats.glass, (a[0] + b[0]) / 2 * MM, (a[1] + b[1]) / 2 * MM, 0, ang));
    bodyG.add(box(L * MM, .03, .03, mats.trim, (a[0] + b[0]) / 2 * MM, (a[1] + b[1]) / 2 * MM, hw * MM, ang)); bodyG.add(box(L * MM, .03, .03, mats.trim, (a[0] + b[0]) / 2 * MM, (a[1] + b[1]) / 2 * MM, -hw * MM, ang));
    for (const sz of [-1, 1]) (S.seats || []).slice(0, 1).forEach(sx => { bodyG.add(box(.12, .52, .46, mats.trim, (sx - 60) * MM, (S.belt + 120) * MM, sz * .3)); bodyG.add(box(.5, .08, .46, mats.trim, (sx + 150) * MM, (S.belt - 20) * MM, sz * .3)); });
  }
  // スクープ
  if (S.scoop) { const b = bboxOf(S.scoop); bodyG.add(box((b.x1 - b.x0) * MM, (b.y1 - b.y0) * MM, .42, cfg.bonnet ? new THREE.MeshStandardMaterial({ map: carbonTex(), roughness: .35, metalness: .3 }) : mats.paint, (b.x0 + b.x1) / 2 * MM, (b.y0 + b.y1) / 2 * MM, 0)); }
  // カーボンボンネット
  if (cfg.bonnet && S.hood) {
    const [x1, y1, x2, y2] = S.hood; const ang = Math.atan2(y2 - y1, x2 - x1), L = Math.hypot(x2 - x1, y2 - y1);
    const hw = B.hwAt((x1 + x2) / 2);
    bodyG.add(box(L * MM * .96, .012, hw * 1.55 * MM, new THREE.MeshStandardMaterial({ map: carbonTex(), roughness: .3, metalness: .35 }), (x1 + x2) / 2 * MM, ((y1 + y2) / 2 + 4) * MM, 0, ang));
  }
  // エアロ
  if (cfg.lip) bodyG.add(box(.62, (18 + cfg.lip * 12) * MM, B.hw0 * 1.9 * MM, mats.trim, (len - 300 + cfg.lip * 15) * MM, (S.rocker - 5) * MM, 0));
  if (cfg.skirt) {
    const rx = (len - S.fo - S.wb) + S.tire / 2 + 60, fx = (len - S.fo) - S.tire / 2 - 60;
    for (const s of [-1, 1]) bodyG.add(box((fx - rx) * MM, (60 + cfg.skirt * 30) * MM, .04, mats.trim, (rx + fx) / 2 * MM, (S.rocker + 10) * MM, s * (B.hw0 + 10) * MM));
  }
  const wt = cfg.wing || S.stock;
  if (wt) bodyG.add(wing(wt, S, B, mats, mats.paint));
  // ステッカー
  const d0 = (S.doors || [len / 2 + 400])[0], d1 = (S.doors && S.doors[1]) || d0 - 1000;
  const dx = (d0 + d1) / 2, dy = (S.belt + S.rocker) / 2, dhw = B.hwAt(dx) + 4;
  const lum = new THREE.Color(col).getHSL({}).l;
  const ink = lum > .55 ? '#111' : '#fff';
  if (cfg.livery === 'number') {
    const t = canvasTex(256, 256, (g) => { g.fillStyle = '#fff'; g.beginPath(); g.arc(128, 128, 118, 0, 7); g.fill(); g.lineWidth = 14; g.strokeStyle = '#111'; g.stroke(); g.fillStyle = '#111'; g.font = '900 120px Orbitron, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(cfg.number ?? 86), 128, 136); });
    for (const s of [-1, 1]) bodyG.add(decal(t, .42, .42, dx * MM, dy * MM, s * dhw * MM, s));
  } else if (cfg.livery === 'ghost' || cfg.livery === 'shop') {
    const t = canvasTex(512, 128, (g) => { g.fillStyle = ink; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = 'italic 900 64px Orbitron, sans-serif'; if (cfg.livery === 'ghost') { g.strokeStyle = '#00e5ff'; g.lineWidth = 6; g.strokeText('GHOST LINE', 256, 66); g.fillText('GHOST LINE', 256, 66); } else { g.font = '800 70px Orbitron, sans-serif'; g.fillText('TAKAMIYA', 256, 50); g.font = '800 34px Orbitron, sans-serif'; g.fillText('F A C T O R Y', 256, 104); } });
    for (const s of [-1, 1]) bodyG.add(decal(t, 1.1, .275, dx * MM, dy * MM, s * dhw * MM, s));
  } else if (cfg.livery === 'stripe') {
    for (const s of [-1, 1]) { bodyG.add(box((len - 1100) * MM, .045, .004, new THREE.MeshPhysicalMaterial({ color: ink, clearcoat: 1, roughness: .35 }), len / 2 * MM, (S.rocker + 230) * MM, s * (B.hw0 + 6) * MM)); bodyG.add(box((len - 1100) * MM, .02, .004, new THREE.MeshPhysicalMaterial({ color: ink, clearcoat: 1 }), len / 2 * MM, (S.rocker + 175) * MM, s * (B.hw0 + 6) * MM)); }
  } else if (cfg.livery === 'fire') {
    const t = canvasTex(512, 160, (g, w, h) => { const gr = g.createLinearGradient(w, 0, 0, 0); gr.addColorStop(0, '#ffd400'); gr.addColorStop(.5, '#ff7a00'); gr.addColorStop(1, '#ff2d55'); g.fillStyle = gr; g.beginPath(); g.moveTo(w, 10); for (let i = 0; i < 6; i++) { const x = w - 80 - i * 70; g.quadraticCurveTo(x + 40, 20 + (i % 2) * 40, x, 60 + (i % 2) * 30); g.quadraticCurveTo(x - 30, 90, x - 50, 80 + (i % 2) * 20); } g.lineTo(w * .1, 120); g.quadraticCurveTo(w * .4, 160, w, 150); g.closePath(); g.fill(); });
    const fx = len - S.fo - 300, fhw = B.hwAt(fx) + 4;
    for (const s of [-1, 1]) bodyG.add(decal(t, 1.5, .47, fx * MM, (S.rocker + 320) * MM, s * fhw * MM, s));
  }
  root.add(bodyG);
  // ホイール
  const wz = x => (B.hwAt(x) * .985 - 95) * MM;
  for (const wxm of [len - S.fo, len - S.fo - S.wb]) for (const s of [-1, 1]) { const w = buildWheel(S, cfg, s, mats); w.position.set(wxm * MM, S.tire / 2 * MM, s * wz(wxm)); root.add(w); }
  // ネオン
  if (cfg.neon) {
    const t = canvasTex(256, 128, (g, w, h) => { const r = g.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2); r.addColorStop(0, cfg.neon); r.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); });
    const p = new THREE.Mesh(new THREE.PlaneGeometry(len * MM * 1.15, B.hw0 * 2 * MM * 1.6), new THREE.MeshBasicMaterial({ map: t, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    p.rotation.x = -Math.PI / 2; p.position.set(len / 2 * MM, .004, 0); root.add(p);
  }
  // 接地影
  const blob = new THREE.Mesh(new THREE.PlaneGeometry(len * MM * 1.12, B.hw0 * 2 * MM * 1.35), new THREE.MeshBasicMaterial({ map: blobTex(), transparent: true, depthWrite: false }));
  blob.name = 'blob'; blob.rotation.x = -Math.PI / 2; blob.position.set(len / 2 * MM, .002, 0); root.add(blob);
  root.userData = { len: len * MM, width: B.hw0 * 2 * MM };
  return root;
}

// ===== スタジオ風の映り込み環境（暗い背景＋帯状の照明＋地平線） =====
function studioScene() {
  const sc = new THREE.Scene();
  const geo = new THREE.SphereGeometry(40, 48, 24);
  const cols = [], pos = geo.attributes.position;
  const top = new THREE.Color('#0b0d12'), hor = new THREE.Color('#7d8796'), bot = new THREE.Color('#050506'), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / 40;
    if (y > 0) c.copy(hor).lerp(top, Math.min(1, Math.pow(y, .45))); else c.copy(hor).lerp(bot, Math.min(1, Math.pow(-y, .25)));
    cols.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  sc.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const light = (w, h, x, y, z, ry = 0, rx = 0, k = 4) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k, k), side: THREE.DoubleSide })); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); sc.add(m); };
  light(14, 4, 0, 16, 0, 0, Math.PI / 2, 5);          // 天井のソフトボックス
  light(26, 1.2, 0, 6, -14, 0, 0, 3.2);               // 奥の帯照明
  light(26, 1.2, 0, 6, 14, 0, 0, 3.2);                // 手前の帯照明
  light(1.4, 8, 16, 5, 0, Math.PI / 2, 0, 2.2);        // 前
  light(1.4, 8, -16, 5, 0, Math.PI / 2, 0, 1.6);       // 後ろ
  return sc;
}

// ===== 描画エンジン（共有） =====
let ENG = null;
export function webglOK() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}
function setupScene(renderer) {
  const scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(studioScene(), .02).texture;
  const sun = new THREE.DirectionalLight('#ffffff', 2.2);
  sun.position.set(3, 8, 5); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: .5, far: 20 }); sun.shadow.radius = 6; sun.shadow.bias = -.0005;
  scene.add(sun, new THREE.HemisphereLight('#bcd2ff', '#1a1a1a', .5));
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: .38 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  return { scene, sun };
}
function engine() {
  if (ENG) return ENG;
  const canvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const { scene, sun } = setupScene(renderer);
  const camera = new THREE.PerspectiveCamera(24, 2.2, .1, 100);
  ENG = { renderer, scene, sun, camera };
  return ENG;
}
// 構図：'34' は斜め前（少し見上げ）、'side' は真横（前が右）
function frame(camera, root, view) {
  const L = root.userData.len, cx = L / 2;
  camera.aspect = 2.2;
  if (view === 'tele-side' || view === 'tele-front' || view === 'tele-rear') {
    // 開発用：写真と重ねるための、ほぼ平行投影の望遠（横幅4.6m＝880px）
    camera.fov = 1.5; camera.far = 200;
    const D = 80, p = { 'tele-side': [cx, .65, D], 'tele-front': [cx + D, .65, 0], 'tele-rear': [cx - D, .65, 0] }[view];
    camera.position.set(...p); camera.lookAt(cx, .65, 0);
  } else if (view === 'side') {
    camera.far = 100; camera.fov = 18; camera.position.set(cx, .62, 7.4); camera.lookAt(cx, .62, 0);
  } else {
    camera.far = 100; camera.fov = 22;
    const az = 0.9, el = 0.09, D = 6.3;
    const r = view === '34r' ? -1 : 1; // '34r'：斜め後ろ
    camera.position.set(cx + r * Math.sin(az) * D, .55 + Math.sin(el) * D, Math.cos(az) * D);
    camera.lookAt(cx + r * .2, .6, 0);
  }
  camera.updateProjectionMatrix();
}
function dispose(obj) {
  obj.traverse(o => { if (o.geometry) o.geometry.dispose(); const m = o.material; if (m) (Array.isArray(m) ? m : [m]).forEach(x => { if (x.map && x.map !== CARBON && x.map !== BLOB && x.map !== PLATE) x.map.dispose(); x.dispose(); }); });
}

const MEM = new Map();
export function cachedImage(key) { return MEM.get(key) || null; }
export async function renderCarImage(key, carId, cfg, view = '34', w = 880, h = 400) {
  if (MEM.has(key)) return MEM.get(key);
  const fromDb = await idbGet(key);
  if (fromDb) { MEM.set(key, fromDb); return fromDb; }
  const E = engine();
  E.renderer.setSize(w, h, false);
  const root = buildCar(carId, cfg);
  E.scene.add(root);
  E.sun.target = root; E.sun.position.set(root.userData.len / 2 + 2.5, 8, 5);
  frame(E.camera, root, view);
  if (view.startsWith('tele')) root.traverse(o => { if (o.name === 'blob') o.visible = false; });
  E.renderer.render(E.scene, E.camera);
  const url = E.renderer.domElement.toDataURL('image/png');
  E.scene.remove(root); dispose(root);
  MEM.set(key, url); idbSet(key, url);
  return url;
}

// ===== ガレージ用：指で回せる表示 =====
export function mountViewer(container, carId, cfg) {
  const canvas = document.createElement('canvas');
  canvas.className = 'car3d-view';
  container.innerHTML = ''; container.appendChild(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const { scene, sun } = setupScene(renderer);
  const camera = new THREE.PerspectiveCamera(24, 2.2, .1, 100);
  let root = buildCar(carId, cfg); scene.add(root); sun.target = root;
  frame(camera, root, '34');
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(root.userData.len / 2 + .15, .6, 0);
  controls.enablePan = false; controls.enableDamping = true; controls.minDistance = 6; controls.maxDistance = 14;
  controls.minPolarAngle = .6; controls.maxPolarAngle = 1.48;
  controls.autoRotate = true; controls.autoRotateSpeed = .8;
  canvas.addEventListener('pointerdown', () => { controls.autoRotate = false; });
  let raf = 0, alive = true;
  const resize = () => { const w = container.clientWidth || 600, h = Math.round(w / 2.2); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  resize();
  const ro = new ResizeObserver(resize); ro.observe(container);
  const loop = () => { if (!alive) return; controls.update(); renderer.render(scene, camera); raf = requestAnimationFrame(loop); };
  loop();
  return {
    update(c) { scene.remove(root); dispose(root); root = buildCar(carId, c); scene.add(root); sun.target = root; },
    dispose() { alive = false; cancelAnimationFrame(raf); ro.disconnect(); controls.dispose(); scene.remove(root); dispose(root); renderer.dispose(); renderer.forceContextLoss?.(); },
  };
}

// ===== IndexedDB キャッシュ =====
const DB = 'mathdrift-car3d', STORE = 'img';
let dbp = null;
function db() {
  if (dbp) return dbp;
  dbp = new Promise((res) => {
    try {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE);
      r.onsuccess = () => res(r.result); r.onerror = () => res(null);
    } catch { res(null); }
  });
  return dbp;
}
async function idbGet(k) { const d = await db(); if (!d) return null; return new Promise(res => { try { const q = d.transaction(STORE).objectStore(STORE).get(k); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); } catch { res(null); } }); }
async function idbSet(k, v) { const d = await db(); if (!d) return; try { d.transaction(STORE, 'readwrite').objectStore(STORE).put(v, k); } catch {} }
