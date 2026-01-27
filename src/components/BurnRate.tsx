"use client";

import { Card, Stat } from "./Card";
import type { BurnRateData } from "@/lib/types";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
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

export function BurnRate({ data }: Props) {
  // Safely handle potentially undefined data
  const monthlyBurnUSD = data?.monthlyBurnUSD ?? 0;
  const runwayMonths = data?.runwayMonths ?? 0;
  const expensesByCategory = data?.expensesByCategory ?? [];
  const recentExpenses = data?.recentExpenses ?? [];

  const chartData = expensesByCategory.map((cat) => ({
    name: cat.category,
    value: cat.amount,
  }));

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
          label="Categories"
          value={expensesByCategory.length > 0 ? expensesByCategory.length.toString() : "--"}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {chartData.length > 0 ? (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((_, index) => (
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
