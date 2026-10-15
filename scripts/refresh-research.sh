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
#   3. Validate output/research.json before it touches x-pulse-data. Abort
#      with no commit and no push when any required source has 0 items
#      (arxiv, huggingface, github, lesswrong, goodfire, neuronpedia), or
#      when any item is missing source, title, url, date, and score or
#      relevance. Zero items are labeled fetch failure or legitimate zero
#      output. The check does not invent items. A failed export or a failed
#      check leaves the last good x-pulse-data research.json in place.
#   4. Copy, commit, and push research.json only when validation passes
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

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATA_REPO="https://github.com/coleman415/aurelius-dashboard.git"
WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

git clone --depth 1 https://github.com/coleman415/aurelius-research.git "$WORKDIR/aurelius-research"
if ! (
  cd "$WORKDIR/aurelius-research"
  ./export-research.sh --days 30
); then
  echo "refusing to publish research.json: export failed (fetch or script failure)."
  echo "Leaving the last good x-pulse-data research.json in place."
  exit 1
fi

EXPORT_JSON="$WORKDIR/aurelius-research/output/research.json"
if [[ ! -s "$EXPORT_JSON" ]]; then
  echo "refusing to publish research.json: export produced no research.json (fetch failure)."
  echo "Leaving the last good x-pulse-data research.json in place."
  exit 1
fi

# Validate the export itself. Do not copy it onto x-pulse-data until it passes,
# and do not fill an empty source with manufactured items.
if ! node "$ROOT/scripts/validate-research.mjs" "$EXPORT_JSON"; then
  echo "Leaving the last good x-pulse-data research.json in place."
  exit 1
fi

git clone --depth 1 --branch x-pulse-data --single-branch "$DATA_REPO" "$WORKDIR/data"
cp "$EXPORT_JSON" "$WORKDIR/data/research.json"

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
