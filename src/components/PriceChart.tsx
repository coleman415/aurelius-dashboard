"use client";

import { Card, Stat } from "./Card";
import type { PriceData } from "@/lib/types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";

interface Props {
  data: PriceData;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCompact(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function PriceChart({ data }: Props) {
  // Safely handle potentially undefined data
  const current = data?.current ?? 0;
  const change24h = data?.change24h ?? 0;
  const change7d = data?.change7d ?? 0;
  const volume24h = data?.volume24h ?? 0;
  const marketCap = data?.marketCap ?? 0;
  const history = data?.history ?? [];

  const chartData = history.map((point) => ({
    date: point.timestamp,
    price: point.price,
  }));

  return (
    <Card title="SN37 Token Price">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Stat
          label="Current Price"
          value={current > 0 ? formatCurrency(current) : "--"}
          change={change24h}
        />
        <Stat
          label="24h Volume"
          value={volume24h > 0 ? formatCompact(volume24h) : "--"}
        />
        <Stat
          label="Market Cap"
          value={marketCap > 0 ? formatCompact(marketCap) : "--"}
        />
        <Stat
          label="7d Change"
          value={current > 0 ? `${change7d >= 0 ? "+" : ""}${change7d.toFixed(2)}%` : "--"}
        />
      </div>

      {chartData.length > 0 ? (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis
                dataKey="date"
                tickFormatter={(value) => format(new Date(value), "MMM d")}
                stroke="#71717a"
                fontSize={12}
              />
              <YAxis
                domain={["auto", "auto"]}
                tickFormatter={(value) => `$${value}`}
                stroke="#71717a"
                fontSize={12}
                width={60}
              />
              <Tooltip
                formatter={(value) => [formatCurrency(Number(value) || 0), "Price"]}
                labelFormatter={(label) => format(new Date(label as number), "MMM d, yyyy")}
                contentStyle={{
                  backgroundColor: "#18181b",
                  border: "1px solid #3f3f46",
                  borderRadius: "8px",
                }}
              />
              <Line
                type="monotone"
                dataKey="price"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-64 flex items-center justify-center text-zinc-500 dark:text-zinc-400">
          Price chart data not available
        </div>
      )}
    </Card>
  );
}
