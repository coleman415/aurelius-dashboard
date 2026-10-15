"use client";

interface CardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  headingLevel?: 2 | 3;
}

export function Card({
  title,
  children,
  className = "",
  headingLevel = 2,
}: CardProps) {
  const Heading = headingLevel === 3 ? "h3" : "h2";
  return (
    <div className={`bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 ${className}`}>
      <Heading className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-4">
        {title}
      </Heading>
      {children}
    </div>
  );
}

interface StatProps {
  label: string;
  value: string | number;
  change?: number;
  subtext?: string;
}

export function Stat({ label, value, change, subtext }: StatProps) {
  return (
    <div>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{value}</p>
      {change !== undefined && (
        <p className={`text-sm ${change >= 0 ? "text-green-600" : "text-red-600"}`}>
          {change >= 0 ? "+" : ""}{change.toFixed(2)}%
        </p>
      )}
      {subtext && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{subtext}</p>
      )}
    </div>
  );
}
