// 数式キーパッド（iPadのソフトキーボードを出さない）
import { sfx } from '../util.js';

export function keypadLayout(kind, answerSample = '') {
  if (kind === 'num') return [['7', '8', '9', '⌫'], ['4', '5', '6', 'C'], ['1', '2', '3', '-'], ['0', '.', '/', '+']];
  const sample = Array.isArray(answerSample) ? answerSample.join(' ') : String(answerSample);
  let vars = [...new Set((sample.match(/[a-zπ]/g) || []))];
  if (!vars.length) vars = ['x'];
  if (vars.length < 3 && !vars.includes('π') && /π/.test(sample)) vars.push('π');
  const v = i => vars[i] || '';
  const rows = [
    ['7', '8', '9', v(0), '(', '⌫'],
    ['4', '5', '6', v(1), ')', 'C'],
    ['1', '2', '3', '+', '×', '^'],
    ['0', '.', '/', '-', '÷', v(2)],
  ];
  if (/[=<>≦≧]/.test(sample)) rows.push(['=', '<', '>', '≦', '≧', '']);
  return rows;
}

const LABEL = { '/': '<span class="frac" style="font-size:.6em"><span>□</span><span>□</span></span>', '-': '−', '^': 'x<sup>□</sup>', '⌫': '⌫', 'C': 'C' };

export function keypadHTML(kind, answerSample) {
  const rows = keypadLayout(kind, answerSample);
  const cols = rows[0].length;
  return `<div class="keypad" style="grid-template-columns:repeat(${cols},1fr)">${rows.flat().map(k => {
    if (!k) return '<div></div>';
    let cls = 'key';
    if ('+-×÷=<>≦≧^/()'.includes(k)) cls += ' op';
    if (/^[a-zπ]$/.test(k)) cls += ' var';
    if (k === '⌫' || k === 'C') cls += ' del';
    if (k === '/') cls += ' fkey';
    return `<button class="${cls}" data-key="${k}">${LABEL[k] || k}</button>`;
  }).join('')}</div>`;
}

// ===== 入力モデル =====
// 分数は「分数キー → 分母 → (分数キー) → 分子 → (分数キー) → 分数を出る」の順で入力する
// segs: 文字列 または {num, den}。mode: null | 'den' | 'num'（最後の分数を編集中）
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const SIMPLE = /^[0-9a-zπ.^]*$/;
const wrap = s => (SIMPLE.test(s) ? s : `(${s})`);

export class MathInput {
  constructor() { this.segs = []; this.mode = null; }
  get frac() { const l = this.segs[this.segs.length - 1]; return l && typeof l === 'object' ? l : null; }
  get length() { return this.toString().length; }
  press(k) {
    if (k === 'C') { this.segs = []; this.mode = null; return; }
    if (k === '⌫') return this.back();
    if (k === '/') {
      if (!this.mode) { this.segs.push({ num: '', den: '' }); this.mode = 'den'; }
      else if (this.mode === 'den') this.mode = 'num';
      else this.mode = null;
      return;
    }
    if (this.toString().length > 40) return;
    if (this.mode) { this.frac[this.mode] += k; return; }
    const l = this.segs[this.segs.length - 1];
    if (typeof l === 'string') this.segs[this.segs.length - 1] = l + k; else this.segs.push(k);
  }
  back() {
    const f = this.frac;
    if (this.mode === 'num') { if (f.num) f.num = f.num.slice(0, -1); else this.mode = 'den'; return; }
    if (this.mode === 'den') { if (f.den) f.den = f.den.slice(0, -1); else { this.segs.pop(); this.mode = null; } return; }
    const l = this.segs[this.segs.length - 1];
    if (l === undefined) return;
    if (typeof l === 'object') { this.mode = 'num'; this.back(); return; }
    const s = l.slice(0, -1);
    if (s) this.segs[this.segs.length - 1] = s; else this.segs.pop();
  }
  // 採点用の文字列（例：-3/4、(5x+1)/6、y=24/x）
  toString() {
    let out = '';
    for (const s of this.segs) {
      if (typeof s === 'string') { out += s; continue; }
      let num = s.num, sign = '';
      if (/^-[0-9a-zπ.^]+$/.test(num)) { sign = '-'; num = num.slice(1); }
      let f = `${sign}${wrap(num)}/${wrap(s.den)}`;
      if (/[0-9a-zπ.)]$/.test(out)) f = `(${f})`; // 直前が数や文字ならかっこでくくる
      out += f;
    }
    return out;
  }
  // 表示用HTML（active=入力中ならカーソル表示）
  html(active) {
    const txt = s => esc(s).replace(/-/g, '−').replace(/\*/g, '×').replace(/\^([0-9]+)/g, '<sup>$1</sup>').replace(/\^$/, '<sup>□</sup>');
    const caret = '<span class="caret"></span>';
    let h = '';
    this.segs.forEach((s, i) => {
      if (typeof s === 'string') { h += txt(s); return; }
      const last = i === this.segs.length - 1;
      const part = (v, m) => {
        const on = active && last && this.mode === m;
        return `<span class="fpart${on ? ' on' : ''}">${v ? txt(v) : '<i class="fbox">□</i>'}${on ? caret : ''}</span>`;
      };
      h += `<span class="frac in">${part(s.num, 'num')}${part(s.den, 'den')}</span>`;
    });
    if (active && !this.mode) h += caret;
    return h;
  }
}

