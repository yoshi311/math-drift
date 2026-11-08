// 問題用の図（SVG/HTML文字列）を生成
const T = '#eef2f8', M = '#7f8aa3', C = '#00e5ff', Y = '#ffd400', R = '#ff2d55';
const wrap = (w, h, inner) => `<svg viewBox="0 0 ${w} ${h}" width="${w}" xmlns="http://www.w3.org/2000/svg" font-size="16" fill="${T}">${inner}</svg>`;
const txt = (x, y, s, o = {}) => `<text x="${x}" y="${y}" text-anchor="${o.a || 'middle'}" fill="${o.c || T}" font-size="${o.fs || 16}" font-weight="${o.fw || 700}"${o.it ? ' font-style="italic"' : ''}>${s}</text>`;

export function raw(w, h, inner) { return wrap(w, h, inner); }

// 数直線
export function numberLine({ min = -5, max = 5, step = 1, points = [], arrows = [], labelEvery = 1, width = 560 } = {}) {
  const pad = 30, w = width, h = 96, y = 50;
  const X = v => pad + (v - min) / (max - min) * (w - 2 * pad);
  let s = `<line x1="${pad - 16}" y1="${y}" x2="${w - pad + 18}" y2="${y}" stroke="${T}" stroke-width="2"/><path d="M${w - pad + 18},${y} l-10,-6 v12z" fill="${T}"/>`;
  for (let v = min, i = 0; v <= max + 1e-9; v += step, i++) {
    const big = Math.abs(v % labelEvery) < 1e-9 || Math.abs(Math.abs(v % labelEvery) - labelEvery) < 1e-9;
    s += `<line x1="${X(v)}" y1="${y - (big ? 8 : 5)}" x2="${X(v)}" y2="${y + (big ? 8 : 5)}" stroke="${T}" stroke-width="${big ? 2 : 1}"/>`;
    if (big) s += txt(X(v), y + 28, String(+v.toFixed(2)).replace('-', '−'), { c: v === 0 ? Y : M, fs: 15 });
  }
  arrows.forEach(a => {
    const x1 = X(a.from), x2 = X(a.to), yy = y - 22 - (a.lv || 0) * 16;
    s += `<path d="M${x1},${yy} L${x2},${yy}" stroke="${a.c || C}" stroke-width="2.5"/><path d="M${x2},${yy} l${x2 > x1 ? -9 : 9},-5 v10z" fill="${a.c || C}"/>`;
    if (a.label) s += txt((x1 + x2) / 2, yy - 6, a.label, { c: a.c || C, fs: 14 });
  });
  points.forEach(p => {
    s += `<circle cx="${X(p.v)}" cy="${y}" r="6" fill="${p.c || R}"/>`;
    if (p.label) s += txt(X(p.v), y - 14, p.label, { c: p.c || R, fs: 16 });
  });
  return wrap(w, h, s);
}

