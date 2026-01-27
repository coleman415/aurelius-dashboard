"use client";

import { Card, Stat } from "./Card";
import type { TreasuryOverview as TreasuryData } from "@/lib/types";

interface Props {
  data: TreasuryData;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function shortenAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function TreasuryOverview({ data }: Props) {
  // Safely handle potentially undefined data
  const totalUSD = data?.totalUSD ?? 0;
  const totalTAO = data?.totalTAO ?? 0;
  const totalETH = data?.totalETH ?? 0;
  const change24h = data?.change24h ?? 0;
  const change7d = data?.change7d ?? 0;
  const wallets = data?.wallets ?? [];

  return (
    <Card title="Treasury Overview" className="col-span-full">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
        <Stat
          label="Total Value (USD)"
          value={formatCurrency(totalUSD)}
          change={change24h}
        />
        <Stat
          label="Total TAO"
          value={formatNumber(totalTAO)}
        />
        <Stat
          label="Total ETH"
          value={formatNumber(totalETH, 4)}
        />
        <Stat
          label="7d Change"
          value={`${change7d >= 0 ? "+" : ""}${change7d.toFixed(2)}%`}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th className="text-left py-2 text-zinc-500 dark:text-zinc-400 font-medium">Wallet</th>
              <th className="text-left py-2 text-zinc-500 dark:text-zinc-400 font-medium">Address</th>
              <th className="text-right py-2 text-zinc-500 dark:text-zinc-400 font-medium">Balance</th>
              <th className="text-right py-2 text-zinc-500 dark:text-zinc-400 font-medium">USD Value</th>
            </tr>
          </thead>
          <tbody>
            {wallets.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-4 text-center text-zinc-500 dark:text-zinc-400">
                  No wallet data available
                </td>
              </tr>
            ) : (
              wallets.map((wallet) => (
                <tr key={wallet.address} className="border-b border-zinc-100 dark:border-zinc-800">
                  <td className="py-3 text-zinc-900 dark:text-zinc-100">{wallet.name}</td>
                  <td className="py-3 font-mono text-zinc-600 dark:text-zinc-400">
                    {shortenAddress(wallet.address)}
                  </td>
                  <td className="py-3 text-right text-zinc-900 dark:text-zinc-100">
                    {formatNumber(wallet.balance)} {wallet.network === "bittensor" ? "TAO" : "ETH"}
                  </td>
                  <td className="py-3 text-right text-zinc-900 dark:text-zinc-100">
                    {formatCurrency(wallet.balanceUSD)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
