"use client";

import { Card, Stat } from "./Card";
import type { StakingData } from "@/lib/types";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format } from "date-fns";

interface Props {
  data: StakingData;
}

function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function StakingPerformance({ data }: Props) {
  const chartData = data.stakeHistory.map((point) => ({
    date: point.timestamp,
    amount: point.amount,
  }));

  return (
    <Card title="Staking Performance">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Stat
          label="Total Delegated"
          value={`${formatNumber(data.totalDelegated)} TAO`}
        />
        <Stat
          label="Delegated Value"
          value={formatCurrency(data.totalDelegatedUSD)}
        />
        <Stat
          label="Staker Count"
          value={data.stakerCount.toLocaleString()}
        />
        <Stat
          label="APY"
          value={data.apy > 0 ? `${data.apy.toFixed(1)}%` : "N/A"}
        />
      </div>

      {chartData.length > 0 && (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <XAxis
                dataKey="date"
                tickFormatter={(value) => format(new Date(value), "MMM d")}
                stroke="#71717a"
                fontSize={12}
              />
              <YAxis
                domain={["auto", "auto"]}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                stroke="#71717a"
                fontSize={12}
                width={50}
              />
              <Tooltip
                formatter={(value) => [`${formatNumber(Number(value) || 0)} TAO`, "Delegated"]}
                labelFormatter={(label) => format(new Date(label as number), "MMM d, yyyy")}
                contentStyle={{
                  backgroundColor: "#18181b",
                  border: "1px solid #3f3f46",
                  borderRadius: "8px",
                }}
              />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="#10b981"
                fill="#10b98133"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
