// 開発用：Sketchfab等のglTFを軽量化（ホイール角度の初期化 → 部位ごとに間引き → テクスチャ縮小WebP → meshopt圧縮）
// 使い方: npm i @gltf-transform/core@4 @gltf-transform/extensions@4 @gltf-transform/functions@4 meshoptimizer sharp したフォルダで node model-prep.mjs scene.gltf out.glb
// AE86 glTF の軽量化：部位ごとに間引き率を変える → テクスチャ縮小WebP → meshopt圧縮
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { weld, simplifyPrimitive, textureCompress, meshopt, prune, dedup, quantize } from '@gltf-transform/functions';
import { MeshoptSimplifier, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
const [src, out] = process.argv.slice(2);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const doc = await io.read(src);
await MeshoptSimplifier.ready; await MeshoptEncoder.ready;
const R = { TireMaterial: .10, RimMaterial: .3, InteriorPlastic: .12, Interior: .12, InteriorPlastic2: .15, Seatbelt: .08, SteeringWheel: .2, BrakeCaliper: .15, Brake_Disc: .25,
  Trim1: .35, Trim2: .45, Primary: 1, Secondary: 1, Windows: .8, LampCovers: .5, Reflector: .45, TailightFrame: .6 };
// ホイールの舵角・キャンバーをまっすぐに（FL_15 などのノードの回転を初期化）
for (const n of doc.getRoot().listNodes()) if (/^(FL|FR|RL|RR)_\d+$/.test(n.getName())) n.setRotation([0, 0, 0, 1]);
await doc.transform(weld());
let before = 0, after = 0;
const tri = p => (p.getIndices() ? p.getIndices().getCount() : p.getAttribute('POSITION').getCount()) / 3;
for (const mesh of doc.getRoot().listMeshes()) for (const p of mesh.listPrimitives()) {
  const r = R[p.getMaterial()?.getName()] ?? 1; before += tri(p);
  if (r < 1) simplifyPrimitive(p, { simplifier: MeshoptSimplifier, ratio: r, error: 0.004, lockBorder: false });
  after += tri(p);
}
console.log('triangles', Math.round(before), '->', Math.round(after));
await doc.transform(
  dedup(), prune(),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024], quality: 82 }),
  quantize(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
);
await io.write(out, doc);
