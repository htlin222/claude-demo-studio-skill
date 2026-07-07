#!/usr/bin/env python3
"""
Claude Demo Studio — standalone HTML builder (primary output)

Inlines the shared CSS, the player JS, and a scenario into ONE portable
`.html` file. Open it in Chrome and the animation plays automatically — no
server, no build step, no external files. This single file IS the demo:
share it, embed it, or screen-record the browser.

Usage:
    python3 build_html.py --template chat|session --scenario FILE.json --out OUT.html
    python3 build_html.py --template session --scenario s.json          # -> stdout
"""
import argparse
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def read(path):
    with open(path, encoding="utf-8") as fh:
        return fh.read()


def inline(template, scenario_path):
    html = read(os.path.join(ROOT, "templates", f"{template}.html"))
    css = read(os.path.join(ROOT, "assets", "studio.css"))

    # inline the stylesheet (function replacement: never treats \ as an escape)
    html = re.sub(
        r'<link[^>]*href="\.\./assets/studio\.css"[^>]*>',
        lambda m: f"<style>\n{css}\n</style>",
        html,
    )

    # inject the scenario between the markers
    data = json.load(open(scenario_path, encoding="utf-8"))
    block = "window.SCENARIO = " + json.dumps(data, ensure_ascii=False) + ";"
    html = re.sub(
        r"/\*STUDIO:SCENARIO_START\*/.*?/\*STUDIO:SCENARIO_END\*/",
        lambda m: block,
        html,
        flags=re.S,
    )

    # inline the player script(s)
    def repl(m):
        src = m.group(1)
        js = read(os.path.join(ROOT, os.path.normpath(os.path.join("templates", src))))
        return f"<script>\n{js}\n</script>"

    html = re.sub(r'<script src="(\.\./assets/[^"]+)"></script>', repl, html)
    return html


def main():
    ap = argparse.ArgumentParser(description="Build a standalone self-contained demo HTML.")
    ap.add_argument("--template", required=True, choices=["chat", "session"])
    ap.add_argument("--scenario", required=True)
    ap.add_argument("--out")
    args = ap.parse_args()

    html = inline(args.template, args.scenario)
    if args.out:
        os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
        with open(args.out, "w", encoding="utf-8") as fh:
            fh.write(html)
        print(f"wrote {args.out}  ({len(html)} bytes, self-contained)", file=sys.stderr)
    else:
        sys.stdout.write(html)


if __name__ == "__main__":
    main()
