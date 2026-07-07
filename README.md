# claude-demo-studio

[![Build & Release Skill](https://github.com/htlin222/claude-demo-studio-skill/actions/workflows/release.yml/badge.svg)](https://github.com/htlin222/claude-demo-studio-skill/actions/workflows/release.yml)
[![GitHub Release](https://img.shields.io/github/v/release/htlin222/claude-demo-studio-skill?include_prereleases&label=skill%20version)](https://github.com/htlin222/claude-demo-studio-skill/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-lightgrey.svg)](LICENSE)
[![Skills Protocol](https://img.shields.io/badge/protocol-vercel--labs%2Fskills-blue)](https://github.com/vercel-labs/skills)
[![Compatible Agents](https://img.shields.io/badge/agents-40%2B-green)](https://github.com/vercel-labs/skills#supported-agents)

> Create animated, self-contained HTML demos of the Claude AI (chat) and Claude Code (agent session) interfaces — scenario-driven, and able to replay a real session transcript.

## Install

```bash
npx skills add htlin222/claude-demo-studio-skill
npx skills add -g htlin222/claude-demo-studio-skill              # global
npx skills add htlin222/claude-demo-studio-skill --agent claude-code
```

## What it does

Produces pixel-faithful **animated** demos of two Claude surfaces — no account,
no screen recording. The output is a single self-contained `.html` file: open it
in Chrome and the animation plays.

- **chat** — the claude.ai streaming animation (thinking spark → "Thought for
  Ns" → heading/paragraph typed with a blinking caret → action row).
- **session** — the claude.ai/code agent view (user/assistant turns, `Ran` /
  `Running` tool rows with expandable diffs, the AskUserQuestion option picker,
  the status line, and the permission-mode menu with Plan/Bypass banners).

Two ways to drive it:

1. **Replay a real Claude Code session** — `scripts/from_transcript.py` parses a
   raw `.jsonl` transcript (the source of truth) and rebuilds every turn.
2. **Author a scenario** — hand-write a small JSON for a fictional/teaser demo.

```bash
make chat        # build + open the chat streaming demo
make session     # build + open the code-session demo
make replay      # rebuild from this project's newest transcript, then open
make test        # smoke + edge tests
make help        # all targets
```

Design tokens, fonts, and animation keyframes were reverse-engineered from the
live products — see [`references/design-system.md`](references/design-system.md).
Scenario format: [`references/scenario-schema.md`](references/scenario-schema.md).

## Skill structure

```
SKILL.md                 skill instructions
Makefile                 convenience targets
assets/
  studio.css             design tokens + all component styles (single source)
  chat-player.js         renders + animates a chat scenario
  session-player.js      renders + animates a code-session scenario
templates/               standalone-previewable chat.html / session.html
scenarios/               example scenarios (edit these)
scripts/
  from_transcript.py     .jsonl transcript -> session scenario
  build_html.py          template + scenario -> ONE self-contained .html
  record.sh              optional: scenario -> MP4/GIF (headless Chrome + ffmpeg)
tests/run.sh             smoke + edge tests
references/              design-system.md, scenario-schema.md
```

## Protocol

This skill follows the [vercel-labs/skills](https://github.com/vercel-labs/skills)
protocol. Each push to `main` triggers a GitHub Action that packages the skill as
a `.skill` file and creates a release tagged with the commit SHA.

## License

MIT © htlin222
