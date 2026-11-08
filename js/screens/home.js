// タイトル・ホーム
import { state, save } from '../state.js';
import { esc, modal, sfx, fmtNum, $ } from '../util.js';
import { go } from '../router.js';
import { topbar, sceneBg } from '../ui.js';
import { carSVG, getConfig } from '../components/car-render.js';
import { carById } from '../../data/cars.js';
import { rankInfo, checkLogin, claimLogin, ensureDaily, LOGIN_REWARDS, DAILY_BONUS } from '../gamify.js';
import { GRADES, steps } from '../../data/curriculum/index.js';
import { playStory } from './story.js';

export function titleScreen(app) {
  app.innerHTML = `<div class="title-screen">
    ${sceneBg('pass-night')}
    <div class="title-inner">
      <div class="logo"><span class="en logo-main">MATH<b>DRIFT</b></span><span class="logo-sub">峠の数学エンジニア</span></div>
      <div class="title-car">${carSVG('ae86', { neon: '#00e5ff' })}</div>
      <div class="panel neon title-form">
        <div class="panel-title">ENTRY</div>
        <label class="muted">キミの名前（ニックネーム）</label>
        <input id="pname" class="text-input" maxlength="10" placeholder="例：ハル" value="${esc(state.profile.name)}">
        <button class="btn btn-red btn-lg btn-block" id="start">ENGINE START ▶</button>
      </div>
    </div></div>`;
  $('#start', app).onclick = async () => {
    const v = $('#pname', app).value.trim();
    if (!v) { $('#pname', app).focus(); return; }
    state.profile.name = v; state.profile.started = true; save(true);
    sfx.rev();
    await playStory('prologue');
    go('/home');
  };
}

export function recommendStep() {
  for (const g of GRADES) for (const ch of g.chapters) for (const st of ch.allSteps) if (!state.progress[st.id]?.cleared) return st;
  return null;
}

export function homeScreen(app) {
  if (!state.profile.started) { go('/title', true); return; }
  const login = checkLogin();
  const daily = ensureDaily();
  const r = rankInfo();
  const car = carById(state.garage.current);
  const wrongCount = Object.values(state.history).filter(h => h.status === 'wrong').length;
  const rec = recommendStep();
  const cleared = Object.values(state.progress).filter(p => p.cleared).length;
  const totalSteps = Object.keys(steps).length;

  app.innerHTML = `${topbar('<span class="en logo-mini">MATH<b>DRIFT</b></span>', { back: '' })}
  <div class="page home">
    <section class="panel neon home-hero">
      <div class="hero-bg">${sceneBg('garage')}</div>
      <div class="hero-info">
        <div class="hero-name">${esc(state.profile.name)}<small> / TAKAMIYA FACTORY</small></div>
        <div class="rank-row"><span class="rank-badge en">${r.name}</span>
          <div class="grow"><div class="progress"><div style="width:${Math.round(r.pct * 100)}%"></div></div>
          <div class="muted small">${r.next ? `次のランク ${r.next} まで ${fmtNum(r.toNext)} XP` : '最高ランク到達！'}</div></div>
        </div>
      </div>
      <a class="hero-car" href="#/garage">${carSVG(car.id, getConfig(state, car.id))}</a>
      <div class="hero-carname"><span class="chip c">${car.maker}</span> ${esc(car.name)}</div>
      <div class="hero-stats">
        <div><b class="en">${cleared}</b><span>/${totalSteps} STEP</span></div>
        <div><b class="en">${state.stats.correct}</b><span>正解数</span></div>
        <div><b class="en">${state.login.streak}</b><span>連続日数</span></div>
      </div>
    </section>

    <section class="home-menu">
      ${rec ? `<a class="menu-big" href="#/step/${rec.id}">
        <span class="mb-label en">NEXT RUN</span>
        <span class="mb-title">${esc(rec.label)} ${esc(rec.title)}</span>
        <span class="mb-sub">${esc(rec.sectionTitle)}</span></a>` : `<a class="menu-big" href="#/map"><span class="mb-label en">ALL CLEAR</span><span class="mb-title">全ステップクリア！ 復習で★3を目指そう</span></a>`}
      <a class="menu-btn m-map" href="#/map"><span class="mi">🗺</span><b>コースマップ</b><small>章・ステップを選ぶ</small></a>
      <a class="menu-btn m-pit" href="#/pit"><span class="mi">🔧</span><b>ピットイン</b><small>復習・解き直し${wrongCount ? `<em class="badge">${wrongCount}</em>` : ''}</small></a>
      <a class="menu-btn m-garage" href="#/garage"><span class="mi">🚗</span><b>ガレージ</b><small>カスタム・車を買う</small></a>
      <a class="menu-btn m-note" href="#/notes"><span class="mi">📘</span><b>ノート</b><small>ポイントまとめ</small></a>
      <a class="menu-btn m-rec" href="#/records"><span class="mi">🏆</span><b>記録・実績</b><small>バッジ・成績</small></a>
      <a class="menu-btn m-set" href="#/settings"><span class="mi">⚙</span><b>設定</b><small>文字サイズ・保存</small></a>
    </section>

    <section class="panel daily">
      <div class="panel-title">TODAY'S MISSION　今日の課題</div>
      ${daily.tasks.map(t => {
        const c = Math.min(daily.counts[t.ev] || 0, t.n);
        return `<div class="task ${t.done ? 'done' : ''}"><span class="tchk">${t.done ? '✔' : ''}</span><span class="grow">${esc(t.label)}</span>
          <span class="tprog en">${c}/${t.n}</span><span class="treward">+${t.gp}GP</span></div>`;
      }).join('')}
      <div class="task bonus ${daily.bonusClaimed ? 'done' : ''}"><span class="tchk">${daily.bonusClaimed ? '✔' : '🏁'}</span><span class="grow">3つ全部クリアでボーナス</span><span class="treward">+${DAILY_BONUS}GP</span></div>
    </section>

    <section class="panel login-cal">
      <div class="panel-title">LOGIN BONUS　連続 ${state.login.streak} 日目</div>
      <div class="cal">${LOGIN_REWARDS.map((g, i) => {
        const day = ((state.login.streak - 1) % 7) + 1;
        return `<div class="cal-day ${i + 1 < day ? 'got' : i + 1 === day ? 'today' : ''}"><small>DAY${i + 1}</small><b>${i === 6 ? '🎁' : ''}${g}</b></div>`;
      }).join('')}</div>
    </section>
  </div>`;

  if (login || state.login.pending) {
    const p = state.login.pending;
    setTimeout(async () => {
      await modal({
        title: '<span class="en">LOGIN BONUS</span>',
        body: `<div class="center"><div class="login-big en">DAY ${p.day}</div><p>${p.streak}日連続ログイン！</p><div class="login-gp en">+${p.gp} GP</div>
          <p class="muted small">毎日走って、DAY7で特大ボーナス！</p></div>`,
        buttons: [{ label: '受け取る', value: true, cls: 'btn-yellow btn-lg' }], dismiss: false,
      });
      claimLogin();
      homeScreen(app);
    }, 300);
  }
}
