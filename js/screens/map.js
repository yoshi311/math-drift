// コースマップ・章画面
import { state } from '../state.js';
import { esc, $ } from '../util.js';
import { topbar, stars, chara } from '../ui.js';
import { GRADES, chapters } from '../../data/curriculum/index.js';
import { CHARS } from '../../data/story/index.js';
import { carSVG } from '../components/car-render.js';
import { carById } from '../../data/cars.js';
import { playStory, hasScene } from './story.js';

function chProgress(ch) {
  const total = ch.allSteps.length;
  const cleared = ch.allSteps.filter(s => state.progress[s.id]?.cleared).length;
  const st = ch.allSteps.reduce((a, s) => a + (state.progress[s.id]?.stars || 0), 0);
  return { total, cleared, stars: st, maxStars: total * 3, battle: !!state.battles[ch.id]?.cleared };
}

let gradeTab = 'g1';
export function mapScreen(app) {
  const render = () => {
    const g = GRADES.find(x => x.id === gradeTab);
    app.innerHTML = `${topbar('コースマップ')}
    <div class="page">
      <div class="tabs grade-tabs">${GRADES.map(x => `<button class="tab ${x.id === gradeTab ? 'on' : ''}" data-g="${x.id}">${x.name}　${x.title}</button>`).join('')}</div>
      <div class="grade-head"><div class="en grade-sub">${g.sub}</div><h2>${g.name}　${g.title}</h2></div>
      ${g.soon ? `<div class="panel center soon"><div class="en" style="font-size:2em;color:var(--yellow)">COMING SOON</div><p>${g.name}のステージは準備中。中1を制覇して待っていよう！</p></div>` : `
      <div class="route">${g.chapters.map(ch => {
        const p = chProgress(ch);
        return `<a class="route-node ${p.battle ? 'beat' : p.cleared ? 'run' : ''}" href="#/chapter/${ch.id}"><i></i><span class="en">S${ch.no}</span></a>`;
      }).join('<b class="route-line"></b>')}</div>
      <div class="chapter-grid">${g.chapters.map(ch => {
        const p = chProgress(ch);
        const rc = carById(ch.rival.car);
        return `<a class="ch-card ${p.battle ? 'beat' : ''}" href="#/chapter/${ch.id}" style="--c:${CHARS[ch.rival.char].color}">
          <div class="ch-chara">${chara(ch.rival.char, p.battle ? 'smile' : 'serious')}</div>
          <div class="ch-no en">STAGE ${ch.no}</div>
          <div class="ch-title">${esc(ch.title)}</div>
          <div class="ch-stage">${esc(ch.stage)}</div>
          <div class="ch-car">${carSVG(rc.id, { neon: p.battle ? null : '#ff2d55' })}</div>
          <div class="ch-rival"><span style="color:${CHARS[ch.rival.char].color}">VS ${esc(CHARS[ch.rival.char].name)}</span><small>${esc(rc.name)}</small></div>
          <div class="progress"><div style="width:${p.total ? p.cleared / p.total * 100 : 0}%"></div></div>
          <div class="ch-foot"><span>${p.cleared}/${p.total} STEP</span><span class="stars"><span class="on">★</span>${p.stars}/${p.maxStars}</span>${p.battle ? '<span class="chip g">WIN</span>' : ''}</div>
        </a>`;
      }).join('')}</div>`}
    </div>`;
    app.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { gradeTab = b.dataset.g; render(); });
  };
  render();
}

export function chapterScreen(app, { id }) {
  const ch = chapters[id];
  if (!ch) { location.hash = '#/map'; return; }
  const p = chProgress(ch);
  const rc = carById(ch.rival.car);
  const rch = CHARS[ch.rival.char];
  let nextFound = false;
  app.innerHTML = `${topbar(`STAGE ${ch.no}　${esc(ch.title)}`, { back: '#/map' })}
  <div class="page chapter">
    <section class="panel neon ch-hero">
      <div class="ch-hero-l">
        <div class="en ch-no">STAGE ${ch.no} ／ ${esc(ch.gradeName)}</div>
        <h2>${esc(ch.title)}</h2>
        <div class="ch-stage">${esc(ch.stage)}</div>
        <div class="row wrap" style="margin-top:10px">
          <span class="chip c">${p.cleared}/${p.total} STEP</span><span class="chip y">★ ${p.stars}/${p.maxStars}</span>
          ${hasScene(id + '-intro') ? `<button class="btn btn-sm" data-story="${id}-intro">▶ ストーリー</button>` : ''}
          ${p.battle && hasScene(id + '-outro') ? `<button class="btn btn-sm" data-story="${id}-outro">▶ 勝利後</button>` : ''}
        </div>
      </div>
      <div class="ch-hero-r" style="--c:${rch.color}"><div class="ch-hero-chara">${chara(ch.rival.char, p.battle ? 'smile' : 'serious')}</div>${carSVG(rc.id, {})}<div class="ch-rival"><span style="color:${rch.color}">${esc(rch.name)}</span><small>${esc(rch.role)}／${esc(rc.name)}</small></div></div>
    </section>
    ${ch.sections.map(sec => `
      <section class="sec">
        <h3 class="sec-title"><span class="en">COURSE ${sec.no}</span>${esc(sec.title)}</h3>
        <div class="step-list">${sec.steps.map(st => {
          const pr = state.progress[st.id];
          let tag = '';
          if (pr?.cleared) tag = stars(pr.stars);
          else if (!nextFound) { nextFound = true; tag = '<span class="chip r">NEXT</span>'; }
          else tag = '<span class="chip">未走行</span>';
          return `<a class="step-card ${pr?.cleared ? 'clear' : ''}" href="#/step/${st.id}">
            <span class="step-no en">${st.label}</span><span class="step-title">${esc(st.title)}</span><span class="step-tag">${tag}</span></a>`;
        }).join('')}</div>
      </section>`).join('')}
    <a class="battle-card ${p.battle ? 'beat' : ''}" href="#/battle/${ch.id}">
      <div class="en bc-label">RIVAL BATTLE</div>
      <div class="bc-title">VS ${esc(rch.name)}<small>章末テスト ${ch.battle.length}問 ／ 7割以上で勝利</small></div>
      <div class="bc-state">${p.battle ? `<span class="chip g">WIN　ベスト ${state.battles[id].best}%</span>` : '<span class="chip r">挑戦できる</span>'}</div>
    </a>
    ${p.battle ? `<a class="battle-card hard ${state.battles[id].hard ? 'beat' : ''}" href="#/battle/${ch.id}?hard=1">
      <div class="en bc-label">HARD MODE</div>
      <div class="bc-title">再戦 VS ${esc(rch.name)}<small>8割以上＋ヒントなし ／ 勝つとSR確率の高い部品箱</small></div>
      <div class="bc-state">${state.battles[id].hard ? '<span class="chip g">HARD WIN</span>' : '<span class="chip y">🔥 挑戦できる</span>'}</div>
    </a>` : ''}
  </div>`;
  app.querySelectorAll('[data-story]').forEach(b => b.onclick = () => playStory(b.dataset.story));
  if (!state.seenStory[id + '-intro'] && hasScene(id + '-intro')) setTimeout(() => playStory(id + '-intro'), 250);
}
