// 問題用の図（SVG/HTML文字列）を生成
const T = '#eef2f8', M = '#7f8aa3', C = '#00e5ff', Y = '#ffd400', R = '#ff2d55';
const wrap = (w, h, inner) => `<svg viewBox="0 0 ${w} ${h}" width="${w}" xmlns="http://www.w3.org/2000/svg" font-size="16" fill="${T}">${inner}</svg>`;
// SVG内では <i> が使えない（HTMLとして外に出てしまう）ので tspan に変換する
const svgText = s => String(s).replace(/<i>/g, '<tspan font-style="italic">').replace(/<\/i>/g, '</tspan>');
const txt = (x, y, s, o = {}) => `<text x="${x}" y="${y}" text-anchor="${o.a || 'middle'}" fill="${o.c || T}" font-size="${o.fs || 16}" font-weight="${o.fw || 700}"${o.it ? ' font-style="italic"' : ''}>${svgText(s)}</text>`;

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
    const x = 70, y = 70;
    s += L(x, y, x + w, y) + L(x + w, y, x + w, y + h) + L(x + w, y + h, x, y + h) + L(x, y + h, x, y) +
      L(x, y, x + d, y - d * .7) + L(x + w, y, x + w + d, y - d * .7) + L(x + w, y + h, x + w + d, y + h - d * .7) + L(x + d, y - d * .7, x + w + d, y - d * .7) + L(x + w + d, y - d * .7, x + w + d, y + h - d * .7) +
      L(x + d, y - d * .7, x + d, y + h - d * .7, 1) + L(x + d, y + h - d * .7, x + w + d, y + h - d * .7, 1) + L(x, y + h, x + d, y + h - d * .7, 1);
    if (lab.a) s += txt(x + w / 2, y + h + 24, lab.a, { c: Y });
    if (lab.b) s += txt(x + w + d / 2 + 22, y + h - d * .35 + 6, lab.b, { c: Y });
    if (lab.c) s += txt(x - 10, y + h / 2 + 6, lab.c, { c: Y, a: 'end' });
    return wrap(330, 230, s);
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
    if (lab.d) s += L(cx - rx, bot, cx + rx, bot, 1) + txt(cx, bot + ry + 22, lab.d, { c: Y });
    return wrap(280, lab.d ? 240 : 225, s);
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

