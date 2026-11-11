// ピットイン（復習モード）とノート
import { state } from '../state.js';
import { esc, shuffle, $, toast } from '../util.js';
import { go } from '../router.js';
import { topbar } from '../ui.js';
import { fmt } from '../mathfmt.js';
import { GRADES, chapters, steps, problems } from '../../data/curriculum/index.js';
import { runQuiz } from '../components/quiz.js';
import { briefHTML } from './step.js';
import { dueList, condition, completeMaint, doneToday, MAINT_MAX } from '../maint.js';
import { addGP, track, checkAchievements } from '../gamify.js';
import { sfx } from '../util.js';

const ST = {
  new: { label: '未挑戦', cls: '', icon: '－' },
  correct: { label: '正解', cls: 'g', icon: '○' },
  wrong: { label: '不正解', cls: 'r', icon: '×' },
  revenge: { label: '解き直し正解', cls: 'y', icon: '◎' },
};
const strip = s => String(s).replace(/<[^>]+>/g, '').replace(/\{([^{}]+?)\/([^{}]+?)\}/g, '$1/$2').replace(/\n/g, ' ');
const statusOf = pid => state.history[pid]?.status || 'new';

let filt = { ch: 'all', st: 'wrong' };

export function pitScreen(app) {
  const render = () => {
    const allChs = GRADES.flatMap(g => g.chapters);
    const all = Object.values(problems);
    const cnt = { new: 0, correct: 0, wrong: 0, revenge: 0 };
    all.forEach(p => cnt[statusOf(p.id)]++);
    const list = all.filter(p => (filt.ch === 'all' || p.chapter === filt.ch) && (filt.st === 'all' || statusOf(p.id) === filt.st));
    const wrongList = all.filter(p => statusOf(p.id) === 'wrong' && (filt.ch === 'all' || p.chapter === filt.ch));
    const doneList = all.filter(p => statusOf(p.id) !== 'new' && (filt.ch === 'all' || p.chapter === filt.ch));
    // ステップごとにグループ化
    const groups = new Map();
    list.forEach(p => { const k = p.step || p.chapter + '-battle'; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(p); });

    app.innerHTML = `${topbar('🔧 ピットイン　復習・解き直し')}
    <div class="page pit">
      <section class="pit-summary">
        <div class="ps ps-r"><b class="en">${cnt.wrong}</b><span>× 不正解</span></div>
        <div class="ps ps-y"><b class="en">${cnt.revenge}</b><span>◎ 解き直し正解</span></div>
        <div class="ps ps-g"><b class="en">${cnt.correct}</b><span>○ 一発正解</span></div>
        <div class="ps"><b class="en">${cnt.new}</b><span>未挑戦</span></div>
      </section>
      <section class="row wrap pit-actions">
        <button class="btn btn-red btn-lg" data-act="revenge" ${wrongList.length ? '' : 'disabled'}>🔥 リベンジ走行（×の問題 ${Math.min(10, wrongList.length)}問）</button>
        <button class="btn btn-primary" data-act="random" ${doneList.length ? '' : 'disabled'}>🎲 ランダム復習10問</button>
      </section>
      <div class="tabs">${[['all', 'すべての章'], ...allChs.map(c => [c.id, `${c.no}. ${c.title}`])].map(([k, l]) => `<button class="tab ${filt.ch === k ? 'on' : ''}" data-ch="${k}">${esc(l)}</button>`).join('')}</div>
      <div class="tabs" style="margin-top:6px">${[['wrong', '× 不正解'], ['revenge', '◎ 解き直し正解'], ['correct', '○ 正解'], ['new', '未挑戦'], ['all', 'ぜんぶ']].map(([k, l]) => `<button class="tab ${filt.st === k ? 'on' : ''}" data-st="${k}">${l}</button>`).join('')}</div>
      <div class="pit-list">
        ${list.length ? [...groups.entries()].map(([k, ps]) => {
          const st = steps[k];
          const title = st ? `${st.label} ${st.title}` : `STAGE ${chapters[ps[0].chapter].no} ライバルバトル`;
          return `<div class="pit-group"><div class="pit-gtitle">${esc(title)}</div>${ps.map(p => {
            const h = state.history[p.id]; const s = ST[statusOf(p.id)];
            const memo = state.memos[p.id] ? '<span title="メモあり">✎</span>' : '';
            return `<a class="pit-item" href="#/pit/p/${p.id}"><span class="pi-st chip ${s.cls}">${s.icon} ${s.label}</span>
              <span class="pi-q">${esc(strip(p.q)).slice(0, 70)}</span>
              <span class="pi-meta">${memo}${h ? `${h.tries}回 / ×${h.wrong}` : ''}</span></a>`;
          }).join('')}</div>`;
        }).join('') : `<div class="panel center muted">${filt.st === 'wrong' ? '× の問題はありません。ナイス！' : '該当する問題はありません'}</div>`}
      </div>
    </div>`;
    app.querySelectorAll('[data-ch]').forEach(b => b.onclick = () => { filt.ch = b.dataset.ch; render(); });
    app.querySelectorAll('[data-st]').forEach(b => b.onclick = () => { filt.st = b.dataset.st; render(); });
    app.querySelector('[data-act=revenge]').onclick = () => runSet(shuffle(wrongList).slice(0, 10), 'リベンジ走行');
    app.querySelector('[data-act=random]').onclick = () => runSet(shuffle(doneList).slice(0, 10), 'ランダム復習');
  };
  let cleanup = null;
  function runSet(ps, title) {
    if (!ps.length) return;
    cleanup = runQuiz(app, {
      title, problems: ps, mode: 'review', modeLabel: 'PIT',
      onExit: () => render(),
      onFinish: res => {
        const ok = res.filter(r => r.ok).length;
        toast(`${title}　${ok}/${res.length} 問正解！`);
        render();
      },
    });
  }
  render();
  return () => cleanup && cleanup();
}

