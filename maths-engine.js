(() => {
const MARKUP = '<div id="m1020" style="font:14px system-ui,sans-serif;color:var(--text-primary,#222)"><div id="m-title" style="font-weight:600;margin-bottom:6px"></div><div id="m-board" style="width:100%;height:340px;border:1px solid var(--border,#ccc);border-radius:8px"></div><div id="m-3d-wrap" style="display:none;margin-top:8px"><div id="m-3d" style="width:100%;height:340px;border:1px solid var(--border,#ccc);border-radius:8px"></div><label style="color:var(--text-secondary,#555);font-size:12px">Rotate through <span id="m-deg">270</span>° <input id="m-sweep" type="range" min="10" max="360" value="270" style="width:60%;vertical-align:middle"></label></div><div id="m-live" style="color:var(--text-accent,#2563eb);margin-top:6px;min-height:1.2em"></div><ul id="m-notes" style="color:var(--text-secondary,#555);margin:4px 0 0;padding-left:18px"></ul></div>';
const W = document.getElementById('w');
if (W) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css'; document.head.appendChild(l); }
const K = 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/';
const D = window.D;
const CDN = 'https://cdn.jsdelivr.net/npm/';
const load = src => new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => no(new Error('could not load ' + src)); document.head.appendChild(s); });
const $ = id => document.getElementById(id);
const css = (v, d) => (getComputedStyle(document.documentElement).getPropertyValue(v) || '').trim() || d;
const FG = css('--text-primary', '#222'), MUTED = css('--text-secondary', '#666');
const COL = ['#2563eb', '#ea580c', '#0d9488', '#9333ea'];
const KIND = { 'local max': '#dc2626', 'local min': '#16a34a', 'inflection': '#9333ea', 'stationary inflection': '#9333ea', 'intersection': '#ca8a04', 'root': MUTED };
const fmt = v => { if (!isFinite(v)) return String(v); const r = Math.round(v * 1000) / 1000; return (Object.is(r, -0) ? 0 : r).toString().replace('-', '−'); };
const pt = (x, y) => `(${fmt(x)}, ${fmt(y)})`;
const note = t => { const li = document.createElement('li'); li.innerHTML = t; $('m-notes').appendChild(li); };
const tidy = s => String(s).replace(/\bln\(/g, 'log(').replace(/\barc(sin|cos|tan)\b/g, 'a$1').replace(/\b(sin|cos|tan)\^-1\b/g, 'a$1');

function compile(s, v) {
  const node = math.parse(tidy(s));
  const c = node.compile(), sc = {};
  const f = t => { sc[v] = t; try { const r = c.evaluate(sc); return typeof r === 'number' ? r : NaN; } catch { return NaN; } };
  let d1, d2;
  try { const n1 = math.derivative(node, v); d1 = n1.compile(); d2 = math.derivative(n1, v).compile(); } catch {}
  const h = 1e-4;
  f.d1 = d1 ? t => { sc[v] = t; return +d1.evaluate(sc); } : t => (f(t + h) - f(t - h)) / (2 * h);
  f.d2 = d2 ? t => { sc[v] = t; return +d2.evaluate(sc); } : t => (f(t + h) - 2 * f(t) + f(t - h)) / (h * h);
  return f;
}
const num = (v, d) => v === undefined || v === null ? d : typeof v === 'number' ? v : math.evaluate(tidy(v));

// Roots of g on [a,b]: sign changes, plus touching zeros (|g| local min ~ 0).
function roots(g, a, b, n = 1200) {
  const out = [], h = (b - a) / n;
  const bis = (l, r) => { for (let i = 0; i < 80; i++) { const m = (l + r) / 2; (g(l) * g(m) <= 0) ? r = m : l = m; } return (l + r) / 2; };
  let prev = g(a);
  for (let i = 1; i <= n; i++) {
    const t = a + i * h, cur = g(t);
    if (isFinite(prev) !== isFinite(cur)) { // domain edge, e.g. sqrt(x) at 0
      let l = t - h, r = t; for (let j = 0; j < 60; j++) { const m = (l + r) / 2; (isFinite(g(m)) === isFinite(prev)) ? l = m : r = m; }
      const e = isFinite(prev) ? l : r; if (Math.abs(g(e)) < 1e-6) out.push(e);
    } else if (isFinite(prev) && isFinite(cur)) {
      if (prev === 0) out.push(t - h);
      else if (prev * cur < 0) out.push(bis(t - h, t));
      else if (i < n) { const nx = g(t + h); if (Math.abs(cur) < Math.abs(prev) && Math.abs(cur) < Math.abs(nx) && Math.abs(cur) < 1e-6 * (1 + Math.abs(prev))) out.push(t); }
    }
    prev = cur;
  }
  return out.filter((r, i) => i === 0 || Math.abs(r - out[i - 1]) > h * 2);
}
function simpson(g, a, b, n = 2000) { const h = (b - a) / n; let s = g(a) + g(b); for (let i = 1; i < n; i++) s += (i % 2 ? 4 : 2) * g(a + i * h); return s * h / 3; }
function special(f, a, b) {
  const m = [];
  for (const x of roots(f.d1, a, b)) {
    const s = f.d2(x), e = (b - a) * 1e-3, l = f.d1(x - e), r = f.d1(x + e);
    const kind = l > 0 && r < 0 ? 'local max' : l < 0 && r > 0 ? 'local min' : Math.abs(s) > 1e-9 ? (s < 0 ? 'local max' : 'local min') : 'stationary inflection';
    m.push({ x, y: f(x), kind });
  }
  for (const x of roots(f.d2, a, b)) {
    const e = (b - a) * 1e-3;
    if (f.d2(x - e) * f.d2(x + e) < 0 && !m.some(p => Math.abs(p.x - x) < e)) m.push({ x, y: f(x), kind: 'inflection' });
  }
  return m.sort((p, q) => p.x - q.x);
}
function yBox(fs, a, b, extra = []) {
  const ys = extra.slice();
  for (const f of fs) for (let i = 0; i <= 300; i++) { const y = f(a + (b - a) * i / 300); if (isFinite(y)) ys.push(y); }
  ys.sort((p, q) => p - q);
  let lo = ys[Math.floor(ys.length * 0.02)] ?? -5, hi = ys[Math.ceil(ys.length * 0.98) - 1] ?? 5;
  for (const e of extra) { lo = Math.min(lo, e); hi = Math.max(hi, e); }
  if (lo > 0 && lo < (hi - lo) * 0.5) lo = 0; if (hi < 0 && -hi < (hi - lo) * 0.5) hi = 0;
  if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
  const p = (hi - lo) * 0.12; return [lo - p, hi + p];
}
function board(xb, yb, eq) {
  JXG.Options.text.strokeColor = FG; JXG.Options.label.strokeColor = FG; JXG.Options.text.fontSize = 13;
  const ax = { strokeColor: MUTED, ticks: { strokeColor: MUTED, label: { strokeColor: MUTED } } };
  return JXG.JSXGraph.initBoard('m-board', { boundingbox: [xb[0], yb[1], xb[1], yb[0]], axis: true, keepaspectratio: !!eq, showCopyright: false, showNavigation: true, pan: { enabled: true, needShift: false }, zoom: { wheel: true, needShift: false }, defaultAxes: { x: ax, y: ax } });
}
const mark = (b, m, show) => b.create('point', [m.x, m.y], { name: show ? pt(m.x, m.y) : '', size: 4, fixed: true, color: KIND[m.kind] || FG, label: { offset: [6, 10], strokeColor: FG } });
// A curve in variable v: v='x' means y=f(x), v='y' means x=f(y).
const curve = (b, f, v, a, c, o) => v === 'y' ? b.create('curve', [t => f(t), t => t, a, c], o) : b.create('functiongraph', [f, a, c], o);
const P = (v, t, w) => v === 'y' ? [w, t] : [t, w];

function graph() {
  const [a, b] = D.x || [-5, 5], show = !D.hide;
  const fs = D.fns.map(s => compile(s, 'x')), ms = [];
  fs.forEach((f, i) => special(f, a, b).forEach(m => ms.push({ ...m, kind: fs.length > 1 ? m.kind + ' of ' + D.fns[i] : m.kind })));
  if (fs.length > 1) for (let i = 0; i < fs.length; i++) for (let j = i + 1; j < fs.length; j++) roots(t => fs[i](t) - fs[j](t), a, b).forEach(x => ms.push({ x, y: fs[i](x), kind: 'intersection' }));
  (D.points || []).forEach(p => ms.push({ x: num(p.x), y: num(p.y, fs[0](num(p.x))), kind: p.label || 'point' }));
  const brd = board([a, b], D.y || yBox(fs, a, b, ms.map(m => m.y)), D.equal);
  const cs = fs.map((f, i) => brd.create('functiongraph', [f], { strokeColor: COL[i % 4], strokeWidth: 2.5, name: fs.length > 1 ? D.fns[i] : '', withLabel: fs.length > 1 }));
  ms.forEach(m => mark(brd, { ...m, kind: m.kind.split(' of ')[0] }, show));
  ms.forEach(m => note(`${m.kind}${show ? ' at ' + pt(m.x, m.y) : ''}`));
  if (D.tangent !== false) {
    const f = fs[0], x0 = D.tangentAt !== undefined ? num(D.tangentAt) : a + (b - a) * 0.3;
    const g = brd.create('glider', [x0, f(x0), cs[0]], { name: '', size: 5, color: '#f59e0b' });
    brd.create('tangent', [g], { strokeColor: '#f59e0b', dash: 2, strokeWidth: 1.5 });
    const live = () => { const x = g.X(); $('m-live').textContent = show ? `Drag the orange point: x = ${fmt(x)}, f(x) = ${fmt(f(x))}, f′(x) = ${fmt(f.d1(x))}, f″(x) = ${fmt(f.d2(x))}` : 'Drag the orange point to see the tangent move.'; };
    g.on('drag', live); brd.on('update', live); live();
  }
}

function limits(f, g, v) {
  if (D.a !== undefined && D.b !== undefined) return [num(D.a), num(D.b)];
  const [lo, hi] = D.x || [-10, 10], r = roots(t => f(t) - g(t), lo, hi);
  if (r.length < 2) throw new Error('Give a and b: the curves don’t meet twice in ' + `[${lo}, ${hi}]`);
  return [num(D.a, r[0]), num(D.b, r[r.length - 1])];
}
function region() {
  const v = D.in || 'x', f = compile(D.f, v), g = compile(D.g ?? '0', v), [a, b] = limits(f, g, v), show = !D.hide;
  const w = b - a, ext = [f(a), f(b), g(a), g(b)];
  const ib = yBox([f, g], a, b, ext), tb = [a - w * 0.25, b + w * 0.25];
  const brd = v === 'y' ? board(ib, tb, D.equal) : board(tb, ib, D.equal);
  drawRegion(brd, f, g, v, a, b);
  const A = simpson(t => Math.abs(f(t) - g(t)), a, b);
  note(`Bounds ${v} = ${fmt(a)} to ${fmt(b)}`);
  note(show ? `Area = ${fmt(A)}` : 'Area: your turn');
}
function drawRegion(brd, f, g, v, a, b) {
  const n = 200, xs = [], ys = [];
  for (let i = 0; i <= n; i++) { const t = a + (b - a) * i / n, p = P(v, t, f(t)); xs.push(p[0]); ys.push(p[1]); }
  for (let i = n; i >= 0; i--) { const t = a + (b - a) * i / n, p = P(v, t, g(t)); xs.push(p[0]); ys.push(p[1]); }
  brd.create('curve', [xs, ys], { strokeWidth: 0, fillColor: COL[0], fillOpacity: 0.22, highlight: false });
  const w = b - a;
  const fc = curve(brd, f, v, a - w * 0.25, b + w * 0.25, { strokeColor: COL[0], strokeWidth: 2.5, name: (v === 'y' ? 'x = ' : 'y = ') + D.f, withLabel: true, label: { position: 'rt', offset: [-10, 10] } });
  curve(brd, g, v, a - w * 0.25, b + w * 0.25, { strokeColor: COL[1], strokeWidth: 2.5, name: (v === 'y' ? 'x = ' : 'y = ') + (D.g ?? '0'), withLabel: !!D.g, label: { position: 'rt', offset: [-10, -10] } });
  return fc;
}

function revolution() {
  const v = D.in || 'x', axis = D.axis || 'x', k = num(D.at, 0), f = compile(D.f, v), g = compile(D.g ?? '0', v), [a, b] = limits(f, g, v), show = !D.hide;
  const parallel = axis === v, w = b - a;
  // The axis is the line {axis-direction} at the other coordinate = k.
  let V, method;
  if (parallel) {
    const R = t => Math.max(Math.abs(f(t) - k), Math.abs(g(t) - k)), r = t => (f(t) - k) * (g(t) - k) > 0 ? Math.min(Math.abs(f(t) - k), Math.abs(g(t) - k)) : 0;
    V = Math.PI * simpson(t => R(t) ** 2 - r(t) ** 2, a, b);
    method = simpson(r, a, b) < 1e-9 ? 'discs' : 'washers';
  } else { V = 2 * Math.PI * simpson(t => Math.abs(t - k) * Math.abs(f(t) - g(t)), a, b); method = 'cylindrical shells'; }
  // 2D panel: region, mirror image across the axis, the axis, one draggable slice.
  const ib = parallel ? yBox([f, g, t => 2 * k - f(t), t => 2 * k - g(t)], a, b, [k]) : yBox([f, g], a, b);
  let tb = [Math.min(a, parallel ? a : 2 * k - b) - w * 0.2, Math.max(b, parallel ? b : 2 * k - a) + w * 0.2];
  if (!parallel) tb = [Math.min(tb[0], k - w * 0.2), Math.max(tb[1], k + w * 0.2)];
  const brd = v === 'y' ? board(ib, tb, true) : board(tb, ib, true);
  const fc = drawRegion(brd, f, g, v, a, b);
  const ax = axis === 'x' ? [[0, k], [1, k]] : [[k, 0], [k, 1]];
  brd.create('line', ax, { strokeColor: '#dc2626', dash: 3, strokeWidth: 2, name: (axis === 'x' ? 'y = ' : 'x = ') + fmt(k), withLabel: true });
  const s0 = num(D.slice, (a + b) / 2);
  const sl = brd.create('glider', [...P(v, s0, f(s0)), fc], { name: '', size: 5, color: '#f59e0b' });
  const tOf = () => Math.min(b, Math.max(a, v === 'y' ? sl.Y() : sl.X())), dt = w / 25;
  const strip = mir => { const c = brd.create('curve', [[], []], { fillColor: '#f59e0b', fillOpacity: mir ? 0.25 : 0.6, strokeColor: '#f59e0b', strokeWidth: 1, dash: mir ? 2 : 0 });
    c.updateDataArray = function () { const t = tOf(), t2 = Math.min(b, t + dt), X = [], Y = [];
      const q = (s, u) => { const p = P(v, s, u), i = (parallel ? v === 'x' : v === 'y') ? 1 : 0; if (mir) p[i] = 2 * k - p[i]; X.push(p[0]); Y.push(p[1]); };
      q(t, g(t)); q(t2, g(t)); q(t2, f(t)); q(t, f(t)); q(t, g(t)); this.dataX = X; this.dataY = Y; }; };
  strip(false); strip(true);
  const live = () => { const t = tOf(), d = parallel ? null : Math.abs(t - k);
    $('m-live').textContent = !show ? 'Drag the orange point to move the slice.' : parallel
      ? `Slice at ${v} = ${fmt(t)}: outer radius R = ${fmt(Math.max(Math.abs(f(t) - k), Math.abs(g(t) - k)))}${method === 'washers' ? `, inner radius r = ${fmt(Math.min(Math.abs(f(t) - k), Math.abs(g(t) - k)))}` : ''}`
      : `Shell at ${v} = ${fmt(t)}: radius = ${fmt(d)}, height = ${fmt(Math.abs(f(t) - g(t)))}`; };
  sl.on('drag', live); live();
  note(`Region from ${v} = ${fmt(a)} to ${fmt(b)}, rotated about ${axis === 'x' ? 'y' : 'x'} = ${fmt(k)}`);
  note(`Method: ${method}`);
  note(show ? `Volume ≈ ${fmt(V)} = ${fmt(V / Math.PI)}π` : 'Volume: your turn');
  // 3D solid: rotate the region's closed boundary about the axis.
  $('m-3d-wrap').style.display = '';
  const bd = [];
  for (let i = 0; i <= 120; i++) { const t = a + w * i / 120; bd.push(P(v, t, f(t))); }
  for (let i = 120; i >= 0; i--) { const t = a + w * i / 120; bd.push(P(v, t, g(t))); }
  bd.push(bd[0]);
  const rot = (p, th) => axis === 'x' ? [p[0], k + (p[1] - k) * Math.cos(th), (p[1] - k) * Math.sin(th)] : [k + (p[0] - k) * Math.cos(th), p[1], (p[0] - k) * Math.sin(th)];
  const draw3d = deg => {
    const ths = Array.from({ length: 49 }, (_, j) => deg * Math.PI / 180 * j / 48), X = [], Y = [], Z = [];
    for (const p of bd) { const r = ths.map(th => rot(p, th)); X.push(r.map(q => q[0])); Y.push(r.map(q => q[1])); Z.push(r.map(q => q[2])); }
    const ax3 = axis === 'x' ? { x: [tb[0], tb[1]], y: [k, k] } : { x: [k, k], y: [ib[0], ib[1]] };
    const lay = { margin: { l: 0, r: 0, t: 0, b: 0 }, paper_bgcolor: 'rgba(0,0,0,0)', font: { color: FG }, showlegend: false,
      scene: { aspectmode: 'data', xaxis: { title: 'x', color: MUTED }, yaxis: { title: 'y', color: MUTED }, zaxis: { title: '', color: MUTED }, camera: { eye: { x: 1.2, y: 0.9, z: 1.3 }, up: { x: 0, y: 1, z: 0 } } } };
    Plotly.react('m-3d', [
      { type: 'surface', x: X, y: Y, z: Z, showscale: false, opacity: 0.85, colorscale: [[0, COL[0]], [1, COL[2]]], surfacecolor: Z.map(r => r.map((_, j) => j)), hoverinfo: 'skip' },
      { type: 'scatter3d', mode: 'lines', x: ax3.x, y: ax3.y, z: [0, 0], line: { color: '#dc2626', width: 5, dash: 'dash' } },
      { type: 'scatter3d', mode: 'lines', x: bd.map(p => p[0]), y: bd.map(p => p[1]), z: bd.map(() => 0), line: { color: '#f59e0b', width: 6 } }
    ], lay, { displaylogo: false, responsive: true });
  };
  $('m-sweep').oninput = e => { $('m-deg').textContent = e.target.value; draw3d(+e.target.value); };
  return draw3d;
}

if (W) load(K + 'katex.min.js').then(() => load(K + 'contrib/auto-render.min.js')).then(() => renderMathInElement(W, { delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }] }));
if (!D || !D.kind) return;
const box = document.createElement('div'); box.innerHTML = MARKUP; (W ? W.after(box) : document.body.appendChild(box));
const css3 = document.createElement('link'); css3.rel = 'stylesheet'; css3.href = CDN + 'jsxgraph@1.10.1/distrib/jsxgraph.css'; document.head.appendChild(css3);
$('m-title').textContent = D.title || '';
Promise.all([load(CDN + 'mathjs@13.2.0/lib/browser/math.js'), load(CDN + 'jsxgraph@1.10.1/distrib/jsxgraphcore.js')])
  .then(async () => {
    if (D.kind === 'graph') return graph();
    if (D.kind === 'region') return region();
    const draw3d = revolution(); await load(CDN + 'plotly.js-dist-min@2.35.2/plotly.min.js'); draw3d(270);
  })
  .catch(e => { $('m-live').style.color = 'var(--text-danger,#c00)'; $('m-live').textContent = 'Could not draw this: ' + e.message; });
})();
