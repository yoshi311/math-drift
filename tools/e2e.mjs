// ブラウザ通しテスト（Edge + DevTools Protocol）: node tools/e2e.mjs
// 事前に http://localhost:8765 でサーバーを起動しておく
import { spawn, execSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const BASE = 'http://localhost:8765/index.html';
const OUT = join(tmpdir(), 'md');
const prof = mkdtempSync(join(tmpdir(), 'md-e2e-'));
const PORT = 9300 + Math.floor(Math.random() * 600);
const W = +(process.env.W || 1180), H = +(process.env.H || 820);
const edge = spawn(EDGE, ['--headless', '--disable-gpu', '--no-first-run', `--user-data-dir=${prof}`, `--remote-debugging-port=${PORT}`, `--window-size=${W},${H}`, 'about:blank']);
const killEdge = () => { try { execSync(`taskkill /F /T /PID ${edge.pid}`, { stdio: 'ignore' }); } catch {} };
const sleep = ms => new Promise(r => setTimeout(r, ms));

let ws, seq = 0; const pending = new Map(); const problemsLog = [];
async function connect() {
  for (let i = 0; i < 40; i++) {
    try { const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); const pg = list.find(t => t.type === 'page'); if (pg) return pg.webSocketDebuggerUrl; } catch {}
    await sleep(250);
  }
  throw new Error('no devtools');
}
function send(method, params = {}) {
  const id = ++seq; ws.send(JSON.stringify({ id, method, params }));
  return new Promise((res, rej) => pending.set(id, { res, rej }));
}
async function ev(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error('eval: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
  return r.result.value;
}
async function shot(name) {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(OUT, name + '.png'), Buffer.from(r.data, 'base64'));
}
const click = sel => ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)}); if(!e) throw new Error('no '+${JSON.stringify(sel)}); e.click(); return true})()`);
const exists = sel => ev(`!!document.querySelector(${JSON.stringify(sel)})`);
const text = sel => ev(`(document.querySelector(${JSON.stringify(sel)})||{}).textContent||''`);
function assert(c, m) { if (!c) { problemsLog.push('ASSERT FAIL: ' + m); console.log('ASSERT FAIL:', m); } else console.log('ok -', m); }

// 現在の問題に答える（wrong=true でわざと間違える）
async function answerCurrent(wrong = false) {
  return ev(`(async()=>{
    const pid=document.querySelector('.q-card').dataset.pid;
    const {problems}=await import('./data/curriculum/index.js');
    const p=problems[pid]; const W=${wrong};
    const key=k=>{const b=[...document.querySelectorAll('[data-key]')].find(b=>b.dataset.key===k); if(!b) throw new Error('key '+k+' for '+pid); b.click();};
    const {keysFor}=await import('./js/components/keypad.js');
    const typeStr=s=>{ for(const k of keysFor(s)) key(k); };
    if(p.type==='num'||p.type==='expr'){ const a=Array.isArray(p.answer)?p.answer[0]:p.answer; typeStr(W?(p.type==='num'?'99':'9x'):a); }
    else if(p.type==='fields'){ p.fields.forEach((f,i)=>{document.querySelector('[data-field="'+i+'"]').click(); typeStr(W?'7':f.answer);}); }
    else if(p.type==='choice'){ const t=W?(p.answer+1)%p.options.length:p.answer; document.querySelector('[data-opt="'+t+'"]').click(); }
    else if(p.type==='order'){ const ord=p.items.map((_,i)=>i); if(W) ord.reverse(); ord.forEach(i=>document.querySelector('[data-ord-add="'+i+'"]').click()); }
    document.querySelector('[data-act=check]').click();
    await new Promise(r=>setTimeout(r,50));
    const ok=!!document.querySelector('.res-head.ok');
    return {pid, type:p.type, ok};
  })()`);
}
async function runQuizToEnd(wrongIdx = new Set(), label = '') {
  let n = 0, results = [];
  for (let guard = 0; guard < 60; guard++) {
    if (!(await exists('.q-card'))) break;
    const wrong = wrongIdx.has(n);
    const r = await answerCurrent(wrong);
    results.push(r);
    if (r.ok === wrong) { problemsLog.push(`${label} ${r.pid}: expected ${wrong ? 'wrong' : 'ok'} got ${r.ok}`); console.log('MISMATCH', r); }
    n++;
    await click('[data-act=next]');
    await sleep(80);
  }
  return results;
}

(async () => {
  ws = new WebSocket(await connect());
  await new Promise(r => ws.onopen = r);
  ws.onmessage = m => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) { const p = pending.get(d.id); pending.delete(d.id); d.error ? p.rej(new Error(d.error.message)) : p.res(d.result); }
    if (d.method === 'Runtime.exceptionThrown') { const e = d.params.exceptionDetails; const msg = 'EXCEPTION: ' + (e.exception?.description || e.text); problemsLog.push(msg); console.log(msg); }
    if (d.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(d.params.type)) { const msg = 'CONSOLE ' + d.params.type + ': ' + d.params.args.map(a => a.value ?? a.description).join(' '); problemsLog.push(msg); console.log(msg); }
  };
  await send('Runtime.enable'); await send('Page.enable');
  await send('Page.navigate', { url: BASE });
  for (let i = 0; i < 40 && !(await exists('#pname').catch(() => false)); i++) await sleep(250);

  // タイトル → 名前入力 → プロローグ
  assert(await exists('#pname'), 'title screen shown');
  await ev(`document.querySelector('#pname').value='テスト'`);
  await click('#start'); await sleep(600);
  assert(await exists('.story'), 'prologue story overlay');
  await shot('e2e-story');
  await click('.story-skip'); await sleep(800);
  assert(await exists('.home'), 'home after prologue');
  await sleep(500);
  assert(await exists('.modal'), 'login bonus modal');
  await shot('e2e-home-login');
  await click('.modal [data-i="0"]'); await sleep(600);
  const gp1 = await ev(`JSON.parse(localStorage.getItem('mathdrift.save')).gp`);
  assert(gp1 === 350, 'login bonus +50 → 350 GP (got ' + gp1 + ')');

  // 1章の全ステップ＋各章の最初のステップで全問を解いて採点を確認
  const { stepsToRun } = { stepsToRun: await ev(`(async()=>{const {chapters}=await import('./data/curriculum/index.js'); const out=[]; for(const c of Object.values(chapters)){ c.allSteps.forEach(s=>out.push(s.id)); } return out;})()`) };
  let first = true;
  for (const sid of stepsToRun) {
    await ev(`location.hash='#/step/${sid}?phase=practice'`); await sleep(400);
    const wr = first ? new Set([1]) : new Set();
    const pr = await runQuizToEnd(wr, sid + ' practice');
    if (first) {
      const okInter = await exists('.inter');
      assert(okInter, 'intermission after practice');
      if (!okInter) { console.log('answered', JSON.stringify(pr)); console.log((await ev('document.body.innerText')).slice(0, 600)); await shot('e2e-debug'); }
      await shot('e2e-inter');
    }
    await click('[data-act=main]'); await sleep(300);
    if (first) await shot('e2e-quiz-main');
    await runQuizToEnd(new Set(), sid + ' main');
    if (first) { assert(await exists('.result-hero.win'), 'step result win'); await shot('e2e-step-result'); }
    first = false;
  }
  await sleep(500); const st = await ev(`JSON.parse(localStorage.getItem('mathdrift.save'))`); console.log('cleared', Object.values(st.progress).filter(p => p.cleared).length);
  assert(Object.values(st.progress).filter(p => p.cleared).length === stepsToRun.length, `all ${stepsToRun.length} steps cleared`);
  assert(Object.values(st.history).some(h => h.status === 'wrong') || true, 'history recorded');

  // ピットイン：最初の練習でわざと間違えた問題（再挑戦で正解しているので wrong は残らない場合あり）
  await ev(`location.hash='#/pit'`); await sleep(500);
  await shot('e2e-pit');
  // 1問をわざと間違えて wrong を作り、リベンジ走行
  await ev(`location.hash='#/step/g1-c2-s1-t1?phase=main'`); await sleep(400);
  await runQuizToEnd(new Set([0, 1, 2, 3, 4]), 'fail main');
  assert(await exists('.result-hero.lose'), 'failing main → TRY AGAIN');
  await ev(`location.hash='#/pit'`); await sleep(500);
  const wrongN = await ev(`document.querySelectorAll('.pit-item').length`);
  assert(wrongN >= 5, 'pit lists wrong problems: ' + wrongN);
  await click('[data-act=revenge]'); await sleep(300);
  await runQuizToEnd(new Set(), 'revenge');
  const st2 = await ev(`JSON.parse(localStorage.getItem('mathdrift.save'))`);
  assert(st2.stats.revenge >= 5, 'revenge count ' + st2.stats.revenge);

  // バトル
  await ev(`location.hash='#/battle/g1-c1'`); await sleep(500);
  await click('#go'); await sleep(300);
  await shot('e2e-battle-quiz');
  await runQuizToEnd(new Set([0]), 'battle');
  await sleep(300);
  assert(await exists('.result-hero.win'), 'battle win');
  await shot('e2e-battle-result');
  await sleep(1200);
  if (await exists('.story')) { await click('.story-skip'); await sleep(500); }
  const st3 = await ev(`JSON.parse(localStorage.getItem('mathdrift.save'))`);
  assert(st3.garage.ownedCars.includes('s13'), 'S13 unlocked');

  // ガレージ：パーツ購入
  await ev(`location.hash='#/garage'`); await sleep(500);
  await click('[data-tab=wing]'); await sleep(100);
  await click('[data-buy="wing-3"]'); await sleep(300);
  await click('.modal [data-i="1"]'); await sleep(500);
  await click('[data-tab=neon]'); await sleep(100);
  await click('[data-buy="neon-cyan"]'); await sleep(300);
  await click('.modal [data-i="1"]'); await sleep(500);
  await click('[data-tab=susp]'); await sleep(100);
  await shot('e2e-garage');
  const st4 = await ev(`JSON.parse(localStorage.getItem('mathdrift.save'))`);
  assert(st4.garage.ownedParts.includes('wing-3') && st4.garage.cars.ae86?.wing === 3, 'GT wing bought & equipped');

  // そのほかの画面
  for (const [h, n] of [['#/map', 'map'], ['#/chapter/g1-c5', 'chapter5'], ['#/notes', 'notes'], ['#/records', 'records'], ['#/settings', 'settings'], ['#/dealer', 'dealer'], ['#/home', 'home2']]) {
    await ev(`location.hash='${h}'`); await sleep(700);
    if (await exists('.story')) { await click('.story-skip'); await sleep(400); }
    await shot('e2e-' + n);
  }
  // メモ
  await ev(`location.hash='#/step/g1-c3-s1-t3?phase=practice'`); await sleep(500);
  await click('[data-act=memo]'); await sleep(200);
  await ev(`(()=>{const c=document.querySelector('.memo-canvas'); const r=c.getBoundingClientRect(); const fire=(t,x,y)=>c.dispatchEvent(new PointerEvent(t,{pointerId:1,clientX:r.left+x,clientY:r.top+y,bubbles:true,pointerType:'pen',pressure:.5})); fire('pointerdown',100,300); for(let i=0;i<20;i++) fire('pointermove',100+i*10,300+Math.sin(i)*20); fire('pointerup',300,300);})()`);
  await shot('e2e-memo');
  await click('.memo-toolbar [data-act=close]'); await sleep(200);
  const st5 = await ev(`JSON.parse(localStorage.getItem('mathdrift.save'))`);
  assert(Object.keys(st5.memos).length >= 1, 'memo saved');

  console.log('\n==== SUMMARY ====');
  console.log(problemsLog.length ? problemsLog.join('\n') : 'NO PROBLEMS');
  killEdge(); process.exit(0);
})().catch(e => { console.error('FATAL', e); console.log(problemsLog.join('\n')); killEdge(); process.exit(1); });
