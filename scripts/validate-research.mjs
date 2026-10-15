#!/usr/bin/env node
// Check research.json before it is committed to x-pulse-data.
// Exit 1 when a required source is empty or an item is missing a field
// the X Pulse page reads. An empty source is labeled as a fetch failure or
// as legitimate zero output. This script never adds items.

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const REQUIRED_RESEARCH_SOURCES = [
  "arxiv",
  "huggingface",
  "github",
  "lesswrong",
  "goodfire",
  "neuronpedia",
];

const PAGE_FIELDS = ["source", "title", "url", "date"];

export function inspectResearchSnapshot(data) {
  const counts = Object.fromEntries(
    REQUIRED_RESEARCH_SOURCES.map((source) => [source, 0]),
  );
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return {
      ok: false,
      counts,
      itemCount: 0,
      errors: ["research.json is not an object"],
    };
  }
  if (!Array.isArray(data.items)) {
    return {
      ok: false,
      counts,
      itemCount: 0,
      errors: ["research.json is missing an items array"],
    };
  }

  const errors = [];
  data.items.forEach((item, index) => {
    const record =
      item && typeof item === "object" && !Array.isArray(item) ? item : {};
    const source = typeof record.source === "string" ? record.source.trim() : "";
    if (source) counts[source] = (counts[source] ?? 0) + 1;

    const missing = PAGE_FIELDS.filter((field) => !presentText(record[field]));
    if (!hasScore(record.score) && !hasScore(record.relevance)) {
      missing.push("score or relevance");
    }
    if (missing.length > 0) {
      errors.push(`item ${itemLabel(record, index)} is missing ${missing.join(", ")}`);
    }
  });

  for (const source of REQUIRED_RESEARCH_SOURCES) {
    if (counts[source] === 0) {
      errors.push(`${source} has 0 items (${emptySourceReason(data, source)})`);
    }
  }

  return {
    ok: errors.length === 0,
    counts,
    itemCount: data.items.length,
    errors,
  };
}

export function formatResearchInspection(result) {
  const lines = ["research.json source counts:"];
  const extras = Object.keys(result.counts)
    .filter((source) => !REQUIRED_RESEARCH_SOURCES.includes(source))
    .sort();
  for (const source of [...REQUIRED_RESEARCH_SOURCES, ...extras]) {
    lines.push(`  ${source}: ${result.counts[source]}`);
  }
  if (result.ok) {
    lines.push(`research.json ok (${result.itemCount} items)`);
  } else {
    lines.push("refusing to publish research.json:");
    for (const error of result.errors) lines.push(`  ${error}`);
  }
  return lines.join("\n");
}

const FAILURE_FIELDS = ["errors", "source_errors", "fetch_errors", "failures"];

// A completed export lists the source in `sources` even when the result is
// empty. A missing list entry, or an error recorded for that source, is a
// fetch failure. Neither case is filled with placeholder items.
function emptySourceReason(data, source) {
  const failure = recordedFailure(data, source);
  if (failure) return `fetch failure: ${failure}`;
  if (Array.isArray(data.sources)) {
    const listed = data.sources.some(
      (entry) => typeof entry === "string" && entry.trim() === source,
    );
    return listed
      ? "legitimate zero output"
      : "fetch failure: source missing from export";
  }
  return "fetch failure: export did not record a completed fetch";
}

function recordedFailure(data, source) {
  for (const field of FAILURE_FIELDS) {
    const bag = data[field];
    if (!bag || typeof bag !== "object" || Array.isArray(bag)) continue;
    if (!Object.prototype.hasOwnProperty.call(bag, source)) continue;
    const text = failureText(bag[source]);
    if (text) return text;
  }
  return null;
}

function failureText(value) {
  if (value == null || value === false) return null;
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const key of ["message", "error", "reason"]) {
      if (typeof value[key] === "string" && value[key].trim()) return value[key].trim();
    }
  }
  if (typeof value === "string") return null;
  return "fetch failed";
}

function presentText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function hasScore(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function itemLabel(record, index) {
  if (presentText(record.url)) return record.url.trim();
  if (presentText(record.id)) return record.id.trim();
  return `index ${index}`;
}

function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("usage: node scripts/validate-research.mjs <research.json>");
    process.exit(2);
  }
  let data;
  try {
    data = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`refusing to publish research.json: cannot read ${file} (${message})`);
    process.exit(1);
  }
  const result = inspectResearchSnapshot(data);
  const text = formatResearchInspection(result);
  if (!result.ok) {
    console.error(text);
    process.exit(1);
  }
  console.log(text);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
