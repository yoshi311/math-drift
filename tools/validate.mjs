// 問題データの検証：node tools/validate.mjs
globalThis.localStorage = { getItem() { return null; }, setItem() {}, removeItem() {} };
globalThis.window = { addEventListener() {}, dispatchEvent() {} };
globalThis.document = { addEventListener() {} };
globalThis.CustomEvent = class { constructor(n) { this.type = n; } };

const { GRADES, problems, steps } = await import('../data/curriculum/index.js');
const { gradeValue } = await import('../js/mathfmt.js');

let errors = 0, warns = 0;
const VAGUE = /補正値|候補の数|ゼッケン候補|の計算をしよう|を計算する。.*を計算しよう|評価点/;
const CAR = /車|カー|レース|タイヤ|エンジン|ホイール|ガレージ|サーキット|峠|コース|ラップ|タイム|周|ドリフト|チューン|チューニング|パーツ|ウイング|エアロ|燃料|ガソリン|燃費|ギア|スプロケット|マフラー|ブレーキ|ピット|パドック|ドライバー|スピード|速さ|速度|時速|走|バトル|ライバル|ハンドル|ボディ|塗装|ステッカー|ターボ|馬力|排気|気筒|タンク|メカ|整備|ミオ|カイト|ゲン|源一郎|チーム|ゴール|スタート|コーナー|カーブ|オイル|ゼッケン|ピストン|ボルト|ナット|ステアリング|シフト|ブースト|ボンネット|ストレート|空力|クルー|バルブ|プラグ|セッティング|ECU|セクター|サスペンション|バネ|重量配分|GP|ロールケージ|ジャッキ|工具|テレメトリー|メーター|トランク|パイロン|ノーズコーン|ボールジョイント|予算|ワイパー|ヒューズ|スタンド|観客|ターンパイク|首都高|湾岸|箱根|PA|グリッド|R32|AE86|EK9|S13|携行缶|給油|赤城|碓氷|榛名|ハチロク|シルビア|シビック|GT-R|部品|カーボン/;
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
  // すべての問題文に車の話題が入っているか
  if (p.q && !CAR.test(p.q)) err(p.id, 'question has no car topic: ' + p.q.slice(0, 40));
  // 意味のない数の言いかえ（場面と数値に必然性がない）
  if (p.q && VAGUE.test(p.q)) warn(p.id, 'vague car context: ' + p.q.slice(0, 40));
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
