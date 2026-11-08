// ストーリー再生（オーバーレイ）
import { SCENES, CHARS } from '../../data/story/g1.js';
import { state, save } from '../state.js';
import { esc, sfx } from '../util.js';
import { sceneBg, portrait } from '../ui.js';

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
      <div class="story-title en">${esc(sc.title)}</div>
      <button class="btn btn-sm story-skip">スキップ ≫</button>
      <div class="story-chara"></div>
      <div class="story-box"><div class="story-name"></div><div class="story-text"></div><div class="story-next">▼</div></div>`;
    document.body.appendChild(el);
    let i = -1, typing = null, full = '';
    const chara = el.querySelector('.story-chara'), nameEl = el.querySelector('.story-name'), textEl = el.querySelector('.story-text');
    function show() {
      i++;
      if (i >= sc.lines.length) return done();
      const [who, text] = sc.lines[i];
      const c = CHARS[who] || CHARS.nar;
      full = sub(text);
      const nmTxt = sub(c.name);
      nameEl.innerHTML = nmTxt ? `<span style="color:${c.color}">${nmTxt}</span>${c.role ? `<small>${esc(c.role)}</small>` : ''}` : '';
      nameEl.classList.toggle('hidden', !nmTxt);
      el.querySelector('.story-box').style.borderColor = c.color;
      if (who === 'nar') chara.innerHTML = '';
      else chara.innerHTML = `<div class="chara-in" style="--c:${c.color}">${portrait(c.color, (nmTxt || '?').slice(0, 1))}</div>`;
      textEl.classList.toggle('narration', who === 'nar');
      let n = 0;
      clearInterval(typing);
      const instant = !state.settings.anim;
      if (instant) { textEl.innerHTML = full; typing = null; return; }
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
