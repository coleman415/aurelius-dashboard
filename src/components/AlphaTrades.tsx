"use client";

import { Card } from "./Card";
import type { AlphaTrade } from "@/lib/types";
import { format } from "date-fns";
import { LARGE_TX_THRESHOLD, SUBNET_NAME } from "@/lib/config";

interface Props {
  data: AlphaTrade[];
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

function shortenAddress(address: string): string {
  if (!address || address.length <= 12) return address || "Unknown";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function AlphaTrades({ data }: Props) {
  const trades = data ?? [];

  // Calculate totals
  const totalStaked = trades
    .filter((t) => t.type === "stake")
    .reduce((sum, t) => sum + t.taoAmount, 0);
  const totalUnstaked = trades
    .filter((t) => t.type === "unstake")
    .reduce((sum, t) => sum + t.taoAmount, 0);

  return (
    <Card
      title={`${SUBNET_NAME} Alpha Trades (${LARGE_TX_THRESHOLD}+ TAO)`}
      className="col-span-full"
    >
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Total Trades
          </p>
          <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            {trades.length}
          </p>
        </div>
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Total Staked
          </p>
          <p className="text-xl font-semibold text-green-600 dark:text-green-400">
            +{formatNumber(totalStaked)} TAO
          </p>
        </div>
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Total Unstaked
          </p>
          <p className="text-xl font-semibold text-red-600 dark:text-red-400">
            -{formatNumber(totalUnstaked)} TAO
          </p>
        </div>
      </div>

      {/* Trades Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th className="text-left py-2 text-zinc-500 dark:text-zinc-400 font-medium">
                Date
              </th>
              <th className="text-left py-2 text-zinc-500 dark:text-zinc-400 font-medium">
                Type
              </th>
              <th className="text-left py-2 text-zinc-500 dark:text-zinc-400 font-medium">
                Coldkey
              </th>
              <th className="text-right py-2 text-zinc-500 dark:text-zinc-400 font-medium">
                Alpha
              </th>
              <th className="text-right py-2 text-zinc-500 dark:text-zinc-400 font-medium">
                TAO
              </th>
              <th className="text-right py-2 text-zinc-500 dark:text-zinc-400 font-medium">
                USD Value
              </th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade, index) => (
              <tr
                key={trade.extrinsicId || index}
                className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              >
                <td className="py-3 text-zinc-600 dark:text-zinc-400">
                  {format(new Date(trade.timestamp), "MMM d, yyyy HH:mm")}
                </td>
                <td className="py-3">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      trade.type === "stake"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    }`}
                  >
                    {trade.type === "stake" ? "STAKE" : "UNSTAKE"}
                  </span>
                </td>
                <td className="py-3 font-mono text-zinc-600 dark:text-zinc-400 text-xs">
                  {shortenAddress(trade.coldkey)}
                </td>
                <td className="py-3 text-right text-zinc-600 dark:text-zinc-400">
                  {formatNumber(trade.alphaAmount)}
                </td>
                <td className="py-3 text-right font-semibold">
                  <span
                    className={
                      trade.type === "stake"
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }
                  >
                    {trade.type === "stake" ? "+" : "-"}
                    {formatNumber(trade.taoAmount)} TAO
                  </span>
                </td>
                <td className="py-3 text-right text-zinc-500 dark:text-zinc-400">
                  {formatCurrency(trade.usdValue)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {trades.length === 0 && (
        <p className="text-center text-zinc-500 dark:text-zinc-400 py-8">
          No large trades found ({LARGE_TX_THRESHOLD}+ TAO)
        </p>
      )}
    </Card>
  );
}
