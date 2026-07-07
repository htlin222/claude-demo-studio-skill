# =========================================================================
# Claude Demo Studio — Makefile
# The primary output is a self-contained HTML that plays the animation in
# Chrome. MP4/GIF recording is optional (needs ffmpeg).
# =========================================================================
PY      ?= python3
CHROME  ?= /Applications/Google Chrome.app/Contents/MacOS/Google Chrome
DIST    ?= dist
OPEN    ?= open -a "Google Chrome"

# Auto-detect the current project's most recent Claude Code transcript.
# (python glob, not `ls` — some shells alias ls to eza/lsd which globs oddly)
PROJ_SLUG := $(shell pwd | sed 's|/|-|g')
PROJ_DIR  := $(HOME)/.claude/projects/$(PROJ_SLUG)
TRANSCRIPT ?= $(shell $(PY) -c "import glob,os;fs=glob.glob(os.path.expanduser('$(PROJ_DIR)')+'/*.jsonl');print(max(fs,key=os.path.getmtime) if fs else '')")

.DEFAULT_GOAL := help

.PHONY: help
help: ## Show this help
	@echo "Claude Demo Studio"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	  awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'
	@echo ""
	@echo "  Detected transcript: $(TRANSCRIPT)"

# --- build standalone HTML demos (open in Chrome) --------------------------
.PHONY: chat
chat: ## Build + open the chat streaming demo
	@$(PY) scripts/build_html.py --template chat --scenario scenarios/chat-photosynthesis.json --out $(DIST)/chat.html
	@$(OPEN) "$(PWD)/$(DIST)/chat.html"

.PHONY: session
session: ## Build + open the code-session demo
	@$(PY) scripts/build_html.py --template session --scenario scenarios/session-sound-effect.json --out $(DIST)/session.html
	@$(OPEN) "$(PWD)/$(DIST)/session.html"

.PHONY: replay
replay: ## Rebuild a demo from THIS project's latest transcript, then open
	@test -n "$(TRANSCRIPT)" || { echo "no transcript found in $(PROJ_DIR); pass TRANSCRIPT=path"; exit 1; }
	@$(PY) scripts/from_transcript.py "$(TRANSCRIPT)" --out $(DIST)/replay.scenario.json
	@$(PY) scripts/build_html.py --template session --scenario $(DIST)/replay.scenario.json --out $(DIST)/replay.html
	@$(OPEN) "$(PWD)/$(DIST)/replay.html"

# --- generic build ---------------------------------------------------------
.PHONY: build
build: ## Build any scenario: make build TEMPLATE=chat SCENARIO=x.json OUT=dist/x.html
	@$(PY) scripts/build_html.py --template $(TEMPLATE) --scenario $(SCENARIO) --out $(OUT)

.PHONY: open
open: ## Open a built file in Chrome: make open FILE=dist/chat.html
	@$(OPEN) "$(PWD)/$(FILE)"

# --- optional MP4/GIF ------------------------------------------------------
.PHONY: video
video: ## Record MP4 (optional): make video TEMPLATE=session SCENARIO=x.json OUT=out.mp4
	@bash scripts/record.sh --template $(TEMPLATE) --scenario $(SCENARIO) --out $(OUT) --gif

# --- housekeeping ----------------------------------------------------------
.PHONY: demos
demos: chat session ## Build + open both example demos

.PHONY: test
test: ## Run the smoke + edge tests
	@bash tests/run.sh

.PHONY: clean
clean: ## Remove build artifacts
	@rm -rf $(DIST) scenarios/_*.json templates/.rec-*.html
	@echo "cleaned"
