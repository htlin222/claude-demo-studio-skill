# Claude design system — reverse-engineered notes

Captured live from claude.ai and claude.ai/code (Opus 4.8 era, 2026-07) via
browser inspection. These are the values baked into `assets/studio.css`.

## Brand

| Token | Value | Use |
|-------|-------|-----|
| clay | `#d97757` | the Anthropic spark, send button, active accent |
| clay emphasized | `#c6613f` | hover / Bypass-mode text |
| plan blue | `#3b7cc4` | Plan-mode text + banner |
| amber | `#d98a2b` | "Needs input" session-status dot |
| green | `#4a9d6b` | diff additions |

## Surfaces (light)

| Token | HSL | Hex-ish |
|-------|-----|---------|
| page background | `60 14% 97%` | `#f8f8f6` |
| surface / composer | — | `#ffffff` |
| chat icon rail | `48 12% 96%` | |
| code sidebar | `60 20% 99%` | `#fdfdfc` |
| user bubble | `48 9% 93%` | |
| text | `0 0% 7%` | `#121212` |
| text muted | `43 3% 47%` | |
| border | `45 8% 88%` | |

Dark theme is defined under `:root[data-theme="dark"]`.

## Type

- Sans: **Anthropic Sans** → `system-ui` fallback stack.
- Serif: **Anthropic Serif** → `Georgia` — used for the greeting ("Happy
  Tuesday, …") and the "Claude Code" wordmark.
- Mono: **Anthropic Mono** → `ui-monospace` — code blocks, tool detail.

## Animation keyframes (verbatim from production CSS)

| Name | Behavior | Where |
|------|----------|-------|
| `fade` | opacity 0→1 | each streamed block / turn |
| `spin` | rotate 360° | thinking spark, spinner |
| `pulse` | opacity dip at 50% | breathing spark |
| `blink` | opacity 1→0→1 | streaming caret |
| `shimmertext` | background-position sweep | "Thinking…" label, `Running` tool verb |
| `dot-pulse` | staggered opacity | typing-dots indicator |

The streaming sequence: **spark (spin+pulse) + shimmer "Thinking…"** →
collapse to **"Thought for Ns"** → **heading fades in** → **paragraph typed
4 chars/tick with a clay blinking caret** → **action row appears**.

## Layout notes

- **chat**: 60px icon rail · centered thread (max ~740px) · rounded composer
  (radius 26) with `+`, model pill, mic, clay send button · disclaimer footer.
- **code home**: 340px labeled sidebar (wordmark + "Research preview" pill,
  New session / Artifacts / Routines / Customize, Routines w/ "Daily" badges,
  Recents w/ status dots) · Welcome heading · Session cards · task composer
  with context pills.
- **code session**: same sidebar · monitor icon + title topbar · transcript of
  user bubbles / assistant text / `Ran`·`Running` tool rows (chevron expands a
  mono diff card) / AskUserQuestion picker / status line ("Nm Ns · K running
  tasks") · composer "Type / for commands" + permission-mode button.

## Permission modes (composer menu)

Cycle order in the "Mode" popover (shift+tab in the CLI):
`Manual permissions (1)` · `Accept edits (2)` · `Plan mode (3, blue)` ·
`Auto mode (4)` · `Bypass permissions (5, clay)`. Plan and Bypass each show a
banner above the composer.

## Findings worth knowing

- The **AskUserQuestion option picker is a client-side component** — a *pending*
  question does NOT render in the web session view (it shows "Running / N
  running tasks"); once answered it collapses to question + chosen answer. So
  the picker here is reconstructed from the real component, not scraped.
- Internal permission-mode ids in the transcript are camelCase
  (`bypassPermissions`, `acceptEdits`, `plan`, `default`); the parser maps them
  to display labels.

## Re-sampling the real UI

If the product drifts, open the page in a browser, inspect the element (or read
the computed styles / CSS custom properties named `--cds-*`, `--bg-*`,
`--text-*`, `--accent-*`), and update `assets/studio.css`. The values above came
from exactly that process.
