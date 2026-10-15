#!/usr/bin/env bash
# Explicit operator invocation only. No schedule/deploy/settings changes.
# X producer must write X_INPUT during this same run; no producer is invented here.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
: "${RESEARCH_PYTHON:?Set absolute path to existing provisioned Python}"
: "${RESEARCH_SHA:?Set reviewed full research commit SHA}"
: "${X_INPUT:?Set path to fresh X producer output}"
: "${RUN_STARTED_AT:?Set ISO UTC start before invoking the actual X producer}"
[[ "$RESEARCH_PYTHON" = /* && -x "$RESEARCH_PYTHON" ]] || { echo "RESEARCH_PYTHON must be an absolute executable path" >&2; exit 1; }
[[ "$X_INPUT" = /* && -s "$X_INPUT" ]] || { echo "X_INPUT must be an absolute nonempty file" >&2; exit 1; }
[[ "$RESEARCH_SHA" =~ ^[0-9a-f]{40}$ ]] || { echo "RESEARCH_SHA must be a full commit SHA" >&2; exit 1; }
[[ -n "${GITHUB_TOKEN:-}" ]] || { echo "Set owner-managed GITHUB_TOKEN before export" >&2; exit 1; }
"$RESEARCH_PYTHON" - <<'PY'
from importlib.metadata import version
for package, expected in {'feedparser':'6.0.12','huggingface_hub':'0.30.2','PyYAML':'6.0.3','requests':'2.32.3'}.items():
    if version(package) != expected:
        raise SystemExit(f'{package}: expected {expected}')
PY
DATA_REPO="https://github.com/coleman415/aurelius-dashboard.git"
WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT
cp "$X_INPUT" "$WORKDIR/x-pulse.json"
git clone https://github.com/coleman415/aurelius-research.git "$WORKDIR/aurelius-research"
git -C "$WORKDIR/aurelius-research" checkout --detach "$RESEARCH_SHA"
(
 cd "$WORKDIR/aurelius-research"
 PYTHONPATH=src "$RESEARCH_PYTHON" -m export_research --days 30 --neuronpedia-days 90 --output "$WORKDIR/research.json"
)
EXPORT_JSON="$WORKDIR/research.json"
# Leaving the last good x-pulse-data research.json in place on any failure.
node "$ROOT/scripts/validate-research.mjs" "$EXPORT_JSON"
node "$ROOT/scripts/validate-pair.mjs" "$EXPORT_JSON" "$WORKDIR/x-pulse.json" "$RUN_STARTED_AT"
git clone --depth 1 --branch x-pulse-data --single-branch "$DATA_REPO" "$WORKDIR/data"
cp "$EXPORT_JSON" "$WORKDIR/data/research.json"
cp "$WORKDIR/x-pulse.json" "$WORKDIR/data/x-pulse.json"
(
 cd "$WORKDIR/data"
 git add research.json x-pulse.json
 if git diff --cached --quiet; then exit 0; fi
 git commit -m "Refresh paired X and research snapshots"
 git push origin x-pulse-data
)
