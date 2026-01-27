import { WALLETS, LARGE_TX_THRESHOLD } from "./config";
import type { PriceData, PricePoint, StakingData, StakePoint, Transaction, WalletBalance } from "./types";

const API_BASE = "https://api.taostats.io/api";

async function fetchTaostats(endpoint: string) {
  const apiKey = process.env.TAOSTATS_API_KEY;
  if (!apiKey) {
    throw new Error("TAOSTATS_API_KEY environment variable is not set");
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      accept: "application/json",
      authorization: apiKey,
    },
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    throw new Error(`Taostats API error: ${response.status}`);
  }

  return response.json();
}

export async function getTaoPrice(): Promise<PriceData> {
  try {
    const [priceData, historyData] = await Promise.all([
      fetchTaostats("/price/latest/v1"),
      fetchTaostats("/price/history/v1?limit=30"),
    ]);

    const current = priceData?.data?.[0]?.price ?? 0;
    const history: PricePoint[] = (historyData?.data ?? []).map((d: { timestamp: string; price: number }) => ({
      timestamp: new Date(d.timestamp).getTime(),
      price: d.price,
    }));

    // Calculate changes from history
    const now = current;
    const day1 = history.find((_, i) => i === 1)?.price ?? now;
    const day7 = history.find((_, i) => i === 7)?.price ?? now;

    return {
      current,
      change24h: now && day1 ? ((now - day1) / day1) * 100 : 0,
      change7d: now && day7 ? ((now - day7) / day7) * 100 : 0,
      volume24h: priceData?.data?.[0]?.volume_24h ?? 0,
      marketCap: priceData?.data?.[0]?.market_cap ?? 0,
      history: history.reverse(),
    };
  } catch (error) {
    console.error("Error fetching TAO price:", error);
    return {
      current: 0,
      change24h: 0,
      change7d: 0,
      volume24h: 0,
      marketCap: 0,
      history: [],
    };
  }
}

export async function getWalletBalances(): Promise<WalletBalance[]> {
  const balances: WalletBalance[] = [];
  const taoPrice = (await getTaoPrice()).current;

  for (const wallet of WALLETS.bittensor) {
    try {
      const data = await fetchTaostats(`/account/latest/v1?address=${wallet.address}`);
      const balance = data?.data?.[0]?.balance ?? 0;
      const balanceTao = balance / 1e9; // Convert from rao to TAO

      balances.push({
        name: wallet.name,
        address: wallet.address,
        network: "bittensor",
        balance: balanceTao,
        balanceUSD: balanceTao * taoPrice,
      });
    } catch (error) {
      console.error(`Error fetching balance for ${wallet.name}:`, error);
      balances.push({
        name: wallet.name,
        address: wallet.address,
        network: "bittensor",
        balance: 0,
        balanceUSD: 0,
      });
    }
  }

  return balances;
}

export async function getStakingData(): Promise<StakingData> {
  try {
    // Get staking data for the validator
    const validatorAddress = WALLETS.bittensor.find(w => w.name.includes("Validator"))?.address;
    if (!validatorAddress) {
      throw new Error("Validator address not found");
    }

    const [stakeData, historyData] = await Promise.all([
      fetchTaostats(`/dtao/stake_balance/latest/v1?hotkey=${validatorAddress}`),
      fetchTaostats(`/dtao/stake_balance/history/v1?hotkey=${validatorAddress}&limit=30`),
    ]);

    const totalStaked = (stakeData?.data ?? []).reduce(
      (sum: number, d: { balance_as_tao: number }) => sum + (d.balance_as_tao ?? 0),
      0
    );

    const stakerCount = stakeData?.pagination?.total_items ?? 0;
    const taoPrice = (await getTaoPrice()).current;

    const stakeHistory: StakePoint[] = (historyData?.data ?? []).map(
      (d: { timestamp: string; balance_as_tao: number }) => ({
        timestamp: new Date(d.timestamp).getTime(),
        amount: d.balance_as_tao ?? 0,
      })
    );

    return {
      totalDelegated: totalStaked,
      totalDelegatedUSD: totalStaked * taoPrice,
      stakerCount,
      validatorRank: 0, // Would need additional API call
      apy: 0, // Would need calculation based on emissions
      stakeHistory: stakeHistory.reverse(),
    };
  } catch (error) {
    console.error("Error fetching staking data:", error);
    return {
      totalDelegated: 0,
      totalDelegatedUSD: 0,
      stakerCount: 0,
      validatorRank: 0,
      apy: 0,
      stakeHistory: [],
    };
  }
}

export async function getTransactions(): Promise<Transaction[]> {
  const transactions: Transaction[] = [];
  const taoPrice = (await getTaoPrice()).current;

  for (const wallet of WALLETS.bittensor) {
    try {
      const data = await fetchTaostats(
        `/transfer/v1?address=${wallet.address}&limit=50`
      );

      for (const tx of data?.data ?? []) {
        const amount = (tx.amount ?? 0) / 1e9; // Convert from rao to TAO
        const isSender = tx.from === wallet.address;

        transactions.push({
          hash: tx.extrinsic_hash ?? "",
          timestamp: new Date(tx.timestamp).getTime(),
          from: tx.from ?? "",
          to: tx.to ?? "",
          amount,
          amountUSD: amount * taoPrice,
          type: isSender ? "send" : "receive",
          isLarge: amount >= LARGE_TX_THRESHOLD,
          wallet: wallet.name,
        });
      }
    } catch (error) {
      console.error(`Error fetching transactions for ${wallet.name}:`, error);
    }
  }

  // Sort by timestamp descending
  return transactions.sort((a, b) => b.timestamp - a.timestamp);
}
