// ガレージ（カスタム）とカーディーラー
import { state, save } from '../state.js';
import { esc, confirmBox, toast, sfx, fmtNum, modal } from '../util.js';
import { topbar } from '../ui.js';
import { carSVG, getConfig } from '../components/car-render.js';
import { CARS, carById } from '../../data/cars.js';
import { COLORS, PARTS, PART_LABELS, PART_BONUS } from '../../data/parts.js';
import { spendGP, checkAchievements } from '../gamify.js';
import { chapters } from '../../data/curriculum/index.js';

const TABS = ['color', 'tone', 'wheel', 'wcolor', 'inch', 'susp', 'lip', 'skirt', 'wing', 'bonnet', 'livery', 'tint', 'neon'];
let tab = 'color';

function owned(id) {
  const p = [...COLORS, ...Object.values(PARTS).flat()].find(x => x.id === id);
  return state.garage.ownedParts.includes(id) || (p && (p.free || p.price === 0));
}

function carStats(car, cfg) {
  const base = { power: Math.min(100, Math.round(car.ps / 4.2)), grip: car.drive === '4WD' ? 62 : car.drive === 'MR' ? 60 : 52, aero: 30 };
  const ids = [`lip-${cfg.lip}`, `skirt-${cfg.skirt}`, `wing-${cfg.wing}`, cfg.bonnet ? 'bonnet-1' : '', cfg.susp || '', `inch-${cfg.inch}`];
  ids.forEach(id => { const b = PART_BONUS[id]; if (b) for (const k in b) base[k] += b[k]; });
  base.grip += Math.max(0, -cfg.height);
  for (const k in base) base[k] = Math.min(100, base[k]);
  return base;
}

