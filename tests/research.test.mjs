import test from "node:test";
import assert from "node:assert/strict";

import snapshot from "../src/data/research.json" with { type: "json" };
import {
  AUTHOR_PREVIEW_COUNT,
  RESEARCH_MODEL_LIMIT,
  RESEARCH_PAPER_LIMIT,
  RESEARCH_SMALL_FEED_LIMIT,
  shapeResearch,
} from "../src/lib/research.ts";

function item(overrides) {
  return {
    source: "arxiv",
    title: "Paper",
    url: "https://arxiv.org/abs/1",
    date: "2026-10-01T00:00:00Z",
    authors: ["Ada"],
    summary: "Summary",
    topic_sets: ["mech_interp_proba"],
    score: 1,
    ...overrides,
  };
}

test("ranks papers by score then date and caps each topic", () => {
  const view = shapeResearch(
    {
      generated_at: "2026-10-11T00:53:08+00:00",
      window_days: 30,
      count: 6,
      items: [
        item({
          title: "Older tie",
          url: "https://arxiv.org/abs/older",
          date: "2026-10-01T00:00:00Z",
          score: 5,
        }),
        item({
          title: "Newer tie",
          url: "https://arxiv.org/abs/newer",
          date: "2026-10-02T00:00:00+00:00",
          score: 5,
        }),
        item({
          title: "Low",
          url: "https://arxiv.org/abs/low",
          date: "2026-10-08T00:00:00Z",
          score: 1,
          topic_sets: ["alignment"],
        }),
        item({
          title: "Goodfire note",
          url: "https://www.goodfire.com/research/note",
          source: "goodfire",
          topic_sets: ["mech_interp_proba"],
          score: 9,
        }),
        item({
          title: "",
          url: "https://arxiv.org/abs/blank",
          score: 10,
        }),
        item({
          title: "Many authors",
          url: "https://arxiv.org/abs/authors",
          authors: ["A", "B", "C", "D", "E"],
          score: 3,
        }),
      ],
    },
    { paperLimit: 2 },
  );

  assert.equal(view.generatedAt, "2026-10-11T00:53:08+00:00");
  assert.equal(view.windowDays, 30);
  assert.equal(view.papers.defaultTopic, "mech_interp_proba");
  assert.equal(view.count, 5);
  const mech = view.papers.topics.find((topic) => topic.id === "mech_interp_proba");
  assert.ok(mech);
  assert.equal(mech.count, 3);
  assert.deepEqual(
    mech.items.map((paper) => paper.title),
    ["Newer tie", "Older tie"],
  );
  assert.equal(mech.items[0].url, "https://arxiv.org/abs/newer");
  assert.equal(view.papers.topics.some((topic) => topic.id === "alignment"), true);
  assert.equal(view.goodfire.count, 1);
  assert.equal(view.goodfire.items[0].url, "https://www.goodfire.com/research/note");
  assert.equal(
    view.papers.topics.every((topic) =>
      topic.items.every((paper) => paper.url.startsWith("https://arxiv.org/")),
    ),
    true,
  );
  const authors = view.papers.topics
    .flatMap((topic) => topic.items)
    .find((paper) => paper.url === "https://arxiv.org/abs/authors");
  assert.equal(authors, undefined);
  const kept = shapeResearch({
    items: [
      item({
        title: "Many authors",
        url: "https://arxiv.org/abs/authors",
        authors: ["A", "B", "C", "D", "E"],
        score: 3,
      }),
    ],
  });
  const preview = kept.papers.topics[0].items[0];
  assert.equal(preview.authorCount, 5);
  assert.equal(preview.authors.length, AUTHOR_PREVIEW_COUNT);
  assert.deepEqual(preview.authors, ["A", "B", "C"]);
});

