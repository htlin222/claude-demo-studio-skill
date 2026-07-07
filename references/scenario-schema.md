# Scenario JSON schema

A scenario is a plain JSON object that drives a template. Two surfaces.

## Common fields

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `surface` | `"chat"` \| `"code-session"` | — | required |
| `theme` | `"light"` \| `"dark"` | `"light"` | |
| `autoplay` | bool | `true` | play the animation on load |
| `user` | string | `"HL"` | avatar initials |

## Surface: `chat`

```jsonc
{
  "surface": "chat",
  "theme": "light",
  "title": "光合作用的簡明解釋",   // conversation title (topbar)
  "model": "Opus 4.8",            // model pill
  "tier": "Max",                  // model tier
  "speed": 1,                      // typing speed multiplier (higher = faster)
  "messages": [
    { "role": "user", "text": "…" },

    { "role": "assistant",
      "thinking": "Thought for 11s",   // collapsed label after thinking (optional)
      "thinkingLabel": "Thinking…",     // shimmer label during thinking (optional)
      "thinkingMs": 1300,               // thinking phase duration
      "blocks": [                        // rich body, rendered/animated in order
        { "type": "h3",   "text": "…" },            // heading (fades in)
        { "type": "p",    "text": "…" },            // paragraph (typed w/ caret)
        { "type": "ul",   "items": ["…", "…"] },    // bullet list
        { "type": "code", "text": "…", "lang": "js" } // code block
      ]
      // shortcut: use "body": "…" instead of blocks for a single paragraph
    }
  ]
}
```

## Surface: `code-session`

```jsonc
{
  "surface": "code-session",
  "theme": "light",
  "sessionTitle": "Add sound effect for prompt input",
  "model": "Opus 4.8",
  "effort": "High",
  "mode": "Bypass permissions",        // Manual permissions | Accept edits | Plan mode | Auto mode | Bypass permissions
  "who": "蜥蜴，繁體中文使用者",         // sidebar footer name
  "plan": "Max",
  "recents": ["current session", "…"],  // sidebar Recents list (first = active)
  "turnGapMs": 600,                      // delay between revealing turns
  "turns": [
    { "type": "user", "text": "…" },

    { "type": "assistant", "text": "…" },

    { "type": "tool",
      "verb": "Ran",                     // "Ran" (done) | "Running" (in progress, shimmers)
      "label": "Edit composer.tsx",       // row text
      "detail": {                          // optional expandable diff card
        "head": "src/composer.tsx",
        "lines": [
          { "t": "  const onSubmit = () => {", "kind": null },
          { "t": "+   playBlip();",            "kind": "add" },  // green
          { "t": "-   old();",                 "kind": "rm"  }   // clay
        ]
      }
    },

    { "type": "askq",                     // AskUserQuestion option picker
      "chip": "sound style",               // uppercase header chip (optional)
      "question": "Which submit sound?",
      "multi": false,                       // true → checkboxes; false → numbered single-select
      "options": [
        { "label": "Soft blip", "desc": "220Hz sine", "selected": true },
        { "label": "None",      "desc": "silent" }
      ]
    },

    { "type": "status", "elapsed": "2 tool calls", "tasks": 1 }  // status line
  ]
}
```

## Presentation add-ons (both surfaces, all optional)

Layer these on any scenario for a cinematic demo. They no-op if absent.

### `frame` — macOS window on a background
```jsonc
"frame": {
  "enabled": true,
  "title": "Claude — Opus 4.8",   // titlebar text
  "background": "mesh",            // clay | sunset | dusk | mesh | paper | ink | any CSS value
  "padding": 56,                    // backdrop padding (px)
  "width": 1180,                    // window width (px)
  "height": 720                     // window body height (px)
}
```

### `camera` — zoom / pan keyframes
```jsonc
"camera": [
  { "at": 0,    "zoom": 1 },                             // ms timestamp + scale
  { "at": 1000, "zoom": 1.45, "target": ".composer", "ms": 800 }, // zoom to a selector
  { "at": 3800, "zoom": 1, "ms": 700 }                    // back out
]
```
`target` centers a CSS selector in view; or give explicit `x`/`y` px offsets.
`ms` overrides the transition duration for that move.

### `cursor` — fake pointer: move / click / type
```jsonc
"cursor": [
  { "at": 400,  "kind": "move",  "target": ".composer .input", "ms": 700 },
  { "at": 1200, "kind": "type",  "target": ".composer .input", "text": "…", "cps": 15 },
  { "at": 3100, "kind": "move",  "target": ".send" },
  { "at": 3550, "kind": "click", "target": ".send" }
]
```
`cps` = characters per second while typing. Pair with `startDelayMs` (chat)
so the conversation waits for the cursor to finish typing before it "sends".

## Produced by the parser

`scripts/from_transcript.py` emits a `code-session` scenario. Every assistant
`text` block → an `assistant` turn; every `tool_use` → a `tool` turn (verb
`Ran` if a `tool_result` exists, else `Running`; `detail` = command head +
first N output lines); every real user prompt → a `user` turn. Command
wrappers, caveats, and system-reminder tails are stripped.
