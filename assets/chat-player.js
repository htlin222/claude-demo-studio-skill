/* =========================================================================
   Claude Demo Studio — chat player
   Renders a claude.ai chat conversation from window.SCENARIO and plays the
   streaming animation (thinking spark -> shimmer label -> per-block fade ->
   typed body with blinking caret -> action row). Deterministic under Chrome
   virtual-time, so `scripts/record.sh` can capture it frame-by-frame.
   Scenario schema: see references/scenario-schema.md
   ========================================================================= */
(() => {
  const S = window.SCENARIO || {};
  const root = document.getElementById('app');
  document.documentElement.dataset.theme = S.theme || 'light';

  const ICON = {
    plus:'<path d="M12 5v14M5 12h14" stroke-linecap="round"/>',
    chat:'<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-5.2A8 8 0 1 1 21 12z" stroke-linejoin="round"/>',
    projects:'<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M3 10h18"/>',
    code:'<path d="M9 18l-6-6 6-6M15 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round"/>',
    chevD:'<path d="M6 9l6 6 6-6" stroke-linecap="round"/>',
    mic:'<rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3" stroke-linecap="round"/>',
    up:'<path d="M12 19V5M5 12l7-7 7 7" stroke-linecap="round" stroke-linejoin="round"/>',
    copy:'<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
    speak:'<path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/>',
    up2:'<path d="M7 10v11H4V10zM7 10l5-7a2 2 0 0 1 3 2l-1 5h5a2 2 0 0 1 2 2.4l-1.5 7A2 2 0 0 1 16.5 21H7"/>',
    down:'<path d="M17 14V3h3v11zM17 14l-5 7a2 2 0 0 1-3-2l1-5H5a2 2 0 0 1-2-2.4l1.5-7A2 2 0 0 1 7.5 3H17"/>',
    retry:'<path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5"/>',
  };
  const svg = (p, w) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w||1.7}">${p}</svg>`;
  const esc = s => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  // ---- static shell --------------------------------------------------------
  root.className = 'app';
  root.innerHTML = `
    <nav class="rail">
      <div class="logo">✳</div>
      <div class="rail-btn">${svg(ICON.plus)}</div>
      <div class="rail-btn">${svg(ICON.chat)}</div>
      <div class="rail-btn">${svg(ICON.projects)}</div>
      <div class="rail-btn">${svg(ICON.code)}</div>
      <div class="spacer"></div>
      <div class="avatar">${esc(S.user || 'HL')}</div>
    </nav>
    <div class="main">
      <header class="topbar">
        <div class="title"><span>${esc(S.title || 'New chat')}</span>${svg(ICON.chevD,2)}</div>
        <div class="grow"></div>
        <button class="btn-ghost">Share</button>
      </header>
      <div class="thread"><div class="thread-inner" id="thread"></div></div>
      <div class="composer-wrap"><div class="composer-inner">
        <div class="composer">
          <div class="input" data-placeholder="Reply to Claude…"></div>
          <div class="composer-row">
            <button class="icon-btn">${svg(ICON.plus,1.8)}</button>
            <div class="grow"></div>
            <div class="model-pill"><b>${esc(S.model || 'Opus 4.8')}</b><span>${esc(S.tier || 'Max')}</span>${svg(ICON.chevD,2)}</div>
            <button class="icon-btn">${svg(ICON.mic,1.8)}</button>
            <button class="send">${svg(ICON.up,2)}</button>
          </div>
        </div>
      </div></div>
      <div class="disclaimer">Claude is AI and can make mistakes. Please double-check responses.</div>
    </div>`;

  const thread = document.getElementById('thread');

  // ---- renderers -----------------------------------------------------------
  function addUser(text) {
    const el = document.createElement('div');
    el.className = 'msg user anim-rise';
    el.innerHTML = `<div class="bubble">${esc(text)}</div>`;
    thread.appendChild(el);
    scroll();
  }
  function actionRow() {
    return `<div class="actions">
      <div class="act">${svg(ICON.copy)}</div><div class="act">${svg(ICON.speak)}</div>
      <div class="act">${svg(ICON.up2)}</div><div class="act">${svg(ICON.down)}</div>
      <div class="act">${svg(ICON.retry)}</div></div>`;
  }
  function scroll() { const t = document.querySelector('.thread'); t.scrollTop = t.scrollHeight; }

  // typed reveal of a plain string into an element, 4 chars / tick
  function typeInto(el, text, speed, done) {
    const caret = document.createElement('span'); caret.className = 'caret';
    el.appendChild(caret);
    let i = 0; const step = Math.max(1, Math.round(4 * (speed || 1)));
    const t = setInterval(() => {
      i += step;
      caret.insertAdjacentText('beforebegin', text.slice(i - step, i));
      scroll();
      if (i >= text.length) { clearInterval(t); caret.remove(); done && done(); }
    }, 45);
  }

  // ---- sequencer -----------------------------------------------------------
  const at = (ms, fn) => setTimeout(fn, ms);

  function playAssistant(m, whenDone) {
    const el = document.createElement('div');
    el.className = 'msg assistant';
    thread.appendChild(el);
    // thinking phase
    el.innerHTML = `<span class="spark-thinking">✳</span> <span class="shimmer-label">${esc(m.thinkingLabel || 'Thinking…')}</span>`;
    scroll();
    const thinkMs = m.thinkingMs != null ? m.thinkingMs : 1300;
    at(thinkMs, () => {
      el.innerHTML = (m.thinking ? `<div class="thought">${svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2" stroke-linecap="round"/>')}${esc(m.thinking)}</div>` : '') + `<div class="content"></div>`;
      const content = el.querySelector('.content');
      const blocks = m.blocks || (m.body ? [{ type:'p', text:m.body }] : []);
      let bi = 0;
      const nextBlock = () => {
        if (bi >= blocks.length) { el.insertAdjacentHTML('beforeend', actionRow()); scroll(); return whenDone && whenDone(); }
        const b = blocks[bi++];
        const node = document.createElement(b.type === 'h3' ? 'h3' : b.type === 'code' ? 'pre' : b.type === 'ul' ? 'ul' : 'p');
        node.classList.add('anim-fade');
        content.appendChild(node); scroll();
        if (b.type === 'ul') { node.innerHTML = (b.items||[]).map(x => `<li>${esc(x)}</li>`).join(''); at(220, nextBlock); }
        else if (b.type === 'h3') { node.textContent = b.text; at(260, nextBlock); }
        else if (b.type === 'code') { node.textContent = b.text; at(300, nextBlock); }
        else { typeInto(node, b.text, S.speed, () => at(160, nextBlock)); }
      };
      nextBlock();
    });
  }

  function run() {
    document.body.classList.add('recording');
    const ci = document.querySelector('.composer .input');   // clear composer on send
    if (ci) ci.textContent = '';
    const msgs = S.messages || [];
    let idx = 0;
    const nextMsg = () => {
      if (idx >= msgs.length) { window.__STUDIO_DONE = true; return; }
      const m = msgs[idx++];
      if (m.role === 'user') { addUser(m.text); at(500, nextMsg); }
      else playAssistant(m, () => at(700, nextMsg));
    };
    nextMsg();
  }

  // estimate total duration (ms) for the recorder
  window.__STUDIO_DURATION = (() => {
    let d = 500;
    for (const m of (S.messages || [])) {
      if (m.role === 'user') d += 1000;
      else {
        d += (m.thinkingMs != null ? m.thinkingMs : 1300) + 700;
        const blocks = m.blocks || (m.body ? [{ type:'p', text:m.body }] : []);
        for (const b of blocks) {
          if (b.type === 'p') d += (b.text.length / (4 * (S.speed||1))) * 45 + 160;
          else d += 300;
        }
      }
    }
    return Math.ceil(d + 1200);           // + tail hold
  })();

  if (S.autoplay !== false) {
    if (S.startDelayMs) setTimeout(run, S.startDelayMs);  // let the cursor type first
    else run();
  } else run();
})();
