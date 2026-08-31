#!/usr/bin/env bash
# ============================================================
# release.sh - One-click build & publish Muses for all platforms
#
# Usage:
#   ./scripts/release.sh                   # macOS local + Windows + Linux (GitHub), then download
#   ./scripts/release.sh macos [arch]      # build macOS locally (arm64|x64|universal; default arm64)
#   ./scripts/release.sh windows [msg]     # build Windows on GitHub, download to dist_electron/
#   ./scripts/release.sh linux   [msg]     # build Linux on GitHub, download to dist_electron/
#   ./scripts/release.sh push [msg]        # just commit + push to GitHub (creates repo if needed)
#   ./scripts/release.sh help
#
# macOS is built locally (this host is darwin). Windows and Linux are built on
# GitHub Actions, because they cannot be cross-built reliably from macOS.
#
# Deps: git, curl, python3 + a GitHub token (see TOKEN SOURCE).
#
# TOKEN SOURCE (never printed to the terminal):
#   - env  $GH_TOKEN / $GITHUB_TOKEN
#   - <script-dir>/.gitsh/config.toml   (kept locally only, excluded by .gitignore)
#   - ${XDG_CONFIG_HOME:-~/.config}/gitsh/config.toml
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
XDG_CONFIG_HOME="${XDG_CONFIG_HOME:-${HOME}/.config}"
GITSH_SCRIPT="${SCRIPT_DIR}/gitsh.sh"

GH_API="https://api.github.com"
OUT_DIR="${ROOT_DIR}/dist_electron"
POLL_TIMEOUT=60          # max polling attempts
POLL_INTERVAL=15         # seconds between polls
CONFIG_HINT="GH_TOKEN env, ${SCRIPT_DIR}/.gitsh/config.toml, or ~/.config/gitsh/config.toml"
REPO=""
BRANCH=""
RUN_ID=""

# ---------- Color + small helpers ----------
GREEN='\033[0;32m'; YELLOW='\033[0;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "${GREEN}[✓]${NC} $*"; }
warn()  { echo -e "${YELLOW}[!]${NC} $*"; }
error() { echo -e "${RED}[✗]${NC} $*" >&2; }
die()   { error "$*"; exit 1; }

run() { "$@" || die "Command failed: $*"; }
cmd_exists() { command -v "$1" >/dev/null 2>&1; }

current_branch() { git -C "$ROOT_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null; }
has_uncommitted_changes() { [ -n "$(git -C "$ROOT_DIR" status --porcelain 2>/dev/null)" ]; }
is_clean_and_synced() {
  has_uncommitted_changes && return 1
  [ "$(git -C "$ROOT_DIR" rev-parse HEAD 2>/dev/null)" = "$(git -C "$ROOT_DIR" rev-parse origin/main 2>/dev/null || echo none)" ]
}
owner_repo() {
  local url
  url="$(git -C "$ROOT_DIR" remote get-url origin 2>/dev/null)" || die "origin remote not found (run: ./scripts/gitsh.sh push)"
  printf '%s' "$url" | sed -E -e 's#.*github\.com[:/]##' -e 's#\.git$##'
}

json_get() {
  local key="$1"
  if command -v python3 >/dev/null 2>&1; then
    python3 -c "import sys,json;d=json.load(sys.stdin);print(d.get('${key}') or '')"
  elif command -v jq >/dev/null 2>&1; then
    jq -r --arg k "${key}" '.[$k] // empty'
  else
    sed -n "s/.*\"${key}\"[[:space:]]*:[[:space:]]*\"\\([^\"]*\\)\".*/\\1/p" | head -1
  fi
}

github_api() {
  local method="$1" path="$2" body="${3:-}"
  [ -n "${GITHUB_TOKEN:-}" ] || die "GH_TOKEN (or GITHUB_TOKEN) not set. Configure via: ${CONFIG_HINT}"
  local -a args=(-sS -X "$method" "${GH_API}${path}"
    -H "Authorization: Bearer ${GITHUB_TOKEN}"
    -H "Accept: application/vnd.github+json"
    -H "X-GitHub-Api-Version: 2022-11-28")
  [ -n "$body" ] && args+=(-H "Content-Type: application/json" -d "$body")
  curl "${args[@]}"
}

github_api_status() {
  local method="$1" path="$2" body="${3:-}"
  [ -n "${GITHUB_TOKEN:-}" ] || die "GH_TOKEN (or GITHUB_TOKEN) not set. Configure via: ${CONFIG_HINT}"
  local -a args=(-sS -o /dev/null -w '%{http_code}' -X "$method" "${GH_API}${path}"
    -H "Authorization: Bearer ${GITHUB_TOKEN}"
    -H "Accept: application/vnd.github+json"
    -H "X-GitHub-Api-Version: 2022-11-28")
  [ -n "$body" ] && args+=(-H "Content-Type: application/json" -d "$body")
  curl "${args[@]}"
}

require_deps() {
  for c in git curl python3 tar; do cmd_exists "$c" || die "Missing dependency: $c"; done
  [ -f "$GITSH_SCRIPT" ] || die "Push script not found: $GITSH_SCRIPT"
}

# ---------- Token resolution (never prints the token) ----------
read_config() {
  local file="$1" key val
  [ -f "$file" ] || return 1
  while IFS='=' read -r key val; do
    key="$(printf '%s' "$key" | xargs)"
    val="$(printf '%s' "$val" | sed -E 's/^[[:space:]]*["'"'"']//; s/["'"'"'][[:space:]]*$//; s/[[:space:]]*$//')"
    case "$key" in
      token|gh_token|github_token) GH_TOKEN="$val" ;;
      user|github_user)            GITHUB_USER="$val" ;;
    esac
  done < "$file"
  [ -n "${GH_TOKEN:-}" ]
}