// 座標平面
export function coord({ xmin = -6, xmax = 6, ymin = -6, ymax = 6, unit = 26, points = [], lines = [], grid = true, labels = true } = {}) {
  const pad = 22, w = (xmax - xmin) * unit + pad * 2, h = (ymax - ymin) * unit + pad * 2;
  const X = x => pad + (x - xmin) * unit, Yp = y => pad + (ymax - y) * unit;
  let s = '';
  if (grid) {
    for (let x = xmin; x <= xmax; x++) s += `<line x1="${X(x)}" y1="${Yp(ymin)}" x2="${X(x)}" y2="${Yp(ymax)}" stroke="#2a3145" stroke-width="1"/>`;
    for (let y = ymin; y <= ymax; y++) s += `<line x1="${X(xmin)}" y1="${Yp(y)}" x2="${X(xmax)}" y2="${Yp(y)}" stroke="#2a3145" stroke-width="1"/>`;
  }
  s += `<line x1="${X(xmin)}" y1="${Yp(0)}" x2="${X(xmax) + 10}" y2="${Yp(0)}" stroke="${T}" stroke-width="2"/><line x1="${X(0)}" y1="${Yp(ymin)}" x2="${X(0)}" y2="${Yp(ymax) - 10}" stroke="${T}" stroke-width="2"/>`;
  s += txt(X(xmax) + 12, Yp(0) + 18, 'x', { it: 1 }) + txt(X(0) - 12, Yp(ymax) - 4, 'y', { it: 1 }) + txt(X(0) - 10, Yp(0) + 16, 'O', { fs: 14 });
  if (labels) {
    for (let x = xmin; x <= xmax; x++) if (x && x % 2 === 0) s += txt(X(x), Yp(0) + 16, String(x).replace('-', '−'), { c: M, fs: 12 });
    for (let y = ymin; y <= ymax; y++) if (y && y % 2 === 0) s += txt(X(0) - 8, Yp(y) + 4, String(y).replace('-', '−'), { c: M, fs: 12, a: 'end' });
  }
  const clipId = 'cp' + Math.random().toString(36).slice(2, 7);
  s += `<defs><clipPath id="${clipId}"><rect x="${X(xmin)}" y="${Yp(ymax)}" width="${(xmax - xmin) * unit}" height="${(ymax - ymin) * unit}"/></clipPath></defs>`;
  lines.forEach(l => {
    let d = '';
    const N = 240;
    for (let i = 0; i <= N; i++) {
      const x = xmin + (xmax - xmin) * i / N;
      if (l.skip0 && Math.abs(x) < 0.04) { d += ' '; continue; }
      const y = l.f(x);
      if (!isFinite(y) || Math.abs(y) > 60) continue;
      d += (d.endsWith(' ') || d === '' ? 'M' : 'L') + X(x).toFixed(1) + ',' + Yp(y).toFixed(1);
    }
    s += `<path d="${d}" fill="none" stroke="${l.c || C}" stroke-width="3" clip-path="url(#${clipId})"/>`;
    if (l.label) s += txt(X(l.lx), Yp(l.ly), l.label, { c: l.c || C, fs: 15 });
  });
  points.forEach(p => {
    s += `<circle cx="${X(p.x)}" cy="${Yp(p.y)}" r="5" fill="${p.c || R}"/>`;
    if (p.label) s += txt(X(p.x) + (p.dx ?? 12), Yp(p.y) + (p.dy ?? -8), p.label, { c: p.c || R, fs: 15 });
  });
  return wrap(w, h, s);
}

// ヒストグラム
export function histogram({ labels, counts, xlabel = '', ylabel = '(台)', max = null, color = C } = {}) {
  const n = counts.length, bw = 52, pad = 46, h = 230, w = pad + n * bw + 30;
  const top = max || Math.max(...counts) + 1, base = h - 40, sc = (base - 20) / top;
  let s = '';
  for (let v = 0; v <= top; v++) { s += `<line x1="${pad}" y1="${base - v * sc}" x2="${pad + n * bw}" y2="${base - v * sc}" stroke="#2a3145"/>` + (v % (top > 10 ? 2 : 1) === 0 ? txt(pad - 8, base - v * sc + 5, v, { a: 'end', c: M, fs: 12 }) : ''); }
  counts.forEach((c, i) => { s += `<rect x="${pad + i * bw}" y="${base - c * sc}" width="${bw}" height="${c * sc}" fill="${color}" fill-opacity=".35" stroke="${color}" stroke-width="2"/>`; });
  labels.forEach((l, i) => { s += txt(pad + i * bw, base + 18, l, { c: M, fs: 12 }); });
  s += `<line x1="${pad}" y1="${base}" x2="${pad + n * bw}" y2="${base}" stroke="${T}" stroke-width="2"/><line x1="${pad}" y1="${base}" x2="${pad}" y2="14" stroke="${T}" stroke-width="2"/>`;
  s += txt(pad + n * bw + 4, base + 34, xlabel, { a: 'end', c: M, fs: 12 }) + txt(pad - 6, 12, ylabel, { a: 'start', c: M, fs: 12 });
  return wrap(w, h, s);
}

