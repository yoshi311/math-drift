// ステップ（ブリーフィング → 練習走行 → 本番走行 → リザルト）とライバルバトル
import { state, save } from '../state.js';
import { esc, sfx, $, toast } from '../util.js';
import { go } from '../router.js';
import { topbar, stars, chara } from '../ui.js';
import { fmt } from '../mathfmt.js';
import { steps, chapters, nextStep } from '../../data/curriculum/index.js';
import { runQuiz } from '../components/quiz.js';
import { addGP, track, checkAchievements } from '../gamify.js';
import { carSVG, getConfig } from '../components/car-render.js';
import { fmtLap } from '../components/drive.js';
import { carStats, battlePerks } from '../../data/parts.js';
import { openDrop } from '../drop.js';
import { carById } from '../../data/cars.js';
import { CHARS } from '../../data/story/index.js';
import { playStory, hasScene } from './story.js';

export function briefHTML(st) {
  return st.brief.map((b, i) => `<div class="brief-card">
    <div class="brief-h"><span class="en">POINT ${i + 1}</span>${fmt(b.h)}</div>
    <div class="brief-b">${fmt(b.b)}</div>
    ${b.fig ? `<div class="fig">${b.fig}</div>` : ''}
    ${b.ex ? `<div class="brief-ex"><div class="en ex-label">EXAMPLE</div>${fmt(b.ex)}</div>` : ''}
  </div>`).join('');
}

