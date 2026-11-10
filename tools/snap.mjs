// 開発用：ページを開いて条件を待ってからスクリーンショット（WebGL対応）
// node tools/snap.mjs <path> <name> [W] [H] [待つ条件のJS式] [最大待ち秒]
import { spawn, execSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [path = 'index.html', name = 'snap', W = 1180, H = 820, cond = 'true', maxSec = 60] = process.argv.slice(2);
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const OUT = join(tmpdir(), 'md'); mkdirSync(OUT, { recursive: true });
const prof = process.env.PROF || join(tmpdir(), 'md', 'snapprof');
const PORT = 9300 + Math.floor(Math.random() * 600);
const edge = spawn(EDGE, ['--headless', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-first-run', `--user-data-dir=${prof}`, `--remote-debugging-port=${PORT}`, `--window-size=${W},${H}`, 'about:blank']);
const kill = () => { try { execSync(`taskkill /F /T /PID ${edge.pid}`, { stdio: 'ignore' }); } catch {} };
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ws, seq = 0; const pending = new Map();
const send = (method, params = {}) => { const id = ++seq; ws.send(JSON.stringify({ id, method, params })); return new Promise(res => pending.set(id, res)); };
const ev = async e => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value;
(async () => {
  let url;
  for (let i = 0; i < 40 && !url; i++) { try { const l = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); url = l.find(t => t.type === 'page')?.webSocketDebuggerUrl; } catch {} await sleep(250); }
  ws = new WebSocket(url); await new Promise(r => ws.onopen = r);
  ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); }
    if (d.method === 'Runtime.consoleAPICalled' && ['error', 'warning', 'log'].includes(d.params.type)) console.log('CONSOLE', d.params.type, d.params.args.map(a => a.value ?? a.description).join(' ').slice(0, 300));
    if (d.method === 'Runtime.exceptionThrown') console.log('EXCEPTION', (d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text).slice(0, 400)); };
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: +W, height: +H, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: 'http://localhost:8765/' + path });
  // SETUP=JS式：最初に実行してから開き直す（セーブデータの用意など）
  if (process.env.SETUP) { await sleep(1500); await ev(process.env.SETUP); await send('Page.reload', { ignoreCache: true }); }
  const t0 = Date.now();
  while (Date.now() - t0 < maxSec * 1000) { await sleep(500); try { if (await ev(cond)) break; } catch {} }
  await sleep(800);
  // DUMP=JS式（dataURLを返す）：その画像をそのまま保存（3D描画の生画像など）
  if (process.env.DUMP) { const u = await ev(process.env.DUMP); if (u) writeFileSync(join(OUT, name + '.dump.png'), Buffer.from(u.split(',')[1], 'base64')); }
  const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  writeFileSync(join(OUT, name + '.png'), Buffer.from(r.result.data, 'base64'));
  console.log('OK', join(OUT, name + '.png'), Math.round((Date.now() - t0) / 1000) + 's');
  kill(); process.exit(0);
})().catch(e => { console.log('ERR', e.message); kill(); process.exit(1); });
