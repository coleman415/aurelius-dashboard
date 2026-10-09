"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BUCKETS,
  GOODFIRE_USERNAME,
  type BucketId,
  type PostView,
  type XPulseView,
} from "@/lib/x-pulse";

const SERIES: { id: BucketId; color: string; dash?: string }[] = [
  { id: "mech_interp", color: "#7eb6ff" },
  { id: "sae_transcoders_crosscoders", color: "#c4b5fd", dash: "6 4" },
  { id: "probes_steering", color: "#6ee7b7", dash: "2 2" },
  { id: "alignment_safety", color: "#fbbf24", dash: "8 3 2 3" },
  { id: "competitor_watch", color: "#fb7185", dash: "1 3" },
  { id: "bittensor_sn37_aurelius", color: "#d4d4d8", dash: "4 2 1 2" },
];

const MOBILE_SERIES = new Set<BucketId>([
  "mech_interp",
  "alignment_safety",
  "competitor_watch",
]);

const NUMBER_FORMAT = new Intl.NumberFormat("en-US");
const STALE_AFTER_MS = 36 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const FOCUS_RING =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e4b15a]";
const SECTION_HEADING = "font-serif text-3xl tracking-tight text-[#f7f3ea]";

const HEADINGS = {
  1: "h1",
  2: "h2",
  3: "h3",
  4: "h4",
  5: "h5",
} as const;

type Level = keyof typeof HEADINGS;

export function XPulse({
  view,
  variant = "embedded",
}: {
  view: XPulseView;
  variant?: "embedded" | "standalone";
}) {
  const base: Level = variant === "standalone" ? 1 : 2;
  return <XPulsePanel view={view} base={base} variant={variant} />;
}

