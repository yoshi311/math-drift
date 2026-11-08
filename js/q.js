// 問題データ作成ヘルパー
// N: 数値入力 / E: 式入力 / C: 選択 / O: 並べ替え / F: 複数欄
// o: { hint, fig, unit, pre, sign, frac, loose, keys }
const ex = e => Array.isArray(e) ? e : [e];
export const N = (q, answer, explain, o = {}) => ({ type: 'num', q, answer, explain: ex(explain), ...o });
export const E = (q, answer, explain, o = {}) => ({ type: 'expr', q, answer, explain: ex(explain), ...o });
export const C = (q, options, answer, explain, o = {}) => ({ type: 'choice', q, options, answer, explain: ex(explain), ...o });
export const O = (q, items, explain, o = {}) => ({ type: 'order', q, items, explain: ex(explain), ...o });
// fields: [[pre, answer, unit?], ...]
export const F = (q, fields, explain, o = {}) => ({
  type: 'fields', q,
  fields: fields.map(f => ({ pre: f[0], answer: f[1], unit: f[2] || '', kind: /[a-z]/.test(String(f[1])) ? 'expr' : 'num' })),
  explain: ex(explain), ...o
});
