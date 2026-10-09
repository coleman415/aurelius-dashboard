import test from "node:test";
import assert from "node:assert/strict";

import snapshot from "../src/data/x-pulse.json" with { type: "json" };
import {
  BUCKETS,
  THIN_SAMPLE_BELOW,
  shapeXPulse,
} from "../src/lib/x-pulse.ts";

function post({
  id,
  username = "researcher",
  urlUsername = username,
  text = "",
  createdAt = "2026-01-01T12:00:00Z",
  score = 0,
  buckets = [],
}) {
  return {
    id,
    url: `https://x.com/${urlUsername}/status/${id}`,
    text,
    author: { username, name: username },
    created_at: createdAt,
    public_metrics: {},
    engagement_score: score,
    buckets,
  };
}

function account({
  username,
  category,
  followers = 0,
  description = "",
}) {
  return {
    username,
    name: username,
    followers,
    url: `https://x.com/${username}`,
    category,
    description,
    posts_in_dataset: 0,
    total_engagement: 0,
  };
}

function fixture(overrides = {}) {
  return {
    fetched_at: "2026-01-04T08:30:00Z",
    window_start: "2026-01-01T00:00:00Z",
    window_end: "2026-01-03T23:59:59Z",
    scoring: "fixture scoring",
    posts: [],
    accounts: [],
    ...overrides,
  };
}

test("buckets daily volume across the complete snapshot window", () => {
  const view = shapeXPulse(
    fixture({
      posts: [
        post({
          id: "1",
          buckets: ["mech_interp", "alignment_safety"],
        }),
        post({
          id: "2",
          createdAt: "2026-01-01T23:59:59Z",
          buckets: ["mech_interp"],
        }),
        post({
          id: "3",
          createdAt: "2026-01-03T00:00:00Z",
          buckets: ["bittensor_sn37_aurelius"],
        }),
      ],
    }),
  );

  assert.deepEqual(view.dailyVolume, [
    {
      date: "2026-01-01",
      mech_interp: 2,
      sae_transcoders_crosscoders: 0,
      probes_steering: 0,
      alignment_safety: 1,
      competitor_watch: 0,
      bittensor_sn37_aurelius: 0,
    },
    {
      date: "2026-01-02",
      mech_interp: 0,
      sae_transcoders_crosscoders: 0,
      probes_steering: 0,
      alignment_safety: 0,
      competitor_watch: 0,
      bittensor_sn37_aurelius: 0,
    },
    {
      date: "2026-01-03",
      mech_interp: 0,
      sae_transcoders_crosscoders: 0,
      probes_steering: 0,
      alignment_safety: 0,
      competitor_watch: 0,
      bittensor_sn37_aurelius: 1,
    },
  ]);
});

test("selects the highest-engagement posts for every bucket", () => {
  const view = shapeXPulse(snapshot, { topPostLimit: 3 });

  for (const bucketId of BUCKETS) {
    const expectedIds = snapshot.posts
      .filter((item) => item.buckets.includes(bucketId))
      .toSorted(
        (a, b) =>
          b.engagement_score - a.engagement_score ||
          b.created_at.localeCompare(a.created_at) ||
          b.id.localeCompare(a.id),
      )
      .slice(0, 3)
      .map((item) => item.id);
    const bucket = view.buckets.find((item) => item.id === bucketId);

    assert.ok(bucket, `missing ${bucketId}`);
    assert.deepEqual(
      bucket.topPosts.map((item) => item.id),
      expectedIds,
      bucketId,
    );
  }
});

