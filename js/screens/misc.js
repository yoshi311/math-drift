// 記録・実績 / 設定
import { state, save, exportJSON, importJSON, resetAll, today } from '../state.js';
import { esc, confirmBox, toast, fmtNum, modal } from '../util.js';
import { topbar } from '../ui.js';
import { ACHIEVEMENTS, rankInfo } from '../gamify.js';
import { GRADES, problems } from '../../data/curriculum/index.js';
import { go } from '../router.js';

export function recordsScreen(app) {
  const r = rankInfo();
  const all = Object.values(problems);
  const rate = state.stats.answered ? Math.round(state.stats.correct / state.stats.answered * 100) : 0;
  const chs = GRADES.flatMap(g => g.chapters);
  app.innerHTML = `${topbar('🏆 記録・実績')}
  <div class="page records">
    <section class="rec-stats">
      <div class="panel"><small>ランク</small><b class="en">${r.name}</b></div>
      <div class="panel"><small>累計XP</small><b class="en">${fmtNum(state.xp)}</b></div>
      <div class="panel"><small>正解数</small><b class="en">${fmtNum(state.stats.correct)}</b></div>
      <div class="panel"><small>正答率</small><b class="en">${rate}%</b></div>
      <div class="panel"><small>解き直し</small><b class="en">${state.stats.revenge}</b></div>
      <div class="panel"><small>通算ログイン</small><b class="en">${state.login.total || 0}日</b></div>
    </section>
    <section class="panel">
      <div class="panel-title">CHAPTER　章ごとの理解度</div>
      ${chs.map(ch => {
        const ps = all.filter(p => p.chapter === ch.id);
        const tried = ps.filter(p => state.history[p.id]);
        const good = ps.filter(p => ['correct', 'revenge'].includes(state.history[p.id]?.status)).length;
        const bad = ps.filter(p => state.history[p.id]?.status === 'wrong').length;
        return `<div class="ch-meter"><span class="cm-name">${ch.no}. ${esc(ch.title)}</span>
          <div class="cm-bar"><div class="g" style="width:${good / ps.length * 100}%"></div><div class="r" style="width:${bad / ps.length * 100}%"></div></div>
          <span class="cm-num en">${good}/${ps.length}</span></div>`;
      }).join('')}
      <div class="muted small">緑＝正解済み　赤＝まだ×の問題（ピットインで解き直そう）</div>
    </section>
    <section class="panel">
      <div class="panel-title">ACHIEVEMENTS　実績バッジ ${Object.keys(state.achievements).length}/${ACHIEVEMENTS.length}</div>
      <div class="ach-grid">${ACHIEVEMENTS.map(a => {
        const got = state.achievements[a.id];
        return `<div class="ach ${got ? 'got' : ''}"><span class="ach-ic">${got ? '🏆' : '🔒'}</span><b>${esc(a.name)}</b><small>${esc(a.desc)}</small></div>`;
      }).join('')}</div>
    </section>
  </div>`;
}

export function settingsScreen(app) {
  const s = state.settings;
  const opt = (k, v, label) => `<button class="btn ${s[k] === v ? 'btn-primary' : ''}" data-k="${k}" data-v="${v}">${label}</button>`;
  app.innerHTML = `${topbar('⚙ 設定')}
  <div class="page settings">
    <section class="panel"><div class="panel-title">PROFILE</div>
      <div class="row"><input id="pname" class="text-input grow" maxlength="10" value="${esc(state.profile.name)}"><button class="btn" id="savename">名前を変更</button></div></section>
    <section class="panel"><div class="panel-title">見やすさ</div>
      <div class="set-row"><span>文字の大きさ</span>${opt('fs', 's', '小')}${opt('fs', 'm', '中')}${opt('fs', 'l', '大')}</div>
      <div class="set-row"><span>コントラスト</span>${opt('contrast', 'normal', 'ふつう')}${opt('contrast', 'high', 'くっきり')}</div>
      <div class="set-row"><span>効果音</span>${opt('sound', true, 'ON')}${opt('sound', false, 'OFF')}</div>
      <div class="set-row"><span>アニメーション</span>${opt('anim', true, 'ON')}${opt('anim', false, 'OFF')}</div>
    </section>
    <section class="panel"><div class="panel-title">セーブデータ</div>
      <p class="muted small">データはこのiPadのブラウザに保存されています。ブラウザの履歴・Webサイトデータを消すと消えてしまうので、ときどきバックアップしよう。</p>
      <div class="row wrap">
        <button class="btn btn-primary" id="export">⬇ バックアップを保存</button>
        <label class="btn">⬆ バックアップから復元<input type="file" id="import" accept=".json,application/json" hidden></label>
        <button class="btn btn-red" id="reset">データをすべて消す</button>
      </div>
    </section>
    <section class="panel"><div class="panel-title">ABOUT</div>
      <p class="small muted">MATH DRIFT ― 中学数学（東京書籍『新しい数学』準拠）学習ゲーム。<br>
      iPadのSafariで「共有 → ホーム画面に追加」すると、アプリのように全画面で使えます。<br>
      登場する車名は各メーカーの商標です。ストーリー・キャラクターはオリジナルです。</p>
    </section>
  </div>`;
  app.querySelectorAll('[data-k]').forEach(b => b.onclick = () => {
    let v = b.dataset.v; if (v === 'true') v = true; if (v === 'false') v = false;
    s[b.dataset.k] = v; save(); applySettings(); settingsScreen(app);
  });
  app.querySelector('#savename').onclick = () => { const v = app.querySelector('#pname').value.trim(); if (v) { state.profile.name = v; save(); toast('名前を変更しました'); } };
  app.querySelector('#export').onclick = () => {
    const blob = new Blob([exportJSON()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `mathdrift-backup-${today()}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast('バックアップを保存しました（ファイルAppに保存してね）');
  };
  app.querySelector('#import').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    const ok = await confirmBox('復元しますか？', '今のデータはバックアップの内容で上書きされます。', '復元する');
    if (!ok) return;
    try { importJSON(await f.text()); applySettings(); toast('復元しました'); go('/home'); }
    catch (err) { modal({ title: '復元できませんでした', body: esc(err.message) }); }
  };
  app.querySelector('#reset').onclick = async () => {
    const ok = await confirmBox('本当に消しますか？', '進み具合・GP・車・メモがすべて消えます。元に戻せません。', 'すべて消す');
    if (!ok) return;
    const ok2 = await confirmBox('最終確認', 'バックアップは保存しましたか？　本当に消去します。', '消去する');
    if (!ok2) return;
    resetAll(); applySettings(); go('/title');
  };
}

export function applySettings() {
  const s = state.settings, h = document.documentElement;
  h.dataset.fs = s.fs; h.dataset.contrast = s.contrast; h.dataset.anim = s.anim ? 'on' : 'off';
}
