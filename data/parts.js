// カスタムパーツ（GPで購入。購入済みパーツはどの車にも使える）
export const COLORS = [
  { id: 'color-white', name: 'ホワイト', hex: '#f4f4f4', price: 0 },
  { id: 'color-black', name: 'ブラック', hex: '#141414', price: 0 },
  { id: 'color-red', name: 'レッド', hex: '#c8102e', price: 0 },
  { id: 'color-silver', name: 'シルバー', hex: '#b8bcc2', price: 100 },
  { id: 'color-gunmetal', name: 'ガンメタ', hex: '#3a3f47', price: 150 },
  { id: 'color-yellow', name: 'イエロー', hex: '#f5d300', price: 150 },
  { id: 'color-blue', name: 'ベイサイドブルー', hex: '#2f56b8', price: 200 },
  { id: 'color-orange', name: 'オレンジ', hex: '#ff7a00', price: 200 },
  { id: 'color-wrblue', name: 'ラリーブルー', hex: '#1d3f9e', price: 250 },
  { id: 'color-green', name: 'ミレニアムジェイド', hex: '#5f7d6a', price: 300 },
  { id: 'color-pearl', name: 'パールホワイト', hex: '#fffdf5', price: 300 },
  { id: 'color-purple', name: 'ミッドナイトパープル', hex: '#3b1d5a', price: 600 },
  { id: 'color-neon', name: 'ネオンシアン', hex: '#00d5ee', price: 500 },
  { id: 'color-pink', name: 'ホットピンク', hex: '#ff3d8b', price: 400 },
  { id: 'color-gold', name: 'ゴールド', hex: '#c9a227', price: 800 },
  { id: 'color-custom', name: 'カスタムカラー（自由に調色）', hex: null, price: 1500 },
];

