import { NextResponse } from "next/server";
import { getWalletBalances, getStakingData, getTransactions } from "@/lib/taostats";
import { getEthWalletBalances } from "@/lib/etherscan";
import { getExpenses } from "@/lib/sheets";
import { getSN37Price, getTaoPriceTicker } from "@/lib/coingecko";
import type { DashboardData, TreasuryOverview } from "@/lib/types";

export const revalidate = 300; // Revalidate every 5 minutes to reduce API calls

export async function GET() {
  try {
    // Fetch data - SN37 price from CoinGecko, TAO ticker for header
    const [sn37Price, taoPriceTicker, taoWallets, ethWallets, staking, expenses, transactions] = await Promise.all([
      getSN37Price(),
      getTaoPriceTicker(),
      getWalletBalances(),
      getEthWalletBalances(),
      getStakingData(),
      getExpenses(),
      getTransactions(),
    ]);

    // Combine wallet balances
    const allWallets = [...taoWallets, ...ethWallets];

    // Calculate treasury totals (all in USD)
    const totalTAO = taoWallets.reduce((sum, w) => sum + w.balance, 0);
    const totalETH = ethWallets.filter(w => w.token === "ETH").reduce((sum, w) => sum + w.balance, 0);
    const totalUSD = allWallets.reduce((sum, w) => sum + w.balanceUSD, 0);

    const treasury: TreasuryOverview = {
      totalTAO,
      totalETH,
      totalUSD,
      change24h: sn37Price.change24h, // Use SN37 price change
      change7d: sn37Price.change7d,
      change30d: 0, // Would need more historical data
      wallets: allWallets,
    };

    // Calculate runway based on treasury USD and monthly burn
    // Also add projected runway to burn history
    const currentRunway = expenses.monthlyBurnUSD > 0 ? totalUSD / expenses.monthlyBurnUSD : Infinity;

    // Add current runway to burn history for projection
    const burnHistoryWithRunway = expenses.burnHistory.map((point, index, arr) => {
      // For the most recent month, calculate runway
      if (index === arr.length - 1) {
        return { ...point, runway: currentRunway };
      }
      return point;
    });

    const burnRate = {
      ...expenses,
      burnHistory: burnHistoryWithRunway,
      runwayMonths: currentRunway,
    };

    const dashboardData: DashboardData = {
      treasury,
      price: sn37Price, // Now SN37 token price
      taoPriceTicker, // TAO price for header ticker
      staking,
      burnRate,
      transactions: transactions.slice(0, 50), // Limit to 50 most recent
      lastUpdated: Date.now(),
    };

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
