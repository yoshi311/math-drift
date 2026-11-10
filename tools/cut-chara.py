# 開発用：生成したキャラ画像の背景を切り抜き、人物に合わせて 600x750 のWebPにする
# 使い方（rembg が入った環境で）: python tools/cut-chara.py <モデル isnet-anime|isnet-general-use> <候補dir> img/chara key=file.jpg ...
import sys,os
from rembg import remove,new_session
from PIL import Image
sess=new_session(sys.argv[1])
src=sys.argv[2]; out=sys.argv[3]
for p in sys.argv[4:]:
  k,f=p.split('=')
  im=Image.open(os.path.join(src,f)).convert('RGB'); w,h=im.size
  im=im.crop((0,0,w,int(h*.94)))
  r=remove(im,session=sess,alpha_matting=False)
  a=r.split()[3].point(lambda v:255 if v>40 else 0); x0,y0,x1,y1=a.getbbox()
  bw,bh=x1-x0,y1-y0; W=max(bw,int(bh*.8)); H=int(W*1.25); mt=int(H*.03)
  c=Image.new('RGBA',(W,H),(0,0,0,0)); c.paste(r.crop((x0,y0,x1,y1)),((W-bw)//2,mt))
  r=c.resize((600,750),Image.LANCZOS)
  r.save(os.path.join(out,k+'.webp'),'WEBP',quality=82,method=6)
  print(k,os.path.getsize(os.path.join(out,k+'.webp')),flush=True)
