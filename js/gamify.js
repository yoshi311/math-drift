// ゲーミフィケーション：GP / XP / ランク / ログボ / 今日の課題 / 実績
import { state, save, today, yesterday } from './state.js';
import { toast, sfx, seeded, shuffle } from './util.js';

export const RANKS = [
  { name: 'ROOKIE', xp: 0 }, { name: 'C', xp: 200 }, { name: 'B', xp: 800 }, { name: 'A', xp: 2000 },
  { name: 'S', xp: 4500 }, { name: 'SS', xp: 8000 }, { name: 'LEGEND', xp: 13000 },
];
export function rankInfo(xp = state.xp) {
  let i = 0; while (i + 1 < RANKS.length && xp >= RANKS[i + 1].xp) i++;
  const cur = RANKS[i], nxt = RANKS[i + 1];
  return { name: cur.name, idx: i, next: nxt ? nxt.name : null, pct: nxt ? (xp - cur.xp) / (nxt.xp - cur.xp) : 1, toNext: nxt ? nxt.xp - xp : 0 };
}

export function addGP(n, reason = '', silent = false) {
  if (!n) return;
  state.gp += n;
  if (n > 0) { state.xp += n; }
  save();
  if (!silent && n > 0) { toast(`<span class="en">+${n} GP</span>${reason ? '　' + reason : ''}`, 'gp'); sfx.coin(); }
  window.dispatchEvent(new CustomEvent('gp-change'));
  checkAchievements();
}
export function spendGP(n) {
  if (state.gp < n) return false;
  state.gp -= n; save();
  window.dispatchEvent(new CustomEvent('gp-change'));
  return true;
}

// ===== ログインボーナス =====
export const LOGIN_REWARDS = [50, 60, 70, 80, 100, 120, 300];
export function checkLogin() {
  const t = today();
  if (state.login.last === t) return null;
  const streak = state.login.last === yesterday() ? state.login.streak + 1 : 1;
  state.login.last = t; state.login.streak = streak; state.login.total = (state.login.total || 0) + 1;
  const day = ((streak - 1) % 7) + 1;
  const gp = LOGIN_REWARDS[day - 1] + Math.min(100, Math.floor((streak - 1) / 7) * 20);
  state.login.pending = { day, gp, streak };
  save();
  return state.login.pending;
}
export function claimLogin() {
  const p = state.login.pending; if (!p) return;
  state.login.pending = null;
  addGP(p.gp, 'ログインボーナス');
}

// ===== 今日の課題 =====
const TASK_POOL = [
  { id: 'correct10', label: '問題に10問正解する', ev: 'correct', n: 10, gp: 60, base: true },
  { id: 'answer15', label: '15問にチャレンジする', ev: 'answer', n: 15, gp: 60, base: true },
  { id: 'correct20', label: '問題に20問正解する', ev: 'correct', n: 20, gp: 100 },
  { id: 'step1', label: 'ステップを1つクリアする', ev: 'stepClear', n: 1, gp: 80 },
  { id: 'step2', label: 'ステップを2つクリアする', ev: 'stepClear', n: 2, gp: 120 },
  { id: 'revenge2', label: 'ピットインで2問解き直して正解', ev: 'revenge', n: 2, gp: 90, needWrong: true },
  { id: 'perfect1', label: '本番走行をノーミスでクリア', ev: 'perfect', n: 1, gp: 100 },
  { id: 'memo1', label: 'メモに書きこんで1問解く', ev: 'memo', n: 1, gp: 40 },
  { id: 'brief2', label: 'ブリーフィング（解説）を2つ読む', ev: 'brief', n: 2, gp: 40 },
  { id: 'battle1', label: 'ライバルバトルに挑戦する', ev: 'battle', n: 1, gp: 100 },
  { id: 'replay1', label: 'クリア済みステップを再走する', ev: 'replay', n: 1, gp: 60 },
];
export const DAILY_BONUS = 150;

export function ensureDaily() {
  const t = today();
  if (state.daily.date === t && state.daily.tasks.length) return state.daily;
  const rnd = seeded('daily' + t + (state.created || ''));
  const hasWrong = Object.values(state.history).some(h => h.status === 'wrong');
  const base = shuffle(TASK_POOL.filter(x => x.base), rnd)[0];
  const others = shuffle(TASK_POOL.filter(x => !x.base && (!x.needWrong || hasWrong) && (x.ev !== 'replay' || Object.keys(state.progress).length)), rnd).slice(0, 2);
  state.daily = { date: t, tasks: [base, ...others].map(x => ({ id: x.id, label: x.label, ev: x.ev, n: x.n, gp: x.gp, done: false })), counts: {}, bonusClaimed: false };
  save();
  return state.daily;
}

