"use client";

import { useEffect, useState } from "react";
import {
  BUCKETS,
  GOODFIRE_USERNAME,
  type BucketId,
  type PostView,
  type XPulseView,
} from "@/lib/x-pulse";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "./Card";

const SERIES: { id: BucketId; color: string; dash?: string }[] = [
  { id: "mech_interp", color: "#3b82f6" },
  { id: "sae_transcoders_crosscoders", color: "#8b5cf6", dash: "6 4" },
  { id: "probes_steering", color: "#10b981", dash: "2 2" },
  { id: "alignment_safety", color: "#d97706", dash: "8 3 2 3" },
  { id: "competitor_watch", color: "#e11d48", dash: "1 3" },
  { id: "bittensor_sn37_aurelius", color: "#71717a", dash: "4 2 1 2" },
];

const NUMBER_FORMAT = new Intl.NumberFormat("en-US");
const STALE_AFTER_MS = 36 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export function XPulse({ view }: { view: XPulseView }) {
  return <XPulsePanel view={view} />;
}

function XPulsePanel({ view }: { view: XPulseView }) {
  const chartLabel = view.buckets
    .map((bucket) => `${bucket.label} ${formatNumber(bucket.count)}`)
    .join(", ");
  const partialDays = view.dailyVolume.filter((row) => row.partial);

  return (
    <section
      id="x-pulse"
      aria-labelledby="x-pulse-heading"
      className="space-y-6 pt-4 border-t border-zinc-200 dark:border-zinc-800"
    >
      <div>
        <h2
          id="x-pulse-heading"
          className="text-lg font-semibold text-zinc-900 dark:text-zinc-100"
        >
          X Pulse
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Alignment and mech interp on X
          {" · "}
          Data as of{" "}
          <time dateTime={view.fetchedAt || undefined}>
            {formatUtcTimestamp(view.fetchedAt)}
          </time>
        </p>
        <SnapshotAge fetchedAt={view.fetchedAt} />
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Window{" "}
          <time dateTime={view.windowStart || undefined}>
            {formatUtcDay(view.windowStart)}
          </time>
          {" – "}
          <time dateTime={view.windowEnd || undefined}>
            {formatUtcDay(view.windowEnd)}
          </time>{" "}
          UTC
          {" · "}
          {formatNumber(view.postCount)} posts
          {" · "}
          {formatNumber(view.accountCount)} accounts
        </p>
        {view.scoring && (
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Engagement score: {view.scoring}. Daily counts are this curated
            sample, not all posts on X. A post can sit in more than one topic.
          </p>
        )}
      </div>

      <Card title="Daily volume" headingLevel={3}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
          {view.buckets.map((bucket) => (
            <div key={bucket.id}>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {bucket.label}
              </p>
              <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                {formatNumber(bucket.count)}
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
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
          <div
            className="h-64 min-w-0"
            role="img"
            aria-label={`Daily sample volume by topic. ${chartLabel}.${
              partialDays.length > 0 ? ` ${partialDaySentence(partialDays)}` : ""
            }`}
          >
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <LineChart data={view.dailyVolume} accessibilityLayer={false}>
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) =>
                    formatVolumeDay(String(value), view.dailyVolume)
                  }
                  stroke="#71717a"
                  fontSize={12}
                  minTickGap={24}
                />
                <YAxis
                  allowDecimals={false}
                  stroke="#71717a"
                  fontSize={12}
                  width={32}
                />
                <Tooltip
                  formatter={(value, name) => [
                    Number(value) || 0,
                    String(name),
                  ]}
                  labelFormatter={(label) =>
                    formatVolumeDay(String(label), view.dailyVolume)
                  }
                  contentStyle={{
                    backgroundColor: "#18181b",
                    border: "1px solid #3f3f46",
                    borderRadius: "8px",
                    color: "#f4f4f5",
                  }}
                />
                {SERIES.map((series) => {
                  const bucket = view.buckets.find(
                    (item) => item.id === series.id,
                  );
                  return (
                    <Line
                      key={series.id}
                      type="monotone"
                      dataKey={series.id}
                      name={bucket?.shortLabel ?? series.id}
                      stroke={series.color}
                      strokeDasharray={series.dash}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No dated posts in this sample.
          </p>
        )}

        {partialDays.length > 0 && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-3">
            {partialDaySentence(partialDays)}
          </p>
        )}

        <ul className="flex flex-wrap gap-x-4 gap-y-2 mt-4">
          {SERIES.map((series) => {
            const bucket = view.buckets.find((item) => item.id === series.id);
            if (!bucket) return null;
            return (
              <li
                key={series.id}
                className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400"
              >
                <svg width="40" height="8" aria-hidden="true">
                  <line
                    x1="0"
                    y1="4"
                    x2="40"
                    y2="4"
                    stroke={series.color}
                    strokeWidth="2"
                    strokeDasharray={series.dash}
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
            <summary className="text-sm text-zinc-600 dark:text-zinc-400 cursor-pointer">
              Daily counts by topic
            </summary>
            <div className="overflow-x-auto mt-3">
              <table className="w-full text-sm text-left">
                <caption className="sr-only">
                  Daily sample volume by topic. Zero means no posts that day in
                  this sample. A date marked partial is not a full UTC day.
                </caption>
                <thead>
                  <tr className="text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                    <th scope="col" className="py-2 pr-3 font-medium">
                      Date
                    </th>
                    {view.buckets.map((bucket) => (
                      <th
                        key={bucket.id}
                        scope="col"
                        className="py-2 px-2 font-medium"
                      >
                        {bucket.shortLabel}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {view.dailyVolume.map((row) => (
                    <tr
                      key={row.date}
                      className="border-b border-zinc-100 dark:border-zinc-800"
                    >
                      <th
                        scope="row"
                        className="py-1.5 pr-3 font-normal text-zinc-700 dark:text-zinc-300 whitespace-nowrap"
                      >
                        {formatVolumeDay(row.date, view.dailyVolume)}
                      </th>
                      {BUCKETS.map((bucket) => (
                        <td
                          key={bucket}
                          className="py-1.5 px-2 text-zinc-900 dark:text-zinc-100 tabular-nums"
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
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card title="Competitor watch" headingLevel={3}>
          <CompetitorWatch view={view} />
        </Card>
        <Card title="Key accounts" headingLevel={3}>
          <KeyAccounts view={view} />
        </Card>
      </div>

      <Card title="Top posts" headingLevel={3}>
        <div className="grid md:grid-cols-2 gap-6">
          {view.buckets.map((bucket) => (
            <div key={bucket.id} id={`x-pulse-bucket-${bucket.id}`}>
              <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                {bucket.label}
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 mb-3">
                {formatNumber(bucket.count)} posts in sample
                {bucket.thin ? " · Thin sample" : ""}
                {bucket.count === 0 ? " · No posts in sample" : ""}
              </p>
              {bucket.topPosts.length > 0 ? (
                <ul className="space-y-3">
                  {bucket.topPosts.map((post) => (
                    <li key={post.id}>
                      <PostLink post={post} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  No posts in this sample.
                </p>
              )}
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}

function CompetitorWatch({ view }: { view: XPulseView }) {
  const watch = view.competitorWatch;
  const org = watch.organization;
  const people = watch.affiliatedAccounts.filter(
    (account) => account.username.toLowerCase() !== GOODFIRE_USERNAME,
  );
  const outsideBucket = watch.postCount - watch.goodfireInBucketCount;

  return (
    <div id="x-pulse-competitor">
      <h4 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
        {watch.name} ({watch.product})
      </h4>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
        Posts from Goodfire accounts and posts that mention Goodfire or Silico.
      </p>
      <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-2">
        {formatNumber(watch.goodfireInBucketCount)} of{" "}
        {formatNumber(watch.competitorBucketCount)} competitor posts are
        Goodfire-related.
        {outsideBucket > 0
          ? ` ${formatNumber(outsideBucket)} other Goodfire ${outsideBucket === 1 ? "mention is" : "mentions are"} outside that topic.`
          : ""}
      </p>
      {org ? (
        <p className="text-sm text-zinc-700 dark:text-zinc-300 mt-3">
          <ProfileLink accountUrl={org.url} username={org.username} />
          {org.name ? <span> · {org.name}</span> : null}
          {org.description ? (
            <span className="block text-zinc-500 dark:text-zinc-400 mt-1">
              {org.description}
            </span>
          ) : null}
        </p>
      ) : (
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-3">
          Goodfire&apos;s account was not in this snapshot.
        </p>
      )}
      <dl className="grid grid-cols-3 gap-3 mt-4">
        <div>
          <dt className="text-xs text-zinc-500 dark:text-zinc-400">
            Followers
          </dt>
          <dd className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {org && org.followers !== null
              ? formatNumber(org.followers)
              : "unknown"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500 dark:text-zinc-400">
            @{org?.username ?? "GoodfireAI"} posts
          </dt>
          <dd className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {org ? formatNumber(org.postsInDataset) : "unknown"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-zinc-500 dark:text-zinc-400">
            Related posts
          </dt>
          <dd className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {formatNumber(watch.postCount)}
          </dd>
        </div>
      </dl>

      {people.length > 0 && (
        <div className="mt-4">
          <h5 className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Accounts tied to Goodfire
          </h5>
          <ul className="mt-2 space-y-1">
            {people.map((account) => (
              <li key={account.username} className="text-sm">
                <ProfileLink
                  accountUrl={account.url}
                  username={account.username}
                />
                <span className="text-zinc-500 dark:text-zinc-400">
                  {account.description ? ` — ${account.description}` : ""}
                  {` · ${formatNumber(account.postsInDataset)} posts`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4">
        <h5 className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-2">
          Top Goodfire posts
        </h5>
        {watch.posts.length > 0 ? (
          <ul className="space-y-3">
            {watch.posts.map((post) => (
              <li key={post.id}>
                <PostLink post={post} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No Goodfire posts in this sample.
          </p>
        )}
      </div>

      {watch.otherCompetitors.length > 0 && (
        <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <h5 className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Other competitor accounts
          </h5>
          <ul className="mt-2 space-y-1">
            {watch.otherCompetitors.map((account) => (
              <li key={account.username} className="text-sm">
                <ProfileLink
                  accountUrl={account.url}
                  username={account.username}
                />
                <span className="text-zinc-500 dark:text-zinc-400">
                  {account.name ? ` · ${account.name}` : ""}
                  {` · ${formatNumber(account.postsInDataset)} posts in sample`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function KeyAccounts({ view }: { view: XPulseView }) {
  return (
    <div id="x-pulse-accounts">
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3">
        {formatNumber(view.accountCount)} accounts.
      </p>
      <div
        className="max-h-96 overflow-y-auto pr-1"
        role="region"
        aria-label="Key accounts"
        tabIndex={0}
      >
        {view.keyAccountGroups.length > 0 ? (
          view.keyAccountGroups.map((group) =>
            group.category === "active_author" ? (
              <details key={group.category} className="mb-4">
                <summary className="cursor-pointer">
                  <h4 className="inline text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {group.label} ({formatNumber(group.accounts.length)})
                  </h4>
                </summary>
                <AccountList accounts={group.accounts} />
              </details>
            ) : (
              <div key={group.category} className="mb-4">
                <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {group.label}
                </h4>
                <AccountList accounts={group.accounts} />
              </div>
            ),
          )
        ) : (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No accounts in this snapshot.
          </p>
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
          className="py-2 border-b border-zinc-100 dark:border-zinc-800"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <ProfileLink accountUrl={account.url} username={account.username} />
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {account.followers === null
                ? "Followers unknown"
                : `${formatNumber(account.followers)} followers`}
              {" · "}
              {formatNumber(account.postsInDataset)} posts
            </span>
          </div>
          {(account.name || account.description) && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {account.name}
              {account.name && account.description ? " — " : ""}
              {account.description}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

function PostLink({ post }: { post: PostView }) {
  return (
    <div>
      <a
        href={post.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-zinc-900 dark:text-zinc-100 underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-900 dark:decoration-zinc-600 dark:hover:decoration-zinc-100"
      >
        {post.excerpt}
        <span aria-hidden="true"> ↗</span>
        <span className="sr-only"> (post on X, opens in new tab)</span>
      </a>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
        @{post.username}
        {post.createdAt ? (
          <>
            {" · "}
            <time dateTime={post.createdAt}>{formatUtcDay(post.createdAt)}</time>
          </>
        ) : null}
        {" · "}
        {formatNumber(post.engagementScore)} engagement
      </p>
    </div>
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
      className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline underline-offset-2"
    >
      @{username}
      <span aria-hidden="true"> ↗</span>
      <span className="sr-only"> on X, opens in new tab</span>
    </a>
  );
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
  return (
    <p className="text-sm text-zinc-500 dark:text-zinc-400">{note}</p>
  );
}

function formatNumber(value: number): string {
  return NUMBER_FORMAT.format(value);
}

function partialDaySentence(
  partialDays: XPulseView["dailyVolume"],
): string {
  if (partialDays.length === 0) return "";
  const labels = partialDays.map((row) => formatChartDay(row.date)).join(", ");
  const verb = partialDays.length === 1 ? "is a partial day" : "are partial days";
  return `${labels} ${verb} because the window ends before midnight UTC.`;
}

function formatVolumeDay(
  day: string,
  rows: XPulseView["dailyVolume"],
): string {
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