test("shapes the checked-in export without sending every item", () => {
  const view = shapeResearch(snapshot);
  assert.equal(view.generatedAt, "2026-10-11T00:53:08+00:00");
  assert.equal(view.windowDays, 30);
  assert.equal(view.count, 921);
  assert.equal(snapshot.count, 921);
  assert.equal(snapshot.items.length, 921);

  const mech = view.papers.topics.find((topic) => topic.id === "mech_interp_proba");
  assert.ok(mech);
  assert.equal(view.papers.topics[0].id, "mech_interp_proba");
  assert.equal(mech.count, 569);
  assert.equal(mech.items.length, RESEARCH_PAPER_LIMIT);
  assert.equal(
    mech.items[0].title,
    "Alignment via Training Against Probes Without Losing Monitorability",
  );
  assert.equal(mech.items[0].url, "https://arxiv.org/abs/2609.38645v2");
  assert.ok(mech.items[0].score >= mech.items[1].score);
  for (let index = 1; index < mech.items.length; index += 1) {
    const previous = mech.items[index - 1];
    const current = mech.items[index];
    const ordered =
      previous.score > current.score ||
      (previous.score === current.score &&
        Date.parse(previous.date) >= Date.parse(current.date));
    assert.equal(ordered, true);
  }

  assert.deepEqual(
    view.papers.topics.map((topic) => [topic.id, topic.count]),
    [
      ["mech_interp_proba", 569],
      ["alignment", 94],
      ["world_models", 182],
      ["moral_reasoning", 12],
      ["game_theory", 1],
    ],
  );
  assert.equal(view.models.count, 53);
  assert.equal(view.models.items.length, RESEARCH_MODEL_LIMIT);
  assert.ok(view.models.items.every((item) => item.url.startsWith("https://huggingface.co/")));
  assert.equal(view.repos.count, 6);
  assert.equal(view.repos.items.length, 6);
  assert.ok(view.repos.items.every((item) => item.url.startsWith("https://github.com/")));
  assert.equal(view.forum.count, 13);
  assert.equal(view.forum.items.length, 13);
  assert.ok(
    view.forum.items.every((item) => item.url.startsWith("https://www.lesswrong.com/")),
  );
  assert.equal(view.goodfire.count, 9);
  assert.equal(view.goodfire.items.length, 9);
  assert.equal(
    view.goodfire.items[0].url,
    "https://www.goodfire.com/research/reward-hacking-activation-monitors",
  );
  assert.equal(view.neuronpedia.count, 0);
  assert.equal(view.neuronpedia.items.length, 0);

  const sent =
    view.papers.topics.reduce((sum, topic) => sum + topic.items.length, 0) +
    view.models.items.length +
    view.repos.items.length +
    view.forum.items.length +
    view.goodfire.items.length +
    view.neuronpedia.items.length;
  assert.ok(sent < snapshot.items.length);
  assert.ok(view.papers.topics.every((topic) => topic.items.length <= topic.count));
  assert.ok(
    [
      ...view.models.items,
      ...view.repos.items,
      ...view.forum.items,
      ...view.goodfire.items,
      ...view.neuronpedia.items,
    ].every((item) => item.summary.length <= 300 && item.url === item.url.trim()),
  );
});

// The daily x-pulse-data refresh writes relevance/buckets, not score/topic_sets.
// Before this fix the parser dropped every item in that shape (2026-10-15).
function refreshItem(overrides) {
  return {
    id: "arxiv:1",
    source: "arxiv",
    kind: "paper",
    title: "Refresh paper",
    url: "https://arxiv.org/abs/r1",
    date: "2026-10-10T00:00:00Z",
    authors: ["Ada"],
    summary: "Summary",
    bucket: "mech_interp",
    buckets: ["mech_interp"],
    relevance: 42.5,
    ...overrides,
  };
}

test("accepts the refresh shape: relevance as score, buckets as topics", () => {
  const view = shapeResearch({
    generated_at: "2026-10-15T12:02:12Z",
    window_days: 30,
    count: 4,
    items: [
      refreshItem({ title: "High", url: "https://arxiv.org/abs/high", relevance: 80.2 }),
      refreshItem({
        title: "Probe paper",
        url: "https://arxiv.org/abs/probe",
        buckets: ["probes_steering", "mech_interp"],
        relevance: 30,
      }),
      refreshItem({
        source: "github",
        title: "Repo release",
        url: "https://github.com/o/r/releases/tag/v1",
        buckets: ["mech_interp"],
      }),
      refreshItem({ title: "No score", url: "https://arxiv.org/abs/none", relevance: undefined }),
    ],
  });

  assert.equal(view.count, 3);
  assert.deepEqual(
    view.papers.topics.map((topic) => topic.id),
    ["mech_interp", "probes_steering"],
  );
  const mechInterp = view.papers.topics[0];
  assert.equal(mechInterp.label, "Mech interp");
  assert.deepEqual(mechInterp.items.map((paper) => paper.title), ["High", "Probe paper"]);
  assert.equal(mechInterp.items[0].score, 80.2 / 10);
  assert.ok(mechInterp.items[0].score <= 10);
  assert.ok(mechInterp.items[1].score === 30 / 10);
  assert.equal(view.papers.topics[1].label, "Probes and steering");
  assert.equal(view.repos.count, 1);
});

