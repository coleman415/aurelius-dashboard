/**
 * Pure view-model for the X Pulse panel.
 *
 * The UI loads one snapshot, `src/data/x-pulse.json`, and passes it here.
 * A later daily refresh replaces that file only. This module does not fetch.
 *
 * Snapshot shape:
 * - fetched_at, window_start, window_end, scoring
 * - posts[]: id, url, text, author, created_at, public_metrics, buckets, engagement_score
 * - accounts[]: username, name, followers, url, category, description, posts_in_dataset, ...
 */

export const BUCKETS = [
  "mech_interp",
  "sae_transcoders_crosscoders",
  "probes_steering",
  "alignment_safety",
  "competitor_watch",
  "bittensor_sn37_aurelius",
] as const;

export type BucketId = (typeof BUCKETS)[number];

export const BUCKET_LABELS: Record<BucketId, string> = {
  mech_interp: "Mech interp",
  sae_transcoders_crosscoders: "SAEs, transcoders, crosscoders",
  probes_steering: "Probes and steering",
  alignment_safety: "Alignment and safety",
  competitor_watch: "Interp competitors (all)",
  bittensor_sn37_aurelius: "Bittensor (incl. SN37)",
};

export const BUCKET_SHORT_LABELS: Record<BucketId, string> = {
  mech_interp: "Mech interp",
  sae_transcoders_crosscoders: "SAEs",
  probes_steering: "Probes",
  alignment_safety: "Alignment",
  competitor_watch: "All competitors",
  bittensor_sn37_aurelius: "Bittensor",
};

export const ACCOUNT_CATEGORY_ORDER = [
  "self",
  "bittensor",
  "competitor",
  "lab",
  "researcher",
  "tooling",
  "active_author",
] as const;

export const CATEGORY_LABELS: Record<string, string> = {
  self: "Aurelius",
  bittensor: "Bittensor",
  competitor: "Competitors",
  lab: "Labs",
  researcher: "Researchers",
  tooling: "Tooling",
  active_author: "Active authors",
};

export const DEFAULT_TOP_POST_LIMIT = 5;
export const DEFAULT_COMPETITOR_POST_LIMIT = 5;
/** Buckets with fewer posts than this (and at least one) are marked thin. */
export const THIN_SAMPLE_BELOW = 20;

export const GOODFIRE_NAME = "Goodfire";
export const GOODFIRE_PRODUCT = "Silico";
export const GOODFIRE_USERNAME = "goodfireai";