export function garageScreen(app) {
  const render = () => {
    const carId = state.garage.current;
    const car = carById(carId);
    const cfg = getConfig(state, carId);
    const stt = carStats(car, cfg);
    app.innerHTML = `${topbar('🚗 ガレージ', { right: '<a class="btn btn-sm btn-yellow" href="#/dealer">カーディーラー</a>' })}
    <div class="page garage">
      <section class="garage-view panel neon">
        <div class="gv-car">${carSVG(carId, cfg)}</div>
        <div class="gv-info">
          <div><span class="chip c">${car.maker}</span> <span class="chip">${car.tag}</span> <span class="chip">${car.drive}</span></div>
          <h2>${esc(car.name)}</h2>
          <div class="muted small">${car.year}年　${car.ps}ps　${car.kg}kg　— ${esc(car.desc)}</div>
          <div class="statbars">${[['POWER', stt.power, 'var(--red)'], ['GRIP', stt.grip, 'var(--cyan)'], ['AERO', stt.aero, 'var(--yellow)']].map(([l, v, c]) => `<div class="sb"><span class="en">${l}</span><div class="sbar"><div style="width:${v}%;background:${c}"></div></div><b class="en">${v}</b></div>`).join('')}</div>
        </div>
      </section>
      <section class="car-strip">${state.garage.ownedCars.map(id => `<button class="cs-item ${id === carId ? 'on' : ''}" data-car="${id}">${carSVG(id, getConfig(state, id))}<small>${esc(carById(id).name.split(' ').slice(-1)[0])}</small></button>`).join('')}
        <a class="cs-item cs-add" href="#/dealer"><span>＋</span><small>車を増やす</small></a></section>
      <section class="panel">
        <div class="tabs">${TABS.map(t => `<button class="tab ${t === tab ? 'on' : ''}" data-tab="${t}">${PART_LABELS[t]}</button>`).join('')}</div>
        <div class="part-area">${partArea(cfg)}</div>
      </section>
    </div>`;
  };

  function partArea(cfg) {
    if (tab === 'color' || tab === 'tone') {
      const key = tab === 'color' ? 'color' : 'color2';
      let head = '';
      if (tab === 'tone') {
        const ownTone = owned('tone-on');
        head = `<div class="row wrap" style="margin-bottom:12px">${ownTone ? `<button class="btn ${cfg.tone ? 'btn-primary' : ''}" data-set="tone" data-v="1">ツートン ON</button><button class="btn ${!cfg.tone ? 'btn-primary' : ''}" data-set="tone" data-v="0">OFF</button>`
          : `<button class="btn btn-yellow" data-buy="tone-on">ツートンを解放（400GP）</button>`}<span class="muted small">下半分の色を選べる（パンダ仕様など）</span></div>`;
        if (!ownTone) return head;
      }
      return head + `<div class="swatches">${COLORS.filter(c => c.hex).map(c => {
        const own = owned(c.id), on = cfg[key] === c.hex;
        return `<button class="swatch ${on ? 'on' : ''} ${own ? '' : 'locked'}" ${own ? `data-set="${key}" data-v="${c.hex}"` : `data-buy="${c.id}"`}>
          <span class="sw" style="background:${c.hex}"></span><small>${esc(c.name)}</small>${own ? '' : `<em>${c.price}GP</em>`}</button>`;
      }).join('')}</div>
      <div class="row wrap" style="margin-top:12px">${owned('color-custom') ? `<label class="btn">🎨 自由に調色 <input type="color" data-color="${key}" value="${cfg[key]}"></label>` : `<button class="btn btn-yellow" data-buy="color-custom">🎨 カスタムカラーを解放（1500GP）</button>`}</div>`;
    }
    if (tab === 'susp') {
      const cur = PARTS.susp.find(p => p.id === (cfg.susp || 'susp-stock')) || PARTS.susp[0];
      const [mn, mx] = cur.v;
      return optGrid('susp', cfg.susp || 'susp-stock', 'id') + `<div class="height-ctl">
        <div class="muted">車高　<b class="en hc">${cfg.height > 0 ? '+' : ''}${cfg.height}</b>　（${mn}〜${mx}）</div>
        <input type="range" min="${mn}" max="${mx}" step="1" value="${Math.max(mn, Math.min(mx, cfg.height))}" data-range="height" ${mn === mx ? 'disabled' : ''}>
        <div class="muted small">車高を下げると重心が下がり、コーナーでの安定性（GRIP）が上がる！</div></div>`;
    }
    if (tab === 'livery') {
      return optGrid('livery', cfg.livery) + (cfg.livery === 'number' ? `<div class="row" style="margin-top:12px"><span class="muted">ゼッケン番号</span>
        <button class="btn btn-sm" data-num="-1">−</button><b class="en" style="font-size:1.4em;min-width:2.5em;text-align:center">${cfg.number}</b><button class="btn btn-sm" data-num="1">＋</button></div>` : '');
    }
    const key = tab;
    return optGrid(key, cfg[key]);
  }

  function optGrid(cat, curVal, by = 'v') {
    return `<div class="opt-grid">${PARTS[cat].map(p => {
      const own = owned(p.id);
      const on = by === 'id' ? curVal === p.id : JSON.stringify(curVal) === JSON.stringify(p.v);
      return `<button class="opt ${on ? 'on' : ''} ${own ? '' : 'locked'}" ${own ? `data-equip="${cat}" data-id="${p.id}"` : `data-buy="${p.id}"`}>
        <b>${esc(p.name)}</b><small>${on ? '装着中' : own ? '所持' : `🔒 ${p.price} GP`}</small></button>`;
    }).join('')}</div>`;
  }

  function setCfg(k, v) {
    const id = state.garage.current;
    state.garage.cars[id] = { ...(state.garage.cars[id] || {}), [k]: v };
    save(); render();
  }

  async function buy(pid) {
    const p = [...COLORS, ...Object.values(PARTS).flat()].find(x => x.id === pid);
    if (!p) return;
    if (state.gp < p.price) { toast(`GPが足りない！（あと ${fmtNum(p.price - state.gp)} GP）　問題を解いてGPを稼ごう`); sfx.ng(); return; }
    const ok = await confirmBox('パーツを購入', `<b>${esc(p.name)}</b> を <b class="hl">${p.price} GP</b> で購入しますか？<br><span class="muted small">所持GP：${fmtNum(state.gp)}　購入したパーツはどの車にも使えます</span>`, '購入する');
    if (!ok) return;
    if (!spendGP(p.price)) return;
    state.garage.ownedParts.push(pid); state.stats.customs++;
    save(); sfx.coin(); toast(`${esc(p.name)} を手に入れた！`);
    checkAchievements();
    // 購入後すぐ装着
    if (pid.startsWith('color-') && p.hex) setCfg(tab === 'tone' ? 'color2' : 'color', p.hex);
    else if (pid === 'tone-on') setCfg('tone', true);
    else if (pid === 'color-custom') render();
    else equip(pid);
  }

  function equip(pid) {
    for (const cat of Object.keys(PARTS)) {
      const p = PARTS[cat].find(x => x.id === pid);
      if (!p) continue;
      sfx.tap();
      if (cat === 'susp') {
        const id = state.garage.current; const c = getConfig(state, id);
        const h = Math.max(p.v[0], Math.min(p.v[1], c.height));
        state.garage.cars[id] = { ...(state.garage.cars[id] || {}), susp: pid, height: h };
        save(); render(); return;
      }
      setCfg(cat, p.v); return;
    }
  }

  app.addEventListener('click', onClick);
  app.addEventListener('input', onInput);
  function onClick(e) {
    const t = e.target;
    const c = t.closest('[data-car]'); if (c) { state.garage.current = c.dataset.car; save(); sfx.rev(); render(); return; }
    const tb = t.closest('[data-tab]'); if (tb) { tab = tb.dataset.tab; render(); return; }
    const b = t.closest('[data-buy]'); if (b) { buy(b.dataset.buy); return; }
    const eq = t.closest('[data-equip]'); if (eq) { equip(eq.dataset.id); return; }
    const st = t.closest('[data-set]'); if (st) { const k = st.dataset.set; let v = st.dataset.v; if (k === 'tone') v = v === '1'; setCfg(k, v); sfx.tap(); return; }
    const n = t.closest('[data-num]'); if (n) { const cfg = getConfig(state, state.garage.current); setCfg('number', Math.max(0, Math.min(99, (cfg.number || 0) + +n.dataset.num))); }
  }
  let rangeTimer = null;
  function onInput(e) {
    const t = e.target;
    if (t.dataset.range === 'height') {
      const id = state.garage.current;
      state.garage.cars[id] = { ...(state.garage.cars[id] || {}), height: +t.value };
      save();
      const cfg = getConfig(state, id);
      app.querySelector('.gv-car').innerHTML = carSVG(id, cfg);
      app.querySelector('.height-ctl .hc').textContent = (cfg.height > 0 ? '+' : '') + cfg.height;
    }
    if (t.dataset.color) {
      const id = state.garage.current;
      state.garage.cars[id] = { ...(state.garage.cars[id] || {}), [t.dataset.color]: t.value };
      save();
      app.querySelector('.gv-car').innerHTML = carSVG(id, getConfig(state, id));
      clearTimeout(rangeTimer); rangeTimer = setTimeout(render, 600);
    }
  }
  render();
  return () => { app.removeEventListener('click', onClick); app.removeEventListener('input', onInput); };
}

