#!/usr/bin/env bash
# =========================================================================
# Claude Demo Studio — recorder
# Injects a scenario into a template, captures the animation frame-by-frame
# with headless Chrome (deterministic virtual-time; frames run in parallel),
# and stitches them into an MP4 (+ optional GIF) with ffmpeg.
#
# Usage:
#   scripts/record.sh --template chat|session --scenario FILE.json --out OUT.mp4 [opts]
# Options:
#   --fps N         frames per second           (default 10)
#   --width N       viewport width              (default 1280)
#   --height N      viewport height             (default 720)
#   --duration MS   total animation length      (default: estimated from scenario)
#   --scale N       output width in px          (default 960)
#   --jobs N        parallel Chrome instances   (default 6)
#   --gif           also emit OUT.gif
# =========================================================================
set -euo pipefail

HERE="$(cd "$(dirname "$0")/.." && pwd)"
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
[ -x "$CHROME" ] || CHROME="$(command -v google-chrome || command -v chromium || true)"

TEMPLATE="" SCENARIO="" OUT="" FPS=10 W=1280 H=720 DURATION="" SCALE=960 JOBS=6 GIF=0
while [ $# -gt 0 ]; do
  case "$1" in
    --template) TEMPLATE="$2"; shift 2;;
    --scenario) SCENARIO="$2"; shift 2;;
    --out) OUT="$2"; shift 2;;
    --fps) FPS="$2"; shift 2;;
    --width) W="$2"; shift 2;;
    --height) H="$2"; shift 2;;
    --duration) DURATION="$2"; shift 2;;
    --scale) SCALE="$2"; shift 2;;
    --jobs) JOBS="$2"; shift 2;;
    --gif) GIF=1; shift;;
    *) echo "unknown arg: $1" >&2; exit 2;;
  esac
done

[ -n "$TEMPLATE" ] && [ -n "$SCENARIO" ] && [ -n "$OUT" ] || { echo "need --template --scenario --out" >&2; exit 2; }
[ -x "$CHROME" ] || { echo "Chrome not found; set \$CHROME" >&2; exit 3; }
TPL_FILE="$HERE/templates/${TEMPLATE}.html"
[ -f "$TPL_FILE" ] || { echo "no such template: $TPL_FILE" >&2; exit 3; }
[ -f "$SCENARIO" ] || { echo "no such scenario: $SCENARIO" >&2; exit 3; }

# --- 1. inject scenario into a temp render html (same dir → ../assets works) --
REC="$HERE/templates/.rec-$$.html"
python3 - "$TPL_FILE" "$SCENARIO" "$REC" <<'PY'
import sys, json
tpl, scen, out = sys.argv[1], sys.argv[2], sys.argv[3]
html = open(tpl, encoding="utf-8").read()
data = json.load(open(scen, encoding="utf-8"))
block = "window.SCENARIO = " + json.dumps(data, ensure_ascii=False) + ";"
a, b = "/*STUDIO:SCENARIO_START*/", "/*STUDIO:SCENARIO_END*/"
i, j = html.index(a) + len(a), html.index(b)
open(out, "w", encoding="utf-8").write(html[:i] + "\n" + block + "\n" + html[j:])
PY

cleanup() { rm -f "$REC"; rm -rf "$FRAMES" "$TMPROOT" 2>/dev/null || true; }
trap cleanup EXIT

# --- 2. estimate duration if not given ---------------------------------------
if [ -z "$DURATION" ]; then
  DURATION="$(python3 - "$SCENARIO" <<'PY'
import sys, json
d = json.load(open(sys.argv[1], encoding="utf-8"))
if d.get("surface") == "chat":
    ms = 500
    for m in d.get("messages", []):
        if m.get("role") == "user":
            ms += 1000
        else:
            ms += (m.get("thinkingMs", 1300)) + 700
            blocks = m.get("blocks") or ([{"type": "p", "text": m.get("body", "")}] if m.get("body") else [])
            for b in blocks:
                ms += (len(b.get("text", "")) / (4 * d.get("speed", 1))) * 45 + 160 if b.get("type") == "p" else 300
    print(int(ms + 1200))
else:
    gap = d.get("turnGapMs", 650)
    print(int((len(d.get("turns", [])) + 1) * gap + 1500))
PY
)"
fi

# --- 3. capture frames in parallel -------------------------------------------
FRAMES="$(mktemp -d)"; TMPROOT="$(mktemp -d)"
STEP=$(( 1000 / FPS ))
N=$(( DURATION / STEP ))
[ "$N" -lt 2 ] && N=2
[ "$N" -gt 240 ] && { echo "note: capping at 240 frames (was $N)"; N=240; }
echo "recording: template=$TEMPLATE duration=${DURATION}ms fps=$FPS frames=$N jobs=$JOBS" >&2

seq 0 $(( N - 1 )) | xargs -P "$JOBS" -I{} bash -c '
  i="$1"; step="'"$STEP"'"; t=$(( (i + 1) * step ))
  n=$(printf "%04d" "$i")
  ud="'"$TMPROOT"'/u$i"
  "'"$CHROME"'" --headless=new --disable-gpu --hide-scrollbars \
    --user-data-dir="$ud" --window-size='"$W"','"$H"' \
    --virtual-time-budget="$t" --screenshot="'"$FRAMES"'/f$n.png" \
    "file://'"$REC"'" >/dev/null 2>&1
' _ {}

COUNT=$(ls "$FRAMES"/f*.png 2>/dev/null | wc -l | tr -d ' ')
[ "$COUNT" -ge 2 ] || { echo "capture failed (got $COUNT frames)" >&2; exit 4; }

# --- 4. stitch with ffmpeg ---------------------------------------------------
mkdir -p "$(dirname "$OUT")"
command ffmpeg -y -framerate "$FPS" -i "$FRAMES/f%04d.png" \
  -vf "scale=${SCALE}:-2" -pix_fmt yuv420p "$OUT" >/dev/null 2>&1
echo "wrote $OUT ($COUNT frames)" >&2
if [ "$GIF" = "1" ]; then
  GOUT="${OUT%.*}.gif"
  command ffmpeg -y -framerate "$FPS" -i "$FRAMES/f%04d.png" \
    -vf "scale=${SCALE}:-1:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse" \
    -loop 0 "$GOUT" >/dev/null 2>&1
  echo "wrote $GOUT" >&2
fi
