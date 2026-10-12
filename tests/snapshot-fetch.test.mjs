import test from "node:test";
import assert from "node:assert/strict";

import { loadRemoteSnapshot } from "../src/lib/snapshot-fetch.ts";

const fallback = { fetched_at: "bundled", posts: [] };

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return body;
    },
  };
}

test("uses the published snapshot when the fetch succeeds", async () => {
  const published = { fetched_at: "2026-10-12T12:05:00Z", posts: [{ id: "1" }] };
  const seen = [];
  const fetchImpl = async (url, init) => {
    seen.push({ url, init });
    return jsonResponse(published);
  };

  const loaded = await loadRemoteSnapshot(
    "https://example.test/x-pulse.json",
    fallback,
    fetchImpl,
  );

  assert.deepEqual(loaded, published);
  assert.equal(seen.length, 1);
  assert.equal(seen[0].url, "https://example.test/x-pulse.json");
  assert.equal(seen[0].init.next.revalidate, 900);
});

test("falls back to the bundled snapshot when the fetch fails", async () => {
  const cases = [
    async () => {
      throw new Error("network down");
    },
    async () => jsonResponse({ error: "nope" }, 404),
    async () => jsonResponse(null, 200),
    async () => ({
      ok: true,
      status: 200,
      async json() {
        throw new SyntaxError("bad json");
      },
    }),
  ];

  for (const fetchImpl of cases) {
    const loaded = await loadRemoteSnapshot(
      "https://example.test/x-pulse.json",
      fallback,
      fetchImpl,
    );
    assert.equal(loaded, fallback);
  }
});