// おうぎ形
export function sector({ angle = 90, r = '6cm', showAngle = true, full = false } = {}) {
  const cx = 130, cy = 130, rr = 100;
  const a = angle * Math.PI / 180;
  const x2 = cx + rr * Math.cos(-a), y2 = cy + rr * Math.sin(-a);
  let s;
  if (full || angle >= 360) s = `<circle cx="${cx}" cy="${cy}" r="${rr}" fill="rgba(0,229,255,.15)" stroke="${C}" stroke-width="3"/><line x1="${cx}" y1="${cy}" x2="${cx + rr}" y2="${cy}" stroke="${T}" stroke-width="2"/>`;
  else s = `<path d="M${cx},${cy} L${cx + rr},${cy} A${rr},${rr} 0 ${angle > 180 ? 1 : 0} 0 ${x2.toFixed(1)},${y2.toFixed(1)} Z" fill="rgba(0,229,255,.15)" stroke="${C}" stroke-width="3"/>`;
  s += `<circle cx="${cx}" cy="${cy}" r="3" fill="${T}"/>` + txt(cx + rr / 2, cy + 22, r, { c: Y });
  if (showAngle && angle < 360) s += `<path d="M${cx + 22},${cy} A22,22 0 ${angle > 180 ? 1 : 0} 0 ${(cx + 22 * Math.cos(-a)).toFixed(1)},${(cy + 22 * Math.sin(-a)).toFixed(1)}" fill="none" stroke="${Y}" stroke-width="2"/>` + txt(cx + 36 * Math.cos(-a / 2) + 8, cy + 36 * Math.sin(-a / 2) + 2, angle + '°', { c: Y, fs: 14 });
  return wrap(260, 260, s);
}

