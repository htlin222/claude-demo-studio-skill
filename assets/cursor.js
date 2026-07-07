/* =========================================================================
   Claude Demo Studio — fake cursor (move / click / type)
   A screencast-style pointer driven by a scenario timeline:
     "cursor": [
       { "at": 300,  "kind": "move",  "target": ".composer .input", "ms": 700 },
       { "at": 1100, "kind": "type",  "target": ".composer .input", "text": "Explain photosynthesis", "cps": 18 },
       { "at": 3000, "kind": "move",  "target": ".send" },
       { "at": 3400, "kind": "click", "target": ".send" }
     ]
   kinds: move (glide to element), click (ripple + dispatch click), type
   (type text into an element, cps = chars/sec). Deterministic under
   Chrome virtual-time.
   ========================================================================= */
(() => {
  const S = window.SCENARIO || {};
  const acts = S.cursor;
  if (!acts || !acts.length) return;

  const cur = document.createElement("div");
  cur.className = "studio-cursor";
  // classic macOS arrow pointer
  cur.innerHTML =
    '<svg viewBox="0 0 24 24"><path d="M5 2l0 18 4.2-4.2 2.8 6 3-1.3-2.8-6L20 12z" '
    + 'fill="#fff" stroke="#111" stroke-width="1.2" stroke-linejoin="round"/></svg>';
  document.body.appendChild(cur);

  let x = window.innerWidth * 0.5, y = window.innerHeight * 0.72;
  const place = () => { cur.style.transform = `translate(${x}px, ${y}px)`; };
  place();

  function centerOf(sel) {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, el };
  }
  function moveTo(sel, ms) {
    const p = centerOf(sel);
    if (!p) return;
    cur.style.transition = `transform ${ms || 600}ms cubic-bezier(.4, 0, .2, 1)`;
    x = p.x; y = p.y; place();
  }
  function click(sel) {
    const p = centerOf(sel);
    if (p) { x = p.x; y = p.y; place(); }
    cur.classList.remove("click");
    void cur.offsetWidth;           // restart the ripple animation
    cur.classList.add("click");
    if (p && p.el) p.el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  }
  function type(sel, text, cps) {
    const el = document.querySelector(sel);
    if (!el) return;
    el.textContent = "";
    let i = 0;
    const iv = setInterval(() => {
      i += 1;
      el.textContent = text.slice(0, i);
      if (i >= text.length) clearInterval(iv);
    }, 1000 / (cps || 16));
  }

  acts.forEach((a) => setTimeout(() => {
    if (a.kind === "move") moveTo(a.target, a.ms);
    else if (a.kind === "click") click(a.target);
    else if (a.kind === "type") type(a.target, a.text, a.cps);
  }, a.at || 0));
})();
