import { WALLETS, LARGE_TX_THRESHOLD } from "./config";
import type { PriceData, PricePoint, StakingData, StakePoint, Transaction, WalletBalance } from "./types";

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
    // Get staking data for the validator
    const validatorAddress = WALLETS.bittensor.find(w => w.name.includes("Validator"))?.address;
    if (!validatorAddress) {
      throw new Error("Validator address not found");
    }

    // Only fetch current stake data, skip history to reduce API calls
    const stakeData = await fetchTaostats(`/dtao/stake_balance/latest/v1?hotkey=${validatorAddress}`);

    // Sum up stake balances - balance_as_tao appears to be in rao (1e9 rao = 1 TAO)
    const totalStakedRaw = (stakeData?.data ?? []).reduce(
      (sum: number, d: { balance_as_tao?: number; balance?: number }) => {
        // Try balance_as_tao first, then balance
        const val = Number(d.balance_as_tao ?? d.balance) || 0;
        return sum + val;
      },
      0
    );
    // The API field is named balance_as_tao but might be in rao - if > 1 billion, divide by 1e9
    const totalStaked = totalStakedRaw > 1_000_000_000 ? totalStakedRaw / 1e9 : totalStakedRaw;

    const stakerCount = Number(stakeData?.pagination?.total_items) || 0;
    const taoPrice = (await getTaoPrice()).current; // Uses cached price

    return {
      totalDelegated: Number(totalStaked) || 0,
      totalDelegatedUSD: (Number(totalStaked) || 0) * taoPrice,
      stakerCount,
      validatorRank: 0,
      apy: 0,
      stakeHistory: [], // Skip history to reduce API calls
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

// Fetch large transactions (100+ TAO) with full history
export async function getLargeTransactions(taoPrice: number = 0): Promise<Transaction[]> {
  const transactions: Transaction[] = [];
  const minAmount = LARGE_TX_THRESHOLD * 1e9; // Convert to rao

  // Fetch large transactions from all TAO wallets with higher limit
  for (const wallet of WALLETS.bittensor) {
    try {
      const data = await fetchTaostats(
        `/transfer/v1?address=${wallet.address}&amount_min=${minAmount}&limit=100`
      );

      for (const tx of data?.data ?? []) {
        const amount = Number(tx.amount ?? 0) / 1e9; // Convert from rao to TAO
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
          isLarge: true,
          wallet: wallet.name,
        });
      }
    } catch (error) {
      console.error(`Error fetching large transactions for ${wallet.name}:`, error);
    }
  }

  // Sort by timestamp descending and remove duplicates
  const seen = new Set<string>();
  return transactions
    .sort((a, b) => b.timestamp - a.timestamp)
    .filter(tx => {
      if (!tx.hash || seen.has(tx.hash)) return false;
      seen.add(tx.hash);
      return true;
    });
}
