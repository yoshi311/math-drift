// 表示用の数式整形と採点ロジック
import { esc } from './util.js';

// データ中の簡易記法を HTML に変換
//  {a/b} → 分数, x^2 → 上付き, \n → 改行
export function fmt(s) {
  if (s == null) return '';
  let t = String(s);
  t = t.replace(/\{([^{}]+?)\/([^{}]+?)\}/g, (_, a, b) => `<span class="frac"><span>${a}</span><span>${b}</span></span>`);
  t = t.replace(/\^\(([^()]+)\)/g, '<sup>$1</sup>');
  t = t.replace(/\^(-?[0-9]+|[a-zA-Z])/g, '<sup>$1</sup>');
  t = t.replace(/\n/g, '<br>');
  return t;
}

// ===== 有理数 =====
function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a || 1; }
export function parseRational(s) {
  s = String(s).trim().replace(/−/g, '-').replace(/＋/g, '+');
  const m = s.match(/^([+-]?)(\d+(?:\.\d+)?)(?:\/(\d+))?$/);
  if (!m) return null;
  const sign = m[1] === '-' ? -1 : 1;
  let num = m[2], den = m[3] ? parseInt(m[3], 10) : 1;
  if (den === 0) return null;
  let n, d;
  if (num.includes('.')) {
    const dec = num.split('.')[1].length;
    n = Math.round(parseFloat(num) * 10 ** dec); d = 10 ** dec * den;
  } else { n = parseInt(num, 10); d = den; }
  const isFrac = !!m[3], isDec = num.includes('.');
  const g = gcd(n, d);
  return { n: sign * n / g, d: d / g, raw: { n: sign * n, d }, isFrac, isDec, reduced: !isFrac || gcd(n, den) === 1, hasPlus: m[1] === '+' };
}

// ===== 式パーサ =====
function tokenize(src) {
  const s = src.replace(/−/g, '-').replace(/×/g, '*').replace(/÷/g, '/').replace(/\s+/g, '');
  const toks = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/[0-9.]/.test(c)) { let j = i; while (j < s.length && /[0-9.]/.test(s[j])) j++; toks.push({ t: 'num', v: parseFloat(s.slice(i, j)) }); i = j; continue; }
    if (/[a-zπ]/.test(c)) { toks.push({ t: 'var', v: c }); i++; continue; }
    if ('+-*/^'.includes(c)) { toks.push({ t: 'op', v: c }); i++; continue; }
    if (c === '(') { toks.push({ t: 'lp' }); i++; continue; }
    if (c === ')') { toks.push({ t: 'rp' }); i++; continue; }
    throw new Error('bad char ' + c);
  }
  return toks;
}
function parse(src) {
  const toks = tokenize(src); let p = 0;
  const peek = () => toks[p];
  const isStart = t => t && (t.t === 'num' || t.t === 'var' || t.t === 'lp');
  function expr() {
    const terms = [term()];
    while (peek() && peek().t === 'op' && (peek().v === '+' || peek().v === '-')) {
      const op = toks[p++].v; const r = term();
      terms.push(op === '-' ? { k: 'neg', a: r } : r);
    }
    return terms.length === 1 ? terms[0] : { k: 'sum', a: terms };
  }
  function term() {
    let l = unary();
    for (;;) {
      const t = peek();
      if (t && t.t === 'op' && (t.v === '*' || t.v === '/')) { p++; const r = unary(); l = { k: t.v === '*' ? 'mul' : 'div', a: l, b: r }; }
      else if (isStart(t)) { const r = power(); l = { k: 'mul', a: l, b: r }; }
      else break;
    }
    return l;
  }
  function unary() {
    const t = peek();
    if (t && t.t === 'op' && (t.v === '-' || t.v === '+')) { p++; const a = unary(); return t.v === '-' ? { k: 'neg', a } : a; }
    return power();
  }
  function power() {
    const b = atom();
    if (peek() && peek().t === 'op' && peek().v === '^') { p++; const e = unary(); return { k: 'pow', a: b, b: e }; }
    return b;
  }
  function atom() {
    const t = toks[p++];
    if (!t) throw new Error('eof');
    if (t.t === 'num') return { k: 'num', v: t.v };
    if (t.t === 'var') return { k: 'var', v: t.v };
    if (t.t === 'lp') { const e = expr(); if (!toks[p] || toks[p].t !== 'rp') throw new Error('paren'); p++; return e; }
    throw new Error('unexpected');
  }
  const tree = expr();
  if (p !== toks.length) throw new Error('trailing');
  return tree;
}
function evalTree(n, env) {
  switch (n.k) {
    case 'num': return n.v;
    case 'var': return n.v === 'π' ? Math.PI : env[n.v];
    case 'neg': return -evalTree(n.a, env);
    case 'sum': return n.a.reduce((s, x) => s + evalTree(x, env), 0);
    case 'mul': return evalTree(n.a, env) * evalTree(n.b, env);
    case 'div': return evalTree(n.a, env) / evalTree(n.b, env);
    case 'pow': return Math.pow(evalTree(n.a, env), evalTree(n.b, env));
  }
  return NaN;
}
function termCount(n) { return n.k === 'sum' ? n.a.length : 1; }
function varsOf(s) { return [...new Set((s.match(/[a-z]/g) || []))]; }

