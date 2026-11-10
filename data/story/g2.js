// ストーリー：中2・箱根・首都高編（オリジナル）
export const CHARS = {
  yuma: { name: '神楽 ユウマ', color: '#ffb02e', role: 'HAKONE ROAD MASTERS',
    look: { hair: 'spiky', hairC: '#a86f30', eye: 'sharp', eyeC: '#9a6a1e', outfit: 'leather', c1: '#2a1c10', c2: '#ffb02e', patch: 'HRM', acc: ['earring'] } },
  himuro: { name: '氷室 アキ', color: '#7fd8ff', role: 'TWIN WINGS（双子の姉）',
    look: { hair: 'bob', hairC: '#c9d3e2', gender: 'f', eye: 'sharp', eyeC: '#3f8fd0', outfit: 'suit', c1: '#10263a', c2: '#7fd8ff', patch: 'TWIN', acc: [] } },
  natsu: { name: '氷室 ナツ', color: '#ff9fd0', role: 'TWIN WINGS（双子の妹）',
    look: { hair: 'pony', hairC: '#c9d3e2', gender: 'f', eye: 'normal', eyeC: '#d0609a', outfit: 'suit', c1: '#3a1028', c2: '#ff9fd0', patch: 'TWIN', acc: [] } },
  kisaragi: { name: '如月 ケイ', color: '#3d7bff', role: 'C1 NIGHT RACERS',
    look: { hair: 'slick', hairC: '#121826', eye: 'shades', eyeC: '#3d7bff', outfit: 'coat', c1: '#0c1426', c2: '#3d7bff', acc: ['stubble'] } },
  makabe: { name: '真壁 トオル', color: '#ff5a36', role: 'WANGAN BULLET',
    look: { hair: 'skin', hairC: '#2a1a14', skin: 'dark', eye: 'normal', eyeC: '#4a2a14', brow: 'thick', build: 'muscle', outfit: 'tank', c1: '#1a1a1a', c2: '#ff5a36', acc: ['cap', 'chain', 'goatee'], capText: 'WB' } },
  mido: { name: '御堂 サヤカ', color: '#ffd84d', role: '横羽クイーン',
    look: { hair: 'long', hairC: '#d8b25a', gender: 'f', eye: 'sharp', eyeC: '#9a7a20', outfit: 'business', c1: '#1a1a24', c2: '#ffd84d', acc: ['earring'] } },
  joker: { name: 'ジョーカー', color: '#ff3df2', role: 'SHADOW幹部',
    look: { hair: 'wild', hairC: '#6a2bc8', skin: 'pale', eye: 'shades', eyeC: '#ff3df2', outfit: 'coat', c1: '#140a1a', c2: '#ff3df2', acc: ['earring', 'chain'] } },
  zero: { name: 'ゼロ', color: '#ff2340', role: 'SHADOW新総帥',
    look: { hair: 'undercut', hairC: '#e2e6ee', skin: 'pale', eye: 'sharp', eyeC: '#c81a30', outfit: 'coat', c1: '#08080c', c2: '#ff2340', acc: ['scar'] } },
};