export function stepScreen(app, { id }) {
  const st = steps[id];
  if (!st) { go('/map', true); return; }
  const ch = chapters[st.chapter];
  const prev = state.progress[id];
  let cleanup = null;
  let page = 0;

  function brief() {
    const n = st.brief.length;
    app.innerHTML = `${topbar(`${st.label}　${esc(st.title)}`, { back: `#/chapter/${ch.id}` })}
    <div class="page step-brief">
      <div class="row brief-top"><span class="chip c">BRIEFING</span><span class="muted">${esc(st.sectionTitle)}</span><span class="grow"></span>${prev?.cleared ? stars(prev.stars) : ''}</div>
      <div class="brief-stage">${briefHTML({ brief: [st.brief[page]] }).replace('POINT 1', 'POINT ' + (page + 1))}</div>
      <div class="brief-dots">${st.brief.map((_, i) => `<i class="${i === page ? 'on' : ''}"></i>`).join('')}</div>
      <div class="brief-nav">
        <button class="btn" data-act="prev" ${page === 0 ? 'disabled' : ''}>‹ 前へ</button>
        ${page < n - 1 ? `<button class="btn btn-primary btn-lg" data-act="next">次へ ›</button>` :
          `<button class="btn btn-primary btn-lg" data-act="practice">練習走行スタート ▶</button>`}
      </div>
      <div class="brief-skip"><button class="btn btn-sm btn-ghost" data-act="main">練習をとばして本番走行へ ≫</button></div>
    </div>`;
    app.onclick = e => {
      const a = e.target.closest('[data-act]'); if (!a) return;
      const act = a.dataset.act;
      if (act === 'prev') { page--; brief(); }
      if (act === 'next') { page++; if (page === n - 1) track('brief'); brief(); }
      if (act === 'practice') { if (n === 1) track('brief'); practice(); }
      if (act === 'main') main();
    };
  }

  function practice() {
    app.onclick = null;
    if (!st.practice?.length) return main();
    sfx.rev();
    cleanup = runQuiz(app, {
      title: `${st.label} ${st.title}`, problems: st.practice, mode: 'practice', modeLabel: '練習走行', requeueWrong: true,
      onExit: () => go(`/chapter/${ch.id}`),
      onFinish: res => intermission(res),
    });
  }

  function intermission(res) {
    const ok = res.filter(r => r.ok).length;
    app.innerHTML = `${topbar(`${st.label}　${esc(st.title)}`, { back: `#/chapter/${ch.id}` })}
    <div class="page center inter">
      <div class="en inter-label">PRACTICE COMPLETE</div>
      <h2>練習走行 ${ok} / ${res.length} 問 一発正解</h2>
      <p class="muted">${ok === res.length ? 'カンペキ！ この調子で本番へ！' : '間違えた問題は解説をもう一度チェック。ピットインでいつでも解き直せるよ。'}</p>
      <div class="row" style="justify-content:center;margin-top:20px;gap:14px">
        <button class="btn" data-act="brief">📘 ブリーフィングを見直す</button>
        <button class="btn btn-red btn-lg" data-act="main">本番走行スタート ▶</button>
      </div>
    </div>`;
    app.onclick = e => { const a = e.target.closest('[data-act]'); if (!a || !app.contains(a)) return; if (a.dataset.act === 'brief') { page = 0; brief(); } else if (a.dataset.act === 'main') main(); };
  }

  function main() {
    app.onclick = null;
    sfx.rev();
    cleanup = runQuiz(app, {
      title: `${st.label} ${st.title}`, problems: st.main, mode: 'main', modeLabel: '本番走行',
      drive: { ghost: state.progress[id]?.splits || null },
      onExit: () => go(`/chapter/${ch.id}`),
      onFinish: (res, dr) => result(res, dr),
    });
  }

  function result(res, dr) {
    const ok = res.filter(r => r.ok).length, total = res.length;
    const ratio = ok / total;
    const noHint = res.every(r => !r.hint);
    const s = ratio >= 1 ? (noHint ? 3 : 2) : ratio >= .8 ? 1 : 0;
    const old = state.progress[id] || { stars: 0, cleared: false, best: 0 };
    const lapInfo = lapRecord(old, dr, s > 0);
    const rewards = [];
    if (s > 0 && !old.cleared) { rewards.push(['ステップ初クリア', 50]); track('stepClear'); }
    else if (s > 0 && old.cleared) track('replay');
    if (s > old.stars) rewards.push([`★ ${s - old.stars}個 獲得`, (s - old.stars) * 20]);
    if (ratio === 1) { state.stats.perfect++; track('perfect'); }
    state.progress[id] = { ...old, stars: Math.max(old.stars, s), cleared: old.cleared || s > 0, best: Math.max(old.best || 0, Math.round(ratio * 100)), ...lapInfo.save };
    if (lapInfo.beat) { state.stats.ghost = (state.stats.ghost || 0) + 1; rewards.push(['ゴースト撃破', 30]); }
    if (dr && dr.maxCombo >= 10) state.stats.combo10 = (state.stats.combo10 || 0) + 1;
    save();
    rewards.forEach(([r, g]) => addGP(g, r, true));
    const gpSum = rewards.reduce((a, r) => a + r[1], 0);
    if (gpSum) setTimeout(() => sfx.coin(), 600);
    checkAchievements();
    if (s > 0) sfx.fanfare();
    // 部品箱：初クリア・★アップ・ベスト更新のとき
    const dropQ = s > 0 && (!old.cleared || s > old.stars || lapInfo.beat) ? (s === 3 || !old.cleared ? 'good' : 'base') : null;
    if (dropQ) setTimeout(() => openDrop(dropQ), 1200);
    const nx = nextStep(id);
    app.innerHTML = `${topbar(`${st.label}　${esc(st.title)}`, { back: `#/chapter/${ch.id}` })}
    <div class="page result-page">
      <div class="result-hero ${s > 0 ? 'win' : 'lose'}">
        <div class="rh-chara">${chara(s > 0 ? 'mio' : 'gen', s > 0 ? 'smile' : 'serious')}</div>
        <div class="en rh-pos">${['DNF', 'P3', 'P2', 'P1'][s]}</div>
        <div class="en rh-label">${s > 0 ? 'SECTOR CLEAR' : 'TRY AGAIN'}</div>
        <div class="rh-score en">${ok}<small> / ${total}</small></div>
        <div class="rh-stars">${stars(s)}</div>
        ${lapHTML(lapInfo, dr)}
        <div class="next-goal">${nextGoal(s, ok, total, lapInfo)}</div>
        ${gpSum ? `<div class="rh-gp en">+${gpSum} GP</div>` : ''}
        ${rewards.map(r => `<div class="small">${r[0]}　+${r[1]}GP</div>`).join('')}
      </div>
      <div class="panel">
        <div class="panel-title">REVIEW　問題ごとの結果</div>
        <div class="res-list">${res.map((r, i) => `<a class="res-item ${r.ok ? 'ok' : 'ng'}" href="#/pit/p/${r.id}"><b>${r.ok ? '○' : '×'}</b> Q${i + 1}${r.hint ? ' <small>(ヒント)</small>' : ''}</a>`).join('')}</div>
      </div>
      <div class="row wrap result-btns">
        <button class="btn btn-red" data-act="retry">↺ もう1本走る</button>
        <a class="btn" href="#/chapter/${ch.id}">ステージに戻る</a>
        ${nx ? `<a class="btn btn-primary btn-lg" href="#/step/${nx.id}">次のステップ ▶</a>` : `<a class="btn btn-red btn-lg" href="#/battle/${ch.id}">ライバルバトルへ ▶</a>`}
      </div>
    </div>`;
    app.onclick = e => { const a = e.target.closest('[data-act=retry]'); if (a) main(); };
  }

  const phase = new URLSearchParams(location.hash.split('?')[1] || '').get('phase');
  if (phase === 'main') main(); else if (phase === 'practice') practice(); else brief();
  return () => { if (cleanup) cleanup(); app.onclick = null; };
}

// ===== ライバルバトル =====
export function battleScreen(app, { id }) {
  const ch = chapters[id];
  if (!ch) { go('/map', true); return; }
  const rc = carById(ch.rival.car), rch = CHARS[ch.rival.char];
  const my = carById(state.garage.current);
  const hard = new URLSearchParams(location.hash.split('?')[1] || '').get('hard') === '1' && !!state.battles[id]?.cleared;
  const perks = battlePerks(carStats(my, getConfig(state, my.id)));
  if (hard) perks.saves = 0;
  const NEED = hard ? .8 : .7, LIMIT = hard ? ch.battle.length * 30 : null;
  let cleanup = null;

  app.innerHTML = `${topbar(`RIVAL BATTLE　STAGE ${ch.no}`, { back: `#/chapter/${ch.id}` })}
  <div class="page battle-intro">
    <div class="vs-screen" style="--rc:${rch.color}">
      <div class="vs-half me"><div class="vs-chara">${chara('kaito', 'serious')}</div>
        <div class="vs-plate"><span class="en">TAKAMIYA FACTORY</span><b>${esc(state.profile.name)} ＆ 蒼井 カイト</b><small>${esc(my.name)}</small></div>
        <div class="vs-car">${carSVG(my.id, getConfig(state, my.id))}</div></div>
      <div class="vs en">VS</div>
      <div class="vs-half rival"><div class="vs-chara">${chara(ch.rival.char, 'angry')}</div>
        <div class="vs-plate"><span class="en">${esc(rch.role)}</span><b style="color:${rch.color}">${esc(rch.name)}</b><small>${esc(rc.name)}</small></div>
        <div class="vs-car flip">${carSVG(rc.id, {})}</div></div>
    </div>
    <div class="panel center">
      <h2>${esc(ch.stage)}</h2>
      ${hard ? `<div class="en hard-badge">HARD MODE</div><p>章末テスト <b>${ch.battle.length}問</b>。<b class="hl">8割以上の正解</b>、しかも <b class="hl">LAP ${fmtLap(LIMIT)} 以内</b>で勝利。GRIPのカバーはなし！</p>` :
      `<p>章末テスト <b>${ch.battle.length}問</b>。正解するとキミの車が前に出る！<br><b class="hl">7割以上の正解で勝利</b>。ヒントは使えるけど、解説は答えたあとに出るよ。</p>`}
      <div class="perk-row"><span class="chip r">POWER：ライバルを引き離す</span><span class="chip c">GRIP：ミスを${perks.saves}回カバー</span><span class="chip y">AERO：スタートコンボ ${perks.startCombo}</span></div>
      <p class="muted small">性能はガレージのエンジン・タイヤ・エアロで上がる</p>
      <button class="btn btn-red btn-lg" id="go">BATTLE START ▶</button>
    </div>
  </div>`;
  $('#go', app).onclick = start;

  function start() {
    sfx.rev();
    track('battle');
    if (state.settings.anim) {
      const cut = document.createElement('div');
      cut.className = 'cutin';
      cut.style.setProperty('--c', rch.color);
      cut.innerHTML = `<div class="cutin-band"><div class="cutin-chara">${chara(ch.rival.char, 'angry')}</div><div class="cutin-text en">BATTLE<br>START</div></div>`;
      document.body.appendChild(cut);
      setTimeout(() => cut.remove(), 1500);
    }
    const total = ch.battle.length;
    let mine = 0, answered = 0;
    const header = `<div class="race"><div class="lane"><div class="lane-car me" style="left:0%">${carSVG(my.id, getConfig(state, my.id), { view: "side", small: true })}</div></div>
      <div class="lane"><div class="lane-car rival" style="left:0%">${carSVG(rc.id, {}, { view: "side", small: true })}</div></div><div class="goal en">GOAL</div></div>`;
    cleanup = runQuiz(app, {
      title: `VS ${rch.name}`, problems: ch.battle, mode: 'battle', modeLabel: 'BATTLE', header,
      drive: { ghost: state.battles[id]?.splits || null, startCombo: perks.startCombo },
      onExit: () => go(`/chapter/${ch.id}`),
      onAnswer: (ok, p, first) => {
        if (!first) return;
        answered++; if (ok) mine++;
        const rv = Math.round(answered * perks.pace);
        const meEl = app.querySelector('.lane-car.me'), rvEl = app.querySelector('.lane-car.rival');
        if (meEl) meEl.style.left = (mine / total * 86) + '%';
        if (rvEl) rvEl.style.left = (rv / total * 86) + '%';
      },
      onFinish: (res, dr) => finish(res, dr),
    });
  }

  async function finish(res, dr) {
    const ok = res.filter(r => r.ok).length, total = res.length;
    const pct = Math.round(ok / total * 100);
    const saved = Math.min(perks.saves, total - ok);
    const win = (ok + saved) / total >= NEED && (!LIMIT || (dr && dr.lap <= LIMIT));
    const firstHard = hard && win && !old.hard;
    const old = state.battles[id] || { cleared: false, best: 0 };
    const firstWin = win && !old.cleared;
    const lapInfo = lapRecord(old, dr, win);
    state.battles[id] = { ...old, cleared: old.cleared || win, best: Math.max(old.best, pct), ...lapInfo.save, ...(firstHard ? { hard: true } : {}) };
    if (firstHard) addGP(300, 'ハードモード制覇', true);
    if (lapInfo.beat) state.stats.ghost = (state.stats.ghost || 0) + 1;
    let unlocked = null;
    if (firstWin) {
      addGP(200, 'ライバル撃破ボーナス', true);
      const car = (await import('../../data/cars.js')).CARS.find(c => c.unlock === id);
      if (car && !state.garage.ownedCars.includes(car.id)) { state.garage.ownedCars.push(car.id); unlocked = car; }
    }
    if (ok === total) { state.stats.perfect++; track('perfect'); }
    save(); checkAchievements();
    win ? sfx.fanfare() : sfx.ng();
    app.innerHTML = `${topbar(`RIVAL BATTLE　STAGE ${ch.no}`, { back: `#/chapter/${ch.id}` })}
    <div class="page result-page">
      <div class="result-hero ${win ? 'win' : 'lose'}">
        <div class="rh-chara">${chara(win ? 'kaito' : ch.rival.char, win ? 'smile' : 'smile')}</div>
        <div class="en rh-pos">${win ? 'P1' : 'P2'}</div>
        <div class="en rh-label">${win ? 'YOU WIN!' : 'LOSE…'}</div>
        <div class="rh-score en">${pct}<small>%</small></div>
        <div class="muted">${ok} / ${total} 問正解　${saved && win && ok / total < .7 ? `<b class="hc">GRIPで${saved}ミスをカバー！</b>` : ''}${win ? '' : LIMIT && (ok + saved) / total >= NEED ? `（タイムオーバー：${fmtLap(LIMIT)} 以内で勝利）` : `（${hard ? 8 : 7}割で勝利：あと${Math.ceil(total * NEED) - ok - saved}問）`}</div>
        ${firstHard ? '<div class="rh-gp en">HARD CLEAR +300 GP</div>' : ''}
        ${lapHTML(lapInfo, dr)}
        ${firstWin ? `<div class="rh-gp en">+200 GP</div>` : ''}
        ${unlocked ? `<div class="unlock"><div class="en">NEW CAR</div>${carSVG(unlocked.id, {})}<b>${esc(unlocked.name)}</b> がガレージに入った！</div>` : ''}
      </div>
      <div class="panel"><div class="panel-title">REVIEW</div>
        <div class="res-list">${res.map((r, i) => `<a class="res-item ${r.ok ? 'ok' : 'ng'}" href="#/pit/p/${r.id}"><b>${r.ok ? '○' : '×'}</b> Q${i + 1}</a>`).join('')}</div>
        <p class="muted small">×の問題はピットインでいつでも解き直せるよ。</p></div>
      <div class="row wrap result-btns">
        <a class="btn" href="#/chapter/${ch.id}">ステージに戻る</a>
        <a class="btn" href="#/pit">ピットインで復習</a>
        <button class="btn btn-red btn-lg" data-act="again">もう一度バトル</button>
        ${state.battles[id].cleared && !hard ? `<button class="btn btn-yellow" data-act="hard">🔥 ハードモードで再戦</button>` : ''}
      </div>
    </div>`;
    app.querySelector('[data-act=again]').onclick = () => battleScreen(app, { id });
    const hb = app.querySelector('[data-act=hard]'); if (hb) hb.onclick = () => { location.hash = `#/battle/${id}?hard=1`; };
    if (firstHard) setTimeout(() => openDrop('great'), 900);
    if (firstWin) setTimeout(async () => { await openDrop('great'); if (hasScene(id + '-outro')) playStory(id + '-outro'); }, 900);
  }
  return () => cleanup && cleanup();
}

