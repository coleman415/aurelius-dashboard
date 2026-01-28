import { NextResponse } from "next/server";
import { getWalletBalances, getStakingData, getTransactions, getLargeTransactions } from "@/lib/taostats";
import { getEthWalletBalances } from "@/lib/etherscan";
import { getExpenses } from "@/lib/sheets";
import { getSN37Price, getTaoPriceTicker } from "@/lib/coingecko";
import type { DashboardData, TreasuryOverview } from "@/lib/types";

export const revalidate = 300; // Revalidate every 5 minutes to reduce API calls

export async function GET() {
  try {
    // Fetch prices first (needed for expense calculation)
    const [sn37Price, taoPriceTicker] = await Promise.all([
      getSN37Price(),
      getTaoPriceTicker(),
    ]);

    // Fetch remaining data - pass prices for conversions
    const taoPrice = taoPriceTicker.price;
    const [taoWallets, ethWallets, staking, expenses, transactions, largeTransactions] = await Promise.all([
      getWalletBalances(),
      getEthWalletBalances(),
      getStakingData(),
      getExpenses(sn37Price.current),
      getTransactions(taoPrice),
      getLargeTransactions(taoPrice),
    ]);

    // Combine wallet balances - recalculate USD using CoinGecko TAO price
    const sanitizeTaoWallet = (w: typeof taoWallets[0]) => ({
      ...w,
      balance: Number(w.balance) || 0,
      balanceUSD: (Number(w.balance) || 0) * taoPrice, // Use CoinGecko price
    });
    const sanitizeEthWallet = (w: typeof ethWallets[0]) => ({
      ...w,
      balance: Number(w.balance) || 0,
      balanceUSD: Number(w.balanceUSD) || 0, // Keep ETH/USDC USD as-is
    });
    const allWallets = [...taoWallets.map(sanitizeTaoWallet), ...ethWallets.map(sanitizeEthWallet)];

    // Calculate treasury totals (all in USD)
    const totalTAO = taoWallets.reduce((sum, w) => sum + (Number(w.balance) || 0), 0);
    const totalETH = ethWallets.filter(w => w.token === "ETH").reduce((sum, w) => sum + (Number(w.balance) || 0), 0);
    const totalUSD = allWallets.reduce((sum, w) => sum + (Number(w.balanceUSD) || 0), 0);

    const treasury: TreasuryOverview = {
      totalTAO,
      totalETH,
      totalUSD,
      // Only show price change if we have actual balance data
      change24h: totalUSD > 0 ? sn37Price.change24h : 0,
      change7d: totalUSD > 0 ? sn37Price.change7d : 0,
      change30d: 0, // Would need more historical data
      wallets: allWallets,
    };

    // Calculate runway based on treasury USD and monthly burn
    // Also add projected runway to burn history
    const rawRunway = expenses.monthlyBurnUSD > 0 ? totalUSD / expenses.monthlyBurnUSD : Infinity;
    const currentRunway = Number.isFinite(rawRunway) ? rawRunway : 999; // Cap at 999 months if infinite

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

    // Recalculate staking USD with CoinGecko price
    const stakingWithUSD = {
      ...staking,
      totalDelegatedUSD: (staking.totalDelegated || 0) * taoPrice,
    };

    const dashboardData: DashboardData = {
      treasury,
      price: sn37Price, // Now SN37 token price
      taoPriceTicker, // TAO price for header ticker
      staking: stakingWithUSD,
      burnRate,
      transactions: transactions.slice(0, 50), // Limit to 50 most recent
      largeTransactions, // All large transactions (100+ TAO)
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
