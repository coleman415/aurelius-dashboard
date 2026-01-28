import { WALLETS, LARGE_TX_THRESHOLD, SUBNET_ID } from "./config";
import type { PriceData, PricePoint, StakingData, StakePoint, Transaction, WalletBalance, AlphaTrade } from "./types";

const API_BASE = "https://api.taostats.io/api";

// Simple in-memory cache to reduce API calls
const cache: Map<string, { data: unknown; timestamp: number }> = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

// Rate limiting: track last request time
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second between requests

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchTaostats(endpoint: string) {
  const apiKey = process.env.TAOSTATS_API_KEY;
  if (!apiKey) {
    throw new Error("TAOSTATS_API_KEY environment variable is not set");
  }

  // Check cache first
  const cacheKey = endpoint;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // Rate limiting: wait if needed
  const timeSinceLastRequest = Date.now() - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await delay(MIN_REQUEST_INTERVAL - timeSinceLastRequest);
  }
  lastRequestTime = Date.now();

  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      "accept": "application/json",
      "Authorization": apiKey,
    },
    next: { revalidate: 300 }, // Cache for 5 minutes
  });

  if (!response.ok) {
    // If rate limited, return cached data if available (even if stale)
    if (response.status === 429 && cached) {
      console.warn(`Rate limited on ${endpoint}, using stale cache`);
      return cached.data;
    }
    throw new Error(`Taostats API error: ${response.status}`);
  }

  const data = await response.json();

  // Store in cache
  cache.set(cacheKey, { data, timestamp: Date.now() });

  return data;
}

