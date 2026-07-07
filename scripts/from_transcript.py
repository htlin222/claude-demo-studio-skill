#!/usr/bin/env python3
"""
Claude Demo Studio — transcript parser (the source-of-truth helper)

Reads a raw Claude Code session log (`.jsonl`) and reconstructs the full
event sequence as a *session scenario* that `session-player.js` can replay
into a demo video. The raw transcript is treated as ground truth: every
user prompt, assistant message, and tool call (with its result) becomes a
turn, in order.

Usage:
    python3 from_transcript.py <session.jsonl> [options]

Options:
    --out PATH         Write scenario JSON here (default: stdout)
    --title TEXT       Override the session title (default: from ai-title)
    --max-turns N      Keep only the first N turns (default: all)
    --theme light|dark Theme for the scenario (default: light)
    --mode NAME        Permission mode label (default: from transcript)
    --keep-thinking    Emit assistant "thinking" blocks as thought lines
    --cmd-chars N      Truncate tool commands to N chars (default: 160)
    --out-lines N      Keep first N lines of each tool output (default: 4)

Where to find a transcript:
    ~/.claude/projects/<slugified-cwd>/<session-uuid>.jsonl
    e.g. ~/.claude/projects/-Users-me-myrepo/3f2a....jsonl
    (`ls -t` that folder for the most recent session.)
"""
import argparse
import json
import sys


META_TYPES = {
    "attachment", "system", "mode", "permission-mode", "bridge-session",
    "ai-title", "last-prompt", "file-history-snapshot", "queue-operation",
}

# internal permission-mode id -> display label (matches the composer menu)
MODE_LABELS = {
    "bypassPermissions": "Bypass permissions",
    "acceptEdits": "Accept edits",
    "plan": "Plan mode",
    "default": "Manual permissions",
    "auto": "Auto mode",
}


def load(path):
    rows = []
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    return rows


def is_noise_user_text(text):
    """Filter command wrappers, caveats and system-reminder-only prompts."""
    t = (text or "").lstrip()
    return (
        t.startswith("<command")
        or t.startswith("<local-command")
        or t.startswith("Caveat:")
        or t.startswith("<system-reminder>")
        or t == ""
    )


def clean_user_text(text):
    """Strip trailing system-reminder blocks from a user prompt."""
    idx = text.find("<system-reminder>")
    if idx != -1:
        text = text[:idx]
    return text.strip()


def first_lines(s, n):
    lines = (s or "").splitlines()
    out = "\n".join(lines[:n]).rstrip()
    if len(lines) > n:
        out += "\n…"
    return out


def tool_label(name, inp):
    """Human label for a tool call, mirroring Claude Code's row text."""
    inp = inp or {}
    if name == "Bash":
        return inp.get("description") or "Ran a command"
    if name in ("Read", "Write", "Edit", "NotebookEdit"):
        p = inp.get("file_path") or inp.get("notebook_path") or ""
        return f"{name} {p.split('/')[-1]}" if p else name
    if name == "Grep":
        return f"Grep {inp.get('pattern','')}".strip()
    if name == "Glob":
        return f"Glob {inp.get('pattern','')}".strip()
    if name in ("Task", "Agent"):
        return inp.get("description") or name
    # MCP / other tools: use the short name
    short = name.split("__")[-1] if "__" in name else name
    return short


def tool_head(name, inp):
    inp = inp or {}
    if name == "Bash":
        return "$ " + (inp.get("command", "").splitlines()[0] if inp.get("command") else "")
    if name in ("Read", "Write", "Edit"):
        return inp.get("file_path", name)
    return name


def result_text(res):
    """tool_result content may be a str or a list of blocks."""
    if res is None:
        return ""
    c = res.get("content")
    if isinstance(c, str):
        return c
    if isinstance(c, list):
        parts = []
        for b in c:
            if isinstance(b, dict) and b.get("type") == "text":
                parts.append(b.get("text", ""))
            elif isinstance(b, str):
                parts.append(b)
        return "\n".join(parts)
    return ""


