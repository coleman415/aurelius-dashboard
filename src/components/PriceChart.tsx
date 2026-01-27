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
  const chartData = data.history.map((point) => ({
    date: point.timestamp,
    price: point.price,
  }));

  return (
    <Card title="TAO Price">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Stat
          label="Current Price"
          value={formatCurrency(data.current)}
          change={data.change24h}
        />
        <Stat
          label="24h Volume"
          value={formatCompact(data.volume24h)}
        />
        <Stat
          label="Market Cap"
          value={formatCompact(data.marketCap)}
        />
        <Stat
          label="7d Change"
          value={`${data.change7d >= 0 ? "+" : ""}${data.change7d.toFixed(2)}%`}
        />
      </div>

      {chartData.length > 0 && (
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
      )}
    </Card>
  );
}