const REL = /(<=|>=|≦|≧|=|<|>)/;
function splitRel(s) {
  const m = s.match(REL);
  if (!m) return null;
  const i = m.index;
  let op = m[1]; if (op === '≦') op = '<='; if (op === '≧') op = '>=';
  return { l: s.slice(0, i), op, r: s.slice(i + m[1].length) };
}

function close(a, b) { return Math.abs(a - b) <= 1e-7 * Math.max(1, Math.abs(a), Math.abs(b)); }

export function exprEquivalent(a, b) {
  const ta = parse(a), tb = parse(b);
  const vars = [...new Set([...varsOf(a), ...varsOf(b)])];
  for (let i = 0; i < 6; i++) {
    const env = {}; vars.forEach(v => env[v] = 1.37 + Math.random() * 2.9);
    const x = evalTree(ta, env), y = evalTree(tb, env);
    if (!isFinite(x) || !isFinite(y) || !close(x, y)) return false;
  }
  return true;
}

function relEquivalent(inp, ans) {
  const A = splitRel(ans), B = splitRel(inp);
  if (!A || !B) return false;
  const flip = { '<': '>', '>': '<', '<=': '>=', '>=': '<=', '=': '=' };
  let bl = B.l, br = B.r, bop = B.op;
  if (bop !== A.op) { if (flip[bop] === A.op) { [bl, br] = [br, bl]; bop = A.op; } else return false; }
  const da = parse(`(${A.l})-(${A.r})`), db = parse(`(${bl})-(${br})`);
  const vars = [...new Set([...varsOf(ans), ...varsOf(inp)])];
  let ratio = null;
  for (let i = 0; i < 6; i++) {
    const env = {}; vars.forEach(v => env[v] = 1.37 + Math.random() * 2.9);
    const x = evalTree(da, env), y = evalTree(db, env);
    if (Math.abs(x) < 1e-12) continue;
    const r = y / x;
    if (ratio === null) ratio = r; else if (!close(r, ratio)) return false;
  }
  if (ratio === null || Math.abs(ratio) < 1e-12) return false;
  if (A.op !== '=' && ratio < 0) return false;
  // 等式の場合は「元の形に近い」もののみ（係数倍は許可するが、左辺が文字1つの形なら比=1を要求）
  if (A.op === '=' && /^[a-z]$/.test(A.l.trim()) && !close(Math.abs(ratio), 1)) return false;
  return true;
}

// ===== 採点 =====
// 戻り値 {ok, msg}
export function gradeNum(input, answer, opt = {}) {
  const answers = Array.isArray(answer) ? answer : [answer];
  const r = parseRational(input);
  if (!r) return { ok: false, msg: '数の形で答えよう' };
  for (const a of answers) {
    const ra = parseRational(a);
    if (!ra) continue;
    if (ra.n === r.n && ra.d === r.d) {
      if (r.isFrac && !r.reduced) return { ok: false, msg: '値は合っているけど、約分しよう！' };
      if (r.isFrac && r.d === 1) return { ok: false, msg: '値は合っているけど、整数で答えよう！' };
      if (opt.frac && r.isDec && ra.d !== 1) return { ok: false, msg: '分数で答えよう' };
      if (opt.sign && ra.n > 0 && !r.hasPlus) return { ok: false, msg: '符号（＋）をつけて答えよう' };
      return { ok: true };
    }
  }
  // 符号ミス
  for (const a of answers) { const ra = parseRational(a); if (ra && ra.n === -r.n && ra.d === r.d && r.n !== 0) return { ok: false, msg: '符号をもう一度チェック！' }; }
  return { ok: false };
}

export function gradeExpr(input, answer, opt = {}) {
  const answers = Array.isArray(answer) ? answer : [answer];
  const raw = input.replace(/−/g, '-');
  let firstMsg = null;
  try {
    for (const a of answers) {
      if (REL.test(a)) { if (relEquivalent(raw, a)) return { ok: true }; continue; }
      if (REL.test(raw)) continue;
      if (!exprEquivalent(raw, a)) continue;
      let msg = null;
      if (!opt.loose) {
        if (/[×÷*]/.test(raw) && !/[×÷*]/.test(a)) msg = '値は合っているけど、× や ÷ の記号を使わずに表そう';
        else if (/(^|[^0-9.])1[a-z(]/.test(raw)) msg = '値は合っているけど、1 は省略して書こう（1x → x）';
        else if (/[a-z][0-9]/.test(raw.replace(/\^[0-9]+/g, ''))) msg = '数は文字の前に書こう（x3 → 3x）';
        else if (/[()]/.test(raw) && !/[()]/.test(a)) msg = '値は合っているけど、かっこをはずして整理しよう';
        else if (termCount(parse(raw)) > termCount(parse(a))) msg = '値は合っているけど、まだまとめられるよ（同類項をまとめよう）';
      }
      if (!msg) return { ok: true };
      firstMsg = firstMsg || msg;
    }
  } catch (e) {
    return { ok: false, msg: '式の形がおかしいみたい。かっこや記号をチェック！' };
  }
  return firstMsg ? { ok: false, msg: firstMsg } : { ok: false };
}

export function gradeValue(input, answer, kind = 'num', opt = {}) {
  if (!input || !String(input).trim()) return { ok: false, msg: '答えを入力しよう', empty: true };
  return kind === 'expr' ? gradeExpr(input, answer, opt) : gradeNum(input, answer, opt);
}
