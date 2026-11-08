// 問題を解く画面（共通エンジン）
import { $, $$, esc, shuffle, sfx, toast, confirmBox } from '../util.js';
import { fmt, gradeValue } from '../mathfmt.js';
import { keypadHTML, MathInput, fracKeyLabel, bindHardwareKeys } from './keypad.js';
import { createMemo } from './memo.js';
import { recordAnswer } from '../gamify.js';
import { state } from '../state.js';

const LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

/**
 * opts: { title, problems, mode:'practice'|'main'|'battle'|'review', requeueWrong, header(html), onAnswer(ok, p), onFinish(results), onExit, modeLabel }
 */
export function runQuiz(root, opts) {
  const queue = opts.problems.map(p => ({ p, retry: false }));
  const total = opts.problems.length;
  const results = new Map(); // id → {ok(first try), hint}
  let idx = 0, memo = null, unbindKeys = null, hintLv = 0;
  let cur = null; // {p, answered, value(s), sel, order, focus}

  root.innerHTML = `
  <div class="quiz mode-${opts.mode}">
    <div class="topbar quiz-top">
      <button class="btn btn-ghost icon-btn" data-act="exit" aria-label="やめる">✕</button>
      <div class="title"><span class="chip ${opts.mode === 'battle' ? 'r' : opts.mode === 'main' ? 'y' : 'c'}">${opts.modeLabel || ''}</span> ${esc(opts.title || '')}</div>
      <div class="q-dots"></div>
      <button class="btn btn-sm" data-act="hint">💡 ヒント</button>
      <button class="btn btn-sm" data-act="memo">✎ メモ</button>
    </div>
    ${opts.header || ''}
    <div class="quiz-body">
      <section class="q-pane">
        <div class="q-card"></div>
        <div class="q-hint hidden"></div>
        <div class="work-space"><span>計算スペース ― 「✎ メモ」で書きこめるよ</span></div>
      </section>
      <section class="a-pane"></section>
    </div>
    <div class="memo-toolbar hidden"></div>
  </div>`;
  const qpane = $('.q-pane', root), apane = $('.a-pane', root), card = $('.q-card', root), hintEl = $('.q-hint', root), toolbar = $('.memo-toolbar', root);

  root.querySelector('.quiz-top').addEventListener('click', async e => {
    const a = e.target.closest('[data-act]'); if (!a) return;
    if (a.dataset.act === 'exit') {
      const ok = await confirmBox('走行を中断する？', '途中までの記録（解いた問題の正誤）は保存されます。');
      if (ok) { cleanup(); opts.onExit && opts.onExit(); }
    }
    if (a.dataset.act === 'hint') showHint();
    if (a.dataset.act === 'memo') { const on = memo.toggle(); a.classList.toggle('btn-primary', on); }
  });

  function dots() {
    const el = $('.q-dots', root);
    el.innerHTML = opts.problems.map(p => {
      const r = results.get(p.id);
      const cls = r ? (r.ok ? 'ok' : 'ng') : (cur && cur.p.id === p.id ? 'now' : '');
      return `<i class="${cls}"></i>`;
    }).join('');
  }

  function showHint() {
    const p = cur.p;
    const hints = p.hint ? (Array.isArray(p.hint) ? p.hint : [p.hint]) : ['ブリーフィングのポイントを思い出そう。わからなければ答えを出して解説を読もう！'];
    hintLv = Math.min(hintLv + 1, hints.length);
    hintEl.classList.remove('hidden');
    hintEl.innerHTML = hints.slice(0, hintLv).map((h, i) => `<div><b class="hc">HINT ${i + 1}</b>　${fmt(h)}</div>`).join('');
    cur.hint = true;
  }

  function load() {
    if (memo) { memo.destroy(); memo = null; }
    if (idx >= queue.length) return finish();
    const { p, retry } = queue[idx];
    cur = { p, retry, answered: false, value: new MathInput(), values: (p.fields || []).map(() => new MathInput()), focus: 0, sel: null, order: [], hint: false };
    hintLv = 0;
    hintEl.classList.add('hidden'); hintEl.innerHTML = '';
    const no = retry ? 'RETRY' : `Q${opts.problems.indexOf(p) + 1}`;
    card.dataset.pid = p.id;
    card.innerHTML = `<div class="q-no en">${no}<span class="muted"> / ${total}</span>${retry ? ' <span class="chip r">リトライ</span>' : ''}${histChip(p.id)}</div>
      <div class="q-text">${fmt(p.q)}</div>${p.fig ? `<div class="fig">${p.fig}</div>` : ''}`;
    memo = createMemo(qpane, toolbar, p.id);
    $('[data-act=memo]', root).classList.remove('btn-primary');
    renderAnswer();
    dots();
    qpane.scrollTop = 0;
  }

  function histChip(pid) {
    const h = state.history[pid];
    if (!h) return '';
    const m = { correct: ['g', '前回 ○'], wrong: ['r', '前回 ×'], revenge: ['y', '解き直し ○'] }[h.status];
    return m ? ` <span class="chip ${m[0]}">${m[1]}</span>` : '';
  }

  // ===== 解答UI =====
  function renderAnswer() {
    const p = cur.p;
    let html = '';
    if (p.type === 'num' || p.type === 'expr') {
      html = `<div class="answer-box focus" data-field="0">${p.pre ? `<span class="pre">${fmt(p.pre)}</span>` : ''}<span class="val"></span>${p.unit ? `<span class="unit">${fmt(p.unit)}</span>` : ''}</div>
        <div class="kp">${keypadHTML(p.type, p.answer)}</div>`;
    } else if (p.type === 'fields') {
      html = `<div class="fields">${p.fields.map((f, i) => `<div class="answer-box${i === 0 ? ' focus' : ''}" data-field="${i}"><span class="pre">${fmt(f.pre)}</span><span class="val"></span>${f.unit ? `<span class="unit">${fmt(f.unit)}</span>` : ''}</div>`).join('')}</div>
        <div class="kp">${keypadHTML(p.fields.some(f => f.kind === 'expr') ? 'expr' : 'num', p.fields.map(f => f.answer).join(' '))}</div>`;
    } else if (p.type === 'choice') {
      cur.perm = p.noShuffle ? p.options.map((_, i) => i) : shuffle(p.options.map((_, i) => i));
      html = `<div class="choices">${cur.perm.map((oi, i) => `<button class="choice" data-opt="${oi}"><span class="lbl">${LABELS[i]}</span><span>${fmt(p.options[oi])}</span></button>`).join('')}</div>`;
    } else if (p.type === 'order') {
      cur.pool = shuffle(p.items.map((_, i) => i));
      html = `<div class="muted small">タップした順に並ぶよ。もう一度タップすると戻せる。</div>
        <div class="order-ans"></div><div class="order-pool"></div>`;
    }
    apane.innerHTML = `<div class="a-input">${html}</div>
      <div class="a-actions"><button class="btn btn-primary btn-lg btn-block" data-act="check">答え合わせ ▶</button></div>
      <div class="result hidden"></div>`;
    if (p.type === 'order') renderOrder();
    updateDisplay();
    apane.onclick = onAnswerClick;
    if (unbindKeys) unbindKeys();
    unbindKeys = bindHardwareKeys(k => {
      if (k === 'ENTER') { const b = $('[data-act=check]', apane) || $('[data-act=next]', apane); b && b.click(); return; }
      if (!cur.answered && (p.type === 'num' || p.type === 'expr' || p.type === 'fields')) pressKey(k);
    });
  }

  function renderOrder() {
    const p = cur.p;
    $('.order-ans', apane).innerHTML = cur.order.map((i, n) => `<button class="order-item" data-ord-rm="${n}"><span class="no">${n + 1}</span>${fmt(p.items[i])}</button>`).join('') || '<span class="muted">ここに並ぶ</span>';
    $('.order-pool', apane).innerHTML = cur.pool.filter(i => !cur.order.includes(i)).map(i => `<button class="order-item" data-ord-add="${i}">${fmt(p.items[i])}</button>`).join('');
  }

  function updateDisplay() {
    const p = cur.p;
    if (p.type === 'num' || p.type === 'expr') {
      $('.answer-box .val', apane).innerHTML = cur.value.html(!cur.answered);
    } else if (p.type === 'fields') {
      $$('.answer-box', apane).forEach((b, i) => {
        b.classList.toggle('focus', i === cur.focus && !cur.answered);
        $('.val', b).innerHTML = cur.values[i].html(i === cur.focus && !cur.answered);
      });
    }
    const fk = $('.fkey', apane);
    if (fk) { const inp = p.type === 'fields' ? cur.values[cur.focus] : cur.value; fk.innerHTML = fracKeyLabel(inp && inp.mode); fk.classList.toggle('fon', !!(inp && inp.mode)); }
  }

  function pressKey(k) {
    sfx.tap();
    (cur.p.type === 'fields' ? cur.values[cur.focus] : cur.value).press(k);
    updateDisplay();
  }

  function onAnswerClick(e) {
    const t = e.target;
    const key = t.closest('[data-key]');
    if (key && !cur.answered) { pressKey(key.dataset.key); return; }
    const fld = t.closest('[data-field]');
    if (fld && cur.p.type === 'fields' && !cur.answered) { cur.focus = +fld.dataset.field; updateDisplay(); return; }
    const opt = t.closest('[data-opt]');
    if (opt && !cur.answered) { sfx.tap(); cur.sel = +opt.dataset.opt; $$('.choice', apane).forEach(b => b.classList.toggle('sel', b === opt)); return; }
    const add = t.closest('[data-ord-add]');
    if (add && !cur.answered) { sfx.tap(); cur.order.push(+add.dataset.ordAdd); renderOrder(); return; }
    const rm = t.closest('[data-ord-rm]');
    if (rm && !cur.answered) { sfx.tap(); cur.order.splice(+rm.dataset.ordRm, 1); renderOrder(); return; }
    const act = t.closest('[data-act]');
    if (!act) return;
    e.stopPropagation(); // 次の画面に同じタップが伝わらないように
    if (act.dataset.act === 'check') check();
    if (act.dataset.act === 'next') { idx++; load(); }
    if (act.dataset.act === 'retry') {
      for (let j = queue.length - 1; j > idx; j--) if (queue[j].p === cur.p && queue[j].retry) queue.splice(j, 1);
      queue.splice(idx + 1, 0, { p: cur.p, retry: true }); idx++; load();
    }
    if (act.dataset.act === 'explain') { $('.explain', apane).classList.toggle('hidden'); act.classList.add('hidden'); }
  }

  function grade() {
    const p = cur.p;
    if (p.type === 'num' || p.type === 'expr') return gradeValue(cur.value.toString(), p.answer, p.type, p);
    if (p.type === 'fields') {
      const rs = p.fields.map((f, i) => gradeValue(cur.values[i].toString(), f.answer, f.kind, p));
      if (rs.some(r => r.empty)) return { ok: false, msg: 'すべての欄に入力しよう', empty: true };
      const bad = rs.findIndex(r => !r.ok);
      return bad < 0 ? { ok: true } : { ok: false, msg: rs[bad].msg ? `${p.fields[bad].pre} ${rs[bad].msg}` : `${p.fields[bad].pre} の欄がちがうよ`, per: rs.map(r => r.ok) };
    }
    if (p.type === 'choice') { if (cur.sel === null) return { ok: false, empty: true, msg: '選択肢を選ぼう' }; return { ok: cur.sel === p.answer }; }
    if (p.type === 'order') {
      if (cur.order.length < p.items.length) return { ok: false, empty: true, msg: 'すべて並べよう' };
      return { ok: cur.order.every((v, i) => v === i) };
    }
    return { ok: false };
  }

  function answerHTML(p) {
    const u = s => s ? `<span class="muted">${fmt(s)}</span>` : '';
    const first = a => Array.isArray(a) ? a[0] : a;
    const show = a => fmt(String(first(a)).replace(/-/g, '−').replace(/\*/g, '×').replace(/<=/g, '≦').replace(/>=/g, '≧'));
    if (p.disp) return `${p.pre ? fmt(p.pre) + ' ' : ''}${fmt(p.disp)} ${u(p.unit)}`;
    if (p.type === 'num' || p.type === 'expr') return `${p.pre ? fmt(p.pre) + ' ' : ''}${show(p.answer)} ${u(p.unit)}`;
    if (p.type === 'fields') return p.fields.map(f => `${fmt(f.pre)} ${show(f.answer)} ${u(f.unit)}`).join('　');
    if (p.type === 'choice') return fmt(p.options[p.answer]);
    if (p.type === 'order') return p.items.map((it, i) => `${i + 1}. ${fmt(it)}`).join('<br>');
    return '';
  }

  function check() {
    const p = cur.p;
    const g = grade();
    if (g.empty) { toast(g.msg); return; }
    cur.answered = true;
    if (unbindKeys) { unbindKeys(); unbindKeys = bindHardwareKeys(k => { if (k === 'ENTER') { const b = $('[data-act=next]', apane); b && b.click(); } }); }
    const first = !results.has(p.id);
    if (first) {
      results.set(p.id, { ok: g.ok, hint: cur.hint });
      recordAnswer(p.id, g.ok, opts.mode, { memo: memo && memo.used });
    }
    g.ok ? sfx.ok() : sfx.ng();
    // 選択肢の色
    if (p.type === 'choice') $$('.choice', apane).forEach(b => { const oi = +b.dataset.opt; if (oi === p.answer) b.classList.add('right'); else if (oi === cur.sel) b.classList.add('wrong'); });
    if (p.type === 'fields' && g.per) $$('.answer-box', apane).forEach((b, i) => b.classList.add(g.per[i] ? 'right' : 'wrong'));
    if (p.type === 'num' || p.type === 'expr') $('.answer-box', apane).classList.add(g.ok ? 'right' : 'wrong');
    updateDisplay();
    $('.a-actions', apane).classList.add('hidden');
    $('.kp', apane)?.classList.add('hidden');
    const res = $('.result', apane);
    const canRetry = !g.ok && (opts.mode === 'practice' || opts.mode === 'review');
    const isLast = idx >= queue.length - 1;
    res.innerHTML = `
      <div class="res-head ${g.ok ? 'ok' : 'ng'}"><span class="en">${g.ok ? 'CLEAR!' : 'MISS…'}</span><span>${g.ok ? (cur.retry ? 'リトライ成功！' : 'ナイスライン！') : 'コースアウト…解説でライン取りを確認しよう'}</span></div>
      ${g.msg ? `<div class="res-msg">⚠ ${esc(g.msg)}</div>` : ''}
      ${!g.ok ? `<div class="res-ans"><span class="muted">正解</span>　<b>${answerHTML(p)}</b></div>` : ''}
      ${g.ok ? `<button class="btn btn-sm" data-act="explain">📘 解説を見る</button>` : ''}
      <div class="explain ${g.ok ? 'hidden' : ''}"><div class="panel-title">EXPLANATION</div>${p.explain.map(l => `<div class="ex-line">${fmt(l)}</div>`).join('')}</div>
      <div class="res-btns">
        ${canRetry ? `<button class="btn" data-act="retry">↺ もう一度解く</button>` : ''}
        <button class="btn btn-primary btn-lg grow" data-act="next">${isLast ? 'リザルトへ ▶' : '次の問題へ ▶'}</button>
      </div>`;
    res.classList.remove('hidden');
    res.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    dots();
    // 練習モード：間違えた問題を最後にもう一度
    if (!g.ok && first && opts.requeueWrong && !cur.retry) queue.push({ p, retry: true });
    opts.onAnswer && opts.onAnswer(g.ok, p, first);
  }

  function finish() {
    cleanup();
    const list = opts.problems.map(p => ({ id: p.id, ...(results.get(p.id) || { ok: false }) }));
    opts.onFinish && opts.onFinish(list);
  }

  function cleanup() {
    if (memo) { memo.destroy(); memo = null; }
    if (unbindKeys) { unbindKeys(); unbindKeys = null; }
  }

  load();
  return cleanup;
}