// Cached price data to avoid redundant calls
let cachedPriceData: PriceData | null = null;
let priceDataTimestamp = 0;
const PRICE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getTaoPrice(): Promise<PriceData> {
  // Return cached price if still valid
  if (cachedPriceData && Date.now() - priceDataTimestamp < PRICE_CACHE_TTL) {
    return cachedPriceData;
  }

  try {
    // Fetch sequentially instead of parallel to reduce rate limit pressure
    const priceData = await fetchTaostats("/price/latest/v1");
    // Skip history to reduce API calls - use just current price
    const current = priceData?.data?.[0]?.price ?? 0;

    cachedPriceData = {
      current,
      change24h: priceData?.data?.[0]?.percent_change_24h ?? 0,
      change7d: priceData?.data?.[0]?.percent_change_7d ?? 0,
      volume24h: priceData?.data?.[0]?.volume_24h ?? 0,
      marketCap: priceData?.data?.[0]?.market_cap ?? 0,
      history: [], // Skip history for now to reduce API calls
    };
    priceDataTimestamp = Date.now();

    return cachedPriceData;
  } catch (error) {
    console.error("Error fetching TAO price:", error);
    // Return cached data if available, even if stale
    if (cachedPriceData) {
      return cachedPriceData;
    }
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

  // Fetch wallet balances sequentially to avoid rate limits
  for (const wallet of WALLETS.bittensor) {
    try {
      const data = await fetchTaostats(`/account/latest/v1?address=${wallet.address}`);
      // API returns balance_total as a string in rao (1e9 rao = 1 TAO)
      const balanceRaw = data?.data?.[0]?.balance_total ?? data?.data?.[0]?.balance_free ?? "0";
      const balanceTao = Number(balanceRaw) / 1e9; // Convert from rao to TAO

      balances.push({
        name: wallet.name,
        address: wallet.address,
        network: "bittensor",
        balance: balanceTao,
        balanceUSD: balanceTao * taoPrice,
        token: "TAO",
      });
    } catch (error) {
      console.error(`Error fetching balance for ${wallet.name}:`, error);
      balances.push({
        name: wallet.name,
        address: wallet.address,
        network: "bittensor",
        balance: 0,
        balanceUSD: 0,
        token: "TAO",
      });
    }
  }

  return balances;
}

export async function getStakingData(): Promise<StakingData> {
  try {
    // Get staking data for the validator on SN37
    const validatorAddress = WALLETS.bittensor.find(w => w.name.includes("Validator"))?.address;
    if (!validatorAddress) {
      throw new Error("Validator address not found");
    }

    // Fetch validator data from dtao endpoint (includes emissions data for APY)
    const [validatorData, validatorHistory] = await Promise.all([
      fetchTaostats(`/dtao/validator/latest/v1?hotkey=${validatorAddress}&netuid=37`),
      fetchTaostats(`/dtao/validator/history/v1?hotkey=${validatorAddress}&netuid=37`),
    ]);

    const validator = validatorData?.data?.[0];

    // global_weighted_stake is in rao
    const totalStakedRaw = Number(validator?.global_weighted_stake ?? 0);
    const totalStaked = totalStakedRaw / 1e9; // Convert to TAO

    const stakerCount = Number(validator?.global_nominators ?? 0);
    const validatorRank = Number(validator?.rank ?? 0);

    // Calculate APY from nominator_return_per_day
    // APY = (daily_return / total_stake) * 365 * 100
    const dailyReturnRao = Number(validator?.nominator_return_per_day ?? 0);
    const dailyReturn = dailyReturnRao / 1e9; // Convert to TAO
    let apy = 0;
    if (totalStaked > 0 && dailyReturn > 0) {
      apy = (dailyReturn / totalStaked) * 365 * 100;
    }

    // Build stake history from validator history (daily snapshots)
    const stakeHistory: StakePoint[] = (validatorHistory?.data ?? [])
      .map((h: { timestamp: string; global_weighted_stake: string | number }) => ({
        timestamp: new Date(h.timestamp).getTime(),
        amount: Number(h.global_weighted_stake) / 1e9, // Convert to TAO
      }))
      .sort((a: StakePoint, b: StakePoint) => a.timestamp - b.timestamp); // Oldest first for chart

    const taoPrice = (await getTaoPrice()).current; // Uses cached price

    return {
      totalDelegated: totalStaked,
      totalDelegatedUSD: totalStaked * taoPrice,
      stakerCount,
      validatorRank,
      apy,
      stakeHistory,
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

export async function getTransactions(taoPrice: number = 0): Promise<Transaction[]> {
  const transactions: Transaction[] = [];

  // Fetch transactions from all TAO wallets
  for (const wallet of WALLETS.bittensor) {
    try {
      const data = await fetchTaostats(
        `/transfer/v1?address=${wallet.address}&limit=20`
      );

      for (const tx of data?.data ?? []) {
        const amount = Number(tx.amount ?? 0) / 1e9; // Convert from rao to TAO
        // Handle from/to as either string or object with ss58 property
        const fromAddr = typeof tx.from === 'string' ? tx.from : (tx.from?.ss58 ?? '');
        const toAddr = typeof tx.to === 'string' ? tx.to : (tx.to?.ss58 ?? '');
        const isSender = fromAddr === wallet.address;

        transactions.push({
          hash: tx.transaction_hash ?? tx.extrinsic_id ?? "",
          timestamp: new Date(tx.timestamp).getTime(),
          from: fromAddr,
          to: toAddr,
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

  // Sort by timestamp descending and remove duplicates (same hash)
  const seen = new Set<string>();
  return transactions
    .sort((a, b) => b.timestamp - a.timestamp)
    .filter(tx => {
      if (!tx.hash || seen.has(tx.hash)) return false;
      seen.add(tx.hash);
      return true;
    });
}

// Fetch alpha token trades for SN37 (stake/unstake transactions)
export async function getAlphaTrades(): Promise<AlphaTrade[]> {
  const trades: AlphaTrade[] = [];
  const subnetName = `SN${SUBNET_ID}`;
  const minTaoAmount = LARGE_TX_THRESHOLD * 1e9; // Filter for large trades

  try {
    // Fetch trades FROM SN37 (unstaking - selling alpha for TAO)
    const unstakeData = await fetchTaostats(
      `/dtao/trade/v1?from_name=${subnetName}&limit=100`
    );

    for (const trade of unstakeData?.data ?? []) {
      const taoAmount = Number(trade.tao_value ?? 0) / 1e9;
      if (taoAmount * 1e9 < minTaoAmount) continue; // Skip small trades

      trades.push({
        extrinsicId: trade.extrinsic_id ?? "",
        timestamp: new Date(trade.timestamp).getTime(),
        coldkey: trade.coldkey?.ss58 ?? "",
        type: "unstake",
        alphaAmount: Number(trade.from_amount ?? 0) / 1e9,
        taoAmount,
        usdValue: Number(trade.usd_value ?? 0),
      });
    }

    // Fetch trades TO SN37 (staking - buying alpha with TAO)
    const stakeData = await fetchTaostats(
      `/dtao/trade/v1?to_name=${subnetName}&limit=100`
    );

    for (const trade of stakeData?.data ?? []) {
      const taoAmount = Number(trade.tao_value ?? 0) / 1e9;
      if (taoAmount * 1e9 < minTaoAmount) continue; // Skip small trades

      trades.push({
        extrinsicId: trade.extrinsic_id ?? "",
        timestamp: new Date(trade.timestamp).getTime(),
        coldkey: trade.coldkey?.ss58 ?? "",
        type: "stake",
        alphaAmount: Number(trade.to_amount ?? 0) / 1e9,
        taoAmount,
        usdValue: Number(trade.usd_value ?? 0),
      });
    }
  } catch (error) {
    console.error("Error fetching alpha trades:", error);
  }

  // Sort by timestamp descending and remove duplicates
  const seen = new Set<string>();
  return trades
    .sort((a, b) => b.timestamp - a.timestamp)
    .filter(trade => {
      if (!trade.extrinsicId || seen.has(trade.extrinsicId)) return false;
      seen.add(trade.extrinsicId);
      return true;
    });
}
