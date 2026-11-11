// 開発用：章ごとに問題・答え・解説を一覧で書き出す（必然性の点検用）
// node tools/dump-problems.mjs g1-c2 > out.txt
import { chapters, problems } from '../data/curriculum/index.js';
const id = process.argv[2];
const strip = s => String(s).replace(/<[^>]+>/g, '');
for (const p of Object.values(problems)) {
  if (id && p.chapter !== id) continue;
  const ans = p.type === 'choice' ? p.options[p.answer] : p.type === 'fields' ? p.fields.map(f => f.answer).join(', ') : p.type === 'order' ? p.items.join(' < ') : p.answer;
  console.log(`[${p.id}] ${strip(p.q)}\n    答: ${strip(ans)}${p.unit ? ' ' + p.unit : ''}`);
}
