// 週替わりスコアアタック：クリア済みの範囲から10問。ライバルの目標スコアと順位を競う（時間は測らない）
import { state, save } from '../state.js';
import { esc, seeded, shuffle, sfx } from '../util.js';
import { go } from '../router.js';
import { topbar, chara } from '../ui.js';
import { problems } from '../../data/curriculum/index.js';
import { CHARS } from '../../data/story/index.js';
import { runQuiz } from '../components/quiz.js';
import { addGP, track, checkAchievements } from '../gamify.js';
import { openDrop } from '../drop.js';

export const ATTACK_N = 10;
// ライバルの目標スコア（10問・最高1490点：一発正解100点×コンボ倍率、ヒントを使うと半分）
export const LADDER = [
  { char: 'gouda', t: 600 }, { char: 'rin', t: 800 }, { char: 'kujo', t: 950 },
  { char: 'ryuzaki', t: 1100 }, { char: 'kurosaki', t: 1250 }, { char: 'phantom', t: 1400 },
];

export function weekKey(d = new Date()) {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7)); // その週の月曜
  return `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}-${String(m.getDate()).padStart(2, '0')}`;
}
// 出題範囲：クリアしたステップの問題（選択・数値など全形式）
function pool() {
  return Object.values(problems).filter(p => p.step && state.progress[p.step]?.cleared);
}
export function attackSet() {
  const wk = weekKey();
  const ps = pool();
  if (ps.length < ATTACK_N) return { wk, list: [], need: true };
  const rnd = seeded('attack' + wk + (state.created || ''));
  return { wk, list: shuffle(ps, rnd).slice(0, ATTACK_N) };
}
export function weekRec() {
  const wk = weekKey();
  if (!state.attack || state.attack.wk !== wk || state.attack.kind !== 'score') state.attack = { kind: 'score', wk, best: null, runs: 0, passed: [], allBest: state.attack?.kind === 'score' ? state.attack.allBest : null };
  return state.attack;
}
export function position(t) { // 何位か（1〜7）と、次に抜くライバル
  if (t == null) return { pos: LADDER.length + 1, next: LADDER[0] };
  const ahead = LADDER.filter(r => r.t > t); // 自分より高いスコアのライバル
  return { pos: ahead.length + 1, next: ahead.length ? ahead[0] : null };
}

function boardHTML(best) {
  const rows = LADDER.map(r => ({ name: CHARS[r.char].name, color: CHARS[r.char].color, t: r.t, me: false }));
  if (best != null) rows.push({ name: `${state.profile.name}（キミ）`, color: '#00e5ff', t: best, me: true });
  rows.sort((a, b) => b.t - a.t || (b.me ? 1 : -1));
  return `<div class="board">${rows.map((r, i) => `<div class="bd-row ${r.me ? 'me' : ''}"><b class="en">P${i + 1}</b><span style="color:${r.color}">${esc(r.name)}</span><span class="en">${r.t}</span></div>`).join('')}</div>`;
}