test("accepts neuronpedia items and counts every one", () => {
  const neuronpedia = Array.from({ length: 25 }, (_, index) =>
    refreshItem({
      source: "neuronpedia",
      kind: index % 2 === 0 ? "release" : "model",
      title: `Feature ${index}`,
      url: `https://www.neuronpedia.org/feature-${index}`,
      relevance: 30 - index,
      date: "2026-10-01T00:00:00Z",
      buckets: ["mech_interp"],
    }),
  );
  const dropped = refreshItem({
    source: "unknown",
    title: "Not a feed",
    url: "https://example.com/unknown",
  });
  const view = shapeResearch({
    generated_at: "2026-10-15T12:02:12Z",
    window_days: 30,
    items: [...neuronpedia, dropped],
  });

  assert.equal(view.count, 25);
  assert.equal(view.neuronpedia.count, 25);
  assert.equal(view.neuronpedia.items.length, RESEARCH_SMALL_FEED_LIMIT);
  assert.equal(view.neuronpedia.items[0].title, "Feature 0");
  assert.equal(view.neuronpedia.items[0].score, 3);
  assert.equal(
    view.neuronpedia.items[0].url,
    "https://www.neuronpedia.org/feature-0",
  );
  assert.ok(
    view.neuronpedia.items.every((entry) =>
      entry.url.startsWith("https://www.neuronpedia.org/"),
    ),
  );
  assert.equal(view.papers.topics.length, 0);
  assert.equal(view.repos.count, 0);
});

test("keeps neuronpedia items in their own capped feed", () => {
  const view = shapeResearch(
    {
      generated_at: "2026-10-15T12:02:12Z",
      window_days: 30,
      items: [
        {
          source: "neuronpedia",
          title: "Older lower",
          url: "https://www.neuronpedia.org/older",
          date: "2026-10-01T00:00:00Z",
          authors: ["Ada"],
          summary: "Older release",
          buckets: ["mech_interp"],
          relevance: 10,
        },
        {
          source: "neuronpedia",
          title: "Newer higher",
          url: "https://www.neuronpedia.org/newer",
          date: "2026-10-14T06:29:06Z",
          relevance: 26.6,
          buckets: ["mech_interp"],
        },
        {
          source: "neuronpedia",
          title: "Tied older",
          url: "https://www.neuronpedia.org/tied-older",
          date: "2026-10-02T00:00:00Z",
          relevance: 26.6,
        },
        {
          source: "neuronpedia",
          title: "Dropped",
          url: "https://www.neuronpedia.org/dropped",
          date: "2026-10-03T00:00:00Z",
        },
        item({
          title: "Not neuronpedia",
          url: "https://arxiv.org/abs/not-np",
          score: 9,
          topic_sets: ["mech_interp"],
        }),
      ],
    },
    { smallFeedLimit: 2 },
  );

  assert.equal(view.count, 4);
  assert.equal(view.neuronpedia.count, 3);
  assert.deepEqual(
    view.neuronpedia.items.map((entry) => entry.title),
    ["Newer higher", "Tied older"],
  );
  assert.equal(view.neuronpedia.items[0].score, 26.6 / 10);
  assert.ok(view.neuronpedia.items[0].score <= 10);
  assert.equal(view.neuronpedia.items[0].url, "https://www.neuronpedia.org/newer");
  assert.equal(view.papers.topics[0].items[0].title, "Not neuronpedia");
  assert.equal(view.models.count, 0);
  assert.equal(view.repos.count, 0);
  assert.equal(view.forum.count, 0);
  assert.equal(view.goodfire.count, 0);
});

test("maps a score-only item and a relevance-only item onto one 0-10 scale", () => {
  const view = shapeResearch({
    items: [
      item({
        title: "Score only",
        url: "https://arxiv.org/abs/score-only",
        score: 8,
      }),
      item({
        title: "Relevance only",
        url: "https://arxiv.org/abs/relevance-only",
        score: undefined,
        relevance: 50,
      }),
      item({
        title: "Score above the scale",
        url: "https://arxiv.org/abs/score-high",
        score: 14,
      }),
      item({
        title: "Relevance above the scale",
        url: "https://arxiv.org/abs/relevance-high",
        score: undefined,
        relevance: 91.1,
      }),
    ],
  });
  const papers = view.papers.topics[0].items;
  const byTitle = Object.fromEntries(papers.map((paper) => [paper.title, paper.score]));
  assert.equal(byTitle["Score only"], 8);
  assert.equal(byTitle["Relevance only"], 5);
  assert.equal(byTitle["Score above the scale"], 10);
  assert.equal(byTitle["Relevance above the scale"], 9.11);
  assert.ok(Object.values(byTitle).every((score) => score >= 0 && score <= 10));
  assert.deepEqual(
    papers.map((paper) => paper.title),
    ["Score above the scale", "Relevance above the scale", "Score only", "Relevance only"],
  );
});

test("score and topic_sets win over relevance and buckets", () => {
  const view = shapeResearch({
    items: [
      item({ score: 3, relevance: 90, topic_sets: ["alignment"], buckets: ["mech_interp"] }),
    ],
  });

  assert.equal(view.papers.topics.length, 1);
  assert.equal(view.papers.topics[0].id, "alignment");
  assert.equal(view.papers.topics[0].items[0].score, 3);
});

// Current export_research payload: both score aliases use the 0–10 scale.
test("current exporter score and relevance 7.4 display as 7.4", () => {
 const view = shapeResearch({items: [item({score: 7.4, relevance: 7.4})]});
 assert.equal(view.papers.topics[0].items[0].score, 7.4);
});
