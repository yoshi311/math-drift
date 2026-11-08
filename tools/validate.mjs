// 問題データの検証：node tools/validate.mjs
globalThis.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
globalThis.window = { addEventListener() {}, dispatchEvent() {} };
globalThis.document = { addEventListener() {} };
globalThis.CustomEvent = class { constructor(n) { this.type = n; } };

const { GRADES, problems, steps } = await import('../data/curriculum/index.js');
const { gradeValue } = await import('../js/mathfmt.js');

let errors = 0, warns = 0;
const err = (p, m) => { errors++; console.log('ERROR', p, m); };
const warn = (p, m) => { warns++; console.log('WARN ', p, m); };

const ids = new Set();
for (const p of Object.values(problems)) {
  if (ids.has(p.id)) err(p.id, 'duplicate id'); ids.add(p.id);
  if (!p.q) err(p.id, 'no question');
  if (!p.explain || !p.explain.length || !p.explain[0]) err(p.id, 'no explanation');
  const first = a => Array.isArray(a) ? a : [a];
  if (p.type === 'num' || p.type === 'expr') {
    for (const a of first(p.answer)) {
      const inp = String(a).replace(/<=/g, '≦').replace(/>=/g, '≧');
      const r = gradeValue(inp, p.answer, p.type, p);
      if (!r.ok) err(p.id, `answer "${a}" does not grade itself: ${r.msg || ''}`);
    }
    if (p.type === 'num' && /[a-zπ]/.test(String(first(p.answer)[0]))) err(p.id, 'num type with letters');
  } else if (p.type === 'fields') {
    p.fields.forEach(f => { const r = gradeValue(String(f.answer), f.answer, f.kind, p); if (!r.ok) err(p.id, `field ${f.pre} self-grade fail`); });
  } else if (p.type === 'choice') {
    if (!(p.answer >= 0 && p.answer < p.options.length)) err(p.id, 'choice answer out of range');
    if (new Set(p.options).size !== p.options.length) err(p.id, 'duplicate options');
  } else if (p.type === 'order') {
    if (p.items.length < 2) err(p.id, 'order needs 2+ items');
  } else err(p.id, 'unknown type ' + p.type);
  // 波かっこの対応
  const txt = [p.q, ...(p.explain || []), ...(p.options || [])].join(' ');
  if ((txt.match(/\{/g) || []).length !== (txt.match(/\}/g) || []).length) warn(p.id, 'unbalanced braces');
}

let total = 0;
for (const g of GRADES) {
  for (const ch of g.chapters) {
    let n = 0;
    for (const st of ch.allSteps) {
      const c = (st.practice || []).length + (st.main || []).length;
      n += c;
      if (!st.brief || !st.brief.length) err(st.id, 'no brief');
      if ((st.main || []).length < 4) warn(st.id, `main only ${st.main.length}`);
    }
    n += ch.battle.length;
    total += n;
    console.log(`${ch.id} ${ch.title}: ${ch.allSteps.length} steps, ${n} problems (battle ${ch.battle.length})`);
  }
}
console.log(`TOTAL ${total} problems, ${Object.keys(steps).length} steps / errors ${errors}, warnings ${warns}`);
process.exit(errors ? 1 : 0);
