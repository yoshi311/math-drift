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
    return `<button class="${cls}" data-key="${k}">${LABEL[k] || k}</button>`;
  }).join('')}</div>`;
}

// 入力値にキーを適用
export function applyKey(val, k) {
  if (k === '⌫') return val.slice(0, -1);
  if (k === 'C') return '';
  if (val.length > 40) return val;
  return val + k;
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
