"use client";

import { useState, useEffect, useCallback } from "react";
import { TreasuryOverview } from "./TreasuryOverview";
import { PriceChart } from "./PriceChart";
import { StakingPerformance } from "./StakingPerformance";
import { BurnRate } from "./BurnRate";
import { Transactions } from "./Transactions";
import { LoadingSkeleton } from "./LoadingSkeleton";
import type { DashboardData } from "@/lib/types";
import { REFRESH_INTERVALS } from "@/lib/config";

// Fallback data when API fails - shows placeholder values
const FALLBACK_DATA: DashboardData = {
  treasury: {
    totalTAO: 0,
    totalETH: 0,
    totalUSD: 0,
    change24h: 0,
    change7d: 0,
    change30d: 0,
    wallets: [],
  },
  price: {
    current: 0,
    change24h: 0,
    change7d: 0,
    volume24h: 0,
    marketCap: 0,
    history: [],
  },
  taoPriceTicker: {
    price: 0,
    change24h: 0,
  },
  staking: {
    totalDelegated: 0,
    totalDelegatedUSD: 0,
    stakerCount: 0,
    validatorRank: 0,
    apy: 0,
    stakeHistory: [],
  },
  burnRate: {
    monthlyBurn: 0,
    monthlyBurnUSD: 0,
    runwayMonths: 0,
    expensesByCategory: [],
    expensesByPayor: [],
    recentExpenses: [],
    burnHistory: [],
  },
  transactions: [],
  lastUpdated: Date.now(),
};

export function Dashboard() {
  const [data, setData] = useState<DashboardData>(FALLBACK_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/dashboard");
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      const json = await response.json();
      if (json.error) {
        throw new Error(json.error);
      }
      // Validate that the response has the expected structure
      if (!json.treasury || !json.price || !json.staking || !json.burnRate) {
        throw new Error("Invalid response structure");
      }
      setData(json);
      setError(null);
      setLastRefresh(new Date());
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      setError(errorMsg);
      console.error("Dashboard fetch error:", errorMsg);
      // Keep showing existing data (or fallback) even on error
      // If we have no valid data, ensure we use fallback
      if (!data || !data.treasury) {
        setData(FALLBACK_DATA);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchData, REFRESH_INTERVALS.price);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Ensure we always have valid data structure by merging with fallback
  const safeData: DashboardData = {
    treasury: data?.treasury ?? FALLBACK_DATA.treasury,
    price: data?.price ?? FALLBACK_DATA.price,
    taoPriceTicker: data?.taoPriceTicker ?? FALLBACK_DATA.taoPriceTicker,
    staking: data?.staking ?? FALLBACK_DATA.staking,
    burnRate: data?.burnRate ?? FALLBACK_DATA.burnRate,
    transactions: data?.transactions ?? FALLBACK_DATA.transactions,
    lastUpdated: data?.lastUpdated ?? FALLBACK_DATA.lastUpdated,
  };

  // Always show the dashboard, even with fallback/empty data
  const showingFallback = !data?.treasury || (safeData.treasury.totalTAO === 0 && safeData.treasury.totalETH === 0);

  return (
    <div className="space-y-6">
      {/* Status banner */}
      {(error || showingFallback) && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-yellow-600 dark:text-yellow-400">⚠️</span>
            <span className="text-sm text-yellow-700 dark:text-yellow-300">
              {error ? `Data fetch error: ${error}` : "Loading data..."}
              {showingFallback && " Showing placeholder values."}
            </span>
            <button
              onClick={fetchData}
              disabled={loading}
              className="ml-auto text-sm text-yellow-700 dark:text-yellow-300 underline disabled:opacity-50"
            >
              {loading ? "Retrying..." : "Retry"}
            </button>
          </div>
        </div>
      )}

      {/* Header with TAO ticker and last updated */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-4">
          {/* TAO Price Ticker */}
          {safeData.taoPriceTicker.price > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
              <span className="text-xs text-zinc-500 dark:text-zinc-400">TAO</span>
              <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                ${safeData.taoPriceTicker.price.toFixed(2)}
              </span>
              <span
                className={`text-xs ${
                  safeData.taoPriceTicker.change24h >= 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {safeData.taoPriceTicker.change24h >= 0 ? "+" : ""}
                {safeData.taoPriceTicker.change24h.toFixed(1)}%
              </span>
            </div>
          )}
          {loading && (
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
          )}
          {lastRefresh && (
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      {/* Treasury Overview - Full Width */}
      <TreasuryOverview data={safeData.treasury} />

      {/* Price and Staking - Two Columns */}
      <div className="grid md:grid-cols-2 gap-6">
        <PriceChart data={safeData.price} />
        <StakingPerformance data={safeData.staking} />
      </div>

      {/* Burn Rate - Full Width */}
      <BurnRate data={safeData.burnRate} />

      {/* Transactions - Full Width */}
      <Transactions data={safeData.transactions} />
    </div>
  );
}
