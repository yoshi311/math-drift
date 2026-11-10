# 開発用：実車写真の切り抜きと、3Dモデルの望遠（tele-side）描画を同じmm座標に重ねて一致度（IoU）を出す
# python tools/ref-trace.py <写真の切り抜きPNG> <写真の換算 "x0px,mmPerPx,groundPy,flip"> <描画PNG> <出力JPG> [下限mm]
#  写真の換算：x_mm = L - (px - x0px) * s（flip=1 は前が左の写真）、y_mm = (groundPy - py) * s
#  描画は tele-side（横幅4.6m=880px、中心 x=L/2・y=650mm）
import sys
import numpy as np
from PIL import Image

L = 4205
ph, conv, rd, out = sys.argv[1:5]
ymin = float(sys.argv[5]) if len(sys.argv) > 5 else 300
x0, s, gy, flip = [float(v) for v in conv.split(',')]
CELL = 5
W, H = 4400 // CELL, 1450 // CELL
gx = (np.arange(W) * CELL - 100)[None, :].repeat(H, 0)   # mm
gyy = (1450 - np.arange(H) * CELL)[:, None].repeat(W, 1)

def sample(alpha, px, py):
    h, w = alpha.shape
    ok = (px >= 0) & (px < w) & (py >= 0) & (py < h)
    v = np.zeros(px.shape, bool)
    v[ok] = alpha[py[ok].astype(int), px[ok].astype(int)] > 160
    return v

pa = np.array(Image.open(ph).convert('RGBA'))[:, :, 3]
ppx = (x0 + (L - gx) / s) if flip else (x0 + gx / s)
ppy = gy - gyy / s
P = sample(pa, ppx, ppy)

ra = np.array(Image.open(rd).convert('RGBA'))[:, :, 3]
k = 4600 / 880
rpx = 440 + (gx - L / 2) / k
rpy = 200 - (gyy - 650) / k
R = sample(ra, rpx, rpy)

m = gyy >= ymin
iou = (P & R & m).sum() / max(1, ((P | R) & m).sum())
print(f'IoU(y>={ymin:.0f}mm) = {iou:.3f}')
# 列ごとの上端の差（mm）：どこが高い/低いか
tops = []
for xm in range(0, L + 1, 150):
    c = int((xm + 100) / CELL)
    col_p = np.nonzero(P[:, c])[0]; col_r = np.nonzero(R[:, c])[0]
    if len(col_p) and len(col_r): tops.append((xm, int(gyy[col_r[0], c] - gyy[col_p[0], c])))
print('上端の差（モデル−写真, mm）:', tops)
img = np.zeros((H, W, 3), np.uint8)
img[P & ~R] = (255, 60, 60); img[R & ~P] = (60, 200, 255); img[P & R] = (230, 230, 230)
for yy in range(0, 1450, 100): img[int((1450 - yy) / CELL) - 1, :] = (60, 60, 60)
for xx in range(0, 4400, 500): img[:, int((xx + 100) / CELL)] = (60, 60, 60)
Image.fromarray(img).save(out, quality=90)
