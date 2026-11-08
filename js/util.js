import { state } from './state.js';

export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function shuffle(arr, rnd = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export function seeded(seedStr) {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) { h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

export function toast(msg, kind = '') {
  const layer = $('#toast-layer');
  const el = document.createElement('div');
  el.className = 'toast ' + kind;
  el.innerHTML = msg;
  layer.appendChild(el);
  setTimeout(() => el.classList.add('out'), 2600);
  setTimeout(() => el.remove(), 3100);
}

// モーダル: buttons=[{label, value, cls}] → Promise<value>
export function modal({ title = '', body = '', buttons = [{ label: 'OK', value: true, cls: 'btn-primary' }], cls = '', dismiss = true } = {}) {
  return new Promise(resolve => {
    const layer = $('#modal-layer');
    const wrap = document.createElement('div');
    wrap.className = 'modal-wrap';
    wrap.innerHTML = `<div class="modal ${cls}">
      ${title ? `<div class="modal-title">${title}</div>` : ''}
      <div class="modal-body">${body}</div>
      <div class="modal-btns">${buttons.map((b, i) => `<button class="btn ${b.cls || ''}" data-i="${i}">${b.label}</button>`).join('')}</div>
    </div>`;
    const close = v => { wrap.classList.add('out'); setTimeout(() => wrap.remove(), 200); resolve(v); };
    wrap.addEventListener('click', e => {
      const b = e.target.closest('[data-i]');
      if (b) close(buttons[+b.dataset.i].value);
      else if (dismiss && e.target === wrap) close(null);
    });
    layer.appendChild(wrap);
  });
}

export function confirmBox(title, body, ok = 'OK', cancel = 'キャンセル') {
  return modal({ title, body, buttons: [{ label: cancel, value: false }, { label: ok, value: true, cls: 'btn-primary' }] });
}

// ===== サウンド（WebAudio） =====
let actx = null;
function ctx() {
  if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; } }
  if (actx.state === 'suspended') actx.resume();
  return actx;
}
function tone(freq, dur, type = 'sine', vol = .15, when = 0, slide = 0) {
  const c = ctx(); if (!c) return;
  const t = c.currentTime + when;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + .02);
}
export const sfx = {
  tap() { if (state.settings.sound) tone(880, .05, 'square', .04); },
  ok() { if (!state.settings.sound) return; tone(988, .12, 'square', .08); tone(1319, .25, 'square', .08, .1); },
  ng() { if (!state.settings.sound) return; tone(196, .3, 'sawtooth', .08, 0, 120); },
  rev() { if (!state.settings.sound) return; tone(90, .7, 'sawtooth', .07, 0, 420); tone(60, .7, 'square', .04, 0, 260); },
  coin() { if (!state.settings.sound) return; tone(1568, .08, 'square', .06); tone(2093, .18, 'square', .06, .07); },
  fanfare() { if (!state.settings.sound) return; [523, 659, 784, 1047].forEach((f, i) => tone(f, .22, 'square', .07, i * .12)); tone(1047, .6, 'triangle', .08, .5); },
};

export function fmtNum(n) { return Number(n).toLocaleString('ja-JP'); }
