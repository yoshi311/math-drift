// ストーリー再生（オーバーレイ）
import { SCENES, CHARS } from '../../data/story/index.js';
import { state, save } from '../state.js';
import { esc, sfx } from '../util.js';
import { sceneBg, chara } from '../ui.js';

const TEAM = new Set(['me', 'kaito', 'gen', 'mio', 'jii']);

export function hasScene(id) { return !!SCENES[id]; }

export function playStory(id) {
  return new Promise(resolve => {
    const sc = SCENES[id];
    if (!sc) return resolve();
    const nm = esc(state.profile.name || 'キミ');
    const sub = s => esc(s).replace(/\{name\}/g, nm);
    const el = document.createElement('div');
    el.className = 'story';
    el.innerHTML = `${sceneBg(sc.bg)}
      <div class="story-shade"></div>
      <div class="story-title en"><span>${esc(sc.title)}</span></div>
      <button class="btn btn-sm story-skip">スキップ ≫</button>
      <div class="story-slot left"></div><div class="story-slot right"></div>
      <div class="story-box"><div class="story-name"></div><div class="story-text"></div><div class="story-next">▼</div></div>`;
    document.body.appendChild(el);
    let i = -1, typing = null, full = '';
    const slots = { left: el.querySelector('.story-slot.left'), right: el.querySelector('.story-slot.right') };
    const cur = { left: null, right: null };
    const nameEl = el.querySelector('.story-name'), textEl = el.querySelector('.story-text'), box = el.querySelector('.story-box');
    function setSlot(side, who, expr) {
      const key = who + ':' + expr;
      if (cur[side] !== key) {
        const fresh = !cur[side] || cur[side].split(':')[0] !== who;
        cur[side] = key;
        slots[side].innerHTML = `<div class="story-chara ${fresh ? 'enter' : ''}" style="--c:${CHARS[who].color}">${chara(who, expr)}</div>`;
      }
    }
    function show() {
      i++;
      if (i >= sc.lines.length) return done();
      const [who, text, expr = 'normal'] = sc.lines[i];
      const c = CHARS[who] || CHARS.nar;
      full = sub(text);
      const nmTxt = sub(c.name);
      nameEl.innerHTML = nmTxt ? `<span class="sn-main">${nmTxt}</span>${c.role ? `<small>${esc(c.role)}</small>` : ''}` : '';
      nameEl.style.setProperty('--c', c.color);
      nameEl.classList.toggle('hidden', !nmTxt);
      box.style.setProperty('--c', c.color);
      let active = null;
      if (who !== 'nar' && c.look) {
        active = TEAM.has(who) ? 'left' : 'right';
        setSlot(active, who, expr);
      }
      for (const s of ['left', 'right']) slots[s].classList.toggle('speaking', s === active);
      el.classList.toggle('narr', who === 'nar');
      textEl.classList.toggle('narration', who === 'nar');
      let n = 0;
      clearInterval(typing);
      if (!state.settings.anim) { textEl.innerHTML = full; typing = null; return; }
      textEl.innerHTML = '';
      typing = setInterval(() => {
        n += 2; textEl.innerHTML = full.slice(0, n);
        if (n >= full.length) { clearInterval(typing); typing = null; }
      }, 28);
    }
    function done() {
      clearInterval(typing);
      state.seenStory[id] = true; save();
      el.classList.add('out');
      setTimeout(() => { el.remove(); resolve(); }, 300);
    }
    el.addEventListener('click', e => {
      if (e.target.closest('.story-skip')) { done(); return; }
      sfx.tap();
      if (typing) { clearInterval(typing); typing = null; textEl.innerHTML = full; return; }
      show();
    });
    show();
  });
}
