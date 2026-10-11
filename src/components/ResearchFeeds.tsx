"use client";

import { useState, type ReactNode } from "react";
import {
  RESEARCH_PREVIEW_COUNT,
  type ResearchFeedView,
  type ResearchItemView,
  type ResearchView,
} from "@/lib/research";

const NUMBER_FORMAT = new Intl.NumberFormat("en-US");
const SCORE_FORMAT = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const FOCUS_RING =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e4b15a]";

const HEADINGS = {
  1: "h1",
  2: "h2",
  3: "h3",
  4: "h4",
  5: "h5",
} as const;

type Level = keyof typeof HEADINGS;

const NAV = [
  ["#x-pulse", "X"],
  ["#x-pulse-competitor", "Competitor"],
  ["#research-goodfire", "Goodfire"],
  ["#research-papers", "Papers"],
  ["#research-models", "Models"],
  ["#research-repos", "Repos"],
  ["#research-forum", "Forum"],
  ["#x-pulse-accounts", "Accounts"],
  ["#x-pulse-posts", "Posts"],
] as const;

export function ResearchNav() {
  return (
    <nav aria-label="Page sections" className="mt-6">
      <ul className="flex gap-2 overflow-x-auto pb-1">
        {NAV.map(([href, label]) => (
          <li key={href} className="shrink-0">
            <a
              href={href}
              className={`inline-block rounded-full border border-white/15 px-3 py-1 text-xs text-zinc-300 hover:border-[#e4b15a]/60 hover:text-[#f7f3ea] ${FOCUS_RING}`}
            >
              {label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function GoodfireResearch({ feed }: { feed: ResearchFeedView }) {
  return (
    <div
      id="research-goodfire"
      className="mt-4 scroll-mt-6 rounded-3xl border border-[#e4b15a]/40 bg-gradient-to-br from-[#1a1712] via-[#14161c] to-[#101114] p-5 sm:p-7"
    >
      <p className="max-w-xl text-sm text-zinc-400">
        Goodfire research posts from the static export, ranked by score and
        then by date.
      </p>
      <FeedCount count={feed.count} shown={feed.items.length} noun="items" />
      <FeedList items={feed.items} label="Goodfire research" />
    </div>
  );
}

export function ResearchSections({
  research,
  base,
}: {
  research: ResearchView;
  base: Level;
}) {
  const heading = deeper(base, 1);
  const subheading = deeper(base, 2);
  return (
    <div className="mt-12">
      <p className="text-xs uppercase tracking-[0.22em] text-[#e4b15a]">
        Research
      </p>
      <Heading
        level={heading}
        id="research-feeds"
        className="mt-2 font-serif text-3xl tracking-tight text-[#f7f3ea]"
      >
        Feeds
      </Heading>
      <p className="mt-3 max-w-2xl text-sm text-zinc-400">
        Research as of{" "}
        <time dateTime={research.generatedAt || undefined}>
          {formatUtcTimestamp(research.generatedAt)}
        </time>
        {research.windowDays !== null ? (
          <>
            <span aria-hidden="true"> · </span>
            {formatNumber(research.windowDays)}-day window
          </>
        ) : null}
        <span aria-hidden="true"> · </span>
        {formatNumber(research.count)} items. Ranked lists, not the full
        export.
      </p>

      <Papers research={research} level={subheading} />
      <FeedSection
        id="research-models"
        kicker="Hugging Face"
        title="Models & Datasets"
        level={subheading}
        feed={research.models}
        noun="items"
        dek="Models and datasets, ranked by score and then by date."
      />
      <FeedSection
        id="research-repos"
        kicker="GitHub"
        title="Repos & Releases"
        level={subheading}
        feed={research.repos}
        noun="items"
        dek="Repository activity and releases, ranked by score and then by date."
      />
      <FeedSection
        id="research-forum"
        kicker="LessWrong / Alignment Forum"
        title="Forum"
        level={subheading}
        feed={research.forum}
        noun="posts"
        dek="Forum posts in this export, ranked by score and then by date."
      />
    </div>
  );
}

function Papers({
  research,
  level,
}: {
  research: ResearchView;
  level: Level;
}) {
  const topics = research.papers.topics;
  const initial =
    topics.find((topic) => topic.id === research.papers.defaultTopic)?.id ??
    topics[0]?.id ??
    research.papers.defaultTopic;
  const [topicId, setTopicId] = useState(initial);
  const selected = topics.find((topic) => topic.id === topicId) ?? topics[0];

  return (
    <section id="research-papers" className="mt-10 scroll-mt-6">
      <p className="text-xs uppercase tracking-[0.22em] text-[#e4b15a]">arXiv</p>
      <Heading
        level={level}
        className="mt-2 font-serif text-3xl tracking-tight text-[#f7f3ea]"
      >
        Papers
      </Heading>
      <p className="mt-3 max-w-2xl text-sm text-zinc-400">
        Default topic is mech interp. Papers are ranked by score and then by
        date.
      </p>
      {topics.length > 0 && selected ? (
        <>
          <div
            role="group"
            aria-label="arXiv topic sets"
            className="mt-4 flex flex-wrap gap-2"
          >
            {topics.map((topic) => {
              const pressed = topic.id === selected.id;
              return (
                <button
                  key={topic.id}
                  type="button"
                  aria-pressed={pressed}
                  onClick={() => setTopicId(topic.id)}
                  className={`rounded-full border px-3 py-1 text-xs ${FOCUS_RING} ${
                    pressed
                      ? "border-[#e4b15a] text-[#f7f3ea]"
                      : "border-white/15 text-zinc-400"
                  }`}
                >
                  {topic.label}
                  <span className="ml-1 tabular-nums lining-nums text-zinc-400">
                    {formatNumber(topic.count)}
                  </span>
                </button>
              );
            })}
          </div>
          <FeedCount
            count={selected.count}
            shown={selected.items.length}
            noun="papers"
          />
          <FeedList
            key={selected.id}
            items={selected.items}
            label={`${selected.label} papers`}
          />
        </>
      ) : (
        <p className="mt-4 text-sm text-zinc-400">No papers in this snapshot.</p>
      )}
    </section>
  );
}

function FeedSection({
  id,
  kicker,
  title,
  level,
  feed,
  noun,
  dek,
}: {
  id: string;
  kicker: string;
  title: string;
  level: Level;
  feed: ResearchFeedView;
  noun: string;
  dek: string;
}) {
  return (
    <section id={id} className="mt-10 scroll-mt-6">
      <p className="text-xs uppercase tracking-[0.22em] text-[#e4b15a]">
        {kicker}
      </p>
      <Heading
        level={level}
        className="mt-2 font-serif text-3xl tracking-tight text-[#f7f3ea]"
      >
        {title}
      </Heading>
      <p className="mt-3 max-w-2xl text-sm text-zinc-400">{dek}</p>
      <FeedCount count={feed.count} shown={feed.items.length} noun={noun} />
      <FeedList items={feed.items} label={title} />
    </section>
  );
}

function FeedCount({
  count,
  shown,
  noun,
}: {
  count: number;
  shown: number;
  noun: string;
}) {
  return (
    <p className="mt-3 text-sm text-zinc-400">
      {formatNumber(count)} {noun} in this snapshot
      {shown < count ? ` · showing top ${formatNumber(shown)}` : ""}.
    </p>
  );
}

function FeedList({
  items,
  label,
}: {
  items: ResearchItemView[];
  label: string;
}) {
  const [expanded, setExpanded] = useState(false);
  if (items.length === 0) {
    return <p className="mt-4 text-sm text-zinc-400">Nothing in this snapshot.</p>;
  }
  const visible = expanded ? items : items.slice(0, RESEARCH_PREVIEW_COUNT);
  const hidden = items.length - visible.length;
  return (
    <>
      <ul aria-label={label} className="mt-4 space-y-3">
        {visible.map((item) => (
          <li key={item.url}>
            <ResearchCard item={item} />
          </li>
        ))}
      </ul>
      {items.length > RESEARCH_PREVIEW_COUNT ? (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
          className={`mt-4 text-sm text-zinc-300 underline decoration-white/20 underline-offset-4 hover:decoration-[#e4b15a] ${FOCUS_RING}`}
        >
          {expanded ? "Show fewer" : `Show ${formatNumber(hidden)} more`}
        </button>
      ) : null}
    </>
  );
}

function ResearchCard({ item }: { item: ResearchItemView }) {
  const authors = authorLine(item);
  return (
    <article className="x-pulse-card rounded-2xl border border-white/10 bg-black/25 p-4">
      <div className="flex items-start justify-between gap-3">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="min-w-0 font-serif text-lg leading-snug text-[#f7f3ea] underline decoration-white/20 underline-offset-4 hover:decoration-[#e4b15a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e4b15a]"
        >
          {item.title}
          <span aria-hidden="true"> ↗</span>
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
        <span className="inline-flex shrink-0 rounded-full border border-[#e4b15a]/30 bg-[#e4b15a]/10 px-2.5 py-0.5 text-xs tabular-nums lining-nums text-[#f3d7a1]">
          {SCORE_FORMAT.format(item.score)}
        </span>
      </div>
      <p className="mt-2 text-xs text-zinc-400">
        {item.date ? (
          <time dateTime={item.date}>{formatUtcDay(item.date)}</time>
        ) : (
          "Date unknown"
        )}
        {authors ? ` · ${authors}` : ""}
      </p>
      {item.summary ? (
        <p className="mt-2 text-sm leading-relaxed text-zinc-300">{item.summary}</p>
      ) : null}
    </article>
  );
}

function authorLine(item: ResearchItemView): string {
  if (item.authorCount === 0) return "";
  const extra = item.authorCount - item.authors.length;
  if (extra > 0) {
    return `${item.authors.join(", ")}, and ${formatNumber(extra)} more`;
  }
  return item.authors.join(", ");
}

function Heading({
  level,
  className,
  children,
  id,
}: {
  level: Level;
  className?: string;
  children: ReactNode;
  id?: string;
}) {
  const Tag = HEADINGS[level];
  return (
    <Tag id={id} className={className}>
      {children}
    </Tag>
  );
}

function deeper(base: Level, steps: number): Level {
  return Math.min(5, base + steps) as Level;
}

function formatNumber(value: number): string {
  return NUMBER_FORMAT.format(value);
}

function formatUtcTimestamp(iso: string): string {
  if (!iso) return "unknown";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

function formatUtcDay(iso: string): string {
  if (!iso) return "unknown";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
