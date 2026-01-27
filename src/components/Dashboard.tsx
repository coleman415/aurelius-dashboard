"use client";

import { useState, useEffect, useCallback } from "react";
import { TreasuryOverview } from "./TreasuryOverview";
import { PriceChart } from "./PriceChart";
import { StakingPerformance } from "./StakingPerformance";
import { BurnRate } from "./BurnRate";
import { Transactions } from "./Transactions";
import { LoadingSkeleton, ErrorMessage } from "./LoadingSkeleton";
import type { DashboardData } from "@/lib/types";
import { REFRESH_INTERVALS } from "@/lib/config";

export function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch("/api/dashboard");
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      const json = await response.json();
      if (json.error) {
        throw new Error(json.error);
      }
      setData(json);
      setError(null);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Auto-refresh every minute
    const interval = setInterval(fetchData, REFRESH_INTERVALS.price);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading && !data) {
    return <LoadingSkeleton />;
  }

  if (error && !data) {
    return <ErrorMessage message={error} />;
  }

  if (!data) {
    return <ErrorMessage message="No data available" />;
  }

  return (
    <div className="space-y-6">
      {/* Last updated indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
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
      <TreasuryOverview data={data.treasury} />

      {/* Price and Staking - Two Columns */}
      <div className="grid md:grid-cols-2 gap-6">
        <PriceChart data={data.price} />
        <StakingPerformance data={data.staking} />
      </div>

      {/* Burn Rate - Full Width */}
      <BurnRate data={data.burnRate} />

      {/* Transactions - Full Width */}
      <Transactions data={data.transactions} />

      {/* Error indicator if there was an error during refresh */}
      {error && data && (
        <div className="fixed bottom-4 right-4 bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-700 rounded-lg px-4 py-2 text-sm text-red-700 dark:text-red-300">
          Refresh failed: {error}
        </div>
      )}
    </div>
  );
}