export function attackScreen(app) {
  const rec = weekRec(); save();
  const set = attackSet();
  const { pos, next } = position(rec.best);
  app.innerHTML = `${topbar('🏁 スコアアタック')}
  <div class="page attack">
    <section class="panel neon">
      <div class="panel-title">WEEKLY SCORE ATTACK　${esc(set.wk)} の週</div>
      ${set.need ? `<p>クリアしたステップの問題から出題するよ。<b>ステップをあと少しクリア</b>すると挑戦できる（${ATTACK_N}問以上が必要）。</p>` : `
      <p>クリア済みの範囲から <b>${ATTACK_N}問</b>。問題は月曜日に入れかわる。<br>スコア＝一発正解100点×コンボ倍率（3連続×1.2、5連続×1.5、8連続×2）。ヒントを使った問題は半分。時間は関係ないので、じっくり解いてコンボをつなごう！</p>
      <div class="row wrap" style="gap:14px;align-items:center">
        <div class="att-pos en">${rec.best != null ? `P${pos}` : '—'}</div>
        <div class="grow">${rec.best != null ? `今週のベスト <b class="en">${rec.best}</b>点（${rec.runs}回走行）<br>` : 'まだ今週は走っていない<br>'}
          ${next ? `🎯 次は <b style="color:${CHARS[next.char].color}">${esc(CHARS[next.char].name)}</b>（${next.t}点）${rec.best != null ? `まで あと <b class="en">${next.t - rec.best}</b> 点` : ''}` : '🏆 全ライバルを抜いた！ 今週のトップ！'}</div>
        <button class="btn btn-red btn-lg" data-act="go">${rec.runs ? 'もう1本走る ▶' : 'アタック開始 ▶'}</button>
      </div>`}
    </section>
    <section class="panel"><div class="panel-title">RANKING　今週の順位</div>${boardHTML(rec.best)}
      ${rec.allBest ? `<div class="muted small">自己ベスト（全期間） ${rec.allBest}点</div>` : ''}</section>
  </div>`;
  let cleanup = null;
  const b = app.querySelector('[data-act=go]');
  if (b) b.onclick = () => run(set.list);

  function run(list) {
    sfx.rev();
    cleanup = runQuiz(app, {
      title: `SCORE ATTACK ${set.wk}`, problems: list, mode: 'review', modeLabel: 'SCORE ATTACK',
      drive: {},
      onExit: () => attackScreen(app),
      onFinish: (res, dr) => finish(res, dr),
    });
  }
  async function finish(res, dr) {
    const before = position(rec.best);
    const first = !rec.runs;
    rec.runs++;
    const isBest = rec.best == null || dr.score > rec.best;
    if (isBest) rec.best = dr.score;
    if (!rec.allBest || dr.score > rec.allBest) rec.allBest = dr.score;
    const after = position(rec.best);
    const newly = LADDER.filter(r => rec.best >= r.t && !rec.passed.includes(r.char));
    newly.forEach(r => rec.passed.push(r.char));
    if (after.pos === 1) state.stats.attackTop = (state.stats.attackTop || 0) + 1;
    save();
    const gp = (first ? 100 : 0) + newly.length * 50;
    if (gp) addGP(gp, 'スコアアタック', true);
    track('attack');
    checkAchievements();
    sfx.fanfare();
    const ok = res.filter(r => r.ok).length;
    app.innerHTML = `${topbar('🏁 スコアアタック')}
    <div class="page result-page">
      <div class="result-hero win">
        <div class="rh-chara">${chara(after.pos <= 2 ? 'kaito' : 'mio', 'smile')}</div>
        <div class="en rh-pos">P${after.pos}</div>
        <div class="en rh-label">${isBest ? (before.pos > after.pos ? `P${before.pos} → P${after.pos}` : 'NEW RECORD') : 'FINISH'}</div>
        <div class="rh-score en">${dr.score}<small>点</small></div>
        <div class="muted">${ok} / ${res.length} 問正解　最大コンボ ${dr.maxCombo}${!isBest ? `　（今週のベスト ${rec.best}点）` : ''}</div>
        ${newly.length ? `<div class="hl">${newly.map(r => esc(CHARS[r.char].name)).join('・')} を抜いた！</div>` : ''}
        ${gp ? `<div class="rh-gp en">+${gp} GP</div>` : ''}
        <div class="next-goal">${after.next ? `🎯 次は ${esc(CHARS[after.next.char].name)}（${after.next.t}点）まで あと ${after.next.t - rec.best} 点` : '🏆 今週のトップ！ 来週の新コースも待ってるぞ'}</div>
      </div>
      <div class="panel"><div class="panel-title">RANKING</div>${boardHTML(rec.best)}</div>
      <div class="row wrap result-btns">
        <a class="btn" href="#/home">ホームへ</a>
        <button class="btn btn-red btn-lg" data-act="again">もう1本走る ▶</button>
      </div>
    </div>`;
    app.querySelector('[data-act=again]').onclick = () => run(set.list);
    if (newly.some(r => r.char === 'phantom')) setTimeout(() => openDrop('great'), 900);
  }
  return () => cleanup && cleanup();
}
