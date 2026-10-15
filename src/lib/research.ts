/**
 * Pure view-model for the research feeds on the standalone X Pulse page.
 *
 * The loader passes one snapshot here: the published `x-pulse-data` file,
 * or the bundled `src/data/research.json` if that fetch fails.
 * This module does not fetch. The shaped view stays short of the full export.
 *
 * Snapshot shape:
 * - generated_at, window_days, count
 * - items[]: source, title, url, date, authors, summary, topic_sets, score
 *
 * The daily x-pulse-data refresh writes `relevance` and `buckets` instead of
 * `score` and `topic_sets`. Both shapes are accepted; `score` and
 * `topic_sets` win when present. Its relevance is not on a 0-10 scale.
 *
 * The shaped view keeps a short ranked list per section so the browser does
 * not receive the full export.
 */

export const RESEARCH_SOURCES = [
  "arxiv",
  "huggingface",
  "github",
  "lesswrong",
  "goodfire",
  "neuronpedia",
] as const;

export type ResearchSource = (typeof RESEARCH_SOURCES)[number];

export const DEFAULT_PAPER_TOPIC = "mech_interp_proba";

/** Items shown before "Show more". */
export const RESEARCH_PREVIEW_COUNT = 5;

/** Highest-scoring arXiv papers kept per topic set. */
export const RESEARCH_PAPER_LIMIT = 12;

/** Highest-scoring Hugging Face rows kept. */
export const RESEARCH_MODEL_LIMIT = 12;

/**
 * GitHub, LessWrong, Goodfire, and Neuronpedia stay small in the export. The
 * cap is still well below the full snapshot so a larger future file cannot
 * ship everything.
 */
export const RESEARCH_SMALL_FEED_LIMIT = 20;

export const AUTHOR_PREVIEW_COUNT = 3;

const PAPER_TOPIC_ORDER = [
  "mech_interp_proba",
  // Buckets from the x-pulse-data refresh. mech_interp comes first so it
  // becomes the default topic when mech_interp_proba is absent.
  "mech_interp",
  "sae_transcoders_crosscoders",
  "probes_steering",
  "alignment_safety",
  "competitor_watch",
  "bittensor_sn37_aurelius",
  "alignment",
  "world_models",
  "moral_reasoning",
  "game_theory",
  "judge_models",
  "decentralized_ai",
  "tracked_repos",
] as const;

const TOPIC_LABELS: Record<string, string> = {
  mech_interp_proba: "Mech interp",
  mech_interp: "Mech interp",
  sae_transcoders_crosscoders: "SAEs, transcoders, crosscoders",
  probes_steering: "Probes and steering",
  alignment_safety: "Alignment and safety",
  competitor_watch: "Competitor watch",
  bittensor_sn37_aurelius: "Bittensor (incl. SN37)",
  alignment: "Alignment",
  world_models: "World models",
  moral_reasoning: "Moral reasoning",
  game_theory: "Game theory",
  judge_models: "Judge models",
  decentralized_ai: "Decentralized AI",
  tracked_repos: "Tracked repos",
};

export interface ResearchItemView {
  title: string;
  url: string;
  date: string;
  authors: string[];
  authorCount: number;
  summary: string;
  score: number;
}

export interface ResearchTopicView {
  id: string;
  label: string;
  count: number;
  items: ResearchItemView[];
}

export interface ResearchFeedView {
  count: number;
  items: ResearchItemView[];
}

export interface ResearchView {
  generatedAt: string;
  windowDays: number | null;
  count: number;
  papers: {
    defaultTopic: typeof DEFAULT_PAPER_TOPIC;
    topics: ResearchTopicView[];
  };
  models: ResearchFeedView;
  repos: ResearchFeedView;
  forum: ResearchFeedView;
  goodfire: ResearchFeedView;
  neuronpedia: ResearchFeedView;
}

export interface ShapeResearchOptions {
  paperLimit?: number;
  modelLimit?: number;
  smallFeedLimit?: number;
}

interface ResearchItem {
  source: ResearchSource;
  title: string;
  url: string;
  date: string;
  authors: string[];
  summary: string;
  topicSets: string[];
  score: number;
}

