// カリキュラム（東京書籍準拠）の読み込みとID付与
import c1 from './g1/ch1.js';
import c2 from './g1/ch2.js';
import c3 from './g1/ch3.js';
import c4 from './g1/ch4.js';
import c5 from './g1/ch5.js';
import c6 from './g1/ch6.js';
import c7 from './g1/ch7.js';
import d1 from './g2/ch1.js';
import d2 from './g2/ch2.js';
import d3 from './g2/ch3.js';
import d4 from './g2/ch4.js';
import d5 from './g2/ch5.js';
import d6 from './g2/ch6.js';
import d7 from './g2/ch7.js';

export const GRADES = [
  { id: 'g1', name: '中1', title: '群馬・峠編', sub: 'GUNMA MOUNTAIN STAGE', chapters: [c1, c2, c3, c4, c5, c6, c7] },
  { id: 'g2', name: '中2', title: '箱根・首都高編', sub: 'HAKONE & WANGAN STAGE', chapters: [d1, d2, d3, d4, d5, d6, d7] },
  { id: 'g3', name: '中3', title: '全国決戦編', sub: 'JAPAN FINAL STAGE', chapters: [], soon: true },
];

export const chapters = {}, steps = {}, problems = {};

for (const g of GRADES) {
  g.chapters.forEach((ch, ci) => {
    ch.id = `${g.id}-c${ci + 1}`; ch.grade = g.id; ch.gradeName = g.name; ch.no = ci + 1;
    chapters[ch.id] = ch;
    const allSteps = [];
    ch.sections.forEach((sec, si) => {
      sec.id = `${ch.id}-s${si + 1}`; sec.no = si + 1;
      sec.steps.forEach((st, ti) => {
        st.id = `${sec.id}-t${ti + 1}`; st.no = ti + 1; st.chapter = ch.id; st.section = sec.id; st.sectionTitle = sec.title;
        st.label = `${ch.no}-${si + 1}-${ti + 1}`;
        steps[st.id] = st; allSteps.push(st);
        (st.practice || []).forEach((p, i) => reg(p, `${st.id}-p${i + 1}`, st, ch, 'practice'));
        (st.main || []).forEach((p, i) => reg(p, `${st.id}-m${i + 1}`, st, ch, 'main'));
      });
    });
    ch.allSteps = allSteps;
    (ch.battle || []).forEach((p, i) => reg(p, `${ch.id}-b${i + 1}`, null, ch, 'battle'));
  });
}
function reg(p, id, st, ch, kind) {
  p.id = p.id || id; p.step = st ? st.id : null; p.chapter = ch.id; p.kind = kind;
  if (!p.hint && st && st.hint) p.hint = st.hint;
  problems[p.id] = p;
}

export function stepOrder(chId) { return chapters[chId].allSteps; }
export function nextStep(stepId) {
  const st = steps[stepId]; if (!st) return null;
  const list = chapters[st.chapter].allSteps; const i = list.indexOf(st);
  return list[i + 1] || null;
}