def build(rows, args):
    # index tool_results by tool_use_id
    results = {}
    for d in rows:
        if d.get("type") == "user":
            content = d.get("message", {}).get("content")
            if isinstance(content, list):
                for b in content:
                    if isinstance(b, dict) and b.get("type") == "tool_result":
                        results[b.get("tool_use_id")] = b

    title = args.title
    mode = args.mode
    for d in rows:
        if d.get("type") == "ai-title" and not title:
            title = d.get("title") or d.get("aiTitle") or (d.get("message", {}) or {}).get("title")
        if d.get("type") == "permission-mode" and not mode:
            mode = d.get("mode") or d.get("permissionMode")

    turns = []
    for d in rows:
        t = d.get("type")
        if d.get("isMeta"):
            continue
        if t == "user":
            content = d.get("message", {}).get("content")
            if isinstance(content, str):
                if is_noise_user_text(content):
                    continue
                txt = clean_user_text(content)
                if txt:
                    turns.append({"type": "user", "text": txt})
            # list content = tool_results, handled via detail below
        elif t == "assistant":
            for b in d.get("message", {}).get("content", []):
                if not isinstance(b, dict):
                    continue
                bt = b.get("type")
                if bt == "text":
                    txt = (b.get("text") or "").strip()
                    if txt:
                        turns.append({"type": "assistant", "text": txt})
                elif bt == "thinking" and args.keep_thinking:
                    txt = (b.get("thinking") or b.get("text") or "").strip()
                    if txt:
                        turns.append({"type": "assistant", "text": "💭 " + first_lines(txt, 2)})
                elif bt == "tool_use":
                    name, inp = b.get("name", ""), b.get("input", {})
                    res = results.get(b.get("id"))
                    verb = "Ran" if res is not None else "Running"
                    turn = {"type": "tool", "verb": verb, "label": tool_label(name, inp)}
                    head = tool_head(name, inp)
                    out = first_lines(result_text(res), args.out_lines) if res is not None else ""
                    if head or out:
                        lines = []
                        if head:
                            lines.append({"t": head[: args.cmd_chars], "kind": None})
                        if out:
                            for ln in out.splitlines():
                                lines.append({"t": ln, "kind": None})
                        turn["detail"] = {"head": name, "lines": lines}
                    turns.append(turn)

    if args.max_turns:
        turns = turns[: args.max_turns]

    # closing status line
    n_tools = sum(1 for x in turns if x["type"] == "tool")
    turns.append({"type": "status", "elapsed": f"{n_tools} tool calls", "tasks": 0})

    return {
        "surface": "code-session",
        "theme": args.theme,
        "sessionTitle": title or "Claude Code session",
        "model": "Opus 4.8",
        "effort": "High",
        "mode": MODE_LABELS.get(mode, mode) or "Bypass permissions",
        "turnGapMs": 500,
        "turns": turns,
    }


def main():
    ap = argparse.ArgumentParser(description="Parse a Claude Code .jsonl transcript into a demo scenario.")
    ap.add_argument("transcript")
    ap.add_argument("--out")
    ap.add_argument("--title")
    ap.add_argument("--max-turns", type=int, default=0)
    ap.add_argument("--theme", default="light", choices=["light", "dark"])
    ap.add_argument("--mode")
    ap.add_argument("--keep-thinking", action="store_true")
    ap.add_argument("--cmd-chars", type=int, default=160)
    ap.add_argument("--out-lines", type=int, default=4)
    args = ap.parse_args()

    rows = load(args.transcript)
    scenario = build(rows, args)
    text = json.dumps(scenario, ensure_ascii=False, indent=2)
    if args.out:
        with open(args.out, "w", encoding="utf-8") as fh:
            fh.write(text)
        print(f"wrote {args.out}  ({len(scenario['turns'])} turns)", file=sys.stderr)
    else:
        print(text)


if __name__ == "__main__":
    main()
