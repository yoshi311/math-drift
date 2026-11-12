// Sketchfab の glTF を、ゲーム用の共通形式の glb にする
//  ・座標を焼き込み：単位 m、前が +z、後端 z=0、地面 y=0、左右中央 x=0（実車の全長に合わせて拡大縮小）
//  ・ホイール（タイヤ・リム・ブレーキ）を形から切り出して Wheel_FL / FR / RL / RR に
//  ・ボディ色・ツートン・ガラスのマテリアル名を Paint / Tone / Glass にそろえる
//  ・間引き → テクスチャ縮小WebP → meshopt 圧縮
// 使い方: tools/ で npm i @gltf-transform/core@4 @gltf-transform/extensions@4 @gltf-transform/functions@4 meshoptimizer sharp したうえで
//   node model-prep2.mjs <id> <scene.gltf> <out.glb>   設定は model-cars.json、実寸は data/car-shapes.js
import fs from 'fs';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { weld, simplifyPrimitive, textureCompress, meshopt, prune, dedup, quantize } from '@gltf-transform/functions';
import { MeshoptSimplifier, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';

const [id, src, out, ...flags] = process.argv.slice(2);
const RAW = flags.includes('--raw');
const CFG = JSON.parse(fs.readFileSync(new URL('./model-cars.json', import.meta.url), 'utf8'))[id] || {};
const { SHAPES } = await import('file:///C:/Users/yoshi/Desktop/数学自動車ゲーム/data/car-shapes.js');
const S = SHAPES[id]; if (!S) throw new Error('no shape ' + id);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const doc = await io.read(src);
await MeshoptSimplifier.ready; await MeshoptEncoder.ready;
const root = doc.getRoot(), scene = root.listScenes()[0];

// ---- 行列 ----
const mmul = (a, b) => { const o = new Array(16).fill(0); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k]; return o; };
const det3 = m => m[0] * (m[5] * m[10] - m[9] * m[6]) - m[4] * (m[1] * m[10] - m[9] * m[2]) + m[8] * (m[1] * m[6] - m[5] * m[2]);
const AX = { '+x': [1, 0, 0], '-x': [-1, 0, 0], '+y': [0, 1, 0], '-y': [0, -1, 0], '+z': [0, 0, 1], '-z': [0, 0, -1] };
const ey = AX[CFG.up || '+y'], ez = AX[CFG.fwd || '+z'];
const ex = [ey[1] * ez[2] - ey[2] * ez[1], ey[2] * ez[0] - ey[0] * ez[2], ey[0] * ez[1] - ey[1] * ez[0]];
// 列優先：新座標 = R・旧座標（R の行が ex, ey, ez）
const R = [ex[0], ey[0], ez[0], 0, ex[1], ey[1], ez[1], 0, ex[2], ey[2], ez[2], 0, 0, 0, 0, 1];
const drop = new RegExp(CFG.drop || '^$');

// ---- ノードの座標を焼き込み、平らな構造にする ----
const items = [];
scene.traverse(n => { const m = n.getMesh(); if (m) items.push([n, m]); });
const flat = [];
for (const [n, mesh] of items) {
  if (drop.test(n.getName()) && CFG.drop) continue;
  const W = mmul(R, n.getWorldMatrix());
  const flip = det3(W) < 0;
  const nm = doc.createMesh(mesh.getName());
  for (const p0 of mesh.listPrimitives()) {
    const mat = p0.getMaterial();
    if (CFG.drop && mat && drop.test(mat.getName())) continue;
    const p = p0.clone();
    for (const sem of p.listSemantics()) p.setAttribute(sem, p0.getAttribute(sem).clone());
    if (p0.getIndices()) p.setIndices(p0.getIndices().clone());
    const P = p.getAttribute('POSITION'), N = p.getAttribute('NORMAL'), v = [0, 0, 0];
    for (let i = 0; i < P.getCount(); i++) { P.getElement(i, v); P.setElement(i, [W[0] * v[0] + W[4] * v[1] + W[8] * v[2] + W[12], W[1] * v[0] + W[5] * v[1] + W[9] * v[2] + W[13], W[2] * v[0] + W[6] * v[1] + W[10] * v[2] + W[14]]); }
    if (N) for (let i = 0; i < N.getCount(); i++) { N.getElement(i, v); let a = [W[0] * v[0] + W[4] * v[1] + W[8] * v[2], W[1] * v[0] + W[5] * v[1] + W[9] * v[2], W[2] * v[0] + W[6] * v[1] + W[10] * v[2]]; const l = Math.hypot(...a) || 1; if (flip) l; N.setElement(i, a.map(x => x / l)); }
    p.setAttribute('TANGENT', null);
    if (flip) { const I = p.getIndices(); if (I) { const a = I.getArray().slice(); for (let t = 0; t < a.length; t += 3) { const k = a[t + 1]; a[t + 1] = a[t + 2]; a[t + 2] = k; } I.setArray(a); } }
    nm.addPrimitive(p);
  }
  if (!nm.listPrimitives().length) continue;
  flat.push(doc.createNode(n.getName() || 'part').setMesh(nm));
}
for (const n of scene.listChildren()) scene.removeChild(n);
for (const n of root.listNodes()) if (!flat.includes(n)) n.dispose();
flat.forEach(n => scene.addChild(n));