// ===== 中2用 =====
// 平面図形：pts {A:[x,y]}, segs [['A','B']], polys [['A','B','C']], lines [{p:[x1,y1,x2,y2], label, lx, ly}],
// angles [{at:'B', from:'A', to:'C', label:'50°', r, c}], ticks [{s:['A','B'], n:1}], par [{s:['A','B'], n:1}], right ['B'+...], texts [[x,y,'s',c]]
export function geo({ w = 360, h = 240, pts = {}, segs = [], polys = [], lines = [], angles = [], ticks = [], par = [], rights = [], texts = [], labelOff = {}, dots = true } = {}) {
  const P = k => pts[k];
  let s = '';
  polys.forEach(pl => { s += `<polygon points="${pl.map(k => P(k).join(',')).join(' ')}" fill="rgba(0,229,255,.08)" stroke="${C}" stroke-width="2.5" stroke-linejoin="round"/>`; });
  lines.forEach(l => { const [x1, y1, x2, y2] = l.p; s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${l.c || T}" stroke-width="2.2"${l.dash ? ' stroke-dasharray="6 5"' : ''}/>`; if (l.label) s += txt(l.lx ?? x2 + 10, l.ly ?? y2, l.label, { c: l.c || M, it: 1, a: 'start' }); });
  segs.forEach(([a, b, c]) => { s += `<line x1="${P(a)[0]}" y1="${P(a)[1]}" x2="${P(b)[0]}" y2="${P(b)[1]}" stroke="${c || C}" stroke-width="2.5"/>`; });
  const ang = (o, p) => Math.atan2(p[1] - o[1], p[0] - o[0]);
  angles.forEach(a => {
    const o = P(a.at), p1 = Array.isArray(a.from) ? a.from : P(a.from), p2 = Array.isArray(a.to) ? a.to : P(a.to), r = a.r || 24;
    let t1 = ang(o, p1), t2 = ang(o, p2);
    let d = t2 - t1; while (d <= -Math.PI) d += 2 * Math.PI; while (d > Math.PI) d -= 2 * Math.PI;
    const sweep = d > 0 ? 1 : 0;
    const x1 = o[0] + r * Math.cos(t1), y1 = o[1] + r * Math.sin(t1), x2 = o[0] + r * Math.cos(t1 + d), y2 = o[1] + r * Math.sin(t1 + d);
    const col = a.c || Y;
    s += `<path d="M${x1.toFixed(1)},${y1.toFixed(1)} A${r},${r} 0 0 ${sweep} ${x2.toFixed(1)},${y2.toFixed(1)}" fill="none" stroke="${col}" stroke-width="2.2"/>`;
    if (a.label) { const tm = t1 + d / 2, rr = r + (a.lr || 16); s += txt(o[0] + rr * Math.cos(tm), o[1] + rr * Math.sin(tm) + 5, a.label, { c: col, fs: 14 }); }
  });
  rights.forEach(([a, b, c]) => {
    const o = P(b), u = [P(a)[0] - o[0], P(a)[1] - o[1]], v = [P(c)[0] - o[0], P(c)[1] - o[1]];
    const nu = Math.hypot(...u), nv = Math.hypot(...v), k = 13;
    const p1 = [o[0] + u[0] / nu * k, o[1] + u[1] / nu * k], p3 = [o[0] + v[0] / nv * k, o[1] + v[1] / nv * k], p2 = [p1[0] + v[0] / nv * k, p1[1] + v[1] / nv * k];
    s += `<path d="M${p1.join(',')} L${p2.join(',')} L${p3.join(',')}" fill="none" stroke="${Y}" stroke-width="2"/>`;
  });
  ticks.forEach(t => {
    const a = P(t.s[0]), b = P(t.s[1]), m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const nx = -(b[1] - a[1]) / L, ny = (b[0] - a[0]) / L, ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L;
    for (let i = 0; i < (t.n || 1); i++) { const o = (i - ((t.n || 1) - 1) / 2) * 6; s += `<line x1="${m[0] + ux * o - nx * 7}" y1="${m[1] + uy * o - ny * 7}" x2="${m[0] + ux * o + nx * 7}" y2="${m[1] + uy * o + ny * 7}" stroke="${Y}" stroke-width="2"/>`; }
  });
  par.forEach(t => {
    const a = P(t.s[0]), b = P(t.s[1]), m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L, nx = -uy, ny = ux;
    for (let i = 0; i < (t.n || 1); i++) { const c = [m[0] + ux * i * 7, m[1] + uy * i * 7]; s += `<path d="M${c[0] - ux * 7 + nx * 6},${c[1] - uy * 7 + ny * 6} L${c[0]},${c[1]} L${c[0] - ux * 7 - nx * 6},${c[1] - uy * 7 - ny * 6}" fill="none" stroke="${Y}" stroke-width="2"/>`; }
  });
  if (dots) Object.entries(pts).forEach(([k, p]) => {
    if (k.startsWith('_')) return;
    const off = labelOff[k] || [0, -12];
    s += `<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="${T}"/>` + txt(p[0] + off[0], p[1] + off[1] + 5, k, { fs: 15 });
  });
  texts.forEach(([x, y, t, c]) => { s += txt(x, y, t, { c: c || Y, fs: 14 }); });
  return wrap(w, h, s);
}

// 箱ひげ図：rows [{name, v:[最小,Q1,中央,Q3,最大]}], axis {min,max,step}
export function boxplot({ rows = [], axis = { min: 0, max: 100, step: 10 }, unit = '' } = {}) {
  const pad = 70, w = 560, rh = 56, h = rows.length * rh + 56;
  const X = v => pad + (v - axis.min) / (axis.max - axis.min) * (w - pad - 24);
  let s = '';
  for (let v = axis.min; v <= axis.max + 1e-9; v += axis.step) {
    s += `<line x1="${X(v)}" y1="14" x2="${X(v)}" y2="${h - 34}" stroke="#2a3145"/>` + txt(X(v), h - 16, +v.toFixed(2), { c: M, fs: 12 });
  }
  s += txt(w - 6, h - 2, unit, { c: M, fs: 12, a: 'end' });
  rows.forEach((r, i) => {
    const y = 24 + i * rh + rh / 2 - 6, [a, b, m, c, d] = r.v, col = r.c || C;
    s += `<line x1="${X(a)}" y1="${y}" x2="${X(b)}" y2="${y}" stroke="${col}" stroke-width="2.5"/><line x1="${X(c)}" y1="${y}" x2="${X(d)}" y2="${y}" stroke="${col}" stroke-width="2.5"/>
      <line x1="${X(a)}" y1="${y - 10}" x2="${X(a)}" y2="${y + 10}" stroke="${col}" stroke-width="2.5"/><line x1="${X(d)}" y1="${y - 10}" x2="${X(d)}" y2="${y + 10}" stroke="${col}" stroke-width="2.5"/>
      <rect x="${X(b)}" y="${y - 16}" width="${X(c) - X(b)}" height="32" fill="${col}" fill-opacity=".18" stroke="${col}" stroke-width="2.5"/>
      <line x1="${X(m)}" y1="${y - 16}" x2="${X(m)}" y2="${y + 16}" stroke="${Y}" stroke-width="3"/>`;
    if (r.name) s += txt(pad - 10, y + 5, r.name, { a: 'end', fs: 14 });
  });
  return wrap(w, h, s);
}

// 樹形図：levels [['A','B'],['A','B']]（distinct=true なら同じものを2回使わない）
export function tree({ levels = [], distinct = false, labels = [] } = {}) {
  const paths = [];
  const rec = (pre, d) => {
    if (d === levels.length) { paths.push(pre); return; }
    for (const it of levels[d]) { if (distinct && pre.includes(it)) continue; rec([...pre, it], d + 1); }
  };
  rec([], 0);
  const lh = 26, colW = 110, h = paths.length * lh + 20, w = 30 + levels.length * colW;
  const nodes = {};
  paths.forEach((p, i) => {
    for (let d = 0; d < p.length; d++) {
      const key = p.slice(0, d + 1).join('/');
      (nodes[key] = nodes[key] || { d, ys: [], label: p[d], parent: p.slice(0, d).join('/') }).ys.push(14 + i * lh + lh / 2);
    }
  });
  let s = '';
  const pos = k => { const n = nodes[k]; return [30 + n.d * colW + 40, n.ys.reduce((a, b) => a + b, 0) / n.ys.length]; };
  Object.entries(nodes).forEach(([k, n]) => {
    const [x, y] = pos(k);
    if (n.parent) { const [px, py] = pos(n.parent); s += `<line x1="${px + 14}" y1="${py}" x2="${x - 14}" y2="${y}" stroke="${M}" stroke-width="1.6"/>`; }
    s += txt(x, y + 5, n.label, { fs: 15, c: C });
  });
  labels.forEach((l, d) => { s += txt(30 + d * colW + 40, 12, l, { c: M, fs: 11 }); });
  return wrap(w, Math.max(h, 60), s);
}

// ===== 文章題用 =====
// 文字のおおよその幅（全角＝fs、半角＝0.58fs）
const tw = (s, fs) => [...String(s).replace(/<[^>]+>/g, '')].reduce((a, ch) => a + (ch.charCodeAt(0) > 255 ? fs : fs * .58), 0);
const carPath = (x, y, c, dir = 1) => `<g transform="translate(${x},${y}) scale(${dir < 0 ? -1 : 1},1)"><path d="M-17,3 L-17,-3 Q-16,-6 -10,-6 L-5,-12 L6,-12 L11,-6 L15,-5 Q18,-4 18,3 Z" fill="${c}"/><path d="M-3,-10 L5,-10 L8,-6 L-6,-6 Z" fill="#0b0f18" opacity=".55"/><circle cx="-9" cy="4" r="4" fill="#0b0f18" stroke="${c}" stroke-width="1.5"/><circle cx="10" cy="4" r="4" fill="#0b0f18" stroke="${c}" stroke-width="1.5"/></g>`;
// はさみ線（区間の長さ）
const span = (x1, x2, y, label, c = Y) => {
  const a = Math.min(x1, x2), b = Math.max(x1, x2);
  let s = `<line x1="${a}" y1="${y - 7}" x2="${a}" y2="${y + 7}" stroke="${c}" stroke-width="1.8"/><line x1="${b}" y1="${y - 7}" x2="${b}" y2="${y + 7}" stroke="${c}" stroke-width="1.8"/>`;
  s += `<line x1="${a + 2}" y1="${y}" x2="${b - 2}" y2="${y}" stroke="${c}" stroke-width="1.8"/><path d="M${a + 1},${y} l8,-4 v8z M${b - 1},${y} l-8,-4 v8z" fill="${c}"/>`;
  if (label) s += txt((a + b) / 2, y - 6, label, { c, fs: 14 });
  return s;
};

// コース図：min〜max の道路に、地点（marks）・車（cars）・区間（spans）をかく
// marks [{at, label, flag}] / cars [{at, label, v, dir, c, lv}] / spans [{from, to, label, lv, c}]
// signed: true で目盛りの数（0 は黄）を出す。step: 目盛りの間隔
export function course({ min = 0, max = 10, marks = [], cars = [], spans = [], signed = false, step = 1, unit = '', w = 560, pos = '' } = {}) {
  const pad = 40, X = v => pad + (v - min) / (max - min) * (w - 2 * pad);
  const rows = cars.length ? Math.max(...cars.map(c => c.lv || 0)) + 1 : 0;
  const ty = 14 + rows * 40 + (rows ? 4 : 0), rh = 22, by = ty + rh;
  let s = `<rect x="${pad - 18}" y="${ty}" width="${w - 2 * pad + 36}" height="${rh}" rx="4" fill="#2a3145"/><line x1="${pad - 12}" y1="${ty + rh / 2}" x2="${w - pad + 12}" y2="${ty + rh / 2}" stroke="#7f8aa3" stroke-width="1.5" stroke-dasharray="10 8"/>`;
  let ly = by + 18;
  if (signed) {
    for (let v = min; v <= max + 1e-9; v += step) s += `<line x1="${X(v)}" y1="${by}" x2="${X(v)}" y2="${by + 6}" stroke="${T}" stroke-width="1.5"/>` + txt(X(v), by + 21, String(+v.toFixed(2)).replace('-', '−'), { c: Math.abs(v) < 1e-9 ? Y : M, fs: 13 });
    ly = by + 26;
  }
  marks.forEach(m => {
    const x = X(m.at);
    s += `<line x1="${x}" y1="${ty - 8}" x2="${x}" y2="${by + 4}" stroke="${m.c || T}" stroke-width="2.5"/>`;
    if (m.flag) s += `<path d="M${x},${ty - 8} l14,4 l-14,4z" fill="${m.c || Y}"/>`;
    if (m.label) s += txt(x, ly + (signed ? 16 : 0), m.label, { c: m.c || T, fs: 13 });
  });
  if (marks.some(m => m.label)) ly += 14 + (signed ? 16 : 0);
  cars.forEach(c => {
    const x = X(c.at), d = c.dir ?? 1, col = c.c || [C, R, Y][cars.indexOf(c) % 3], y0 = 14 + (c.lv || 0) * 40;
    s += carPath(x, ty + rh / 2 + 1, col, d);
    if (d) s += `<line x1="${x - d * 16}" y1="${y0 + 26}" x2="${x + d * 14}" y2="${y0 + 26}" stroke="${col}" stroke-width="2.5"/><path d="M${x + d * 22},${y0 + 26} l${-d * 9},-5 v10z" fill="${col}"/>`;
    const t = [c.label, c.v].filter(Boolean).join(' '), half = tw(t, 14) / 2;
    s += txt(Math.max(4 + half, Math.min(w - 4 - half, x)), y0 + 12, t, { c: col, fs: 14 });
  });
  const lvs = spans.length ? Math.max(...spans.map(p => p.lv || 0)) + 1 : 0;
  spans.forEach(p => { s += span(X(p.from), X(p.to), ly + 20 + (p.lv || 0) * 30, p.label, p.c); });
  if (unit || pos) s += txt(w - 6, ty - 6, [pos && pos + ' →', unit].filter(Boolean).join('　'), { c: M, fs: 12, a: 'end' });
  return wrap(w, ly + 8 + lvs * 30, s);
}

// 線分図（テープ図）：rows [{name, x0, parts:[{w, label, c, dash}], under:[{from, to, label}]}]
// 幅は数量の単位で指定（全行で同じ尺度）。guides: 全行を通る点線の位置（数量）
export function tape({ rows = [], guides = [], w = 560, nameW = null } = {}) {
  const nw = nameW ?? Math.max(0, ...rows.map(r => tw(r.name || '', 14))) + (rows.some(r => r.name) ? 14 : 0);
  const tot = Math.max(...rows.map(r => (r.x0 || 0) + r.parts.reduce((a, p) => a + p.w, 0)), 1);
  const x0 = 10 + nw, sc = (w - x0 - 14) / tot, X = v => x0 + v * sc;
  const ys = []; let y = 22;
  rows.forEach(r => { ys.push(y); y += 28 + ((r.under || []).length ? Math.max(...r.under.map(u => u.lv || 0)) * 26 + 40 : 20); });
  let s = '';
  rows.forEach((r, i) => {
    const yy = ys[i]; let v = r.x0 || 0;
    if (r.name) s += txt(nw, yy + 19, r.name, { a: 'end', fs: 14, c: M });
    r.parts.forEach((p, j) => {
      const col = p.c || [C, Y, R, '#7cff6b'][j % 4], xa = X(v), xb = X(v + p.w);
      s += `<rect x="${xa}" y="${yy}" width="${xb - xa}" height="26" fill="${p.dash ? 'none' : col}" fill-opacity=".22" stroke="${col}" stroke-width="2"${p.dash ? ' stroke-dasharray="5 4"' : ''}/>`;
      if (p.label) { const lw = tw(p.label, 13), fits = lw < xb - xa - 4, cx = fits ? (xa + xb) / 2 : Math.max(4 + lw / 2, Math.min(w - 4 - lw / 2, (xa + xb) / 2)); s += txt(cx, fits ? yy + 18 : yy - 5, p.label, { c: col, fs: 13 }); }
      v += p.w;
    });
    (r.under || []).forEach(u => { s += span(X(u.from), X(u.to), yy + 50 + (u.lv || 0) * 26, u.label, u.c || T); });
  });
  guides.forEach(g => { s += `<line x1="${X(g)}" y1="10" x2="${X(g)}" y2="${y - 10}" stroke="${M}" stroke-width="1.5" stroke-dasharray="4 4"/>`; });
  return wrap(w, y - 4, s);
}

// タンクの変化：steps [{v, label, text}]（v: 量、null なら「?」）、changes ['−4L', …]（タンクの間）
export function tank({ cap = 50, steps = [], changes = [], unit = 'L', ticks = 5 } = {}) {
  const n = steps.length, tw0 = 66, th = 120, gap = Math.max(96, ...changes.map(c => tw(c ?? '', 14) + 34)), w = 20 + n * tw0 + (n - 1) * gap + 20, top = 30, h = top + th + 34;
  let s = '';
  steps.forEach((st, i) => {
    const x = 20 + i * (tw0 + gap), known = st.v != null, v = known ? st.v : cap * .5, fh = th * Math.max(0, Math.min(1, v / cap));
    s += txt(x + tw0 / 2, top - 10, st.label || '', { c: M, fs: 13 });
    s += `<rect x="${x}" y="${top + th - fh}" width="${tw0}" height="${fh}" fill="${C}" fill-opacity="${known ? .35 : .15}"${known ? '' : ` stroke="${C}" stroke-dasharray="5 4"`}/>`;
    for (let k = 1; k < ticks; k++) s += `<line x1="${x}" y1="${top + th * k / ticks}" x2="${x + 10}" y2="${top + th * k / ticks}" stroke="${M}" stroke-width="1.2"/>`;
    s += `<rect x="${x}" y="${top}" width="${tw0}" height="${th}" rx="6" fill="none" stroke="${T}" stroke-width="2.5"/>`;
    s += txt(x + tw0 / 2, top + th + 22, st.text ?? (known ? st.v + unit : '?'), { c: known ? T : Y, fs: 15 });
    if (i < n - 1 && changes[i] != null) {
      const ax = x + tw0 + 12, bx = x + tw0 + gap - 12, ay = top + th / 2;
      s += `<line x1="${ax}" y1="${ay}" x2="${bx - 6}" y2="${ay}" stroke="${Y}" stroke-width="2.5"/><path d="M${bx},${ay} l-10,-6 v12z" fill="${Y}"/>` + txt((ax + bx) / 2, ay - 10, changes[i], { c: Y, fs: 14 });
    }
  });
  return wrap(w, h, s);
}

// 流れ図（ギアのつながりなど）：steps [{label, sub, rev}]。from/to は両端の丸の文字
// rev: true なら回転の向きが逆になるギア（赤）、false はチェーン（水色）
export function flow({ steps = [], from = '入口', to = '出口', fromSub = '右回り', toSub = '?' } = {}) {
  const n = steps.length, end = 74, gap = 26, bw = 100, h = 118, cy = 54;
  const used = n * bw + (n + 1) * gap + 2 * end, w = Math.max(560, used), x0 = (w - used) / 2;
  const node = (x, a, b, c) => `<circle cx="${x}" cy="${cy}" r="30" fill="none" stroke="${c}" stroke-width="2.5"/>` + txt(x, cy - 2, a, { fs: 14, c }) + txt(x, cy + 16, b, { fs: 13, c: c === Y ? Y : M });
  const arrow = (a, b) => `<line x1="${a}" y1="${cy}" x2="${b - 7}" y2="${cy}" stroke="${M}" stroke-width="2"/><path d="M${b},${cy} l-9,-5 v10z" fill="${M}"/>`;
  let s = node(x0 + end / 2, from, fromSub, T), x = x0 + end;
  steps.forEach(st => {
    const c = st.rev ? R : C, bx = x + gap;
    s += arrow(x - (x === x0 + end ? end / 2 - 30 : 0), bx);
    s += `<rect x="${bx}" y="${cy - 34}" width="${bw}" height="68" rx="10" fill="${c}" fill-opacity=".12" stroke="${c}" stroke-width="2"/>`;
    s += `<circle cx="${bx + 16}" cy="${cy - 18}" r="8" fill="none" stroke="${c}" stroke-width="5" stroke-dasharray="3 2.3"/>`;
    s += txt(bx + bw / 2 + 8, cy - 13, st.rev ? '向き逆' : (st.kind || 'そのまま'), { c, fs: 12 }) + txt(bx + bw / 2, cy + 16, st.label, { fs: 16 });
    if (st.sub) s += txt(bx + bw / 2, cy + 50, st.sub, { c: M, fs: 12 });
    x = bx + bw;
  });
  s += arrow(x, x + gap + end / 2 - 30) + node(x + gap + end / 2, to, toSub, Y);
  return wrap(w, h, s);
}

// かみ合う2つのギア：a, b = { name, teeth, rpm }（数は文字列で。わからない所は '?'）
export function gearPair(a, b) {
  const R = t => 26 + (parseFloat(t) || 30) * 1.6;
  const r1 = R(a.teeth), r2 = R(b.teeth), cy = 22 + Math.max(r1, r2), c1 = 40 + r1, c2 = c1 + r1 + r2 + 8, w = Math.max(560, c2 + r2 + 40), h = cy + Math.max(r1, r2) + 62;
  const gear = (cx, r, n, col) => {
    const k = parseFloat(n) || 30, seg = 2 * Math.PI * r / k / 2;
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${col}" stroke-width="10" stroke-dasharray="${seg.toFixed(2)} ${seg.toFixed(2)}"/><circle cx="${cx}" cy="${cy}" r="${r - 5}" fill="${col}" fill-opacity=".12" stroke="${col}" stroke-width="2"/><circle cx="${cx}" cy="${cy}" r="6" fill="${col}"/>`;
  };
  const rot = (cx, r, cw, col) => { const rr = r * .55, a0 = -2.4, a1 = -0.7; const p = t => [cx + rr * Math.cos(t), cy + rr * Math.sin(t)]; const [s0, s1] = cw ? [p(a0), p(a1)] : [p(a1), p(a0)]; return `<path d="M${s0[0].toFixed(1)},${s0[1].toFixed(1)} A${rr},${rr} 0 0 ${cw ? 1 : 0} ${s1[0].toFixed(1)},${s1[1].toFixed(1)}" fill="none" stroke="${col}" stroke-width="2.5" marker-end="url(#ga)"/>`; };
  let s = `<defs><marker id="ga" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L10,5 L0,10z" fill="${T}"/></marker></defs>`;
  s += gear(c1, r1, a.teeth, C) + gear(c2, r2, b.teeth, Y) + rot(c1, r1, true, T) + rot(c2, r2, false, T);
  [[c1, a, C], [c2, b, Y]].forEach(([cx, g, col]) => {
    const y0 = cy + Math.max(r1, r2) + 20;
    s += txt(cx, y0, g.name || '', { c: col, fs: 14 }) + txt(cx, y0 + 18, '歯数 ' + g.teeth, { c: g.teeth === '?' ? Y : T, fs: 14 }) + (g.rpm == null ? '' : txt(cx, y0 + 36, g.rpm === '?' ? '毎分 ? 回転' : '毎分' + g.rpm + '回転', { c: g.rpm === '?' ? Y : T, fs: 14 }));
  });
  return wrap(w, h, s);
}
