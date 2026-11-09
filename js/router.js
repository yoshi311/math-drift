// ハッシュルーター
const routes = [];
let cleanup = null;
export function route(pattern, handler) {
  const keys = [];
  const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
  routes.push({ re, keys, handler });
}
export function go(path, replace = false) {
  const h = '#' + path;
  if (replace) location.replace(h); else if (location.hash === h) render(); else location.hash = h;
}
export function back(fallback = '/home') {
  if (history.length > 1) history.back(); else go(fallback);
}
export function current() { return location.hash.slice(1) || '/'; }

export function render() {
  const path = current().split('?')[0];
  const app = document.getElementById('app');
  if (typeof cleanup === 'function') { try { cleanup(); } catch {} }
  cleanup = null;
  for (const r of routes) {
    const m = path.match(r.re);
    if (m) {
      const params = {}; r.keys.forEach((k, i) => params[k] = decodeURIComponent(m[i + 1]));
      app.innerHTML = '';
      window.scrollTo(0, 0);
      app.classList.remove('screen-in'); void app.offsetWidth; app.classList.add('screen-in');
      cleanup = r.handler(app, params) || null;
      return;
    }
  }
  go('/home', true);
}
export function start() { window.addEventListener('hashchange', render); render(); }