// ---- 範囲 → 拡大縮小・平行移動 ----
const prims = () => flat.flatMap(n => n.getMesh().listPrimitives());
const bounds = () => { const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9], v = [0, 0, 0]; for (const p of prims()) { const P = p.getAttribute('POSITION'); for (let i = 0; i < P.getCount(); i++) { P.getElement(i, v); for (let a = 0; a < 3; a++) { mn[a] = Math.min(mn[a], v[a]); mx[a] = Math.max(mx[a], v[a]); } } } return [mn, mx]; };
let [mn, mx] = bounds();
const s = (S.len / 1000) / (mx[2] - mn[2]);
const cxo = (mn[0] + mx[0]) / 2;
for (const p of prims()) { const P = p.getAttribute('POSITION'), v = [0, 0, 0]; for (let i = 0; i < P.getCount(); i++) { P.getElement(i, v); P.setElement(i, [(v[0] - cxo) * s, (v[1] - mn[1]) * s, (v[2] - mn[2]) * s]); } }
[mn, mx] = bounds();
console.log(id, 'scale', s.toFixed(5), 'size(m)', mx.map((v, i) => (v - mn[i]).toFixed(3)).join(' '), 'width spec', '');

// ---- ホイールの位置（タイヤの接地点から）----
const L = S.len / 1000, R0 = S.tire / 2000;
const axF = CFG.axF ?? (L - S.fo / 1000), axR = CFG.axR ?? (L - (S.fo + S.wb) / 1000);
const allV = []; for (const p of prims()) { const P = p.getAttribute('POSITION'), v = [0, 0, 0]; for (let i = 0; i < P.getCount(); i += 1) { P.getElement(i, v); if (v[1] < R0 * 2.3) allV.push([v[0], v[1], v[2]]); } }
const wheels = {};
for (const [fk, az] of [['F', axF], ['R', axR]]) for (const [sk, sg] of [['L', 1], ['R', -1]]) {
  const key = fk + sk; // FL: 前・左（+x を左とする）
  const near = allV.filter(v => Math.sign(v[0]) === sg && Math.abs(v[2] - az) < R0 * 1.3);
  const low = near.filter(v => v[1] < 0.03);
  let zc = az, xo = Math.max(...near.map(v => Math.abs(v[0])));
  if (low.length > 10) { zc = (Math.min(...low.map(v => v[2])) + Math.max(...low.map(v => v[2]))) / 2; xo = Math.max(...low.map(v => Math.abs(v[0]))); }
  // 半径：中心からの距離の分布で、タイヤ表面の外側にあるすき間を探す
  // 地面に接する円（中心 (zc, R)）上の点なら R＝(dz²＋y²)/(2y)。タイヤの表面の点はこの値が1つに集まる → 最頻値
  const bins = {};
  for (const v of near) { if (Math.abs(v[0]) < xo - 0.22 || v[1] < R0 * .5) continue; const dz = v[2] - zc, Ri = (dz * dz + v[1] * v[1]) / (2 * v[1]); if (Ri > R0 * (CFG.rMin ?? .88) && Ri < R0 * (CFG.rMax ?? 1.12)) { const k = Math.round(Ri / 0.004); bins[k] = (bins[k] || 0) + 1; } }
  const mxc = Math.max(0, ...Object.values(bins));
  const ks = Object.entries(bins).filter(([, c]) => c >= mxc * (CFG.rFrac ?? 0.3)).map(([k]) => +k);
  let Rr = ks.length ? Math.max(...ks) * 0.004 + 0.002 : R0;
  if (CFG.rScale) Rr = R0 * CFG.rScale;
  wheels[key] = { zc, yc: Rr, R: Rr, xo, xi: xo - (CFG.tw ?? 0.30), sg };
  console.log('  wheel', key, 'z', zc.toFixed(3), 'R', Rr.toFixed(3), '(spec', R0.toFixed(3) + ')', 'xo', xo.toFixed(3), 'contact pts', low.length);
}

