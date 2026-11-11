// メンテ（間隔をあけた復習）：点検日が来た問題と、車のコンディション
import { state, today, yesterday, save } from './state.js';
import { problems } from '../data/curriculum/index.js';

export const MAINT_MAX = 10;
export function dueList() {
  const t = today();
  return Object.entries(state.history)
    .filter(([pid, h]) => problems[pid] && h.due && h.due <= t)
    .sort(([, a], [, b]) => ((b.status === 'wrong') - (a.status === 'wrong')) || a.due.localeCompare(b.due))
    .map(([pid]) => problems[pid]);
}
export function condition(n = dueList().length) {
  const pct = n === 0 ? 100 : Math.max(5, Math.round(100 - n * 6));
  const [label, cls] = pct >= 85 ? ['絶好調', 'g'] : pct >= 50 ? ['オイル交換の時期', 'y'] : ['要整備！', 'r'];
  return { n, pct, label, cls };
}
export function doneToday() { return state.maint.last === today(); }
// 今日のメンテ完了：連続日数を更新して、ボーナスGPを返す
export function completeMaint() {
  const t = today();
  if (state.maint.last === t) return 0;
  state.maint.streak = state.maint.last === yesterday() ? state.maint.streak + 1 : 1;
  state.maint.last = t; state.maint.total = (state.maint.total || 0) + 1;
  save();
  return 50 + Math.min(50, (state.maint.streak - 1) * 10);
}