export function dealerScreen(app) {
  const render = () => {
    app.innerHTML = `${topbar('🏁 カーディーラー', { back: '#/garage' })}
    <div class="page dealer">
      <p class="muted">GPで車を購入できる。ストーリーのライバルに勝つと、その車が手に入る！</p>
      <div class="dealer-grid">${CARS.map(c => {
        const own = state.garage.ownedCars.includes(c.id);
        let foot;
        if (own) foot = `<button class="btn btn-sm" data-ride="${c.id}">${state.garage.current === c.id ? '乗車中' : 'この車に乗る'}</button>`;
        else if (c.price) foot = `<button class="btn btn-sm btn-yellow" data-buycar="${c.id}">${fmtNum(c.price)} GP で購入</button>`;
        else if (c.unlock && chapters[c.unlock]) foot = `<span class="chip r">🔒 STAGE ${chapters[c.unlock].no} のライバルに勝つ</span>`;
        else foot = '';
        return `<div class="dealer-card ${own ? 'own' : ''}">${carSVG(c.id, own ? getConfig(state, c.id) : {})}
          <div class="dc-name"><span class="chip c">${c.maker}</span> <span class="chip">${c.tag}</span><br><b>${esc(c.name)}</b></div>
          <div class="muted small">${c.year}年 / ${c.drive} / ${c.ps}ps / ${c.kg}kg</div>
          <div class="small">${esc(c.desc)}</div><div class="dc-foot">${foot}</div></div>`;
      }).join('')}</div>
    </div>`;
  };
  const onClick = async e => {
    const r = e.target.closest('[data-ride]');
    if (r) { state.garage.current = r.dataset.ride; save(); sfx.rev(); render(); return; }
    const b = e.target.closest('[data-buycar]');
    if (b) {
      const c = carById(b.dataset.buycar);
      if (state.gp < c.price) { toast(`GPが足りない！（あと ${fmtNum(c.price - state.gp)} GP）`); sfx.ng(); return; }
      const ok = await confirmBox('車を購入', `<div class="center">${carSVG(c.id, {})}</div><b>${esc(c.name)}</b> を <b class="hl">${fmtNum(c.price)} GP</b> で購入しますか？`, '購入する');
      if (!ok || !spendGP(c.price)) return;
      state.garage.ownedCars.push(c.id); state.garage.current = c.id; save();
      sfx.fanfare(); toast(`${esc(c.name)} がガレージに入った！`);
      checkAchievements(); render();
    }
  };
  app.addEventListener('click', onClick);
  render();
  return () => app.removeEventListener('click', onClick);
}