// ---- マテリアル名をそろえる ----
const ren = (list, name) => (list || []).forEach(nm => root.listMaterials().filter(m => m.getName() === nm).forEach(m => m.setName(name)));
ren(CFG.paint, 'Paint'); ren(CFG.tone, 'Tone'); ren(CFG.glass, 'Glass');

// ---- ホイールの三角形を切り出す ----
const inWheel = (v, w) => Math.sign(v[0]) === w.sg && Math.abs(v[0]) >= w.xi && Math.abs(v[0]) <= w.xo + 0.03 && Math.hypot(v[2] - w.zc, v[1] - w.yc) <= w.R * (CFG.rPad ?? 1.04);
const wheelNodes = {};
for (const n of [...flat]) {
  const mesh = n.getMesh();
  for (const p of [...mesh.listPrimitives()]) {
    if (/^(Paint|Tone|Glass)$/.test(p.getMaterial()?.getName() || '') || (CFG.noWheel && new RegExp(CFG.noWheel).test(p.getMaterial()?.getName() || ''))) continue;
    const P = p.getAttribute('POSITION'); let I = p.getIndices(); const idx = I ? Array.from(I.getArray()) : [...Array(P.getCount()).keys()];
    const keep = [], parts = { FL: [], FR: [], RL: [], RR: [] }, a = [0, 0, 0], b = [0, 0, 0], c = [0, 0, 0];
    for (let t = 0; t < idx.length; t += 3) {
      P.getElement(idx[t], a); P.getElement(idx[t + 1], b); P.getElement(idx[t + 2], c);
      let hit = null; for (const [k, w] of Object.entries(wheels)) if (inWheel(a, w) && inWheel(b, w) && inWheel(c, w)) { hit = k; break; }
      (hit ? parts[hit] : keep).push(idx[t], idx[t + 1], idx[t + 2]);
    }
    if (keep.length === idx.length) continue;
    for (const [k, tri] of Object.entries(parts)) {
      if (!tri.length) continue;
      const q = p.clone(); q.setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(tri)));
      (wheelNodes[k] ||= doc.createNode('Wheel_' + k).setMesh(doc.createMesh('Wheel_' + k))).getMesh().addPrimitive(q);
    }
    if (keep.length) { if (!I) { I = doc.createAccessor().setType('SCALAR'); p.setIndices(I); } p.setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(keep))); }
    else mesh.removePrimitive(p);
  }
}
for (const n of Object.values(wheelNodes)) scene.addChild(n);
console.log('  wheel parts', Object.entries(wheelNodes).map(([k, n]) => k + ':' + n.getMesh().listPrimitives().reduce((t, p) => t + p.getIndices().getCount() / 3, 0)).join(' '));


// ---- 間引き ----
await doc.transform(weld());
const tri = p => (p.getIndices() ? p.getIndices().getCount() : p.getAttribute('POSITION').getCount()) / 3;
let before = 0; for (const p of root.listMeshes().flatMap(m => m.listPrimitives())) before += tri(p);
const target = CFG.target ?? 160000, base = Math.min(1, target / before);
let after = 0;
for (const mesh of root.listMeshes()) for (const p of mesh.listPrimitives()) {
  const nm = p.getMaterial()?.getName() || '';
  let r = nm === 'Paint' ? Math.min(1, base * 1.6) : nm === 'Glass' ? Math.min(1, base * 1.3) : /^Wheel_/.test(mesh.getName()) ? base * .7 : base;
  if (!RAW && r < 0.98 && tri(p) > 200) simplifyPrimitive(p, { simplifier: MeshoptSimplifier, ratio: r, error: 0.002, lockBorder: false });
  after += tri(p);
}
console.log('  triangles', Math.round(before), '->', Math.round(after));
await doc.transform(dedup(), prune(), textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [CFG.tex ?? 1024, CFG.tex ?? 1024], quality: 80 }), quantize(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
await io.write(out, doc);
console.log('  wrote', out, (fs.statSync(out).size / 1e6).toFixed(2), 'MB');
