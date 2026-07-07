/* =========================================================================
   Claude Demo Studio — code-session player
   Renders a claude.ai/code session from window.SCENARIO: user/assistant text,
   Ran/Running tool rows (+ expandable diff detail), AskUserQuestion option
   picker (single & multi), status line, and the permission-mode menu
   (Manual / Accept edits / Plan / Auto / Bypass) with Plan & Bypass banners.
   Turns reveal sequentially so a recording reads as "the agent working".
   Scenario schema: see references/scenario-schema.md
   ========================================================================= */
(() => {
  const S = window.SCENARIO || {};
  const root = document.getElementById('app');
  document.documentElement.dataset.theme = S.theme || 'light';

  const ICON = {
    plus:'<path d="M12 5v14M5 12h14" stroke-linecap="round"/>',
    code:'<path d="M9 18l-6-6 6-6M15 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round"/>',
    bolt:'<path d="M13 2L3 14h7l-1 8 10-12h-7z" stroke-linejoin="round"/>',
    mon:'<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 20h8M12 17v3"/>',
    chevR:'<path d="M9 6l6 6-6 6" stroke-linecap="round"/>',
    chevD:'<path d="M6 9l6 6 6-6" stroke-linecap="round"/>',
    mic:'<rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3" stroke-linecap="round"/>',
    check:'<path d="M5 12l5 5L20 6" stroke-linecap="round" stroke-linejoin="round"/>',
    plan:'<path d="M9 11l3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" stroke-linecap="round" stroke-linejoin="round"/>',
    warn:'<path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" stroke-linecap="round" stroke-linejoin="round"/>',
    share:'<path d="M12 15V3M8 7l4-4 4 4M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" stroke-linecap="round" stroke-linejoin="round"/>',
  };
  const svg = (p, w) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w||1.7}">${p}</svg>`;
  const esc = s => (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

  const recents = S.recents || ['測試 session', 'another-session', 'a third session'];
  const MODES = ['Manual permissions','Accept edits','Plan mode','Auto mode','Bypass permissions'];
  const curMode = S.mode || 'Bypass permissions';

  root.className = 'app';
  root.innerHTML = `
    <aside class="sidebar">
      <div class="brand"><span class="wordmark">Claude Code</span><span class="pill">Research preview</span><span class="grow"></span></div>
      <div class="nav-item">${svg(ICON.plus,1.8)}<span>New session</span></div>
      <div class="nav-item">${svg(ICON.code)}<span>Artifacts</span></div>
      <div class="nav-item">${svg(ICON.bolt)}<span>Routines</span></div>
      <div class="scroll">
        <div class="sec-label">Recents</div>
        ${recents.map((r,i)=>`<div class="list-item${i===0?' active':''}">${i===0?'<span class="dot"></span>':'<span style="width:7px"></span>'}<span class="name">${esc(r)}</span></div>`).join('')}
      </div>
      <div class="side-footer"><div class="avatar">${esc(S.user||'HL')}</div><div class="who">${esc(S.who||'蜥蜴，繁體中文使用者')}</div><div class="plan">${esc(S.plan||'Max')}</div></div>
    </aside>
    <div class="main">
      <header class="topbar">
        <span class="mon">${svg(ICON.mon)}</span><span class="title">${esc(S.sessionTitle||'Session')}</span>
        <span class="grow"></span>
        <span class="tool">${svg(ICON.code)}</span><span class="tool">${svg(ICON.share)}</span>
        <span class="tool">${svg('<circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/>','0')}</span>
      </header>
      <div class="thread"><div class="thread-inner" id="thread" style="max-width:860px"></div></div>
      <div class="cc-composer-wrap"><div class="cc-composer-inner">
        <div class="plan-banner">${svg(ICON.plan,1.8)}Plan mode on — Claude will draft a plan and won't edit files until you approve.</div>
        <div class="bypass-banner">${svg(ICON.warn,1.8)}Bypass permissions — Claude runs every action without asking. Use with care.</div>
        <div class="task-box"><div class="input">Type / for commands</div><span class="stop"><i></i></span></div>
        <div class="task-row">
          <div class="mode-wrap">
            <span class="mode-btn" id="modeBtn">${esc(curMode)}</span>
            <div class="mode-menu hidden" id="modeMenu"><div class="mhead">Mode</div>
              ${MODES.map((m,i)=>`<div class="mode-item${m==='Plan mode'?' plan-row':''}${m==='Bypass permissions'?' bypass-row':''}" data-mode="${m}"><span class="lbl">${m}</span><span class="grow"></span><span class="k">${i+1}</span></div>`).join('')}
            </div>
          </div>
          <span class="mini">${svg(ICON.plus,1.8)}</span><span class="mini">${svg(ICON.mic,1.8)}</span><span class="mini">${svg(ICON.chevD,2)}</span>
          <span class="grow"></span>
          <span class="meta">${esc(S.model||'Opus 4.8')}</span><span class="meta">${esc(S.effort||'High')}</span><span class="spinner"></span>
        </div>
      </div></div>
    </div>`;

  const thread = document.getElementById('thread');
  const scroll = () => { const t = document.querySelector('.thread'); t.scrollTop = t.scrollHeight; };

  // ---- permission-mode wiring ---------------------------------------------
  function applyMode(name) {
    const btn = document.getElementById('modeBtn');
    btn.textContent = name; btn.classList.remove('plan','bypass');
    if (name === 'Plan mode') btn.classList.add('plan');
    if (name === 'Bypass permissions') btn.classList.add('bypass');
    document.body.classList.toggle('is-plan', name === 'Plan mode');
    document.body.classList.toggle('is-bypass', name === 'Bypass permissions');
    document.querySelectorAll('.mode-item').forEach(i => i.classList.toggle('active', i.dataset.mode === name));
  }
  applyMode(curMode);
  document.getElementById('modeBtn').addEventListener('click', e => { e.stopPropagation(); document.getElementById('modeMenu').classList.toggle('hidden'); });
  document.querySelectorAll('.mode-item').forEach(i => i.addEventListener('click', () => { applyMode(i.dataset.mode); document.getElementById('modeMenu').classList.add('hidden'); }));
  document.addEventListener('click', () => document.getElementById('modeMenu').classList.add('hidden'));

  // ---- turn renderers ------------------------------------------------------
  const R = {
    user: t => `<div class="turn u-msg anim-rise"><div class="bubble">${esc(t.text)}</div></div>`,
    assistant: t => `<div class="turn a-text anim-rise"><p>${esc(t.text)}</p></div>`,
    tool: t => {
      const running = t.verb === 'Running';
      let detail = '';
      if (t.detail) {
        const lines = (t.detail.lines || []).map(l => l.kind ? `<span class="${l.kind}">${esc(l.t)}</span>` : esc(l.t)).join('\n');
        detail = `<div class="tool-detail"><div class="head">${esc(t.detail.head||'')}</div><pre>${lines}</pre></div>`;
      }
      return `<div class="turn anim-rise"><div class="tool-row${running?' running':''}"><span class="verb">${esc(t.verb)}</span><span>${esc(t.label)}</span><svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${ICON.chevR}</svg></div>${detail}</div>`;
    },
    askq: t => {
      const opts = (t.options||[]).map((o,i)=> t.multi
        ? `<div class="opt${o.selected?' selected':''}"><span class="box">${svg(ICON.check,3)}</span><div class="body"><div class="label">${esc(o.label)}</div><div class="desc">${esc(o.desc||'')}</div></div></div>`
        : `<div class="opt${o.selected?' selected':''}"><span class="key">${i+1}</span><div class="body"><div class="label">${esc(o.label)}</div><div class="desc">${esc(o.desc||'')}</div></div></div>`
      ).join('');
      const foot = t.multi ? `<span class="hint">Space to check · Enter to submit</span><span class="grow"></span><button class="submit">Submit</button>`
                           : `<span class="hint">↑↓ choose · Enter confirm · 1–${(t.options||[]).length} shortcut</span><span class="grow"></span><button class="submit">Confirm</button>`;
      return `<div class="turn anim-rise"><div class="askq">${t.chip?`<span class="qchip">${esc(t.chip)}</span>`:''}<div class="q">${esc(t.question)}</div>${opts}<div class="foot">${foot}</div></div></div>`;
    },
    status: t => `<div class="turn anim-fade"><div class="status"><span class="spark">✳</span><span>${esc(t.elapsed||'')}${t.tasks?` · ${t.tasks} running tasks`:''}</span></div></div>`,
  };

  function addTurn(t) {
    const wrap = document.createElement('div');
    wrap.innerHTML = (R[t.type] || (()=>''))(t);
    const node = wrap.firstElementChild;
    thread.appendChild(node);
    // wire tool-row expand
    const tr = node.querySelector('.tool-row');
    if (tr && t.detail) { const d = node.querySelector('.tool-detail'); d.classList.add('hidden');
      tr.addEventListener('click', () => { tr.classList.toggle('open'); d.classList.toggle('hidden'); }); }
    // wire askq option select
    node.querySelectorAll('.askq .opt').forEach(o => o.addEventListener('click', () => {
      if (o.closest('.askq').querySelector('.box')) o.classList.toggle('selected');
      else { o.parentNode.querySelectorAll('.opt').forEach(x=>x.classList.remove('selected')); o.classList.add('selected'); }
    }));
    scroll();
  }

  // ---- sequencer -----------------------------------------------------------
  function run() {
    document.body.classList.add('recording');
    const turns = S.turns || [];
    let i = 0;
    const gap = S.turnGapMs != null ? S.turnGapMs : 650;
    const next = () => { if (i >= turns.length) { window.__STUDIO_DONE = true; return; } addTurn(turns[i++]); setTimeout(next, gap); };
    next();
  }

  window.__STUDIO_DURATION = ((S.turns||[]).length + 1) * (S.turnGapMs != null ? S.turnGapMs : 650) + 1500;

  // demo hooks for standalone preview
  addEventListener('load', () => {
    if (location.hash === '#menu') document.getElementById('modeMenu').classList.remove('hidden');
    if (location.hash === '#plan') applyMode('Plan mode');
    if (location.hash === '#bypass') applyMode('Bypass permissions');
  });

  if (S.autoplay !== false) run(); else run();
})();
