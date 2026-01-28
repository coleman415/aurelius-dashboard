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

function shortenAddress(address: string | { ss58?: string } | undefined): string {
  const addr = typeof address === 'string' ? address : (address?.ss58 ?? '');
  if (!addr || addr.length <= 12) return addr || 'Unknown';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function LargeTransactions({ data }: Props) {
  const transactions = data ?? [];

  // Calculate totals
  const totalIn = transactions
    .filter(tx => tx.type === "receive")
    .reduce((sum, tx) => sum + tx.amount, 0);
  const totalOut = transactions
    .filter(tx => tx.type === "send")
    .reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <Card title={`Large Transactions (${LARGE_TX_THRESHOLD}+ TAO)`} className="col-span-full">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Total Transactions</p>
          <p className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            {transactions.length}
          </p>
        </div>
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Total Received</p>
          <p className="text-xl font-semibold text-green-600 dark:text-green-400">
            +{formatNumber(totalIn)} TAO
          </p>
        </div>
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Total Sent</p>
          <p className="text-xl font-semibold text-red-600 dark:text-red-400">
            -{formatNumber(totalOut)} TAO
          </p>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th className="text-left py-2 text-zinc-500 dark:text-zinc-400 font-medium">Date</th>
              <th className="text-left py-2 text-zinc-500 dark:text-zinc-400 font-medium">Type</th>
              <th className="text-left py-2 text-zinc-500 dark:text-zinc-400 font-medium">Wallet</th>
              <th className="text-left py-2 text-zinc-500 dark:text-zinc-400 font-medium">From/To</th>
              <th className="text-right py-2 text-zinc-500 dark:text-zinc-400 font-medium">Amount</th>
              <th className="text-right py-2 text-zinc-500 dark:text-zinc-400 font-medium">USD Value</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx, index) => (
              <tr
                key={tx.hash || index}
                className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              >
                <td className="py-3 text-zinc-600 dark:text-zinc-400">
                  {format(new Date(tx.timestamp), "MMM d, yyyy")}
                </td>
                <td className="py-3">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      tx.type === "receive"
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    }`}
                  >
                    {tx.type === "receive" ? "RECEIVED" : "SENT"}
                  </span>
                </td>
                <td className="py-3 text-zinc-900 dark:text-zinc-100 font-medium">
                  {tx.wallet}
                </td>
                <td className="py-3 font-mono text-zinc-600 dark:text-zinc-400 text-xs">
                  {shortenAddress(tx.type === "receive" ? tx.from : tx.to)}
                </td>
                <td className="py-3 text-right font-semibold">
                  <span className={tx.type === "receive" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}>
                    {tx.type === "receive" ? "+" : "-"}{formatNumber(tx.amount)} TAO
                  </span>
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
          No large transactions found ({LARGE_TX_THRESHOLD}+ TAO)
        </p>
      )}
    </Card>
  );
}
