// 走行HUD：スピード・コンボ・ブースト・スコア（時間は測らない）
import { sfx } from '../util.js';

export const comboMult = c => c >= 8 ? 2 : c >= 5 ? 1.5 : c >= 3 ? 1.2 : 1;
// 1問のスコア：一発正解100点×コンボ倍率。ヒントを使ったら半分
export const qScore = (ok, hint, combo) => ok ? Math.round(100 * comboMult(combo) * (hint ? .5 : 1)) : 0;

export function createDrive(root, { total, startCombo = 0 }) {
  const st = { combo: startCombo, maxCombo: 0, n: 0, score: 0, boostGP: 0, misses: 0 };
  const el = document.createElement('div');
  el.className = 'drive-hud';
  el.innerHTML = `
    <div class="dh-speed"><svg viewBox="0 0 100 60"><path class="dh-arc" d="M10 55 A40 40 0 0 1 90 55"/><path class="dh-arc on" d="M10 55 A40 40 0 0 1 90 55" pathLength="100"/><line class="dh-needle" x1="50" y1="55" x2="50" y2="20"/></svg>
      <b class="en dh-kmh">60</b><small class="en">km/h</small></div>
    <div class="dh-combo"><div class="en dh-label">COMBO</div><b class="en dh-cn">0</b><div class="dh-boost"><i></i></div><div class="en dh-mult"></div></div>
    <div class="dh-track"><div class="dh-road"><i class="dh-me"></i></div><div class="dh-sub en">0 / ${total}</div></div>
    <div class="dh-lap"><div class="en dh-label">SCORE</div><b class="en dh-time">0</b><div class="en dh-delta"></div></div>`;
  root.prepend(el);
  const $ = s => el.querySelector(s);

  function paint() {
    const kmh = Math.min(260, 60 + st.combo * 22);
    $('.dh-kmh').textContent = kmh;
    $('.dh-needle').style.transform = `rotate(${-90 + kmh / 260 * 180}deg)`;
    $('.dh-arc.on').style.strokeDasharray = `${kmh / 260 * 100} 100`;
    $('.dh-cn').textContent = st.combo;
    $('.dh-boost i').style.width = Math.min(1, st.combo / 8) * 100 + '%';
    const m = comboMult(st.combo);
    $('.dh-mult').textContent = m > 1 ? `BOOST ×${m}` : '';
    el.classList.toggle('boost', m > 1);
    $('.dh-me').style.left = (st.n / total * 100) + '%';
    $('.dh-sub').textContent = `${st.n} / ${total}`;
    $('.dh-time').textContent = st.score;
  }
  function flash(cls) { el.classList.remove('fx-boost', 'fx-spin'); void el.offsetWidth; el.classList.add(cls); }

  paint();
  return {
    // 1問目の回答時に呼ぶ。返り値：GPのコンボ倍率
    answer(ok, hint) {
      st.n++;
      if (ok) {
        st.combo++; st.maxCombo = Math.max(st.maxCombo, st.combo);
        if (st.combo === 3 || st.combo === 5 || st.combo === 8) { flash('fx-boost'); sfx.boost(); }
      } else { if (st.combo >= 3) flash('fx-spin'); st.combo = 0; st.misses++; }
      const add = qScore(ok, hint, st.combo);
      st.score += add;
      const d = $('.dh-delta');
      d.textContent = add ? `+${add}` : ''; d.className = 'en dh-delta g';
      paint();
      return ok ? comboMult(st.combo) : 1;
    },
    addBoostGP(n) { st.boostGP += n; },
    result() { return { score: st.score, maxCombo: st.maxCombo, boostGP: st.boostGP, misses: st.misses }; },
    destroy() {},
  };
}
