// キャラ立ち絵（画像生成AIで作ったイラスト）
// face: 画像の中の顔の向き（1=右向き / -1=左向き / 0=正面）
// 表情差分の画像がない表情は、CSSの演出（e-angry など）で表す
export const CHARA_IMG = {
  kaito: { face: 1 },
  gen: { face: 1 },
  mio: { face: 0 },
  jii: { face: -1 },
  mc: { face: 1 },
  gouda: { face: -1 },
  rin: { face: 0 },
  kurosaki: { face: -1 },
  kujo: { face: 1 },
  ryuzaki: { face: 0 },
  viper: { face: 1 },
  phantom: { face: -1 },
  yuma: { face: 0 },
  himuro: { face: 1 },
  natsu: { face: 0 },
  kisaragi: { face: 0 },
  makabe: { face: 1 },
  mido: { face: 0 },
  joker: { face: -1 },
  zero: { face: 1 },
  me1: { face: 1 },
  me2: { face: -1 },
  me3: { face: 0 },
  me4: { face: 1 },
  me5: { face: 1 },
  me6: { face: 0 },
};

export const AVATARS = ['me1', 'me2', 'me3', 'me4', 'me5', 'me6'];

export function charaImgHTML(key, expr = 'normal', dir = 1, color = '#00e5ff') {
  const m = CHARA_IMG[key];
  if (!m) return '';
  const file = m.exprs && m.exprs.includes(expr) ? `${key}_${expr}` : key;
  const flip = m.face && m.face !== dir ? ' flip' : '';
  return `<div class="chara cimg e-${expr}${flip}" style="--cc:${color}" aria-hidden="true"><img src="img/chara/${file}.webp" alt="" decoding="async" draggable="false"></div>`;
}