// 分数キーのラベル（入力の状態で変わる）
export function fracKeyLabel(mode) {
  if (mode === 'den') return '<span class="fk">分子へ<b>↑</b></span>';
  if (mode === 'num') return '<span class="fk"><span>分数を</span><span>出る<b>→</b></span></span>';
  return LABEL['/'];
}

// 正解の文字列 → キー入力の順番（テスト用）
export function keysFor(ans) {
  const s = String(ans).replace(/<=/g, '≦').replace(/>=/g, '≧').replace(/\*/g, '×');
  const keys = [];
  let i = 0;
  const grab = (str, from, dir) => {
    // dir=-1: 直前のかたまり、dir=1: 直後のかたまり
    if (dir < 0) {
      if (str[from] === ')') { let d = 0, j = from; for (; j >= 0; j--) { if (str[j] === ')') d++; if (str[j] === '(') d--; if (!d) break; } return [j, str.slice(j + 1, from)]; }
      let j = from; while (j >= 0 && /[0-9a-zπ.^]/.test(str[j])) j--; return [j + 1, str.slice(j + 1, from + 1)];
    }
    if (str[from] === '(') { let d = 0, j = from; for (; j < str.length; j++) { if (str[j] === '(') d++; if (str[j] === ')') d--; if (!d) break; } return [j + 1, str.slice(from + 1, j)]; }
    let m = str.slice(from).match(/^([0-9.]+|[a-zπ])/); return [from + m[0].length, m[0]];
  };
  while (i < s.length) {
    const sl = s.indexOf('/', i);
    if (sl < 0) { keys.push(...s.slice(i)); break; }
    const [ns, num] = grab(s, sl - 1, -1);
    const [de, den] = grab(s, sl + 1, 1);
    keys.push(...s.slice(i, ns), '/', ...den, '/', ...num, '/');
    i = de;
  }
  return keys;
}

// ハードウェアキーボード対応（PCでのテスト用）
export function bindHardwareKeys(handler) {
  const map = { Backspace: '⌫', Escape: 'C', '*': '×', '-': '-', '+': '+', '/': '/', '.': '.', '(': '(', ')': ')', '^': '^', '=': '=', '<': '<', '>': '>' };
  const fn = e => {
    if (e.target.closest('textarea,input')) return;
    let k = map[e.key] || (/^[0-9a-z]$/.test(e.key) ? e.key : null);
    if (e.key === 'Enter') { handler('ENTER'); e.preventDefault(); return; }
    if (k) { handler(k); e.preventDefault(); }
  };
  window.addEventListener('keydown', fn);
  return () => window.removeEventListener('keydown', fn);
}

export function keyTapFeedback() { sfx.tap(); }
