// 走行HUD：コンボ・ブースト・LAPタイム・ゴースト（前回ベストとの区間差）
import { sfx } from '../util.js';

export const MISS_PEN = 5, HINT_PEN = 3, CAP = 240; // 秒（1問の計測上限）
export const comboMult = c => c >= 8 ? 2 : c >= 5 ? 1.5 : c >= 3 ? 1.2 : 1;
export const fmtLap = s => { s = Math.max(0, s); const m = Math.floor(s / 60); return `${m}:${(s - m * 60).toFixed(1).padStart(4, '0')}`; };

export function createDrive(root, { total, ghost = null }) {
  const st = { combo: 0, maxCombo: 0, run: 0, pen: 0, splits: [], t0: 0, boostGP: 0, misses: 0 };
  const el = document.createElement('div');
  el.className = 'drive-hud';
  el.innerHTML = `
    <div class="dh-speed"><svg viewBox="0 0 100 60"><path class="dh-arc" d="M10 55 A40 40 0 0 1 90 55"/><path class="dh-arc on" d="M10 55 A40 40 0 0 1 90 55" pathLength="100"/><line class="dh-needle" x1="50" y1="55" x2="50" y2="20"/></svg>
      <b class="en dh-kmh">60</b><small class="en">km/h</small></div>
    <div class="dh-combo"><div class="en dh-label">COMBO</div><b class="en dh-cn">0</b><div class="dh-boost"><i></i></div><div class="en dh-mult"></div></div>
    <div class="dh-track"><div class="dh-road"><i class="dh-ghost" title="前回のベスト"></i><i class="dh-me"></i></div>
      <div class="dh-sub en">${ghost ? 'GHOST ' + fmtLap(ghost[ghost.length - 1]) : 'NO GHOST'}</div></div>
    <div class="dh-lap"><div class="en dh-label">LAP</div><b class="en dh-time">0:00.0</b><div class="en dh-delta"></div></div>`;
  root.prepend(el);
  const $ = s => el.querySelector(s);
  let timer = setInterval(tick, 100);

  const lapNow = () => st.run + (st.t0 ? Math.min(CAP, (performance.now() - st.t0) / 1000) : 0) + st.pen;
  function ghostPos(t) { // ゴーストが時刻tに何問目まで進んでいるか（小数）
    if (!ghost) return 0;
    let i = 0; while (i < ghost.length && ghost[i] <= t) i++;
    if (i >= ghost.length) return ghost.length;
    const a = i ? ghost[i - 1] : 0, b = ghost[i];
    return i + (t - a) / Math.max(.01, b - a);
  }
  function tick() {
    const t = lapNow();
    $('.dh-time').textContent = fmtLap(t);
    const me = st.splits.length + (st.t0 ? .5 : 0);
    $('.dh-me').style.left = (Math.min(total, me) / total * 100) + '%';
    if (ghost) $('.dh-ghost').style.left = (Math.min(total, ghostPos(t)) / ghost.length * 100) + '%';
  }
  function paint() {
    const kmh = Math.min(260, 60 + st.combo * 22);
    $('.dh-kmh').textContent = kmh;
    $('.dh-needle').style.transform = `rotate(${-90 + kmh / 260 * 180}deg)`;
    $('.dh-arc.on').style.strokeDasharray = `${kmh / 260 * 100} 100`;
    $('.dh-cn').textContent = st.combo;
    $('.dh-boost i').style.width = Math.min(1, st.combo / 8) * 100 + '%';
    const m = comboMult(st.combo);
    $('.dh-mult').textContent = m > 1 ? `BOOST ×${m} GP` : '';
    el.classList.toggle('boost', m > 1);
  }
  function flash(cls) { el.classList.remove('fx-boost', 'fx-spin'); void el.offsetWidth; el.classList.add(cls); }

  paint();
  return {
    start() { st.t0 = performance.now(); },
    // 1問目の回答時に呼ぶ。返り値：コンボ倍率
    answer(ok, hint) {
      if (st.t0) { st.run += Math.min(CAP, (performance.now() - st.t0) / 1000); st.t0 = 0; }
      if (!ok) st.pen += MISS_PEN, st.misses++;
      if (hint) st.pen += HINT_PEN;
      const split = st.run + st.pen;
      st.splits.push(Math.round(split * 10) / 10);
      if (ok) {
        st.combo++; st.maxCombo = Math.max(st.maxCombo, st.combo);
        if (st.combo === 3 || st.combo === 5 || st.combo === 8) { flash('fx-boost'); sfx.boost(); }
      } else { if (st.combo >= 3) flash('fx-spin'); st.combo = 0; }
      // 区間差（前回ベストの同じ問題数の時点との差）
      const g = ghost && ghost[st.splits.length - 1];
      const d = $('.dh-delta');
      if (g != null) { const dd = split - g; d.textContent = (dd <= 0 ? '−' : '＋') + Math.abs(dd).toFixed(1); d.className = 'en dh-delta ' + (dd <= 0 ? 'g' : 'r'); }
      paint(); tick();
      return ok ? comboMult(st.combo) : 1;
    },
    addBoostGP(n) { st.boostGP += n; },
    // 回答していないあいだ（解説を読んでいるとき）は計測しない
    result() { return { lap: Math.round((st.run + st.pen) * 10) / 10, splits: st.splits.slice(), maxCombo: st.maxCombo, boostGP: st.boostGP, misses: st.misses }; },
    destroy() { clearInterval(timer); timer = null; },
  };
}
