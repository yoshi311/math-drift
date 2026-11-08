// 手書きメモ（Apple Pencil / 指）＋テキストメモ。問題ごとに保存
import { state, save } from '../state.js';
import { esc, modal } from '../util.js';

const COLORS = ['#ffffff', '#00e5ff', '#ffd400', '#ff2d55', '#2bff88'];

export function createMemo(pane, toolbar, pid) {
  const canvas = document.createElement('canvas');
  canvas.className = 'memo-canvas';
  pane.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  const data = state.memos[pid] ? JSON.parse(JSON.stringify(state.memos[pid])) : { strokes: [], text: '' };
  let on = false, color = COLORS[0], width = 3, eraser = false, cur = null, dirty = false, used = false;

  function size() {
    const r = pane.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(pane.scrollHeight * dpr);
    canvas.style.width = r.width + 'px'; canvas.style.height = pane.scrollHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    redraw();
  }
  function scale() { return pane.getBoundingClientRect().width / 1000; }
  function drawStroke(s) {
    const k = scale(); const p = s.p;
    if (p.length < 2) return;
    ctx.strokeStyle = s.c; ctx.lineWidth = s.w * k * 2.2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(p[0] * k, p[1] * k);
    for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i] * k, p[i + 1] * k);
    ctx.stroke();
  }
  function redraw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    data.strokes.forEach(drawStroke);
  }
  function pos(e) {
    const r = canvas.getBoundingClientRect(), k = scale();
    return [Math.round((e.clientX - r.left) / k), Math.round((e.clientY - r.top) / k)];
  }
  function eraseAt(x, y) {
    const before = data.strokes.length;
    data.strokes = data.strokes.filter(s => { for (let i = 0; i < s.p.length; i += 2) if (Math.hypot(s.p[i] - x, s.p[i + 1] - y) < 22) return false; return true; });
    if (data.strokes.length !== before) { dirty = true; redraw(); }
  }
  canvas.addEventListener('pointerdown', e => {
    if (!on) return;
    e.preventDefault(); canvas.setPointerCapture(e.pointerId);
    const [x, y] = pos(e);
    if (eraser) { eraseAt(x, y); cur = { erase: true }; return; }
    cur = { c: color, w: e.pointerType === 'pen' ? width * (0.6 + (e.pressure || .5) * .8) : width, p: [x, y] };
    data.strokes.push(cur); used = true;
  });
  canvas.addEventListener('pointermove', e => {
    if (!on || !cur) return;
    e.preventDefault();
    const [x, y] = pos(e);
    if (cur.erase) { eraseAt(x, y); return; }
    const p = cur.p; const lx = p[p.length - 2], ly = p[p.length - 1];
    if (Math.hypot(x - lx, y - ly) < 2.5) return;
    p.push(x, y);
    ctx.strokeStyle = cur.c; ctx.lineWidth = cur.w * scale() * 2.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(lx * scale(), ly * scale()); ctx.lineTo(x * scale(), y * scale()); ctx.stroke();
    dirty = true;
  });
  const end = () => { cur = null; };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);

  toolbar.innerHTML = `
    ${COLORS.map((c, i) => `<button class="mt-color${i === 0 ? ' on' : ''}" data-c="${c}" style="--c:${c}" aria-label="ペン色"></button>`).join('')}
    <button class="btn btn-sm" data-act="width">太さ</button>
    <button class="btn btn-sm" data-act="eraser">消しゴム</button>
    <button class="btn btn-sm" data-act="undo">↶</button>
    <button class="btn btn-sm" data-act="clear">全消し</button>
    <button class="btn btn-sm" data-act="text">📝 テキスト${data.text ? '●' : ''}</button>
    <button class="btn btn-sm btn-primary" data-act="close">メモを閉じる</button>`;
  toolbar.addEventListener('click', async e => {
    const c = e.target.closest('[data-c]');
    if (c) { color = c.dataset.c; eraser = false; toolbar.querySelectorAll('.mt-color').forEach(b => b.classList.toggle('on', b === c)); toolbar.querySelector('[data-act=eraser]').classList.remove('btn-primary'); return; }
    const a = e.target.closest('[data-act]'); if (!a) return;
    const act = a.dataset.act;
    if (act === 'width') { width = width === 3 ? 6 : width === 6 ? 1.5 : 3; a.textContent = '太さ ' + ({ 1.5: '細', 3: '中', 6: '太' }[width]); }
    if (act === 'eraser') { eraser = !eraser; a.classList.toggle('btn-primary', eraser); }
    if (act === 'undo') { data.strokes.pop(); dirty = true; redraw(); }
    if (act === 'clear') { data.strokes = []; dirty = true; redraw(); }
    if (act === 'close') api.toggle(false);
    if (act === 'text') {
      const v = await modal({ title: '📝 テキストメモ', body: `<textarea id="memo-text" class="memo-text" placeholder="気づいたこと・公式・まちがえた理由などを書こう">${esc(data.text)}</textarea>`, buttons: [{ label: 'キャンセル', value: null }, { label: '保存', value: 'save', cls: 'btn-primary' }] });
      if (v === 'save') { data.text = document.getElementById('memo-text')?.value || ''; dirty = true; persist(); a.innerHTML = '📝 テキスト' + (data.text ? '●' : ''); }
    }
  });
  // モーダル閉じた後にtextareaの値を取るため、入力を監視
  document.addEventListener('input', onInput);
  function onInput(e) { if (e.target.id === 'memo-text') pendingText = e.target.value; }
  let pendingText = null;

  function persist() {
    if (!dirty) return;
    if (pendingText !== null) { data.text = pendingText; pendingText = null; }
    if (!data.strokes.length && !data.text) delete state.memos[pid];
    else state.memos[pid] = data;
    save(); dirty = false;
  }

  const ro = new ResizeObserver(() => size());
  ro.observe(pane);
  requestAnimationFrame(size);

  const api = {
    toggle(v = !on) {
      on = v; canvas.classList.toggle('active', on); toolbar.classList.toggle('hidden', !on);
      pane.classList.toggle('drawing', on);
      if (!on) persist();
      return on;
    },
    get used() { return used; },
    get hasContent() { return data.strokes.length > 0 || !!data.text; },
    get text() { return data.text; },
    save: persist,
    destroy() { persist(); ro.disconnect(); document.removeEventListener('input', onInput); canvas.remove(); toolbar.innerHTML = ''; toolbar.classList.add('hidden'); },
  };
  return api;
}
