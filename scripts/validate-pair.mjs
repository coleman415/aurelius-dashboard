import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { inspectResearchSnapshot } from './validate-research.mjs';

// Both inputs must have been generated during this invocation. Allow five
// minutes of clock skew, but never accept yesterday's snapshot as today's X.
export function inspectPair(research, x, started, now = Date.now()) {
  const errors = [...inspectResearchSnapshot(research).errors];
  const start = Date.parse(started);
  if (!Number.isFinite(start) || start > now) errors.push('invalid run start');
  for (const [label, stamp] of [['research', research?.generated_at], ['X', x?.fetched_at]]) {
    const time = typeof stamp === 'string' ? Date.parse(stamp) : NaN;
    if (!Number.isFinite(time) || time < start - 300000 || time > now + 300000 || now - time > 3600000)
      errors.push(`${label} input is absent, stale, or has an invalid timestamp`);
  }
  if (!Array.isArray(x?.posts) || x.posts.length === 0) errors.push('X posts absent or empty');
  for (const post of Array.isArray(x?.posts) ? x.posts : []) {
    if (!post || typeof post.id !== 'string' || typeof post.text !== 'string' ||
        !post.text.trim() || typeof post.url !== 'string' || !post.url.startsWith('https://') ||
        !post.author?.username || !Number.isFinite(Date.parse(post.created_at)) ||
        typeof post.engagement_score !== 'number' || !Number.isFinite(post.engagement_score))
      errors.push('invalid X post');
  }
  return errors;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const errors = inspectPair(JSON.parse(readFileSync(process.argv[2])), JSON.parse(readFileSync(process.argv[3])), process.argv[4]);
    if (errors.length) throw new Error(errors.join('\n'));
  } catch (error) { console.error(`refusing paired publication: ${error.message}`); process.exit(1); }
}