resolve_token() {
  if [ -n "${GITHUB_TOKEN:-}" ]; then
    [ -n "${GITHUB_USER:-}" ] && export GITHUB_USER
    return 0
  fi
  if [ -n "${GH_TOKEN:-}" ]; then
    export GITHUB_TOKEN="$GH_TOKEN"
    [ -n "${GITHUB_USER:-}" ] && export GITHUB_USER
    return 0
  fi
  local cfg
  for cfg in "${SCRIPT_DIR}/.gitsh/config.toml" "${XDG_CONFIG_HOME}/gitsh/config.toml"; do
    if read_config "$cfg" && [ -n "${GH_TOKEN:-}" ]; then
      export GITHUB_TOKEN="$GH_TOKEN"
      [ -n "${GITHUB_USER:-}" ] && export GITHUB_USER
      return 0
    fi
  done
  die "No GitHub token found. Set GH_TOKEN or configure it in: ${CONFIG_HINT}"
}

# ---------- Shared build steps (Windows / Linux) ----------
step_push() {
  local msg="${1:-release: build $(date '+%Y-%m-%d_%H:%M:%S')}"
  info "1/4 Commit and push current code ..."
  if is_clean_and_synced; then
    info "Working tree clean and synced with origin/main, skipping push"
    return 0
  fi
  run bash "$GITSH_SCRIPT" push "$msg"
  info "Commit and push complete"
}

