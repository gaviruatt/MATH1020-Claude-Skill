# MATH1020 maths engine

One script that renders typeset maths cards (KaTeX) and interactive calculus diagrams (JSXGraph, math.js, Plotly) inside a Claude chat widget. Hosting it here lets a widget load it from jsDelivr instead of carrying the code in every post.

```html
<div id="w">…optional card with $inline$ and $$display$$ maths…</div>
<script>var D={kind:'graph',fns:['x^3 - 3x'],x:[-3,3]}</script>
<script src="https://cdn.jsdelivr.net/gh/gaviruatt/math1020-claude-skill@v1/maths-engine.min.js"></script>
```

`D.kind` is `graph`, `region` or `revolution`; omit `D` for a card with no diagram. `maths-engine.js` is the readable source of `maths-engine.min.js`.
