"use client";

import { Card } from "./Card";
import type { Transaction } from "@/lib/types";
import { format } from "date-fns";
import { LARGE_TX_THRESHOLD } from "@/lib/config";

interface Props {
  data: Transaction[];
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
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function Transactions({ data }: Props) {
  // Safely handle potentially undefined data
  const transactions = data ?? [];
  const largeTransactions = transactions.filter((tx) => tx.isLarge);

  return (
    <Card title="Recent Transactions" className="col-span-full">
      {largeTransactions.length > 0 && (
        <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
          <h3 className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
            Large Transactions ({LARGE_TX_THRESHOLD}+ TAO)
          </h3>
          <div className="space-y-2">
            {largeTransactions.slice(0, 3).map((tx) => (
              <div
                key={tx.hash}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      tx.type === "receive"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    }`}
                  >
                    {tx.type === "receive" ? "IN" : "OUT"}
                  </span>
                  <span className="text-zinc-700 dark:text-zinc-300">{tx.wallet}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {formatNumber(tx.amount)} TAO
                  </span>
                  <span className="text-zinc-500">
                    {format(new Date(tx.timestamp), "MMM d, h:mm a")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th className="text-left py-2 text-zinc-500 dark:text-zinc-400 font-medium">Time</th>
              <th className="text-left py-2 text-zinc-500 dark:text-zinc-400 font-medium">Type</th>
              <th className="text-left py-2 text-zinc-500 dark:text-zinc-400 font-medium">Wallet</th>
              <th className="text-left py-2 text-zinc-500 dark:text-zinc-400 font-medium">From/To</th>
              <th className="text-right py-2 text-zinc-500 dark:text-zinc-400 font-medium">Amount</th>
              <th className="text-right py-2 text-zinc-500 dark:text-zinc-400 font-medium">USD</th>
            </tr>
          </thead>
          <tbody>
            {transactions.slice(0, 20).map((tx) => (
              <tr
                key={tx.hash}
                className={`border-b border-zinc-100 dark:border-zinc-800 ${
                  tx.isLarge ? "bg-amber-50/50 dark:bg-amber-900/10" : ""
                }`}
              >
                <td className="py-3 text-zinc-500 dark:text-zinc-400">
                  {format(new Date(tx.timestamp), "MMM d, h:mm a")}
                </td>
                <td className="py-3">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      tx.type === "receive"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    }`}
                  >
                    {tx.type === "receive" ? "IN" : "OUT"}
                  </span>
                </td>
                <td className="py-3 text-zinc-900 dark:text-zinc-100">{tx.wallet}</td>
                <td className="py-3 font-mono text-zinc-600 dark:text-zinc-400">
                  {shortenAddress(tx.type === "receive" ? tx.from : tx.to)}
                </td>
                <td className="py-3 text-right text-zinc-900 dark:text-zinc-100 font-medium">
                  {formatNumber(tx.amount)} TAO
                </td>
                <td className="py-3 text-right text-zinc-500 dark:text-zinc-400">
                  {formatCurrency(tx.amountUSD)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {transactions.length === 0 && (
        <p className="text-center text-zinc-500 dark:text-zinc-400 py-8">
          No transactions found
        </p>
      )}
    </Card>
  );
}
