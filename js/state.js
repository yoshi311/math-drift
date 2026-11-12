// 保存データ管理（localStorage）
const KEY = 'mathdrift.save';
export const SAVE_VERSION = 3;

function defaults() {
  return {
    version: SAVE_VERSION,
    created: Date.now(),
    profile: { name: '', started: false },
    gp: 300,
    xp: 0,
    login: { last: '', streak: 0, total: 0, pending: null },
    daily: { date: '', tasks: [], counts: {}, bonusClaimed: false },
    progress: {},      // stepId: {stars, best, cleared, hintless}
    battles: {},       // chapterId: {cleared, best}
    history: {},       // problemId: {status, tries, wrong, last, box, due}（box/due＝メンテの点検日）
    maint: { last: '', streak: 0, total: 0 },
    attack: null,      // 週替わりスコアアタック {kind, wk, best, runs, passed, allBest}
    memos: {},         // problemId: {strokes:[], text:''}
    seenStory: {},     // sceneId: true
    achievements: {},  // id: timestamp
    stats: { correct: 0, answered: 0, revenge: 0, perfect: 0, customs: 0 },
    garage: {
      current: 'ae86',
      ownedCars: ['ae86'],
      ownedParts: ['color-white', 'color-black', 'color-red', 'wheel-steel', 'wheel-mesh'],
      cars: {}
    },
    settings: { fs: 'm', contrast: 'normal', sound: true, anim: true, timer: false }
  };
}

function merge(base, data) {
  if (!data || typeof data !== 'object') return base;
  for (const k of Object.keys(base)) {
    if (data[k] === undefined) continue;
    if (base[k] && typeof base[k] === 'object' && !Array.isArray(base[k]) && typeof data[k] === 'object' && !Array.isArray(data[k])) {
      base[k] = merge(base[k], data[k]);
    } else {
      base[k] = data[k];
    }
  }
  // 未知キーも保持（progressなど動的キー）
  for (const k of Object.keys(data)) if (base[k] === undefined) base[k] = data[k];
  return base;
}

function migrate(data) {
  // v2：メンテ（間隔をあけた復習）の点検日を、これまでの記録から作る
  if ((data.version || 1) < 2) {
    for (const h of Object.values(data.history || {})) {
      if (h.box != null) continue;
      const last = h.last || dateStr();
      if (h.status === 'wrong') { h.box = 0; h.due = last; }
      else { h.box = 1; h.due = addDays(last, 1); }
    }
  }
  // v3：獲得GPを2倍にし、ランクの必要XPも2倍にした。これまでのXPを2倍にして、ランクが下がらないようにする
  if ((data.version || 1) < 3) data.xp = (data.xp || 0) * 2;
  data.version = SAVE_VERSION;
  return data;
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    const r = JSON.parse(raw); return migrate({ ...merge(defaults(), r), version: r.version || 1 });
  } catch (e) {
    console.warn('load failed', e);
    return defaults();
  }
}

export const state = load();

let saveTimer = null;
export function save(immediate = false) {
  const run = () => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { console.warn('save failed', e); window.dispatchEvent(new CustomEvent('save-error')); }
  };
  clearTimeout(saveTimer);
  if (immediate) run(); else saveTimer = setTimeout(run, 150);
}
window.addEventListener('pagehide', () => save(true));
document.addEventListener('visibilitychange', () => { if (document.hidden) save(true); });

export function exportJSON() {
  return JSON.stringify(state, null, 0);
}
export function importJSON(text) {
  const data = JSON.parse(text);
  if (!data || typeof data !== 'object' || !data.garage) throw new Error('バックアップファイルの形式が違います');
  const fresh = migrate({ ...merge(defaults(), data), version: data.version || 1 });
  for (const k of Object.keys(state)) delete state[k];
  Object.assign(state, fresh);
  save(true);
}
export function resetAll() {
  localStorage.removeItem(KEY);
  const fresh = defaults();
  for (const k of Object.keys(state)) delete state[k];
  Object.assign(state, fresh);
  save(true);
}

export function dateStr(d = new Date()) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}
export function today() { return dateStr(); }
export function addDays(s, n) { const [y, m, d] = s.split('-').map(Number); return dateStr(new Date(y, m - 1, d + n)); }
export function yesterday() { const d = new Date(); d.setDate(d.getDate() - 1); return dateStr(d); }
