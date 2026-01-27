import { NextResponse } from "next/server";
import { getTaoPrice, getWalletBalances, getStakingData, getTransactions } from "@/lib/taostats";
import { getEthWalletBalances } from "@/lib/etherscan";
import { getExpenses } from "@/lib/sheets";
import type { DashboardData, TreasuryOverview } from "@/lib/types";

export const revalidate = 300; // Revalidate every 5 minutes to reduce API calls

export async function GET() {
  try {
    // Fetch data SEQUENTIALLY to avoid rate limits
    // Price is fetched first and cached for other functions
    const price = await getTaoPrice();
    const taoWallets = await getWalletBalances();
    const ethWallets = await getEthWalletBalances();
    const staking = await getStakingData();
    const expenses = await getExpenses();
    const transactions = await getTransactions();

    // Combine wallet balances
    const allWallets = [...taoWallets, ...ethWallets];

    // Calculate treasury totals
    const totalTAO = taoWallets.reduce((sum, w) => sum + w.balance, 0);
    const totalETH = ethWallets.reduce((sum, w) => sum + w.balance, 0);
    const totalUSD = allWallets.reduce((sum, w) => sum + w.balanceUSD, 0);

    const treasury: TreasuryOverview = {
      totalTAO,
      totalETH,
      totalUSD,
      change24h: price.change24h,
      change7d: price.change7d,
      change30d: 0, // Would need more historical data
      wallets: allWallets,
    };

    // Calculate runway based on treasury USD and monthly burn
    const burnRate = {
      ...expenses,
      runwayMonths: expenses.monthlyBurnUSD > 0 ? totalUSD / expenses.monthlyBurnUSD : Infinity,
    };

    const dashboardData: DashboardData = {
      treasury,
      price,
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
