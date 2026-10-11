#!/usr/bin/env bash
# Rebuild src/data/research.json from the Aurelius research export.
#
# The dashboard does not fetch research and does not ship an API key.
# A daily refresh replaces one static file:
#
#   1. Clone https://github.com/coleman415/aurelius-research
#   2. Run ./export-research.sh --days 30
#   3. Copy output/research.json to src/data/research.json
#
# This script runs those steps in a temporary directory, then copies the
# export into this repo. It does not deploy and it does not touch DNS.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/src/data/research.json"
WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

git clone --depth 1 https://github.com/coleman415/aurelius-research.git "$WORKDIR/aurelius-research"
(
  cd "$WORKDIR/aurelius-research"
  ./export-research.sh --days 30
)
cp "$WORKDIR/aurelius-research/output/research.json" "$DEST"
echo "Wrote $DEST"
