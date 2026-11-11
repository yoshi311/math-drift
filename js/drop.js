// 部品箱（ステップクリア・ライバル撃破のごほうび。課金なし）
import { state, save } from './state.js';
import { COLORS, PARTS, PART_LABELS, rarity } from '../data/parts.js';
import { modal, esc, sfx } from './util.js';
import { addGP, checkAchievements } from './gamify.js';

const ODDS = { base: { N: 70, R: 25, SR: 5 }, good: { N: 50, R: 38, SR: 12 }, great: { N: 25, R: 45, SR: 30 } };
const GP_BY = { N: 60, R: 150, SR: 400 }; // その等級を全部持っていたときのGP

export function rollDrop(quality = 'base', rnd = Math.random) {
  const o = ODDS[quality] || ODDS.base;
  let x = rnd() * 100, tier = 'N';
  for (const t of ['SR', 'R', 'N']) { if (x < o[t]) { tier = t; break; } x -= o[t]; }
  const all = [...COLORS.filter(c => c.hex).map(c => ({ ...c, cat: 'color' })), ...Object.entries(PARTS).flatMap(([cat, ps]) => ps.map(p => ({ ...p, cat })))];
  const pool = all.filter(p => !p.free && (p.price > 0 || p.drop) && !state.garage.ownedParts.includes(p.id) && rarity(p) === tier);
  if (!pool.length) return { tier, gp: GP_BY[tier] };
  return { tier, part: pool[Math.floor(rnd() * pool.length)] };
}

export async function openDrop(quality = 'base') {
  const d = rollDrop(quality);
  if (d.part) { state.garage.ownedParts.push(d.part.id); state.stats.drops = (state.stats.drops || 0) + 1; save(); checkAchievements(); }
  const anim = state.settings.anim;
  const what = d.part
    ? `<div class="drop-cat muted">${esc(PART_LABELS[d.part.cat] || '')}</div><div class="drop-name">${d.part.hex ? `<span class="sw" style="background:${d.part.hex}"></span>` : ''}${esc(d.part.name)}</div><div class="muted small">ガレージで装着できるよ</div>`
    : `<div class="drop-name en">+${d.gp} GP</div><div class="muted small">この等級のパーツはコンプリート済み！</div>`;
  setTimeout(() => d.tier === 'SR' ? sfx.fanfare() : sfx.coin(), anim ? 900 : 0);
  await modal({
    title: '<span class="en">PARTS BOX</span>　部品箱',
    body: `<div class="drop ${anim ? 'anim' : ''} t-${d.tier}"><div class="drop-box">📦</div>
      <div class="drop-reveal"><div class="en drop-tier">${d.tier}</div>${what}</div></div>`,
    buttons: [{ label: '受け取る', value: true, cls: 'btn-yellow btn-lg' }], dismiss: false,
  });
  if (d.gp) addGP(d.gp, '部品箱');
  return d;
}