export function track(ev, n = 1) {
  ensureDaily();
  const d = state.daily;
  d.counts[ev] = (d.counts[ev] || 0) + n;
  for (const t of d.tasks) {
    if (!t.done && t.ev === ev && d.counts[ev] >= t.n) {
      t.done = true;
      setTimeout(() => { toast(`✔ 今日の課題クリア！「${t.label}」`); addGP(t.gp, '課題ボーナス'); }, 400);
    }
  }
  if (!d.bonusClaimed && d.tasks.every(t => t.done)) {
    d.bonusClaimed = true;
    setTimeout(() => { toast('🏁 今日の課題 オールクリア！'); addGP(DAILY_BONUS, 'コンプリートボーナス'); sfx.fanfare(); }, 1400);
  }
  save();
}

// ===== 回答記録 =====
const GP_TABLE = { practice: 5, main: 10, battle: 15, review: 5 };
export function recordAnswer(pid, ok, mode, { memo = false } = {}) {
  const h = state.history[pid] || { status: 'new', tries: 0, wrong: 0, last: '' };
  const prev = h.status;
  h.tries++; h.last = today();
  let revenge = false;
  if (ok) {
    if (prev === 'wrong') { h.status = 'revenge'; revenge = true; }
    else if (prev === 'new') h.status = 'correct';
  } else { h.status = 'wrong'; h.wrong++; }
  state.history[pid] = h;
  state.stats.answered++;
  track('answer');
  if (memo) track('memo');
  let gp = 0;
  if (ok) {
    state.stats.correct++;
    track('correct');
    gp = GP_TABLE[mode] || 5;
    if (revenge) { gp += 10; state.stats.revenge++; track('revenge'); }
    addGP(gp, '', true);
  }
  save();
  checkAchievements();
  return { gp, revenge };
}

// ===== 実績 =====
export const ACHIEVEMENTS = [
  { id: 'first', name: 'エンジン始動', desc: 'はじめて正解する', test: s => s.stats.correct >= 1 },
  { id: 'c100', name: '100km走破', desc: '100問正解', test: s => s.stats.correct >= 100 },
  { id: 'c300', name: 'ロングドライブ', desc: '300問正解', test: s => s.stats.correct >= 300 },
  { id: 'c600', name: '日本一周', desc: '600問正解', test: s => s.stats.correct >= 600 },
  { id: 'st3', name: '3日連続ログイン', desc: '3日続けて走る', test: s => s.login.streak >= 3 },
  { id: 'st7', name: '1週間皆勤', desc: '7日続けて走る', test: s => s.login.streak >= 7 },
  { id: 'st30', name: '鉄人', desc: '30日続けて走る', test: s => s.login.streak >= 30 },
  { id: 'step10', name: 'セクター10', desc: 'ステップを10個クリア', test: s => Object.values(s.progress).filter(p => p.cleared).length >= 10 },
  { id: 'step30', name: 'セクター30', desc: 'ステップを30個クリア', test: s => Object.values(s.progress).filter(p => p.cleared).length >= 30 },
  { id: 'battle1', name: '初勝利', desc: 'ライバルバトルに勝つ', test: s => Object.values(s.battles).some(b => b.cleared) },
  { id: 'battle7', name: '群馬制覇', desc: '中1のライバル全員に勝つ', test: s => Object.keys(s.battles).filter(k => k.startsWith('g1') && s.battles[k].cleared).length >= 7 },
  { id: 'battle14', name: '箱根・湾岸制覇', desc: '中2のライバル全員に勝つ', test: s => Object.keys(s.battles).filter(k => k.startsWith('g2') && s.battles[k].cleared).length >= 7 },
  { id: 'g2first', name: '箱根デビュー', desc: '中2のステップを初めてクリア', test: s => Object.keys(s.progress).some(k => k.startsWith('g2') && s.progress[k].cleared) },
  { id: 'perf10', name: 'パーフェクトライン', desc: 'ノーミスクリア10回', test: s => s.stats.perfect >= 10 },
  { id: 'rev10', name: 'リベンジャー', desc: '間違えた問題を10問解き直す', test: s => s.stats.revenge >= 10 },
  { id: 'rev50', name: '不屈の走り屋', desc: '間違えた問題を50問解き直す', test: s => s.stats.revenge >= 50 },
  { id: 'cust1', name: 'はじめてのカスタム', desc: 'パーツを買う', test: s => s.stats.customs >= 1 },
  { id: 'cars5', name: 'コレクター', desc: '車を5台持つ', test: s => s.garage.ownedCars.length >= 5 },
  { id: 'rankA', name: 'Aランク到達', desc: 'ドライバーランクA', test: s => s.xp >= 2000 },
  { id: 'legend', name: 'LEGEND', desc: '伝説のランクへ', test: s => s.xp >= 13000 },
];
export function checkAchievements() {
  for (const a of ACHIEVEMENTS) {
    if (!state.achievements[a.id] && a.test(state)) {
      state.achievements[a.id] = Date.now();
      save();
      setTimeout(() => toast(`🏆 実績解除：<b>${a.name}</b>`, 'ach'), 900);
    }
  }
}