const STATUS_URL =
  /^https:\/\/(?:x|twitter)\.com\/([^/?#\s]+)\/status\/(\d+)(?:[?#]\S*)?$/i;
const PROFILE_URL = /^https:\/\/(?:x|twitter)\.com\/[^/?#\s]+\/?$/i;

export interface EngagementMetrics {
  like_count?: number;
  retweet_count?: number;
  quote_count?: number;
  reply_count?: number;
  bookmark_count?: number;
}

export interface PostView {
  id: string;
  url: string;
  excerpt: string;
  username: string;
  name: string | null;
  createdAt: string;
  day: string | null;
  engagementScore: number;
  buckets: BucketId[];
}

/** Full text stays in the shaper for matching and excerpts, then is dropped. */
interface ParsedPost extends PostView {
  text: string;
}

export interface AccountView {
  username: string;
  name: string | null;
  description: string | null;
  followers: number | null;
  url: string;
  category: string;
  postsInDataset: number;
  totalEngagement: number;
  mostActiveBucket: string | null;
}

export interface AccountGroupView {
  category: string;
  label: string;
  accounts: AccountView[];
}

export interface BucketView {
  id: BucketId;
  label: string;
  shortLabel: string;
  count: number;
  thin: boolean;
  topPosts: PostView[];
}

export type DailyVolumeRow = {
  date: string;
  /** True when this UTC day is cut short by window_end. */
  partial: boolean;
} & Record<BucketId, number>;

export interface CompetitorWatchView {
  name: typeof GOODFIRE_NAME;
  product: typeof GOODFIRE_PRODUCT;
  organization: AccountView | null;
  affiliatedAccounts: AccountView[];
  posts: PostView[];
  postCount: number;
  /** Posts in the competitor_watch bucket. */
  competitorBucketCount: number;
  /** Goodfire-related posts that also sit in competitor_watch. */
  goodfireInBucketCount: number;
  otherCompetitors: AccountView[];
}

export interface XPulseView {
  fetchedAt: string;
  windowStart: string;
  windowEnd: string;
  scoring: string;
  postCount: number;
  accountCount: number;
  buckets: BucketView[];
  dailyVolume: DailyVolumeRow[];
  competitorWatch: CompetitorWatchView;
  keyAccountGroups: AccountGroupView[];
}

export interface ShapeXPulseOptions {
  topPostLimit?: number;
  competitorPostLimit?: number;
}

export function isStatusUrl(url: string): boolean {
  return STATUS_URL.test(url.trim());
}

export function isProfileUrl(url: string): boolean {
  return PROFILE_URL.test(url.trim());
}

export function engagementScore(
  metrics: EngagementMetrics | null | undefined,
): number {
  const n = (value: number | undefined) =>
    typeof value === "number" && Number.isFinite(value) ? value : 0;
  return (
    n(metrics?.like_count) +
    2 * n(metrics?.retweet_count) +
    3 * n(metrics?.quote_count) +
    n(metrics?.reply_count) +
    n(metrics?.bookmark_count)
  );
}

/**
 * Goodfire / Silico mention. Drops the phrase "in silico" / "in-silico"
 * so biomedical wording is not treated as the Silico product.
 * Bare lowercase "silico" does not match; the product name is capitalized.
 */
export function textMentionsGoodfire(text: string): boolean {
  if (/goodfire/i.test(text)) return true;
  const withoutInSilico = text.replace(/\bin[\s-]?silico\b/gi, " ");
  return /\bSilico\b/.test(withoutInSilico);
}

export function isGoodfireAccount(account: {
  username?: string | null;
  description?: string | null;
  category?: string | null;
}): boolean {
  if ((account.category ?? "").trim().toLowerCase() !== "competitor") {
    return false;
  }
  const username = (account.username ?? "").trim().toLowerCase();
  if (username === GOODFIRE_USERNAME) return true;
  return /goodfire/i.test(account.description ?? "");
}

export function excerpt(text: string, max = 180): string {
  const flat = text
    .replace(/https:\/\/t\.co\/\S+/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(?:@[A-Za-z0-9_]+\s+)+/, "");
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  const base = space > 80 ? cut.slice(0, space) : cut;
  return `${base}…`;
}

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category.replace(/_/g, " ");
}

export function utcDay(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

export function shapeXPulse(
  input: unknown,
  options?: ShapeXPulseOptions,
): XPulseView {
  const topPostLimit = resolveLimit(
    options?.topPostLimit,
    DEFAULT_TOP_POST_LIMIT,
  );
  const competitorPostLimit = resolveLimit(
    options?.competitorPostLimit,
    DEFAULT_COMPETITOR_POST_LIMIT,
  );
  const record = asRecord(input);
  const fetchedAt = asString(record?.fetched_at) ?? "";
  const windowStart = asString(record?.window_start) ?? "";
  const windowEnd = asString(record?.window_end) ?? "";
  const scoring = asString(record?.scoring) ?? "";

  const posts = parsePosts(record?.posts);
  const accounts = parseAccounts(record?.accounts);
  const goodfireUsernames = new Set(
    accounts.filter((account) => isGoodfireAccount(account)).map((account) => account.username.toLowerCase()),
  );

  const dailyVolume = buildDailyVolume(posts, windowStart, windowEnd);
  const buckets = BUCKETS.map((id) => {
    const inBucket = posts
      .filter((post) => post.buckets.includes(id))
      .sort(comparePosts);
    return {
      id,
      label: BUCKET_LABELS[id],
      shortLabel: BUCKET_SHORT_LABELS[id],
      count: inBucket.length,
      thin: inBucket.length > 0 && inBucket.length < THIN_SAMPLE_BELOW,
      topPosts: inBucket.slice(0, topPostLimit).map(toPostView),
    };
  });

  const goodfirePosts = posts
    .filter(
      (post) =>
        goodfireUsernames.has(post.username.toLowerCase()) ||
        textMentionsGoodfire(post.text),
    )
    .sort(comparePosts);
  const goodfireInBucketCount = goodfirePosts.filter((post) =>
    post.buckets.includes("competitor_watch"),
  ).length;
  const competitorBucketCount = posts.filter((post) =>
    post.buckets.includes("competitor_watch"),
  ).length;

  const affiliatedAccounts = accounts
    .filter((account) => isGoodfireAccount(account))
    .sort(compareAccounts);
  const organization =
    affiliatedAccounts.find(
      (account) => account.username.toLowerCase() === GOODFIRE_USERNAME,
    ) ?? null;

  return {
    fetchedAt,
    windowStart,
    windowEnd,
    scoring,
    postCount: posts.length,
    accountCount: accounts.length,
    buckets,
    dailyVolume,
    competitorWatch: {
      name: GOODFIRE_NAME,
      product: GOODFIRE_PRODUCT,
      organization,
      affiliatedAccounts,
      posts: goodfirePosts.slice(0, competitorPostLimit).map(toPostView),
      postCount: goodfirePosts.length,
      competitorBucketCount,
      goodfireInBucketCount,
      otherCompetitors: accounts
        .filter(
          (account) =>
            account.category === "competitor" && !isGoodfireAccount(account),
        )
        .sort(compareAccounts),
    },
    keyAccountGroups: groupAccounts(accounts),
  };
}

function toPostView(post: ParsedPost): PostView {
  return {
    id: post.id,
    url: post.url,
    excerpt: post.excerpt,
    username: post.username,
    name: post.name,
    createdAt: post.createdAt,
    day: post.day,
    engagementScore: post.engagementScore,
    buckets: post.buckets,
  };
}

function parsePosts(value: unknown): ParsedPost[] {
  if (!Array.isArray(value)) return [];
  const byId = new Map<string, ParsedPost>();
  for (const item of value) {
    const post = parsePost(item);
    if (!post) continue;
    const existing = byId.get(post.id);
    if (!existing) {
      byId.set(post.id, post);
      continue;
    }
    const buckets = BUCKETS.filter(
      (bucket) =>
        existing.buckets.includes(bucket) || post.buckets.includes(bucket),
    );
    const winner = comparePosts(existing, post) <= 0 ? existing : post;
    byId.set(post.id, { ...winner, buckets });
  }
  return Array.from(byId.values());
}

function parsePost(value: unknown): ParsedPost | null {
  const record = asRecord(value);
  if (!record) return null;
  const canonical = canonicalStatusUrl(asString(record.url) ?? "");
  if (!canonical) return null;
  const id = asString(record.id);
  if (!id || id !== canonical.id) return null;
  const author = asRecord(record.author);
  const username = asString(author?.username) ?? canonical.username;
  const createdAt = asString(record.created_at) ?? "";
  const storedScore = asNumber(record.engagement_score);
  const text = typeof record.text === "string" ? record.text : "";
  return {
    id,
    url: canonical.url,
    text,
    excerpt: excerpt(text) || `Post by @${username}`,
    username,
    name: asString(author?.name),
    createdAt,
    day: createdAt ? utcDay(createdAt) : null,
    engagementScore:
      storedScore ?? engagementScore(asMetrics(record.public_metrics)),
    buckets: knownBuckets(record.buckets),
  };
}

function parseAccounts(value: unknown): AccountView[] {
  if (!Array.isArray(value)) return [];
  const byUsername = new Map<string, AccountView>();
  for (const item of value) {
    const account = parseAccount(item);
    if (!account) continue;
    if (!byUsername.has(account.username.toLowerCase())) {
      byUsername.set(account.username.toLowerCase(), account);
    }
  }
  return Array.from(byUsername.values());
}

function parseAccount(value: unknown): AccountView | null {
  const record = asRecord(value);
  if (!record) return null;
  const username = asString(record.username);
  const url = asString(record.url)?.trim() ?? "";
  if (!username || !isProfileUrl(url)) return null;
  const mostActive = record.most_active_bucket;
  return {
    username,
    name: asString(record.name),
    description: asString(record.description),
    followers: asNumber(record.followers),
    url,
    category: asString(record.category) ?? "other",
    postsInDataset: asNumber(record.posts_in_dataset) ?? 0,
    totalEngagement: asNumber(record.total_engagement) ?? 0,
    mostActiveBucket:
      typeof mostActive === "string" && mostActive.trim() !== ""
        ? mostActive
        : null,
  };
}

function buildDailyVolume(
  posts: ParsedPost[],
  windowStart: string,
  windowEnd: string,
): DailyVolumeRow[] {
  const counts = new Map<string, Record<BucketId, number>>();
  const bump = (day: string, bucket: BucketId) => {
    let row = counts.get(day);
    if (!row) {
      row = emptyDayCounts();
      counts.set(day, row);
    }
    row[bucket] += 1;
  };

  for (const post of posts) {
    if (!post.day) continue;
    for (const bucket of post.buckets) bump(post.day, bucket);
  }

  let start = utcDay(windowStart);
  let end = utcDay(windowEnd);
  const days = Array.from(counts.keys()).sort();
  if (!start) start = days[0] ?? null;
  if (!end) end = days[days.length - 1] ?? null;
  if (start && days[0] && days[0] < start) start = days[0];
  if (end && days.length > 0 && days[days.length - 1] > end) {
    end = days[days.length - 1];
  }
  if (!start || !end) return [];

  const rows: DailyVolumeRow[] = [];
  for (const date of eachUtcDay(start, end)) {
    rows.push({
      date,
      partial: isPartialWindowDay(windowEnd, date),
      ...(counts.get(date) ?? emptyDayCounts()),
    });
  }
  return rows;
}

function isPartialWindowDay(windowEnd: string, date: string): boolean {
  const endDay = utcDay(windowEnd);
  if (!endDay || endDay !== date) return false;
  return !isUtcMidnight(windowEnd);
}

function isUtcMidnight(iso: string): boolean {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  return (
    date.getUTCHours() === 0 &&
    date.getUTCMinutes() === 0 &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0
  );
}

function canonicalStatusUrl(
  url: string,
): { url: string; id: string; username: string } | null {
  const match = url.trim().match(STATUS_URL);
  const username = match?.[1];
  const id = match?.[2];
  if (!username || !id) return null;
  return { url: `https://x.com/${username}/status/${id}`, id, username };
}

function groupAccounts(accounts: AccountView[]): AccountGroupView[] {
  const grouped = new Map<string, AccountView[]>();
  for (const account of accounts) {
    const list = grouped.get(account.category) ?? [];
    list.push(account);
    grouped.set(account.category, list);
  }
  const ordered = [
    ...ACCOUNT_CATEGORY_ORDER.filter((category) => grouped.has(category)),
    ...Array.from(grouped.keys())
      .filter(
        (category) =>
          !ACCOUNT_CATEGORY_ORDER.includes(
            category as (typeof ACCOUNT_CATEGORY_ORDER)[number],
          ),
      )
      .sort(),
  ];
  return ordered.map((category) => ({
    category,
    label: categoryLabel(category),
    accounts: (grouped.get(category) ?? []).sort(compareAccounts),
  }));
}

function comparePosts(a: ParsedPost, b: ParsedPost): number {
  if (b.engagementScore !== a.engagementScore) {
    return b.engagementScore - a.engagementScore;
  }
  if (a.createdAt !== b.createdAt) {
    return b.createdAt.localeCompare(a.createdAt);
  }
  return b.id.localeCompare(a.id);
}

function compareAccounts(a: AccountView, b: AccountView): number {
  const followersA = a.followers ?? -1;
  const followersB = b.followers ?? -1;
  if (followersB !== followersA) return followersB - followersA;
  return a.username.localeCompare(b.username);
}

function knownBuckets(value: unknown): BucketId[] {
  if (!Array.isArray(value)) return [];
  const present = new Set(
    value.filter((item): item is string => typeof item === "string"),
  );
  return BUCKETS.filter((bucket) => present.has(bucket));
}

function emptyDayCounts(): Record<BucketId, number> {
  return {
    mech_interp: 0,
    sae_transcoders_crosscoders: 0,
    probes_steering: 0,
    alignment_safety: 0,
    competitor_watch: 0,
    bittensor_sn37_aurelius: 0,
  };
}

function eachUtcDay(start: string, end: string): string[] {
  const startMs = Date.parse(`${start}T00:00:00Z`);
  const endMs = Date.parse(`${end}T00:00:00Z`);
  if (Number.isNaN(startMs) || Number.isNaN(endMs) || startMs > endMs) {
    return [];
  }
  const days: string[] = [];
  for (let ms = startMs; ms <= endMs; ms += 86_400_000) {
    days.push(new Date(ms).toISOString().slice(0, 10));
  }
  return days;
}

function resolveLimit(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.floor(value));
}

function asMetrics(value: unknown): EngagementMetrics | null {
  const record = asRecord(value);
  if (!record) return null;
  return {
    like_count: asNumber(record.like_count) ?? undefined,
    retweet_count: asNumber(record.retweet_count) ?? undefined,
    quote_count: asNumber(record.quote_count) ?? undefined,
    reply_count: asNumber(record.reply_count) ?? undefined,
    bookmark_count: asNumber(record.bookmark_count) ?? undefined,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