// ===== LAPタイムの記録（ベストと区間タイム＝次回のゴースト） =====
export function lapRecord(old, dr, valid) {
  if (!dr) return { save: {} };
  const prev = old.lap || null;
  const better = valid && (!prev || dr.lap < prev);
  return {
    lap: dr.lap, prev, best: better ? dr.lap : prev, isBest: better, beat: better && !!prev,
    save: better ? { lap: dr.lap, splits: dr.splits } : {},
  };
}
export function lapHTML(li, dr) {
  if (!dr) return '';
  const d = li.prev ? dr.lap - li.prev : null;
  return `<div class="rh-lap">
    <div><span class="en muted">LAP</span> <b class="en">${fmtLap(dr.lap)}</b>
      ${d != null ? `<span class="en dh-delta ${d <= 0 ? 'g' : 'r'}">${d <= 0 ? '−' : '＋'}${Math.abs(d).toFixed(1)}</span>` : ''}</div>
    ${li.isBest ? `<div class="en rh-best">${li.prev ? 'NEW RECORD! ゴースト撃破' : 'FIRST RECORD'}</div>` : li.prev ? `<div class="small muted">ベスト ${fmtLap(li.prev)}</div>` : ''}
    <div class="small muted">最大コンボ ${dr.maxCombo}${dr.boostGP ? `　ブーストボーナス +${dr.boostGP}GP` : ''}</div>
  </div>`;
}
function nextGoal(s, ok, total, li) {
  if (s === 0) return `🎯 あと <b>${Math.ceil(total * .8) - ok}問</b> 正解でクリア！`;
  if (s === 1) return `🎯 次は全問正解で★2（あと${total - ok}問）`;
  if (s === 2) return '🎯 次はヒントなしで★3！';
  if (li.best) return `🎯 次の目標：${fmtLap(Math.max(0, li.best - 3))}（ベスト −3秒）`;
  return '🏁 パーフェクト！';
}
