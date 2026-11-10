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
      onExit: () => go(`/chapter/${ch.id}`),
      onFinish: res => result(res),
    });
  }

  function result(res) {
    const ok = res.filter(r => r.ok).length, total = res.length;
    const ratio = ok / total;
    const noHint = res.every(r => !r.hint);
    const s = ratio >= 1 ? (noHint ? 3 : 2) : ratio >= .8 ? 1 : 0;
    const old = state.progress[id] || { stars: 0, cleared: false, best: 0 };
    const rewards = [];
    if (s > 0 && !old.cleared) { rewards.push(['ステップ初クリア', 50]); track('stepClear'); }
    else if (s > 0 && old.cleared) track('replay');
    if (s > old.stars) rewards.push([`★ ${s - old.stars}個 獲得`, (s - old.stars) * 20]);
    if (ratio === 1) { state.stats.perfect++; track('perfect'); }
    state.progress[id] = { stars: Math.max(old.stars, s), cleared: old.cleared || s > 0, best: Math.max(old.best || 0, Math.round(ratio * 100)) };
    save();
    rewards.forEach(([r, g]) => addGP(g, r, true));
    const gpSum = rewards.reduce((a, r) => a + r[1], 0);
    if (gpSum) setTimeout(() => sfx.coin(), 600);
    checkAchievements();
    if (s > 0) sfx.fanfare();
    const nx = nextStep(id);
    app.innerHTML = `${topbar(`${st.label}　${esc(st.title)}`, { back: `#/chapter/${ch.id}` })}
    <div class="page result-page">
      <div class="result-hero ${s > 0 ? 'win' : 'lose'}">
        <div class="rh-chara">${chara(s > 0 ? 'mio' : 'gen', s > 0 ? 'smile' : 'serious')}</div>
        <div class="en rh-pos">${['DNF', 'P3', 'P2', 'P1'][s]}</div>
        <div class="en rh-label">${s > 0 ? 'SECTOR CLEAR' : 'TRY AGAIN'}</div>
        <div class="rh-score en">${ok}<small> / ${total}</small></div>
        <div class="rh-stars">${stars(s)}</div>
        <div class="muted">${s === 3 ? 'ヒントなしで全問正解！ パーフェクト！' : s === 2 ? '全問正解！ 次はヒントなしで★3を狙おう' : s === 1 ? 'クリア！ 全問正解で★2、ヒントなしで★3' : '8割以上の正解でクリア。解説を読んでもう一度チャレンジ！'}</div>
        ${gpSum ? `<div class="rh-gp en">+${gpSum} GP</div>` : ''}
        ${rewards.map(r => `<div class="small">${r[0]}　+${r[1]}GP</div>`).join('')}
      </div>
      <div class="panel">
        <div class="panel-title">REVIEW　問題ごとの結果</div>
        <div class="res-list">${res.map((r, i) => `<a class="res-item ${r.ok ? 'ok' : 'ng'}" href="#/pit/p/${r.id}"><b>${r.ok ? '○' : '×'}</b> Q${i + 1}${r.hint ? ' <small>(ヒント)</small>' : ''}</a>`).join('')}</div>
      </div>
      <div class="row wrap result-btns">
        <button class="btn" data-act="retry">↺ 本番をもう一度</button>
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
      <p>章末テスト <b>${ch.battle.length}問</b>。正解するとキミの車が前に出る！<br><b class="hl">7割以上の正解で勝利</b>。ヒントは使えるけど、解説は答えたあとに出るよ。</p>
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
      onExit: () => go(`/chapter/${ch.id}`),
      onAnswer: (ok, p, first) => {
        if (!first) return;
        answered++; if (ok) mine++;
        const rv = Math.round(answered * .7);
        const meEl = app.querySelector('.lane-car.me'), rvEl = app.querySelector('.lane-car.rival');
        if (meEl) meEl.style.left = (mine / total * 86) + '%';
        if (rvEl) rvEl.style.left = (rv / total * 86) + '%';
      },
      onFinish: res => finish(res),
    });
  }

  async function finish(res) {
    const ok = res.filter(r => r.ok).length, total = res.length;
    const pct = Math.round(ok / total * 100);
    const win = pct >= 70;
    const old = state.battles[id] || { cleared: false, best: 0 };
    const firstWin = win && !old.cleared;
    state.battles[id] = { cleared: old.cleared || win, best: Math.max(old.best, pct) };
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
        <div class="muted">${ok} / ${total} 問正解　${win ? '' : '（7割で勝利）'}</div>
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
      </div>
    </div>`;
    app.querySelector('[data-act=again]').onclick = () => battleScreen(app, { id });
    if (firstWin && hasScene(id + '-outro')) setTimeout(() => playStory(id + '-outro'), 900);
  }
  return () => cleanup && cleanup();
}