test("builds Goodfire competitor watch from affiliation and relevant text", () => {
  const data = fixture({
    accounts: [
      account({
        username: "GoodfireAI",
        category: "competitor",
        followers: 100,
      }),
      account({
        username: "employee",
        category: "researcher",
        followers: 50,
        description: "Researcher at Goodfire",
      }),
      account({
        username: "OtherCompetitor",
        category: "competitor",
        followers: 75,
      }),
    ],
    posts: [
      post({ id: "10", username: "employee", score: 10 }),
      post({ id: "11", text: "Goodfire research update", score: 9 }),
      post({ id: "12", text: "A new Silico release", score: 8 }),
      post({ id: "13", text: "Tested in silico", score: 100 }),
      post({ id: "14", text: "A generic silico mention", score: 100 }),
    ],
  });

  const watch = shapeXPulse(data).competitorWatch;

  assert.equal(watch.organization?.username, "GoodfireAI");
  assert.deepEqual(
    watch.affiliatedAccounts.map((item) => item.username),
    ["GoodfireAI", "employee"],
  );
  assert.equal(watch.postCount, 3);
  assert.deepEqual(
    watch.posts.map((item) => item.id),
    ["10", "11", "12"],
  );
  assert.deepEqual(
    watch.otherCompetitors.map((item) => item.username),
    ["OtherCompetitor"],
  );
});

test("groups key accounts in category order and ranks by followers", () => {
  const view = shapeXPulse(
    fixture({
      accounts: [
        account({ username: "smallLab", category: "lab", followers: 10 }),
        account({ username: "Aurelius", category: "self", followers: 5 }),
        account({ username: "largeLab", category: "lab", followers: 100 }),
        account({ username: "custom", category: "community", followers: 1 }),
      ],
    }),
  );

  assert.deepEqual(
    view.keyAccountGroups.map((group) => group.category),
    ["self", "lab", "community"],
  );
  assert.deepEqual(
    view.keyAccountGroups
      .find((group) => group.category === "lab")
      ?.accounts.map((item) => item.username),
    ["largeLab", "smallLab"],
  );
});

test("uses the checked-in snapshot fetched_at as data-as-of time", () => {
  const view = shapeXPulse(snapshot);

  assert.equal(view.fetchedAt, snapshot.fetched_at);
  assert.ok(Number.isFinite(Date.parse(view.fetchedAt)));
});

test("marks only non-empty buckets below the thin-sample threshold as thin", () => {
  const thinView = shapeXPulse(
    fixture({
      posts: [
        post({ id: "20", buckets: ["bittensor_sn37_aurelius"] }),
      ],
    }),
  );
  const boundaryView = shapeXPulse(
    fixture({
      posts: Array.from({ length: THIN_SAMPLE_BELOW }, (_, index) =>
        post({
          id: String(100 + index),
          buckets: ["bittensor_sn37_aurelius"],
        }),
      ),
    }),
  );

  assert.equal(
    thinView.buckets.find(
      (bucket) => bucket.id === "bittensor_sn37_aurelius",
    )?.thin,
    true,
  );
  assert.equal(
    thinView.buckets.find((bucket) => bucket.id === "mech_interp")?.thin,
    false,
  );
  assert.equal(
    boundaryView.buckets.find(
      (bucket) => bucket.id === "bittensor_sn37_aurelius",
    )?.thin,
    false,
  );
});

test("preserves the x.com post URLs already stored in the snapshot", () => {
  const sourceUrls = new Map(snapshot.posts.map((item) => [item.id, item.url]));
  const view = shapeXPulse(snapshot, {
    topPostLimit: snapshot.posts.length,
    competitorPostLimit: snapshot.posts.length,
  });
  const displayedPosts = [
    ...view.buckets.flatMap((bucket) => bucket.topPosts),
    ...view.competitorWatch.posts,
  ];

  assert.ok(displayedPosts.length > 0);
  for (const item of displayedPosts) {
    assert.match(item.url, /^https:\/\/x\.com\//);
    assert.equal(item.url, sourceUrls.get(item.id), item.id);
  }

  const customUrlView = shapeXPulse(
    fixture({
      posts: [
        post({
          id: "999",
          username: "renamedAuthor",
          urlUsername: "originalHandle",
          buckets: ["mech_interp"],
        }),
      ],
    }),
  );
  assert.equal(
    customUrlView.buckets[0].topPosts[0].url,
    "https://x.com/originalHandle/status/999",
  );
});
