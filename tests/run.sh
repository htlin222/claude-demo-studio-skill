#!/usr/bin/env bash
# =========================================================================
# Claude Demo Studio — smoke + edge tests
# Exercises the transcript parser and the standalone HTML builder against
# small synthetic fixtures. No network, no Chrome required.
# =========================================================================
set -uo pipefail
HERE="$(cd "$(dirname "$0")/.." && pwd)"
PY=python3
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
PASS=0; FAIL=0
ok()   { PASS=$((PASS+1)); printf "  \033[32mPASS\033[0m %s\n" "$1"; }
bad()  { FAIL=$((FAIL+1)); printf "  \033[31mFAIL\033[0m %s\n" "$1"; }
check(){ if [ "$1" = "0" ]; then ok "$2"; else bad "$2"; fi; }

echo "== fixtures =="
# a) a normal little transcript: user prompt, assistant text, Bash tool + result
cat > "$TMP/normal.jsonl" <<'JSONL'
{"type":"user","message":{"role":"user","content":"Refactor the parser"}}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"On it."},{"type":"tool_use","id":"t1","name":"Bash","input":{"command":"grep -n parse src/x.py","description":"find parser"}}]}}
{"type":"user","message":{"role":"user","content":[{"type":"tool_result","tool_use_id":"t1","content":"12: def parse():","is_error":false}]}}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"Found it at line 12."}]}}
JSONL

# b) edge: empty file
: > "$TMP/empty.jsonl"

# c) edge: only command-wrapper / system-reminder noise
cat > "$TMP/noise.jsonl" <<'JSONL'
{"type":"user","message":{"role":"user","content":"<command-name>/foo</command-name>"}}
{"type":"user","message":{"role":"user","content":"<command-message>bar</command-message>\nstuff"}}
{"type":"user","message":{"role":"user","content":"real question<system-reminder>ignore me</system-reminder>"}}
JSONL

# d) edge: tool_use with NO matching result -> should be "Running"; malformed line skipped
cat > "$TMP/running.jsonl" <<'JSONL'
{"type":"assistant","message":{"role":"assistant","content":[{"type":"tool_use","id":"z9","name":"Bash","input":{"command":"sleep 5","description":"long job"}}]}}
{ this is not valid json }
JSONL

# e) edge: unicode + backslashes in content (regression for re.sub \u bug)
cat > "$TMP/tricky.jsonl" <<'JSONL'
{"type":"user","message":{"role":"user","content":"path C:\\Users\\x and \\u1234 literal"}}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"emoji 🦎 and <tag> & ampersand"}]}}
JSONL

echo "== parser: smoke =="
$PY "$HERE/scripts/from_transcript.py" "$TMP/normal.jsonl" --out "$TMP/normal.json" 2>/dev/null
check $? "parser runs on a normal transcript"
$PY - "$TMP/normal.json" <<'PY'
import json,sys
d=json.load(open(sys.argv[1]))
t=d["turns"]
assert d["surface"]=="code-session", d["surface"]
kinds=[x["type"] for x in t]
assert kinds[0]=="user" and t[0]["text"]=="Refactor the parser", t[0]
assert "tool" in kinds, kinds
tool=[x for x in t if x["type"]=="tool"][0]
assert tool["verb"]=="Ran", tool          # had a result
assert "find parser" in tool["label"], tool
assert t[-1]["type"]=="status", t[-1]
print("ok")
PY
check $? "parser: turns/labels/verb/status correct"

echo "== parser: edge =="
$PY "$HERE/scripts/from_transcript.py" "$TMP/empty.jsonl" --out "$TMP/empty.json" 2>/dev/null
check $? "parser survives empty transcript"
$PY -c "import json;d=json.load(open('$TMP/empty.json'));assert d['turns'][-1]['type']=='status';assert len(d['turns'])==1" 2>/dev/null
check $? "parser: empty -> only a status turn"

$PY "$HERE/scripts/from_transcript.py" "$TMP/noise.jsonl" --out "$TMP/noise.json" 2>/dev/null
$PY -c "
import json;d=json.load(open('$TMP/noise.json'))
users=[x for x in d['turns'] if x['type']=='user']
assert len(users)==1, users            # only the real question survives
assert users[0]['text']=='real question', users[0]   # system-reminder stripped
" 2>/dev/null
check $? "parser: filters command/system-reminder noise"

$PY "$HERE/scripts/from_transcript.py" "$TMP/running.jsonl" --out "$TMP/running.json" 2>/dev/null
check $? "parser survives malformed json line"
$PY -c "
import json;d=json.load(open('$TMP/running.json'))
tool=[x for x in d['turns'] if x['type']=='tool'][0]
assert tool['verb']=='Running', tool   # no result -> running
" 2>/dev/null
check $? "parser: unmatched tool_use -> Running"

echo "== builder: smoke + regression =="
$PY "$HERE/scripts/build_html.py" --template session --scenario "$TMP/normal.json" --out "$TMP/normal.html" 2>/dev/null
check $? "builder runs"
grep -q "window.SCENARIO" "$TMP/normal.html"; check $? "builder: scenario injected"
if grep -q "\.\./assets" "$TMP/normal.html"; then bad "builder: fully self-contained (no ../assets)"; else ok "builder: fully self-contained (no ../assets)"; fi
grep -q "<style>" "$TMP/normal.html"; check $? "builder: CSS inlined"

# regression: unicode + backslashes must not break re.sub
$PY "$HERE/scripts/from_transcript.py" "$TMP/tricky.jsonl" --out "$TMP/tricky.json" 2>/dev/null
$PY "$HERE/scripts/build_html.py" --template session --scenario "$TMP/tricky.json" --out "$TMP/tricky.html" 2>/dev/null
check $? "builder: handles backslashes/unicode (\\u regression)"
grep -q "🦎" "$TMP/tricky.html"; check $? "builder: unicode preserved"

# chat template builds too
cat > "$TMP/chat.json" <<'JSON'
{"surface":"chat","title":"t","messages":[{"role":"user","text":"hi"},{"role":"assistant","body":"hello"}]}
JSON
$PY "$HERE/scripts/build_html.py" --template chat --scenario "$TMP/chat.json" --out "$TMP/chat.html" 2>/dev/null
check $? "builder: chat template builds"

echo "== presentation add-ons =="
# frame + camera + cursor scenario must build and inline all three modules
cat > "$TMP/framed.json" <<'JSON'
{"surface":"chat","title":"t","frame":{"enabled":true,"title":"W","background":"mesh"},
 "camera":[{"at":0,"zoom":1},{"at":500,"zoom":1.4,"target":".composer"}],
 "cursor":[{"at":100,"kind":"type","target":".composer .input","text":"hi"},{"at":800,"kind":"click","target":".send"}],
 "messages":[{"role":"user","text":"hi"},{"role":"assistant","body":"hello"}]}
JSON
$PY "$HERE/scripts/build_html.py" --template chat --scenario "$TMP/framed.json" --out "$TMP/framed.html" 2>/dev/null
check $? "builder: framed scenario builds"
grep -q "mac-window" "$TMP/framed.html";   check $? "framed: window chrome present"
grep -q "studio-cursor" "$TMP/framed.html"; check $? "framed: cursor module present"
grep -q "\.camera" "$TMP/framed.html";       check $? "framed: camera module present"
grep -q '"frame"' "$TMP/framed.html";        check $? "framed: frame config injected"

echo ""
printf "== %d passed, %d failed ==\n" "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ]