step_trigger() {
  local workflow="$1" artifact="$2"
  info "2/4 Trigger GitHub Actions build ($artifact) ..."
  REPO="$(owner_repo)"
  BRANCH="$(current_branch)"; [ -n "$BRANCH" ] || BRANCH="main"
  info "Repo: $REPO  Branch: $BRANCH"

  local code
  code="$(github_api_status POST "/repos/${REPO}/actions/workflows/${workflow##*/}/dispatches" "{\"ref\":\"${BRANCH}\"}")"
  [ "$code" = "204" ] || die "Failed to trigger workflow HTTP=${code} (file: $workflow)"
  info "Triggered ${workflow}"

  sleep 5
  local runs rid
  runs="$(github_api GET "/repos/${REPO}/actions/runs?per_page=1")"
  rid="$(printf '%s' "$runs" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d["workflow_runs"][0]["id"] if d.get("workflow_runs") else "")' 2>/dev/null)"
  [ -n "$rid" ] || die "Unable to resolve run ID"
  RUN_ID="$rid"
  info "Run ID: $RUN_ID"
}

step_wait() {
  info "3/4 Waiting for build to complete ..."
  local status="" concl="" i s
  for i in $(seq 1 "$POLL_TIMEOUT"); do
    s="$(github_api GET "/repos/${REPO}/actions/runs/${RUN_ID}" 2>/dev/null || true)"
    status="$(printf '%s' "$s" | json_get status)"
    concl="$(printf '%s' "$s" | json_get conclusion)"
    printf '\r  [%02d] status=%s conclusion=%s   ' "$i" "$status" "$concl"
    if [ "$status" = "completed" ]; then printf '\n'; break; fi
    sleep "$POLL_INTERVAL"
  done
  printf '\n'
  [ "$status" = "completed" ] || die "Timed out waiting (status=$status)"
  [ "$concl" = "success" ] || die "Build did not succeed conclusion=$concl"
  info "Build succeeded conclusion=$concl"
}

step_download() {
  local artifact="$1" verify="$2"
  info "4/4 Downloading artifacts ($artifact) ..."
  local arts aid aid_by_name
  arts="$(github_api GET "/repos/${REPO}/actions/runs/${RUN_ID}/artifacts")"
  aid_by_name="$(printf '%s' "$arts" | python3 -c "import sys,json;d=json.load(sys.stdin);a=[x for x in d.get('artifacts',[]) if x.get('name')=='${artifact}'];print(a[0]['id'] if a else '')" 2>/dev/null)"
  if [ -n "$aid_by_name" ]; then aid="$aid_by_name"; else
    aid="$(printf '%s' "$arts" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d["artifacts"][0]["id"] if d.get("artifacts") else "")' 2>/dev/null)"
  fi
  [ -n "$aid" ] || die "Unable to resolve Artifact ID"

  mkdir -p "$OUT_DIR"
  local zip="$OUT_DIR/${artifact}.zip"
  rm -f "$zip"
  curl -sSL -o "$zip" -H "Authorization: Bearer ${GITHUB_TOKEN}" -H "Accept: application/vnd.github+json" \
    "${GH_API}/repos/${REPO}/actions/artifacts/${aid}/zip"
  [ -s "$zip" ] || die "Downloaded zip is empty"

  python3 -c "import zipfile,sys; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])" "$zip" "$OUT_DIR"
  rm -f "$zip"

  # GitHub-side compressed archive (muses-*.tar.gz): extract it too (single-file download)
  local gz
  for gz in "$OUT_DIR"/*.tar.gz; do
    [ -e "$gz" ] || continue
    warn "Extracting compressed archive: $(basename "$gz")"
    tar -xzf "$gz" -C "$OUT_DIR"
    rm -f "$gz"
  done

  if ! ls "$OUT_DIR"/${verify} >/dev/null 2>&1; then
    die "No ${verify} found after extraction"
  fi
  info "Downloaded to: $OUT_DIR"
  echo ""
  ls -lh "$OUT_DIR"/${verify} 2>/dev/null || true
}

# ---------- macOS local build ----------
cmd_macos() {
  local arch="${1:-arm64}"
  info "Building macOS locally (arch=$arch) ..."
  local cmd="electron:build:macos:${arch}"
  if grep -q "\"${cmd}\"" "$ROOT_DIR/package.json"; then
    npm run "$cmd" || warn "electron-builder returned non-zero (dmg-builder plistlib bug on new macOS); continuing"
  else
    warn "No npm script '${cmd}'; falling back to universal"
    npm run "electron:build:macos:universal" || warn "electron-builder returned non-zero; continuing"
  fi

  # dmg-builder/plistlib workaround: if the .app + .zip built but no .dmg, make a plain DMG via hdiutil
  if ls "$OUT_DIR"/Muses_v*.dmg >/dev/null 2>&1; then
    info "DMG present"
  elif ls -d "$OUT_DIR"/mac*/Muses.app >/dev/null 2>&1; then
    local app dmg ver
    app="$(ls -d "$OUT_DIR"/mac*/Muses.app | head -1)"
    ver="$(node -e "console.log(require('$ROOT_DIR/package.json').version)" 2>/dev/null)"
    [ -n "$ver" ] || ver="1.0.0"
    dmg="$OUT_DIR/Muses_v${ver}-${arch}.dmg"
    warn "dmg-builder failed (plistlib bug); generating plain DMG via hdiutil"
    hdiutil create -volname "Muses" -srcfolder "$app" -ov -format UDZO "$dmg" && info "Created: $dmg"
  else
    warn "No macOS .app found in $OUT_DIR"
  fi
  info "macOS output: $OUT_DIR"
}

# ---------- Per-platform commands ----------
cmd_windows() {
  step_push "${1:-release: build Windows}"
  step_trigger ".github/workflows/build-windows.yml" "muses-windows"
  step_wait
  step_download "muses-windows" "Muses*.exe Muses*.zip"
}

cmd_linux() {
  step_push "${1:-release: build Linux}"
  step_trigger ".github/workflows/build-linux.yml" "muses-linux"
  step_wait
  step_download "muses-linux" "Muses*.AppImage Muses*.deb"
}

# ---------- Help ----------
cmd_help() {
  cat <<EOF
Usage:
  ./scripts/release.sh                   # macOS local + Windows + Linux (GitHub), then download
  ./scripts/release.sh macos [arch]      # build macOS locally (arm64|x64|universal; default arm64)
  ./scripts/release.sh windows [msg]     # build Windows on GitHub, download to dist_electron/
  ./scripts/release.sh linux   [msg]     # build Linux on GitHub, download to dist_electron/
  ./scripts/release.sh push [msg]        # commit + push to GitHub (creates repo if needed)
  ./scripts/release.sh help

Config (env wins, then config file):
  GH_TOKEN / GITHUB_TOKEN
  ${SCRIPT_DIR}/.gitsh/config.toml        token = "ghp_..."
  ${XDG_CONFIG_HOME}/gitsh/config.toml
EOF
}

# ---------- main ----------
main() {
  require_deps
  resolve_token
  local cmd="${1:-all}"
  shift || true

  case "$cmd" in
    all)
      if [ "$(uname -s)" = "Darwin" ]; then cmd_macos "${1:-arm64}"; fi
      cmd_windows
      cmd_linux
      ;;
    macos)   cmd_macos "${1:-arm64}" ;;
    windows) cmd_windows "$@" ;;
    linux)   cmd_linux "$@" ;;
    push)    step_push "${1:-update}" ;;
    help|-h|--help|"") cmd_help ;;
    *) error "Unknown command: $cmd"; cmd_help; exit 1 ;;
  esac
  info "All done!"
}

main "$@"
