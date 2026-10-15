import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  REQUIRED_RESEARCH_SOURCES,
  formatResearchInspection,
  inspectResearchSnapshot,
} from "../scripts/validate-research.mjs";

function completeItem(source, index = 1) {
  return {
    source,
    title: `${source} ${index}`,
    url: `https://example.com/${source}/${index}`,
    date: "2026-10-15T12:02:12Z",
    score: index,
  };
}

function passingSnapshot(overrides = {}) {
  return {
    items: REQUIRED_RESEARCH_SOURCES.map((source, index) => completeItem(source, index + 1)),
    ...overrides,
  };
}

test("required sources match the page and the publish check", () => {
  assert.deepEqual(REQUIRED_RESEARCH_SOURCES, [
    "arxiv",
    "huggingface",
    "github",
    "lesswrong",
    "goodfire",
    "neuronpedia",
  ]);
});

test("accepts score or relevance when every required source has an item", () => {
  const snapshot = passingSnapshot();
  snapshot.items[0] = {
    source: "arxiv",
    title: "Relevance only",
    url: "https://arxiv.org/abs/1",
    date: "2026-10-01T00:00:00Z",
    relevance: 42.5,
  };
  const result = inspectResearchSnapshot(snapshot);
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
  assert.equal(result.counts.arxiv, 1);
  assert.equal(result.counts.neuronpedia, 1);
  assert.match(formatResearchInspection(result), /research\.json ok \(6 items\)/);
  assert.match(formatResearchInspection(result), /neuronpedia: 1/);
});

test("refuses a snapshot that drops lesswrong and goodfire", () => {
  const result = inspectResearchSnapshot({
    sources: ["arxiv", "huggingface", "github", "neuronpedia"],
    items: ["arxiv", "huggingface", "github", "neuronpedia"].map((source) =>
      completeItem(source),
    ),
  });
  assert.equal(result.ok, false);
  assert.equal(result.counts.arxiv, 1);
  assert.equal(result.counts.huggingface, 1);
  assert.equal(result.counts.github, 1);
  assert.equal(result.counts.neuronpedia, 1);
  assert.equal(result.counts.lesswrong, 0);
  assert.equal(result.counts.goodfire, 0);
  assert.deepEqual(result.errors, [
    "lesswrong has 0 items (fetch failure: source missing from export)",
    "goodfire has 0 items (fetch failure: source missing from export)",
  ]);
  const text = formatResearchInspection(result);
  assert.match(text, /lesswrong: 0/);
  assert.match(text, /goodfire: 0/);
  assert.match(text, /refusing to publish research\.json:/);
  assert.equal(result.itemCount, 4);
});

test("distinguishes a completed empty source from a recorded fetch failure", () => {
  const items = REQUIRED_RESEARCH_SOURCES.filter((source) => source !== "goodfire" && source !== "lesswrong").map(
    (source) => completeItem(source),
  );
  const legitimate = inspectResearchSnapshot({
    sources: [...REQUIRED_RESEARCH_SOURCES],
    items,
  });
  assert.equal(legitimate.ok, false);
  assert.equal(legitimate.counts.goodfire, 0);
  assert.equal(legitimate.counts.lesswrong, 0);
  assert.ok(
    legitimate.errors.includes("goodfire has 0 items (legitimate zero output)"),
  );
  assert.ok(
    legitimate.errors.includes("lesswrong has 0 items (legitimate zero output)"),
  );

  const failed = inspectResearchSnapshot({
    sources: [...REQUIRED_RESEARCH_SOURCES],
    errors: { lesswrong: "HTTP 503" },
    items,
  });
  assert.equal(failed.counts.lesswrong, 0);
  assert.ok(
    failed.errors.includes("lesswrong has 0 items (fetch failure: HTTP 503)"),
  );
  assert.ok(failed.errors.includes("goodfire has 0 items (legitimate zero output)"));
});

test("refuses an item missing a field the page reads", () => {
  const snapshot = passingSnapshot();
  snapshot.items.push({
    source: "neuronpedia",
    title: "   ",
    url: "",
    id: "neuronpedia:blank",
    relevance: Number.NaN,
  });
  const result = inspectResearchSnapshot(snapshot);
  assert.equal(result.ok, false);
  assert.equal(result.counts.neuronpedia, 2);
  assert.ok(
    result.errors.some((error) =>
      error.includes(
        "item neuronpedia:blank is missing title, url, date, score or relevance",
      ),
    ),
  );
});

test("the refresh script validates before it can replace the published file", () => {
  const script = readFileSync(new URL("../scripts/refresh-research.sh", import.meta.url), "utf8");
  const validateAt = script.indexOf('node "$ROOT/scripts/validate-research.mjs"');
  const copyAt = script.indexOf('cp "$EXPORT_JSON" "$WORKDIR/data/research.json"');
  const addAt = script.indexOf("git add research.json");
  const commitAt = script.indexOf('git commit -m "Refresh research snapshot"');
  const pushAt = script.indexOf("git push origin x-pulse-data", commitAt);
  assert.ok(validateAt > 0);
  assert.ok(copyAt > validateAt);
  assert.ok(addAt > copyAt);
  assert.ok(commitAt > addAt);
  assert.ok(pushAt > commitAt);
  assert.match(script, /Leaving the last good x-pulse-data research.json in place/);
});

test("the validator command fails closed and does not claim success", () => {
  const dir = mkdtempSync(join(tmpdir(), "research-validate-"));
  const file = join(dir, "research.json");
  writeFileSync(
    file,
    JSON.stringify({
      items: [completeItem("arxiv")],
    }),
  );
  const failed = spawnSync(process.execPath, ["scripts/validate-research.mjs", file], {
    cwd: new URL("..", import.meta.url),
    encoding: "utf8",
  });
  assert.equal(failed.status, 1);
  assert.equal(failed.stdout, "");
  assert.match(failed.stderr, /arxiv: 1/);
  assert.match(failed.stderr, /neuronpedia: 0/);
  assert.match(
    failed.stderr,
    /neuronpedia has 0 items \(fetch failure: export did not record a completed fetch\)/,
  );
  assert.match(failed.stderr, /refusing to publish research\.json:/);

  writeFileSync(file, JSON.stringify(passingSnapshot()));
  const passed = spawnSync(process.execPath, ["scripts/validate-research.mjs", file], {
    cwd: new URL("..", import.meta.url),
    encoding: "utf8",
  });
  assert.equal(passed.status, 0);
  assert.equal(passed.stderr, "");
  assert.match(passed.stdout, /research\.json ok \(6 items\)/);
});