// 立体（見取図）
export function solid(kind, lab = {}) {
  const L = (x1, y1, x2, y2, dash) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${dash ? M : C}" stroke-width="2.5"${dash ? ' stroke-dasharray="6 5"' : ''}/>`;
  let s = '';
  if (kind === 'cuboid' || kind === 'cube') {
    const w = kind === 'cube' ? 120 : 170, h = 120, d = 50;
    const x = 40, y = 70;
    s += L(x, y, x + w, y) + L(x + w, y, x + w, y + h) + L(x + w, y + h, x, y + h) + L(x, y + h, x, y) +
      L(x, y, x + d, y - d * .7) + L(x + w, y, x + w + d, y - d * .7) + L(x + w, y + h, x + w + d, y + h - d * .7) + L(x + d, y - d * .7, x + w + d, y - d * .7) + L(x + w + d, y - d * .7, x + w + d, y + h - d * .7) +
      L(x + d, y - d * .7, x + d, y + h - d * .7, 1) + L(x + d, y + h - d * .7, x + w + d, y + h - d * .7, 1) + L(x, y + h, x + d, y + h - d * .7, 1);
    if (lab.a) s += txt(x + w / 2, y + h + 24, lab.a, { c: Y });
    if (lab.b) s += txt(x + w + d / 2 + 22, y + h - d * .35 + 6, lab.b, { c: Y });
    if (lab.c) s += txt(x - 10, y + h / 2 + 6, lab.c, { c: Y, a: 'end' });
    return wrap(300, 230, s);
  }
  if (kind === 'cylinder' || kind === 'cone') {
    const cx = 140, top = 40, bot = 190, rx = 70, ry = 18;
    if (kind === 'cylinder') {
      s += `<ellipse cx="${cx}" cy="${top}" rx="${rx}" ry="${ry}" fill="none" stroke="${C}" stroke-width="2.5"/>` + L(cx - rx, top, cx - rx, bot) + L(cx + rx, top, cx + rx, bot) +
        `<path d="M${cx - rx},${bot} A${rx},${ry} 0 0 0 ${cx + rx},${bot}" fill="none" stroke="${C}" stroke-width="2.5"/><path d="M${cx - rx},${bot} A${rx},${ry} 0 0 1 ${cx + rx},${bot}" fill="none" stroke="${M}" stroke-width="2" stroke-dasharray="6 5"/>`;
    } else {
      s += L(cx, top - 10, cx - rx, bot) + L(cx, top - 10, cx + rx, bot) +
        `<path d="M${cx - rx},${bot} A${rx},${ry} 0 0 0 ${cx + rx},${bot}" fill="none" stroke="${C}" stroke-width="2.5"/><path d="M${cx - rx},${bot} A${rx},${ry} 0 0 1 ${cx + rx},${bot}" fill="none" stroke="${M}" stroke-width="2" stroke-dasharray="6 5"/>` + L(cx, top - 10, cx, bot, 1);
    }
    s += L(cx, bot, cx + rx, bot, 1);
    if (lab.r) s += txt(cx + rx / 2, bot - 6, lab.r, { c: Y });
    if (lab.h) s += txt(cx + rx + 12, (top + bot) / 2, lab.h, { c: Y, a: 'start' });
    if (lab.l) s += txt(cx - rx / 2 - 18, (top + bot) / 2, lab.l, { c: Y, a: 'end' });
    return wrap(280, 225, s);
  }
  if (kind === 'pyramid') {
    const A = [70, 180], B = [190, 180], Cc = [230, 140], D = [110, 140], P = [150, 30];
    s += L(...A, ...B) + L(...B, ...Cc) + L(...Cc, ...D, 1) + L(...D, ...A, 1) + L(...P, ...A) + L(...P, ...B) + L(...P, ...Cc) + L(...P, ...D, 1);
    if (lab.h) s += L(P[0], P[1], 150, 160, 1) + txt(158, 110, lab.h, { c: Y, a: 'start' });
    if (lab.a) s += txt(130, 204, lab.a, { c: Y });
    return wrap(280, 220, s);
  }
  if (kind === 'triprism') {
    const A = [50, 170], B = [170, 170], Cc = [90, 110], d = [90, -40];
    s += L(...A, ...B) + L(...B, ...Cc) + L(...Cc, ...A) + L(A[0] + d[0], A[1] + d[1], B[0] + d[0], B[1] + d[1], 1) + L(B[0] + d[0], B[1] + d[1], Cc[0] + d[0], Cc[1] + d[1]) + L(Cc[0] + d[0], Cc[1] + d[1], A[0] + d[0], A[1] + d[1], 1) +
      L(...A, A[0] + d[0], A[1] + d[1], 1) + L(...B, B[0] + d[0], B[1] + d[1]) + L(...Cc, Cc[0] + d[0], Cc[1] + d[1]);
    if (lab.h) s += txt(B[0] + d[0] / 2 + 14, B[1] + d[1] / 2 + 14, lab.h, { c: Y, a: 'start' });
    return wrap(300, 210, s);
  }
  if (kind === 'sphere') {
    s += `<circle cx="140" cy="110" r="80" fill="rgba(0,229,255,.08)" stroke="${C}" stroke-width="2.5"/><ellipse cx="140" cy="110" rx="80" ry="20" fill="none" stroke="${M}" stroke-dasharray="6 5"/>` + L(140, 110, 220, 110, 1) + `<circle cx="140" cy="110" r="3" fill="${T}"/>`;
    if (lab.r) s += txt(180, 102, lab.r, { c: Y });
    return wrap(280, 220, s);
  }
  return '';
}

// 表（HTML）
export function table(rows, opt = {}) {
  return `<table class="qtable${opt.cls ? ' ' + opt.cls : ''}">${rows.map((r, i) => `<tr>${r.map((c, j) => i === 0 || (opt.headCol && j === 0) ? `<th>${c}</th>` : `<td>${c}</td>`).join('')}</tr>`).join('')}</table>`;
}