export function shapeResearch(
  input: unknown,
  options?: ShapeResearchOptions,
): ResearchView {
  const paperLimit = resolveLimit(options?.paperLimit, RESEARCH_PAPER_LIMIT);
  const modelLimit = resolveLimit(options?.modelLimit, RESEARCH_MODEL_LIMIT);
  const smallFeedLimit = resolveLimit(
    options?.smallFeedLimit,
    RESEARCH_SMALL_FEED_LIMIT,
  );
  const record = asRecord(input);
  const items = parseItems(record?.items).sort(compareItems);
  const papers = items.filter((item) => item.source === "arxiv");
  const topics = paperTopics(papers, paperLimit);

  return {
    generatedAt: asString(record?.generated_at) ?? "",
    windowDays: asCount(record?.window_days),
    count: items.length,
    papers: {
      defaultTopic: DEFAULT_PAPER_TOPIC,
      topics,
    },
    models: feed(
      items.filter((item) => item.source === "huggingface"),
      modelLimit,
    ),
    repos: feed(
      items.filter((item) => item.source === "github"),
      smallFeedLimit,
    ),
    forum: feed(
      items.filter((item) => item.source === "lesswrong"),
      smallFeedLimit,
    ),
    goodfire: feed(
      items.filter((item) => item.source === "goodfire"),
      smallFeedLimit,
    ),
    neuronpedia: feed(
      items.filter((item) => item.source === "neuronpedia"),
      smallFeedLimit,
    ),
  };
}

export function topicLabel(id: string): string {
  return TOPIC_LABELS[id] ?? id.replace(/_/g, " ");
}

function paperTopics(papers: ResearchItem[], limit: number): ResearchTopicView[] {
  const ids = new Set<string>();
  for (const paper of papers) {
    for (const topic of paper.topicSets) ids.add(topic);
  }
  const ordered = [
    ...PAPER_TOPIC_ORDER.filter((id) => ids.has(id)),
    ...Array.from(ids)
      .filter((id) => !PAPER_TOPIC_ORDER.includes(id as (typeof PAPER_TOPIC_ORDER)[number]))
      .sort(),
  ];
  return ordered.map((id) => {
    const matching = papers.filter((paper) => paper.topicSets.includes(id));
    return {
      id,
      label: topicLabel(id),
      count: matching.length,
      items: matching.slice(0, limit).map(toItemView),
    };
  });
}

function feed(items: ResearchItem[], limit: number): ResearchFeedView {
  return {
    count: items.length,
    items: items.slice(0, limit).map(toItemView),
  };
}

function toItemView(item: ResearchItem): ResearchItemView {
  return {
    title: item.title,
    url: item.url,
    date: item.date,
    authors: item.authors.slice(0, AUTHOR_PREVIEW_COUNT),
    authorCount: item.authors.length,
    summary: item.summary,
    score: item.score,
  };
}

function parseItems(value: unknown): ResearchItem[] {
  if (!Array.isArray(value)) return [];
  const byUrl = new Map<string, ResearchItem>();
  for (const entry of value) {
    const item = parseItem(entry);
    if (!item) continue;
    const existing = byUrl.get(item.url);
    if (!existing || compareItems(item, existing) < 0) {
      byUrl.set(item.url, item);
    }
  }
  return Array.from(byUrl.values());
}

function parseItem(value: unknown): ResearchItem | null {
  const record = asRecord(value);
  if (!record) return null;
  const source = asSource(record.source);
  const title = asString(record.title)?.trim() ?? "";
  const url = asString(record.url)?.trim() ?? "";
  const score = asNumber(record.score) ?? asNumber(record.relevance);
  if (!source || !title || !url || score === null) return null;
  const topicSets = Array.isArray(record.topic_sets)
    ? asStrings(record.topic_sets)
    : asStrings(record.buckets);
  return {
    source,
    title,
    url,
    date: asString(record.date)?.trim() ?? "",
    authors: asStrings(record.authors),
    summary: asString(record.summary)?.trim() ?? "",
    topicSets,
    score,
  };
}

function compareItems(a: ResearchItem, b: ResearchItem): number {
  if (a.score !== b.score) return b.score - a.score;
  const date = time(b.date) - time(a.date);
  if (date !== 0) return date;
  return a.url.localeCompare(b.url);
}

function time(iso: string): number {
  const value = Date.parse(iso);
  return Number.isFinite(value) ? value : 0;
}

function asSource(value: unknown): ResearchSource | null {
  if (typeof value !== "string") return null;
  return RESEARCH_SOURCES.includes(value as ResearchSource)
    ? (value as ResearchSource)
    : null;
}

function asStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asCount(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function resolveLimit(value: number | undefined, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.floor(value));
}
