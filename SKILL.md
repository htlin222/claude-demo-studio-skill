---
name: claude-demo-studio
description: Create animated HTML demos of the Claude AI (chat) and Claude Code (agent session) interfaces. Scenario-driven and self-contained — one HTML file that plays the streaming/tool-call animation in Chrome. Can replay a real Claude Code session transcript (.jsonl) into a demo automatically. Use when the user wants a demo, mockup, GIF, or video of the Claude / Claude Code UI, a fake conversation for a screenshot/slide, or to visualize a session.
license: MIT
---

# Claude Demo Studio

Produce pixel-faithful, **animated** demos of two Claude surfaces without a real
account or screen recording:

- **`chat`** — the claude.ai conversation view (streaming: thinking spark →
  "Thought for Ns" → heading/paragraph typed out with a blinking caret →
  action row).
- **`session`** — the claude.ai/code agent session (user/assistant turns,
  `Ran`/`Running` tool rows with expandable diffs, the AskUserQuestion option
  picker, the status line, and the permission-mode menu with Plan/Bypass
  banners).

The design tokens, component styles, and animation keyframes were
reverse-engineered from the live products — see `references/design-system.md`.

**The demo is a single self-contained HTML file.** Open it in Chrome and the
animation plays. No server, no login, no external files. (MP4/GIF export is an
optional extra via `scripts/record.sh`, but usually you just open the HTML.)

## Decide the path

1. **Replay a real session** (the killer feature) — the user wants a demo of
   something Claude Code actually did. Use the transcript parser: it treats the
   raw `.jsonl` as source of truth and rebuilds every turn.
2. **Author a scenario** — the user wants a specific/fictional demo (a slide, a
   feature teaser). Hand-write a scenario JSON.

## Quick start (Makefile)

```bash
make chat        # build + open the chat streaming demo
make session     # build + open the code-session demo
make replay      # rebuild from THIS project's newest transcript, then open
make test        # run smoke + edge tests
make help        # all targets
```

## Replay a real transcript

Transcripts live at `~/.claude/projects/<slugified-cwd>/<uuid>.jsonl`
(the slug is the working dir with `/` → `-`). Pick the newest, then:

```bash
python3 scripts/from_transcript.py <session.jsonl> --out dist/replay.scenario.json
python3 scripts/build_html.py --template session --scenario dist/replay.scenario.json --out dist/replay.html
open -a "Google Chrome" dist/replay.html
```

Useful flags: `--max-turns N`, `--title "…"`, `--theme dark`, `--keep-thinking`,
`--cmd-chars N`, `--out-lines N`. Do NOT glob transcripts with `ls` — some
shells alias `ls` to eza/lsd; use `find` or Python (`make replay` does this).

## Author a scenario

Copy an example in `scenarios/`, edit the JSON, then build:

```bash
python3 scripts/build_html.py --template chat --scenario scenarios/my.json --out dist/my.html
```

Scenario fields are documented in `references/scenario-schema.md`. In short:

- chat → `{ surface:"chat", title, model, messages:[{role, text} | {role:"assistant", thinking, thinkingMs, blocks:[{type:"h3"|"p"|"ul"|"code", …}]}] }`
- session → `{ surface:"code-session", sessionTitle, mode, turns:[{type:"user"|"assistant"|"tool"|"askq"|"status", …}] }`

## Optional: export MP4/GIF

```bash
scripts/record.sh --template session --scenario dist/replay.scenario.json --out out.mp4 --gif
```

It injects the scenario, captures frames with headless Chrome using
`--virtual-time-budget` (deterministic; frames run in parallel), and stitches
them with ffmpeg. Needs `ffmpeg`. Prefer the HTML unless the user asks for a file.

## Presentation add-ons (optional, both surfaces)

Layer these onto any scenario for a cinematic demo (see `scenarios/chat-framed.json`
and `make framed`). All no-op if absent:

- **`frame`** — wrap the UI in a macOS window (traffic lights + title) on a
  decorative background (`clay`/`sunset`/`dusk`/`mesh`/`paper`/`ink` or any CSS).
- **`camera`** — zoom/pan keyframes (`{at, zoom, target}`) — a screencast camera
  that zooms into the composer, a tool row, the answer…
- **`cursor`** — a fake pointer that **moves**, **clicks**, and **types** into
  the composer (`{at, kind:"move|click|type", target, text}`). Pair with chat's
  `startDelayMs` so the conversation waits for typing to finish.

Full schema in `references/scenario-schema.md`.

## Customizing the look

Everything is tokenized. Edit `assets/studio.css` `:root` variables (clay accent,
backgrounds, fonts) to re-skin every surface at once. If a UI element is missing
or drifts from the current product, open the real page in a browser, inspect it,
and update `studio.css` / the player — the reference doc explains the method used.

## Structure

```
SKILL.md
Makefile                 convenience targets
assets/
  studio.css             design tokens + all component styles (single source)
  chat-player.js         renders + animates a chat scenario
  session-player.js      renders + animates a code-session scenario
  frame.js               optional macOS window + background wrapper
  camera.js              optional zoom/pan camera keyframes
  cursor.js              optional fake pointer: move / click / type
templates/
  chat.html              standalone-previewable chat template
  session.html           standalone-previewable session template
scenarios/               example scenarios (edit these)
scripts/
  from_transcript.py     .jsonl transcript -> session scenario (source of truth)
  build_html.py          template + scenario -> ONE self-contained .html
  record.sh              optional: scenario -> MP4/GIF (headless Chrome + ffmpeg)
tests/run.sh             smoke + edge tests (no network/Chrome)
references/
  design-system.md       tokens, colors, fonts, animation keyframes, findings
  scenario-schema.md     full scenario JSON schema for both surfaces
```
