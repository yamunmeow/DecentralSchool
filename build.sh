#!/usr/bin/env bash
# Build one or all pygame games under games/ into a web-playable pygbag build.
#
# Usage:
#   ./build.sh tangram          build a single game (folder name under games/)
#   ./build.sh --all            build every game under games/
set -euo pipefail
cd "$(dirname "$0")"

build_one() {
  echo "== Building games/$1 =="
  .venv/bin/python -m pygbag --build "games/$1"
  rm -rf "games/$1/build/web-cache"
}

if [[ "${1:-}" == "--all" ]]; then
  for dir in games/*/; do
    build_one "$(basename "$dir")"
  done
elif [[ -n "${1:-}" ]]; then
  build_one "$1"
else
  echo "Usage: $0 <game-folder-name> | --all"
  exit 1
fi