export const SCENES = {
  'g2-c1-intro': { title: 'PART 2　箱根の風', bg: 'pass-night', lines: [
    ['nar', '群馬の峠を制してから半年。TAKAMIYA FACTORYのトランスポーターは、箱根へ向かっていた。'],
    ['mio', '中2になっても一緒のチームだね。今度の舞台は箱根と首都高！', 'smile'],
    ['gen', '源さんの手紙には「箱根の頂上で待つ」とあった。……頂上には誰もいなかったけどな。'],
    ['me', 'でも、ガレージの柱にじいちゃんの字で書いてあった。「式を計算できる者だけが、次の扉を開ける」。'],
    ['kaito', '……前より速いやつが山ほどいる。数字の読みも、もう1段上が必要だ。', 'serious'],
    ['yuma', 'よう、群馬のハチロク。うわさは聞いてるぜ。オレは神楽ユウマ。「HAKONE ROAD MASTERS」のリーダーだ。', 'smile'],
    ['yuma', 'ターンパイクは長い上りと高速コーナーの連続。パワーも空力も、何項目も同時に計算しなきゃ勝てねぇ。'],
    ['mio', '文字が2つも3つも入ったセッティングの式……多項式ってやつだね。'],
    ['me', '同類項をまとめて、式を簡単にしてから値を入れれば、どんな条件でも一瞬で読める！'],
    ['kaito', '決まりだ。作戦は任せた、エンジニア。'],
  ] },
  'g2-c1-outro': { title: 'STAGE 1 CLEAR', bg: 'pass-night', lines: [
    ['mc', 'ターンパイクを制したのはTAKAMIYA FACTORYのハチロクだーっ！'],
    ['yuma', 'あの長い上りで、ラインを一切ムダにしなかった……式で全部読まれてたのか。', 'surprise'],
    ['yuma', 'このFD、持っていけ。ロータリーの回し方、お前らなら使いこなせる。', 'smile'],
    ['yuma', 'それから……最近、SHADOWの残党が「ゼロ」ってやつの下にまとまりはじめてる。気をつけろ。', 'serious'],
    ['me', 'ゼロ……？', 'surprise'],
  ] },

  'g2-c2-intro': { title: 'STAGE 2　七曲りのツインウイング', bg: 'pass-rain', lines: [
    ['himuro', 'アタシは氷室アキ。こっちは妹のナツ。2台で走る「TWIN WINGS」よ。', 'smile'],
    ['natsu', 'ねえ、2台のタイム差と合計タイムがわかれば、それぞれのタイムがわかるって知ってた？', 'smile'],
    ['gen', '条件が2つで、わからない数も2つ……普通の方程式じゃ追いつかねぇぞ。'],
    ['me', '連立方程式だ！　式を2つ立てて、たしたりひいたりして文字を1つずつ消していけばいい。'],
    ['mio', '雨の七曲りは、2台の動きを同時に読むのがカギだね。'],
  ] },
  'g2-c2-outro': { title: 'STAGE 2 CLEAR', bg: 'pass-rain', lines: [
    ['himuro', '……2台の連携を、式2本で完全に読まれるなんて。', 'surprise'],
    ['natsu', 'くやしいけど楽しかった！　このランエボ、使ってね！', 'smile'],
    ['himuro', 'ゼロは首都高にいる。C1を走るやつらのなかに、SHADOWとつながってる者がいるわ。', 'serious'],
    ['kaito', '首都高か……公道最速のステージだな。', 'serious'],
  ] },

  'g2-c3-intro': { title: 'STAGE 3　首都高C1ナイトラン', bg: 'city', lines: [
    ['nar', '真夜中の首都高・都心環状線。ビルのあいだを、光の帯が流れていく。'],
    ['kisaragi', '……如月ケイだ。C1では一定のペースを刻めないやつから脱落する。', 'serious'],
    ['kisaragi', '時間がたつと、燃料もタイヤも決まった割合で減っていく。その変化を読めるか？'],
    ['me', '変化の割合が一定……1次関数だ！　グラフにすれば、何周目で何が起こるか予測できる。'],
    ['mio', '傾きと切片がわかれば、直線の式が作れるね。データ集めは任せて！', 'smile'],
  ] },
  'g2-c3-outro': { title: 'STAGE 3 CLEAR', bg: 'city', lines: [
    ['kisaragi', '……ペース配分の直線を、オレより正確に引いていたか。', 'surprise'],
    ['kisaragi', 'R34を預ける。それと、ゼロは湾岸線の向こう、大黒PAに出入りしている。', 'serious'],
    ['gen', 'だんだん近づいてきたな。', 'serious'],
  ] },

  'g2-c4-intro': { title: 'STAGE 4　湾岸のブレット', bg: 'city', lines: [
    ['makabe', 'オレは真壁トオル。湾岸の直線は、まっすぐ走るだけじゃねぇ。進入角度ひとつで最高速が変わる！', 'smile'],
    ['kaito', '合流、車線変更、ジャンクションのカーブ……全部「角」の勝負か。'],
    ['me', '平行線の同位角・錯角、三角形と多角形の角……図形の性質を使えば、正確な角度が出せる。'],
    ['mio', 'しかも今回は「なぜそうなるか」を説明しなきゃいけないんだって。証明ってやつ！'],
  ] },
  'g2-c4-outro': { title: 'STAGE 4 CLEAR', bg: 'city', lines: [
    ['makabe', 'くーっ、ラインの角度が完璧だった！　このFK8、持ってけ！', 'smile'],
    ['makabe', '大黒PAのうわさ、聞いたか？　SHADOWの幹部「ジョーカー」が、賭けレースを仕切ってるらしい。', 'serious'],
  ] },

  'g2-c5-intro': { title: 'STAGE 5　横羽線のクイーン', bg: 'city', lines: [
    ['mido', '御堂サヤカよ。横羽線はコーナーの形がそろっているの。同じ形を見抜けない人は、何度でも同じミスをする。', 'smile'],
    ['me', '二等辺三角形、平行四辺形……図形の性質と合同を使えば、コースの形が読める。'],
    ['gen', '証明でキッチリ根拠を示す。整備と同じだ。勘じゃなくて、理由でボルトを締める！', 'smile'],
  ] },
  'g2-c5-outro': { title: 'STAGE 5 CLEAR', bg: 'city', lines: [
    ['mido', '……見事ね。あなたたちの走りには、全部「理由」がある。', 'smile'],
    ['mido', 'このZ、使って。そして……大黒PAに行くなら、運だけに頼らないことね。', 'serious'],
  ] },

  'g2-c6-intro': { title: 'STAGE 6　大黒PAの賭け', bg: 'warehouse', lines: [
    ['joker', 'ようこそ大黒PAへ。オレはジョーカー。ここではスタート順もコースも、サイコロとカードで決まる。', 'smile'],
    ['joker', '運がすべてさ。お前らの計算なんて、何の役にも立たないぜ？'],
    ['me', '運に見えても、起こりやすさは数で表せる。確率だ！', 'serious'],
    ['mio', '樹形図や表で、起こりうる場合を全部数えれば……どれくらい有利か計算できる！'],
    ['kaito', 'お前の計算を信じる。', 'serious'],
  ] },
  'g2-c6-outro': { title: 'STAGE 6 CLEAR', bg: 'warehouse', lines: [
    ['joker', 'バ、バカな……オレの仕掛けた確率を全部読んだだと……！', 'surprise'],
    ['joker', 'ちっ……このGT-Rはくれてやる。ゼロ様は湾岸の最終ステージでお待ちだ。', 'angry'],
    ['gen', 'いよいよ最終決戦だな。', 'serious'],
  ] },

  'g2-c7-intro': { title: 'FINAL STAGE　湾岸ゼロ', bg: 'city', lines: [
    ['zero', '……鷹宮の孫。オレはゼロ。SHADOWを作り直した男だ。', 'serious'],
    ['zero', 'ファントムは甘かった。オレは全チームの走行データを集めている。お前らのクセも、すべてな。'],
    ['mio', '向こうのデータは何百周分……！　平均だけじゃ、どっちが速いか判断できないよ。', 'surprise'],
    ['me', 'データの散らばりを見るんだ。四分位数と箱ひげ図で、分布全体を比べれば……！'],
    ['kaito', '数字でアイツのデータの、さらに先を行く。それがオレたちのやり方だ。', 'serious'],
  ] },
  'g2-c7-outro': { title: 'HAKONE & WANGAN STAGE COMPLETE', bg: 'city', lines: [
    ['mc', '湾岸最終ステージ、勝者は……TAKAMIYA FACTORY！　箱根・首都高、完全制覇だーっ！'],
    ['zero', '……データの「ばらつき」まで読んでいたとはな。', 'surprise'],
    ['zero', '覚えておけ。SHADOWの本当の目的は、鷹宮源一郎の「最後のノート」だ。', 'serious'],
    ['jii', '『{name}。よくここまで来た。最後のノートは、全国の頂点で渡そう。』'],
    ['me', 'じいちゃん……！　次は全国だ！', 'smile'],
    ['nar', '中2・箱根・首都高編　完。　── 中3「全国決戦編」へ続く。'],
  ] },
};
