"use client";

import { Card, Stat } from "./Card";
import type { BurnRateData } from "@/lib/types";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Legend,
  ReferenceLine,
} from "recharts";

interface Props {
  data: BurnRateData;
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
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

function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

export function BurnRate({ data }: Props) {
  // Safely handle potentially undefined data
  const monthlyBurnUSD = data?.monthlyBurnUSD ?? 0;
  const runwayMonths = data?.runwayMonths ?? 0;
  const expensesByCategory = data?.expensesByCategory ?? [];
  const recentExpenses = data?.recentExpenses ?? [];
  const burnHistory = data?.burnHistory ?? [];

  const pieChartData = expensesByCategory.map((cat) => ({
    name: cat.category,
    value: cat.amount,
  }));

  // Prepare burn history chart data (last 12 months)
  const burnChartData = burnHistory.slice(-12).map((point) => ({
    month: formatMonth(point.month),
    burn: point.burn,
    cumulative: point.cumulativeBurn,
  }));

  // Calculate projected runway (next 6 months at current burn rate)
  const projectedData = [];
  if (burnHistory.length > 0 && monthlyBurnUSD > 0) {
    const lastMonth = burnHistory[burnHistory.length - 1];
    let cumulative = lastMonth.cumulativeBurn;
    const lastDate = new Date(lastMonth.month + "-01");

    for (let i = 1; i <= 6; i++) {
      const nextDate = new Date(lastDate);
      nextDate.setMonth(nextDate.getMonth() + i);
      cumulative += monthlyBurnUSD;
      projectedData.push({
        month: nextDate.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        projected: monthlyBurnUSD,
        cumulative,
      });
    }
  }

  const runwayText = runwayMonths === Infinity
    ? "Infinite"
    : runwayMonths > 120
    ? "10+ years"
    : runwayMonths > 12
    ? `${(runwayMonths / 12).toFixed(1)} years`
    : runwayMonths > 0
    ? `${runwayMonths.toFixed(1)} months`
    : "--";

  return (
    <Card title="Burn Rate & Runway">
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Stat
          label="Monthly Burn"
          value={monthlyBurnUSD > 0 ? formatCurrency(monthlyBurnUSD) : "--"}
        />
        <Stat
          label="Runway"
          value={runwayText}
        />
        <Stat
          label="Total Spent"
          value={burnHistory.length > 0 ? formatCompact(burnHistory[burnHistory.length - 1]?.cumulativeBurn ?? 0) : "--"}
        />
      </div>

      {/* Burn History Chart */}
      {burnChartData.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3">
            Monthly Burn (Historical & Projected)
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[...burnChartData, ...projectedData]}>
                <XAxis
                  dataKey="month"
                  stroke="#71717a"
                  fontSize={11}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(value) => formatCompact(value)}
                  stroke="#71717a"
                  fontSize={11}
                  width={55}
                />
                <Tooltip
                  formatter={(value, name) => [
                    formatCurrency(Number(value) || 0),
                    name === "burn" ? "Actual" : "Projected",
                  ]}
                  contentStyle={{
                    backgroundColor: "#18181b",
                    border: "1px solid #3f3f46",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Bar dataKey="burn" name="Actual" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="projected" name="Projected" fill="#3b82f680" radius={[4, 4, 0, 0]} />
                {/* Average burn line */}
                {monthlyBurnUSD > 0 && (
                  <ReferenceLine
                    y={monthlyBurnUSD}
                    stroke="#ef4444"
                    strokeDasharray="3 3"
                    label={{
                      value: "Avg",
                      fill: "#ef4444",
                      fontSize: 10,
                      position: "right",
                    }}
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Category Pie Chart */}
        {pieChartData.length > 0 ? (
          <div className="h-48">
            <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
              Expenses by Category
            </h3>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={60}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieChartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value) || 0)}
                  contentStyle={{
                    backgroundColor: "#18181b",
                    border: "1px solid #3f3f46",
                    borderRadius: "8px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center text-zinc-500 dark:text-zinc-400">
            No expense data available
          </div>
        )}

        {/* Category List */}
        <div>
          <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
            By Category
          </h3>
          <div className="space-y-2">
            {expensesByCategory.length > 0 ? (
              expensesByCategory.slice(0, 5).map((cat, index) => (
                <div key={cat.category} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">
                      {cat.category}
                    </span>
                  </div>
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">
                    {formatCurrency(cat.amount)} ({cat.percentage.toFixed(0)}%)
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">No categories available</p>
            )}
          </div>
        </div>
      </div>

      {recentExpenses.length > 0 && (
        <div className="mt-6 pt-6 border-t border-zinc-200 dark:border-zinc-800">
          <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-3">
            Recent Expenses
          </h3>
          <div className="space-y-2">
            {recentExpenses.slice(0, 5).map((expense, index) => (
              <div
                key={`${expense.date}-${index}`}
                className="flex items-center justify-between text-sm"
              >
                <div>
                  <span className="text-zinc-700 dark:text-zinc-300">{expense.item}</span>
                  <span className="text-zinc-400 ml-2">({expense.payor})</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-zinc-500">{expense.date}</span>
                  <span className="text-zinc-900 dark:text-zinc-100 font-medium">
                    {formatCurrency(expense.cost)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