function XPulsePanel({
  view,
  base,
  variant,
}: {
  view: XPulseView;
  base: Level;
  variant: "embedded" | "standalone";
}) {
  const [compact, setCompact] = useState(false);
  const [showAllSeries, setShowAllSeries] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 639px)");
    const apply = () => setCompact(media.matches);
    const timer = window.setTimeout(apply, 0);
    media.addEventListener("change", apply);
    return () => {
      window.clearTimeout(timer);
      media.removeEventListener("change", apply);
    };
  }, []);

  const series =
    compact && !showAllSeries
      ? SERIES.filter((item) => MOBILE_SERIES.has(item.id))
      : SERIES;
  const chartLabel = chartAccessibleName(view);
  const partialNote = partialDaySentence(
    view.dailyVolume.filter((row) => row.partial),
  );

  return (
    <section
      id="x-pulse"
      aria-labelledby="x-pulse-heading"
      className={`x-pulse x-pulse-rise font-sans rounded-3xl border border-white/10 px-4 py-6 sm:px-8 sm:py-10 ${
        variant === "embedded"
          ? "shadow-[0_12px_40px_rgba(0,0,0,0.2)]"
          : "shadow-[0_30px_80px_rgba(0,0,0,0.35)]"
      }`}
    >
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-6">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.28em] text-[#e4b15a]">
            Alignment and mech interp
          </p>
          <Heading
            level={base}
            id="x-pulse-heading"
            className={`mt-2 font-serif text-4xl leading-none tracking-tight text-[#f7f3ea] ${
              variant === "embedded" ? "sm:text-5xl" : "sm:text-6xl"
            }`}
          >
            X Pulse
          </Heading>
          <p className="mt-4 text-sm leading-relaxed text-zinc-400">
            Public posts on X
            <span aria-hidden="true"> · </span>
            Data as of{" "}
            <time dateTime={view.fetchedAt || undefined}>
              {formatUtcTimestamp(view.fetchedAt)}
            </time>
          </p>
          <SnapshotAge fetchedAt={view.fetchedAt} />
          <p className="mt-1 text-sm text-zinc-400">
            Window{" "}
            <time dateTime={view.windowStart || undefined}>
              {formatUtcDay(view.windowStart)}
            </time>
            {" – "}
            <time dateTime={view.windowEnd || undefined}>
              {formatUtcDay(view.windowEnd)}
            </time>{" "}
            UTC
            <span aria-hidden="true"> · </span>
            {formatNumber(view.postCount)} posts
            <span aria-hidden="true"> · </span>
            {formatNumber(view.accountCount)} accounts
          </p>
        </div>
        {variant === "embedded" ? (
          <Link
            href="/x-pulse"
            className="text-sm text-[#f4f1ea] underline decoration-[#e4b15a]/60 underline-offset-4 hover:decoration-[#e4b15a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e4b15a]"
          >
            Open full pulse
          </Link>
        ) : null}
      </div>

      {view.scoring && (
        <p className="mt-4 max-w-3xl text-xs leading-relaxed text-zinc-400">
          Engagement score: {view.scoring}. Daily counts are this curated
          sample, not all posts on X. A post can sit in more than one topic.
        </p>
      )}

      <div className="mt-8">
        <Heading level={nextLevel(base)} className={SECTION_HEADING}>
          Daily volume
        </Heading>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {view.buckets.map((bucket) => (
            <div
              key={bucket.id}
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
            >
              <p className="text-xs text-zinc-400">{bucket.label}</p>
              <p className="mt-1 font-serif text-3xl tabular-nums lining-nums text-[#f7f3ea]">
                {formatNumber(bucket.count)}
              </p>
              <p className="text-xs text-zinc-400">
                {bucket.count === 0
                  ? "No posts in sample"
                  : bucket.thin
                    ? "Thin sample"
                    : "Posts in sample"}
              </p>
            </div>
          ))}
        </div>

        {view.dailyVolume.length > 0 ? (
          <>
            <div className="mt-4 flex flex-wrap gap-2 sm:hidden">
              <button
                type="button"
                aria-pressed={!showAllSeries}
                onClick={() => setShowAllSeries(false)}
                className={`rounded-full border px-3 py-1 text-xs ${FOCUS_RING} ${
                  !showAllSeries
                    ? "border-[#e4b15a] text-[#f7f3ea]"
                    : "border-white/15 text-zinc-400"
                }`}
              >
                Mech interp, Alignment, Competitors
              </button>
              <button
                type="button"
                aria-pressed={showAllSeries}
                onClick={() => setShowAllSeries(true)}
                className={`rounded-full border px-3 py-1 text-xs ${FOCUS_RING} ${
                  showAllSeries
                    ? "border-[#e4b15a] text-[#f7f3ea]"
                    : "border-white/15 text-zinc-400"
                }`}
              >
                All topics
              </button>
            </div>
            <div
              className="mt-3 h-72 min-w-0 sm:mt-6 sm:h-80"
              role="img"
              aria-label={chartLabel}
            >
              <ResponsiveContainer
                width="100%"
                height="100%"
                minWidth={0}
                initialDimension={{ width: 800, height: 320 }}
              >
                <ComposedChart
                  data={view.dailyVolume}
                  accessibilityLayer={false}
                  margin={{ top: 20, right: 108, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    stroke="#2a2e38"
                    strokeDasharray="3 8"
                    vertical={false}
                  />
                  <PartialDayBand rows={view.dailyVolume} />
                  <XAxis
                    dataKey="date"
                    ticks={axisTicks(view.dailyVolume, !compact)}
                    interval={0}
                    padding={{ left: 12, right: 4 }}
                    tick={(props) => (
                      <VolumeAxisTick
                        x={props.x}
                        y={props.y}
                        payload={props.payload}
                        rows={view.dailyVolume}
                      />
                    )}
                    stroke="#71717a"
                    axisLine={false}
                    tickLine={false}
                    height={32}
                  />
                  <YAxis
                    allowDecimals={false}
                    stroke="#71717a"
                    tick={{ fill: "#a1a1aa", fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    width={32}
                  />
                  <Tooltip
                    content={(props) => (
                      <VolumeTooltip
                        active={props.active}
                        label={props.label}
                        payload={props.payload}
                        rows={view.dailyVolume}
                      />
                    )}
                  />
                  {series.some((item) => item.id === "mech_interp") ? (
                    <Area
                      type="linear"
                      dataKey="mech_interp"
                      name={seriesName(view, "mech_interp")}
                      stroke="#7eb6ff"
                      strokeWidth={2}
                      fill="#7eb6ff"
                      fillOpacity={0.12}
                      dot={false}
                      activeDot={false}
                      isAnimationActive={false}
                    />
                  ) : null}
                  {series
                    .filter((item) => item.id !== "mech_interp")
                    .map((item) => (
                      <Line
                        key={item.id}
                        type="linear"
                        dataKey={item.id}
                        name={seriesName(view, item.id)}
                        stroke={item.color}
                        strokeDasharray={item.dash}
                        strokeWidth={2}
                        dot={false}
                        activeDot={false}
                        isAnimationActive={false}
                      />
                    ))}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <p className="mt-6 text-sm text-zinc-400">
            No dated posts in this sample.
          </p>
        )}

        {partialNote && (
          <p className="mt-3 text-sm text-zinc-400">{partialNote}</p>
        )}

        <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
          {SERIES.map((item) => {
            const bucket = view.buckets.find((entry) => entry.id === item.id);
            if (!bucket) return null;
            return (
              <li
                key={item.id}
                className="flex items-center gap-2 text-xs text-zinc-400"
              >
                <svg width="40" height="8" aria-hidden="true">
                  <line
                    x1="0"
                    y1="4"
                    x2="40"
                    y2="4"
                    stroke={item.color}
                    strokeWidth="2"
                    strokeDasharray={item.dash}
                  />
                </svg>
                <span>
                  {bucket.shortLabel}: {formatNumber(bucket.count)}
                  {bucket.thin ? " (thin sample)" : ""}
                  {bucket.count === 0 ? " (none)" : ""}
                </span>
              </li>
            );
          })}
        </ul>

        {view.dailyVolume.length > 0 && (
          <details className="mt-4">
            <summary className={`cursor-pointer text-sm text-zinc-300 ${FOCUS_RING}`}>
              Daily counts by topic
            </summary>
            <div
              className={`mt-3 overflow-x-auto ${FOCUS_RING}`}
              tabIndex={0}
              role="region"
              aria-label="Daily counts by topic"
            >
              <table className="w-full text-left text-sm">
                <caption className="sr-only">
                  Daily sample volume by topic. Zero means no posts that day in
                  this sample. A date marked partial is not a full UTC day.
                </caption>
                <thead>
                  <tr className="border-b border-white/10 text-zinc-400">
                    <th
                      scope="col"
                      className="sticky left-0 z-10 bg-[#0c0e12] py-2 pr-3 font-medium"
                    >
                      Date
                    </th>
                    {view.buckets.map((bucket) => (
                      <th key={bucket.id} scope="col" className="px-2 py-2 font-medium">
                        {bucket.shortLabel}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {view.dailyVolume.map((row) => (
                    <tr key={row.date} className="border-b border-white/5">
                      <th
                        scope="row"
                        className="sticky left-0 z-10 whitespace-nowrap bg-[#0c0e12] py-1.5 pr-3 font-normal text-zinc-300"
                      >
                        {formatVolumeDay(row.date, view.dailyVolume)}
                      </th>
                      {BUCKETS.map((bucket) => (
                        <td
                          key={bucket}
                          className="px-2 py-1.5 tabular-nums lining-nums text-zinc-100"
                        >
                          {formatNumber(row[bucket])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <Heading level={nextLevel(base)} className={SECTION_HEADING}>
            Competitor watch
          </Heading>
          <CompetitorWatch view={view} base={base} />
        </div>
        <div className="lg:col-span-2">
          <Heading level={nextLevel(base)} className={SECTION_HEADING}>
            Key accounts
          </Heading>
          <KeyAccounts view={view} base={base} />
        </div>
      </div>

      <div className="mt-10">
        <Heading level={nextLevel(base)} className={SECTION_HEADING}>
          Top posts
        </Heading>
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          {view.buckets.map((bucket) => (
            <div key={bucket.id} id={`x-pulse-bucket-${bucket.id}`}>
              <Heading
                level={deeper(base, 2)}
                className="text-sm font-medium text-[#f7f3ea]"
              >
                {bucket.label}
              </Heading>
              <p className="mb-3 mt-0.5 text-xs text-zinc-400">
                {formatNumber(bucket.count)} posts in sample
                {bucket.thin ? " · Thin sample" : ""}
                {bucket.count === 0 ? " · No posts in sample" : ""}
              </p>
              {bucket.topPosts.length > 0 ? (
                <ul className="space-y-3">
                  {bucket.topPosts.map((post) => (
                    <li key={post.id}>
                      <PostCard post={post} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-zinc-400">No posts in this sample.</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CompetitorWatch({
  view,
  base,
}: {
  view: XPulseView;
  base: Level;
}) {
  const watch = view.competitorWatch;
  const org = watch.organization;
  const people = watch.affiliatedAccounts.filter(
    (account) => account.username.toLowerCase() !== GOODFIRE_USERNAME,
  );
  const outsideBucket = watch.postCount - watch.goodfireInBucketCount;

  return (
    <div
      id="x-pulse-competitor"
      className="mt-4 overflow-hidden rounded-3xl border border-[#e4b15a]/40 bg-gradient-to-br from-[#221c14] via-[#16130f] to-[#101114] p-5 sm:p-7"
    >
      <Heading
        level={deeper(base, 2)}
        className="font-serif text-2xl tracking-tight text-[#f7f3ea]"
      >
        {watch.name} ({watch.product})
      </Heading>
      <p className="mt-2 max-w-xl text-sm text-zinc-400">
        Posts from Goodfire accounts and posts that mention Goodfire or Silico.
      </p>
      <p className="mt-3 max-w-xl text-sm text-[#f4f1ea]">
        {formatNumber(watch.goodfireInBucketCount)} of{" "}
        {formatNumber(watch.competitorBucketCount)} competitor posts are
        Goodfire-related.
        {outsideBucket > 0
          ? ` ${formatNumber(outsideBucket)} other Goodfire ${outsideBucket === 1 ? "mention is" : "mentions are"} outside that topic.`
          : ""}
      </p>
      {org ? (
        <p className="mt-4 text-sm text-zinc-200">
          <ProfileLink accountUrl={org.url} username={org.username} />
          {org.name ? <span> · {org.name}</span> : null}
          {org.description ? (
            <span className="mt-1 block text-zinc-400">{org.description}</span>
          ) : null}
        </p>
      ) : (
        <p className="mt-4 text-sm text-zinc-400">
          Goodfire&apos;s account was not in this snapshot.
        </p>
      )}
      <dl className="mt-5 grid grid-cols-1 gap-3 min-[420px]:grid-cols-3">
        <Stat
          label="Followers"
          value={
            org && org.followers !== null ? formatNumber(org.followers) : "unknown"
          }
        />
        <Stat label="Own posts" value={org ? formatNumber(org.postsInDataset) : "unknown"} />
        <Stat label="Related posts" value={formatNumber(watch.postCount)} />
      </dl>

      {people.length > 0 && (
        <div className="mt-6">
          <Heading
            level={deeper(base, 3)}
            className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-400"
          >
            Accounts tied to Goodfire
          </Heading>
          <ul className="mt-3 flex flex-wrap gap-2">
            {people.map((account) => (
              <li
                key={account.username}
                className="flex items-center gap-2 rounded-full border border-white/10 bg-black/20 py-1 pl-1 pr-3"
              >
                <Initials username={account.username} name={account.name} />
                <span className="text-sm">
                  <ProfileLink accountUrl={account.url} username={account.username} />
                  <span className="text-zinc-400">
                    {` · ${formatNumber(account.postsInDataset)} posts`}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6">
        <Heading
          level={deeper(base, 3)}
          className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-400"
        >
          Top Goodfire posts
        </Heading>
        {watch.posts.length > 0 ? (
          <ul className="mt-3 space-y-3">
            {watch.posts.map((post) => (
              <li key={post.id}>
                <PostCard post={post} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-zinc-400">
            No Goodfire posts in this sample.
          </p>
        )}
      </div>

      {watch.otherCompetitors.length > 0 && (
        <div className="mt-6 border-t border-white/10 pt-4">
          <Heading
            level={deeper(base, 3)}
            className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-400"
          >
            Other competitor accounts
          </Heading>
          <ul className="mt-2 space-y-1">
            {watch.otherCompetitors.map((account) => (
              <li key={account.username} className="text-sm">
                <ProfileLink accountUrl={account.url} username={account.username} />
                <span className="text-zinc-400">
                  {account.name ? ` · ${account.name}` : ""}
                  {` · ${formatNumber(account.postsInDataset)} posts in sample`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p
        aria-hidden="true"
        className="pointer-events-none mt-8 hidden text-right font-serif text-6xl leading-none text-[#e4b15a]/[0.08] sm:block"
      >
        {watch.product}
      </p>
    </div>
  );
}

function KeyAccounts({ view, base }: { view: XPulseView; base: Level }) {
  return (
    <div id="x-pulse-accounts" className="mt-4">
      <p className="mb-3 text-sm text-zinc-400">
        {formatNumber(view.accountCount)} accounts.
      </p>
      <div
        className={`overflow-y-auto rounded-3xl border border-white/10 bg-white/[0.03] p-4 pr-2 lg:max-h-[32rem] ${FOCUS_RING}`}
        role="region"
        aria-label="Key accounts"
        tabIndex={0}
      >
        {view.keyAccountGroups.length > 0 ? (
          view.keyAccountGroups.map((group) =>
            group.category === "active_author" ? (
              <div key={group.category} className="mb-4">
                <Heading
                  level={deeper(base, 2)}
                  className="text-sm font-medium text-[#f7f3ea]"
                >
                  {group.label}
                </Heading>
                <details className="mt-1">
                  <summary className={`cursor-pointer text-sm text-zinc-300 ${FOCUS_RING}`}>
                    Show {formatNumber(group.accounts.length)} active authors
                  </summary>
                  <AccountList accounts={group.accounts} />
                </details>
              </div>
            ) : (
              <div key={group.category} className="mb-4">
                <Heading
                  level={deeper(base, 2)}
                  className="text-sm font-medium text-[#f7f3ea]"
                >
                  {group.label}
                </Heading>
                <AccountList accounts={group.accounts} />
              </div>
            ),
          )
        ) : (
          <p className="text-sm text-zinc-400">No accounts in this snapshot.</p>
        )}
      </div>
    </div>
  );
}

function AccountList({
  accounts,
}: {
  accounts: XPulseView["keyAccountGroups"][number]["accounts"];
}) {
  return (
    <ul>
      {accounts.map((account) => (
        <li
          key={account.username}
          className="flex gap-3 border-b border-white/5 py-2.5"
        >
          <Initials username={account.username} name={account.name} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <ProfileLink accountUrl={account.url} username={account.username} />
              <span className="text-xs text-zinc-400">
                {account.followers === null
                  ? "Followers unknown"
                  : `${formatNumber(account.followers)} followers`}
                {" · "}
                {formatNumber(account.postsInDataset)} posts
              </span>
            </div>
            {(account.name || account.description) && (
              <p className="mt-0.5 text-xs text-zinc-400">
                {account.name}
                {account.name && account.description ? " — " : ""}
                {account.description}
              </p>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

function PostCard({ post }: { post: PostView }) {
  return (
    <article className="x-pulse-card rounded-2xl border border-white/10 bg-black/25 p-4">
      <div className="flex gap-3">
        <Initials username={post.username} name={post.name} />
        <div className="min-w-0">
          <p className="text-xs text-zinc-400">
            @{post.username}
            {post.createdAt ? (
              <>
                {" · "}
                <time dateTime={post.createdAt}>{formatUtcDay(post.createdAt)}</time>
              </>
            ) : null}
          </p>
          <a
            href={post.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 block text-sm leading-snug text-[#f7f3ea] underline decoration-white/20 underline-offset-4 hover:decoration-[#e4b15a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e4b15a]"
          >
            {post.excerpt}
            <span aria-hidden="true"> ↗</span>
            <span className="sr-only"> (post on X, opens in new tab)</span>
          </a>
          <p className="mt-3">
            <span className="inline-flex rounded-full border border-[#e4b15a]/30 bg-[#e4b15a]/10 px-2.5 py-0.5 text-xs tabular-nums lining-nums text-[#f3d7a1]">
              {formatNumber(post.engagementScore)} engagement
            </span>
          </p>
        </div>
      </div>
    </article>
  );
}

function Initials({
  username,
  name,
}: {
  username: string;
  name: string | null;
}) {
  return (
    <span
      aria-hidden="true"
      className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 font-serif text-xs tracking-wide text-[#e4b15a]"
    >
      {initials(username, name)}
    </span>
  );
}

function ProfileLink({
  accountUrl,
  username,
}: {
  accountUrl: string;
  username: string;
}) {
  return (
    <a
      href={accountUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm font-medium text-[#f7f3ea] underline decoration-white/25 underline-offset-4 hover:decoration-[#e4b15a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e4b15a]"
    >
      @{username}
      <span aria-hidden="true"> ↗</span>
      <span className="sr-only"> on X, opens in new tab</span>
    </a>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2">
      <dt className="text-xs text-zinc-400">{label}</dt>
      <dd className="font-serif text-xl tabular-nums lining-nums text-[#f7f3ea]">
        {value}
      </dd>
    </div>
  );
}

function PartialDayBand({ rows }: { rows: XPulseView["dailyVolume"] }) {
  const band = partialBand(rows);
  if (!band) return null;
  return (
    <ReferenceArea
      x1={band.x1}
      x2={band.x2}
      fill="#e4b15a"
      fillOpacity={0.08}
      strokeOpacity={0}
      label={{
        value: "partial",
        position: "insideTopRight",
        fill: "#e4b15a",
        fontSize: 12,
      }}
    />
  );
}

function VolumeTooltip({
  active,
  payload,
  label,
  rows,
}: {
  active?: boolean;
  payload?: ReadonlyArray<{
    dataKey?: unknown;
    name?: unknown;
    value?: unknown;
  }>;
  label?: unknown;
  rows: XPulseView["dailyVolume"];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const day = String(label ?? "");
  return (
    <div className="rounded-xl border border-white/10 bg-[#14161c] px-3 py-2 text-xs text-zinc-200 shadow-xl">
      <p className="mb-1 font-medium text-[#f7f3ea]">
        {formatVolumeDay(day, rows)}
      </p>
      <ul className="space-y-1">
        {payload.map((item) => {
          const id = String(item.dataKey ?? "");
          const series = SERIES.find((entry) => entry.id === id);
          return (
            <li key={id} className="flex items-center gap-2">
              <svg width="28" height="8" aria-hidden="true">
                <line
                  x1="0"
                  y1="4"
                  x2="28"
                  y2="4"
                  stroke={series?.color ?? "#fff"}
                  strokeWidth="2"
                  strokeDasharray={series?.dash}
                />
              </svg>
              <span>
                {String(item.name ?? id)}: {formatNumber(Number(item.value) || 0)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function VolumeAxisTick({
  x = 0,
  y = 0,
  payload,
  rows,
}: {
  x?: string | number;
  y?: string | number;
  payload?: { value?: string | number };
  rows: XPulseView["dailyVolume"];
}) {
  const day = String(payload?.value ?? "");
  const partial = rows.some((row) => row.date === day && row.partial);
  const lastFull = lastFullDay(rows);
  const besidePartial =
    !partial && day === lastFull && rows.some((row) => row.partial);
  const anchor = partial ? "start" : besidePartial ? "end" : "middle";
  const dx = partial ? 6 : besidePartial ? -6 : 0;
  return (
    <text
      x={Number(x) + dx}
      y={Number(y)}
      dy={14}
      textAnchor={anchor}
      fill="#a1a1aa"
      fontSize={12}
    >
      {formatVolumeDay(day, rows)}
    </text>
  );
}

function Heading({
  level,
  className,
  children,
  id,
}: {
  level: Level;
  className?: string;
  children: React.ReactNode;
  id?: string;
}) {
  const Tag = HEADINGS[level];
  return (
    <Tag id={id} className={className}>
      {children}
    </Tag>
  );
}

function nextLevel(base: Level): Level {
  return deeper(base, 1);
}

function deeper(base: Level, steps: number): Level {
  return Math.min(5, base + steps) as Level;
}

function seriesName(view: XPulseView, id: BucketId): string {
  return view.buckets.find((bucket) => bucket.id === id)?.shortLabel ?? id;
}

function chartAccessibleName(view: XPulseView): string {
  const totals = view.buckets
    .map((bucket) => `${bucket.label}: ${formatNumber(bucket.count)}`)
    .join("; ");
  const partialNote = partialDaySentence(
    view.dailyVolume.filter((row) => row.partial),
  );
  return [
    `Daily sample volume by topic. ${totals}.`,
    busiestDayPhrase(view.dailyVolume),
    partialNote,
  ]
    .filter(Boolean)
    .join(" ");
}

function busiestDayPhrase(rows: XPulseView["dailyVolume"]): string {
  let bestDate = "";
  let best = -1;
  for (const row of rows) {
    const total = BUCKETS.reduce((sum, id) => sum + row[id], 0);
    if (total > best) {
      best = total;
      bestDate = row.date;
    }
  }
  if (!bestDate || best <= 0) return "";
  return `Busiest day ${formatChartDay(bestDate)}.`;
}

function lastFullDay(rows: XPulseView["dailyVolume"]): string | null {
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    if (!rows[index].partial) return rows[index].date;
  }
  return null;
}

function partialBand(
  rows: XPulseView["dailyVolume"],
): { x1: string; x2: string } | null {
  const first = rows.findIndex((row) => row.partial);
  if (first < 0) return null;
  let last = first;
  for (let index = rows.length - 1; index >= first; index -= 1) {
    if (rows[index].partial) {
      last = index;
      break;
    }
  }
  const x1 = first > 0 ? rows[first - 1].date : rows[first].date;
  const x2 = rows[last].date;
  if (x1 === x2) return null;
  return { x1, x2 };
}

function axisTicks(rows: XPulseView["dailyVolume"], dense: boolean): string[] {
  if (rows.length === 0) return [];
  const dates = rows.map((row) => row.date);
  const indexOf = new Map(dates.map((date, index) => [date, index]));
  const chosen = new Set<string>([dates[0], dates[dates.length - 1]]);
  const lastFull = lastFullDay(rows);
  if (lastFull) chosen.add(lastFull);
  if (dense) {
    const protectedIndexes = new Set<number>();
    for (const date of chosen) {
      const index = indexOf.get(date);
      if (index !== undefined) protectedIndexes.add(index);
    }
    const tooClose = (index: number) =>
      [...protectedIndexes].some(
        (kept) => kept !== index && Math.abs(kept - index) < 5,
      );
    for (const fraction of [1 / 3, 2 / 3]) {
      const index = Math.round((dates.length - 1) * fraction);
      if (!tooClose(index)) {
        chosen.add(dates[index]);
        protectedIndexes.add(index);
      }
    }
  }
  return dates.filter((date) => chosen.has(date));
}

function initials(username: string, name: string | null): string {
  const labeled = (name ?? "").trim();
  const parts = labeled.split(/\s+/).filter((part) => /[A-Za-z0-9]/.test(part));
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  const compact = (labeled || username).replace(/[^A-Za-z0-9]/g, "");
  return (compact.slice(0, 2) || "?").toUpperCase();
}

function snapshotAgeNote(fetchedAt: string): string | null {
  const fetched = Date.parse(fetchedAt);
  if (!Number.isFinite(fetched)) return null;
  const gap = Date.now() - fetched;
  if (gap <= STALE_AFTER_MS) return null;
  const days = Math.floor(gap / DAY_MS);
  return `Snapshot is ${days} ${days === 1 ? "day" : "days"} old`;
}

function SnapshotAge({ fetchedAt }: { fetchedAt: string }) {
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setNote(snapshotAgeNote(fetchedAt));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchedAt]);
  if (!note) return null;
  return <p className="mt-2 text-sm text-zinc-400">{note}</p>;
}

function formatNumber(value: number): string {
  return NUMBER_FORMAT.format(value);
}

function partialDaySentence(partialDays: XPulseView["dailyVolume"]): string {
  if (partialDays.length === 0) return "";
  const labels = partialDays.map((row) => formatChartDay(row.date)).join(", ");
  const verb = partialDays.length === 1 ? "is a partial day" : "are partial days";
  return `${labels} ${verb} because the window ends before midnight UTC.`;
}

function formatVolumeDay(day: string, rows: XPulseView["dailyVolume"]): string {
  const label = formatChartDay(day);
  const partial = rows.some((row) => row.date === day && row.partial);
  return partial ? `${label} (partial)` : label;
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
  if (Number.isNaN(date.getTime())) {
    const day = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
    if (Number.isNaN(day.getTime())) return iso;
    return formatChartDay(iso.slice(0, 10));
  }
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatChartDay(day: string): string {
  const date = new Date(`${day.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return day;
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  }).format(date);
}
