import { WALLETS, LARGE_TX_THRESHOLD, SUBNET_ID } from "./config";
import type { PriceData, StakingData, StakePoint, Transaction, WalletBalance, AlphaTrade } from "./types";

const API_BASE = "https://api.taostats.io";

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
    signal: AbortSignal.timeout(15_000),
    next: { revalidate: 300 }, // Cache for 5 minutes
  });

  if (!response.ok) {
    // If rate limited, return cached data if available (even if stale)
    if (response.status === 429 && cached) {
      console.warn(`Rate limited on ${endpoint}, using stale cache`);
      return cached.data;
    }
    throw new Error(`TaoStats ${endpoint.split("?")[0]}: HTTP ${response.status}`);
  }

  const data = await response.json();
  if (!Array.isArray(data.data)) {
    throw new Error(`TaoStats ${endpoint.split("?")[0]}: invalid response rows`);
  }

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
    const priceData = await fetchTaostats("/v1/price?asset=tao");
    // Skip history to reduce API calls - use just current price
    const current = Number(priceData.data[0]?.price);
    if (!Number.isFinite(current) || current <= 0) throw new Error("TaoStats TAO price is missing");

    cachedPriceData = {
      current,
      change24h: Number(priceData.data[0]?.percent_change_24h ?? 0),
      change7d: Number(priceData.data[0]?.percent_change_7d ?? 0),
      volume24h: Number(priceData.data[0]?.volume_24h ?? 0),
      marketCap: Number(priceData.data[0]?.market_cap ?? 0),
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
  const taoPrice = (await getTaoPrice()).current;
  const addresses = WALLETS.bittensor.map(wallet => wallet.address).join(",");
  // The balances endpoint returns one row per requested address and is not paginated.
  const { data } = await fetchTaostats(`/v1/accounts/balances?address=${encodeURIComponent(addresses)}`);
  return WALLETS.bittensor.map(wallet => {
    const account = data.find((row: { address: string }) => row.address === wallet.address);
    const balanceRaw = account?.balance_total;
    if (typeof balanceRaw !== "string" || !/^\d+$/.test(balanceRaw)) {
      throw new Error(`TaoStats balance is missing for ${wallet.name}`);
    }
    const balance = Number(balanceRaw) / 1e9;
    return {
      name: wallet.name, address: wallet.address, network: "bittensor",
      balance, balanceUSD: balance * taoPrice, token: "TAO",
    };
  });
}

export async function getStakingData(): Promise<StakingData> {
  const validatorAddress = WALLETS.bittensor.find(w => w.name.includes("Validator"))?.address;
  if (!validatorAddress) throw new Error("Validator address not found");

  // These are global validator fields. Keep the latest 50 daily points for the chart.
  const hotkey = encodeURIComponent(validatorAddress);
  const validatorData = await fetchTaostats(`/v1/validators?hotkey=${hotkey}&limit=1`);
  const validatorHistory = await fetchTaostats(`/v1/validators/${hotkey}/history?limit=50`);
  const validator = validatorData.data[0];
  if (!validator) throw new Error("TaoStats validator data is missing");

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
}

export async function getTransactions(taoPrice: number = 0): Promise<Transaction[]> {
  const transactions: Transaction[] = [];
  const seen = new Set<string>();

  for (const wallet of WALLETS.bittensor) {
    const address = encodeURIComponent(wallet.address);
    const { data } = await fetchTaostats(`/v1/transfers?address=${address}&limit=20`);
    for (const tx of data) {
      if (seen.has(tx.id)) continue;
      seen.add(tx.id);
      const amount = Number(tx.amount) / 1e9;
      transactions.push({
        hash: tx.transaction_hash,
        timestamp: new Date(tx.timestamp).getTime(),
        from: tx.from,
        to: tx.to,
        amount,
        amountUSD: amount * taoPrice,
        type: tx.from === wallet.address ? "send" : "receive",
        isLarge: amount >= LARGE_TX_THRESHOLD,
        wallet: wallet.name,
      });
    }
  }
  return transactions.sort((a, b) => b.timestamp - a.timestamp);
}

// Fetch alpha token trades for SN37 (stake/unstake transactions)
export async function getAlphaTrades(): Promise<AlphaTrade[]> {
  const trades: AlphaTrade[] = [];
  const subnetName = `SN${SUBNET_ID}`;
  const seen = new Set<string>();

  // Keep up to 100 recent rows for each direction, as before.
  for (const type of ["unstake", "stake"] as const) {
    const outbound = type === "unstake";
    const from = outbound ? subnetName : "TAO";
    const to = outbound ? "TAO" : subnetName;
    const { data } = await fetchTaostats(`/v1/subnets/trades?from_name=${from}&to_name=${to}&limit=100`);
    for (const trade of data) {
      const taoAmount = Number(trade.tao_value) / 1e9;
      if (taoAmount < LARGE_TX_THRESHOLD || seen.has(trade.id)) continue;
      seen.add(trade.id);
      trades.push({
        extrinsicId: trade.extrinsic_id,
        timestamp: new Date(trade.timestamp).getTime(),
        coldkey: trade.coldkey,
        type,
        alphaAmount: Number(outbound ? trade.from_amount : trade.to_amount) / 1e9,
        taoAmount,
        usdValue: Number(trade.usd_value ?? 0),
      });
    }
  }
  return trades.sort((a, b) => b.timestamp - a.timestamp);
}