export function pitSingle(app, { pid }) {
  const p = problems[pid];
  if (!p) { go('/pit', true); return; }
  const st = p.step ? steps[p.step] : null;
  const back = () => { if (history.length > 1) history.back(); else go('/pit'); };
  return runQuiz(app, {
    title: st ? `${st.label} ${st.title}` : `STAGE ${chapters[p.chapter].no} バトル問題`,
    problems: [p], mode: 'review', modeLabel: 'PIT',
    onExit: back, onFinish: back,
  });
}

// ===== 今日のメンテ（点検日が来た問題を最大10問） =====
export function maintScreen(app) {
  const before = condition();
  const ps = dueList().slice(0, MAINT_MAX);
  if (!ps.length) { toast('点検が必要な問題はありません。コンディション100%！'); go('/home', true); return; }
  return runQuiz(app, {
    title: '今日のメンテ', problems: ps, mode: 'review', modeLabel: 'MAINTENANCE', drive: {},
    onExit: () => go('/home'),
    onFinish: (res, dr) => {
      const ok = res.filter(r => r.ok).length;
      const first = !doneToday();
      const bonus = completeMaint();
      if (bonus) { addGP(bonus, 'メンテ完了', true); track('maint'); }
      checkAchievements();
      sfx.fanfare();
      const after = condition();
      app.innerHTML = `${topbar('🔧 今日のメンテ')}
      <div class="page result-page"><div class="result-hero win maint-res">
        <div class="en rh-label">MAINTENANCE ${after.n ? 'DONE' : 'COMPLETE'}</div>
        <div class="maint-gauge big"><div class="mg-bar"><i class="${after.cls}" style="width:${after.pct}%"></i></div>
          <div class="en mg-val">${before.pct}% → <b>${after.pct}%</b></div></div>
        <div class="rh-score en">${ok}<small> / ${res.length}</small></div>
        ${dr ? `<div class="small muted">SCORE ${dr.score}　最大コンボ ${dr.maxCombo}</div>` : ''}
        ${first ? `<div class="rh-gp en">+${bonus} GP</div><div>メンテ <b class="hl">${state.maint.streak}日連続</b>！${state.maint.streak >= 2 ? '' : '明日も続けるとボーナスアップ'}</div>` : ''}
        <p class="muted small">正解した問題は、次の点検日がのびる（1→3→7→14→30日）。間違えた問題は明日以降にまた出るよ。</p>
      </div>
      <div class="row wrap result-btns">
        <a class="btn" href="#/home">ホームへ</a>
        ${after.n ? `<a class="btn btn-red btn-lg" href="#/maint" data-again>もう1セット（残り${after.n}問）</a>` : ''}
      </div></div>`;
      const ag = app.querySelector('[data-again]'); if (ag) ag.onclick = e => { e.preventDefault(); maintScreen(app); };
    },
  });
}

// ===== ノート =====
export function notesScreen(app) {
  const allChs = GRADES.flatMap(g => g.chapters);
  const memoIds = Object.keys(state.memos).filter(id => problems[id]);
  app.innerHTML = `${topbar('📘 ノート　ポイントまとめ')}
  <div class="page notes">
    <p class="muted">各ステップのブリーフィング（要点）をいつでも見返せるよ。テスト前の確認に使おう。</p>
    ${memoIds.length ? `<details class="panel note-ch"><summary><b>✎ 自分のメモがある問題（${memoIds.length}）</b></summary>
      <div class="pit-list">${memoIds.map(id => `<a class="pit-item" href="#/pit/p/${id}"><span class="pi-q">${esc(strip(problems[id].q)).slice(0, 60)}</span><span class="pi-meta">${esc((state.memos[id].text || '').slice(0, 30))}</span></a>`).join('')}</div></details>` : ''}
    ${allChs.map(ch => `<details class="panel note-ch"><summary><span class="en hc">STAGE ${ch.no}</span>　<b>${esc(ch.title)}</b></summary>
      ${ch.allSteps.map(st => `<details class="note-step"><summary>${st.label}　${esc(st.title)}</summary><div class="note-cards">${briefHTML(st)}</div></details>`).join('')}
    </details>`).join('')}
  </div>`;
}
