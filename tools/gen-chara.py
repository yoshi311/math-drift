# 開発用：キャラ立ち絵を画像生成AI（Pollinations.ai）で生成する
#   python tools/gen-chara.py gen <出力dir> [key,key...]   候補を生成（45秒に1枚）
#   python tools/gen-chara.py make <候補dir> key=file ...  採用した画像を img/chara/<key>.webp に変換
# キャラはすべてオリジナル。既存作品のキャラ名・作品名はプロンプトに入れない。
import sys, os, time, urllib.parse, urllib.request

STYLE = ("anime screenshot, 1990s cel anime, flat cel shading, bold clean black outlines, "
         "half body portrait, 3/4 view, looking at viewer, {who}, dramatic {rim} rim light, "
         "solid dark charcoal background, high quality, detailed eyes")

CHARS = {
  'kaito':    ('original young man street racer, short black hair with long fringe, sharp narrow eyes, cool calm expression, olive green MA-1 flight jacket over grey hoodie, dog tag necklace', 'blue'),
  'gen':      ('single person, original friendly mechanic man in his thirties, buzz cut very short black hair, stubble, tan skin, confident grin, fully clothed in dark grey mechanic work jacket over black t-shirt, orange towel around neck', 'orange'),
  'mio':      ('original teenage girl data analyst, dark plum hair in high ponytail, bright pink eyes, smart smile, navy blazer with pink accents, holding a tablet', 'pink'),
  'jii':      ('original old master car tuner in his seventies, slicked back silver hair, white beard, wrinkles, wise sharp eyes, olive mechanic jumpsuit with yellow accents', 'golden yellow'),
  'mc':       ('original young man race commentator, slicked back black hair, energetic smile, dark green suit, headset microphone', 'green'),
  'gouda':    ('original tough muscular young man street racer, red undercut hairstyle, scar on cheek, stubble, fierce eyes, black leather riders jacket, sunglasses hanging on shirt, earring', 'red'),
  'rin':      ('original cool young woman racing driver, long straight dark violet hair, sharp purple eyes, confident smirk, purple racing suit unzipped to waist with black t-shirt', 'violet'),
  'kurosaki': ('original stern man in his late twenties, black center-parted hair, stubble, cold grey eyes, long black coat with turned up collar', 'pale silver blue'),
  'kujo':     ('original slim intellectual young man, teal fringe hair, narrow eyes behind thin rectangular glasses, calm analytical expression, dark teal suit, holding a tablet', 'teal'),
  'ryuzaki':  ('original wild young man drift racer, spiky orange hair, racing goggles on forehead, sharp amber eyes, cocky grin, denim jacket over black t-shirt, silver chain', 'orange'),
  'viper':    ('original menacing young man, green undercut hairstyle, dark sunglasses, pale skin, sly smile, black leather jacket, earrings, neck tattoo', 'neon green'),
  'phantom':  ('original mysterious leader, long black hair, pale skin, white half face mask, glowing magenta eyes, long black high collar coat', 'magenta'),
  'yuma':     ('original confident young man street racer, messy light brown hair, sharp amber eyes, earring, brown MA-1 flight jacket, dog tag necklace, slight smirk', 'amber'),
  'himuro':   ('original cool young woman racing driver, silver bob haircut, sharp ice blue eyes, serious expression, navy racing suit unzipped with black t-shirt', 'ice blue'),
  'natsu':    ('original cheerful young woman racing driver, silver hair in ponytail, pink eyes, playful smile, dark magenta racing suit unzipped with black t-shirt', 'pink'),
  'kisaragi': ('original cool man in his late twenties, slicked back black hair, dark sunglasses, stubble, navy long coat, city night racer', 'electric blue'),
  'makabe':   ('original huge muscular man highway racer, dark skin, goatee, black baseball cap, black tank top, gold chain, grinning', 'orange red'),
  'mido':     ('original elegant woman racer in her twenties, long wavy golden blonde hair, sharp golden eyes, confident smile, black long coat, earrings', 'golden'),
  'joker':    ('original eccentric villain young man, wild spiky purple hair, pink tinted sunglasses, pale skin, wide grin, black coat with magenta lining, chains', 'hot pink'),
  'zero':     ('original cold silent young man, white undercut hair, pale skin, piercing red eyes, scar over eyebrow, black high collar coat', 'crimson'),
  # 主人公プリセット（設定で選ぶ）
  'me1':      ('original teenage boy engineer, messy short black hair, determined blue eyes, olive MA-1 flight jacket over hoodie, headset around neck', 'cyan'),
  'me2':      ('original teenage boy engineer, long fringe brown hair, gentle confident eyes, black windbreaker jacket, headset around neck', 'cyan'),
  'me3':      ('original teenage boy engineer, short two-block dark blue hair, sharp eyes, slight grin, red and black racing team jacket, headset around neck', 'cyan'),
  'me4':      ('original teenage girl engineer, short black bob hair, bright determined eyes, olive MA-1 flight jacket over hoodie, headset around neck', 'cyan'),
  'me5':      ('original teenage girl engineer, long brown hair in low ponytail, confident smile, black racing team jacket, headset around neck', 'cyan'),
  'me6':      ('original teenage girl engineer, short dark red hair, sharp cool eyes, white and navy racing team jacket, headset around neck', 'cyan'),
}
MODELS = [('turbo', 101), ('flux', 202)]


def fetch(prompt, seed, model, out):
  u = ('https://image.pollinations.ai/prompt/' + urllib.parse.quote(prompt) +
       f'?width=768&height=1024&nologo=true&seed={seed}&model={model}')
  for _ in range(8):
    try:
      d = urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'mathdrift-dev'}), timeout=180).read()
      if d[:1] == b'{': raise Exception(d[:120])
      open(out, 'wb').write(d); print('ok', out, flush=True); return True
    except Exception as e:
      print('retry', out, e, flush=True); time.sleep(48)
  return False


def gen(outdir, keys):
  os.makedirs(outdir, exist_ok=True)
  for k in keys:
    who, rim = CHARS[k]
    for model, seed in MODELS:
      out = os.path.join(outdir, f'{k}_{model}.jpg')
      if os.path.exists(out): continue
      fetch(STYLE.format(who=who, rim=rim), seed, model, out)
      time.sleep(46)


def make(src, pairs):
  from PIL import Image
  os.makedirs('img/chara', exist_ok=True)
  for p in pairs:
    k, f = p.split('=')
    im = Image.open(os.path.join(src, f)).convert('RGB')
    w, h = im.size
    im = im.crop((0, 0, w, int(h * 0.94)))  # 右下のロゴ帯を落とす
    im.thumbnail((600, 800), Image.LANCZOS)
    im.save(f'img/chara/{k}.webp', 'WEBP', quality=80, method=6)
    print(k, im.size, os.path.getsize(f'img/chara/{k}.webp'))


if __name__ == '__main__':
  cmd = sys.argv[1]
  if cmd == 'gen':
    gen(sys.argv[2], sys.argv[3].split(',') if len(sys.argv) > 3 else list(CHARS))
  elif cmd == 'make':
    make(sys.argv[2], sys.argv[3:])
