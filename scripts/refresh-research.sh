#!/usr/bin/env bash
# Publish research.json onto the x-pulse-data branch.
#
# The site reads these public files and revalidates about every 15 minutes.
# A refresh commits JSON on x-pulse-data only. It does not deploy and it does
# not touch DNS.
#
#   https://raw.githubusercontent.com/coleman415/aurelius-dashboard/x-pulse-data/x-pulse.json
#   https://raw.githubusercontent.com/coleman415/aurelius-dashboard/x-pulse-data/research.json
#
# Research (this script):
#   1. Clone https://github.com/coleman415/aurelius-research
#   2. Run ./export-research.sh --days 30
#   3. Copy output/research.json to research.json on x-pulse-data and push
#
# X Pulse (x-pulse.json is produced outside this script). From a clean checkout
# of that same branch:
#   git clone --branch x-pulse-data --single-branch \
#     https://github.com/coleman415/aurelius-dashboard.git x-pulse-data-work
#   cp /path/to/x-pulse.json x-pulse-data-work/x-pulse.json
#   cd x-pulse-data-work
#   git add x-pulse.json
#   git commit -m "Refresh X Pulse snapshot"
#   git push origin x-pulse-data
#
# Do not commit these files onto the app branch and do not redeploy.
set -euo pipefail

DATA_REPO="https://github.com/coleman415/aurelius-dashboard.git"
WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

git clone --depth 1 https://github.com/coleman415/aurelius-research.git "$WORKDIR/aurelius-research"
(
  cd "$WORKDIR/aurelius-research"
  ./export-research.sh --days 30
)

git clone --depth 1 --branch x-pulse-data --single-branch "$DATA_REPO" "$WORKDIR/data"
cp "$WORKDIR/aurelius-research/output/research.json" "$WORKDIR/data/research.json"
(
  cd "$WORKDIR/data"
  git add research.json
  if git diff --cached --quiet; then
    echo "research.json is unchanged on x-pulse-data"
    exit 0
  fi
  git commit -m "Refresh research snapshot"
  git push origin x-pulse-data
)
echo "Pushed research.json to x-pulse-data"