export const PARTS = {
  tone: [
    { id: 'tone-none', name: 'なし', v: false, price: 0, free: true },
    { id: 'tone-on', name: 'ツートン（下半分の色を変える）', v: true, price: 400 },
  ],
  wheel: [
    { id: 'wheel-steel', name: 'スチール', v: 'steel', price: 0 },
    { id: 'wheel-mesh', name: 'メッシュ', v: 'mesh', price: 0 },
    { id: 'wheel-5spoke', name: '5本スポーク', v: '5spoke', price: 300 },
    { id: 'wheel-6spoke', name: '6本スポーク', v: '6spoke', price: 500 },
    { id: 'wheel-deep', name: '深リム', v: 'deep', price: 600 },
    { id: 'wheel-disc', name: 'エアロディスク', v: 'disc', price: 800 },
  ],
  wcolor: [
    { id: 'wcolor-silver', name: 'シルバー', v: '#c9ced6', price: 0, free: true },
    { id: 'wcolor-black', name: 'ブラック', v: '#1d1f24', price: 150 },
    { id: 'wcolor-white', name: 'ホワイト', v: '#f2f2f2', price: 150 },
    { id: 'wcolor-bronze', name: 'ブロンズ', v: '#b8862b', price: 250 },
    { id: 'wcolor-gold', name: 'ゴールド', v: '#e2b33c', price: 300 },
    { id: 'wcolor-red', name: 'レッド', v: '#d0202e', price: 300 },
  ],
  inch: [
    { id: 'inch-14', name: '14インチ', v: 14, price: 0, free: true },
    { id: 'inch-15', name: '15インチ', v: 15, price: 0, free: true },
    { id: 'inch-16', name: '16インチ', v: 16, price: 200 },
    { id: 'inch-17', name: '17インチ', v: 17, price: 400 },
    { id: 'inch-18', name: '18インチ', v: 18, price: 700 },
    { id: 'inch-19', name: '19インチ', v: 19, price: 1000 },
  ],
  susp: [
    { id: 'susp-stock', name: 'ノーマル（車高0）', v: [0, 0], price: 0, free: true },
    { id: 'susp-down', name: 'ダウンサス（−2まで）', v: [-2, 0], price: 300 },
    { id: 'susp-coil', name: '車高調（−5〜＋2）', v: [-5, 2], price: 1000 },
  ],
  lip: [
    { id: 'lip-0', name: 'なし', v: 0, price: 0, free: true },
    { id: 'lip-1', name: 'リップスポイラー', v: 1, price: 200 },
    { id: 'lip-2', name: 'フロントスポイラー', v: 2, price: 400 },
    { id: 'lip-3', name: 'カナード付きディフューザー', v: 3, price: 700 },
  ],
  skirt: [
    { id: 'skirt-0', name: 'なし', v: 0, price: 0, free: true },
    { id: 'skirt-1', name: 'サイドステップ', v: 1, price: 300 },
    { id: 'skirt-2', name: 'ワイドサイドスカート', v: 2, price: 500 },
  ],
  wing: [
    { id: 'wing-0', name: 'なし', v: 0, price: 0, free: true },
    { id: 'wing-1', name: 'ダックテール', v: 1, price: 200 },
    { id: 'wing-2', name: 'リアウイング', v: 2, price: 500 },
    { id: 'wing-3', name: 'GTウイング', v: 3, price: 1000 },
  ],
  bonnet: [
    { id: 'bonnet-0', name: 'ノーマル', v: false, price: 0, free: true },
    { id: 'bonnet-1', name: 'カーボンボンネット', v: true, price: 600 },
  ],
  livery: [
    { id: 'livery-none', name: 'なし', v: 'none', price: 0, free: true },
    { id: 'livery-stripe', name: 'レーシングストライプ', v: 'stripe', price: 300 },
    { id: 'livery-number', name: 'ゼッケン', v: 'number', price: 200 },
    { id: 'livery-ghost', name: 'GHOST LINE ステッカー', v: 'ghost', price: 400 },
    { id: 'livery-fire', name: 'ファイヤーパターン', v: 'fire', price: 800 },
    { id: 'livery-shop', name: 'TAKAMIYA FACTORY ロゴ', v: 'shop', price: 500 },
  ],
  tint: [
    { id: 'tint-0', name: 'なし', v: 0, price: 0, free: true },
    { id: 'tint-1', name: 'ライトスモーク', v: 1, price: 100 },
    { id: 'tint-2', name: 'ダークスモーク', v: 2, price: 200 },
  ],
  neon: [
    { id: 'neon-none', name: 'なし', v: null, price: 0, free: true },
    { id: 'neon-cyan', name: 'シアン', v: '#00e5ff', price: 500 },
    { id: 'neon-red', name: 'レッド', v: '#ff2d55', price: 500 },
    { id: 'neon-green', name: 'グリーン', v: '#2bff88', price: 500 },
    { id: 'neon-purple', name: 'パープル', v: '#b26bff', price: 600 },
  ],
};

export const PART_LABELS = {
  color: 'ボディカラー', tone: 'ツートン', wheel: 'ホイール', wcolor: 'ホイール色', inch: 'インチ', susp: 'サスペンション',
  lip: 'フロント', skirt: 'サイド', wing: 'リア', bonnet: 'ボンネット', livery: 'ステッカー', tint: 'ガラス', neon: 'アンダーネオン',
};

// パーツによる性能ボーナス（演出用）
export const PART_BONUS = {
  'lip-1': { aero: 3 }, 'lip-2': { aero: 6 }, 'lip-3': { aero: 10 },
  'skirt-1': { aero: 3 }, 'skirt-2': { aero: 5 },
  'wing-1': { aero: 3 }, 'wing-2': { aero: 8 }, 'wing-3': { aero: 14 },
  'bonnet-1': { power: 3, grip: 2 },
  'susp-down': { grip: 4 }, 'susp-coil': { grip: 10 },
  'inch-16': { grip: 2 }, 'inch-17': { grip: 4 }, 'inch-18': { grip: 6 }, 'inch-19': { grip: 7 },
};

export function allPartIds() {
  const ids = COLORS.map(c => c.id);
  for (const k of Object.keys(PARTS)) for (const p of PARTS[k]) ids.push(p.id);
  return ids;
}
export function partById(id) {
  const c = COLORS.find(c => c.id === id); if (c) return { ...c, cat: 'color' };
  for (const k of Object.keys(PARTS)) { const p = PARTS[k].find(p => p.id === id); if (p) return { ...p, cat: k }; }
  return null;
}
